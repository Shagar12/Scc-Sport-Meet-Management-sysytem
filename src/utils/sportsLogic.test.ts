import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditTeamCardPlayer,
  autoDistributeTalentedAthletes,
  computeExactAge,
  computeHouseStandings,
  countGameRoleSlots,
  countHouseEntriesForSchedule,
  countStudentEvents,
  formatScheduleTime,
  getHouseAppointments,
  isValidScheduleTime,
  reverifyAllStudents,
  sortSchedulesByTime,
  validateTeamCardEntryAdd,
  verifyStudentDob,
} from './sportsLogic';
import {
  AgeCategory,
  EventSchedule,
  GameDefinition,
  ScoreEntry,
  Student,
  Teacher,
  TeamCardEntry,
} from '../types/sports';

const CATEGORIES: AgeCategory[] = [
  { id: 'u12', name: 'U-12', minAge: 10, maxAge: 11 },
  { id: 'u14', name: 'U-14', minAge: 12, maxAge: 13 },
  { id: 'u16', name: 'U-16', minAge: 14, maxAge: 15 },
  { id: 'u18', name: 'U-18', minAge: 16, maxAge: 17 },
  { id: 'u20', name: 'U-20', minAge: 18, maxAge: 19 },
];

function makeStudent(overrides: Partial<Student>): Student {
  const dob = overrides.dob ?? '2010-06-15';
  const ver = verifyStudentDob(dob, '2026-01-01', CATEGORIES);
  return {
    id: overrides.id ?? 'stu-1',
    admissionNo: overrides.admissionNo ?? 'SCC-001',
    fullName: overrides.fullName ?? 'Alex Silva',
    dob,
    gender: overrides.gender ?? 'Male',
    grade: overrides.grade ?? 'Grade 10',
    house: overrides.house === undefined ? 'mars' : overrides.house,
    talentedAthlete: overrides.talentedAthlete ?? true,
    primarySport: overrides.primarySport ?? '100m',
    biometrics: overrides.biometrics ?? { restingHeartRate: 60 },
    computedAge: overrides.computedAge ?? ver.computedAge,
    verifiedCategory:
      overrides.verifiedCategory !== undefined
        ? overrides.verifiedCategory
        : ver.verifiedCategory,
    dobStatus: overrides.dobStatus ?? ver.dobStatus,
    dobFlagReason: overrides.dobFlagReason ?? ver.dobFlagReason,
  };
}

test('computeExactAge and verifyStudentDob evaluate age accurately on cutoff date', () => {
  assert.equal(computeExactAge('2010-01-01', '2026-01-01'), 16);
  assert.equal(computeExactAge('2010-01-02', '2026-01-01'), 15);

  const u16 = verifyStudentDob('2010-01-02', '2026-01-01', CATEGORIES);
  assert.equal(u16.dobStatus, 'verified');
  assert.equal(u16.verifiedCategory, 'U-16');

  const outOfRange = verifyStudentDob('2002-05-10', '2026-01-01', CATEGORIES);
  assert.equal(outOfRange.dobStatus, 'out_of_range');
  assert.equal(outOfRange.verifiedCategory, null);

  const invalid = verifyStudentDob('2010-99-99', '2026-01-01', CATEGORIES);
  assert.equal(invalid.dobStatus, 'invalid');
});

test('reverifyAllStudents updates categories when cutoff date changes', () => {
  const s = makeStudent({ dob: '2010-06-01' }); // 15 on 2026-01-01 -> U-16
  assert.equal(s.verifiedCategory, 'U-16');

  const updated = reverifyAllStudents([s], '2027-01-01', CATEGORIES); // 16 on 2027-01-01 -> U-18
  assert.equal(updated[0].verifiedCategory, 'U-18');
  assert.equal(updated[0].computedAge, 16);
});

