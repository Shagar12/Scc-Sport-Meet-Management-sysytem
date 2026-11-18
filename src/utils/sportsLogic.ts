import {
  AgeCategory,
  DobStatus,
  EventCategoryType,
  EventSchedule,
  GameDefinition,
  Gender,
  HOUSE_ORDER,
  HouseId,
  INDIVIDUAL_EVENTS,
  MAX_INDIVIDUAL_EVENTS,
  PlayerRole,
  ScoreEntry,
  Student,
  TEAM_EVENTS,
  Teacher,
  TeamCardEntry,
} from '../types/sports';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(dateStr: string): boolean {
  if (!ISO_DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Computes completed years of age on the given cutoffDate (YYYY-MM-DD).
 */
export function computeExactAge(dob: string, cutoffDate: string): number | null {
  if (!isValidIsoDate(dob) || !isValidIsoDate(cutoffDate)) return null;
  const [dy, dm, dd] = dob.split('-').map(Number);
  const [cy, cm, cd] = cutoffDate.split('-').map(Number);
  if (dy > cy || (dy === cy && (dm > cm || (dm === cm && dd > cd)))) {
    return null;
  }
  let age = cy - dy;
  if (cm < dm || (cm === dm && cd < dd)) {
    age -= 1;
  }
  return age;
}

export interface DobVerificationResult {
  computedAge: number | null;
  verifiedCategory: string | null;
  dobStatus: DobStatus;
  dobFlagReason?: string;
}

export function verifyStudentDob(
  dob: string,
  cutoffDate: string,
  categories: AgeCategory[]
): DobVerificationResult {
  if (!isValidIsoDate(dob)) {
    return {
      computedAge: null,
      verifiedCategory: null,
      dobStatus: 'invalid',
      dobFlagReason: 'Invalid DOB format (expected YYYY-MM-DD)',
    };
  }
  const age = computeExactAge(dob, cutoffDate);
  if (age === null || age < 0) {
    return {
      computedAge: null,
      verifiedCategory: null,
      dobStatus: 'invalid',
      dobFlagReason: 'DOB is after the meet cutoff date',
    };
  }
  const sorted = [...categories].sort((a, b) => a.minAge - b.minAge);
  const matched = sorted.find((c) => age >= c.minAge && age <= c.maxAge);
  if (!matched) {
    return {
      computedAge: age,
      verifiedCategory: null,
      dobStatus: 'out_of_range',
      dobFlagReason: `Age ${age} yrs falls outside configured age categories`,
    };
  }
  return {
    computedAge: age,
    verifiedCategory: matched.name,
    dobStatus: 'verified',
  };
}

export function reverifyAllStudents(
  students: Student[],
  cutoffDate: string,
  categories: AgeCategory[]
): Student[] {
  return students.map((student) => {
    const verification = verifyStudentDob(student.dob, cutoffDate, categories);
    return {
      ...student,
      computedAge: verification.computedAge,
      verifiedCategory: verification.verifiedCategory,
      dobStatus: verification.dobStatus,
      dobFlagReason: verification.dobFlagReason,
    };
  });
}

export function findGameByName(
  eventName: string,
  games?: GameDefinition[]
): GameDefinition | undefined {
  if (!games || games.length === 0) return undefined;
  const target = eventName.trim().toLowerCase();
  return games.find((g) => g.name.trim().toLowerCase() === target);
}

export function getEventType(
  eventName: string,
  games?: GameDefinition[]
): EventCategoryType {
  const matchedGame = findGameByName(eventName, games);
  if (matchedGame) return matchedGame.eventType;
  if ((INDIVIDUAL_EVENTS as readonly string[]).includes(eventName)) {
    return 'individual';
  }
  if ((TEAM_EVENTS as readonly string[]).includes(eventName)) {
    return 'team';
  }
  return 'individual';
}

/**
 * Evenly distributes unassigned talented athletes across Mars, Jupiter, Venus, and Uranus,
 * balancing both Age Category and Gender across all four houses.
 */
export function autoDistributeTalentedAthletes(students: Student[]): {
  updatedStudents: Student[];
  distributedCount: number;
  breakdown: Record<HouseId, number>;
} {
  const unassignedTalented = students.filter(
    (s) => s.house === null && s.talentedAthlete
  );
  if (unassignedTalented.length === 0) {
    return {
      updatedStudents: students,
      distributedCount: 0,
      breakdown: { mars: 0, jupiter: 0, venus: 0, uranus: 0 },
    };
  }

  // Track existing counts per house for overall talented, and per (ageCategory + gender) bucket
  const houseTotalTalented: Record<HouseId, number> = {
    mars: 0,
    jupiter: 0,
    venus: 0,
    uranus: 0,
  };
  const houseBucketCount: Record<string, Record<HouseId, number>> = {};

  const getBucketKey = (s: Student) =>
    `${s.verifiedCategory ?? 'UNVERIFIED'}::${s.gender}`;

  for (const s of students) {
    if (s.house && s.talentedAthlete) {
      houseTotalTalented[s.house] += 1;
      const key = getBucketKey(s);
      if (!houseBucketCount[key]) {
        houseBucketCount[key] = { mars: 0, jupiter: 0, venus: 0, uranus: 0 };
      }
      houseBucketCount[key][s.house] += 1;
    }
  }

  // Sort unassigned athletes deterministically by age category, gender, then name
  const queue = [...unassignedTalented].sort((a, b) => {
    const catCmp = (a.verifiedCategory ?? 'ZZZ').localeCompare(
      b.verifiedCategory ?? 'ZZZ'
    );
    if (catCmp !== 0) return catCmp;
    const genCmp = a.gender.localeCompare(b.gender);
    if (genCmp !== 0) return genCmp;
    return a.fullName.localeCompare(b.fullName);
  });

  const assignedMap = new Map<string, HouseId>();
  const breakdown: Record<HouseId, number> = {
    mars: 0,
    jupiter: 0,
    venus: 0,
    uranus: 0,
  };

  for (const athlete of queue) {
    const key = getBucketKey(athlete);
    if (!houseBucketCount[key]) {
      houseBucketCount[key] = { mars: 0, jupiter: 0, venus: 0, uranus: 0 };
    }

    // Pick house with lowest count in this (AgeCategory + Gender) bucket, breaking ties by lowest total talented athletes
    const sortedHouses = [...HOUSE_ORDER].sort((hA, hB) => {
      const bucketDiff = houseBucketCount[key][hA] - houseBucketCount[key][hB];
      if (bucketDiff !== 0) return bucketDiff;
      const totalDiff = houseTotalTalented[hA] - houseTotalTalented[hB];
      if (totalDiff !== 0) return totalDiff;
      return HOUSE_ORDER.indexOf(hA) - HOUSE_ORDER.indexOf(hB);
    });

    const chosenHouse = sortedHouses[0];
    assignedMap.set(athlete.id, chosenHouse);
    houseBucketCount[key][chosenHouse] += 1;
    houseTotalTalented[chosenHouse] += 1;
    breakdown[chosenHouse] += 1;
  }

  const updatedStudents = students.map((s) => {
    const newHouse = assignedMap.get(s.id);
    return newHouse ? { ...s, house: newHouse } : s;
  });

  return {
    updatedStudents,
    distributedCount: assignedMap.size,
    breakdown,
  };
}

export function countStudentEvents(
  entries: TeamCardEntry[],
  studentId: string
): { individualCount: number; teamCount: number } {
  let individualCount = 0;
  let teamCount = 0;
  for (const entry of entries) {
    if (entry.studentId === studentId) {
      if (entry.eventType === 'individual') {
        individualCount += 1;
      } else {
        teamCount += 1;
      }
    }
  }
  return { individualCount, teamCount };
}

export function countGameRoleSlots(
  entries: TeamCardEntry[],
  eventName: string,
  ageCategory: string,
  gender: Gender
): { playableCount: number; subCount: number } {
  let playableCount = 0;
  let subCount = 0;
  const target = eventName.trim().toLowerCase();
  for (const entry of entries) {
    if (
      entry.eventName.trim().toLowerCase() === target &&
      entry.ageCategory === ageCategory &&
      entry.gender === gender
    ) {
      if ((entry.playerRole ?? 'playable') === 'sub') {
        subCount += 1;
      } else {
        playableCount += 1;
      }
    }
  }
  return { playableCount, subCount };
}

export function validateTeamCardEntryAdd(
  student: Student,
  eventName: string,
  eventAgeCategory: string,
  eventGender: Gender,
  existingEntries: TeamCardEntry[],
  options?: {
    playerRole?: PlayerRole;
    game?: GameDefinition;
    games?: GameDefinition[];
  }
): { ok: boolean; error?: string } {
  const playerRole: PlayerRole = options?.playerRole ?? 'playable';
  const game = options?.game ?? findGameByName(eventName, options?.games);

  if (student.dobStatus !== 'verified' || !student.verifiedCategory) {
    return {
      ok: false,
      error: `${student.fullName} does not have an Admin-verified DOB age category.`,
    };
  }
  if (game) {
    if (!game.allowedAgeCategories.includes(eventAgeCategory)) {
      return {
        ok: false,
        error: `${game.name} is not assigned to age category ${eventAgeCategory}.`,
      };
    }
    if (!game.allowedGenders.includes(eventGender)) {
      return {
        ok: false,
        error: `${game.name} is not open for ${eventGender} division.`,
      };
    }
  }
  if (student.verifiedCategory !== eventAgeCategory) {
    return {
      ok: false,
      error: `Age category lock: ${student.fullName} is ${student.verifiedCategory}, cannot enter ${eventAgeCategory}.`,
    };
  }
  if (student.gender !== eventGender) {
    return {
      ok: false,
      error: `Gender lock: ${student.fullName} (${student.gender}) cannot enter ${eventGender} events.`,
    };
  }
  const duplicate = existingEntries.some(
    (e) =>
      e.studentId === student.id &&
      e.eventName.trim().toLowerCase() === eventName.trim().toLowerCase() &&
      e.ageCategory === eventAgeCategory &&
      e.gender === eventGender
  );
  if (duplicate) {
    return {
      ok: false,
      error: `${student.fullName} is already entered in ${eventName} (${eventAgeCategory} ${eventGender}).`,
    };
  }

  if (game) {
    const { playableCount, subCount } = countGameRoleSlots(
      existingEntries,
      game.name,
      eventAgeCategory,
      eventGender
    );
    if (playerRole === 'playable' && playableCount >= game.playableSlots) {
      return {
        ok: false,
        error: `Playable player limit reached (${playableCount}/${game.playableSlots}) for ${game.name} (${eventAgeCategory} ${eventGender}).`,
      };
    }
    if (playerRole === 'sub' && subCount >= game.subSlots) {
      return {
        ok: false,
        error:
          game.subSlots === 0
            ? `${game.name} does not allow substitute players.`
            : `Substitute limit reached (${subCount}/${game.subSlots}) for ${game.name} (${eventAgeCategory} ${eventGender}).`,
      };
    }
  }

  const eventType = game ? game.eventType : getEventType(eventName, options?.games);
  if (eventType === 'individual') {
    const { individualCount } = countStudentEvents(existingEntries, student.id);
    if (individualCount >= MAX_INDIVIDUAL_EVENTS) {
      return {
        ok: false,
        error: `Individual Track & Field limit reached (${individualCount}/${MAX_INDIVIDUAL_EVENTS}) for ${student.fullName}.`,
      };
    }
  }

  return { ok: true };
}

export interface EligibilityAuditResult {
  belongsToHouse: boolean;
  dobAndGenderMatch: boolean;
  individualCountWithinLimit: boolean;
  gameQuotaOk: boolean;
  individualCount: number;
  allPassed: boolean;
  issues: string[];
}

export function auditTeamCardPlayer(
  entry: TeamCardEntry,
  student: Student | undefined,
  submittingHouse: HouseId,
  allCardEntries: TeamCardEntry[],
  games?: GameDefinition[]
): EligibilityAuditResult {
  const issues: string[] = [];
  if (!student) {
    return {
      belongsToHouse: false,
      dobAndGenderMatch: false,
      individualCountWithinLimit: false,
      gameQuotaOk: false,
      individualCount: 0,
      allPassed: false,
      issues: ['Student record not found in master roster'],
    };
  }

  const belongsToHouse = student.house === submittingHouse;
  if (!belongsToHouse) {
    issues.push(
      `Assigned to ${student.house ?? 'Unassigned'}, not ${submittingHouse}`
    );
  }

  const dobAndGenderMatch =
    student.dobStatus === 'verified' &&
    student.verifiedCategory === entry.ageCategory &&
    student.gender === entry.gender;

  if (!dobAndGenderMatch) {
    issues.push(
      `Verified profile is ${student.verifiedCategory ?? 'Unverified'} ${student.gender}; event requires ${entry.ageCategory} ${entry.gender}`
    );
  }

  const { individualCount } = countStudentEvents(allCardEntries, student.id);
  const individualCountWithinLimit = individualCount <= MAX_INDIVIDUAL_EVENTS;
  if (!individualCountWithinLimit) {
    issues.push(
      `Individual Track & Field count is ${individualCount}/${MAX_INDIVIDUAL_EVENTS}`
    );
  }

  let gameQuotaOk = true;
  const game = findGameByName(entry.eventName, games);
  if (game) {
    if (!game.allowedAgeCategories.includes(entry.ageCategory)) {
      gameQuotaOk = false;
      issues.push(`${game.name} is not open for ${entry.ageCategory}`);
    }
    if (!game.allowedGenders.includes(entry.gender)) {
      gameQuotaOk = false;
      issues.push(`${game.name} is not open for ${entry.gender}`);
    }
    const { playableCount, subCount } = countGameRoleSlots(
      allCardEntries,
      entry.eventName,
      entry.ageCategory,
      entry.gender
    );
    const role = entry.playerRole ?? 'playable';
    if (role === 'playable' && playableCount > game.playableSlots) {
      gameQuotaOk = false;
      issues.push(
        `Playable slots exceeded (${playableCount}/${game.playableSlots})`
      );
    }
    if (role === 'sub' && subCount > game.subSlots) {
      gameQuotaOk = false;
      issues.push(`Sub slots exceeded (${subCount}/${game.subSlots})`);
    }
  }

  return {
    belongsToHouse,
    dobAndGenderMatch,
    individualCountWithinLimit,
    gameQuotaOk,
    individualCount,
    allPassed:
      belongsToHouse &&
      dobAndGenderMatch &&
      individualCountWithinLimit &&
      gameQuotaOk,
    issues,
  };
}

export interface HouseStanding {
  house: HouseId;
  totalPoints: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  recordCount: number;
  rank: number;
}

export function computeHouseStandings(scores: ScoreEntry[]): HouseStanding[] {
  const map: Record<HouseId, Omit<HouseStanding, 'rank'>> = {
    mars: {
      house: 'mars',
      totalPoints: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      recordCount: 0,
    },
    jupiter: {
      house: 'jupiter',
      totalPoints: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      recordCount: 0,
    },
    venus: {
      house: 'venus',
      totalPoints: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      recordCount: 0,
    },
    uranus: {
      house: 'uranus',
      totalPoints: 0,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      recordCount: 0,
    },
  };

  for (const s of scores) {
    const entry = map[s.house];
    entry.totalPoints += s.points;
    if (s.place === '1st') entry.goldCount += 1;
    else if (s.place === '2nd') entry.silverCount += 1;
    else if (s.place === '3rd') entry.bronzeCount += 1;
    else if (s.place === 'Record Bonus') entry.recordCount += 1;
  }

  const sorted = Object.values(map).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
    return HOUSE_ORDER.indexOf(a.house) - HOUSE_ORDER.indexOf(b.house);
  });

  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

export interface HouseBalanceSummary {
  house: HouseId;
  totalStudents: number;
  talentedAthletes: number;
  appointedTeachers: number;
}

export function computeHouseBalances(
  students: Student[],
  teachers: Teacher[]
): Record<HouseId, HouseBalanceSummary> {
  const summary: Record<HouseId, HouseBalanceSummary> = {
    mars: { house: 'mars', totalStudents: 0, talentedAthletes: 0, appointedTeachers: 0 },
    jupiter: { house: 'jupiter', totalStudents: 0, talentedAthletes: 0, appointedTeachers: 0 },
    venus: { house: 'venus', totalStudents: 0, talentedAthletes: 0, appointedTeachers: 0 },
    uranus: { house: 'uranus', totalStudents: 0, talentedAthletes: 0, appointedTeachers: 0 },
  };

  for (const s of students) {
    if (s.house) {
      summary[s.house].totalStudents += 1;
      if (s.talentedAthlete) {
        summary[s.house].talentedAthletes += 1;
      }
    }
  }

  for (const t of teachers) {
    summary[t.house].appointedTeachers += 1;
  }

  return summary;
}

export function isValidScheduleTime(startTime: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime.trim());
}

