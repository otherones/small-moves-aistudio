# PEF Portal — Implementation Requirements

Status: Approved implementation baseline, subject to the production-launch gate in §1.8  
Last updated: 2026-07-28

## Access and source report

| Item | Result |
|---|---|
| Figma file accessed | Yes — `PEF Portal — Screens & States Export`, file key `gVDz0NQWFaHNTRzbYKfkNu`, starting node `0:1` |
| Pages inspected | All eight pages: `CURRENT DESIGNS` (`100:5032`), `-> Screens` (`0:1`), `-> User Flows` (`90:2`), `----` (`100:5033`), `WIREFRAMES` (`100:852`), `-> 7/9/26` (`100:853`), `-> 7/14/26` (`100:1634`), and `-> 7/16/26` (`100:3170`) |
| Current sections inspected | All ten: Auth & Onboarding (`88:3`), Principal Dashboard (`88:4`), Principal Requests (`88:5`), Principal Account (`88:6`), Admin Dashboard (`88:7`), Admin Requests (`88:8`), Admin Schools (`88:9`), Admin Funders (`88:10`), Admin Contacts & Admin Users (`88:11`), and Admin Account (`88:12`) |
| Figma content not accessible | None. The three divider pages are empty. The dated pages contain legacy wireframes and are provenance, not the current target. |
| Figma limitations | Current screens are static, flattened desktop frames: no prototype reactions, reusable components, component sets, variables, local styles, responsive variants, or accessibility annotations. Validation, error, loading, disabled, and permission states are incomplete. |
| Supplied attachments | Both supplied text attachments were read completely. The current authoring brief controls document structure; the earlier draft is a historical checklist and is superseded where it conflicts with resolved repository decisions or direct Figma evidence. |

## Document authority and requirement language

This document is the implementation contract for the initial PEF Portal release. “Must” and “must not” are release requirements. “Recommended implementation addition” identifies a production-hardening choice not explicitly dictated by the product sources; the recommendation is the default unless an ADR replaces it before implementation.

When sources overlap, authority is:

1. resolved entries in the [decision log](../planning/decision-log.md);
2. the detailed transition table in [request-state-flow.md](request-state-flow.md);
3. route and control scope in [portal-sitemap.md](portal-sitemap.md);
4. platform requirements in [infrastructure-and-operations.md](infrastructure-and-operations.md);
5. exact email/help copy in [email-templates-and-help-center.md](../content/email-templates-and-help-center.md);
6. Figma as visual evidence after reconciliation, never as authority for persistence, permissions, financial rules, or notifications.

---

## 1. Executive Summary

### 1.1 Product objective

The PEF Portal enables school principals and designated Additional Contacts to request emergency funds and enables Small Moves administrators to review, track, manually pay, and audit those requests. It replaces preparation artifacts with a secure, traceable workflow without integrating a payment processor or creating beneficiary accounts.

### 1.2 Initial-release scope

| ID | Required capability |
|---|---|
| SCOPE-001 | Portal frontend journeys backed by Firebase Authentication/Identity Platform: invitation/account creation, email verification and resend, sign-in/sign-out, TOTP challenge, password-reset request and completion, recent reauthentication, password/email update, session-expiry recovery, TOTP enrollment/unenrollment/re-enrollment, and lost-authenticator support handoff. |
| SCOPE-002 | Principal onboarding with school confirmation, annual MOU signature, and first-login completion. |
| SCOPE-003 | Principal school-wide request access and Additional Contact own-request-only access. |
| SCOPE-004 | Request creation, editing, cancellation, payout entry/update, admin review, manual beneficiary-confirmation recording, manual payment recording, send-back tasks, immutable activity history, and email delivery. |
| SCOPE-005 | Annual school budgets using immutable allocation, adjustment, reservation, release, and spend transactions. |
| SCOPE-006 | Admin management of schools, funders, principal/additional-contact directory entries, admin users/capabilities, status display labels, payout methods, email templates, annual default budgets, and the business calendar. |
| SCOPE-007 | GCP/Firebase environments, low-friction deployment, Firestore migration controls, logging/monitoring, recovery, retention, and security controls. |
| SCOPE-008 | Responsive, keyboard-operable, WCAG 2.2 AA user experiences from 320 CSS px upward. |

### 1.3 Explicit non-goals

| ID | Out of scope for the initial release |
|---|---|
| SCOPE-101 | Export UI, endpoints, or scheduled exports; DEC-012 defers export. |
| SCOPE-102 | Payment-provider integration, bank/card credential storage, beneficiary login, or beneficiary self-service confirmation. Payment and beneficiary contact occur outside the portal and are recorded by an admin. |
| SCOPE-103 | A custom credential/authentication backend, custom password- or MFA-reset service, portal administrator reset/bypass controls, and portal-issued backup codes are out of scope. The portal frontend must still expose the Firebase-backed self-service and support-handoff journeys in SCOPE-001 and AUTH-005 through AUTH-009. |
| SCOPE-104 | Destructive school/funder/request deletion as a normal product workflow. Corrections use status transitions, inactive flags, or compensating records. |
| SCOPE-105 | 24/7 support, active-active continuity, a dedicated NOC/SIEM, or a formal external SLA. |
| SCOPE-106 | Reuse, deployment, or inspection of a legacy Principal Emergency Fund repository. `otherones/small-moves` is the sole target. |

### 1.4 Actors and authorization

| ID | Actor | Required access |
|---|---|---|
| ROLE-001 | Principal | May view and manage all requests for active school memberships; edit permitted school details; manage Additional Contacts; sign/renew their own principal/school/year/version MOU; view school budget and history. |
| ROLE-002 | Additional Contact | May accept an invitation, submit requests, and manage only requests whose immutable `submitterUid` is their Firebase UID, including permitted payout updates. Cannot edit school details, manage contacts/permissions, sign an MOU, or change roles. |
| ROLE-003 | Admin | Receives only explicitly assigned organization capabilities. May perform the request, school, finance, contact, configuration, or user-management actions authorized by those capabilities. |
| ROLE-004 | System administrator | Is the only portal actor permitted to assign/elevate organization roles or convert an Additional Contact to Principal. The action is recently reauthenticated and audited. |
| ROLE-005 | Beneficiary/payee | Has no portal account or portal action. An admin contacts the person outside the portal. |
| ROLE-006 | Service/job identity | Performs one bounded trusted function with least-privilege IAM; it is not treated as an end user. |

AUTH-001: Every route, Firestore query, Security Rule, and trusted endpoint must deny by default and authorize from the verified Firebase UID plus current membership/capability records. Hiding a control is not authorization.

AUTH-002: One Firebase UID maps to one person. A person may have multiple active school memberships and multiple roles. Authorization is evaluated for the current school and resource, not from a single mutable role string.

AUTH-003: Additional Contact access must include `submitterUid == authenticatedUid`; school membership alone is insufficient. Principals may access every request for their active school membership.

AUTH-004: Sensitive actions—admin/settings changes, role elevation, beneficiary-confirmation recording, payment recording, and other privileged actions—must be implemented in trusted compute and require current authorization. Admin/settings and role changes also require recent authentication/TOTP.

AUTH-005: The portal frontend must initiate and complete Firebase-supported identity journeys with the Firebase Web SDK: account creation, verification-email send/resend, email/password sign-in, TOTP second-factor challenge, password-reset email request, password-reset confirmation, email verification, email-change recovery, recent reauthentication, password/email update, TOTP enrollment/unenrollment/re-enrollment, sign-out, and session-expiry recovery. Firebase remains the credential, action-code, session, and factor system of record; no custom credential backend is permitted.

AUTH-006: `/auth/action` must parse only the expected Firebase email-action parameters and support `resetPassword`, `verifyEmail`, and `recoverEmail`. It validates and applies the one-time code through Firebase, never persists or logs the code, and accepts a continuation only when it is an allow-listed same-origin destination.

AUTH-007: Authentication screens must define initial, submitting, success, invalid/expired/already-used action code, weak-password, wrong-credential, unverified-email, MFA-required, invalid-TOTP, expired-enrollment/session, too-many-attempts, offline/provider-unavailable, and safe retry states. Password-reset initiation always returns a neutral response that does not disclose account existence.

AUTH-008: A user who cannot supply an enrolled TOTP factor must receive a visible “Can’t access your authenticator?” path to Small Moves support. The portal exposes no bypass or reset API/control. An authorized operator may clear the factor using audited Firebase platform capabilities outside the portal; the frontend must then support sign-in and required re-enrollment.

AUTH-009: When Firebase requires recent authentication or reports an expired/revoked session, the frontend must preserve only a validated same-origin return target, reauthenticate through Firebase, and resume or safely restart the intended action. It must handle Firebase signing the user out after factor unenrollment.

### 1.5 Canonical request states

Persist only immutable system names. Display labels are configuration and must never drive behavior.

