# Security Specification & Threat Model: PEF Emergency Fund Portal

## 1. Data Invariants & Access Control Policy

1. **Strict Authentication Baseline**: Unauthenticated access (`request.auth == null`) is denied globally across all Firestore collections.
2. **Administrator Privilege Boundaries**:
   - Access to `/settings` (global configuration, email templates, payout definitions) and `/adminUsers` is strictly restricted to verified administrators (`isAdmin()`).
   - Verified administrators are determined via trusted database documents (`/databases/$(database)/documents/adminUsers/$(request.auth.uid)` or `appUsers.role == 'admin'`) and bootstrapped admin emails (`cshanecolley@gmail.com` or `@smallmoves.org`).
3. **School & Request Scoping**:
   - Principals and school staff can only read, create, and update `requests` belonging to their designated `schoolId` (`resource.data.schoolId == user.schoolId` / `request.resource.data.schoolId == user.schoolId`).
   - Principals and school staff can only read or update their own `schools` record (`schoolId == user.schoolId`).
   - Administrators retain global read/write access across all schools and requests.
4. **User Profile Privacy**:
   - Users can only read and update their own document in `/appUsers/$(request.auth.uid)`.
   - Administrators can view and manage all `/appUsers`.
5. **Mail Queue Isolation**:
   - The `/mail` collection (used by email trigger mechanisms) prohibits unauthenticated writes or reads.
   - Authenticated users can enqueue transactional emails (`create`), while only administrators can inspect or manage the queue.
6. **Default Deny Rule**:
   - All paths not explicitly matched are rejected unconditionally (`match /{document=**} { allow read, write: if false; }`).

---

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Public Read**: Anonymous client calling `get()` on `/requests/REQ-2026-1001`. -> `PERMISSION_DENIED`
2. **Unauthenticated PII Query**: Anonymous client attempting `list()` on `/schools` or `/appUsers`. -> `PERMISSION_DENIED`
3. **Cross-School Request Snooping**: Principal of School A attempting `get()` or `list()` on `/requests/REQ-X` belonging to School B. -> `PERMISSION_DENIED`
4. **Cross-School Request Creation**: Principal of School A attempting `create` on `/requests` with `schoolId: "school-b"`. -> `PERMISSION_DENIED`
5. **Unauthorized School Budget Overwrite**: Non-admin user attempting `update` on `/schools/SCH-01` to inflate `annualBudget`. -> `PERMISSION_DENIED`
6. **Settings Tampering / Secret Exfiltration**: Non-admin user attempting `get()` or `update` on `/settings/global`. -> `PERMISSION_DENIED`
7. **Admin Privilege Escalation**: Non-admin user attempting `create` or `update` on `/adminUsers/attacker_uid`. -> `PERMISSION_DENIED`
8. **AppUser Impersonation**: User A attempting to update User B's record in `/appUsers/user_b_uid`. -> `PERMISSION_DENIED`
9. **Unauthenticated Mail Queue Injection**: Anonymous client attempting `create` on `/mail/spam_msg`. -> `PERMISSION_DENIED`
10. **Mail Queue Snooping**: Non-admin user attempting `list()` or `get()` on `/mail`. -> `PERMISSION_DENIED`
11. **Pending Invite Tampering**: Non-admin creating arbitrary pre-approved invite records. -> `PERMISSION_DENIED`
12. **MFA Secret Harvest Attack**: Non-admin user attempting to query other users' MFA secrets via `appUsers` list. -> `PERMISSION_DENIED`

---

## 3. Security Assertions

- Enforce `rules_version = '2';`
- Validate all document IDs with regex `isValidId()`.
- Evaluate `isSignedIn()` first before evaluating document lookups.
- Restrict write actions with role-based helper functions.
