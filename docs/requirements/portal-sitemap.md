# PEF Portal — Sitemap
**Small Moves · Principal Emergency Fund**
React + TypeScript + Vite · react-router-dom v7

---

## Default and Protected Routing

| Condition | Behavior |
|---|---|
| Signed out at `/` | Redirect to `/login` |
| Signed in with incomplete onboarding | Redirect to that identity's next required onboarding step |
| Completed principal/additional-contact account at `/` | Redirect to `/dashboard` |
| Authorized admin at `/` | Redirect to `/admin/dashboard` |
| Signed out at a protected route | Redirect to `/login` with a validated same-origin return target |
| Signed in without permission for a route | Show access denied |
| Unmatched route | Show a role-appropriate 404 |

Invite routes are token-bound and may start authentication/onboarding. They do
not make the general account-creation route public.

One Firebase UID maps to one person. School-scoped access comes from explicit,
audited memberships and roles; organization-admin capabilities are separate.
The shared school portal renders controls from the active school membership.
A Principal receives school-wide capabilities. An Additional Contact receives
read-only school context and can access and manage only requests they
initiated.

---

## 1. Authentication

### `/login` — Login
Layout: full-page centered card, no sidebar.

Firebase Authentication verifies email/password credentials, email ownership,
sessions, password reset, and TOTP MFA. After Firebase verifies the identity,
the application resolves roles, school memberships, permissions, and onboarding
state by Firebase UID. Email patterns and client-side portal-mode toggles are
not authorization.

**Primary sign-in fields and actions**
- Email
- Password with visibility toggle
- Firebase-supported session persistence choice
- “Forgot your password?” → `/auth/reset-password`
- Sign in → Firebase Authentication, then the routing table above
- Unverified-email response → send/resend Firebase verification email and
  explain how to return after verification
- Neutral invalid-credential, submitting, offline/provider-error, too-many-
  attempts, and retry states

**Conditional TOTP challenge**
- When Firebase returns `auth/multi-factor-auth-required`, retain the Firebase
  resolver only in memory and replace/advance the card with factor selection
  when more than one factor exists, a six-digit TOTP field, Verify, Back, and
  “Can’t access your authenticator?” actions
- Firebase validates the assertion and establishes the session; the portal
  stores no TOTP value, resolver, secret, or factor credential
- Define invalid code, expired resolver/session, too many attempts,
  provider-unavailable, cancel, and safe restart states
- “Can’t access your authenticator?” opens the approved Small Moves support
  path. It does not bypass or reset MFA.

### `/auth/reset-password` — Request password reset
- Email field, Submit, Back to sign in, submitting, completion, and retry states
- Invoke Firebase `sendPasswordResetEmail` with the approved action-code
  settings and allow-listed same-origin continuation
- Always show the same neutral completion response for a syntactically valid
  email, regardless of whether an account exists
- Firebase sends the action link; `/auth/action` validates and completes it

### `/auth/action` — Firebase email action handler
- Parse only Firebase `mode`, `oobCode`, optional `continueUrl`, and
  language inputs; do not persist or log the one-time code
- `resetPassword`: verify the code through Firebase, show new-password and
  confirmation fields, apply Firebase password policy, confirm once, and offer
  sign-in/allow-listed continuation
- `verifyEmail`: apply the code through Firebase, refresh identity state, show
  success, and offer sign-in/allow-listed continuation
- `recoverEmail`: validate and apply the Firebase recovery action, show the
  restored-email result safely, and offer password-reset/sign-in actions
- Unknown mode and missing, invalid, expired, or already-used codes make no
  identity change and show an accessible restart/resend/sign-in path
- Redirect only to an allow-listed same-origin continuation

### TOTP account management and lost-factor recovery
- Firebase Authentication with Identity Platform owns TOTP enrollment,
  challenge, reauthentication, unenrollment, and factor state
- Onboarding and Profile provide frontend enrollment, unenrollment, and
  re-enrollment UI using Firebase. Factor changes require recent
  reauthentication when Firebase requires it.
- If Firebase signs the user out after the last factor is unenrolled, clear
  portal state and return to Login with a validated same-origin continuation
- A signed-out user who lost the authenticator follows the support path.
  An authorized operator may clear the factor using audited Firebase platform
  capabilities outside the portal; the user then signs in and completes
  required re-enrollment
- The portal stores no password, action code, session token, TOTP secret,
  backup/recovery code, resolver, or MFA bypass
- The portal exposes no custom administrator password or MFA reset control

---

## 2. Onboarding
Layout: `OnboardingLayout` with a stepper and no portal sidebar. Entry requires
a valid invitation or approved membership context.

### `/onboarding/create-account` — Identity and profile
- Verify or create the email/password identity with Firebase Authentication
- Send/resend Firebase email verification and do not begin required TOTP
  enrollment until Firebase reports the email verified
- Verify that the authenticated email/UID matches the pending invitation
- Capture approved personal and membership/profile fields in application data;
  never store credentials
- New-school principals may confirm approved school fields; principals joining
  an existing school see school data read-only
- Additional Contacts enter personal information only; school data is read-only
  and the invitation binds the identity to the specific school membership
- If an invited email already belongs to a Firebase identity, bind the pending
  membership to that person rather than creating a duplicate account