| System name | Initial admin label | Initial school-side label | Terminal |
|---|---|---|---|
| `in_review` | In Review | In Review | No |
| `waiting_on_principal` | Waiting on Principal | Payout Details Needed | No |
| `waiting_on_beneficiary` | Waiting on Beneficiary | Beneficiary Confirmation | No |
| `ready_to_pay` | Ready to Pay | Ready for Payment | No |
| `changes_requested` | Changes Requested | Changes Requested | No |
| `response_requested` | Response Requested | Response Requested | No |
| `paid` | Paid | Paid | Yes |
| `denied` | Denied | Denied | Yes |
| `canceled` | Canceled | Canceled | Yes |

STATE-001: `paid`, `denied`, and `canceled` are separate terminal states with no reopen action. `denied` and `canceled` must remain distinct in persistence, filters, labels, templates, audit, analytics, and budget release.

STATE-002: `processing` is not a production state. Singular “Change Requested” and any Figma behavior that turns cancellation into denial are stale.

STATE-003: An active task context is one of `request_change`, `payout_change`, or `question_response`. It exists only while actionable and is created/cleared atomically with its transition.

### 1.6 Authoritative transition contract

“School actor” below means a Principal for the school or the originating Additional Contact. The Additional Contact restriction in ROLE-002 always applies.

| ID | From | Actor/action | To | Required atomic effects |
|---|---|---|---|---|
| TRN-001 | New | School actor submits | `in_review` | Create request, reserve amount, append “Sent for review,” enqueue requester/admin notifications. |
| TRN-002 | `in_review` | Admin approves | `waiting_on_principal` | Append approval event; enqueue requester/admin notifications. |
| TRN-003 | `in_review` | Admin requests changes | `changes_requested` + `request_change` | Store sanitized message, create task, append event, notify. |
| TRN-004 | `in_review` | Admin denies | `denied` | Append denial, release reservation, notify. |
| TRN-005 | Any open state | Authorized school actor cancels | `canceled` | Clear task if present, release reservation, append event, notify. |
| TRN-006 | `in_review` | School actor edits request | `in_review` | Validate fields and budget delta; update reservation atomically; append field-change event. |
| TRN-007 | `waiting_on_principal` | School actor submits payout info | `waiting_on_beneficiary` | Store approved payout fields, append two activity events, notify. |
| TRN-008 | `waiting_on_principal` | School actor edits request details after confirmation | `in_review` | Update request/reservation, append reset event, notify requester/admin. |
| TRN-009 | `waiting_on_principal` | Admin sends reminder | Same | Append reminder-delivery event; no state or budget change. |
| TRN-010 | `waiting_on_principal` | Admin denies | `denied` | Release reservation, append event, notify. |
| TRN-011 | `waiting_on_beneficiary` | Admin records confirmation | `ready_to_pay` | Record minimum approved evidence, append event, notify. |
| TRN-012 | `waiting_on_beneficiary` | Admin logs contact attempt/note | Same | Append sanitized activity only. No beneficiary account/link. |
| TRN-013 | Any open state with payout data | Authorized school actor or admin updates payout | Same | Revalidate configured method schema, preserve history, append event. |
| TRN-014 | `waiting_on_beneficiary` | Admin denies | `denied` | Release reservation, append event, notify. |
| TRN-015 | `ready_to_pay` | Admin marks paid | `paid` | Convert reservation to spend exactly once, append payment event, notify. |
| TRN-016 | `ready_to_pay` | Admin asks for payout change | `changes_requested` + `payout_change` | Store message, create task, append event, notify. |
| TRN-017 | `ready_to_pay` | Admin asks a question | `response_requested` + `question_response` | Store message, create task, append event, notify. |
| TRN-018 | `ready_to_pay` | Admin denies | `denied` | Release reservation, append event, notify. |
| TRN-019 | `changes_requested` + `payout_change` | School actor completes payout changes | `waiting_on_beneficiary` | Revalidate payout, clear task, append event, notify. |
| TRN-020 | `changes_requested` + `request_change` | School actor completes request changes | `in_review` | Validate request/budget delta, clear task, append event, notify. |
| TRN-021 | `changes_requested` | Admin denies | `denied` | Clear task, release reservation, append event, notify. |
| TRN-022 | `response_requested` + `question_response` | School actor responds | `ready_to_pay` | Store response, clear task, append event, notify. |
| TRN-023 | `response_requested` | Admin marks paid | `paid` | Clear task, convert reservation to spend exactly once, append event, notify. |
| TRN-024 | `response_requested` | Admin denies | `denied` | Clear task, release reservation, append event, notify. |

STATE-004: Every mutation must accept an idempotency key, compare the expected current version/status, and perform request, task, budget, activity, and notification-outbox writes in one Firestore transaction or equivalent trusted atomic unit.

STATE-005: Stale, duplicate, unauthorized, guard-failing, or terminal-state transitions must fail without partial domain, budget, activity, or notification effects.

### 1.7 MOU and school-year rules

MOU-001: Each Principal must sign the current MOU for each school, school year, and MOU version. A Principal joining mid-year must sign; a previous Principal’s record does not satisfy them.

MOU-002: Store immutable signature evidence with principal UID, school ID, school year, version, signed timestamp, consent text/version hash, and source context. Never use a mutable `school.mouSignedAt` as source of truth.

MOU-003: School compliance is derived from current Principal memberships and current-year/version signatures. Additional Contacts can see compliance but cannot sign.

MOU-004: A school cannot submit a new request while required current Principal signatures are missing. Existing authorized request work remains visible; any stricter suspension behavior requires a later decision.

### 1.8 Readiness and launch gate

READY-001: Nonproduction implementation may begin from this specification.

READY-002: Production provisioning or launch must not proceed until DEC-018 records exact GCP/Firebase project IDs, billing account, region and Firestore location, domains/data-residency constraints, staging-to-production promotion authority, and emergency deployment authority.

READY-003: Missing Figma responsive, focus, validation, error, loading, settings, and corrected workflow states do not relax §§6–7. They require implementation/design review against this specification before release.

### 1.9 Route inventory

Every route below requires the loading, forbidden/not-found, stale-session, and
unexpected-error behavior in §§6–8. A person with several school memberships
must select an active school context; switching context must reauthorize and
reload all scoped data.

| Route | Audience | Required purpose |
|---|---|---|
| `/login` | Signed out | Firebase email/password sign-in, inline TOTP challenge when Firebase returns MFA-required, neutral errors, “Forgot your password?”, and “Can’t access your authenticator?” support path; current Figma lacks a production login frame. |
| `/auth/reset-password` | Signed out | Firebase password-reset initiation, neutral completion response, resend/retry, and return to sign-in. |
| `/auth/action` | Email action recipient | Frontend Firebase action handler for `resetPassword`, `verifyEmail`, and `recoverEmail`, including loading, completion, invalid/expired/already-used, retry, and allow-listed continuation states. |
| `/register` | Invite recipient | Validate invitation and route an existing user to sign-in/binding or a new user to account creation. |
| `/onboarding/create-account` | Invited school user | FORM-001; new-school editable/confirmed fields or existing-school locked fields. |
| `/onboarding/2fa`, `/onboarding/2fa-success` | Onboarding user | FORM-002 enrollment and provider-confirmed success without portal backup codes. |
| `/onboarding/agreement` | Principal | FORM-003; Additional Contacts bypass the signing step but remain subject to school compliance. |
| `/dashboard` | Principal / Additional Contact | School context, MOU compliance, budget, action-needed work, and authorized requests. School/contact editing is Principal-only. |
| `/requests` | Principal / Additional Contact | Search/filter/tabbed request list: Principal school-wide; contact own-only. Open, Paid, Denied, and Canceled remain distinguishable. |
| `/requests/new` | Principal / Additional Contact | FORM-010 and budget/MOU gate. |
| `/requests/:id` | Authorized school user | Request/status/task/activity detail plus only the actions allowed by current state and ownership. |
| `/requests/:id/payout` | Authorized school user | FORM-013 for entry or permitted update. |
| `/profile` | Authenticated school user | FORM-004 and FORM-009 Firebase-backed email, password, recent-reauthentication, and TOTP management; role/MOU information; Principal may access current annual MOU action. |
| `/help` | Authenticated user | Approved help content; safe Small Moves support contact. |
| `/admin/dashboard` | Authorized admin | Operational request summaries/queues using canonical states; no Processing state. |
| `/admin/requests` | Authorized admin | Search, state/payment filters, sortable queue, time-in-status, and capability-scoped row actions. |
| `/admin/requests/:id` | Authorized admin | Full request/payout/activity detail and transition controls from §1.6. |
| `/admin/schools` | Authorized admin | School search/status/funder/balance/MOU list. |
| `/admin/schools/new` | Authorized admin | FORM-030 school/allocation/invitation creation. |
| `/admin/schools/:id` | Authorized admin | School, funder, budget ledger, Principal/contacts, requests, MOU compliance, and activity; FORMs 030–031. |
| `/admin/funders` | Authorized admin | Search/list and FORM-032 add/edit/inactivate. |
| `/admin/contacts` | Authorized admin | Principal/Additional Contact-only directory and FORM-033. |
| `/admin/settings` | Settings-capable admin | Versioned FORMs 035–039; this required route has no current Figma screen. |
| `/admin/management` | System administrator | FORM-034 admin/capability management with recent authentication. |
| `/admin/profile` | Authorized admin | Own profile and Firebase password/TOTP management. |

