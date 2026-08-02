# Implementation Traceability Matrix

This matrix turns the current requirements and
[Figma evidence](../design/figma-evidence.md) into implementation-sized scope.
It is not approval to bypass the [decision log](../planning/decision-log.md).

Build posture:

- `Shell-ready` — layout and visible scope can be prototyped without committing
  unresolved domain behavior.
- `Provisional` — some functionality can be implemented behind explicit
  assumptions and feature flags.
- `Blocked` — production behavior depends on an open decision, security
  contract, or materially missing state.
- `Deferred` — explicitly outside the initial release; do not create an
  implementation ticket until the decision is reopened.

## Route and feature matrix

| ID | Route/feature | Actor | Primary Figma evidence | Primary written source | Decision dependencies | Build posture |
|---|---|---|---|---|---|---|
| AUTH-001 | `/login` | All users | Static user-flow frames `179:2`, `179:2486`, `179:3610`; no current screen | Sitemap §1 | DEC-002, DEC-003, DEC-014 | Provisional |
| AUTH-002 | `/auth/reset-password` and `/auth/action` | All users | `Forgot your password?` only; no destination | Sitemap §1 | DEC-003, DEC-014 | Provisional |
| ONB-001 | `/onboarding/create-account` — new school | Principal | `116:2` | Sitemap §2; State flow §4/§4b | DEC-002, DEC-003, DEC-007 | Provisional |
| ONB-002 | `/onboarding/create-account` — existing school | Incoming principal | `183:2` | State flow §4c | DEC-002, DEC-007 | Provisional |
| ONB-003 | `/onboarding/2fa` — Firebase TOTP enrollment | Principal/additional contact | `121:2` | Sitemap §2; State flow §4/§4d | DEC-003 | Provisional |
| ONB-004 | `/onboarding/2fa-success` — enrolled-factor confirmation, no backup codes | Principal/additional contact | `122:2` conflicts on backup codes | Sitemap §2 | DEC-003 | Provisional |
| ONB-005 | `/onboarding/agreement` | Authorized principal | `120:2` | Sitemap §2; State flow §4/§4b/§4c | DEC-002, DEC-007 | Provisional |
| ONB-006 | Additional-contact onboarding | Additional contact | Static flow only; no dedicated current screen set | State flow §4d | DEC-002, DEC-003, DEC-007 | Provisional |
| PRI-001 | `/dashboard` | Principal/additional contact | `123:2`, `128:2`, `127:2`, `126:2`, `125:2` | Sitemap §3 | DEC-002, DEC-007, DEC-008 | Provisional |
| PRI-002 | `/requests` — school-wide for Principal, own submissions for Additional Contact | Principal/additional contact | `137:2` | Sitemap §3 | DEC-002, DEC-004, DEC-005, DEC-006 | Provisional |
| PRI-003 | `/requests/new` | Principal/additional contact | `135:2` | Sitemap §3; State flow §1/§10/§11 | DEC-002, DEC-007, DEC-008, DEC-011 | Provisional |
| PRI-004 | `/requests/:id` — school-wide for Principal, submitter-owned for Additional Contact | Principal/additional contact | `138:2`, `132:2`, `133:2`, `131:2`, `134:2` | Sitemap §3; State flow §1–§3b | DEC-002, DEC-004, DEC-005, DEC-006 | Provisional |
| PRI-005 | `/requests/:id/payout` — allowed stage and authorized request scope | Principal/originating additional contact | `130:2`, `136:2` | Sitemap §3; State flow §7 | DEC-002, DEC-009, DEC-011 | Provisional |
| PRI-006 | `/profile` — Firebase account/MFA plus principal-year MOU | Principal | `143:2`, `141:2`, `142:2` | Sitemap §3 | DEC-003, DEC-007 | Provisional |
| SHR-001 | `/help` | Principal/admin | `144:2` | Content; Sitemap §3/§5 | DEC-016 | Provisional |
| ADM-001 | `/admin/dashboard` | Admin | `140:2` | Sitemap §4 | DEC-005, DEC-008 | Provisional |
| ADM-002 | `/admin/requests` | Admin | `150:2` | Sitemap §4; State flow §8 | DEC-004, DEC-005, DEC-006 | Provisional |
| ADM-003 | `/admin/requests/:id` | Admin | `146:2`, `147:2`, `151:2`, `149:2`, `148:2`, `153:2`, `152:2` | Sitemap §4; State flow §1–§3b/§8 | DEC-004, DEC-005, DEC-006, DEC-009, DEC-011 | Provisional |
| ADM-004 | Admin request modals | Admin | `158:2`, `157:2`, `161:2`, `155:2`, `159:2`; send-back modal missing | Sitemap §4 | DEC-005, DEC-006, DEC-009, DEC-010 | Provisional |
| ADM-005 | `/admin/schools` | Admin | `170:2` | Sitemap §4; State flow §5 | DEC-002, DEC-007, DEC-008 | Provisional |
| ADM-006 | `/admin/schools/new` | Admin | `169:2` | Sitemap §4 | DEC-002, DEC-007, DEC-008 | Provisional |
| ADM-007 | `/admin/schools/:id` | Admin | `165:2`, `171:2`, `173:2`, `167:2`, `174:2` | Sitemap §4; State flow §4b/§4c/§5 | DEC-002, DEC-007, DEC-008, DEC-011 | Provisional |
| ADM-008 | `/admin/funders` | Admin | `156:2`, `160:2` | Sitemap §4 | None | Provisional |
| ADM-009 | `/admin/contacts` | Admin | `172:2` | Sitemap §4 | DEC-002, DEC-011, DEC-013 | Provisional |
| ADM-010 | `/admin/management` | Privileged admin | `168:2`, `166:2` | Sitemap §4 | DEC-002, DEC-003, DEC-010, DEC-011 | Provisional |
| ADM-011 | `/admin/profile` — Firebase account/MFA | Admin | `162:2` | Sitemap §4 | DEC-003 | Provisional |
| ADM-012 | `/admin/settings` — status labels, payout methods, email templates, annual defaults, and business calendar | Authorized settings admin | No current Figma screen | Sitemap §4; State flow §1a/§9/§10 | DEC-002, DEC-005, DEC-008, DEC-009, DEC-010, DEC-016 | Provisional |
| SYS-001 | Export — deferred from initial release | Authorized users | No current Figma control | Sitemap §8; DEC-012 | DEC-012 | Deferred |
| SYS-002 | Configuration-driven transition email delivery | System/admin | No provider UI; initial copy exists | Content; State flow §9; Sitemap §4 | DEC-010, DEC-016 | Provisional |
| SYS-003 | Annual budget default, immutable adjustments, reservations, and spend ledger | System/admin | Conflicting mock figures in `128:2`, `165:2`, `171:2` | State flow §10–§11; Sitemap §4 | DEC-008, DEC-011, DEC-021 | Provisional |
| SYS-004 | Manual admin beneficiary confirmation and payment recording | Admin/system | Principal/admin payout forms only; beneficiary self-service not required | Sitemap §3–§4; State flow §7–§8 | DEC-009, DEC-011 | Provisional |
| INFRA-001 | Firebase Hosting build, preview, staging, production promotion, and rollback | Delivery system/operators | Not applicable | Infrastructure §1–§4 | DEC-018 | Provisional |
| INFRA-002 | Environment isolation, configuration, CI identity, and billing controls | Delivery system/operators | Not applicable | Infrastructure §3–§4 | DEC-018 | Provisional |
| INFRA-003 | Firestore Rules, indexes, schema evolution, and data migrations | System/operators | Not applicable | Infrastructure §5 | DEC-008, DEC-011, DEC-019 | Provisional |
| INFRA-004 | Structured logging, monitoring, alerting, Cloud Audit Logs, and domain audit | System/operators | Not applicable | Infrastructure §7 | DEC-010, DEC-011, DEC-020 | Provisional |
| INFRA-005 | Firestore PITR, scheduled backups, restore, and disaster recovery | Operators | Not applicable | Infrastructure §6 | DEC-019 | Provisional |
| SEC-001 | Platform IAM, Security Rules, App Check, secrets, CI, and runtime security baseline | All actors/system/operators | Not applicable | Infrastructure §8 | DEC-002, DEC-003, DEC-011, DEC-018 | Blocked |