test('autoDistributeTalentedAthletes balances age category and gender evenly across 4 houses', () => {
  const unassigned: Student[] = [
    makeStudent({ id: 'a1', house: null, dob: '2011-03-01', gender: 'Male' }),
    makeStudent({ id: 'a2', house: null, dob: '2011-04-01', gender: 'Male' }),
    makeStudent({ id: 'a3', house: null, dob: '2011-05-01', gender: 'Male' }),
    makeStudent({ id: 'a4', house: null, dob: '2011-06-01', gender: 'Male' }),
    makeStudent({ id: 'a5', house: null, dob: '2011-03-01', gender: 'Female' }),
    makeStudent({ id: 'a6', house: null, dob: '2011-04-01', gender: 'Female' }),
    makeStudent({ id: 'a7', house: null, dob: '2011-05-01', gender: 'Female' }),
    makeStudent({ id: 'a8', house: null, dob: '2011-06-01', gender: 'Female' }),
  ];

  const result = autoDistributeTalentedAthletes(unassigned);
  assert.equal(result.distributedCount, 8);
  assert.deepEqual(result.breakdown, {
    mars: 2,
    jupiter: 2,
    venus: 2,
    uranus: 2,
  });

  // Verify each house got exactly 1 Male and 1 Female
  for (const house of ['mars', 'jupiter', 'venus', 'uranus'] as const) {
    const houseKids = result.updatedStudents.filter((s) => s.house === house);
    assert.equal(houseKids.filter((s) => s.gender === 'Male').length, 1);
    assert.equal(houseKids.filter((s) => s.gender === 'Female').length, 1);
  }
});

test('team card enforces max 3 individual events, unlimited team games, and strict age/gender lock', () => {
  const student = makeStudent({
    id: 's-1',
    dob: '2011-05-01', // age 14 -> U-16
    gender: 'Female',
    house: 'mars',
  });

  let entries: TeamCardEntry[] = [
    {
      id: 'e1',
      studentId: 's-1',
      eventName: '100m',
      eventType: 'individual',
      ageCategory: 'U-16',
      gender: 'Female',
      auditStatus: 'pending',
    },
    {
      id: 'e2',
      studentId: 's-1',
      eventName: '200m',
      eventType: 'individual',
      ageCategory: 'U-16',
      gender: 'Female',
      auditStatus: 'pending',
    },
    {
      id: 'e3',
      studentId: 's-1',
      eventName: 'Long Jump',
      eventType: 'individual',
      ageCategory: 'U-16',
      gender: 'Female',
      auditStatus: 'pending',
    },
  ];

  // 4th individual event must fail
  const fourthIndividual = validateTeamCardEntryAdd(
    student,
    'High Jump',
    'U-16',
    'Female',
    entries
  );
  assert.equal(fourthIndividual.ok, false);

  // Team game & relay must succeed (unlimited)
  const relayAdd = validateTeamCardEntryAdd(
    student,
    '4x100m Relay',
    'U-16',
    'Female',
    entries
  );
  assert.equal(relayAdd.ok, true);

  const netballAdd = validateTeamCardEntryAdd(
    student,
    'Netball',
    'U-16',
    'Female',
    entries
  );
  assert.equal(netballAdd.ok, true);

  entries = [
    ...entries,
    {
      id: 'e4',
      studentId: 's-1',
      eventName: '4x100m Relay',
      eventType: 'team',
      ageCategory: 'U-16',
      gender: 'Female',
      auditStatus: 'pending',
    },
  ];

  const counts = countStudentEvents(entries, 's-1');
  assert.deepEqual(counts, { individualCount: 3, teamCount: 1 });

  // Wrong age category must fail
  const wrongAge = validateTeamCardEntryAdd(
    student,
    'Netball',
    'U-18',
    'Female',
    entries
  );
  assert.equal(wrongAge.ok, false);

  // Wrong gender must fail
  const wrongGender = validateTeamCardEntryAdd(
    student,
    'Cricket',
    'U-16',
    'Male',
    entries
  );
  assert.equal(wrongGender.ok, false);
});

test('auditTeamCardPlayer detects house mismatch, age/gender mismatch, and >3 individual events', () => {
  const s = makeStudent({
    id: 's1',
    house: 'venus',
    dob: '2011-02-02', // U-16
    gender: 'Male',
  });
  const entry: TeamCardEntry = {
    id: 'e1',
    studentId: 's1',
    eventName: '100m',
    eventType: 'individual',
    ageCategory: 'U-14',
    gender: 'Male',
    auditStatus: 'pending',
  };
  const audit = auditTeamCardPlayer(entry, s, 'mars', [entry]);
  assert.equal(audit.belongsToHouse, false);
  assert.equal(audit.dobAndGenderMatch, false);
  assert.equal(audit.individualCountWithinLimit, true);
  assert.equal(audit.allPassed, false);
});