ROUTE-001: Signed-out users are sent through authentication and returned only
to a validated same-origin authorized destination. A user who is authenticated
but unauthorized sees access denied; a user authorized to the collection but
not the specific resource receives a non-disclosing not-found/denied response.

ROUTE-002: Export controls/routes are absent. Beneficiary, student, payee, and
payout-contact data have no directory route.

---

## 2. Forms and Validation Matrix

### 2.1 Validation conventions

| ID | Requirement |
|---|---|
| VAL-001 | Validate on both client and trusted server. Server validation controls. Return stable error codes plus safe field-level messages. |
| VAL-002 | Trim surrounding whitespace; preserve meaningful internal whitespace; normalize emails to a canonical comparison form; validate telephone numbers without requiring a single display format. |
| VAL-003 | Render errors adjacent to the field, summarize them at form start after submit, move focus to the summary, and associate messages programmatically. Preserve valid user input. |
| VAL-004 | Required text is nonempty after trimming. Reject unsafe markup. Recommended implementation addition: names/titles ≤200 characters, notes/messages/context ≤4,000, addresses ≤500. |
| VAL-005 | Currency is USD integer cents. Display localized dollars; never use binary floating point for persistence or arithmetic. |
| VAL-006 | Submit controls prevent accidental duplicate submission but idempotency is enforced server-side. On uncertain network outcomes, show a retry-safe status rather than claiming failure or success. |
| VAL-007 | Configuration-driven forms validate against the published version captured at submission. A disabled payout method remains readable on historical requests but cannot be newly selected. |

### 2.2 Identity, onboarding, profile, and MOU

| ID | Route/form | Inputs | Validation and conditional behavior | Success/persistence | Error/empty/loading/disabled states |
|---|---|---|---|---|---|
| FORM-001 | Invite acceptance / create account | Invite token; full name, title, email, phone; Firebase password fields; optional Additional Contacts | Token must be unexpired, unused, intended for the verified email/school/role, and accepted once. Existing-school school fields are read-only (`183:2`); new-school fields follow the approved invitation payload. Password rules and storage are Firebase-owned. Optional contact rows require name and valid email when started. Send or resend Firebase email verification; TOTP enrollment is unavailable until Firebase reports the email verified. | Bind verified UID to pending membership; persist profile/contact invites; advance onboarding after verification requirements pass. Never persist password/token plaintext. | Expired/used/mismatched invite; existing-account sign-in path; duplicate email; unverified-email/resend state; network retry; disabled submit while Firebase operation runs. |
| FORM-002 | `/onboarding/2fa`, login challenge, and profile TOTP | Firebase enrollment/resolver session, factor selection when applicable, QR/manual key for enrollment, six-digit TOTP, enroll/unenroll/re-enroll action | Use Identity Platform TOTP APIs; require verified email before enrollment and recent authentication for factor changes; accept only provider-verified challenges. | Firebase owns factor enrollment and MFA resolution; app may persist only nonsecret completion metadata. Handle provider sign-out after last-factor unenrollment and return to login/re-enrollment as required. | Invalid/expired code, expired enrollment/resolver session, already enrolled, no usable factor, too many attempts, provider unavailable, reauthentication, safe retry, and lost-authenticator support handoff. Do not show portal backup codes or promise admin reset (`121:2`, stale `122:2`/`142:2`). |
| FORM-003 | `/onboarding/agreement` and annual renewal | MOU version/body, consent checkbox, authenticated signature action | Only Principal; checkbox required; current active school membership; exact current version; repeat submit idempotent. | Create immutable signature record and derive compliance; onboarding completes only after required steps. | Already signed, version superseded during viewing, missing membership, save failure. Show exact version and date. |
| FORM-004 | Profile information | User’s permitted name, title, and phone; email displayed from Firebase identity | User may edit only own permitted application profile. Authorization role is not editable profile data. Email, password, and TOTP changes use FORM-009. | Update profile and append audited event where security-relevant. | Validation, stale profile version, authorization failure, save failure. |
| FORM-005 | Principal school details | Permitted school address/phone/detail fields | Principal only for active membership. Immutable identity/funder/budget/role fields are excluded. Additional Contact sees read-only. | Update school plus audit event. | Cross-school denial, stale version, invalid fields, save failure. |
| FORM-006 | Additional Contacts | Name, title, email, phone; add/remove invitation actions | Principal or authorized admin only; unique active membership/invite per school and normalized email; cannot grant Principal/admin. | Create/revoke invitation or end membership; send configured invitation; append audit event. | Existing account/membership path, pending invite, expired invite, delivery failure, last-operation retry. |
| FORM-007 | `/login` and session recovery | Email, password, Firebase MFA resolver/factor, six-digit TOTP, validated return target | Submit primary credentials through Firebase; if Firebase reports MFA-required, retain the resolver only in memory and render the challenge. Never collapse credential and TOTP errors into a successful session. | Firebase session established; reload current identity/membership and route to the validated authorized destination. Sign-out clears portal state. | Neutral invalid-credential response, unverified email with resend action, MFA-required, invalid/expired TOTP resolver, too many attempts, offline/provider failure, revoked/expired session, lost-authenticator support path. |
| FORM-008 | `/auth/reset-password` and `/auth/action` | Email for reset initiation; Firebase `mode`, `oobCode`, optional language and allow-listed continuation; new password/confirmation for reset mode | Reset initiation is neutral. Action handler permits only `resetPassword`, `verifyEmail`, and `recoverEmail`; validates the action code through Firebase before showing mode-specific completion UI; password confirmation must match and satisfy Firebase policy. | Firebase sends the email or applies/confirms the action. Show explicit success and a safe return to sign-in/validated continuation. Persist no action code or password. | Missing/unknown mode, missing/invalid/expired/already-used code, weak/mismatched password, network/provider failure, resend/restart action. |
| FORM-009 | `/profile` and `/admin/profile` account security | Recent-auth credential/TOTP challenge; new email or password/confirmation; TOTP enroll/unenroll/re-enroll controls | Current user only. Firebase recent reauthentication is mandatory when required. Email change uses Firebase verification/action handling; password uses Firebase validation; factor changes use FORM-002. Roles are never editable here. | Firebase confirms identity update; portal refreshes verified identity state and records only approved nonsecret security metadata/audit. | Reauthentication required/failed, duplicate email, unverified new email, weak/mismatched password, factor/session errors, provider failure, safe retry. |

### 2.3 Requests, payout, tasks, and transitions

