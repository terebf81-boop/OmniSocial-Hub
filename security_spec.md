# OmniChat Hub — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Tenant & PII Isolation**: Every user profile (`/users/{userId}`) and all user-owned subcollections (`/connections`, `/messages`, `/comments`, `/emails`, `/trash`, `/faqRules`) are strictly readable and writable only by the authenticated, email-verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`). Blanket `list` on `/users` is disabled (`allow list: if false`).
2. **Identity Integrity**: Every document in user subcollections must embed `ownerId == request.auth.uid` on creation and preserve `ownerId == existing().ownerId` as immutable on update.
3. **Strict Schema & Zero Shadow Fields**: Every write passes `isValid[Entity](incoming())` enforcing `hasAll(...)` and `hasOnly(...)` key sets, string length bounds, numeric bounds, and strict enum allowlists.
4. **Temporal Integrity**: `createdAt` (or `deletedAt` on Trash) must equal `request.time` upon creation and remain immutable on update. `updatedAt` must equal `request.time` on creation and update.
5. **Path Variable Hardening**: Single-document operations validate `{userId}` and child document IDs with `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
6. **90-Day Trash Retention**: Trash documents validate `purgeAtMs > 0` and preserve `originalCollection` within `['messages', 'comments', 'emails']`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Cross-Tenant Read**: User B attempts `get(/users/userA/messages/msg1)` -> `PERMISSION_DENIED`.
2. **User Directory Enumeration**: Authenticated user attempts `list(/users)` -> `PERMISSION_DENIED`.
3. **Unverified Email Spoof Write**: User A with `email_verified: false` attempts `create(/users/userA)` -> `PERMISSION_DENIED`.
4. **OwnerId Spoofing on Create**: User A creates `/users/userA/connections/c1` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: User A creates `/users/userA` with an unexpected `isAdmin: true` field -> `PERMISSION_DENIED`.
6. **ID Poisoning**: User A attempts to create `/users/userA/messages/../../../bad` or a 500-char ID -> `PERMISSION_DENIED`.
7. **Timestamp Forgery on Create**: User A creates `/users/userA/emails/e1` with `createdAt` set to a past client timestamp -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: User A updates `/users/userA/messages/m1` attempting to modify `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
9. **Disallowed Update Key**: User A updates `/users/userA/connections/c1` attempting to change `platform` or `id` -> `PERMISSION_DENIED`.
10. **Payload Exhaustion ("Denial of Wallet")**: User A creates `/users/userA/comments/c1` with a 20,000-char `body` -> `PERMISSION_DENIED`.
11. **Unbounded Array Injection**: User A creates `/users/userA/faqRules/r1` with 25 keywords or non-string first element -> `PERMISSION_DENIED`.
12. **Invalid Enum Value**: User A creates `/users/userA/trash/t1` with `originalCollection: "admins"` -> `PERMISSION_DENIED`.