## Minimum acceptance package for every implementation ticket

Each route or workflow ticket must include:

1. The matrix ID above.
2. Exact route, actor, and role/permission guard.
3. Linked requirement section and exact Figma node IDs.
4. The decision IDs it depends on and their current status.
5. Happy-path acceptance criteria.
6. Empty, loading, validation, authorization, not-found, service-error, retry,
   and success behavior.
7. Audit events and notification events, including idempotency expectations.
8. Sensitive-data classification, masking, retention, and export treatment.
9. For school/request features, active-membership, role, and immutable
   request-submitter authorization criteria, including negative cross-user and
   cross-school cases.
10. Keyboard, focus, accessible-name, error-association, contrast, and
   responsive acceptance criteria.
11. Unit, authorization, state-machine, integration, and end-to-end test cases.
12. Environment, migration, telemetry, alert, recovery, and rollback impact,
    including evidence that logs exclude prohibited sensitive data.

No ticket should use “matches Figma” as an acceptance criterion. It must name
the observable target and the source node.

## Cross-cutting acceptance anchors

Anchors with an open decision dependency remain provisional. Resolved decisions
below are approved acceptance requirements.

### Platform delivery and operations

- Development, staging, and production use separate GCP/Firebase projects and
  identities; preview builds cannot access production data or credentials.
