import {
  AgeCategory,
  EventSchedule,
  GameDefinition,
  HouseCredential,
  HouseId,
  ScoreEntry,
  Student,
  Teacher,
  TeamCard,
  TeamCardEntry,
} from '../types/sports';

export type SyncOperation =
  | {
      id: string;
      entityKey: string;
      type: 'upsert_meet_config';
      payload: {
        meetName: string;
        cutoffDate: string;
        ageCategories: AgeCategory[];
      };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_game';
      payload: GameDefinition;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'delete_game';
      payload: { gameId: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_student';
      payload: Student;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'delete_student';
      payload: { studentId: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_teacher';
      payload: Teacher;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'delete_teacher';
      payload: { teacherId: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_team_card';
      payload: Omit<TeamCard, 'entries'>;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'submit_team_card';
      payload: { cardId: string; submittedAt: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_team_card_entry';
      payload: { cardId: string; house: HouseId; entry: TeamCardEntry };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'delete_team_card_entry';
      payload: { cardId: string; entryId: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_score';
      payload: ScoreEntry;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'delete_score';
      payload: { scoreId: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_house_access';
      payload: { house: HouseId; isActive: boolean; password: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_meet_secrets';
      payload: {
        adminPassword: string;
        houseCredentials: Record<HouseId, HouseCredential>;
      };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'upsert_schedule';
      payload: EventSchedule;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      entityKey: string;
      type: 'delete_schedule';
      payload: { scheduleId: string };
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    };

export type NewSyncOperation =
  | {
      entityKey: string;
      type: 'upsert_meet_config';
      payload: {
        meetName: string;
        cutoffDate: string;
        ageCategories: AgeCategory[];
      };
    }
  | { entityKey: string; type: 'upsert_game'; payload: GameDefinition }
  | { entityKey: string; type: 'delete_game'; payload: { gameId: string } }
  | { entityKey: string; type: 'upsert_student'; payload: Student }
  | { entityKey: string; type: 'delete_student'; payload: { studentId: string } }
  | { entityKey: string; type: 'upsert_teacher'; payload: Teacher }
  | { entityKey: string; type: 'delete_teacher'; payload: { teacherId: string } }
  | { entityKey: string; type: 'upsert_team_card'; payload: Omit<TeamCard, 'entries'> }
  | {
      entityKey: string;
      type: 'submit_team_card';
      payload: { cardId: string; submittedAt: string };
    }
  | {
      entityKey: string;
      type: 'upsert_team_card_entry';
      payload: { cardId: string; house: HouseId; entry: TeamCardEntry };
    }
  | {
      entityKey: string;
      type: 'delete_team_card_entry';
      payload: { cardId: string; entryId: string };
    }
  | { entityKey: string; type: 'upsert_score'; payload: ScoreEntry }
  | { entityKey: string; type: 'delete_score'; payload: { scoreId: string } }
  | {
      entityKey: string;
      type: 'upsert_house_access';
      payload: { house: HouseId; isActive: boolean; password: string };
    }
  | {
      entityKey: string;
      type: 'upsert_meet_secrets';
      payload: {
        adminPassword: string;
        houseCredentials: Record<HouseId, HouseCredential>;
      };
    }
  | { entityKey: string; type: 'upsert_schedule'; payload: EventSchedule }
  | { entityKey: string; type: 'delete_schedule'; payload: { scheduleId: string } };

const OP_PRIORITY: Record<SyncOperation['type'], number> = {
  upsert_meet_config: 1,
  upsert_house_access: 2,
  upsert_meet_secrets: 2,
  upsert_game: 3,
  delete_game: 3,
  upsert_schedule: 3,
  delete_schedule: 3,
  upsert_student: 3,
  delete_student: 3,
  upsert_teacher: 3,
  delete_teacher: 3,
  upsert_score: 3,
  delete_score: 3,
  upsert_team_card: 4,
  upsert_team_card_entry: 5,
  delete_team_card_entry: 5,
  submit_team_card: 6,
};

export function enqueueOperation(
  queue: SyncOperation[],
  op: NewSyncOperation,
  now = Date.now()
): SyncOperation[] {
  const newOp = {
    ...op,
    id: `op-${now}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    attempts: 0,
    nextRetryAt: 0,
  } as SyncOperation;

  const idx = queue.findIndex((item) => item.entityKey === op.entityKey);
  let next: SyncOperation[];
  if (idx >= 0) {
    next = [...queue];
    next[idx] = newOp;
  } else {
    next = [...queue, newOp];
  }

  return next.sort((a, b) => {
    const pDiff = OP_PRIORITY[a.type] - OP_PRIORITY[b.type];
    return pDiff !== 0 ? pDiff : a.createdAt - b.createdAt;
  });
}

export function enqueueManyOperations(
  queue: SyncOperation[],
  ops: NewSyncOperation[],
  now = Date.now()
): SyncOperation[] {
  let next = queue;
  for (let i = 0; i < ops.length; i += 1) {
    next = enqueueOperation(next, ops[i], now + i);
  }
  return next;
}

export function removeOperationById(
  queue: SyncOperation[],
  opId: string
): SyncOperation[] {
  return queue.filter((op) => op.id !== opId);
}

export function computeBackoffMs(attempts: number): number {
  const exp = Math.min(Math.max(attempts, 1), 6);
  return Math.min(1000 * 2 ** (exp - 1), 30000);
}

export function markAttemptFailed(
  queue: SyncOperation[],
  opId: string,
  errorMessage: string,
  now = Date.now()
): SyncOperation[] {
  return queue.map((op) => {
    if (op.id !== opId) return op;
    const attempts = op.attempts + 1;
    return {
      ...op,
      attempts,
      nextRetryAt: now + computeBackoffMs(attempts),
      lastError: errorMessage,
    };
  });
}

export function getDueOperations(
  queue: SyncOperation[],
  now = Date.now()
): SyncOperation[] {
  return queue.filter((op) => op.nextRetryAt <= now);
}

export function isPermissionDeniedError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? '').toLowerCase();
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '').toLowerCase()
      : '';
  return (
    code.includes('permission-denied') ||
    msg.includes('permission-denied') ||
    msg.includes('missing or insufficient permissions')
  );
}

export function isRetryableFirestoreError(error: unknown): boolean {
  if (isPermissionDeniedError(error)) return false;
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? '').toLowerCase();
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '').toLowerCase()
      : '';
  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('aborted') ||
    code.includes('resource-exhausted') ||
    code.includes('failed-precondition') ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch')
  );
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export async function sha256Hex(input: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic 64-char hex digest when WebCrypto is unavailable
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
}
