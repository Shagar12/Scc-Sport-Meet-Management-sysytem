import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  games,
  meetConfig,
  schedules,
  scores,
  students,
  teachers,
  teamCardEntries,
  teamCards,
} from './schema.ts';
import type { SyncOperation } from '../utils/syncQueue.ts';
import type {
  EventCategoryType,
  Gender,
  HouseId,
  PlaceType,
  PlayerAuditStatus,
  PlayerRole,
  TeamCardStatus,
} from '../types/sports.ts';

const BOOTSTRAP_ADMIN_EMAIL = 'sangeethshagar@gmail.com';

export function isSqlAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL);
}

const HOUSE_WRITE_TYPES = new Set<SyncOperation['type']>([
  'upsert_team_card',
  'submit_team_card',
  'upsert_team_card_entry',
  'delete_team_card_entry',
]);

export async function applySyncOperationsToSql(
  ops: SyncOperation[],
  actorUid: string,
  actorEmail?: string | null
): Promise<{ applied: number }> {
  const isAdmin = isSqlAdminEmail(actorEmail);
  let applied = 0;

  try {
    for (const op of ops) {
      if (!isAdmin && !HOUSE_WRITE_TYPES.has(op.type)) {
        continue;
      }

      switch (op.type) {
        case 'upsert_meet_config': {
          await db
            .insert(meetConfig)
            .values({
              id: 'main',
              meetName: op.payload.meetName,
              cutoffDate: op.payload.cutoffDate,
              ageCategories: op.payload.ageCategories,
              updatedByUid: actorUid,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: meetConfig.id,
              set: {
                meetName: op.payload.meetName,
                cutoffDate: op.payload.cutoffDate,
                ageCategories: op.payload.ageCategories,
                updatedByUid: actorUid,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'upsert_game': {
          const g = op.payload;
          await db
            .insert(games)
            .values({
              id: g.id,
              name: g.name,
              eventType: g.eventType,
              allowedAgeCategories: g.allowedAgeCategories,
              allowedGenders: g.allowedGenders,
              playableSlots: g.playableSlots,
              subSlots: g.subSlots,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: games.id,
              set: {
                name: g.name,
                eventType: g.eventType,
                allowedAgeCategories: g.allowedAgeCategories,
                allowedGenders: g.allowedGenders,
                playableSlots: g.playableSlots,
                subSlots: g.subSlots,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'delete_game': {
          await db.delete(games).where(eq(games.id, op.payload.gameId));
          applied += 1;
          break;
        }

        case 'upsert_schedule': {
          const sc = op.payload;
          await db
            .insert(schedules)
            .values({
              id: sc.id,
              startTime: sc.startTime,
              eventName: sc.eventName,
              category: sc.category,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: schedules.id,
              set: {
                startTime: sc.startTime,
                eventName: sc.eventName,
                category: sc.category,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'delete_schedule': {
          await db
            .delete(schedules)
            .where(eq(schedules.id, op.payload.scheduleId));
          applied += 1;
          break;
        }

        case 'upsert_student': {
          const st = op.payload;
          await db
            .insert(students)
            .values({
              id: st.id,
              admissionNo: st.admissionNo,
              fullName: st.fullName,
              dob: st.dob,
              gender: st.gender,
              grade: st.grade,
              house: st.house,
              talentedAthlete: st.talentedAthlete,
              primarySport: st.primarySport,
              biometrics: st.biometrics ?? {},
              computedAge: st.computedAge,
              verifiedCategory: st.verifiedCategory,
              dobStatus: st.dobStatus,
              dobFlagReason: st.dobFlagReason ?? null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: students.id,
              set: {
                admissionNo: st.admissionNo,
                fullName: st.fullName,
                dob: st.dob,
                gender: st.gender,
                grade: st.grade,
                house: st.house,
                talentedAthlete: st.talentedAthlete,
                primarySport: st.primarySport,
                biometrics: st.biometrics ?? {},
                computedAge: st.computedAge,
                verifiedCategory: st.verifiedCategory,
                dobStatus: st.dobStatus,
                dobFlagReason: st.dobFlagReason ?? null,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'delete_student': {
          await db
            .delete(students)
            .where(eq(students.id, op.payload.studentId));
          applied += 1;
          break;
        }

        case 'upsert_teacher': {
          const t = op.payload;
          await db
            .insert(teachers)
            .values({
              id: t.id,
              fullName: t.fullName,
              staffIdOrSubject: t.staffIdOrSubject,
              role: t.role,
              house: t.house,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: teachers.id,
              set: {
                fullName: t.fullName,
                staffIdOrSubject: t.staffIdOrSubject,
                role: t.role,
                house: t.house,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'delete_teacher': {
          await db
            .delete(teachers)
            .where(eq(teachers.id, op.payload.teacherId));
          applied += 1;
          break;
        }

        case 'upsert_team_card': {
          const tc = op.payload;
          await db
            .insert(teamCards)
            .values({
              id: tc.id,
              house: tc.house,
              title: tc.title,
              status: tc.status,
              submittedAt: tc.submittedAt ?? null,
              reviewedAt: tc.reviewedAt ?? null,
              adminNote: tc.adminNote ?? null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: teamCards.id,
              set: {
                house: tc.house,
                title: tc.title,
                status: tc.status,
                submittedAt: tc.submittedAt ?? null,
                reviewedAt: tc.reviewedAt ?? null,
                adminNote: tc.adminNote ?? null,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'submit_team_card': {
          await db
            .update(teamCards)
            .set({
              status: 'pending_review',
              submittedAt: op.payload.submittedAt,
              updatedAt: new Date(),
            })
            .where(eq(teamCards.id, op.payload.cardId));
          applied += 1;
          break;
        }

        case 'upsert_team_card_entry': {
          const { cardId, house, entry } = op.payload;
          await db
            .insert(teamCards)
            .values({
              id: cardId,
              house,
              title: `${house.charAt(0).toUpperCase() + house.slice(1)} House Playing Team Card`,
              status: 'draft',
              updatedAt: new Date(),
            })
            .onConflictDoNothing({ target: teamCards.id });

          await db
            .insert(teamCardEntries)
            .values({
              id: entry.id,
              cardId,
              house,
              studentId: entry.studentId,
              eventName: entry.eventName,
              eventType: entry.eventType,
              ageCategory: entry.ageCategory,
              gender: entry.gender,
              playerRole: entry.playerRole ?? 'playable',
              auditStatus: entry.auditStatus,
              rejectionReason: entry.rejectionReason ?? null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: teamCardEntries.id,
              set: {
                cardId,
                house,
                studentId: entry.studentId,
                eventName: entry.eventName,
                eventType: entry.eventType,
                ageCategory: entry.ageCategory,
                gender: entry.gender,
                playerRole: entry.playerRole ?? 'playable',
                auditStatus: entry.auditStatus,
                rejectionReason: entry.rejectionReason ?? null,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'delete_team_card_entry': {
          await db
            .delete(teamCardEntries)
            .where(eq(teamCardEntries.id, op.payload.entryId));
          applied += 1;
          break;
        }

        case 'upsert_score': {
          const sc = op.payload;
          await db
            .insert(scores)
            .values({
              id: sc.id,
              house: sc.house,
              eventName: sc.eventName,
              ageCategory: sc.ageCategory,
              place: sc.place,
              points: sc.points,
              timestamp: sc.timestamp,
              note: sc.note ?? null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: scores.id,
              set: {
                house: sc.house,
                eventName: sc.eventName,
                ageCategory: sc.ageCategory,
                place: sc.place,
                points: sc.points,
                timestamp: sc.timestamp,
                note: sc.note ?? null,
                updatedAt: new Date(),
              },
            });
          applied += 1;
          break;
        }

        case 'delete_score': {
          await db.delete(scores).where(eq(scores.id, op.payload.scoreId));
          applied += 1;
          break;
        }

        case 'upsert_house_access':
        case 'upsert_meet_secrets': {
          // Secrets and passcode hashes remain strictly managed in Firestore/Auth
          break;
        }
      }
    }

    return { applied };
  } catch (error) {
    console.error('Database sync failed:', error);
    throw new Error('Database sync failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function getMeetSnapshotFromSql() {
  try {
    const [
      configRows,
      gameRows,
      scheduleRows,
      studentRows,
      teacherRows,
      cardRows,
      entryRows,
      scoreRows,
    ] = await Promise.all([
      db.select().from(meetConfig).where(eq(meetConfig.id, 'main')),
      db.select().from(games),
      db.select().from(schedules),
      db.select().from(students),
      db.select().from(teachers),
      db.select().from(teamCards),
      db.select().from(teamCardEntries),
      db.select().from(scores),
    ]);

    const entriesByCard = new Map<
      string,
      Array<{
        id: string;
        studentId: string;
        eventName: string;
        eventType: EventCategoryType;
        ageCategory: string;
        gender: Gender;
        playerRole: PlayerRole;
        auditStatus: PlayerAuditStatus;
        rejectionReason?: string;
      }>
    >();

    for (const row of entryRows) {
      const list = entriesByCard.get(row.cardId) ?? [];
      list.push({
        id: row.id,
        studentId: row.studentId,
        eventName: row.eventName,
        eventType: row.eventType as EventCategoryType,
        ageCategory: row.ageCategory,
        gender: row.gender as Gender,
        playerRole: (row.playerRole as PlayerRole) || 'playable',
        auditStatus: row.auditStatus as PlayerAuditStatus,
        rejectionReason: row.rejectionReason ?? undefined,
      });
      entriesByCard.set(row.cardId, list);
    }

    return {
      meetConfig: configRows[0] ?? null,
      games: gameRows.map((g) => ({
        id: g.id,
        name: g.name,
        eventType: g.eventType as EventCategoryType,
        allowedAgeCategories: g.allowedAgeCategories,
        allowedGenders: g.allowedGenders,
        playableSlots: g.playableSlots,
        subSlots: g.subSlots,
      })),
      schedules: scheduleRows.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        eventName: s.eventName,
        category: s.category,
      })),
      students: studentRows.map((st) => ({
        id: st.id,
        admissionNo: st.admissionNo,
        fullName: st.fullName,
        dob: st.dob,
        gender: st.gender as Gender,
        grade: st.grade,
        house: (st.house as HouseId | null) ?? null,
        talentedAthlete: st.talentedAthlete,
        primarySport: st.primarySport,
        biometrics: st.biometrics ?? {},
        computedAge: st.computedAge ?? null,
        verifiedCategory: st.verifiedCategory ?? null,
        dobStatus: st.dobStatus as 'verified' | 'invalid' | 'out_of_range',
        dobFlagReason: st.dobFlagReason ?? undefined,
      })),
      teachers: teacherRows.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        staffIdOrSubject: t.staffIdOrSubject,
        role: t.role,
        house: t.house as HouseId,
      })),
      teamCards: cardRows.map((c) => ({
        id: c.id,
        house: c.house as HouseId,
        title: c.title,
        status: c.status as TeamCardStatus,
        submittedAt: c.submittedAt ?? undefined,
        reviewedAt: c.reviewedAt ?? undefined,
        adminNote: c.adminNote ?? undefined,
        entries: entriesByCard.get(c.id) ?? [],
      })),
      scores: scoreRows.map((sc) => ({
        id: sc.id,
        house: sc.house as HouseId,
        eventName: sc.eventName,
        ageCategory: sc.ageCategory,
        place: sc.place as PlaceType,
        points: sc.points,
        timestamp: sc.timestamp,
        note: sc.note ?? undefined,
      })),
    };
  } catch (error) {
    console.error('Database snapshot query failed:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}
