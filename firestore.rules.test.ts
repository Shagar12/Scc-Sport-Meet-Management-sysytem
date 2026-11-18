import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('Eight Pillars structural guarantees & default-deny catch-all', () => {
  assert.match(rulesText, /rules_version = '2';/);
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /request\.auth\.token\.email == 'sangeethshagar@gmail\.com'/);
  assert.match(rulesText, /isValidId\(id\)/);
  assert.match(rulesText, /affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesText, /updatedAt == request\.time/);
  assert.doesNotMatch(rulesText, /allow (read|write|list): if (true|isSignedIn\(\));/);
});

test('All collections in firebase-blueprint.json have explicit match blocks', () => {
  const firestorePaths = Object.keys(blueprint.firestore ?? {});
  assert.ok(firestorePaths.length >= 10);

  const expectedCollections = [
    'meetConfig',
    'games',
    'students',
    'teachers',
    'teamCards',
    'entries',
    'scores',
    'houseAccess',
    'meetSecrets',
    'admins',
    'schedules',
  ];

  for (const col of expectedCollections) {
    assert.ok(
      rulesText.includes(`match /${col}/`),
      `Missing match block for collection: ${col}`
    );
  }
});

test('Dirty Dozen security invariants hold in rule expressions', () => {
  // 1 & 2: Verified auth required across data collections + bootstrapped admin email
  assert.ok(rulesText.includes('function isVerified() {\n      return isSignedIn() && request.auth.token.email_verified == true;\n    }'));

  // 3 & 4: Secret credentials & admins strictly restricted to isAdmin()
  const meetSecretsBlock = rulesText.slice(rulesText.indexOf('match /meetSecrets/{secretId}'));
  assert.match(meetSecretsBlock, /allow get: if isAdmin\(\)/);
  assert.match(meetSecretsBlock, /allow create, update: if isAdmin\(\)/);

  const adminsBlock = rulesText.slice(rulesText.indexOf('match /admins/{userId}'));
  assert.match(adminsBlock, /allow create: if isAdmin\(\)/);

  // 5, 6, 7, 8, 9: TeamCard & Entry lock / status / house match / ghost-field guards
  const entriesBlock = rulesText.slice(
    rulesText.indexOf('match /entries/{entryId}'),
    rulesText.indexOf('match /scores/{scoreId}')
  );
  assert.match(entriesBlock, /incoming\(\)\.auditStatus == 'pending'/);
  assert.match(entriesBlock, /!\('rejectionReason' in incoming\(\)\)/);
  assert.match(entriesBlock, /get\(\/databases\/\$\(database\)\/documents\/teamCards\/\$\(cardId\)\)\.data\.house == incoming\(\)\.house/);
  assert.match(entriesBlock, /status in \['draft', 'revision_requested'\]/);
  assert.match(entriesBlock, /allow update: if isAdmin\(\)/);

  const teamCardsBlock = rulesText.slice(
    rulesText.indexOf('match /teamCards/{cardId}'),
    rulesText.indexOf('match /entries/{entryId}')
  );
  assert.match(teamCardsBlock, /incoming\(\)\.status == 'pending_review'/);
  assert.match(teamCardsBlock, /affectedKeys\(\)\.hasOnly\(\['status', 'submittedAt', 'updatedAt'\]\)/);

  // 10 & 11 & 12: ID regex + bounded arrays/strings + server request.time enforcement
  assert.match(rulesText, /\^\[a-zA-Z0-9_\\\\-\]\+\$/);
  assert.match(rulesText, /allowedAgeCategories\.size\(\) <= 20/);
  assert.match(rulesText, /eventName\.size\(\) >= 1 && data\.eventName\.size\(\) <= 80/);
  assert.match(rulesText, /data\.updatedAt == request\.time/);
});
