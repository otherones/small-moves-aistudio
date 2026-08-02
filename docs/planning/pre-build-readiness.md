# Pre-Build Readiness Review

Original review date: 2026-07-28
Figma reconciliation update: 2026-07-28
Infrastructure baseline update: 2026-07-28
Product decision reconciliation update: 2026-07-28
Implementation requirements update: 2026-07-28
Development deployment baseline update: 2026-08-02

## Outcome

The repository now has a standalone
[implementation requirements specification](../requirements/implementation-requirements.md),
navigable product inputs, read-only Figma evidence, source-conflict tracking,
implementation traceability, a GCP/Firebase infrastructure baseline, and
approved decisions for authentication, request
statuses, MOU signatures, budgets, manual payouts, email templates, contact
scope, routing, accessibility/responsive support, and business-time wording.
Nonproduction implementation can proceed against the specification. Production
provisioning and launch remain gated.

Application scaffolding, Firebase emulator work, nonproduction CI/CD, the
approved state-machine/configuration slices, and design-system work can begin. The
person/membership and Additional Contact authorization model is now approved.
The development project, region, Firebase Hosting, Firebase Authentication, billing, temporary URL, and initial access owner are now recorded in DEC-018. Production locality, identifiers, promotion, and emergency deployment authority remain DEC-022.
Continuity, observability ownership, and application data lifecycle now have an
approved lightweight operating baseline. Figma still needs the design updates
identified in reconciliation.

## Materials reviewed

| Material | Coverage | Assessment |
|---|---|---|
| Implementation requirements | Standalone initial-release scope, forms, logical model, budget/notification/UI/accessibility requirements, acceptance criteria, verification plan, sequence, and Definition of Done | Implementation contract; production launch remains gated by DEC-018 and release evidence |
| Portal sitemap | Principal/admin routes, screens, fields, actions, visible state, draft data inventory | Detailed, but mixes requirements with observations about an absent prototype codebase |
| Request state flow | Request/school lifecycle, transition actors, permissions, budget formulas, email triggers | Strong workflow baseline with documented intended/prototype mismatches |
| Infrastructure and operations requirements | GCP/Firebase topology, environment isolation, deployment, migrations, recovery, logging, monitoring, retention, and security | Establishes a practical default, including approved continuity, observability, and data-lifecycle policies; the approved development project/region and Firebase deployment baseline are recorded; production promotion/emergency authority remains open in DEC-022 |
| Email templates and help center | Notification copy, help copy, timing statements, URLs | Useful content baseline; requires event, delivery, privacy, and operational approval |
| Figma evidence | 8 pages, 10 current sections, 50 current desktop frames, 2 user-flow sections, 3 legacy wireframe snapshots | Current screens are static and flattened; no reactions, variables, current components, responsive frames, or complete error-state coverage |
| Figma reconciliation | 23 tracked discrepancies and design gaps | Must be resolved alongside the decision log |
| Implementation traceability | Route/feature-to-source and decision mapping | Useful ticketing bridge; most production behavior remains blocked |

## Decision Reconciliation Update

