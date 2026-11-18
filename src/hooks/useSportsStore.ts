import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  createInitialSeedState,
  INITIAL_GAMES,
  INITIAL_SCHEDULES,
} from '../data/seedData';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogleCloud,
  signOutGoogleCloud,
} from '../firebase';
import {
  AgeCategory,
  AuthSession,
  EventSchedule,
  GameDefinition,
  Gender,
  HOUSE_ORDER,
  HouseCredential,
  HouseId,
  PlaceType,
  PlayerAuditStatus,
  PlayerRole,
  ScoreEntry,
  SportsMeetState,
  Student,
  Teacher,
  TeamCard,
  TeamCardEntry,
} from '../types/sports';
import {
  autoDistributeTalentedAthletes,
  countGameRoleSlots,
  findGameByName,
  getEventType,
  isValidScheduleTime,
  reverifyAllStudents,
  sortSchedulesByTime,
  validateTeamCardEntryAdd,
  verifyStudentDob,
} from '../utils/sportsLogic';
import {
  enqueueManyOperations,
  enqueueOperation,
  getDueOperations,
  isPermissionDeniedError,
  isRetryableFirestoreError,
  markAttemptFailed,
  NewSyncOperation,
  removeOperationById,
  sha256Hex,
  stripUndefined,
  SyncOperation,
} from '../utils/syncQueue';

const STORAGE_KEY = 'scc_interhouse_sports_meet_v1';
const SESSION_KEY = 'scc_interhouse_session_v1';
const OUTBOX_KEY = 'scc_firestore_outbox_v1';
const BOOTSTRAP_ADMIN_EMAIL = 'sangeethshagar@gmail.com';

export interface HouseAccessRecord {
  house: HouseId;
  isActive: boolean;
  passcodeHash: string;
}

export interface SyncStatus {
  isOnline: boolean;
  authReady: boolean;
  cloudEmail: string | null;
  isCloudConnected: boolean;
  isCloudAdmin: boolean;
  queuedCount: number;
  hasPendingWrites: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

function loadInitialState(): SportsMeetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SportsMeetState;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.ageCategories)) {
        return {
          ...parsed,
          games:
            Array.isArray(parsed.games) && parsed.games.length > 0
              ? parsed.games
              : INITIAL_GAMES,
          schedules: Array.isArray(parsed.schedules)
            ? sortSchedulesByTime(parsed.schedules)
            : INITIAL_SCHEDULES,
        };
      }
    }
  } catch {
    // Fallback to seed
  }
  return createInitialSeedState();
}

function loadInitialSession(): AuthSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthSession;
    }
  } catch {
    // Ignore
  }
  return null;
}

