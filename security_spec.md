# Security Specification — SCC Inter-House Sports Meet Firestore Rules

## 1. Data Invariants
1. **Default Deny**: Every unspecified path under `/databases/{database}/documents` is denied for both read and write.
2. **Verified Identity Gate**: All reads and writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Credential Isolation (PII/Secrets)**: `/meetSecrets/{secretId}` (containing `adminPassword` and plaintext `houseCredentials`) and `/admins/{userId}` are strictly restricted to `isAdmin()`. Non-admin users can only verify house passcodes via `/houseAccess/{houseId}` SHA-256 hashes.
4. **Admin Governance**: Only `isAdmin()` (bootstrapped `sangeethshagar@gmail.com` or UID present in `/admins/{uid}`) may create, update, or delete `/meetConfig`, `/games`, `/students`, `/teachers`, `/scores`, `/houseAccess`, `/meetSecrets`, or `/admins`.
5. **Master Gate & Terminal State Locking on Team Cards**:
   - Entries under `/teamCards/{cardId}/entries/{entryId}` cannot exist without a valid parent `/teamCards/{cardId}` whose `house` matches `entry.house`.
   - Non-admin users can only add or remove entries when the parent `TeamCard.status` is `'draft'` or `'revision_requested'`. Once `'pending_review'` or `'approved'`, non-admin edits are blocked.
   - Non-admin users can never set `auditStatus` to `'confirmed'` or `'rejected'`; they may only submit `auditStatus == 'pending'`.
   - Non-admin `TeamCard` updates are action-restricted to `['status', 'submittedAt', 'updatedAt']` transitioning from `'draft'`/`'revision_requested'` to `'pending_review'`, never to `'approved'`.
6. **Strict Keys, Types, Sizes & Server Timestamps**:
   - Every create/update validates required and allowed keys (`hasAll` + `hasOnly`), string length bounds, ID regex (`^[a-zA-Z0-9_-]+$`), and `updatedAt == request.time`.

## 2. The "Dirty Dozen" Attack Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/students/stu-01` or write `/scores/scr-evil` with `auth == null`.
2. **Unverified Email Admin Spoof**: Write `/games/game-bad` with `auth.token.email == 'sangeethshagar@gmail.com'` and `email_verified == false`.
3. **Non-Admin Credential Exfiltration**: Read `/meetSecrets/main` as a regular verified user (`user@example.com`).
4. **Privilege Escalation**: Create `/admins/attackerUid` as a non-admin verified user.
5. **Ghost Field / Shadow Update**: Create `/teamCards/card-mars/entries/e-ghost` with an extra field `isVerified: true` or `adminOverride: true`.
6. **Self-Confirmed Team Card Entry**: Non-admin creates `/teamCards/card-mars/entries/e-cheat` with `auditStatus: 'confirmed'`.
7. **Self-Approved Team Card**: Non-admin updates `/teamCards/card-mars` setting `status: 'approved'`.
8. **Mutating Locked Submitted Team Card**: Non-admin adds or deletes `/teamCards/card-jupiter/entries/e-x` when `/teamCards/card-jupiter` has `status == 'pending_review'` or `'approved'`.
9. **House Mismatch Orphaned Entry**: Create `/teamCards/card-mars/entries/e-mismatch` with `house: 'venus'` (mismatches parent card house `'mars'`).
10. **ID Poisoning**: Create `/games/bad..id..with$$chars` or a 200-char document ID.
11. **Oversized String / Array Resource Poisoning**: Non-admin creates entry with `eventName` of 500 characters or Admin creates game with 50-item `allowedAgeCategories` array.
12. **Client-Forged Server Timestamp**: Create or update any document with a client-supplied `updatedAt` timestamp instead of `request.time`.