export function sortSchedulesByTime(schedules: EventSchedule[]): EventSchedule[] {
  return [...schedules].sort((a, b) => {
    const timeCmp = a.startTime.localeCompare(b.startTime);
    if (timeCmp !== 0) return timeCmp;
    return a.eventName.localeCompare(b.eventName);
  });
}

export function formatScheduleTime(startTime: string): string {
  if (!isValidScheduleTime(startTime)) return startTime;
  const [hourStr, minStr] = startTime.split(':');
  const hour24 = Number(hourStr);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${period}`;
}

export function countHouseEntriesForSchedule(
  entries: TeamCardEntry[],
  schedule: EventSchedule
): number {
  const schedEvent = schedule.eventName.trim().toLowerCase();
  const schedCat = schedule.category.trim().toLowerCase();
  const isAllCategories =
    schedCat === 'all' || schedCat === 'open / all' || schedCat === 'open';

  return entries.filter((entry) => {
    const entryEvent = entry.eventName.trim().toLowerCase();
    const eventMatch =
      entryEvent === schedEvent ||
      schedEvent.includes(entryEvent) ||
      entryEvent.includes(schedEvent);
    if (!eventMatch) return false;
    if (isAllCategories) return true;
    return entry.ageCategory.trim().toLowerCase() === schedCat;
  }).length;
}

export function getHouseAppointments(
  students: Student[],
  teachers: Teacher[],
  house: HouseId | 'all'
): { houseTeachers: Teacher[]; houseStudents: Student[] } {
  if (house === 'all') {
    return { houseTeachers: teachers, houseStudents: students };
  }
  return {
    houseTeachers: teachers.filter((t) => t.house === house),
    houseStudents: students.filter((s) => s.house === house),
  };
}

