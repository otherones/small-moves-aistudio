# Figma Reconciliation Matrix

Review date: 2026-07-28

This matrix reconciles the read-only
[Figma evidence package](../design/figma-evidence.md) with the written
requirements. It does not silently choose a product rule. Each unresolved item
must be resolved in the [decision log](decision-log.md) or corrected in the
source that is demonstrably stale.

Status values:

- `Open — product decision`: a product or operational owner must decide.
- `Open — design update`: the intended written behavior is sufficiently clear,
  but Figma needs a missing or corrected state.
- `Open — requirements update`: Figma exposes a materially different intended
  behavior that must be accepted or rejected.
- `Resolved requirement — design update required`: the product rule is approved,
  but Figma still needs correction or missing states.
- `Deferred`: the feature is outside the current release and should not be added
  to initial implementation/design scope.
- `Implementation constraint`: implementers must account for the evidence, but
  it does not by itself decide domain behavior.

## Conflict matrix

| ID | Status | Topic | Explicit Figma evidence | Written evidence | Implementation impact | Resolution path |
|---|---|---|---|---|---|---|
| FIG-001 | Resolved requirement — design update required | `Processing` is stale and must not be implemented | Admin Dashboard `140:2` shows `Processing · 1`; legacy July 16 also has Processing frame `100:4674` | Approved system statuses exclude Processing; send-back uses `changes_requested` and `response_requested` | A stale status can leak into filters, analytics, and tests | Remove Processing from Figma; use immutable system names and the current admin/principal display-label configuration |
| FIG-002 | Resolved requirement — design update required | Singular/plural status drift | Principal designs `128:2` and `132:2` say `Changes Requested`; admin `150:2` and `148:2` say `Change Requested` | Initial admin and principal label is `Changes Requested`; labels are editable Settings values keyed by `changes_requested` | Copy assertions and reporting diverge if Figma hard-codes stale text | Update Figma to the initial plural label and specify that UI renders the role-specific configured label |
| FIG-003 | Resolved requirement — Figma is incorrect | Canceled versus Denied | Cancellation confirmation exists at `134:2`, but Figma has no Canceled tab or terminal detail | `canceled` is principal withdrawal; `denied` is admin rejection; both are distinct terminal system states | Audit, budget release, reporting, copy, and filters depend on the distinction | Add Canceled list/detail/stepper states and never map cancellation to Denied |
| FIG-004 | Resolved requirement — design update required | Existing-school and mid-year principal MOU | Static user flow `90:2` includes existing-school agreement step (`185:320`); current screen `183:2` is only locked Step 1 | Every principal signs a principal/school/year/version MOU annually; a mid-year principal must sign before onboarding completes | Onboarding, compliance, and signature evidence require person-specific records | Keep the agreement step and design current/pending/error states for the incoming principal; prior signatures remain history only |
| FIG-005 | Resolved copy requirement — design update required | Review-time copy | Request-submitted modal `127:2` says `within the next 48 hours`; Help `144:2` says `Within 48 business hours` | All commitments use the configurable Small Moves business calendar and `48 business hours` | User commitment and timeout tests must be stable | Update every Figma occurrence to business-time language |
| FIG-006 | Resolved copy requirement — design update required | “5 phases” names six concepts | Help `144:2` labels the section `The 5 phases of a request`; request steppers show five steps | Requirements now call this guidance `The request process`; Meet with Beneficiary is guidance rather than a persisted status | Training copy should not imply a contradictory status count | Rename the Figma help heading and keep the five-step status stepper separate from process guidance |
| FIG-007 | Resolved requirement — mock figures invalid | Budget arithmetic contradicts itself | Principal Dashboard `128:2`, School Profile `165:2`, and Fund modal `171:2` contain incompatible totals | Annual default allocations, immutable Budget Adjustments, reservations, releases, and spend transactions determine totals | Mock figures cannot serve as fixtures or acceptance evidence | Redesign budget surfaces around Available, Reserved, Paid, Annual Budget, and transaction history using reconciled examples |
| FIG-008 | Resolved product requirement — design update required | Login and recovery lack a current screen/flow | Login exists only in static user flows; `Forgot your password?` has no destination | Firebase Authentication provides the backend/provider capabilities, while the portal must render verification/resend, sign-in/TOTP challenge, reset request/action, email-action, session-expiry, lost-authenticator support, and recovery/error journeys | Current auth/error/recovery states remain undesigned | Add current login, verification, reset request/action, `verifyEmail`/`recoverEmail`, TOTP challenge, lost-factor support, session-expiry, recent-reauthentication, invalid/expired, neutral completion, and error states |
| FIG-009 | Resolved product requirement — copy/design update required | 2FA reset promise is incorrect | `122:2` says `We can also reset this for you anytime.` | Portal uses Firebase TOTP capabilities and exposes no custom administrator MFA bypass/reset or backup codes; it must still provide enrollment, challenge, removal/re-enrollment, and lost-authenticator support-handoff UI | Current copy promises an unsupported privileged operation and omits required self-service/support states | Remove the reset promise and backup-code UI; design Firebase-backed enrollment, challenge, recent reauthentication, unenrollment/re-enrollment, provider sign-out, and lost-factor support states |
| FIG-010 | Open — design update | Add Funder is missing visible Type input | Add-funder frame `160:2` visibly includes name/contact/email/phone/notes, but no type field | Sitemap requires type with Foundation/Government/Corporate/Nonprofit/Individual/Other | The table displays a Type value that the current create UI cannot visibly capture | Add the type control to Figma or revise the requirement deliberately |
| FIG-011 | Open — design update | Add School lacks the inline “Add new funder” path | Add-school `169:2` shows `Select a funder…` but no visible add-new-funder control or overlay | Sitemap specifies selecting an existing funder or `+ Add new funder` | School creation may dead-end when a funder does not exist | Design the inline path or explicitly require leaving the form to create a funder |
| FIG-012 | Resolved product requirement — copy update required | Contact-directory scope/copy mismatch | `172:2` says contacts are stored across schools and requests, but visible rows are principals/additional contacts | Directory scope is principals and additional contacts only; beneficiary/student/payee data remains request-scoped | Subtitle implies unnecessary indexing of confidential request data | Update subtitle/count copy; do not add request-derived contact filters |
| FIG-013 | Deferred | Export requirement has no UI evidence | No current Figma screen contains an Export control | DEC-012 defers export from the initial release | Export is not part of initial estimates or acceptance criteria | Make no initial-release Figma changes; reopen as a separately scoped feature |
| FIG-014 | Open — design update | Send-back state coverage is incomplete | Ready-to-Pay detail `149:2` has `Send back to principal`; principal dashboard/list show Response Requested (`128:2`, `137:2`) | Sitemap/state flow specify a two-option modal, Response Requested detail, payout-change detail, reply flow, and reminders | Implementers lack exact copy and presentation for material state transitions | Add current admin modal plus admin/principal Changes Requested and Response Requested detail states before UI sign-off |
| FIG-015 | Resolved product requirement — design update required | Password-update form is incomplete | Profiles `143:2` and `162:2` show only `Current password` | Firebase-backed update requires recent reauthentication, new password/confirmation, validation, success, and error states | Current visual state cannot implement Firebase behavior | Design complete Firebase-backed password-update and reauthentication states |
| FIG-016 | Implementation constraint | Current Figma has no reusable design system | Current screen page contains frames, text, and vectors; no components, component sets, variables, or local styles | Requirements name shared components but provide no production design-system contract | Code should not pretend Figma component mappings or tokens exist | Establish tokens and reusable components in code/Figma as an explicit implementation workstream |
| FIG-017 | Resolved requirement — design work required | No responsive evidence | All current screen frames are 2,041 px desktop canvases | Support 320 px upward; representative widths 375, 768, 1024, 1440; WCAG 2.2 AA; approved browser matrix | Layout changes remain visually unspecified | Add representative mobile/tablet/desktop frames and table/sidebar/modal behavior using the approved targets |
| FIG-018 | Implementation constraint | No prototype reactions | Current screen page contains zero reactions | Sitemap provides route outcomes, but many dialog close/back rules remain prose only | Figma cannot be used as evidence for click destinations or history behavior | Use route requirements and add interaction acceptance criteria; do not label them prototype-validated |
| FIG-019 | Resolved requirement — design update required | Admin actions differ at Changes Requested | Admin detail `148:2` exposes Request changes and Mark as paid while showing Change Requested | Active task context determines the completion action; `changes_requested` does not allow Mark Paid; `response_requested` may allow Mark Paid when independently validated | Authorization tests must match the transition table | Update Figma to the canonical action matrix and task-context variants |
| FIG-020 | Resolved requirement — design update required | Dashboard filters omit live send-back statuses | `140:2` shows Processing and omits both live send-back states | Processing is removed; initial admin labels include Changes Requested and Response Requested and render from Settings | Admins need complete queues | Replace Processing and add both configured-status filters |
| FIG-021 | Resolved copy requirement — design update required | Reject versus Deny wording | In Review detail `146:2` uses `Reject`; Denied screen `152:2` says `Denied by admin` | Initial admin action is `Deny`; resulting immutable system status is `denied`; display labels remain configurable | Confirmation, email, and audit verbs need one default | Replace Reject with Deny in Figma and initial copy |
| FIG-022 | Resolved requirement — design update required | Principal/year MOU access is not represented | Current Profile lacks an MOU entry point; Dashboard has a school-level modal | Profile must show the current principal/school/year/version signature state and immutable evidence | Promised annual and mid-year signer behavior needs a visible path | Add principal-specific MOU status/view/sign states to Profile and onboarding |
| FIG-023 | Implementation requirement — design coverage still open | Validation, loading, and failure states are incomplete | Current Figma lacks complete auth, form, table, network, permission, recovery, and settings errors | WCAG 2.2 AA and route/feature acceptance require explicit states | Implementers would invent material behavior and copy | Add a state-coverage checklist per route, including Settings, Firebase auth, manual payout, and budget adjustments |
| FIG-024 | Resolved product requirement — design update required | Additional Contact scope is not represented | Current principal-facing frames do not show a reduced Additional Contact variant or own-request-only lists/details | DEC-002 limits Additional Contacts to account setup, request submission/management, and payout updates for requests they initiated; school fields, contacts/permissions, MOU signing, and role changes are unavailable | Reusing Principal screens without explicit variants could expose controls or confidential requests | Add Additional Contact dashboard/list/detail/new-request/profile variants with read-only school/MOU context, own-request results, unavailable-control treatment, direct-route denial, and admin-supported role-change messaging |