| ID | Route/form | Inputs | Validation and conditional behavior | Success/persistence | Error/empty/loading/disabled states |
|---|---|---|---|---|---|
| FORM-010 | `/requests/new` (`135:2`) | Beneficiary name; optional student name; requested amount; reason; usage category; Other detail; optional context; MOU-compliance checkbox | Active membership; school MOU compliant; beneficiary required; amount >0, ≤$2,000 and ≤available budget; reason/category required; Other detail required iff Other; checkbox required. Additional Contact creates own request. | TRN-001 atomically creates request/reservation/activity/outbox; show success (`127:2`). | No budget, MOU blocked, stale budget, invalid field, duplicate submit, save failure. Keep entered values and expose retry. |
| FORM-011 | Edit request (`131:2`, `158:2`) | Same editable request fields | Authorized actor; permitted state/task. Changing amount validates and posts reservation delta. Editing after approval requires explicit “return to Admin Review” confirmation where TRN-008 applies. | TRN-006, TRN-008, or TRN-020; store before/after field diff in audit without duplicating sensitive values into logs. | Concurrent state change, insufficient budget for increase, terminal state, unauthorized owner, validation failure. |
| FORM-012 | Cancel confirmation (`134:2`) | No free-form input; request identifier and beneficiary context | Only an open request; Principal for school or originating Additional Contact; confirmation clearly states irreversible Canceled outcome. | TRN-005. | Stale/terminal state, unauthorized actor, transaction failure. Never silently map to Denied. |
| FORM-013 | Enter/edit payout (`130:2`, `157:2`) | Recipient type: beneficiary or third-party; if third-party, payee name and relationship; delivery method Email or Text; validated destination; active payout-method ID; method-defined fields | Payout entry only when action is permitted; edit at any open state once payout exists. Conditional third-party fields required; email/text destination must match selected type; selected published method active for new selection; schema-valid method fields. Do not collect raw bank/card credentials. | Store stable method/version plus label snapshot and approved fields; TRN-007, TRN-013, or TRN-019. | Configuration unavailable, method disabled mid-form, invalid contact, concurrent state, save failure. Historical disabled method remains displayed. |
| FORM-014 | Respond to message | Required response | `response_requested` + `question_response`; authorized school actor; nonempty safe text. Recommended addition: ≤4,000 characters. | TRN-022. | Task already resolved, state changed, unauthorized actor, duplicate submit. |
| FORM-015 | Admin request changes | Required message | `in_review`; review capability; nonempty sanitized message. | TRN-003. | Stale state, missing capability, unsafe/empty message, duplicate transition. |
| FORM-016 | Admin send back from Ready to Pay | Required option and message | Option exactly `payout_change` or `question_response`; `ready_to_pay`; review capability. | TRN-016 or TRN-017. | Stale state, missing option/message, missing capability. |
| FORM-017 | Admin approve/deny | Confirmation; denial note optional per approved initial template | Allowed source state; review capability; show request/amount/school. Approve is only from `in_review`; deny follows transition table. | TRN-002, TRN-004, TRN-010, TRN-014, TRN-018, TRN-021, or TRN-024. | Guard failure, stale state, duplicate action. |
| FORM-018 | Record beneficiary confirmation | Confirmation action; minimum non-sensitive note/evidence; contact timestamp | `waiting_on_beneficiary`; payout schema valid; admin has payout capability and confirms validation/contact occurred outside portal. | TRN-011. | Missing payout, stale state, unauthorized admin, duplicate confirmation. No beneficiary link/account is created. |
| FORM-019 | Log beneficiary contact attempt | Sanitized note and timestamp | `waiting_on_beneficiary`; admin payout capability; do not collect unnecessary personal or payment data. | TRN-012. | Empty/unsafe note, stale state, unauthorized admin. |
| FORM-020 | Mark as paid (`159:2`) | Confirmation; paid timestamp defaulting to trusted server time; optional non-sensitive reference/note | `ready_to_pay` or `response_requested`; finance capability; explicit statement that payment occurred outside portal. | TRN-015 or TRN-023 and exactly one spend conversion. | Stale/terminal state, insufficient/missing reservation invariant, unauthorized actor, duplicate action. |
| FORM-021 | Send reminder (`161:2`) | Recipient resolved from request owner; optional approved note | `waiting_on_principal`; review capability; rate limit; recipient is requester, including originating Additional Contact. | TRN-009 and delivery outbox. | Missing email, recently sent/rate-limited, state changed, provider failure shown as delivery status. |

### 2.4 Administration and configuration

| ID | Form | Inputs | Required rules/effects |
|---|---|---|---|
| FORM-030 | Add/edit school (`169:2`, `174:2`) | Name, student count, address, phone, funder, school year/budget, optional Principal and contacts | Unique stable school ID; required name/address; valid year; budget via ledger, never a mutable balance; principal/contact additions create invitations. Principal identity name/email change follows the approved reinvitation workflow and never rewrites historical actor identity. |
| FORM-031 | Budget Adjustment (`171:2`) | School, school year, signed nonzero USD cents, reason, optional reference | Finance capability; immutable entry; negative adjustment must not make available funds negative; idempotent; reason required. “Set baseline” is annual allocation initialization, not balance overwrite. |
| FORM-032 | Add/edit funder (`160:2`) | Name, type, primary contact name/email/phone, optional notes | Name and configured type required; validate contact fields. Used funders may be inactivated, not destructively deleted or repurposed. Renaming preserves stable ID; no string cascade is the production relationship model. |
| FORM-033 | Edit directory contact (`172:2`) | Name, school job title, email, phone | Principals and Additional Contacts only; membership role changes are separate system-admin actions. Request-scoped beneficiaries/students/payees never enter the directory. |
| FORM-034 | Add/administer admin user (`166:2`) | Person/email; capability bundle; notification preference | System-admin capability and recent auth; invitation/verified UID binding; least privilege; append immutable role-change audit. Display role labels do not replace capability checks. |
| FORM-035 | Status-label settings | Immutable system name; admin label; school-side label | Labels required, safe, and versioned; system name and workflow are read-only; published changes prospective; audit before/after. |
| FORM-036 | Payout-method settings | Stable method ID, two labels, active flag, order, versioned allowed field schema | Used ID cannot be deleted/repurposed; disabling affects new selection only; schemas cannot request raw bank/card credentials; publish atomically after validation. |
| FORM-037 | Email-template settings | Event key, audience rule, subject/body, allow-listed variables, enabled flag | Recipient identity and required audit fields cannot be edited; safe preview/sample data and rate-limited test send; versioned publish; historical versions immutable. |
| FORM-038 | Annual budget defaults | School year and global default cents | One published default per year; change applies only to future school allocation initialization. Existing schools change only through FORM-031. |
| FORM-039 | Business calendar | America/Chicago timezone, Mon–Fri 09:00–17:00 weekly hours, organization holidays, commitment wording | Valid non-overlapping hours and dates; versioned publish; calculations use the version effective at event time. |

FORM-040: Every destructive, terminal, privilege-changing, financial, or configuration-publish action must use a named confirmation dialog with the exact target and outcome; Escape/Cancel closes without mutation and focus returns to the trigger.

---

## 3. Data Model and Persistence Requirements

### 3.1 Logical model

Firestore is required by INF-003. Collection names below are recommended implementation additions; logical entities, relationships, invariants, and retention are approved requirements.

| ID | Logical entity / suggested collection | Required fields and relationships | Lifecycle and retention |
|---|---|---|---|
| DATA-001 | Person `/people/{uid}` | Firebase UID; normalized verified email reference; permitted profile fields; status; timestamps/version. No password, token, TOTP secret, or backup code. | Active relationship +2 years, then delete/pseudonymize; historical events keep opaque UID. |
| DATA-002 | School `/schools/{schoolId}` | Stable ID; name/address/contact; status; funder references; timestamps/version. No mutable budget balance or MOU truth field. | Core record seven years after related school-year history; normally inactivate rather than delete. |
| DATA-003 | Membership `/memberships/{id}` | UID, school ID, role set, state, invited/activated/ended timestamps, immutable creator. Unique active UID-school membership. | Active +2 years, then delete/pseudonymize profile linkage subject to audit preservation. |
| DATA-004 | Admin capability assignment `/adminCapabilities/{uid}` | UID; explicit capabilities; effective/revoked timestamps; assigning actor/event. | Changes append audited history retained seven years. |
| DATA-005 | Invitation `/invitations/{id}` | Hashed token reference, normalized email, intended role/school, expiration, status, accepted UID/time, creator. | One-time use; delete no later than 30 days after expiration. Raw token is never logged. |
| DATA-006 | MOU definition/version `/mouVersions/{id}` | School year, version, exact content or immutable content reference/hash, effective dates, state. | Published versions immutable; retain seven years after year end. |
| DATA-007 | MOU signature `/mouSignatures/{id}` | Principal UID, school ID, school year, MOU version, signed time, consent evidence/hash, audit reference; unique principal-school-year-version. | Immutable; retain seven years after year end. |
| DATA-008 | Request `/requests/{requestId}` | Stable human-safe ID; school/year; immutable submitter UID; beneficiary/student/request fields; `amountCents`; canonical status; active task reference/context; payout reference; created/updated/version. | Non-sensitive core retained seven years after year end. Sensitive request fields redacted/anonymized three years after terminal status unless held. |
| DATA-009 | Request event `/requests/{id}/events/{eventId}` | Event ID/type; from/to system state; task context; actor opaque UID/type; server timestamp; idempotency/correlation reference; safe field-change summary; configuration/template label snapshots only when needed. | Append-only; retain seven years. Never use operational logs as substitute. |
| DATA-010 | Payout `/requests/{id}/payouts/{versionId}` | Recipient type; approved payee relationship/contact destination; payout method stable ID/version/label snapshot; approved schema fields; created by/time; supersedes reference. | Versioned, never silently overwritten. Sensitive details redacted three years after terminal status; minimum non-sensitive payout action evidence retained seven years. |
| DATA-011 | Active task `/requests/{id}/tasks/{taskId}` | Exactly one active context when applicable; originating event/message; assigned audience; created/resolved timestamps and resolution event. | Created and cleared atomically with transition; resolved history retained via request event. |
| DATA-012 | School-year budget `/schoolBudgets/{schoolId_year}` | School ID/year; currency USD; derived totals/cache version; reference to default/allocation initialization. Derived cache is rebuildable. | Core financial record seven years. |
| DATA-013 | Budget ledger `/schoolBudgets/{id}/entries/{entryId}` | Immutable type (`annual_allocation`, `adjustment`, `reservation`, `release`, `spend`); signed `amountCents`; request/reference; reason; actor; server time; idempotency key. | Append-only; seven years; corrections use compensating entries. |
| DATA-014 | Funder `/funders/{id}` | Stable ID; name; configured type; approved contact fields; active flag; version. School relationships use ID, not copied name. | Inactivate rather than delete while referenced; retain supporting history seven years. |
| DATA-015 | Funding relationship `/fundingAllocations/{id}` | Funder ID, school/year, committed amount/reference as applicable, timestamps/version. It does not replace the school budget ledger. | Retain seven years after year end. |
| DATA-016 | Published configuration `/config/{domain}/versions/{version}` | Domain (`status_labels`, `payout_methods`, `email_templates`, `annual_budget_defaults`, `business_calendar`); immutable version; content; state; author/publisher/timestamps. | Published versions immutable and retained seven years; pointer selects last valid published version. |
| DATA-017 | Notification event/delivery `/notificationDeliveries/{id}` | Domain event ID; template key/version; recipient opaque ID/address destination; audience; provider message ID; attempt count; state/outcome/timestamps; dedupe key. Rendered body excluded by default. | Evidence retained two years; template versions seven years. |
| DATA-018 | Legal/investigation hold `/legalHolds/{id}` | Scope, reason, approver, start/review/end dates, status. | Audited; blocks applicable deletion/redaction until released. |
| DATA-019 | Migration ledger `/__system/migrations/{id}` | Immutable migration ID/checksum, commit, environment, status, checkpoint, sanitized counts/error, times. | Protected system history according to operations policy. |