function loadInitialOutbox(): SyncOperation[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SyncOperation[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Request timeout (network unavailable)'));
    }, ms);
    promise.then(
      (val) => {
        window.clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function buildInitialSeedOperations(s: SportsMeetState): NewSyncOperation[] {
  const ops: NewSyncOperation[] = [
    {
      entityKey: 'meetConfig:main',
      type: 'upsert_meet_config',
      payload: {
        meetName: s.meetName,
        cutoffDate: s.cutoffDate,
        ageCategories: s.ageCategories,
      },
    },
    {
      entityKey: 'meetSecrets:main',
      type: 'upsert_meet_secrets',
      payload: {
        adminPassword: s.adminPassword,
        houseCredentials: s.houseCredentials,
      },
    },
  ];

  for (const h of HOUSE_ORDER) {
    const cred = s.houseCredentials[h];
    ops.push({
      entityKey: `houseAccess:${h}`,
      type: 'upsert_house_access',
      payload: {
        house: h,
        isActive: cred.isActive,
        password: cred.password,
      },
    });
  }

  for (const game of s.games) {
    ops.push({
      entityKey: `game:${game.id}`,
      type: 'upsert_game',
      payload: game,
    });
  }

  for (const student of s.students) {
    ops.push({
      entityKey: `student:${student.id}`,
      type: 'upsert_student',
      payload: student,
    });
  }

  for (const teacher of s.teachers) {
    ops.push({
      entityKey: `teacher:${teacher.id}`,
      type: 'upsert_teacher',
      payload: teacher,
    });
  }

  for (const card of s.teamCards) {
    const { entries, ...header } = card;
    ops.push({
      entityKey: `card:${header.id}`,
      type: 'upsert_team_card',
      payload: header,
    });
    for (const entry of entries) {
      ops.push({
        entityKey: `entry:${header.id}:${entry.id}`,
        type: 'upsert_team_card_entry',
        payload: {
          cardId: header.id,
          house: header.house,
          entry: {
            ...entry,
            playerRole: entry.playerRole ?? 'playable',
          },
        },
      });
    }
  }

  for (const score of s.scores) {
    ops.push({
      entityKey: `score:${score.id}`,
      type: 'upsert_score',
      payload: score,
    });
  }

  for (const sched of s.schedules) {
    ops.push({
      entityKey: `schedule:${sched.id}`,
      type: 'upsert_schedule',
      payload: sched,
    });
  }

  return ops;
}

function applyPendingOutboxToState(
  base: SportsMeetState,
  queue: SyncOperation[]
): SportsMeetState {
  if (queue.length === 0) return base;
  let next: SportsMeetState = {
    ...base,
    games: [...base.games],
    schedules: [...base.schedules],
    students: [...base.students],
    teachers: [...base.teachers],
    teamCards: base.teamCards.map((tc) => ({ ...tc, entries: [...tc.entries] })),
    scores: [...base.scores],
    houseCredentials: { ...base.houseCredentials },
  };

  for (const op of queue) {
    switch (op.type) {
      case 'upsert_meet_config': {
        next.meetName = op.payload.meetName;
        next.cutoffDate = op.payload.cutoffDate;
        next.ageCategories = op.payload.ageCategories;
        break;
      }
      case 'upsert_game': {
        const idx = next.games.findIndex((g) => g.id === op.payload.id);
        if (idx >= 0) next.games[idx] = op.payload;
        else next.games.push(op.payload);
        break;
      }
      case 'delete_game': {
        next.games = next.games.filter((g) => g.id !== op.payload.gameId);
        break;
      }
      case 'upsert_student': {
        const idx = next.students.findIndex((s) => s.id === op.payload.id);
        if (idx >= 0) next.students[idx] = op.payload;
        else next.students.unshift(op.payload);
        break;
      }
      case 'delete_student': {
        next.students = next.students.filter((s) => s.id !== op.payload.studentId);
        break;
      }
      case 'upsert_teacher': {
        const idx = next.teachers.findIndex((t) => t.id === op.payload.id);
        if (idx >= 0) next.teachers[idx] = op.payload;
        else next.teachers.push(op.payload);
        break;
      }
      case 'delete_teacher': {
        next.teachers = next.teachers.filter((t) => t.id !== op.payload.teacherId);
        break;
      }
      case 'upsert_team_card': {
        const idx = next.teamCards.findIndex((tc) => tc.id === op.payload.id);
        if (idx >= 0) {
          next.teamCards[idx] = {
            ...op.payload,
            entries: next.teamCards[idx].entries,
          };
        } else {
          next.teamCards.push({ ...op.payload, entries: [] });
        }
        break;
      }
      case 'submit_team_card': {
        next.teamCards = next.teamCards.map((tc) =>
          tc.id === op.payload.cardId
            ? {
                ...tc,
                status: 'pending_review',
                submittedAt: op.payload.submittedAt,
              }
            : tc
        );
        break;
      }
      case 'upsert_team_card_entry': {
        next.teamCards = next.teamCards.map((tc) => {
          if (tc.id !== op.payload.cardId) return tc;
          const idx = tc.entries.findIndex((e) => e.id === op.payload.entry.id);
          const entries = [...tc.entries];
          if (idx >= 0) entries[idx] = op.payload.entry;
          else entries.push(op.payload.entry);
          return { ...tc, entries };
        });
        break;
      }
      case 'delete_team_card_entry': {
        next.teamCards = next.teamCards.map((tc) =>
          tc.id === op.payload.cardId
            ? {
                ...tc,
                entries: tc.entries.filter((e) => e.id !== op.payload.entryId),
              }
            : tc
        );
        break;
      }
      case 'upsert_score': {
        const idx = next.scores.findIndex((s) => s.id === op.payload.id);
        if (idx >= 0) next.scores[idx] = op.payload;
        else next.scores.unshift(op.payload);
        break;
      }
      case 'delete_score': {
        next.scores = next.scores.filter((s) => s.id !== op.payload.scoreId);
        break;
      }
      case 'upsert_house_access': {
        next.houseCredentials[op.payload.house] = {
          ...next.houseCredentials[op.payload.house],
          isActive: op.payload.isActive,
          password: op.payload.password,
        };
        break;
      }
      case 'upsert_meet_secrets': {
        next.adminPassword = op.payload.adminPassword;
        next.houseCredentials = op.payload.houseCredentials;
        break;
      }
      case 'upsert_schedule': {
        const idx = next.schedules.findIndex((sc) => sc.id === op.payload.id);
        if (idx >= 0) next.schedules[idx] = op.payload;
        else next.schedules.push(op.payload);
        next.schedules = sortSchedulesByTime(next.schedules);
        break;
      }
      case 'delete_schedule': {
        next.schedules = next.schedules.filter(
          (sc) => sc.id !== op.payload.scheduleId
        );
        break;
      }
    }
  }

  return next;
}

async function executeFirestoreOp(op: SyncOperation): Promise<void> {
  switch (op.type) {
    case 'upsert_meet_config': {
      const path = 'meetConfig/main';
      try {
        await withTimeout(
          setDoc(
            doc(db, 'meetConfig', 'main'),
            stripUndefined({
              meetName: op.payload.meetName,
              cutoffDate: op.payload.cutoffDate,
              ageCategories: op.payload.ageCategories,
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_game': {
      const path = `games/${op.payload.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'games', op.payload.id),
            stripUndefined({
              ...op.payload,
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'delete_game': {
      const path = `games/${op.payload.gameId}`;
      try {
        await withTimeout(deleteDoc(doc(db, 'games', op.payload.gameId)), 12000);
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_student': {
      const path = `students/${op.payload.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'students', op.payload.id),
            stripUndefined({
              ...op.payload,
              biometrics: stripUndefined(op.payload.biometrics ?? {}),
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'delete_student': {
      const path = `students/${op.payload.studentId}`;
      try {
        await withTimeout(deleteDoc(doc(db, 'students', op.payload.studentId)), 12000);
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_teacher': {
      const path = `teachers/${op.payload.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'teachers', op.payload.id),
            stripUndefined({
              ...op.payload,
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'delete_teacher': {
      const path = `teachers/${op.payload.teacherId}`;
      try {
        await withTimeout(deleteDoc(doc(db, 'teachers', op.payload.teacherId)), 12000);
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_team_card': {
      const path = `teamCards/${op.payload.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'teamCards', op.payload.id),
            stripUndefined({
              ...op.payload,
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'submit_team_card': {
      const path = `teamCards/${op.payload.cardId}`;
      try {
        await withTimeout(
          updateDoc(doc(db, 'teamCards', op.payload.cardId), {
            status: 'pending_review',
            submittedAt: op.payload.submittedAt,
            updatedAt: serverTimestamp(),
          }),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_team_card_entry': {
      const { cardId, house, entry } = op.payload;
      const path = `teamCards/${cardId}/entries/${entry.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'teamCards', cardId, 'entries', entry.id),
            stripUndefined({
              ...entry,
              cardId,
              house,
              playerRole: entry.playerRole ?? 'playable',
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'delete_team_card_entry': {
      const { cardId, entryId } = op.payload;
      const path = `teamCards/${cardId}/entries/${entryId}`;
      try {
        await withTimeout(
          deleteDoc(doc(db, 'teamCards', cardId, 'entries', entryId)),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_score': {
      const path = `scores/${op.payload.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'scores', op.payload.id),
            stripUndefined({
              ...op.payload,
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'delete_score': {
      const path = `scores/${op.payload.scoreId}`;
      try {
        await withTimeout(deleteDoc(doc(db, 'scores', op.payload.scoreId)), 12000);
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_house_access': {
      const path = `houseAccess/${op.payload.house}`;
      const passcodeHash = await sha256Hex(op.payload.password);
      try {
        await withTimeout(
          setDoc(doc(db, 'houseAccess', op.payload.house), {
            house: op.payload.house,
            isActive: op.payload.isActive,
            passcodeHash,
            updatedAt: serverTimestamp(),
          }),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_meet_secrets': {
      const path = 'meetSecrets/main';
      try {
        await withTimeout(
          setDoc(doc(db, 'meetSecrets', 'main'), {
            adminPassword: op.payload.adminPassword,
            houseCredentials: op.payload.houseCredentials,
            updatedAt: serverTimestamp(),
          }),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'upsert_schedule': {
      const path = `schedules/${op.payload.id}`;
      try {
        await withTimeout(
          setDoc(
            doc(db, 'schedules', op.payload.id),
            stripUndefined({
              ...op.payload,
              updatedAt: serverTimestamp(),
            })
          ),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        throw err;
      }
      return;
    }

    case 'delete_schedule': {
      const path = `schedules/${op.payload.scheduleId}`;
      try {
        await withTimeout(
          deleteDoc(doc(db, 'schedules', op.payload.scheduleId)),
          12000
        );
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
        throw err;
      }
      return;
    }
  }
}

export function useSportsStore() {
  const [state, setState] = useState<SportsMeetState>(loadInitialState);
  const [session, setSession] = useState<AuthSession>(loadInitialSession);
  const [outbox, setOutbox] = useState<SyncOperation[]>(loadInitialOutbox);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isCloudAdmin, setIsCloudAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const outboxRef = useRef(outbox);
  outboxRef.current = outbox;

  const firebaseUserRef = useRef(firebaseUser);
  firebaseUserRef.current = firebaseUser;

  const isCloudAdminRef = useRef(isCloudAdmin);
  isCloudAdminRef.current = isCloudAdmin;

  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const flushingRef = useRef(false);
  const cloudSeededRef = useRef(false);
  const cardHeadersRef = useRef<Omit<TeamCard, 'entries'>[]>([]);
  const entriesByCardIdRef = useRef<Record<string, TeamCardEntry[]>>({});
  const houseAccessRef = useRef<Partial<Record<HouseId, HouseAccessRecord>>>({});
  const pendingWritesFlagsRef = useRef<Record<string, boolean>>({});
  const [subscribedCardIds, setSubscribedCardIds] = useState<string[]>(() =>
    HOUSE_ORDER.map((h) => `card-${h}-01`)
  );

  // Surface Firestore permission errors cleanly to ErrorBoundary
  if (fatalError) {
    throw fatalError;
  }

  // Persist local state, session, and outbox reliably across reloads/offline
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignore
    }
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
    } catch {
      // Ignore
    }
  }, [outbox]);

  const queueOperations = useCallback((ops: NewSyncOperation[]) => {
    if (ops.length === 0) return;
    setOutbox((prev) => {
      const next = enqueueManyOperations(prev, ops, Date.now());
      outboxRef.current = next;
      return next;
    });
  }, []);

  const mirrorOpsToCloudSql = useCallback(
    async (user: User, ops: SyncOperation[]) => {
      if (ops.length === 0) return;
      try {
        const token = await user.getIdToken();
        await fetch('/api/sql/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ operations: ops }),
        });
      } catch {
        // Keep SQL mirroring silent to preserve UI isolation on unstable networks
      }
    },
    []
  );

  const flushSyncQueue = useCallback(async (forceAll = false) => {
    const user = firebaseUserRef.current;
    if (!user || !user.emailVerified || !isOnlineRef.current || flushingRef.current) {
      return;
    }

    const candidates = forceAll
      ? outboxRef.current
      : getDueOperations(outboxRef.current, Date.now());
    if (candidates.length === 0) {
      return;
    }

    flushingRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    const succeededOps: SyncOperation[] = [];

    try {
      for (const op of candidates) {
        if (!isOnlineRef.current || !firebaseUserRef.current) break;
        // Skip admin-only operations if user is not a cloud admin so house users don't fail
        if (
          !isCloudAdminRef.current &&
          op.type !== 'upsert_team_card' &&
          op.type !== 'submit_team_card' &&
          op.type !== 'upsert_team_card_entry' &&
          op.type !== 'delete_team_card_entry'
        ) {
          continue;
        }

        try {
          await executeFirestoreOp(op);
          succeededOps.push(op);
          setOutbox((prev) => {
            const next = removeOperationById(prev, op.id);
            outboxRef.current = next;
            return next;
          });
          setLastSyncedAt(new Date().toISOString());
        } catch (err) {
          if (isPermissionDeniedError(err)) {
            setOutbox((prev) => {
              const next = removeOperationById(prev, op.id);
              outboxRef.current = next;
              return next;
            });
            setFatalError(
              err instanceof Error ? err : new Error(String(err))
            );
            break;
          }

          const message = err instanceof Error ? err.message : String(err);
          setOutbox((prev) => {
            const next = markAttemptFailed(prev, op.id, message, Date.now());
            outboxRef.current = next;
            return next;
          });
          setLastError(message);

          if (isRetryableFirestoreError(err) || !isOnlineRef.current) {
            break;
          }
        }
      }

      if (succeededOps.length > 0) {
        void mirrorOpsToCloudSql(user, succeededOps);
      }
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
    }
  }, [mirrorOpsToCloudSql]);

  // Online / offline network event tracking
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
      void flushSyncQueue(true);
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushSyncQueue]);

  // Periodic retry timer for unstable connections while queued items remain
  useEffect(() => {
    if (!isOnline || !firebaseUser?.emailVerified || outbox.length === 0) {
      return;
    }
    const now = Date.now();
    const earliest = Math.min(...outbox.map((op) => op.nextRetryAt));
    const delay = Math.max(250, earliest - now);
    const timer = window.setTimeout(() => {
      void flushSyncQueue(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [outbox, isOnline, firebaseUser, flushSyncQueue]);

  // Auth state listener & admin resolution
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      firebaseUserRef.current = user;

      if (user && user.emailVerified) {
        let admin = user.email === BOOTSTRAP_ADMIN_EMAIL;
        if (!admin) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', user.uid));
            admin = adminSnap.exists();
          } catch {
            admin = false;
          }
        }
        setIsCloudAdmin(admin);
        isCloudAdminRef.current = admin;

        // Bootstrap Firestore if Admin connects to a brand-new empty meetConfig
        if (admin) {
          try {
            const cfgSnap = await getDocFromServer(doc(db, 'meetConfig', 'main'));
            if (!cfgSnap.exists()) {
              cloudSeededRef.current = true;
              const seedOps = buildInitialSeedOperations(stateRef.current);
              queueOperations(seedOps);
            } else {
              cloudSeededRef.current = true;
            }
          } catch {
            // Offline or cache miss — will retry when online
          }
        }
        void flushSyncQueue(true);
      } else {
        setIsCloudAdmin(false);
        isCloudAdminRef.current = false;
        cloudSeededRef.current = false;
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [queueOperations, flushSyncQueue]);

  // Granular real-time Firestore listeners (only changing items update dynamically)
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    const updatePendingFlag = (key: string, pending: boolean) => {
      pendingWritesFlagsRef.current[key] = pending;
      const anyPending = Object.values(pendingWritesFlagsRef.current).some(Boolean);
      setHasPendingWrites(anyPending);
    };

    const mergeAndSetState = (updater: (prev: SportsMeetState) => SportsMeetState) => {
      setState((prev) => {
        const updated = updater(prev);
        return applyPendingOutboxToState(updated, outboxRef.current);
      });
    };

    const unsubscribes: (() => void)[] = [];

    // 1. Meet Config
    unsubscribes.push(
      onSnapshot(
        doc(db, 'meetConfig', 'main'),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('meetConfig', snap.metadata.hasPendingWrites);
          if (!snap.exists()) return;
          cloudSeededRef.current = true;
          const data = snap.data() as {
            meetName: string;
            cutoffDate: string;
            ageCategories: AgeCategory[];
          };
          mergeAndSetState((prev) => ({
            ...prev,
            meetName: data.meetName,
            cutoffDate: data.cutoffDate,
            ageCategories: data.ageCategories,
          }));
          if (!snap.metadata.hasPendingWrites) {
            setLastSyncedAt(new Date().toISOString());
          }
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.GET, 'meetConfig/main');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 2. Games
    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, 'games'),
          where('eventType', 'in', ['individual', 'team'])
        ),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('games', snap.metadata.hasPendingWrites);
          if (snap.empty && !cloudSeededRef.current) return;
          const games = snap.docs.map((d) => d.data() as GameDefinition);
          mergeAndSetState((prev) => ({ ...prev, games }));
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'games');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 3. Students
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'students'), where('gender', 'in', ['Male', 'Female'])),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('students', snap.metadata.hasPendingWrites);
          if (snap.empty && !cloudSeededRef.current) return;
          const students = snap.docs.map((d) => d.data() as Student);
          mergeAndSetState((prev) => ({ ...prev, students }));
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'students');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 4. Teachers
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'teachers'), where('house', 'in', HOUSE_ORDER)),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('teachers', snap.metadata.hasPendingWrites);
          if (snap.empty && !cloudSeededRef.current) return;
          const teachers = snap.docs.map((d) => d.data() as Teacher);
          mergeAndSetState((prev) => ({ ...prev, teachers }));
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'teachers');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 5. Team Card Headers
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'teamCards'), where('house', 'in', HOUSE_ORDER)),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('teamCards', snap.metadata.hasPendingWrites);
          if (snap.empty && !cloudSeededRef.current) return;
          const headers = snap.docs.map((d) => d.data() as Omit<TeamCard, 'entries'>);
          cardHeadersRef.current = headers;

          const ids = Array.from(
            new Set([...HOUSE_ORDER.map((h) => `card-${h}-01`), ...headers.map((h) => h.id)])
          );
          setSubscribedCardIds((prevIds) => {
            if (
              prevIds.length === ids.length &&
              prevIds.every((id, idx) => id === ids[idx])
            ) {
              return prevIds;
            }
            return ids;
          });

          const rebuilt: TeamCard[] = headers.map((h) => ({
            ...h,
            entries: entriesByCardIdRef.current[h.id] ?? [],
          }));
          mergeAndSetState((prev) => ({ ...prev, teamCards: rebuilt }));
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'teamCards');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 6. Scores
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'scores'), where('house', 'in', HOUSE_ORDER)),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('scores', snap.metadata.hasPendingWrites);
          if (snap.empty && !cloudSeededRef.current) return;
          const scores = snap.docs
            .map((d) => d.data() as ScoreEntry)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          mergeAndSetState((prev) => ({ ...prev, scores }));
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'scores');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 6b. Event Schedules (real-time track & field timetable)
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'schedules'), where('startTime', '>=', '00:00')),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('schedules', snap.metadata.hasPendingWrites);
          if (snap.empty && !cloudSeededRef.current) return;
          const schedules = sortSchedulesByTime(
            snap.docs.map((d) => d.data() as EventSchedule)
          );
          mergeAndSetState((prev) => ({ ...prev, schedules }));
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'schedules');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 7. House Access (non-secret passcode hashes & lock status)
    unsubscribes.push(
      onSnapshot(
        query(collection(db, 'houseAccess'), where('house', 'in', HOUSE_ORDER)),
        { includeMetadataChanges: true },
        (snap) => {
          updatePendingFlag('houseAccess', snap.metadata.hasPendingWrites);
          if (snap.empty) return;
          const nextMap: Partial<Record<HouseId, HouseAccessRecord>> = {};
          snap.docs.forEach((d) => {
            const rec = d.data() as HouseAccessRecord;
            nextMap[rec.house] = rec;
          });
          houseAccessRef.current = nextMap;
          mergeAndSetState((prev) => {
            const updatedCreds = { ...prev.houseCredentials };
            for (const h of HOUSE_ORDER) {
              const rec = nextMap[h];
              if (rec) {
                updatedCreds[h] = {
                  ...updatedCreds[h],
                  isActive: rec.isActive,
                };
              }
            }
            return { ...prev, houseCredentials: updatedCreds };
          });
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(error, OperationType.LIST, 'houseAccess');
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    // 8. Admin-only Secrets
    if (isCloudAdmin) {
      unsubscribes.push(
        onSnapshot(
          doc(db, 'meetSecrets', 'main'),
          { includeMetadataChanges: true },
          (snap) => {
            updatePendingFlag('meetSecrets', snap.metadata.hasPendingWrites);
            if (!snap.exists()) return;
            const data = snap.data() as {
              adminPassword: string;
              houseCredentials: Record<HouseId, HouseCredential>;
            };
            mergeAndSetState((prev) => ({
              ...prev,
              adminPassword: data.adminPassword,
              houseCredentials: data.houseCredentials,
            }));
          },
          (error) => {
            if (isPermissionDeniedError(error)) {
              try {
                handleFirestoreError(error, OperationType.GET, 'meetSecrets/main');
              } catch (wrapped) {
                setFatalError(wrapped as Error);
              }
            }
          }
        )
      );
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [firebaseUser, isCloudAdmin]);

  // Granular TeamCard entries subcollection listeners (updates only changing card entries)
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    const unsubscribes = subscribedCardIds.map((cardId) =>
      onSnapshot(
        query(collection(db, 'teamCards', cardId, 'entries'), where('cardId', '==', cardId)),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.empty && !cloudSeededRef.current) return;
          const entries = snap.docs.map((d) => d.data() as TeamCardEntry);
          entriesByCardIdRef.current[cardId] = entries;

          if (cardHeadersRef.current.length === 0) return;
          const rebuilt: TeamCard[] = cardHeadersRef.current.map((h) => ({
            ...h,
            entries: entriesByCardIdRef.current[h.id] ?? [],
          }));
          setState((prev) =>
            applyPendingOutboxToState({ ...prev, teamCards: rebuilt }, outboxRef.current)
          );
        },
        (error) => {
          if (isPermissionDeniedError(error)) {
            try {
              handleFirestoreError(
                error,
                OperationType.LIST,
                `teamCards/${cardId}/entries`
              );
            } catch (wrapped) {
              setFatalError(wrapped as Error);
            }
          }
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [firebaseUser, subscribedCardIds]);

  const connectCloudSync = useCallback(async () => {
    setLastError(null);
    try {
      await signInWithGoogleCloud();
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Google Sign-In cancelled.');
    }
  }, []);

  const disconnectCloudSync = useCallback(async () => {
    await signOutGoogleCloud();
  }, []);

  const syncNow = useCallback(() => {
    void flushSyncQueue(true);
  }, [flushSyncQueue]);

  const loginAdmin = useCallback(
    (password: string): { ok: boolean; error?: string } => {
      if (password === state.adminPassword) {
        setSession({ role: 'admin' });
        return { ok: true };
      }
      return { ok: false, error: 'Incorrect Admin password.' };
    },
    [state.adminPassword]
  );

  const loginHouse = useCallback(
    async (
      house: HouseId,
      password: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const cloudAccess = houseAccessRef.current[house];
      if (cloudAccess && firebaseUser?.emailVerified && !isCloudAdmin) {
        if (!cloudAccess.isActive) {
          return {
            ok: false,
            error: `${house.toUpperCase()} House Portal is currently locked by the Admin.`,
          };
        }
        const hashed = await sha256Hex(password);
        if (hashed !== cloudAccess.passcodeHash) {
          return {
            ok: false,
            error: `Incorrect password for ${house.charAt(0).toUpperCase() + house.slice(1)} House.`,
          };
        }
        setSession({ role: 'house', house });
        return { ok: true };
      }

      const cred = state.houseCredentials[house];
      if (!cred.isActive) {
        return {
          ok: false,
          error: `${house.toUpperCase()} House Portal is currently locked by the Admin.`,
        };
      }
      if (password !== cred.password) {
        return {
          ok: false,
          error: `Incorrect password for ${house.charAt(0).toUpperCase() + house.slice(1)} House.`,
        };
      }
      setSession({ role: 'house', house });
      return { ok: true };
    },
    [state.houseCredentials, firebaseUser, isCloudAdmin]
  );

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const resetDemoData = useCallback(() => {
    const prev = stateRef.current;
    const fresh = createInitialSeedState();
    setState(fresh);

    const ops: NewSyncOperation[] = [];
    const freshGameIds = new Set(fresh.games.map((g) => g.id));
    const freshStudentIds = new Set(fresh.students.map((s) => s.id));
    const freshTeacherIds = new Set(fresh.teachers.map((t) => t.id));
    const freshScoreIds = new Set(fresh.scores.map((sc) => sc.id));
    const freshScheduleIds = new Set(fresh.schedules.map((sch) => sch.id));

    for (const g of prev.games) {
      if (!freshGameIds.has(g.id)) {
        ops.push({ entityKey: `game:${g.id}`, type: 'delete_game', payload: { gameId: g.id } });
      }
    }
    for (const s of prev.students) {
      if (!freshStudentIds.has(s.id)) {
        ops.push({
          entityKey: `student:${s.id}`,
          type: 'delete_student',
          payload: { studentId: s.id },
        });
      }
    }
    for (const t of prev.teachers) {
      if (!freshTeacherIds.has(t.id)) {
        ops.push({
          entityKey: `teacher:${t.id}`,
          type: 'delete_teacher',
          payload: { teacherId: t.id },
        });
      }
    }
    for (const sc of prev.scores) {
      if (!freshScoreIds.has(sc.id)) {
        ops.push({
          entityKey: `score:${sc.id}`,
          type: 'delete_score',
          payload: { scoreId: sc.id },
        });
      }
    }
    for (const sch of prev.schedules) {
      if (!freshScheduleIds.has(sch.id)) {
        ops.push({
          entityKey: `schedule:${sch.id}`,
          type: 'delete_schedule',
          payload: { scheduleId: sch.id },
        });
      }
    }
    for (const prevCard of prev.teamCards) {
      const freshCard = fresh.teamCards.find((fc) => fc.id === prevCard.id);
      const freshEntryIds = new Set((freshCard?.entries ?? []).map((e) => e.id));
      for (const e of prevCard.entries) {
        if (!freshEntryIds.has(e.id)) {
          ops.push({
            entityKey: `entry:${prevCard.id}:${e.id}`,
            type: 'delete_team_card_entry',
            payload: { cardId: prevCard.id, entryId: e.id },
          });
        }
      }
    }

    ops.push(...buildInitialSeedOperations(fresh));
    queueOperations(ops);
    void flushSyncQueue(false);
  }, [queueOperations, flushSyncQueue]);

  // Module A: Age Category Config & DOB Re-verification
  const updateAgeConfig = useCallback(
    (cutoffDate: string, ageCategories: AgeCategory[]) => {
      const validNames = new Set(ageCategories.map((c) => c.name));
      const prev = stateRef.current;
      const updatedGames = prev.games.map((g) => ({
        ...g,
        allowedAgeCategories: g.allowedAgeCategories.filter((name) =>
          validNames.has(name)
        ),
      }));
      const updatedStudents = reverifyAllStudents(
        prev.students,
        cutoffDate,
        ageCategories
      );

      setState((curr) => ({
        ...curr,
        cutoffDate,
        ageCategories,
        games: updatedGames,
        students: updatedStudents,
      }));

      const ops: NewSyncOperation[] = [
        {
          entityKey: 'meetConfig:main',
          type: 'upsert_meet_config',
          payload: { meetName: prev.meetName, cutoffDate, ageCategories },
        },
        ...updatedGames.map(
          (game): NewSyncOperation => ({
            entityKey: `game:${game.id}`,
            type: 'upsert_game',
            payload: game,
          })
        ),
        ...updatedStudents.map(
          (student): NewSyncOperation => ({
            entityKey: `student:${student.id}`,
            type: 'upsert_student',
            payload: student,
          })
        ),
      ];
      queueOperations(ops);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // Module H: Admin Games, Age Category Assignment & Playable/Sub Squad Management
  const upsertGame = useCallback(
    (
      payload: Omit<GameDefinition, 'id'> & { id?: string }
    ): { ok: boolean; error?: string } => {
      const trimmedName = payload.name.trim();
      if (!trimmedName) {
        return { ok: false, error: 'Game name is required.' };
      }
      if (payload.allowedAgeCategories.length === 0) {
        return { ok: false, error: 'Select at least one Age Category for this game.' };
      }
      if (payload.allowedGenders.length === 0) {
        return { ok: false, error: 'Select at least one Gender division for this game.' };
      }
      if (payload.playableSlots < 1) {
        return { ok: false, error: 'Playable player slots must be at least 1.' };
      }
      if (payload.subSlots < 0) {
        return { ok: false, error: 'Substitute slots cannot be negative.' };
      }

      const prev = stateRef.current;
      const duplicate = prev.games.some(
        (g) =>
          g.id !== payload.id &&
          g.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return { ok: false, error: `A game named "${trimmedName}" already exists.` };
      }

      const ops: NewSyncOperation[] = [];
      if (payload.id) {
        const oldGame = prev.games.find((g) => g.id === payload.id);
        const updatedGame: GameDefinition = {
          ...payload,
          id: payload.id,
          name: trimmedName,
        };
        ops.push({
          entityKey: `game:${updatedGame.id}`,
          type: 'upsert_game',
          payload: updatedGame,
        });

        const renamed =
          oldGame &&
          (oldGame.name !== trimmedName || oldGame.eventType !== payload.eventType);

        setState((curr) => ({
          ...curr,
          games: curr.games.map((g) => (g.id === payload.id ? updatedGame : g)),
          teamCards: renamed
            ? curr.teamCards.map((tc) => ({
                ...tc,
                entries: tc.entries.map((entry) => {
                  if (
                    entry.eventName.trim().toLowerCase() ===
                    oldGame.name.trim().toLowerCase()
                  ) {
                    const updatedEntry: TeamCardEntry = {
                      ...entry,
                      eventName: trimmedName,
                      eventType: payload.eventType,
                    };
                    ops.push({
                      entityKey: `entry:${tc.id}:${entry.id}`,
                      type: 'upsert_team_card_entry',
                      payload: { cardId: tc.id, house: tc.house, entry: updatedEntry },
                    });
                    return updatedEntry;
                  }
                  return entry;
                }),
              }))
            : curr.teamCards,
        }));
      } else {
        const created: GameDefinition = {
          ...payload,
          id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: trimmedName,
        };
        ops.push({
          entityKey: `game:${created.id}`,
          type: 'upsert_game',
          payload: created,
        });
        setState((curr) => ({
          ...curr,
          games: [...curr.games, created],
        }));
      }

      queueOperations(ops);
      void flushSyncQueue(false);
      return { ok: true };
    },
    [queueOperations, flushSyncQueue]
  );

  const deleteGame = useCallback(
    (gameId: string) => {
      setState((prev) => ({
        ...prev,
        games: prev.games.filter((g) => g.id !== gameId),
      }));
      queueOperations([
        { entityKey: `game:${gameId}`, type: 'delete_game', payload: { gameId } },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const assignGamePlayer = useCallback(
    (
      house: HouseId,
      studentId: string,
      eventName: string,
      ageCategory: string,
      gender: Gender,
      playerRole: PlayerRole
    ): { ok: boolean; error?: string } => {
      const curr = stateRef.current;
      const student = curr.students.find((s) => s.id === studentId);
      if (!student || student.house !== house) {
        return { ok: false, error: 'Student is not assigned to the selected house.' };
      }
      const existingCard = curr.teamCards.find((tc) => tc.house === house);
      const existingEntries = existingCard?.entries ?? [];
      const validation = validateTeamCardEntryAdd(
        student,
        eventName,
        ageCategory,
        gender,
        existingEntries,
        { playerRole, games: curr.games }
      );
      if (!validation.ok) {
        return validation;
      }

      const cardId = existingCard?.id ?? `card-${house}-01`;
      const newEntry: TeamCardEntry = {
        id: `tce-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        studentId,
        eventName,
        eventType: getEventType(eventName, curr.games),
        ageCategory,
        gender,
        playerRole,
        auditStatus: 'confirmed',
      };

      const ops: NewSyncOperation[] = [];
      if (!existingCard) {
        const header: Omit<TeamCard, 'entries'> = {
          id: cardId,
          house,
          title: `${house.charAt(0).toUpperCase() + house.slice(1)} House Playing Team Card`,
          status: 'draft',
        };
        ops.push({
          entityKey: `card:${cardId}`,
          type: 'upsert_team_card',
          payload: header,
        });
        setState((prev) => ({
          ...prev,
          teamCards: [...prev.teamCards, { ...header, entries: [newEntry] }],
        }));
      } else {
        setState((prev) => ({
          ...prev,
          teamCards: prev.teamCards.map((tc) =>
            tc.id === cardId
              ? { ...tc, entries: [...tc.entries, newEntry] }
              : tc
          ),
        }));
      }

      ops.push({
        entityKey: `entry:${cardId}:${newEntry.id}`,
        type: 'upsert_team_card_entry',
        payload: { cardId, house, entry: newEntry },
      });
      queueOperations(ops);
      void flushSyncQueue(false);
      return { ok: true };
    },
    [queueOperations, flushSyncQueue]
  );

  const toggleGamePlayerRole = useCallback(
    (house: HouseId, entryId: string): { ok: boolean; error?: string } => {
      const curr = stateRef.current;
      const card = curr.teamCards.find((tc) => tc.house === house);
      const entry = card?.entries.find((e) => e.id === entryId);
      if (!card || !entry) {
        return { ok: false, error: 'Squad entry not found.' };
      }
      const currentRole: PlayerRole = entry.playerRole ?? 'playable';
      const targetRole: PlayerRole = currentRole === 'playable' ? 'sub' : 'playable';
      const game = findGameByName(entry.eventName, curr.games);
      if (game) {
        const { playableCount, subCount } = countGameRoleSlots(
          card.entries,
          entry.eventName,
          entry.ageCategory,
          entry.gender
        );
        if (targetRole === 'playable' && playableCount >= game.playableSlots) {
          return {
            ok: false,
            error: `Playable quota full (${playableCount}/${game.playableSlots}) for ${game.name}.`,
          };
        }
        if (targetRole === 'sub' && subCount >= game.subSlots) {
          return {
            ok: false,
            error:
              game.subSlots === 0
                ? `${game.name} does not allow substitute players.`
                : `Sub quota full (${subCount}/${game.subSlots}) for ${game.name}.`,
          };
        }
      }

      const updatedEntry: TeamCardEntry = { ...entry, playerRole: targetRole };
      setState((prev) => ({
        ...prev,
        teamCards: prev.teamCards.map((tc) =>
          tc.id === card.id
            ? {
                ...tc,
                entries: tc.entries.map((e) => (e.id === entryId ? updatedEntry : e)),
              }
            : tc
        ),
      }));

      queueOperations([
        {
          entityKey: `entry:${card.id}:${entry.id}`,
          type: 'upsert_team_card_entry',
          payload: { cardId: card.id, house: card.house, entry: updatedEntry },
        },
      ]);
      void flushSyncQueue(false);
      return { ok: true };
    },
    [queueOperations, flushSyncQueue]
  );

  const removeGamePlayer = useCallback(
    (house: HouseId, entryId: string) => {
      const card = stateRef.current.teamCards.find((tc) => tc.house === house);
      setState((prev) => ({
        ...prev,
        teamCards: prev.teamCards.map((tc) =>
          tc.house === house
            ? { ...tc, entries: tc.entries.filter((e) => e.id !== entryId) }
            : tc
        ),
      }));
      if (card) {
        queueOperations([
          {
            entityKey: `entry:${card.id}:${entryId}`,
            type: 'delete_team_card_entry',
            payload: { cardId: card.id, entryId },
          },
        ]);
        void flushSyncQueue(false);
      }
    },
    [queueOperations, flushSyncQueue]
  );

  // Module B: Bulk Excel Import + Auto-Distribute Talented Athletes
  const importStudents = useCallback(
    (newStudents: Student[]) => {
      const existingAdm = new Set(
        stateRef.current.students.map((s) => s.admissionNo.toLowerCase())
      );
      const uniqueIncoming = newStudents.filter(
        (s) => !existingAdm.has(s.admissionNo.toLowerCase())
      );
      if (uniqueIncoming.length === 0) return;

      setState((prev) => ({
        ...prev,
        students: [...prev.students, ...uniqueIncoming],
      }));
      queueOperations(
        uniqueIncoming.map((student) => ({
          entityKey: `student:${student.id}`,
          type: 'upsert_student',
          payload: student,
        }))
      );
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const runAutoDistribute = useCallback(() => {
    const prev = stateRef.current;
    const result = autoDistributeTalentedAthletes(prev.students);
    const prevHouses = new Map(prev.students.map((s) => [s.id, s.house]));
    const changed = result.updatedStudents.filter(
      (s) => prevHouses.get(s.id) !== s.house
    );

    setState((curr) => ({
      ...curr,
      students: result.updatedStudents,
    }));

    if (changed.length > 0) {
      queueOperations(
        changed.map((student) => ({
          entityKey: `student:${student.id}`,
          type: 'upsert_student',
          payload: student,
        }))
      );
      void flushSyncQueue(false);
    }

    return {
      distributedCount: result.distributedCount,
      breakdown: result.breakdown,
    };
  }, [queueOperations, flushSyncQueue]);

  // Module C: Teacher & Student Appointments
  const upsertTeacher = useCallback(
    (teacher: Omit<Teacher, 'id'> & { id?: string }) => {
      const complete: Teacher = {
        ...teacher,
        id:
          teacher.id ??
          `tch-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      setState((prev) => ({
        ...prev,
        teachers: teacher.id
          ? prev.teachers.map((t) => (t.id === teacher.id ? complete : t))
          : [...prev.teachers, complete],
      }));
      queueOperations([
        {
          entityKey: `teacher:${complete.id}`,
          type: 'upsert_teacher',
          payload: complete,
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const removeTeacher = useCallback(
    (teacherId: string) => {
      setState((prev) => ({
        ...prev,
        teachers: prev.teachers.filter((t) => t.id !== teacherId),
      }));
      queueOperations([
        {
          entityKey: `teacher:${teacherId}`,
          type: 'delete_teacher',
          payload: { teacherId },
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const assignStudentsHouse = useCallback(
    (studentIds: string[], house: HouseId | null) => {
      const idSet = new Set(studentIds);
      const updatedList = stateRef.current.students
        .filter((s) => idSet.has(s.id))
        .map((s) => ({ ...s, house }));

      setState((prev) => ({
        ...prev,
        students: prev.students.map((s) => (idSet.has(s.id) ? { ...s, house } : s)),
      }));

      queueOperations(
        updatedList.map((student) => ({
          entityKey: `student:${student.id}`,
          type: 'upsert_student',
          payload: student,
        }))
      );
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // Module D: Admin Student & Profile Editor
  const upsertStudent = useCallback(
    (
      payload: Omit<
        Student,
        'id' | 'computedAge' | 'verifiedCategory' | 'dobStatus' | 'dobFlagReason'
      > & { id?: string }
    ) => {
      const prev = stateRef.current;
      const verification = verifyStudentDob(
        payload.dob,
        prev.cutoffDate,
        prev.ageCategories
      );
      const complete: Student = {
        ...payload,
        id:
          payload.id ??
          `stu-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        biometrics: stripUndefined({ ...payload.biometrics }),
        computedAge: verification.computedAge,
        verifiedCategory: verification.verifiedCategory,
        dobStatus: verification.dobStatus,
        dobFlagReason: verification.dobFlagReason,
      };

      setState((curr) => ({
        ...curr,
        students: payload.id
          ? curr.students.map((s) => (s.id === payload.id ? complete : s))
          : [complete, ...curr.students],
      }));

      queueOperations([
        {
          entityKey: `student:${complete.id}`,
          type: 'upsert_student',
          payload: complete,
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const deleteStudent = useCallback(
    (studentId: string) => {
      const prev = stateRef.current;
      const ops: NewSyncOperation[] = [
        {
          entityKey: `student:${studentId}`,
          type: 'delete_student',
          payload: { studentId },
        },
      ];
      for (const tc of prev.teamCards) {
        for (const e of tc.entries) {
          if (e.studentId === studentId) {
            ops.push({
              entityKey: `entry:${tc.id}:${e.id}`,
              type: 'delete_team_card_entry',
              payload: { cardId: tc.id, entryId: e.id },
            });
          }
        }
      }

      setState((curr) => ({
        ...curr,
        students: curr.students.filter((s) => s.id !== studentId),
        teamCards: curr.teamCards.map((tc) => ({
          ...tc,
          entries: tc.entries.filter((e) => e.studentId !== studentId),
        })),
      }));

      queueOperations(ops);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // Module E: House Security Password Manager
  const updateHouseCredential = useCallback(
    (house: HouseId, patch: Partial<HouseCredential>) => {
      const prev = stateRef.current;
      const updatedCred: HouseCredential = {
        ...prev.houseCredentials[house],
        ...patch,
      };
      const updatedCreds = {
        ...prev.houseCredentials,
        [house]: updatedCred,
      };

      setState((curr) => ({
        ...curr,
        houseCredentials: updatedCreds,
      }));

      queueOperations([
        {
          entityKey: `houseAccess:${house}`,
          type: 'upsert_house_access',
          payload: {
            house,
            isActive: updatedCred.isActive,
            password: updatedCred.password,
          },
        },
        {
          entityKey: 'meetSecrets:main',
          type: 'upsert_meet_secrets',
          payload: {
            adminPassword: prev.adminPassword,
            houseCredentials: updatedCreds,
          },
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // Module F: Admin Team Card Review
  const updateTeamCardEntryAudit = useCallback(
    (
      cardId: string,
      entryId: string,
      auditStatus: PlayerAuditStatus,
      rejectionReason?: string
    ) => {
      const card = stateRef.current.teamCards.find((c) => c.id === cardId);
      const target = card?.entries.find((e) => e.id === entryId);
      if (!card || !target) return;

      const updatedEntry: TeamCardEntry = {
        ...target,
        auditStatus,
        rejectionReason: auditStatus === 'rejected' ? rejectionReason : undefined,
      };

      setState((prev) => ({
        ...prev,
        teamCards: prev.teamCards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                entries: c.entries.map((entry) =>
                  entry.id === entryId ? updatedEntry : entry
                ),
              }
            : c
        ),
      }));

      queueOperations([
        {
          entityKey: `entry:${cardId}:${entryId}`,
          type: 'upsert_team_card_entry',
          payload: { cardId, house: card.house, entry: updatedEntry },
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const finalizeTeamCardReview = useCallback(
    (
      cardId: string,
      decision: 'approved' | 'revision_requested',
      adminNote?: string
    ) => {
      const card = stateRef.current.teamCards.find((c) => c.id === cardId);
      if (!card) return;

      const reviewedAt = new Date().toISOString();
      const cleanedNote = adminNote?.trim() || undefined;
      const updatedEntries =
        decision === 'approved'
          ? card.entries.map((e) =>
              e.auditStatus === 'pending'
                ? ({ ...e, auditStatus: 'confirmed' } as TeamCardEntry)
                : e
            )
          : card.entries;

      const header: Omit<TeamCard, 'entries'> = {
        id: card.id,
        house: card.house,
        title: card.title,
        status: decision,
        submittedAt: card.submittedAt,
        reviewedAt,
        adminNote: cleanedNote,
      };

      const ops: NewSyncOperation[] = [
        {
          entityKey: `card:${card.id}`,
          type: 'upsert_team_card',
          payload: header,
        },
      ];
      if (decision === 'approved') {
        for (const e of updatedEntries) {
          const orig = card.entries.find((o) => o.id === e.id);
          if (orig && orig.auditStatus !== e.auditStatus) {
            ops.push({
              entityKey: `entry:${card.id}:${e.id}`,
              type: 'upsert_team_card_entry',
              payload: { cardId: card.id, house: card.house, entry: e },
            });
          }
        }
      }

      setState((prev) => ({
        ...prev,
        teamCards: prev.teamCards.map((c) =>
          c.id === cardId ? { ...header, entries: updatedEntries } : c
        ),
      }));

      queueOperations(ops);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // House Portal: Team Card Builder & Submission (works smoothly offline / unstable network)
  const addTeamCardEntry = useCallback(
    (
      house: HouseId,
      studentId: string,
      eventName: string,
      ageCategory: string,
      gender: Gender,
      playerRole: PlayerRole = 'playable'
    ): { ok: boolean; error?: string } => {
      const curr = stateRef.current;
      const student = curr.students.find((s) => s.id === studentId);
      if (!student || student.house !== house) {
        return { ok: false, error: 'Student is not assigned to this house.' };
      }

      const existingCard = curr.teamCards.find((tc) => tc.house === house);
      if (
        existingCard &&
        (existingCard.status === 'pending_review' ||
          existingCard.status === 'approved')
      ) {
        return {
          ok: false,
          error: 'Team card is currently locked for review or already approved.',
        };
      }

      const existingEntries = existingCard?.entries ?? [];
      const validation = validateTeamCardEntryAdd(
        student,
        eventName,
        ageCategory,
        gender,
        existingEntries,
        { playerRole, games: curr.games }
      );
      if (!validation.ok) {
        return validation;
      }

      const cardId = existingCard?.id ?? `card-${house}-01`;
      const newEntry: TeamCardEntry = {
        id: `tce-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        studentId,
        eventName,
        eventType: getEventType(eventName, curr.games),
        ageCategory,
        gender,
        playerRole,
        auditStatus: 'pending',
      };

      const ops: NewSyncOperation[] = [];
      if (!existingCard) {
        const header: Omit<TeamCard, 'entries'> = {
          id: cardId,
          house,
          title: `${house.charAt(0).toUpperCase() + house.slice(1)} House Playing Team Card`,
          status: 'draft',
        };
        ops.push({
          entityKey: `card:${cardId}`,
          type: 'upsert_team_card',
          payload: header,
        });
        setState((prev) => ({
          ...prev,
          teamCards: [...prev.teamCards, { ...header, entries: [newEntry] }],
        }));
      } else {
        setState((prev) => ({
          ...prev,
          teamCards: prev.teamCards.map((tc) =>
            tc.id === cardId
              ? { ...tc, entries: [...tc.entries, newEntry] }
              : tc
          ),
        }));
      }

      ops.push({
        entityKey: `entry:${cardId}:${newEntry.id}`,
        type: 'upsert_team_card_entry',
        payload: { cardId, house, entry: newEntry },
      });

      queueOperations(ops);
      void flushSyncQueue(false);
      return { ok: true };
    },
    [queueOperations, flushSyncQueue]
  );

  const removeTeamCardEntry = useCallback(
    (house: HouseId, entryId: string) => {
      const card = stateRef.current.teamCards.find((tc) => tc.house === house);
      if (!card || card.status === 'pending_review' || card.status === 'approved') {
        return;
      }

      setState((prev) => ({
        ...prev,
        teamCards: prev.teamCards.map((tc) =>
          tc.id === card.id
            ? { ...tc, entries: tc.entries.filter((e) => e.id !== entryId) }
            : tc
        ),
      }));

      queueOperations([
        {
          entityKey: `entry:${card.id}:${entryId}`,
          type: 'delete_team_card_entry',
          payload: { cardId: card.id, entryId },
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const submitTeamCardForReview = useCallback(
    (house: HouseId) => {
      const card = stateRef.current.teamCards.find((tc) => tc.house === house);
      if (!card || card.entries.length === 0) return;

      const submittedAt = new Date().toISOString();
      const ops: NewSyncOperation[] = [];

      if (isCloudAdminRef.current) {
        for (const e of card.entries) {
          if (e.auditStatus !== 'pending' || e.rejectionReason) {
            ops.push({
              entityKey: `entry:${card.id}:${e.id}`,
              type: 'upsert_team_card_entry',
              payload: {
                cardId: card.id,
                house: card.house,
                entry: { ...e, auditStatus: 'pending', rejectionReason: undefined },
              },
            });
          }
        }
      }

      ops.push({
        entityKey: `card_submit:${card.id}`,
        type: 'submit_team_card',
        payload: { cardId: card.id, submittedAt },
      });

      setState((prev) => ({
        ...prev,
        teamCards: prev.teamCards.map((tc) => {
          if (tc.id !== card.id) return tc;
          return {
            ...tc,
            status: 'pending_review',
            submittedAt,
            entries: isCloudAdminRef.current
              ? tc.entries.map((e) => ({
                  ...e,
                  auditStatus: 'pending',
                  rejectionReason: undefined,
                }))
              : tc.entries,
          };
        }),
      }));

      queueOperations(ops);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // Module G: Live House Points & Standings Ledger
  const addScoreEntry = useCallback(
    (payload: {
      house: HouseId;
      eventName: string;
      ageCategory: string;
      place: PlaceType;
      points: number;
      note?: string;
    }) => {
      const entry: ScoreEntry = {
        id: `scr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        house: payload.house,
        eventName: payload.eventName.trim(),
        ageCategory: payload.ageCategory,
        place: payload.place,
        points: payload.points,
        timestamp: new Date().toISOString(),
        note: payload.note?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        scores: [entry, ...prev.scores],
      }));
      queueOperations([
        {
          entityKey: `score:${entry.id}`,
          type: 'upsert_score',
          payload: entry,
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const deleteScoreEntry = useCallback(
    (scoreId: string) => {
      setState((prev) => ({
        ...prev,
        scores: prev.scores.filter((s) => s.id !== scoreId),
      }));
      queueOperations([
        {
          entityKey: `score:${scoreId}`,
          type: 'delete_score',
          payload: { scoreId },
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  // Module I: Admin Event Schedule Manager
  const upsertSchedule = useCallback(
    (
      payload: Omit<EventSchedule, 'id'> & { id?: string }
    ): { ok: boolean; error?: string } => {
      const startTime = payload.startTime.trim();
      const eventName = payload.eventName.trim();
      const category = payload.category.trim();

      if (!isValidScheduleTime(startTime)) {
        return {
          ok: false,
          error: 'Enter a valid 24-hour start time (HH:MM, e.g. 09:30).',
        };
      }
      if (!eventName || eventName.length > 80) {
        return {
          ok: false,
          error: 'Event name is required (max 80 characters).',
        };
      }
      if (!category || category.length > 40) {
        return {
          ok: false,
          error: 'Category is required (max 40 characters).',
        };
      }

      const complete: EventSchedule = {
        id:
          payload.id ??
          `sch-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        startTime,
        eventName,
        category,
      };

      setState((prev) => ({
        ...prev,
        schedules: sortSchedulesByTime(
          payload.id
            ? prev.schedules.map((s) => (s.id === payload.id ? complete : s))
            : [...prev.schedules, complete]
        ),
      }));

      queueOperations([
        {
          entityKey: `schedule:${complete.id}`,
          type: 'upsert_schedule',
          payload: complete,
        },
      ]);
      void flushSyncQueue(false);
      return { ok: true };
    },
    [queueOperations, flushSyncQueue]
  );

  const deleteSchedule = useCallback(
    (scheduleId: string) => {
      setState((prev) => ({
        ...prev,
        schedules: prev.schedules.filter((s) => s.id !== scheduleId),
      }));
      queueOperations([
        {
          entityKey: `schedule:${scheduleId}`,
          type: 'delete_schedule',
          payload: { scheduleId },
        },
      ]);
      void flushSyncQueue(false);
    },
    [queueOperations, flushSyncQueue]
  );

  const syncStatus: SyncStatus = {
    isOnline,
    authReady,
    cloudEmail: firebaseUser?.email ?? null,
    isCloudConnected: Boolean(firebaseUser && firebaseUser.emailVerified),
    isCloudAdmin,
    queuedCount: outbox.length,
    hasPendingWrites,
    isSyncing,
    lastSyncedAt,
    lastError,
  };

  return {
    state,
    session,
    syncStatus,
    connectCloudSync,
    disconnectCloudSync,
    syncNow,
    loginAdmin,
    loginHouse,
    logout,
    resetDemoData,
    updateAgeConfig,
    upsertGame,
    deleteGame,
    assignGamePlayer,
    toggleGamePlayerRole,
    removeGamePlayer,
    importStudents,
    runAutoDistribute,
    upsertTeacher,
    removeTeacher,
    assignStudentsHouse,
    upsertStudent,
    deleteStudent,
    updateHouseCredential,
    updateTeamCardEntryAudit,
    finalizeTeamCardReview,
    addTeamCardEntry,
    removeTeamCardEntry,
    submitTeamCardForReview,
    addScoreEntry,
    deleteScoreEntry,
    upsertSchedule,
    deleteSchedule,
  };
}