| Area | Approved outcome | Remaining work |
|---|---|---|
| Authentication | Firebase Authentication owns password reset, sessions, email verification, and TOTP; no custom portal admin reset/bypass | Design Firebase recovery/challenge/error states and implement Identity Platform configuration |
| Request states | Canceled and Denied are distinct; immutable system names have configurable admin/principal labels; detailed transition table is authoritative | Update Figma and implement transition/task-context authorization tests |
| MOU | Every principal signs a principal/school/year/version MOU annually and when joining mid-year | Replace school timestamp assumptions and design principal-specific history/status |
| Budget | Global yearly default plus immutable Budget Adjustments, reservations, releases, and spend ledger | Approve production model/schema and reconcile all Figma example arithmetic |
| Payout | Methods are admin-configured; admins validate/confirm/execute manually outside the portal and record transitions | Remove beneficiary self-service/provider assumptions and design manual admin evidence states |
| Email | Versioned admin-configured transition templates and recipient rules | Select delivery provider via ADR and implement retry/deduplication/delivery audit |
| Security/privacy | Standard confidential-data baseline; no payment execution/credentials, no selected external regulatory regime, and an approved retention/redaction/deletion/hold lifecycle | Finish the role matrix and lightweight threat model; implement and test scheduled cleanup and account deletion |
| Export | Deferred from initial release | Reopen DEC-012 as a separately scoped feature later |
| Contacts | Directory contains principals/additional contacts only | Update Figma subtitle and ensure request-scoped beneficiary/student/payee access |
| Identity and routing | One Firebase UID/person, explicit school memberships, Additional Contact own-request access, Principal-exclusive school/contact/MOU authority, admin-only role elevation, and deny-by-default routing | Implement server-side membership/request-owner checks, role-assignment audit, and access-denied/404 states |
| UI quality | WCAG 2.2 AA; 320 px+ responsive; approved widths/browser matrix | Add responsive/accessibility Figma states and automated/manual test coverage |
| Operational time | Configurable business calendar; use “48 business hours” consistently | Update remaining Figma copy and configure holidays/ownership |
| Continuity and operations | 24-hour RPO, one-business-day RTO, seven-day PITR, daily backups retained 35 days, 99.5% internal availability objective, business-hours severity model, named primary/backup operators | Configure production policies, alerts, runbooks, and annual restore exercise under DEC-019/DEC-020 |
| Data lifecycle | Seven-year core history, three-year request-sensitive redaction, two-year profile/email-evidence windows, weekly cleanup, operator-applied holds, and pseudonymized historical actors | Implement retention metadata/job, hold procedure, account deletion, and restore-time cleanup under DEC-021 |

Additional unresolved design issues remain: Figma still labels the request
process as five phases while listing six concepts; current Figma lacks a
reusable design system, prototype reactions, complete failure states, and the
new Portal Settings screen.

## Critical build gates

### Gate 1 — Reconcile sources

- Apply every approved decision to Figma and close or reclassify each row in the
  [Figma reconciliation matrix](figma-reconciliation.md).
- Treat legacy prototype observations as non-authoritative provenance; do not
  copy legacy architecture or block on legacy repository access.
- Keep approved requirement, design evidence, prototype observation, and
  unknown clearly labeled.
- Update requirements, content, decisions, Figma, and traceability together.

### Gate 2 — Implement approved identity/domain behavior

- Implement the DEC-002 person, school-membership, multi-role, capability,
  invitation, immutable request-owner, and audited role-assignment model.
- Test that Additional Contacts see and manage only requests they initiated,
  cannot modify school/contact/MOU/role data, and never gain capabilities through
  client-side state.
- Test that Principals retain school-wide request, school, contact, and MOU
  authority while role elevation remains an authorized system-admin action.
- Use the approved immutable request status names, role-specific display-label
  configuration, task contexts, transition guards, side effects, idempotency,
  budget events, and audit events.
- Implement and verify the testable route, transition, authorization, budget,
  notification, and failure criteria in the
  [implementation requirements specification](../requirements/implementation-requirements.md).

### Gate 3 — Security, privacy, and record lifecycle

- Complete the data inventory and role/permission matrix, then implement the
  approved DEC-021 retention classes, weekly cleanup, operator-applied hold, and
  account-deletion behavior.
- Implement the Firebase-backed authentication/recovery contract, principal-year
  MOU evidence, confidential-data classification, and request-scoped sensitive
  contact access.
- Apply deny-by-default IAM, Security Rules, App Check, secret management, CI
  identity, log redaction, and environment isolation from the
  [infrastructure baseline](../requirements/infrastructure-and-operations.md).
- Perform a threat model covering cross-school access, invitation binding,
  manual payout evidence, settings changes, email templates, migrations, logs,
  backups, and administrator abuse.