### `/onboarding/2fa` — Enroll TOTP MFA
- Require verified email and recent authentication
- Use Firebase Authentication with Identity Platform to generate the TOTP
  enrollment secret/session
- Display QR and manual key, accept the current code, and finalize enrollment
  through Firebase
- Define retry, expired-session, invalid-code, and reauthentication states

### `/onboarding/2fa-success` — Enrollment complete
- Confirm the enrolled Firebase factor and continue
- Do not display or persist application-generated backup codes

### `/onboarding/agreement` — Sign current-year MOU
- Show the approved current MOU version and school year
- Require acknowledgement and electronic signature evidence
- Create an immutable signature record containing principal ID, school ID,
  school year, MOU version, signed timestamp, and evidence
- Every principal signs each school year; a mid-year principal signs before
  completing onboarding
- Additional contacts skip this step unless they also hold a principal role
- Continue to `/dashboard` only after required principal onboarding is complete

A school-level MOU indicator is derived from the current principal-year
signature records. A single mutable school timestamp is not authoritative.

---

## 3. School Portal
Layout: `PortalLayout` — collapsible left sidebar (white), top header with user avatar dropdown. Principals and Additional Contacts share this shell; permissions and data scope differ by active school membership.

**Sidebar navigation (Principal and Additional Contact modes)**
| Label | Route |
|-------|-------|
| Dashboard | `/dashboard` |
| Requests | `/requests` |
| Help | `/help` |

**Top-right user dropdown (school-user mode)**
| Item | Action |
|------|--------|
| Profile | Navigate `/profile` |
| Sign out | Navigate `/login` |

**Welcome Modal** (shown once after onboarding completes)
- Triggered by `state.showWelcomeModal === true`
- Dismissed via `dismissWelcomeModal()` action

---

### `/dashboard` — Dashboard

**School Header card**
- School name, address, phone, student count
- Principal: edit pencil → inline edit form (school name, phone, address, city, number of students)
  - Save / Cancel
- Additional Contact: the same school fields are read-only and no edit control is rendered

**Contacts & Compliance card**
- Principal row (name, email, phone)
- Additional contacts section
  - Principal: Edit pencil → **Edit contacts dialog** with up to 2 contacts;
    fields are name, email, and school job title; Save / Cancel
  - Additional Contact: read-only; cannot add, delete, edit, or change another
    user's permissions
- Annual Agreement (MOU) row
  - Principal: shows that person's signed/pending state for the current school
    year/version and offers “View” / “Sign now” as applicable
  - Additional Contact: read-only school compliance status; cannot sign or renew
    the agreement

**MOU dialog** (also accessible from New Request)
- Scrollable current MOU text, version, and school year
- Principal with an unsigned requirement: checkbox + “Sign & save” button
- Principal already signed: immutable signer/date/version banner + “Close”
- Additional Contact: view-only; no signature or renewal control
- Signing creates a principal/school/year/version record; it never overwrites another principal’s signature

**Budget card**
- Available amount (large)
- Stacked progress bar: Paid out (teal) + Pending (amber) + Available (slate)
- Breakdown: Paid out, Pending, Available amounts

**Action Needed banner** (conditional — shown when requests in `Waiting on Principal`, `Changes Requested`, or `Response Requested`)
- Lists each request with its ID and status note
- "Open" button → navigates to first actionable request

**Open Requests section**
- "New Request" button → `/requests/new`
- Principal query scope: all requests for the active school
- Additional Contact query scope: requests whose immutable submitter ID is that
  contact's person/Firebase UID
- Empty state (no requests in the authorized scope)
- `RequestsTable` when authorized requests exist (click row → `/requests/:id`)

**Request Submitted dialog** (triggered by `location.state.submitted === true` after creating a request)
- Success checkmark
- Confirmation message
- Close button (clears router state)

---

### `/requests` — Requests List

The Principal sees every request for the active school. An Additional Contact
sees only requests they initiated; list, search, tab counts, row fetches, and
direct detail authorization all enforce the same server-side scope.

> **Update (2026-07-20):** `RequestsTable` (below) picked up inline row actions and an edit/cancel flow of its own since this was last documented — it's no longer just a display table.

**Header**
- Title: "Requests" + school name subtitle
- "New Request" button → `/requests/new`

**Tabs**
| Tab | Contents |
|-----|----------|
| Open · N | `In Review`, `Waiting on Principal`, `Waiting on Beneficiary`, `Ready to Pay`, `Changes Requested`, `Response Requested` |
| Paid · N | `Paid` |
| Denied · N | `Denied` |
| Canceled · N | `Canceled` |

**Search bar** (filters by request ID, beneficiary name, category)

