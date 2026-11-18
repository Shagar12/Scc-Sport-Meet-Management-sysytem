import {
  AgeCategory,
  EventSchedule,
  GameDefinition,
  HouseId,
  ScoreEntry,
  SportsMeetState,
  Student,
  Teacher,
  TeamCard,
} from '../types/sports';
import { verifyStudentDob } from '../utils/sportsLogic';

export const DEFAULT_CUTOFF_DATE = '2026-01-01';

export const DEFAULT_AGE_CATEGORIES: AgeCategory[] = [
  { id: 'cat-u12', name: 'U-12', minAge: 10, maxAge: 11 },
  { id: 'cat-u14', name: 'U-14', minAge: 12, maxAge: 13 },
  { id: 'cat-u16', name: 'U-16', minAge: 14, maxAge: 15 },
  { id: 'cat-u18', name: 'U-18', minAge: 16, maxAge: 17 },
  { id: 'cat-u20', name: 'U-20', minAge: 18, maxAge: 19 },
];

const ALL_DEFAULT_AGE_NAMES = DEFAULT_AGE_CATEGORIES.map((c) => c.name);

export const INITIAL_GAMES: GameDefinition[] = [
  {
    id: 'game-100m',
    name: '100m',
    eventType: 'individual',
    allowedAgeCategories: ALL_DEFAULT_AGE_NAMES,
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-200m',
    name: '200m',
    eventType: 'individual',
    allowedAgeCategories: ALL_DEFAULT_AGE_NAMES,
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-400m',
    name: '400m',
    eventType: 'individual',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-800m',
    name: '800m',
    eventType: 'individual',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-hj',
    name: 'High Jump',
    eventType: 'individual',
    allowedAgeCategories: ALL_DEFAULT_AGE_NAMES,
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-lj',
    name: 'Long Jump',
    eventType: 'individual',
    allowedAgeCategories: ALL_DEFAULT_AGE_NAMES,
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-sp',
    name: 'Shot Put',
    eventType: 'individual',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-dt',
    name: 'Discus Throw',
    eventType: 'individual',
    allowedAgeCategories: ['U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-jt',
    name: 'Javelin Throw',
    eventType: 'individual',
    allowedAgeCategories: ['U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  },
  {
    id: 'game-4x100',
    name: '4x100m Relay',
    eventType: 'team',
    allowedAgeCategories: ALL_DEFAULT_AGE_NAMES,
    allowedGenders: ['Male', 'Female'],
    playableSlots: 4,
    subSlots: 2,
  },
  {
    id: 'game-4x400',
    name: '4x400m Relay',
    eventType: 'team',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 4,
    subSlots: 2,
  },
  {
    id: 'game-cricket',
    name: 'Cricket',
    eventType: 'team',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 11,
    subSlots: 4,
  },
  {
    id: 'game-football',
    name: 'Football',
    eventType: 'team',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 11,
    subSlots: 4,
  },
  {
    id: 'game-volleyball',
    name: 'Volleyball',
    eventType: 'team',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 6,
    subSlots: 3,
  },
  {
    id: 'game-netball',
    name: 'Netball',
    eventType: 'team',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Female'],
    playableSlots: 7,
    subSlots: 3,
  },
  {
    id: 'game-basketball',
    name: 'Basketball',
    eventType: 'team',
    allowedAgeCategories: ['U-14', 'U-16', 'U-18', 'U-20'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 5,
    subSlots: 3,
  },
];

interface RawStudentSeed {
  id: string;
  admissionNo: string;
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female';
  grade: string;
  house: HouseId | null;
  talentedAthlete: boolean;
  primarySport: string;
  restingHeartRate: number;
  medicalNotes?: string;
}

const RAW_STUDENTS: RawStudentSeed[] = [
  // MARS HOUSE (5 students)
  {
    id: 'stu-01',
    admissionNo: 'SCC-1001',
    fullName: 'Ryan De Silva',
    dob: '2010-05-14', // 15 -> U-16
    gender: 'Male',
    grade: 'Grade 10',
    house: 'mars',
    talentedAthlete: true,
    primarySport: '100m',
    restingHeartRate: 58,
    medicalNotes: 'Cleared for sprint & relay competition',
  },
  {
    id: 'stu-02',
    admissionNo: 'SCC-1002',
    fullName: 'Amaya Senanayake',
    dob: '2010-09-22', // 15 -> U-16
    gender: 'Female',
    grade: 'Grade 10',
    house: 'mars',
    talentedAthlete: true,
    primarySport: '200m',
    restingHeartRate: 61,
    medicalNotes: 'Cleared',
  },
  {
    id: 'stu-03',
    admissionNo: 'SCC-1003',
    fullName: 'Kasun Rajapaksa',
    dob: '2008-08-19', // 17 -> U-18
    gender: 'Male',
    grade: 'Grade 12',
    house: 'mars',
    talentedAthlete: true,
    primarySport: 'Javelin Throw',
    restingHeartRate: 56,
    medicalNotes: 'Shoulder mobility cleared',
  },
  {
    id: 'stu-04',
    admissionNo: 'SCC-1004',
    fullName: 'Dinithi Perera',
    dob: '2012-11-04', // 13 -> U-14
    gender: 'Female',
    grade: 'Grade 8',
    house: 'mars',
    talentedAthlete: false,
    primarySport: 'Netball',
    restingHeartRate: 66,
  },
  {
    id: 'stu-05',
    admissionNo: 'SCC-1005',
    fullName: 'Tharindu Bandara',
    dob: '2014-04-08', // 11 -> U-12
    gender: 'Male',
    grade: 'Grade 6',
    house: 'mars',
    talentedAthlete: false,
    primarySport: 'High Jump',
    restingHeartRate: 68,
  },

  // JUPITER HOUSE (5 students)
  {
    id: 'stu-06',
    admissionNo: 'SCC-1006',
    fullName: 'Shehan Wickramasinghe',
    dob: '2010-03-11', // 15 -> U-16
    gender: 'Male',
    grade: 'Grade 10',
    house: 'jupiter',
    talentedAthlete: true,
    primarySport: '800m',
    restingHeartRate: 52,
    medicalNotes: 'High aerobic endurance baseline',
  },
  {
    id: 'stu-07',
    admissionNo: 'SCC-1007',
    fullName: 'Sanduni Gunasekara',
    dob: '2009-02-17', // 16 -> U-18
    gender: 'Female',
    grade: 'Grade 11',
    house: 'jupiter',
    talentedAthlete: true,
    primarySport: '400m',
    restingHeartRate: 57,
  },
  {
    id: 'stu-08',
    admissionNo: 'SCC-1008',
    fullName: 'Malith Jayasinghe',
    dob: '2012-07-29', // 13 -> U-14
    gender: 'Male',
    grade: 'Grade 8',
    house: 'jupiter',
    talentedAthlete: true,
    primarySport: 'Long Jump',
    restingHeartRate: 62,
  },
  {
    id: 'stu-09',
    admissionNo: 'SCC-1009',
    fullName: 'Ishara Samarasinghe',
    dob: '2010-12-01', // 15 -> U-16
    gender: 'Female',
    grade: 'Grade 10',
    house: 'jupiter',
    talentedAthlete: false,
    primarySport: 'Volleyball',
    restingHeartRate: 64,
  },
  {
    id: 'stu-10',
    admissionNo: 'SCC-1010',
    fullName: 'Nisal Rodrigo',
    dob: '2007-06-25', // 18 -> U-20
    gender: 'Male',
    grade: 'Grade 13',
    house: 'jupiter',
    talentedAthlete: false,
    primarySport: 'Cricket',
    restingHeartRate: 60,
  },

  // VENUS HOUSE (5 students)
  {
    id: 'stu-11',
    admissionNo: 'SCC-1011',
    fullName: 'Chamath Karunaratne',
    dob: '2009-04-03', // 16 -> U-18
    gender: 'Male',
    grade: 'Grade 11',
    house: 'venus',
    talentedAthlete: true,
    primarySport: '100m',
    restingHeartRate: 55,
  },
  {
    id: 'stu-12',
    admissionNo: 'SCC-1012',
    fullName: 'Dilini Abeysekera',
    dob: '2011-01-19', // 14 -> U-16
    gender: 'Female',
    grade: 'Grade 9',
    house: 'venus',
    talentedAthlete: true,
    primarySport: 'High Jump',
    restingHeartRate: 59,
  },
  {
    id: 'stu-13',
    admissionNo: 'SCC-1013',
    fullName: 'Ravindu Herath',
    dob: '2013-08-14', // 12 -> U-14
    gender: 'Male',
    grade: 'Grade 7',
    house: 'venus',
    talentedAthlete: false,
    primarySport: 'Football',
    restingHeartRate: 65,
  },
  {
    id: 'stu-14',
    admissionNo: 'SCC-1014',
    fullName: 'Tashini Mendis',
    dob: '2014-09-09', // 11 -> U-12
    gender: 'Female',
    grade: 'Grade 6',
    house: 'venus',
    talentedAthlete: true,
    primarySport: '100m',
    restingHeartRate: 67,
  },
  {
    id: 'stu-15',
    admissionNo: 'SCC-1015',
    fullName: 'Bhanuka Alwis',
    dob: '2007-10-12', // 18 -> U-20
    gender: 'Male',
    grade: 'Grade 13',
    house: 'venus',
    talentedAthlete: false,
    primarySport: 'Shot Put',
    restingHeartRate: 63,
  },

  // URANUS HOUSE (5 students)
  {
    id: 'stu-16',
    admissionNo: 'SCC-1016',
    fullName: 'Oshadhi Wickrama',
    dob: '2010-07-16', // 15 -> U-16
    gender: 'Female',
    grade: 'Grade 10',
    house: 'uranus',
    talentedAthlete: true,
    primarySport: '400m',
    restingHeartRate: 58,
  },
  {
    id: 'stu-17',
    admissionNo: 'SCC-1017',
    fullName: 'Janith Kumara',
    dob: '2008-11-28', // 17 -> U-18
    gender: 'Male',
    grade: 'Grade 12',
    house: 'uranus',
    talentedAthlete: true,
    primarySport: 'Discus Throw',
    restingHeartRate: 59,
  },
  {
    id: 'stu-18',
    admissionNo: 'SCC-1018',
    fullName: 'Kaveesha Pathirana',
    dob: '2012-05-06', // 13 -> U-14
    gender: 'Female',
    grade: 'Grade 8',
    house: 'uranus',
    talentedAthlete: true,
    primarySport: 'Long Jump',
    restingHeartRate: 61,
  },
  {
    id: 'stu-19',
    admissionNo: 'SCC-1019',
    fullName: 'Hasitha Ranasinghe',
    dob: '2010-02-20', // 15 -> U-16
    gender: 'Male',
    grade: 'Grade 10',
    house: 'uranus',
    talentedAthlete: false,
    primarySport: 'Basketball',
    restingHeartRate: 62,
  },
  {
    id: 'stu-20',
    admissionNo: 'SCC-1020',
    fullName: 'Senuri Ekanayake',
    dob: '2007-03-30', // 18 -> U-20
    gender: 'Female',
    grade: 'Grade 13',
    house: 'uranus',
    talentedAthlete: false,
    primarySport: 'Netball',
    restingHeartRate: 63,
  },

  // UNASSIGNED TALENTED POOL (4 students - total 24 students, ready for 1-click Auto-Distribute)
  {
    id: 'stu-21',
    admissionNo: 'SCC-1021',
    fullName: 'Pasindu Liyanage',
    dob: '2011-06-11', // 14 -> U-16
    gender: 'Male',
    grade: 'Grade 9',
    house: null,
    talentedAthlete: true,
    primarySport: '200m',
    restingHeartRate: 57,
    medicalNotes: 'Provincial Junior Sprint Finalist',
  },
  {
    id: 'stu-22',
    admissionNo: 'SCC-1022',
    fullName: 'Minuli Gunawardena',
    dob: '2011-09-15', // 14 -> U-16
    gender: 'Female',
    grade: 'Grade 9',
    house: null,
    talentedAthlete: true,
    primarySport: '800m',
    restingHeartRate: 54,
    medicalNotes: 'National Youth Cross-Country Squad',
  },
  {
    id: 'stu-23',
    admissionNo: 'SCC-1023',
    fullName: 'Yohan Gamage',
    dob: '2013-03-21', // 12 -> U-14
    gender: 'Male',
    grade: 'Grade 7',
    house: null,
    talentedAthlete: true,
    primarySport: '100m',
    restingHeartRate: 60,
  },
  {
    id: 'stu-24',
    admissionNo: 'SCC-1024',
    fullName: 'Anuki Dissanayake',
    dob: '2013-07-08', // 12 -> U-14
    gender: 'Female',
    grade: 'Grade 7',
    house: null,
    talentedAthlete: true,
    primarySport: 'High Jump',
    restingHeartRate: 61,
  },
];

const INITIAL_STUDENTS: Student[] = RAW_STUDENTS.map((s) => {
  const verification = verifyStudentDob(
    s.dob,
    DEFAULT_CUTOFF_DATE,
    DEFAULT_AGE_CATEGORIES
  );
  return {
    id: s.id,
    admissionNo: s.admissionNo,
    fullName: s.fullName,
    dob: s.dob,
    gender: s.gender,
    grade: s.grade,
    house: s.house,
    talentedAthlete: s.talentedAthlete,
    primarySport: s.primarySport,
    biometrics: {
      restingHeartRate: s.restingHeartRate,
      medicalNotes: s.medicalNotes,
    },
    computedAge: verification.computedAge,
    verifiedCategory: verification.verifiedCategory,
    dobStatus: verification.dobStatus,
    dobFlagReason: verification.dobFlagReason,
  };
});

const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-01',
    fullName: 'Rohan Wijeratne',
    staffIdOrSubject: 'STF-104 · Physical Education',
    role: 'Master-in-Charge',
    house: 'mars',
  },
  {
    id: 'tch-02',
    fullName: 'Nimali Jayaweera',
    staffIdOrSubject: 'STF-112 · Biology',
    role: 'Track Coach',
    house: 'mars',
  },
  {
    id: 'tch-03',
    fullName: 'Pradeep Kumara',
    staffIdOrSubject: 'STF-108 · Mathematics',
    role: 'Master-in-Charge',
    house: 'jupiter',
  },
  {
    id: 'tch-04',
    fullName: 'Chathurika Silva',
    staffIdOrSubject: 'STF-119 · Chemistry',
    role: 'Assistant Master-in-Charge',
    house: 'jupiter',
  },
  {
    id: 'tch-05',
    fullName: 'Suresh Fernando',
    staffIdOrSubject: 'STF-103 · Sports Science',
    role: 'Master-in-Charge',
    house: 'venus',
  },
  {
    id: 'tch-06',
    fullName: 'Dilani Jayalath',
    staffIdOrSubject: 'STF-124 · English Literature',
    role: 'Field Coach',
    house: 'venus',
  },
  {
    id: 'tch-07',
    fullName: 'Asanka Perera',
    staffIdOrSubject: 'STF-109 · Physics',
    role: 'Master-in-Charge',
    house: 'uranus',
  },
  {
    id: 'tch-08',
    fullName: 'Madhavi Ratnayake',
    staffIdOrSubject: 'STF-127 · Geography',
    role: 'Track Coach',
    house: 'uranus',
  },
];

const INITIAL_SCORES: ScoreEntry[] = [
  {
    id: 'scr-01',
    house: 'mars',
    eventName: '100m Boys',
    ageCategory: 'U-16',
    place: '1st',
    points: 10,
    timestamp: '2026-11-18T08:30:00Z',
    note: 'Finals Heat 1 winner',
  },
  {
    id: 'scr-02',
    house: 'jupiter',
    eventName: '800m Boys',
    ageCategory: 'U-16',
    place: '1st',
    points: 10,
    timestamp: '2026-11-18T09:15:00Z',
  },
  {
    id: 'scr-03',
    house: 'jupiter',
    eventName: '800m Boys',
    ageCategory: 'U-16',
    place: 'Record Bonus',
    points: 5,
    timestamp: '2026-11-18T09:16:00Z',
    note: 'New Meet Record 2:04.12',
  },
  {
    id: 'scr-04',
    house: 'venus',
    eventName: 'High Jump Girls',
    ageCategory: 'U-16',
    place: '1st',
    points: 10,
    timestamp: '2026-11-18T09:45:00Z',
  },
  {
    id: 'scr-05',
    house: 'uranus',
    eventName: '400m Girls',
    ageCategory: 'U-16',
    place: '2nd',
    points: 7,
    timestamp: '2026-11-18T10:05:00Z',
  },
  {
    id: 'scr-06',
    house: 'mars',
    eventName: 'Javelin Throw Boys',
    ageCategory: 'U-18',
    place: '2nd',
    points: 7,
    timestamp: '2026-11-18T10:30:00Z',
  },
  {
    id: 'scr-07',
    house: 'venus',
    eventName: '100m Boys',
    ageCategory: 'U-18',
    place: '3rd',
    points: 5,
    timestamp: '2026-11-18T10:45:00Z',
  },
  {
    id: 'scr-08',
    house: 'uranus',
    eventName: 'Discus Throw Boys',
    ageCategory: 'U-18',
    place: '1st',
    points: 10,
    timestamp: '2026-11-18T11:00:00Z',
  },
];

const INITIAL_TEAM_CARDS: TeamCard[] = [
  {
    id: 'card-jupiter-01',
    house: 'jupiter',
    title: 'Jupiter House Official Track & Field Card',
    status: 'pending_review',
    submittedAt: '2026-11-18T07:45:00Z',
    entries: [
      {
        id: 'tce-01',
        studentId: 'stu-06',
        eventName: '800m',
        eventType: 'individual',
        ageCategory: 'U-16',
        gender: 'Male',
        auditStatus: 'pending',
      },
      {
        id: 'tce-02',
        studentId: 'stu-06',
        eventName: '400m',
        eventType: 'individual',
        ageCategory: 'U-16',
        gender: 'Male',
        auditStatus: 'pending',
      },
      {
        id: 'tce-03',
        studentId: 'stu-06',
        eventName: '4x400m Relay',
        eventType: 'team',
        ageCategory: 'U-16',
        gender: 'Male',
        auditStatus: 'pending',
      },
      {
        id: 'tce-04',
        studentId: 'stu-07',
        eventName: '400m',
        eventType: 'individual',
        ageCategory: 'U-18',
        gender: 'Female',
        auditStatus: 'pending',
      },
      {
        id: 'tce-05',
        studentId: 'stu-08',
        eventName: 'Long Jump',
        eventType: 'individual',
        ageCategory: 'U-14',
        gender: 'Male',
        auditStatus: 'pending',
      },
    ],
  },
  {
    id: 'card-mars-01',
    house: 'mars',
    title: 'Mars House Playing Team Card',
    status: 'draft',
    entries: [
      {
        id: 'tce-m1',
        studentId: 'stu-01',
        eventName: '100m',
        eventType: 'individual',
        ageCategory: 'U-16',
        gender: 'Male',
        auditStatus: 'pending',
      },
      {
        id: 'tce-m2',
        studentId: 'stu-01',
        eventName: '200m',
        eventType: 'individual',
        ageCategory: 'U-16',
        gender: 'Male',
        auditStatus: 'pending',
      },
    ],
  },
  {
    id: 'card-venus-01',
    house: 'venus',
    title: 'Venus House Playing Team Card',
    status: 'draft',
    entries: [],
  },
  {
    id: 'card-uranus-01',
    house: 'uranus',
    title: 'Uranus House Playing Team Card',
    status: 'draft',
    entries: [],
  },
];

export const INITIAL_SCHEDULES: EventSchedule[] = [
  {
    id: 'sch-01',
    startTime: '08:30',
    eventName: '100m Heats',
    category: 'U-16',
  },
  {
    id: 'sch-02',
    startTime: '09:15',
    eventName: '800m Finals',
    category: 'U-16',
  },
  {
    id: 'sch-03',
    startTime: '10:00',
    eventName: 'High Jump',
    category: 'U-16',
  },
  {
    id: 'sch-04',
    startTime: '11:00',
    eventName: 'Long Jump',
    category: 'U-14',
  },
  {
    id: 'sch-05',
    startTime: '13:30',
    eventName: '400m Finals',
    category: 'U-18',
  },
  {
    id: 'sch-06',
    startTime: '15:00',
    eventName: '4x100m Relay',
    category: 'U-16',
  },
];

export function createInitialSeedState(): SportsMeetState {
  return {
    meetName: 'SCC Annual Inter-House Sports Meet 2026',
    cutoffDate: DEFAULT_CUTOFF_DATE,
    ageCategories: DEFAULT_AGE_CATEGORIES,
    games: INITIAL_GAMES,
    schedules: INITIAL_SCHEDULES,
    students: INITIAL_STUDENTS,
    teachers: INITIAL_TEACHERS,
    teamCards: INITIAL_TEAM_CARDS,
    scores: INITIAL_SCORES,
    houseCredentials: {
      mars: { house: 'mars', password: 'mars123', isActive: true },
      jupiter: { house: 'jupiter', password: 'jupiter123', isActive: true },
      venus: { house: 'venus', password: 'venus123', isActive: true },
      uranus: { house: 'uranus', password: 'uranus123', isActive: true },
    },
    adminPassword: 'admin2026',
  };
}