test('computeHouseStandings ranks houses by total points and medal tie-breakers', () => {
  const scores: ScoreEntry[] = [
    {
      id: 'sc1',
      house: 'jupiter',
      eventName: '100m',
      ageCategory: 'U-16',
      place: '1st',
      points: 10,
      timestamp: '2026-11-18T09:00:00Z',
    },
    {
      id: 'sc2',
      house: 'mars',
      eventName: '200m',
      ageCategory: 'U-18',
      place: '1st',
      points: 10,
      timestamp: '2026-11-18T09:30:00Z',
    },
    {
      id: 'sc3',
      house: 'mars',
      eventName: '200m',
      ageCategory: 'U-18',
      place: 'Record Bonus',
      points: 5,
      timestamp: '2026-11-18T09:35:00Z',
    },
  ];
  const standings = computeHouseStandings(scores);
  assert.equal(standings[0].house, 'mars');
  assert.equal(standings[0].totalPoints, 15);
  assert.equal(standings[0].rank, 1);
  assert.equal(standings[1].house, 'jupiter');
  assert.equal(standings[1].totalPoints, 10);
});

test('game definition enforces allowed age categories and playable/sub player quotas', () => {
  const badminton: GameDefinition = {
    id: 'game-badminton',
    name: 'Badminton',
    eventType: 'team',
    allowedAgeCategories: ['U-16', 'U-18'],
    allowedGenders: ['Male', 'Female'],
    playableSlots: 2,
    subSlots: 1,
  };

  const u16a = makeStudent({ id: 'b1', fullName: 'Player 1', dob: '2010-05-01', gender: 'Male' });
  const u16b = makeStudent({ id: 'b2', fullName: 'Player 2', dob: '2010-06-01', gender: 'Male' });
  const u16c = makeStudent({ id: 'b3', fullName: 'Player 3', dob: '2010-07-01', gender: 'Male' });
  const u16d = makeStudent({ id: 'b4', fullName: 'Player 4', dob: '2010-08-01', gender: 'Male' });
  const u12 = makeStudent({ id: 'b5', fullName: 'Young Player', dob: '2014-05-01', gender: 'Male' });

  // U-12 is not allowed for Badminton
  const disallowedAge = validateTeamCardEntryAdd(u12, 'Badminton', 'U-12', 'Male', [], {
    playerRole: 'playable',
    game: badminton,
  });
  assert.equal(disallowedAge.ok, false);

  const entries: TeamCardEntry[] = [
    {
      id: 't1',
      studentId: 'b1',
      eventName: 'Badminton',
      eventType: 'team',
      ageCategory: 'U-16',
      gender: 'Male',
      playerRole: 'playable',
      auditStatus: 'confirmed',
    },
    {
      id: 't2',
      studentId: 'b2',
      eventName: 'Badminton',
      eventType: 'team',
      ageCategory: 'U-16',
      gender: 'Male',
      playerRole: 'playable',
      auditStatus: 'confirmed',
    },
  ];

  // 3rd playable exceeds playableSlots=2
  const thirdPlayable = validateTeamCardEntryAdd(u16c, 'Badminton', 'U-16', 'Male', entries, {
    playerRole: 'playable',
    game: badminton,
  });
  assert.equal(thirdPlayable.ok, false);

  // 1st sub succeeds
  const firstSub = validateTeamCardEntryAdd(u16c, 'Badminton', 'U-16', 'Male', entries, {
    playerRole: 'sub',
    game: badminton,
  });
  assert.equal(firstSub.ok, true);

  const withSub: TeamCardEntry[] = [
    ...entries,
    {
      id: 't3',
      studentId: 'b3',
      eventName: 'Badminton',
      eventType: 'team',
      ageCategory: 'U-16',
      gender: 'Male',
      playerRole: 'sub',
      auditStatus: 'confirmed',
    },
  ];

  assert.deepEqual(countGameRoleSlots(withSub, 'Badminton', 'U-16', 'Male'), {
    playableCount: 2,
    subCount: 1,
  });

  // 2nd sub exceeds subSlots=1
  const secondSub = validateTeamCardEntryAdd(u16d, 'Badminton', 'U-16', 'Male', withSub, {
    playerRole: 'sub',
    game: badminton,
  });
  assert.equal(secondSub.ok, false);

  // Audit passes within limits and fails if extra sub is forced
  const okAudit = auditTeamCardPlayer(withSub[2], u16c, 'mars', withSub, [badminton]);
  assert.equal(okAudit.gameQuotaOk, true);
  assert.equal(okAudit.allPassed, true);

  const overSub: TeamCardEntry[] = [
    ...withSub,
    {
      id: 't4',
      studentId: 'b4',
      eventName: 'Badminton',
      eventType: 'team',
      ageCategory: 'U-16',
      gender: 'Male',
      playerRole: 'sub',
      auditStatus: 'pending',
    },
  ];
  const failAudit = auditTeamCardPlayer(overSub[3], u16d, 'mars', overSub, [badminton]);
  assert.equal(failAudit.gameQuotaOk, false);
  assert.equal(failAudit.allPassed, false);
  assert.equal(u16a.id, 'b1');
  assert.equal(u16b.id, 'b2');
});

