import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  AgeCategory,
  Gender,
  StudentBiometrics,
} from '../types/sports.ts';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const meetConfig = pgTable('meet_config', {
  id: text('id').primaryKey(),
  meetName: text('meet_name').notNull(),
  cutoffDate: text('cutoff_date').notNull(),
  ageCategories: jsonb('age_categories').$type<AgeCategory[]>().notNull(),
  updatedByUid: text('updated_by_uid'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const games = pgTable('games', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  eventType: text('event_type').notNull(),
  allowedAgeCategories: jsonb('allowed_age_categories')
    .$type<string[]>()
    .notNull(),
  allowedGenders: jsonb('allowed_genders').$type<Gender[]>().notNull(),
  playableSlots: integer('playable_slots').notNull(),
  subSlots: integer('sub_slots').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const schedules = pgTable('schedules', {
  id: text('id').primaryKey(),
  startTime: text('start_time').notNull(),
  eventName: text('event_name').notNull(),
  category: text('category').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const students = pgTable('students', {
  id: text('id').primaryKey(),
  admissionNo: text('admission_no').notNull(),
  fullName: text('full_name').notNull(),
  dob: text('dob').notNull(),
  gender: text('gender').notNull(),
  grade: text('grade').notNull(),
  house: text('house'),
  talentedAthlete: boolean('talented_athlete').notNull().default(false),
  primarySport: text('primary_sport').notNull(),
  biometrics: jsonb('biometrics').$type<StudentBiometrics>().notNull(),
  computedAge: integer('computed_age'),
  verifiedCategory: text('verified_category'),
  dobStatus: text('dob_status').notNull(),
  dobFlagReason: text('dob_flag_reason'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  staffIdOrSubject: text('staff_id_or_subject').notNull(),
  role: text('role').notNull(),
  house: text('house').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamCards = pgTable('team_cards', {
  id: text('id').primaryKey(),
  house: text('house').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull(),
  submittedAt: text('submitted_at'),
  reviewedAt: text('reviewed_at'),
  adminNote: text('admin_note'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamCardEntries = pgTable('team_card_entries', {
  id: text('id').primaryKey(),
  cardId: text('card_id')
    .references(() => teamCards.id, { onDelete: 'cascade' })
    .notNull(),
  house: text('house').notNull(),
  studentId: text('student_id').notNull(),
  eventName: text('event_name').notNull(),
  eventType: text('event_type').notNull(),
  ageCategory: text('age_category').notNull(),
  gender: text('gender').notNull(),
  playerRole: text('player_role').notNull().default('playable'),
  auditStatus: text('audit_status').notNull(),
  rejectionReason: text('rejection_reason'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const scores = pgTable('scores', {
  id: text('id').primaryKey(),
  house: text('house').notNull(),
  eventName: text('event_name').notNull(),
  ageCategory: text('age_category').notNull(),
  place: text('place').notNull(),
  points: integer('points').notNull(),
  timestamp: text('timestamp').notNull(),
  note: text('note'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamCardsRelations = relations(teamCards, ({ many }) => ({
  entries: many(teamCardEntries),
}));

export const teamCardEntriesRelations = relations(
  teamCardEntries,
  ({ one }) => ({
    teamCard: one(teamCards, {
      fields: [teamCardEntries.cardId],
      references: [teamCards.id],
    }),
  })
);