- GitHub Actions uses Workload Identity Federation and a dedicated
  least-privilege deploy identity for each environment.
- A release records its commit/artifact, environment, actor, result, and smoke
  test. Production promotion and rollback are explicit, auditable actions.
- Firestore Rules and indexes are versioned and emulator-tested. Data-shape
  changes use expand/migrate/contract and an idempotent, resumable Cloud Run Job.
- Trusted workloads emit redacted structured logs with release and correlation
  context; operational alerts have an owner and runbook.
- High-risk migrations require a verified recovery point. Production uses a
  24-hour RPO and one-business-day RTO, restores into a new database for
  validation, and exercises the recovery path before launch and annually.
- Application/runtime logs are retained 30 days; required Cloud Audit Logs keep
  the platform-controlled 400-day retention. Alert ownership is business-hours
  with a named primary and backup.

Decision dependencies: DEC-011, DEC-017, DEC-018, DEC-019, DEC-020.
DEC-019 and DEC-020 are resolved; DEC-018 remains open.

### Identity and authorization

- Firebase Authentication owns credentials, email verification, password reset,
  sessions, recent reauthentication, and TOTP MFA; application code stores none
  of the associated credentials, action codes, sessions, MFA resolvers, secrets,
  or backup codes.
- The portal frontend is still responsible for complete Firebase-backed
  verification/resend, sign-in/TOTP challenge, reset request/action,
  `verifyEmail`/`recoverEmail`, recent-reauthentication, password/email
  update, factor enrollment/removal/re-enrollment, session-expiry, and
  lost-authenticator support-handoff journeys.
- One verified Firebase UID maps to one person; roles and active school
  memberships determine data scope and actions.
- A person may hold roles across schools or both Principal and Additional
  Contact roles in one school; authorization evaluates the active membership.
- Invite acceptance binds the existing or new Firebase identity to the pending
  membership without creating a duplicate person.
- Additional Contacts can submit requests and manage only requests whose
  immutable submitter ID matches their person/UID. They may add or update payout
  information only for those requests and only in an allowed state.
- Additional Contacts cannot modify school details, manage contacts or
  permissions, sign/renew the MOU, or change roles.
- Principals retain school-wide request, school, Additional Contact, and MOU
  authority. Only an authorized system administrator assigns/elevates roles.
- Route guards deny by default, follow the approved signed-out/onboarding/role
  routing table, and do not rely on hidden controls as authorization.
- No portal-specific administrator password reset, MFA bypass, or TOTP reset is
  exposed.
- Authentication and authorization failures do not disclose whether unrelated
  users, schools, requests, or beneficiaries exist.

Decision dependencies resolved: DEC-002 and DEC-003.

### Request state machine

- The server owns the persisted state transition; the client cannot post an
  arbitrary target status.
- Each transition checks the actor, current state, required inputs, and
  idempotency key.
- Each successful transition creates an immutable audit event and triggers
  notifications from that event.
- Failed or repeated transitions do not double-reserve budget, duplicate
  notifications, or create conflicting activity entries.
- Immutable system names are persisted; configured admin/principal labels never
  become API enums or transition identity.
- Active task context is created and cleared atomically with its transition;
  stale prototype flags cannot control UI or authorization.
- `canceled` and `denied` are separate terminal states with distinct actors and
  audit events.

Decision dependencies: DEC-004, DEC-005, DEC-006, DEC-008, DEC-010.

### Budgets and financial history

- Each school year has a global default allocation; creating a school-year
  budget records that allocation without coupling existing schools to later
  default changes.
- School-specific changes use immutable Budget Adjustment transactions with a
  signed delta, reason, actor, and timestamp.
- New requests cannot exceed the approved per-request cap or available balance
  after active reservations.