### 3.2 Invariants and trusted mutations

| ID | Requirement |
|---|---|
| DATA-020 | Server timestamps, actor identity, status, ledger type, notification recipient resolution, and audit metadata are trusted-server owned. |
| DATA-021 | Every mutable aggregate uses optimistic versioning or transaction preconditions. The caller supplies expected version/status; conflicts return a stable conflict response and do not overwrite newer data. |
| DATA-022 | Request submitter UID, request school/year, canonical event history, MOU signatures, published configuration versions, and ledger entries are immutable after creation. |
| DATA-023 | At most one actionable task exists per request. A task context must match its allowed state; terminal requests have none. |
| DATA-024 | The sum of request reservation ledger entries and releases/spend reconciles to the request’s current financial state. A paid request has spend and no active reservation; denied/canceled has neither active reservation nor spend created by that terminal transition. |
| DATA-025 | User-visible status labels are resolved from the current published label configuration, while event history always retains the canonical system state. |
| DATA-026 | Security Rules protect direct client reads/writes. Privileged server SDK access additionally uses least-privilege IAM and explicit authorization because server SDKs bypass Rules. |
| DATA-027 | Query design must not depend on filtering unauthorized documents after retrieval. Firestore queries and Rules must constrain school/owner scope so denied data is never returned. |
| DATA-028 | Beneficiary, student, payee, contact destination, and payout details remain request-scoped and never populate the general Contacts directory. |
| DATA-029 | Recommended implementation addition: use an outbox record written in the domain transaction; an idempotent worker sends email and updates delivery evidence. Domain success must not be rolled back solely because the email provider is temporarily unavailable. |
| DATA-030 | Recommended implementation addition: use UUID/Firestore IDs internally and a separate non-guessable, human-safe request display ID; do not expose sequential database keys as authorization boundaries. |

### 3.3 Data lifecycle and recovery

RET-001: Core request facts, transitions, budget entries, MOU signatures, configuration versions, payout-action evidence, and administrator actions are retained for seven years after the related school year ends.

RET-002: Beneficiary, student, payee, contact destination, and payout-instruction details are redacted/anonymized three years after terminal status. Minimum non-identifying request, amount, category, status, ledger, and audit facts remain for RET-001.

RET-003: Profiles/memberships are retained while active and two years after the relationship ends, then deleted/pseudonymized. Email delivery evidence is retained two years. Invitation/action tokens are deleted no later than 30 days after expiration.

RET-004: An idempotent cleanup job runs at least weekly, supports dry-run, records non-PII counts, emits an append-only retention event, and alerts on failure. Holds suspend applicable deletion/redaction.

RET-005: Production Firestore must enable seven-day PITR and daily backups retained 35 days. RPO is 24 hours and RTO is one business day after an authorized recovery decision. Restore into a separate database and verify before cutover.

---

## 4. Budget and Financial Rules

### 4.1 Required ledger model

| ID | Rule |
|---|---|
| BUD-001 | One global default school budget is published for each school year. It initializes future school allocations only. |
| BUD-002 | Each school/year has one immutable annual allocation entry. School-specific changes are immutable signed Budget Adjustment entries. |
| BUD-003 | Submitting a request reserves the requested amount. The reservation remains through every open state. |
| BUD-004 | Editing a request amount posts the exact reservation delta in the same transaction. An increase must fit available funds. |
| BUD-005 | Denied or Canceled releases the remaining reservation exactly once. Paid converts the reservation to spend exactly once. |
| BUD-006 | Unused funds do not roll over. A new year starts from that year’s allocation/default and adjustments. |
| BUD-007 | No code may mutate a “remaining balance” as source of truth. Cached totals are rebuildable from the ledger and must be reconciled. |
| BUD-008 | A negative adjustment is rejected if it would make available funds negative. Corrections use compensating entries; ledger rows are never edited/deleted. |
| BUD-009 | A single request must be greater than $0 and no more than $2,000 (`200000` cents), as well as no more than current available funds. |
| BUD-010 | Figma mock totals are illustrative only and must never seed rules, fixtures, or acceptance values unless explicitly labeled synthetic. |

### 4.2 Calculation

For school `s` and year `y`, using signed integer cents:

```text
allocation = annual_allocation + sum(adjustments)
reserved   = sum(active request reservations)
paid       = sum(spend entries)
available  = allocation - reserved - paid
```

A reservation/release pair nets to zero. A reservation converted to spend must remove the active reservation and add the same amount to spend atomically; it must not reduce available twice.

Example: allocation $10,000, paid $3,000, active reservations $2,500 → available $4,500.

### 4.3 Concurrency and reconciliation

BUD-011: Request submission, amount edit, denial, cancellation, and payment must read the current budget version and write ledger/request changes in one transaction with retry-safe idempotency.

BUD-012: Two concurrent requests that together exceed available funds cannot both commit. Exactly one or neither may succeed, according to transaction order; the loser receives a safe insufficient-budget conflict.

BUD-013: A scheduled reconciliation compares ledger-derived totals with request states and any cached totals. Mismatch is Severity 2, blocks affected financial transitions, and produces no automatic destructive repair.

BUD-014: UI displays allocation, paid, reserved, and available with a last-updated state. Admin adjustments show signed amount, reason, actor, and timestamp.

---

## 5. Notification Requirements

### 5.1 Delivery architecture and configuration

| ID | Requirement |
|---|---|
| NOT-001 | An implementation ADR selects the email provider. Provider choice must not change domain event, recipient, template, audit, or retry semantics. |
| NOT-002 | Templates are versioned and keyed by immutable event/state identifiers. Authorized admins may edit subject/body, enablement, audience, and allow-listed variable placement, but not recipient identity, authorization, or required audit fields. |
| NOT-003 | Recipient resolution uses the request’s originating submitter for requester notifications. Principal-wide messages use active Principal memberships only. Admin messages use an organization-controlled configured audience, initially `pef@smallmoves.org`. |
| NOT-004 | Each domain event/recipient has a deterministic dedupe key. Transient failures retry with bounded exponential backoff; permanent failure is recorded and surfaced to admins. A retry never duplicates a domain transition. |
| NOT-005 | Persist event, template version, recipient identifier/destination, provider ID, attempts, outcome, and timestamps. Do not store rendered bodies by default or log message content/PII. |
| NOT-006 | Admin notes inserted into templates are sanitized. Only allow-listed variables render. Preview/test-send uses safe sample data and is rate-limited/audited. |
| NOT-007 | Links target the authorized portal route. Authorization is enforced after sign-in; possession of an email link never grants resource access. Invitation links expire after 24 hours per approved initial copy. |
| NOT-008 | Business-time promises use the published America/Chicago calendar, initially Monday–Friday 09:00–17:00 excluding organization-observed holidays. |

### 5.2 Initial event matrix

The exact initial body copy and punctuation are controlled by the content source linked above. These subjects, audiences, and triggers are part of the implementation contract.