### Gate 4 — Production contracts and operations

- Resolve DEC-022 for the separate production project, identifiers, locality, promotion, and emergency deployment authority.
- Implement the approved DEC-019/DEC-020 backup, restore, log-retention,
  monitoring, alert-routing, and business-hours ownership policies.
- Define the Firestore model and versioned migration packages for identities,
  memberships, MOU signatures, request events/task context, settings,
  email-delivery evidence, and budget transactions.
- Define API boundaries, concurrency, idempotency, validation, and errors.
- Select the email delivery provider via ADR; no payment-provider integration
  is required.
- Provision isolated environments and exercise deployment, rollback, migration,
  backup/restore, monitoring, alerting, incident, and access-review runbooks.

### Gate 5 — Testable quality bar

- Implement DEC-015’s WCAG 2.2 AA, responsive-width, browser, zoom/reflow,
  keyboard, screen-reader, focus, and pointer-target requirements.
- Use the
  [implementation requirements specification](../requirements/implementation-requirements.md)
  and [implementation traceability matrix](../requirements/implementation-traceability.md)
  to produce executable route/feature tests and release evidence.
- Establish reusable tokens/components in code and Figma and design missing
  Firebase auth, Settings, manual payout, MOU, budget, validation, loading,
  error, denied, canceled, access-denied, and responsive states.
- Define unit, state-machine, authorization, Security Rules, integration,
  accessibility, migration, recovery, and end-to-end coverage.

## Safe work before the gates close

- Application/repository scaffolding, linting, formatting, CI, and test harness.
- Firebase Local Emulator Suite setup for Auth, Firestore, Functions, Hosting,
  and Security Rules tests using synthetic data.
- Nonproduction GCP/Firebase project setup and a Workload Identity
  Federation-based preview/staging deployment workflow, provided it cannot
  access production data or credentials.
- Version-controlled Hosting configuration, restrictive security headers,
  deny-by-default placeholder Rules, index configuration, structured-log
  conventions, and migration framework skeletons.
- A documented token proposal derived from observed Figma values, clearly
  labeled provisional.
- Reusable shell, card, table, form, badge, dialog, and status-stepper
  prototypes with mock-only adapters.
- Firebase-backed routes using the approved signed-out/onboarding/role table,
  deny-by-default guards, active-school membership, and immutable request-owner
  checks for Additional Contacts.
- Configuration schemas and admin Settings shells for status labels, payout
  methods, email templates, yearly budget defaults, and business calendar.
- State-machine and ledger tests for resolved Canceled/Denied, task-context,
  MOU, reservation, Budget Adjustment, and manual payout behavior.
- Storybook or equivalent coverage for default, empty, loading, validation,
  error, disabled, and permission states.
- Threat-model, data-inventory, API, integration, recovery, and operational
  design work.

## Suggested implementation order

Use §10 of the
[implementation requirements specification](../requirements/implementation-requirements.md)
as the authoritative sequence. Export remains a later, separately approved
feature.

## Definition of “ready for production launch”

Nonproduction implementation is ready to begin. Production provisioning and
launch are ready when:

- DEC-022 is resolved or explicitly deferred with an owner and date before production launch;
- every material Figma/Markdown conflict is resolved or assigned to a later,
  nonblocking release;
- route/workflow/settings acceptance criteria are testable and use immutable
  system names rather than configurable display copy;
- identity/membership, MOU, request, budget, manual payout, email, settings, and
  audit models are approved;
- confidential-data lifecycle and integration requirements are documented and
  the approved retention/cleanup/hold/account-deletion controls are testable;
- production GCP/Firebase projects, locality, and deployment authority are
  approved; the approved recovery, logging, service-objective, and operator
  policies are configured;
- deployment, migration, rollback, backup/restore, monitoring, alerting, and
  incident paths are testable;
- representative responsive and accessibility states are approved; and
- `otherones/small-moves` remains the implementation and deployment source.