- Denied/Canceled requests release reservations; Paid converts the reservation
  to spend; corrections use compensating transactions.
- Every UI total can be reproduced from the ledger, and concurrent requests
  cannot reserve the same balance.
- Export is deferred and is not an initial-release acceptance criterion.

Decision dependency resolved: DEC-021. Core ledger/audit history follows the
seven-year lifecycle in Infrastructure §8.4.

### Payout and sensitive data

- Authorized admins configure stable payout-method IDs, display labels, active
  state, order, and field schema; used methods may be disabled but not deleted
  or repurposed.
- Payout/contact data is encrypted, redacted from logs, and available only to
  approved roles. No raw bank/card credential is stored.
- The portal has no beneficiary account, self-service confirmation link, or
  payment-provider integration and never executes funds.
- Admins validate and contact the beneficiary outside the portal, record
  confirmation, execute payment outside the portal, and record Mark Paid; every
  step creates immutable audit evidence.
- Editing payout details invalidates recorded confirmation and returns the
  request to the required validation/confirmation path.

Decision dependencies resolved: DEC-009, DEC-011.

### Data lifecycle and deletion

- Core request, budget, MOU, configuration, payout-action, and domain-audit
  history is retained for seven years after the related school year.
- Request-scoped beneficiary, student, payee, contact, and payout-instruction
  fields are redacted or anonymized three years after terminal status while
  minimum non-identifying financial/audit facts remain.
- User profiles are deleted or pseudonymized two years after the relationship
  ends; historical records retain opaque actor references.
- Email-delivery evidence is retained two years, application tokens are removed
  within 30 days after expiration, and rendered email bodies are not stored by
  default.
- An idempotent weekly cleanup supports dry run, audited counts, failure alerts,
  operator-applied holds, and restore-time reapplication.

Decision dependency resolved: DEC-021.

### Notifications, settings, and operational copy

- Authorized admins publish versioned transition templates and recipient rules,
  preview safe sample data, and send test messages.
- Request notifications resolve to the originating submitter. An Additional
  Contact receives events only for requests they initiated; Principal/admin
  audiences are included only by the configured rule.
- Delivery is event-based, retryable, observable, and deduplicated; recipient,
  template version, result, and suppression reason are auditable.
- Template variables are allow-listed and admin-authored text is sanitized.
- Portal Settings also manages role-specific status labels, payout methods,
  yearly budget defaults, and the business calendar without changing immutable
  system identity or historical evidence.
- Time commitments use the configured business calendar and “48 business
  hours” wording consistently across UI, email, and help.

Decision dependencies resolved: DEC-005, DEC-008, DEC-009, DEC-010, DEC-016.

### UI quality

- Target WCAG 2.2 Level AA and responsive layouts from 320 CSS px upward, with
  representative acceptance widths of 375, 768, 1024, and 1440 px.
- Support the approved current/previous desktop browser versions plus approved
  mobile Safari/Chrome versions.
- Tables define column priority, horizontal overflow, pagination, empty/search
  empty/loading/error states; export behavior is excluded from the initial
  release.
- Dialogs define initial focus, containment, Escape/close behavior, destructive
  confirmation, and focus return.
- Status meaning uses text/icon as well as color; forms associate and summarize
  errors; tests cover keyboard, screen reader, 200% zoom/reflow, visible focus,
  and minimum pointer targets.

Decision dependency resolved: DEC-015.

## Suggested implementation slices after decisions

1. **Foundation:** repository scaffold, design tokens/components, routes, error
   boundaries, Firebase emulators, CI, test harness, and telemetry conventions.
2. **Platform delivery:** isolated nonproduction GCP/Firebase projects,
   Workload Identity Federation, preview/staging deployment, Security Rules,
   indexes, migration framework, and rollback skeleton.
3. **Identity:** accounts, sessions, roles, school membership, route guards,
   invitations, recovery, 2FA.
4. **School onboarding:** school setup, principal/additional-contact invites,
   MOU version/signature evidence.
5. **Request core:** state machine, authorization, audit, budget reservations.
6. **Principal UI:** dashboard, lists, create/detail/edit/cancel, payout entry.
7. **Admin UI:** dashboard, queues, review/send-back/pay, schools, funders,
   contacts, admin management.
8. **Operations/integrations:** manual beneficiary confirmation and payment
   evidence plus email delivery.
9. **Production hardening:** responsive/accessibility, production delivery,
   migrations, monitoring, alerting, backup/restore, incident response,
   reconciliation, and disaster recovery. Export remains deferred.