## Current design gaps by implementation area

| Area | Missing or incomplete design evidence |
|---|---|
| Authentication | Current login, invalid credentials, lockout/rate limit, password reset, 2FA challenge, recovery, expired invite, signed-out route handling |
| Onboarding | Required-field validation, duplicate/in-use email, invite mismatch, existing-identity membership binding, Additional Contact personal-only/read-only-school flow, Firebase TOTP enrollment/verification/reauthentication failure, principal/year MOU current/pending/sign/error states |
| Requests | Permission-denied state, Additional Contact own-request list/detail scope and direct-route denial, not found, network failure, amount/budget error variants, send-back modal, Response Requested detail/reply, payout-change detail |
| Tables | Empty/search-empty/loading/error, pagination behavior, responsive column priority; export is deferred |
| Schools/funds | Yearly default, Budget Adjustment validation, concurrent reservation/update, ledger/history, compensating transaction, principal/year MOU status |
| Payouts | Configured-method fields, admin validation/contact/confirmation evidence, confirmation invalidation after edits, manual Mark Paid evidence, sensitive-field masking |
| Account/admin | Firebase password reauthentication/update, TOTP challenge/enrollment/unenrollment errors, Portal Settings, admin-role option presentation, delete-admin confirmation |
| Shared | Toasts, offline/retry, 403/404/500, session expiry, responsive navigation, accessible focus behavior |

## Resolution workflow

1. Assign each `Open — product decision` row to an owner and its linked DEC
   entry.
2. Correct `Open — design update` rows in Figma after the product decision is
   explicit.
3. Update the sitemap, state flow, content, decision log, and this matrix in the
   same change.
4. Add acceptance criteria and tests to the
   [implementation traceability matrix](../requirements/implementation-traceability.md).
5. Mark a row resolved only when all affected sources agree.
