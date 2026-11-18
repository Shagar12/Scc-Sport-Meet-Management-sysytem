import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeBackoffMs,
  enqueueManyOperations,
  enqueueOperation,
  getDueOperations,
  isPermissionDeniedError,
  isRetryableFirestoreError,
  markAttemptFailed,
  removeOperationById,
  sha256Hex,
  stripUndefined,
  SyncOperation,
} from './syncQueue.ts';

test('coalesces duplicate updates for the same entityKey and keeps latest payload', () => {
  let queue: SyncOperation[] = [];
  queue = enqueueOperation(
    queue,
    {
      entityKey: 'student:stu-01',
      type: 'upsert_student',
      payload: {
        id: 'stu-01',
        admissionNo: 'SCC-1001',
        fullName: 'Initial Name',
        dob: '2010-05-14',
        gender: 'Male',
        grade: 'Grade 10',
        house: 'mars',
        talentedAthlete: true,
        primarySport: '100m',
        biometrics: {},
        computedAge: 15,
        verifiedCategory: 'U-16',
        dobStatus: 'verified',
      },
    },
    1000
  );

  queue = enqueueOperation(
    queue,
    {
      entityKey: 'student:stu-01',
      type: 'upsert_student',
      payload: {
        id: 'stu-01',
        admissionNo: 'SCC-1001',
        fullName: 'Updated Name',
        dob: '2010-05-14',
        gender: 'Male',
        grade: 'Grade 11',
        house: 'mars',
        talentedAthlete: true,
        primarySport: '200m',
        biometrics: {},
        computedAge: 15,
        verifiedCategory: 'U-16',
        dobStatus: 'verified',
      },
    },
    2000
  );

  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'upsert_student');
  if (queue[0].type === 'upsert_student') {
    assert.equal(queue[0].payload.fullName, 'Updated Name');
    assert.equal(queue[0].payload.grade, 'Grade 11');
  }
});

test('orders parent team card creation before entries and submission', () => {
  const queue = enqueueManyOperations(
    [],
    [
      {
        entityKey: 'card_submit:card-mars-01',
        type: 'submit_team_card',
        payload: { cardId: 'card-mars-01', submittedAt: '2026-11-18T09:00:00Z' },
      },
      {
        entityKey: 'entry:card-mars-01:tce-99',
        type: 'upsert_team_card_entry',
        payload: {
          cardId: 'card-mars-01',
          house: 'mars',
          entry: {
            id: 'tce-99',
            studentId: 'stu-01',
            eventName: '100m',
            eventType: 'individual',
            ageCategory: 'U-16',
            gender: 'Male',
            playerRole: 'playable',
            auditStatus: 'pending',
          },
        },
      },
      {
        entityKey: 'card:card-mars-01',
        type: 'upsert_team_card',
        payload: {
          id: 'card-mars-01',
          house: 'mars',
          title: 'Mars House Playing Team Card',
          status: 'draft',
        },
      },
    ],
    1000
  );

  assert.deepEqual(
    queue.map((q) => q.type),
    ['upsert_team_card', 'upsert_team_card_entry', 'submit_team_card']
  );
});

test('tracks exponential backoff retries and due filtering', () => {
  let queue = enqueueOperation(
    [],
    {
      entityKey: 'score:scr-1',
      type: 'delete_score',
      payload: { scoreId: 'scr-1' },
    },
    1000
  );

  assert.equal(getDueOperations(queue, 1000).length, 1);
  assert.equal(computeBackoffMs(1), 1000);
  assert.equal(computeBackoffMs(3), 4000);

  queue = markAttemptFailed(queue, queue[0].id, 'unavailable', 5000);
  assert.equal(queue[0].attempts, 1);
  assert.equal(queue[0].nextRetryAt, 6000);
  assert.equal(getDueOperations(queue, 5500).length, 0);
  assert.equal(getDueOperations(queue, 6000).length, 1);

  queue = removeOperationById(queue, queue[0].id);
  assert.equal(queue.length, 0);
});

test('classifies retryable network errors vs permission errors and strips undefined', async () => {
  assert.equal(
    isRetryableFirestoreError({ code: 'unavailable', message: 'client is offline' }),
    true
  );
  assert.equal(
    isPermissionDeniedError({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions.',
    }),
    true
  );
  assert.equal(
    isRetryableFirestoreError({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions.',
    }),
    false
  );

  const cleaned = stripUndefined({
    id: 'e1',
    note: undefined,
    nested: { a: 1, b: undefined },
  });
  assert.deepEqual(cleaned, { id: 'e1', nested: { a: 1 } });

  const digest = await sha256Hex('mars123');
  assert.equal(digest.length, 64);
});

test('coalesces schedule upserts and replacements for the same schedule entityKey', () => {
  let queue: SyncOperation[] = [];
  queue = enqueueOperation(
    queue,
    {
      entityKey: 'schedule:sch-99',
      type: 'upsert_schedule',
      payload: {
        id: 'sch-99',
        startTime: '16:00',
        eventName: 'Cricket',
        category: 'U-16',
      },
    },
    1000
  );
  queue = enqueueOperation(
    queue,
    {
      entityKey: 'schedule:sch-99',
      type: 'upsert_schedule',
      payload: {
        id: 'sch-99',
        startTime: '16:15',
        eventName: 'Cricket Finals',
        category: 'U-16',
      },
    },
    2000
  );

  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'upsert_schedule');
  if (queue[0].type === 'upsert_schedule') {
    assert.equal(queue[0].payload.startTime, '16:15');
    assert.equal(queue[0].payload.eventName, 'Cricket Finals');
  }
});