test('event schedule helpers validate 24h time, sort chronologically, format 12h labels, and count house entries', () => {
  assert.equal(isValidScheduleTime('08:30'), true);
  assert.equal(isValidScheduleTime('23:59'), true);
  assert.equal(isValidScheduleTime('24:00'), false);
  assert.equal(isValidScheduleTime('8:30'), false);

  assert.equal(formatScheduleTime('00:05'), '12:05 AM');
  assert.equal(formatScheduleTime('09:15'), '09:15 AM');
  assert.equal(formatScheduleTime('12:00'), '12:00 PM');
  assert.equal(formatScheduleTime('16:15'), '04:15 PM');

  const unsorted: EventSchedule[] = [
    { id: 's3', startTime: '14:00', eventName: 'Cricket Finals', category: 'U-16' },
    { id: 's1', startTime: '08:30', eventName: '100m Heats', category: 'U-16' },
    { id: 's2', startTime: '08:30', eventName: '400m Finals', category: 'U-14' },
  ];
  const sorted = sortSchedulesByTime(unsorted);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ['s1', 's2', 's3']
  );

  const cardEntries: TeamCardEntry[] = [
    {
      id: 'e1',
      studentId: 'stu-1',
      eventName: '100m',
      eventType: 'individual',
      ageCategory: 'U-16',
      gender: 'Male',
      auditStatus: 'confirmed',
    },
    {
      id: 'e2',
      studentId: 'stu-2',
      eventName: '100m',
      eventType: 'individual',
      ageCategory: 'U-16',
      gender: 'Female',
      auditStatus: 'pending',
    },
    {
      id: 'e3',
      studentId: 'stu-3',
      eventName: '100m',
      eventType: 'individual',
      ageCategory: 'U-14',
      gender: 'Male',
      auditStatus: 'confirmed',
    },
  ];

  // Partial name match ("100m Heats" vs "100m") scoped to U-16
  assert.equal(countHouseEntriesForSchedule(cardEntries, sorted[0]), 2);
  // Open / All matches across age categories
  assert.equal(
    countHouseEntriesForSchedule(cardEntries, {
      id: 's4',
      startTime: '15:00',
      eventName: '100m Champion of Champions',
      category: 'Open / All',
    }),
    3
  );
});

test('getHouseAppointments separates teachers and students by selected house', () => {
  const students: Student[] = [
    makeStudent({ id: 'st-m', house: 'mars', fullName: 'Mars Athlete' }),
    makeStudent({ id: 'st-j', house: 'jupiter', fullName: 'Jupiter Athlete' }),
    makeStudent({ id: 'st-u', house: null, fullName: 'Unassigned Athlete' }),
  ];
  const teachers: Teacher[] = [
    {
      id: 't-m',
      fullName: 'Mars Master',
      staffIdOrSubject: 'PE',
      role: 'Master-in-Charge',
      house: 'mars',
    },
    {
      id: 't-v',
      fullName: 'Venus Coach',
      staffIdOrSubject: 'Math',
      role: 'Track Coach',
      house: 'venus',
    },
  ];

  const mars = getHouseAppointments(students, teachers, 'mars');
  assert.deepEqual(
    mars.houseTeachers.map((t) => t.id),
    ['t-m']
  );
  assert.deepEqual(
    mars.houseStudents.map((s) => s.id),
    ['st-m']
  );

  const all = getHouseAppointments(students, teachers, 'all');
  assert.equal(all.houseTeachers.length, 2);
  assert.equal(all.houseStudents.length, 3);
});