| Event key | Trigger | Audience | Initial subject |
|---|---|---|---|
| `principal_invited` | Admin invites Principal | Principal | `You've been invited to the Small Moves PEF Portal — [School Name]` |
| `additional_contact_invited` | Principal/authorized admin adds contact | Additional Contact | `You've been invited to help manage PEF requests — [School Name]` |
| `request_submitted.requester` | TRN-001 | Requester | `Request submitted for review — [Request ID]` |
| `request_submitted.admin` | TRN-001 | Admin audience | `New request submitted — [Request ID] · [School Name]` |
| `request_resubmitted.requester` | TRN-008/TRN-020 | Requester | `Your request has been updated — [Request ID]` |
| `request_resubmitted.admin` | TRN-008/TRN-020 | Admin audience | `Request resubmitted for review — [Request ID] · [School Name]` |
| `request_approved.requester` | TRN-002 | Requester | `Action needed: Enter payout details — [Request ID]` |
| `request_approved.admin` | TRN-002 | Admin audience | `Request approved — [Request ID] · [School Name]` |
| `changes_requested.requester` | TRN-003/TRN-016 | Requester | `Changes requested on your request — [Request ID]` |
| `changes_requested.admin` | TRN-003/TRN-016 | Admin audience | `Changes requested — [Request ID] · [School Name]` |
| `response_requested.requester` | TRN-017 | Requester | `Action needed: Please respond to your request — [Request ID]` |
| `response_requested.admin` | TRN-017 | Admin audience | `Response requested — [Request ID] · [School Name]` |
| `request_denied.requester` | Denial transition | Requester | `Request not approved — [Request ID]` |
| `request_denied.admin` | Denial transition | Admin audience | `Request denied — [Request ID] · [School Name]` |
| `request_canceled.requester` | TRN-005 | Requester | `Your request has been canceled — [Request ID]` |
| `request_canceled.admin` | TRN-005 | Admin audience | `Request canceled — [Request ID] · [School Name]` |
| `payout_submitted.requester` | TRN-007/TRN-019 | Requester | `Payout information received — [Request ID]` |
| `payout_submitted.admin` | TRN-007/TRN-019 | Admin audience | `Request is Ready for Payout— [Request ID] · [School Name]` |
| `beneficiary_confirmed.requester` | TRN-011 | Requester | `Beneficiary confirmation recorded — [Request ID]` |
| `beneficiary_confirmed.admin` | TRN-011 | Admin audience | `Ready for manual payment — [Request ID] · [School Name]` |
| `request_paid.requester` | TRN-015/TRN-023 | Requester | `Payment sent — [Request ID]` |
| `request_paid.admin` | TRN-015/TRN-023 | Admin audience | `Request completed — [Request ID] · [School Name]` |
| `payout_reminder.requester` | TRN-009 | Requester | Configured reminder template; must identify request and required payout action. |

NOT-009: Send-back copy must say “requester” where the actor can be an Additional Contact. Configurable display labels may appear in body copy, but template routing uses immutable event/state keys.

NOT-010: Email delivery failure does not roll back a committed request transition. The admin UI must expose failed/stale deliveries and an authorized, deduplicated retry action.

---

## 6. Design System and UI Guidance

### 6.1 Figma evidence map

| Area | Current node IDs |
|---|---|
| Onboarding | Create account `116:2`; 2FA `121:2`; stale 2FA success `122:2`; MOU `120:2`; existing-school locked `183:2` |
| Principal dashboard | First login `123:2`; default `128:2`; submitted `127:2`; MOU modal `126:2`; contacts `125:2` |
| Principal requests | List `137:2`; new `135:2`; waiting `138:2`; changes `132:2`; paid `133:2`; edit `131:2`; cancel `134:2`; payout `130:2`; payout success `136:2` |
| Principal account | Profile `143:2`; 2FA setup `141:2`; stale success `142:2`; Help `144:2` |
| Admin dashboard/requests | Dashboard `140:2`; queue `150:2`; request states `146:2`, `147:2`, `151:2`, `149:2`, `148:2`, `153:2`, `152:2`; dialogs `158:2`, `157:2`, `161:2`, `155:2`, `159:2` |
| Admin schools | List `170:2`; add `169:2`; profile `165:2`; fund `171:2`; principal `173:2`; contacts `167:2`; details `174:2` |
| Admin other | Funders `156:2`, `160:2`; contacts `172:2`; admin management `168:2`, `166:2`; profile `162:2` |

UI-001: Current screens establish visual direction, information hierarchy, control labels, and desktop composition. They do not establish navigation wiring, backend behavior, responsive behavior, error behavior, or permissions.

UI-002: Correct these Figma conflicts in implementation: omit `processing`; use canonical `changes_requested`; show Canceled separately; replace beneficiary self-service copy with manual admin confirmation; remove backup-code/admin-reset promises; use requester-aware copy; use ledger values rather than mock budget figures.

### 6.2 Foundations

Observed Figma values are measurements, not named tokens. The implementation must define semantic tokens rather than scattering raw values.

| ID | Evidence / implementation requirement |
|---|---|
| UI-010 | Desktop reference frame is 2,041×1,074; sidebar 208 px; header 56 px; main padding 24 px; header horizontal padding 16 px (`128:2`, `140:2`). These are desktop targets, not fixed viewport requirements. |
| UI-011 | Use Inter for UI text. Figma commonly uses 10, 12, and 14 px, with 16–30 px headings. Implementation must define named body/label/heading styles with accessible line height; do not reproduce 10 px text where it harms readability. Menlo may be used only for code-like IDs. |
| UI-012 | Seed semantic tokens from observed values: primary teal `#0FA3B1`; admin sidebar `#1A2E44`; surfaces `#FFFFFF`, `#F8FAFC`, `#F1F5F9`; neutral text/borders from `#1D293D`, `#314158`, `#45556C`, `#62748E`, `#90A1B9`; success `#5A8A20`/`#EEF6E0`; warning `#CA3500`/`#FFF7ED`. Every final combination must pass §7 contrast checks. |
| UI-013 | Seed spacing tokens 4, 8, 12, 16, 24, and 32 px; permit measured 10 px only through a named token. Seed radii 6, 8, and 12 px. |
| UI-014 | Define reusable components for app shell/sidebar/header, button/link, field/select/textarea, checkbox/radio, dialog, banner/alert/toast, tabs/filter pills, search, table/list, status badge, stepper, cards, accordion, pagination, skeleton/empty/error, and activity timeline. Each interactive component includes default, hover, focus-visible, active, disabled, loading, validation, and error states as applicable. |
| UI-015 | Status presentation uses text plus semantic icon/shape, never color alone. Display labels resolve by audience; accessible names include the canonical meaning. |
| UI-016 | The five-step presentation is Submit Request → Admin Review → Payout Details → Beneficiary Confirmation → Payment. `changes_requested` and `response_requested` are off-track actionable states; Denied and Canceled are distinct terminal off-track states. |
| UI-017 | Tables preserve search/filter state in the URL where practical; sortable headers expose direction; mobile uses labeled cards or horizontal containment without hiding critical values/actions. |
| UI-018 | Loading states do not show false zero/empty results. Empty states distinguish “no data,” “no search results,” and “no permission.” Errors provide retry where safe and a correlation/reference ID for unexpected server failures. |

### 6.3 Route and navigation behavior

UI-020: Implement the route inventory in `portal-sitemap.md` with deny-by-default route guards. The absence of Figma prototype reactions is not a reason to omit back/close behavior.

UI-021: Direct URLs restore the requested authorized screen after authentication. Unauthorized users receive a safe access-denied destination without resource existence disclosure. Unknown routes show a recoverable not-found page.

UI-022: Dialogs trap focus, use an accessible title, close on explicit Cancel/Escape unless a committed operation is in progress, and return focus to the trigger. Terminal/financial actions never close as successful until the trusted mutation confirms.

---

## 7. Accessibility and Responsive Requirements

| ID | Requirement |
|---|---|
| A11Y-001 | Meet WCAG 2.2 AA for supported journeys. Figma does not demonstrate conformance. |
| A11Y-002 | Support 320 CSS px and wider. Required test widths: 375, 768, 1024, and 1440 px, at 100% and 200% browser zoom where applicable. No two-dimensional scrolling is allowed except data tables that provide an equivalent accessible presentation. |
| A11Y-003 | All actions are keyboard operable in logical order. Provide persistent, visible focus indicators with at least 3:1 contrast against adjacent colors. Do not create keyboard traps outside an active modal. |
| A11Y-004 | Text contrast is at least 4.5:1 for normal text and 3:1 for large text; meaningful UI graphics and component boundaries meet 3:1 where WCAG requires. |
| A11Y-005 | Interactive targets are at least 24×24 CSS px or meet the WCAG spacing exception; prefer 44×44 for primary/touch actions. |
| A11Y-006 | Inputs have persistent programmatic labels, instructions, autocomplete tokens where appropriate, required state, error association, and non-color error cues. Placeholder text is not the only label. |
| A11Y-007 | Status changes, form submission outcomes, async errors, and loading completion use appropriate live-region announcements without stealing focus unnecessarily. |
| A11Y-008 | Tables use captions/headers and expose sort state. Responsive card alternatives preserve relationships and accessible names. |
| A11Y-009 | Icons have accessible names when actionable and are hidden from assistive technology when decorative. Every icon-only action has a visible tooltip on hover/focus and a programmatic name. |
| A11Y-010 | Page title, one primary heading, landmarks, skip link, current navigation state, and breadcrumb/back relationship are programmatically available. |
| A11Y-011 | Respect `prefers-reduced-motion`; no required understanding depends on animation. Authentication QR setup includes text instructions and a manual secret path only if Firebase safely supports it. |
| A11Y-012 | Errors and confirmations use plain language and identify the affected request/school without unnecessarily exposing beneficiary details. Time and currency are formatted consistently; deadlines identify America/Chicago/business-time semantics. |

