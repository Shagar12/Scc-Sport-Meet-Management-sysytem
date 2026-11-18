export type HouseId = 'mars' | 'jupiter' | 'venus' | 'uranus';

export type Gender = 'Male' | 'Female';

export type DobStatus = 'verified' | 'out_of_range' | 'invalid';

export type TeacherRole =
  | 'Master-in-Charge'
  | 'Assistant Master-in-Charge'
  | 'Track Coach'
  | 'Field Coach';

export type EventCategoryType = 'individual' | 'team';

export type PlaceType = '1st' | '2nd' | '3rd' | 'Record Bonus' | 'Deduction';

export type TeamCardStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'revision_requested';

export type PlayerAuditStatus = 'pending' | 'confirmed' | 'rejected';

export type PlayerRole = 'playable' | 'sub';

export interface GameDefinition {
  id: string;
  name: string;
  eventType: EventCategoryType;
  allowedAgeCategories: string[];
  allowedGenders: Gender[];
  playableSlots: number;
  subSlots: number;
}

export interface EventSchedule {
  id: string;
  startTime: string; // HH:MM (24-hour format)
  eventName: string;
  category: string;
}

export interface HouseMeta {
  id: HouseId;
  name: string;
  shortName: string;
  colorHex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  softBgClass: string;
  motto: string;
}

export const HOUSES: Record<HouseId, HouseMeta> = {
  mars: {
    id: 'mars',
    name: 'Mars House',
    shortName: 'Mars',
    colorHex: '#EF4444',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500',
    borderClass: 'border-red-500/40',
    softBgClass: 'bg-red-500/10',
    motto: 'Relentless Velocity',
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter House',
    shortName: 'Jupiter',
    colorHex: '#22C55E',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500/40',
    softBgClass: 'bg-emerald-500/10',
    motto: 'Endurance & Precision',
  },
  venus: {
    id: 'venus',
    name: 'Venus House',
    shortName: 'Venus',
    colorHex: '#3B82F6',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-500/40',
    softBgClass: 'bg-blue-500/10',
    motto: 'Tactical Excellence',
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus House',
    shortName: 'Uranus',
    colorHex: '#A855F7',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-500/40',
    softBgClass: 'bg-purple-500/10',
    motto: 'Unbroken Momentum',
  },
};

export const HOUSE_ORDER: HouseId[] = ['mars', 'jupiter', 'venus', 'uranus'];

export const INDIVIDUAL_EVENTS = [
  '100m',
  '200m',
  '400m',
  '800m',
  'High Jump',
  'Long Jump',
  'Shot Put',
  'Discus Throw',
  'Javelin Throw',
] as const;

export const TEAM_EVENTS = [
  '4x100m Relay',
  '4x400m Relay',
  'Cricket',
  'Football',
  'Volleyball',
  'Netball',
  'Basketball',
] as const;

export const MAX_INDIVIDUAL_EVENTS = 3;

export interface AgeCategory {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
}

export interface StudentBiometrics {
  restingHeartRate?: number;
  medicalNotes?: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: Gender;
  grade: string;
  house: HouseId | null;
  talentedAthlete: boolean;
  primarySport: string;
  biometrics: StudentBiometrics;
  computedAge: number | null;
  verifiedCategory: string | null;
  dobStatus: DobStatus;
  dobFlagReason?: string;
}

export interface Teacher {
  id: string;
  fullName: string;
  staffIdOrSubject: string;
  role: TeacherRole;
  house: HouseId;
}

export interface TeamCardEntry {
  id: string;
  studentId: string;
  eventName: string;
  eventType: EventCategoryType;
  ageCategory: string;
  gender: Gender;
  playerRole?: PlayerRole;
  auditStatus: PlayerAuditStatus;
  rejectionReason?: string;
}

export interface TeamCard {
  id: string;
  house: HouseId;
  title: string;
  status: TeamCardStatus;
  entries: TeamCardEntry[];
  submittedAt?: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface ScoreEntry {
  id: string;
  house: HouseId;
  eventName: string;
  ageCategory: string;
  place: PlaceType;
  points: number; // positive or negative
  timestamp: string;
  note?: string;
}

export interface HouseCredential {
  house: HouseId;
  password: string;
  isActive: boolean; // true = Active, false = Locked
}

export interface SportsMeetState {
  meetName: string;
  cutoffDate: string; // YYYY-MM-DD
  ageCategories: AgeCategory[];
  games: GameDefinition[];
  schedules: EventSchedule[];
  students: Student[];
  teachers: Teacher[];
  teamCards: TeamCard[];
  scores: ScoreEntry[];
  houseCredentials: Record<HouseId, HouseCredential>;
  adminPassword: string;
}

export type AuthSession =
  | { role: 'admin' }
  | { role: 'house'; house: HouseId }
  | null;