**`RequestsTable`** (shared component — also reused, unfiltered/filtered, wherever a request list appears)
- Columns: ID, Requestor, Beneficiary, Student (hidden md), Amount (hidden md), Date (hidden lg), Status. (Corrected — there's no Category column.)
- Row click → `/requests/:id`
- Inline per-row buttons, shown before the "⋯" menu, when applicable:
  - "Complete Request" — status is `Waiting on Principal` → `/requests/:id/payout`
  - “Complete Changes” — system status `changes_requested` with task context `payout_change` → `/requests/:id/payout`
  - “Complete Changes” — system status `changes_requested` with task context `request_change` → `/requests/:id` edit flow
  - "Respond to Message" — status is `Response Requested` → `/requests/:id` (opens the respond-to-message flow inline)
- “⋯” actions dropdown: View · Complete Request (if `waiting_on_principal`) · Edit request details (if `in_review` or task context `request_change`) · Edit payout details (if permitted and request is open) · Cancel request (if open). Beneficiary contact/confirmation is an admin-managed manual step.
- Own **Edit Request dialog**, **Reset-to-Review confirm dialog**, and **Cancel confirm dialog** — same shape and behavior as the ones on the Request Detail page (§ below), just usable without leaving the list.

---

### `/requests/new` — New Request

Available to an active Principal or Additional Contact membership when the
school is active, every current Principal has the required current-year MOU,
and budget/request rules permit submission. The authenticated person becomes
the immutable request submitter.

**Form sections** (inside card with dividers)
1. **People**: beneficiary name (required), student name (optional)
2. **Request details**: amount (required, max $2,000, must not exceed remaining budget), reason (select, with "Other" free-text), fund usage category (select, with "Other" free-text)
3. **Additional context** (optional textarea)
4. **Compliance**
   - Principal: required request-level MOU acknowledgement plus link to view/sign
     the current agreement
   - Additional Contact: read-only confirmation that all current Principals are
     compliant; no signature/renewal control

**Validation**
- All required fields
- Amount ≤ $2,000 AND ≤ remaining budget
- School has current Principal MOU compliance
- Principal request-level acknowledgement is checked when applicable

**Submit → `createRequest()`**
- New request created with status `In Review`
- Navigate → `/dashboard` with `state.submitted = true`

**Cancel** → `/dashboard`

**MOU dialog** (view-only, no signing)

---

### `/requests/:id` — Request Detail

Principal access is school-wide. Additional Contact access requires an active
membership in the request's school and an exact match between the request's
immutable submitter ID and that contact's person/Firebase UID. The same check
applies to edit, cancel, respond, and payout actions; route knowledge alone
never grants access.

> **Update (2026-07-20):** the "Waiting on Principal" status is unchanged in the product — the note below is code trivia only. What's actually new here: the send-back-from-Ready-to-Pay statuses (`Changes Requested` for a payout change, `Response Requested` for a question — **there is no `Processing` status**) with their "Complete Changes" and "Respond to Message" paths — see below.

**Header**
- Back button
- Request ID + status badge
- If system status is `changes_requested` with task context `payout_change`: amber badge “Payout change requested by admin”
- **Action buttons** (context-sensitive by status):
  - `Waiting on Principal` status: primary "Complete Request" button → `/requests/:id/payout`
  - `changes_requested` with task context `payout_change`: primary “Complete Changes” → `/requests/:id/payout`
  - `changes_requested` with task context `request_change`: primary “Complete Changes” → Edit Request dialog
  - `Response Requested` status: primary "Respond to Message" button → opens the respond-to-message flow inline (posts the reply to the activity trail and returns the request to `Ready to Pay`)
  - All non-closed: "Actions" dropdown

**Actions dropdown** (visible for nonterminal system statuses)
| Action | Available when |
|---|---|
| Complete Request (enter payout info) | `waiting_on_principal` |
| Edit request details | `in_review` or task context `request_change` |
| Edit payout details | Request has payout data and transition/role rules permit editing |
| Cancel request | Any nonterminal status; writes terminal system status `canceled` |

**Status Stepper card** — visual timeline of request progress

**Request Details card** (3/5 width on lg)
- Beneficiary, Student, Recipient, Amount, Category, Reason, Payout method, Payee, School, Submitted, Last updated, Notes
- Prior payments section (if same beneficiary has prior paid requests)

**Activity trail card** (2/5 width on lg)
- Chronological log of all status changes and notes

**Edit Request dialog** (modal)
- Beneficiary, student, amount, reason, category, additional context
- If request has already passed admin approval: shows **Reset to Review confirm dialog**

**Reset to Review confirm dialog** (modal)
- Warning: saving changes will send back to Admin Review
- "Go back" / "Save & reset to review" buttons

**Cancel Request confirm dialog** (modal)
- Destructive confirm: “Yes, cancel it” → server transition to system status `canceled` with principal-withdrawal audit event and budget-reservation release

---

### `/requests/:id/payout` — Enter Payout Details

**Locked summary header** (read-only: beneficiary, amount, student, submitted by, request ID)

**Prior payment history banner** (shown if beneficiary has prior paid requests)

**Form sections**
1. **Who should receive the funds?**
   - Radio: "Beneficiary directly" | "Third-party payee"
   - If third-party: payee name + relationship fields
   - Payee prior payment banner (if payee name matches prior requests)

2. **Contact method** (toggle buttons): Email | Text
   - Email address or phone number field

3. **Payout method**: render the active methods and field schema from `/admin/settings`
   - Preserve the selected stable method ID and label snapshot on the request
   - Do not collect raw bank/card credentials or execute payment

**Submit payout details**
- Server validates configured fields and transitions to system status `waiting_on_beneficiary`
- Admin validates details, contacts the beneficiary outside the portal, and records confirmation before `ready_to_pay`
- Success dialog: “Payment details submitted” → close to `/dashboard`

**Cancel** → `/requests/:id`

---

### `/help` — Help Center Details
(Shared with admin)

> Help center copy below is synced from the Small Moves *PEF Portal — Help Center Content* doc. The page renders it as two accordions (How It Works, FAQ) on the left, with the contact card and agreement reminder on the right.

**Left (2/3)**: How It Works (accordion)

**Submitting a request**
1. Click "+ New Request" from the Dashboard or Requests page.
2. Enter the beneficiary name (the person receiving the funds. If the student is 18 or older, they can be the beneficiary. If the student is under 18, the beneficiary must be their parent, legal guardian, or caregiver).
3. Fill in the amount, reason, and fund usage category.
4. Check the MOU compliance box and click "Submit for review."
5. You'll get a confirmation — Small Moves will review within 48 business hours.

**Entering payout information**
- When approved, a banner appears on your Dashboard — click "Open" to act on it.
- Meet with the family to let them know the funds are coming and find out how they want to receive the funds.
- On the Enter Payout Details page, select who receives the funds: the beneficiary directly, or a third-party payee (landlord, utility company, family member accepting funds on their behalf).
- If using a third-party payee, enter the payee name and their relationship to the beneficiary (e.g. a gas company to pay a bill).
- Select a delivery method (Email or Text) and enter the contact info to reach the payee.
- Choose one of the payout methods currently enabled by Small Moves in Portal Settings.
- Click Submit — the request is sent to the recipient for confirmation.

**The request process**
- **Submit Request** — You submit the request — this step is complete the moment you hit submit.
- **Admin Review** — The Small Moves team reviews your request for approval. Typically within 48 business hours. We will come back to you if we have any questions about the request before approving.
- **Meet with Beneficiary** — Meet with the beneficiary to find out how they want the funds to be received and inform them they will be contacted by Small Moves.
- **Payout Details** — Following approval, you must meet with the beneficiary to determine their preferred method for receiving funds and let them know that Small Moves will contact them. Afterward, submit the beneficiary payout details to allow the request to proceed.
- **Beneficiary Confirmation** — A Small Moves administrator validates the payout details, contacts the beneficiary outside the portal, and records confirmation.
- **Payment** — An administrator records that payment was completed outside the portal. The request is complete.

**Other request states**
- **Changes Requested** — Modifications to the payout details need to be made by the school leader.
- **Response Requested** — The Small Moves team may request additional details to clarify a certain part of the request before proceeding.
- **Denied** — An administrator did not approve the request.
- **Canceled** — An authorized school-side submitter withdrew the request; this is separate from Denied.

**Editing, cancelling & resending**
1. Open an active request you are authorized to manage. Principals can manage
   school requests; Additional Contacts can manage only requests they initiated.
2. Click the "Actions" button in the top right.
3. Choose "Edit request" to update beneficiary, amount, reason, or category
   before approval, or update payout information during an allowed payout stage.
4. Choose “Cancel request” to withdraw an authorized open request — this creates
   the Canceled terminal state and cannot be undone.
5. All edits and actions are timestamped and logged in the Activity section.

**Left (2/3)**: Frequently Asked Questions (accordion)

**Q: Who is eligible to receive funds through the PEF?**
The Principal Emergency Fund supports members of your school community who are experiencing a financial crisis. Funds are intended for genuine emergencies that cannot be addressed through other available resources. Beneficiaries can be anyone in your school community over the age of 18 and cannot be a member of the school's leadership team, PEF team, or a relative of the principal or school leadership team.

**Q: Who is the "beneficiary" on a request?**
The beneficiary is the person receiving the funds. If the student is 18 or older, they can be the beneficiary. If the student is under 18, the beneficiary must be their parent, legal guardian, or caregiver.

**Q: What can an Additional Contact do?**
An Additional Contact can accept a school invitation, submit requests, and
manage or update payout information for requests they initiated. They cannot
access another person's requests, modify school details, manage contacts or
permissions, sign/renew the MOU, or change roles. Contact-to-Principal changes
require Small Moves system-admin support.

**Q: How much can I request per submission?**
Each individual request is capped at $2,000. Your school also has an annual budget allocation — you can see your remaining balance at the top of the Dashboard. Unused funds do not roll over to the following school year.

**Q: How long does the review process take?**
Requests are typically reviewed within 48 business hours on the configured Small Moves business calendar. An administrator validates payout information, contacts the beneficiary, and records confirmation before executing payment outside the portal. If there are no issues or questions, the configured commitments default to digital payment within 48 business hours, check payment within five business days, and gift card payment within one month. Organization-observed holidays are excluded.

**Q: What happens after a request is approved?**
Once approved, the request enters the "Payout Details" phase. An action-needed banner will appear on your Dashboard. This is when you should meet with the family to let them know they will be receiving funds and confirm how they would like to receive the funds. You will need to enter the beneficiary's payout information — including who receives the funds (the beneficiary directly or a third-party payee), delivery method (Email or Text), and payment method from the currently enabled Portal Settings options. After submitting, the request moves to the “Beneficiary Confirmation” phase for an administrator to validate and record the manual confirmation.

**Q: Can I edit a request after submitting it?**
Yes, for a request you are authorized to manage. Principals can manage school
requests; Additional Contacts can manage only requests they initiated. Before
approval, permitted users can edit request details. During an allowed payout
stage, they can add a payee or update payout information. All changes are
timestamped in Activity.

**Q: Can I cancel a request?**
Yes, if you are authorized to manage it. A Principal can cancel an open school
request; an Additional Contact can cancel an open request they initiated.
Cancellation creates the distinct Canceled terminal state and cannot be
reopened. It is not an admin denial.

**Q: What is the MOU and why do I need to sign it?**
The MOU is an annual Principal agreement for a specific school, school year,
and version. Every Principal signs each year, including one joining mid-year.
Additional Contacts can view school compliance but cannot sign or renew the MOU
unless they also hold a Principal role.

**Q: What is two-factor authentication (2FA) and is it required?**
2FA adds a second layer of security through Firebase Authentication with Identity Platform and a TOTP authenticator app. The portal provides the screens for enrollment, sign-in challenge, recent reauthentication, removal, and re-enrollment while Firebase performs those operations. If you lose access to the authenticator, use the Login support path; Small Moves may use audited Firebase platform tools outside the portal. The portal does not create backup codes or an administrator bypass.

**Q: How do I update my school information or contact details?**
Principals can edit permitted school information and manage Additional Contacts
from the Dashboard. Additional Contacts see that information read-only. Every
user can update their own permitted profile and password information from
Profile.

**Right (1/3)**: Contact Small Moves card
- Email: pef@smallmoves.org
- Response time: within 48 business hours
- Default office hours: Mon–Fri, 9am–5pm America/Chicago, excluding organization-observed holidays

**Right (1/3)**: Annual agreement reminder callout

---

### `/profile` — School User Profile

**Sections** (each in a card, edit button top-right)

1. **Profile Information** — first name, last name, and phone (editable inline);
   verified Firebase email displayed read-only with a separate change action

2. **Change Email**
   - Recent Firebase reauthentication when required
   - New email entry and Firebase verification/action flow through
     `/auth/action`
   - Pending-verification, duplicate/invalid email, invalid/expired action,
     recovery of an unauthorized email change, success, cancel, and retry states
   - Refresh the verified Firebase identity before updating application profile
     projections; never treat an unverified typed email as authorization data

3. **Update Password**
   - Recent Firebase reauthentication, new password, confirmation, and Firebase
     validation/error handling
   - Success, weak/mismatched password, wrong credential, canceled
     reauthentication, expired session, provider failure, and safe retry states

4. **Two-Factor Authentication**
   - Status comes from Firebase enrolled factors
   - “Set up,” “Remove,” and “Reconfigure” use Firebase TOTP
     enrollment/unenrollment/re-enrollment and recent reauthentication
   - If Firebase signs the user out after removal, clear portal state and return
     to Login
   - No application-generated backup codes or portal administrator bypass

**Recent reauthentication dialog/state**
- Explain which security action requires confirmation
- Collect/reuse only Firebase-supported credentials/factor challenges
- Success resumes the intended action once; cancel/failure leaves account state
  unchanged and returns focus/context safely

**TOTP Setup/Reconfigure dialog**
- QR code plus manual key from the Firebase enrollment session
- 6-digit verification code and Firebase enrollment completion
- Loading, invalid-code, expired-session, reauthentication, success, cancel,
  provider-error, and safe restart states

**MOU dialog** (accessible from profile)
- Principal: view current MOU version, school year, and that person's immutable
  signature evidence; sign the current-year version when required
- Additional Contact: view-only school compliance status and no signature or
  renewal control

---

## 4. Admin Portal
Layout: `PortalLayout` — dark navy sidebar (`#1a2e44`), shared top header

**Sidebar navigation (Admin mode)**
| Label | Route |
|-------|-------|
| Dashboard | `/admin/dashboard` |
| Schools | `/admin/schools` |
| Requests | `/admin/requests` |
| Funders | `/admin/funders` |
| Contacts | `/admin/contacts` |
| Settings *(authorized settings admins only)* | `/admin/settings` |
| Help | `/help` |

**Top-right user dropdown (Admin mode)**
| Item | Action |
|------|--------|
| Profile | Navigate `/admin/profile` |
| Admin Management | Navigate `/admin/management` |
| Sign out | Navigate `/login` |

---

### `/admin/dashboard` — Admin Dashboard

**Header**: "Dashboard" + today's date

**Annual Summary cards** (3-up)
- Total annual spending (disbursed this school year)
- Total annual requests (all schools)
- Total completed requests (fully paid out)

**Process Health cards** (3-up, clickable — filter table below)
| Card | Predicate | Tone |
|------|-----------|------|
| Waiting on principal | `Waiting on Principal` AND > 7 days since update | Orange if count > 0 |
| Waiting on beneficiary | `Waiting on Beneficiary` AND > 7 days since update | Orange if count > 0 |
| Ready to pay *(expanded — see below)* | Status = `Ready to Pay` | Green if count > 0 |

> The third card shows the total amount queued to pay plus dynamically generated filter chips for active configured payout methods. Clicking the card filters to all `ready_to_pay` requests; clicking a method chip narrows to that stable method ID.

**Open Requests table**
- Filter pills: All, In Review, Waiting on Principal, Waiting on Beneficiary, Ready to Pay, Changes Requested, Response Requested (each shows count)
- Active widget filter chip (clearable)
- Search bar (by ID, beneficiary, school name)
- Sortable columns: ID, School, Requestor, Beneficiary, Amount, Date (hidden lg), Status, Time in status (hidden lg), Payment method (not sortable)
- Row click → `/admin/requests/:id`
- Per-row "⋯" actions dropdown:
  - View
  - Approve (if `In Review`)
  - Request changes (if `In Review`)
  - Deny (if `In Review`)
  - Mark as paid (if `Ready to Pay`)
  - *(No "Flag for investigation" or "Send back to requester" entry here — those are only reachable from the Admin Request Detail page.)*

**Action confirmation dialog** (for approve / deny / request changes / mark as paid)
- Icon, title, request summary
- Optional notes input (except for approve and pay)
- Cancel / confirm buttons

---

### `/admin/requests` — Admin Requests (Full Queue)

**Header**: "Requests" + "Unified queue — all schools"

**Search bar** (ID, beneficiary, school name)

**Active status filter banner** (if pre-filtered from dashboard widget click, clearable)

**Tab pills**: All · N, Open · N, Denied · N, Paid · N

**Sortable table**
- Columns: ID, School, Beneficiary, Requestor (hidden lg), Student (hidden md), Amount, Date (hidden lg), Time in status (hidden xl), Payment method, Status (with filter dropdown)
- Status column filter dropdown: multi-select checkboxes for each status value
- Row click → `/admin/requests/:id`

---

### `/admin/requests/:id` — Admin Request Detail

> **Update (2026-07-20):** "Flag for investigation" is gone from this page's buttons (the `investigate` action config still exists in code but nothing calls it anymore). In its place, `Ready to Pay` now offers **"Send back to requester"** — see the new dialog described below and § 3b of the Request State Flow doc.

**Header**
- Back → `/admin/requests`
- Request ID + status badge + submitted date
- If system status is `changes_requested` with task context `payout_change`: amber badge “Awaiting payout change from principal”
- If status is `Response Requested`: amber badge "Awaiting principal reply"
- **Context-sensitive action buttons**:

| Status | Primary buttons | Also available |
|--------|----------------|----------------|
| `In Review` | Deny, Approve | Request changes (dropdown) |
| `Waiting on Principal` | Send reminder | — |
| `Waiting on Beneficiary` | Record beneficiary confirmation, Edit payout details | Log contact attempt/note |
| `Ready to Pay` | **Send back to requester**, Mark as paid | — |
| `Changes Requested` (payout-change) | — | Deny, Edit payout details (dropdown) |
| `Response Requested` | Mark as paid | Send reminder, Deny (dropdown) |

- “⋯” dropdown for open requests: Edit request when task context permits, Edit payee & payout details, Request changes at `in_review`, Deny when permitted. Admins do not perform principal cancellation.

**Send back to requester dialog** (new — opens from the `Ready to Pay` primary button)
- Two-option picker: "Ask for a change" vs. "Ask a question" (see descriptions in the dialog)
- Free-text message to the principal (required to send)
- Helper text: "Ask for a change" → "The request will move to **Changes Requested** and the requester will be notified (they will only be able to edit payout details)"; "Ask a question" → "The request will move to **Response Requested** and the requester will be notified"
- On send: system status → `changes_requested` with task context `payout_change`, or `response_requested` with task context `question_response`; configured requester email is queued. Task context clears on completion, denial, or cancellation. There is no `processing` status.

**Status Stepper card**

**Request Details card** (3/5 lg)
- School (link → `/admin/schools/:schoolId`), Beneficiary, Requested Amount, Use of Funds, Funding Reason, Student, Payout Method, Payout To, Contact Method
- Additional context section (if present, with MOU affirmation note)

**Right sidebar (2/5 lg)**

*Prior Giving card*
- List of prior paid requests to same beneficiary
- Total this year
- Count of prior gifts

*Activity Log card*
- Chronological list (admin notes bolded)
- Internal note input + "Post" button (posts as "Admin note (Katie W.): …")

**Send Reminder dialog** (requester reminders)
- Pre-filled editable message from the approved template configuration
- To: principal audience
- Delivery result is recorded; beneficiary contact remains manual and outside the portal

**Edit Request dialog** — same fields as principal edit

**Edit Payout Details dialog** (full payout form)
- Who receives (beneficiary / third-party payee + payee name + relationship)
- Contact method (Email/Text) + contact info
- Payout method and fields come from the active Settings configuration
- At `waiting_on_beneficiary`, editing invalidates any recorded confirmation and requires the admin to validate/contact/confirm again

**Action Confirmation dialogs** — same pattern as Admin Dashboard confirmations

---

### `/admin/schools` — Schools List

**Header**: "Schools" + "{active} active · {inactive} inactive"
**Search bar** (school name, principal name, funder)
**Add School** button → `/admin/schools/new`

**Status filter pills**: All, Active, Invited, Inactive

**Sortable table**
- Columns: School, Principal, Funder, Budget remaining, Status badge, MOU (signed date or "Not signed")
- Per-row "⋯" dropdown: View/Edit, Deactivate (if Active)
- Row click → `/admin/schools/:id`

---

### `/admin/schools/new` — Add School

**Sections**

1. **School Information** (required): name, phone, address, city, funder (select from existing or "+ Add new funder"), state, school-year fund amount, ZIP
2. **Principal Information** (optional): name, email, phone
3. **Additional Contacts** (optional, up to 2): name, email, role

**Add new funder inline dialog** — name (required), type, contact name, email, phone, notes

**Save & continue** → creates school with status `Inactive`, navigates `/admin/schools`
**Cancel** → `/admin/schools`

---

### `/admin/schools/:id` — School Detail

**Header**
- Back → `/admin/schools`
- School name + MOU/invite status subtitle
- Funder, address, phone metadata
- "Edit school details" button
- Status-conditional invite buttons:
  - `Inactive` with a principal name already on file → "Invite principal" (sends the invite directly)
  - `Inactive` with **no** principal name on file yet → "Add principal" (opens the Edit Principal dialog first, instead of inviting)
  - `Invited` → "Resend invitation"
  - `Active` → disabled "Principal active"
- "⋯" dropdown: Deactivate school (if Active), Delete school *(currently a stub — the menu item renders but has no click handler wired up)*

**Re-invite alert** (shown after principal name/email is changed)
- Warns that a new invitation is needed
- Dismiss / Send invitation buttons

**Main layout (2-column)**

*Left column (2/3)*:

*School-Year Fund card*
- Available, reserved, paid, and annual budget values reconciled from ledger transactions
- Progress bar and transaction history
- Edit pencil → **Budget Adjustment dialog**
  - Signed adjustment amount and required reason
  - Creates an immutable transaction; never replaces history

*Principal card* + *Additional Contacts card* (side by side)
- Each principal: name, email, phone, invite/active status, current school-year MOU signature status
- Edit pencil → **Edit principal contact dialog** (name, email, phone; changing name/email resets school to `Inactive`)
- Additional Contacts: list with edit pencil → **Edit additional contacts dialog** (up to 2, with trash/add)

*Recent Requests table*
- All requests for this school
- Columns: ID, Beneficiary, Amount, Status
- Row click → `/admin/requests/:id`

*Right column (1/3)*:

*Activity Log card*
- Chronological list of school-level events
- Internal note input + "Post" button

---

### `/admin/funders` — Funders

**Header**: "Funders" + total count
**Search bar** (name, type, contact name)
**Add Funder** button → **Add/Edit Funder dialog**

**Table** (sortable by name, type, contact)
- Columns: Funder (icon + name), Type (badge), Primary contact (name + email), Associated schools, Committed budget, edit pencil
- Associated schools cell: school count + up to 3 clickable chips (→ `/admin/schools/:id`); if more than 3, a "Show more" link opens a searchable modal listing every associated school

**Add/Edit Funder dialog** (same dialog, title changes) — **update: funders are now editable, not just addable**
- Name (required), type (Foundation/Government/Corporate/Nonprofit/Individual/Other)
- Contact name (optional), email (optional), phone (optional)
- Notes (optional textarea)
- Editing and renaming a funder cascades the new name to every school referencing the old name (`updateFunder()`)

---

### `/admin/contacts` — Contacts Directory

> **Approved scope (DEC-013):** this directory contains principals and additional contacts only. Beneficiaries, students, and third-party payees remain request-scoped confidential data and are not indexed into the general directory.

**Header**: "Contacts" + total contact count

**Type filter pills**: All, Principals, Additional Contacts *(Beneficiaries / Students / Payees filters no longer exist)*

**Search** (name, email, phone, school)

**Sortable table** (by name)
- Columns: Name + role, Role badge (Principal / Additional Contact), Contact (email + phone), Associated school(s), edit pencil (appears on row hover)

**Edit contact dialog** (new) — Name, school job title, Email, and Phone as
permitted. The job-title field is display/profile information, not an
authorization role. Membership-role changes, including Contact-to-Principal,
require a separately authorized system-admin action and immutable audit event.
Banner: "Changes will cascade to every place this contact is referenced across
the portal." Saves via `updateContact()`.

*Data derived from:*
- Schools → Principals + Additional Contacts only

---

### `/admin/settings` — Portal Settings

Requires an authorized admin settings capability. Every change records actor,
timestamp, before/after values, and configuration version.

1. **Request status labels** — immutable system name plus editable admin and
   principal display labels. Settings cannot change transitions or terminal
   behavior.
2. **Payout methods** — stable method ID, admin/principal labels, active flag,
   order, and approved field schema. Used methods may be disabled but not
   deleted or repurposed.
3. **Email templates** — transition, audience/recipient rule, subject, body,
   allowed variables, enabled flag, version history, preview, and test-send.
4. **Annual school budget defaults** — one global default per school year.
   Changing a default affects future allocations only; school-specific changes
   use Budget Adjustment transactions.
5. **Business calendar** — timezone, weekly hours, organization-observed
   holidays, and service-commitment wording. Default: Monday–Friday, 9:00
   a.m.–5:00 p.m. America/Chicago; commitments use business time.

Publishing settings validates required fields and unsafe content. Runtime code
uses the last valid published version and fails visibly if required
configuration is unavailable.

---

### `/admin/management` — Admin Management

**Header** + "Add admin" button

**Admin users table**
- Columns: Person, Email, Role, Notification Preferences, Delete (trash icon)

**Add Admin User dialog**
- Name (required), email (required), role (Ops/Admin/Finance/Support), notification preferences (All/Ready to Pay only/None)

---

### `/admin/profile` — Admin Profile
(Same layout as Principal Profile)

**Sections**
1. **Profile Information and Account Security** — same Firebase-backed profile, verified-email change, password update, recent-reauthentication, session, and recovery behavior as the School User Profile; role label is read-only
2. **Update Password** — covered by the shared Account Security behavior above
3. **Two-Factor Authentication** — Firebase enrolled-factor status and TOTP setup/removal/re-enrollment; no custom admin bypass

---

## 5. Shared Pages

### `/help` — Help
Accessible from both principal and admin sidebars (same component, same content).

---

## 6. Dialogs & Overlays Summary

| Dialog | Accessible from |
|--------|----------------|
| Welcome modal | Auto-shown after onboarding completes |
| MOU view/sign | Dashboard, New Request |
| Edit contacts | Dashboard |
| Request submitted success | Dashboard (via router state) |
| Edit request | Request Detail (principal), Admin Request Detail |
| Reset to review confirm | Request Detail (when editing post-approval) |
| Cancel request confirm | Request Detail (principal) |
| Enter payout success | Enter Payout page |
| Firebase TOTP setup/reconfiguration | Onboarding and Profile (principal + admin) |
| Send requester reminder | Admin Request Detail |
| Record beneficiary confirmation | Admin Request Detail at `waiting_on_beneficiary` |
| Edit payout details | Admin Request Detail, Request Detail (principal), Requests Table — available at any open status now, not just Waiting on Beneficiary |
| Action confirmation (approve/deny/pay/changes) | Admin Dashboard + Admin Request Detail |
| **Send back to requester** *(new)* | Admin Request Detail, at `Ready to Pay` |
| Add funder / **Edit funder** *(now the same dialog)* | Admin Funders, Admin Add School |
| **Edit contact** *(new)* | Admin Contacts |
| Edit school details | Admin School Detail |
| Budget Adjustment | Admin School Detail |
| Edit principal contact | Admin School Detail |
| Edit additional contacts | Admin School Detail |
| Add admin user | Admin Management |
| **Associated schools (overflow)** *(new)* | Admin Funders, when a funder has more than 3 schools |

---

## 7. Production Data and Configuration Summary

Prototype type names are not an approved production model. The minimum durable
concepts are:

### Request
- stable request ID, school ID, submitter UID, beneficiary/request fields
- immutable status system name from the state-flow vocabulary
- active task context (`request_change`, `payout_change`, or
  `question_response`) only while actionable
- selected payout-method stable ID plus submission-time label snapshot and
  approved method fields
- immutable transition/activity events; display labels are not persisted as
  state identity

### Identity and membership
- one Firebase UID maps to one person identity
- person/profile, school membership, one-or-more school roles, organization-admin
  capabilities, onboarding state, and permissions are separate records
- invite acceptance binds a verified UID to the pending school membership
- the same person may hold roles across schools or Principal and Additional
  Contact roles in one school; authorization uses the active membership
- request submitter ID is immutable and bounds Additional Contact access to that
  person's requests
- only an authorized system administrator can assign/elevate roles; Principals
  manage their school's Additional Contact list without granting higher roles

### Principal MOU agreement
- principal UID, school ID, school year, MOU version, signed timestamp, and
  immutable signature evidence
- school compliance is derived from the current principals’ current-year
  records

### Budget
- yearly global default configuration
- school-year ledger transactions: annual allocation, Budget Adjustment,
  request reservation/release, and request spend
- immutable signed amounts, reason/reference, actor, and timestamp

### Portal configuration
- request-status admin/principal display labels keyed by immutable system name
- payout methods with stable IDs and versioned field schema
- versioned transition email templates and recipient rules
- versioned business calendar

### Contacts and sensitive data
- general Contacts directory indexes principals and additional contacts only
- beneficiary, student, and payee records remain request-scoped
- the portal stores no password, TOTP secret, backup code, raw bank/card
  credential, or payment-provider credential

---

## 8. Deferred, Open, and Implementation Work

- **DEC-002 resolved:** implement the person, school-membership, multi-role,
  Additional Contact own-request scope, Principal authority, and audited
  system-admin role-assignment model.
- **DEC-012:** export is deferred from the initial release; do not add export UI
  or endpoints now.
- **DEC-018:** finalize production project identifiers, locality, promotion, and
  emergency deployment authority.
- **DEC-021 resolved:** application records follow the lifecycle in
  [Infrastructure §8.4](infrastructure-and-operations.md). Core activity,
  budget, MOU, settings, payout-action, email-template, and request-transition
  audit history is retained for seven years after the related school year.
  Request-scoped personal details are redacted earlier under the approved
  three-year terminal-state rule and hold procedure.