RESP-001: At 320–767 px, replace the fixed sidebar with an accessible disclosure/drawer, stack forms/actions, allow dialogs to fill the viewport with safe margins, and convert wide request/school tables to labeled records or an accessible scroll region.

RESP-002: At 768–1023 px, use the available width without assuming the 208 px sidebar; preserve primary actions and status context. At ≥1024 px, the desktop shell may follow Figma measurements.

RESP-003: No critical action may be hover-only. Row actions shown on hover in Figma must also be reachable by keyboard and touch.

---

## 8. Acceptance Criteria

Every criterion is release-blocking unless explicitly marked operational/launch-only.

| ID | Given | When | Then |
|---|---|---|---|
| AC-AUTH-001 | A valid unused invitation for a verified email | The user accepts it and completes Firebase account setup | Exactly one UID is bound to the intended membership, the token cannot be reused, and no credential/token plaintext is stored. |
| AC-AUTH-002 | An Additional Contact belongs to School A and did not create Request R | They navigate/query/call a trusted endpoint for R | R is not returned and the response does not reveal whether it exists. |
| AC-AUTH-003 | A Principal and Additional Contact share a school | Each lists requests | The Principal sees school requests; the contact sees only requests whose submitter UID is their own. |
| AC-AUTH-004 | An admin lacks a required capability | They call the privileged endpoint directly | The action is denied, with no write, event, ledger entry, or notification. |
| AC-AUTH-005 | TOTP is required | A verified user enrolls, signs in with a challenge, or changes an enrolled factor | The portal presents the complete UI and Firebase/Identity Platform performs enrollment, resolution, and unenrollment; application data contains no TOTP secret, backup code, or bypass. |
| AC-AUTH-006 | A visitor requests a password reset for any syntactically valid email | They submit `/auth/reset-password` | The portal invokes Firebase, shows the same neutral completion response regardless of account existence, and offers return/resend without exposing provider details. |
| AC-AUTH-007 | A valid Firebase reset, verification, or email-recovery action link is opened | The portal loads `/auth/action` | The frontend validates the mode/code through Firebase, renders the correct mode-specific UI, completes the action once, and redirects only to an allow-listed same-origin destination. |
| AC-AUTH-008 | A Firebase email action code is missing, invalid, expired, already used, or has an unknown mode | The action handler loads | No identity change occurs; the code is not logged/persisted; an accessible explanation and safe restart/resend/sign-in action are shown. |
| AC-AUTH-009 | A signed-out user cannot access their enrolled authenticator | They choose “Can’t access your authenticator?” | The portal provides the approved Small Moves support path and no bypass/reset control. After an authorized operator clears the factor in Firebase, normal sign-in and required re-enrollment are supported. |
| AC-AUTH-010 | Firebase requires recent authentication for password, email, or factor change | The user completes or cancels reauthentication | Success resumes the intended action once; cancel/failure leaves account state unchanged and returns focus/context safely. |
| AC-AUTH-011 | A protected session expires or is revoked | The user next loads or mutates protected data | Portal state is cleared, the user is sent to Firebase sign-in with a validated same-origin return target, and protected data is not shown until current authorization is reloaded. |
| AC-MOU-001 | A new Principal joins mid-year without a current signature | They attempt to complete onboarding/submit a request | They must sign the current school/year/version MOU; a former Principal’s signature does not satisfy them. |
| AC-MOU-002 | All current Principals have signed | An authorized school actor starts a request | The compliance gate passes; an Additional Contact never receives a signing action. |
| AC-REQ-001 | A compliant school has $2,500 available | An authorized actor submits a valid $2,000 request twice with the same idempotency key | One request/reservation/event set is created and available becomes $500. |
| AC-REQ-002 | A school has $1,000 available | An actor submits $1,001 | Validation rejects it and creates no request, reservation, activity, or email event. |
| AC-REQ-003 | Two actors concurrently request amounts whose sum exceeds available | Both trusted transactions execute | At most one incompatible reservation commits; totals never become negative. |
| AC-REQ-004 | An open request is canceled by an authorized actor | The confirmation succeeds | Status is `canceled`, reservation is released once, Canceled labels/templates are used, and it cannot reopen. |
| AC-REQ-005 | An admin denies an open request | The transaction succeeds | Status is `denied`, reservation is released once, and no cancellation event/template is used. |
| AC-REQ-006 | A request is terminal | Any actor retries or attempts another transition | The action fails without any domain, budget, activity, or notification write. |
| AC-REQ-007 | A `ready_to_pay` request | Admin asks for a payout change | Status/task are `changes_requested`/`payout_change`; completion returns to `waiting_on_beneficiary` and clears the task atomically. |
| AC-REQ-008 | A `ready_to_pay` request | Admin asks a question and the school actor responds | Status/task become `response_requested`/`question_response`, then return to `ready_to_pay` with the task cleared and messages recorded. |
| AC-REQ-009 | Payout data exists on an open request | An authorized actor edits it | The configured schema is revalidated, a new payout version/event is stored, and request status does not change unless the transition table explicitly says so. |
| AC-PAY-001 | An admin has validated/contacted the beneficiary outside the portal | They record confirmation | Status becomes `ready_to_pay`; evidence/event is stored; no beneficiary account, token, or portal notification is created. |
| AC-PAY-002 | A finance-capable admin completed payment outside the portal | They mark the request paid twice with one key | One `paid` transition and one reservation-to-spend conversion exist. |
| AC-BUD-001 | Allocation is $10,000, paid is $3,000, reserved is $2,500 | Budget is displayed/reconciled | Available is exactly $4,500. |
| AC-BUD-002 | A negative adjustment would reduce available below zero | Admin submits it | It is rejected with no ledger entry. |
| AC-BUD-003 | A correction is needed | Admin records a compensating adjustment | Original entries remain immutable and the new signed entry explains the correction. |
| AC-NOT-001 | A transition commits and provider delivery is transiently unavailable | The outbox worker retries | Domain state remains committed, delivery attempts are deduplicated/audited, and admins can see persistent failure. |
| AC-NOT-002 | An Additional Contact created the request | A requester notification/reminder is generated | It resolves to that contact, not an unrelated Principal; access remains owner-scoped after link navigation. |
| AC-CONFIG-001 | An admin changes a display label | They publish a valid version | New UI resolves the new audience label; canonical state, transitions, history, and analytics identity are unchanged. |
| AC-CONFIG-002 | A payout method has historical use | Admin disables it | Existing requests display the stored method/label; new forms cannot select it. |
| AC-CONFIG-003 | A template contains an unapproved variable/unsafe markup | Admin publishes | Publication is rejected and the last valid published version remains active. |
| AC-DATA-001 | Sensitive request data reaches three years after terminal status and has no hold | Cleanup runs | Sensitive fields are redacted while minimum seven-year request/ledger/audit facts remain. |
| AC-DATA-002 | A record is under an active documented hold | Cleanup runs | Applicable deletion/redaction is skipped and the result is audited without exposing PII in logs. |
| AC-UI-001 | A page is loading, empty, filtered-empty, forbidden, or failed | It renders | Each condition has a distinct accessible state; loading never masquerades as empty, and failure offers a safe retry/reference. |
| AC-A11Y-001 | A keyboard-only user at 375 px and 200% zoom | They complete onboarding, request, payout, and admin review journeys | All controls and dialogs are reachable/visible, focus is managed, errors are announced, and no critical content/action is lost. |
| AC-OPS-001 | A pull request is opened from a trusted branch | CI succeeds | Formatting, lint, types, unit, Rules/emulator, integration, dependency, build, and nonproduction preview checks report against the immutable commit. |
| AC-OPS-002 | A migration is rerun with a completed ID but different checksum | The job starts | It fails before data mutation and records a sanitized result. |
| AC-OPS-003 | A restore exercise is performed | The recovery database is validated | Counts, budget/request invariants, rules/indexes, retention cleanup, and representative journeys pass before any cutover. |

---

## 9. Verification and Test Plan

| ID | Test layer | Required coverage and evidence |
|---|---|---|
| TEST-001 | Static/unit | Formatting, linting, strict types, deterministic business-calendar math, currency/ledger calculations, field/schema validation, label resolution, recipient resolution, and sanitization. |
| TEST-002 | State model | Table-driven tests for every TRN row, every invalid actor/source/task combination, terminal immutability, expected-version conflicts, and idempotent retries. |
| TEST-003 | Budget concurrency | Firestore emulator transaction tests for concurrent reservations, amount deltas, release/spend conversion, duplicate keys, negative adjustments, and reconciliation. |
| TEST-004 | Security Rules | Positive and negative tests for anonymous, Principal, Additional Contact owner/non-owner, cross-school, admin capability, inactive membership, and direct-write attempts. Queries must prove unauthorized documents are not returned. |
| TEST-005 | Trusted APIs | Token verification, current authorization, recent-auth requirements, input normalization, rate limits, App Check enforcement plan, server-owned fields, safe errors, and audit/outbox atomicity. |
| TEST-006 | Firebase Auth | Invitation binding and existing-account acceptance; verification send/resend/action; sign-in/sign-out; MFA-required resolver, factor selection, TOTP enroll/challenge/unenroll/re-enroll; reset request and reset confirmation; `verifyEmail`/`recoverEmail`; recent reauthentication; email/password updates; invalid/expired/already-used action codes; enumeration-resistant reset response; allow-listed continuations; revoked/expired sessions; lost-authenticator support handoff; and operator-cleared-factor return through approved Firebase capabilities. |
| TEST-007 | Forms/UI | Required/conditional fields; boundary values; stale configuration/state; duplicate submit; loading/empty/error/disabled/success; history/back/refresh; direct authorized/unauthorized routes. |
| TEST-008 | Notifications | Each event/audience/template version, allowed variables, safe note rendering, business-time wording, link authorization, dedupe, retry/backoff, permanent failure, and test-send controls. Use a fake provider in CI. |
| TEST-009 | Accessibility | Automated checks plus keyboard and screen-reader manual tests of representative flows; focus/announcement/dialog/error/table/status/zoom/reflow/contrast/target-size verification at 375, 768, 1024, and 1440 px. |
| TEST-010 | Responsive/browser | Latest two major versions of Chrome, Edge, Firefox, and Safari where available; iOS Safari and Android Chrome representative devices; 320 px minimum; touch and reduced motion. |
| TEST-011 | Migration | Dry run, resumability/checkpoint, idempotency, checksum guard, partial failure, bounded batch/retry/cost, before/after invariants, nonproduction rehearsal, and forward recovery. |
| TEST-012 | Operations | Staging smoke tests, rollback, structured log redaction, dashboards/alerts, backup failure, retention cleanup/hold, account deletion, incident access revocation, and annual restore exercise. |
| TEST-013 | Security review | Lightweight threat model covering auth, invitation takeover, cross-school/owner access, admin abuse, settings/templates, beneficiary/payout data, replay/races, migrations, logs, secrets, backups, and dependency/supply chain. |
| TEST-014 | Traceability | CI or review checklist maps each implemented feature/test to requirement and acceptance IDs. No requirement is closed by screenshot-only evidence when behavior is involved. |

OPS-001: CI uses GitHub Actions and Workload Identity Federation with short-lived credentials. Fork PRs receive no deployment credentials. Trusted PR previews use nonproduction Firebase only.

OPS-002: Merge deploys the same immutable commit/artifact to staging, applies compatible rules/indexes, and runs smoke tests. Production uses a protected environment and the DEC-018 approval rule. Migrations are separately approved and never silently launched by application deployment.

OPS-003: Structured logs include severity, event, service, environment, release SHA, correlation/domain request ID, outcome, category, duration/retries as applicable. They exclude credentials, tokens, TOTP data, raw request bodies, rendered emails, and beneficiary/student/payout details.

OPS-004: Monitor hosting/API availability and errors, auth/recovery failures, jobs/functions, email failures, stale payout work, Firestore anomalies/denials/indexes, backup/PITR health, and billing. Internal availability objective is 99.5% monthly.

OPS-005: Application/Data Access logs retain 30 days; required Cloud Audit Logs retain 400 days; domain audit follows RET-001. Severity 1 acknowledgement is within two business hours; Severity 2 by next business day; Severity 3 weekly triage.

---

## 10. Implementation Sequence

| Sequence | Deliverable | Entry/exit gate |
|---:|---|---|
| 1 | Architecture records and repository skeleton | Record recommended collection/API/outbox/email choices; keep DEC-018 open for production specifics. Establish strict types, lint/test/build. |
| 2 | Firebase/GCP nonproduction foundation | Dev/staging projects, emulators, Hosting, Auth/Identity Platform, Firestore, trusted compute, Secret Manager, App Check observe mode, WIF CI, logs. No production provisioning without DEC-018. |
| 3 | Design foundations and accessible shell | Semantic tokens/components, responsive navigation, route guards, global loading/error/not-found/forbidden, keyboard/focus behavior. Review Figma corrections. |
| 4 | Identity, membership, invitation, and MOU | ROLE/AUTH/MOU model; complete Firebase-backed frontend account, email-action, password, session, reauthentication, and TOTP journeys; annual signatures; own-request Security Rules and tests. |
| 5 | Configuration primitives | Versioned status labels, payout methods, annual defaults, business calendar, and email templates/outbox scaffolding. Seed approved initial versions. |
| 6 | Budget ledger | Allocation/adjustment/reservation/release/spend transactions, concurrency/reconciliation, admin budget UI, tests. |
| 7 | School-side request workflow | Dashboard/list/detail, create/edit/cancel, task responses, payout forms, activity, notifications, responsive/accessibility states. |
| 8 | Admin request workflow | Queue/detail, approve/deny/remind/send-back, beneficiary-contact evidence, mark paid, audit and notification failure UI. |
| 9 | Administrative directories/settings | Schools, funders, principal/contact management, admin capabilities, settings publication; no export. |
| 10 | Migration, retention, backup, observability, and security hardening | Migration ledger/jobs, cleanup/holds/account deletion, PITR/backups/restore drill, dashboards/alerts/runbooks, threat model. |
| 11 | Release candidate and production readiness | Full AC/test matrix, data/privacy/accessibility review, content proof, staging smoke/rollback. Resolve DEC-018 and provision production. |

SEQ-001: Expand–migrate–contract is mandatory for incompatible Firestore shape changes. Add tolerant readers/rules, run a versioned idempotent Cloud Run migration with recovery point and validation, then remove compatibility in a later release.

SEQ-002: Additive indexes deploy before dependent code. Firestore Rules/indexes are version controlled; console drift is copied into reviewed source immediately.

---

## 11. Definition of Done

A feature is done only when all applicable items are true:

- [ ] DOD-001 — Requirement, design node, source decision, implementation, and tests are traceable by stable IDs.
- [ ] DOD-002 — Happy path, field validation, loading, empty, failure, disabled, stale-state, unauthorized, and retry states are implemented.
- [ ] DOD-003 — Client and trusted-server validation agree; server authorization denies direct bypass attempts.
- [ ] DOD-004 — Domain mutation, task, budget, audit, and outbox behavior is atomic and idempotent where applicable.
- [ ] DOD-005 — Firestore Rules and query tests cover owner, school, role, capability, inactive, anonymous, and cross-tenant cases.
- [ ] DOD-006 — No secret, credential, token, raw payment credential, rendered email, or unnecessary personal data appears in source, client bundles, telemetry, fixtures, or screenshots.
- [ ] DOD-007 — Keyboard, screen-reader, contrast, focus, zoom/reflow, touch-target, and reduced-motion checks pass for the affected journey.
- [ ] DOD-008 — Responsive behavior passes at 375, 768, 1024, and 1440 px and remains usable at 320 px.
- [ ] DOD-009 — Operational signals, structured logs/redaction, alerts, and runbook steps exist for new trusted services/jobs and failure modes.
- [ ] DOD-010 — Data classification, retention/redaction, migration/backfill, backup/recovery, and legal-hold effects are addressed.
- [ ] DOD-011 — Exact approved content and audience-specific status labels are proofread; stale Figma terms/behaviors are absent.
- [ ] DOD-012 — CI passes formatting, lint, types, unit, Security Rules/emulator, integration, accessibility automation, dependency scanning, and production build.
- [ ] DOD-013 — Reviewer verifies no export, beneficiary self-service, payment integration, portal-issued backup-code UI, custom credential/authentication backend, custom Firebase admin reset/bypass, or legacy-repository dependency entered scope.
- [ ] DOD-014 — Staging smoke and rollback checks pass on the immutable release candidate.
- [ ] DOD-015 — For production release only: DEC-018 is resolved, production access/regions/domains/billing are configured, PITR/daily backup/alerts are enabled, restore exercise is recorded, and promotion is explicitly approved.
- [ ] DOD-016 — Firebase-backed frontend journeys for verification, sign-in/TOTP challenge, reset request/action, recent reauthentication, email/password update, factor management, session expiry, and lost-authenticator support pass happy-path and failure-state tests without a custom credential backend.

The initial release is implementation-complete only when every release-blocking acceptance criterion passes and all applicable Definition of Done items are evidenced. Production launch remains separately gated by DOD-015.