# Figma Evidence Package

Inspection date: 2026-07-28 (America/Chicago)

Figma file:
[PEF Portal — Screens & States Export](https://www.figma.com/design/gVDz0NQWFaHNTRzbYKfkNu/PEF-Portal-%E2%80%94-Screens---States-Export?node-id=0-1)

This document is a read-only implementation evidence record. It distinguishes
what is explicitly present in Figma from product behavior defined in the
requirements. It does not promote mock data, stale wireframes, or visual
composition into backend rules.

## Access report

| Item | Result |
|---|---|
| File successfully accessed | Yes |
| File key | `gVDz0NQWFaHNTRzbYKfkNu` |
| Linked starting node | `0:1` |
| Editor type | Figma design |
| Current design page | `0:1` — `-> Screens` |
| User-flow page | `90:2` — `-> User Flows` |
| Legacy design pages | `100:853` — `-> 7/9/26`; `100:1634` — `-> 7/14/26`; `100:3170` — `-> 7/16/26` |
| Current screen frames inventoried | 50 |
| Explicit prototype reactions on current screens | 0 |
| Local variables/styles on current screens | None |
| Current reusable components/component sets | None; the current screen page is flattened to frames, text, and vectors |
| Responsive variants | None found |
| Inspection limitations | Figma exposes static screens and flow diagrams, but no wired prototype destinations, annotations for keyboard/focus behavior, or authoritative design tokens |

## Evidence labels and authority

- **Explicit Figma evidence** means exact node names, visible text, dimensions,
  layout properties, fills, typography, or reactions returned by Figma.
- **Design-derived inference** means a likely relationship visible in the
  composition but not backed by a prototype connection or annotation.
- **Unknown** means Figma does not provide enough evidence.

For conflicts, use this authority order:

1. A resolved entry in the
   [decision log](../planning/decision-log.md) controls.
2. The [request state flow](../requirements/request-state-flow.md) controls
   lifecycle semantics.
3. The [portal sitemap](../requirements/portal-sitemap.md) controls route,
   screen, and control scope.
4. The
   [email and help-center content](../content/email-templates-and-help-center.md)
   controls approved user-facing content after operational review.
5. Figma controls the approved visual target only after the discrepancy is
   reconciled in the
   [Figma reconciliation matrix](../planning/figma-reconciliation.md).

## File inventory

### Pages

| Order | Page | Node ID | Purpose | Inspection result |
|---:|---|---|---|---|
| 1 | `CURRENT DESIGNS` | `100:5032` | Divider/label page | Empty |
| 2 | `-> Screens` | `0:1` | Current screen and state export | Fully inventoried |
| 3 | `-> User Flows` | `90:2` | Static principal and admin flow diagrams | Inspected for structure and critical copy |
| 4 | `----` | `100:5033` | Divider | Empty |
| 5 | `WIREFRAMES` | `100:852` | Divider/label page | Empty |
| 6 | `-> 7/9/26` | `100:853` | Legacy principal/admin wireframes | Inventoried; not authoritative |
| 7 | `-> 7/14/26` | `100:1634` | Legacy principal/admin wireframes | Inventoried; not authoritative |
| 8 | `-> 7/16/26` | `100:3170` | Legacy principal/admin wireframes | Inventoried; not authoritative |

### Current design sections

| Section | Node ID | Current frames |
|---|---|---:|
| Auth & Onboarding | `88:3` | 5 |
| Principal Portal — Dashboard | `88:4` | 5 |
| Principal Portal — Requests | `88:5` | 9 |
| Principal Portal — Account | `88:6` | 4 |
| Admin Portal — Dashboard | `88:7` | 1 |
| Admin Portal — Requests | `88:8` | 13 |
| Admin Portal — Schools | `88:9` | 7 |
| Admin Portal — Funders | `88:10` | 2 |
| Admin Portal — Contacts & Admin Users | `88:11` | 3 |
| Admin Portal — Account | `88:12` | 1 |

## Current screen and state inventory

All current frames are 2,041 × 1,074 unless another height is shown.

### Authentication and onboarding

| Screen/state | Node ID | Dimensions | Explicit Figma evidence |
|---|---|---|---|
| Create account — school and personal information | `116:2` | 2,041 × 1,074 | Step 1; editable school, personal, password, and optional-contact fields |
| Set up 2FA | `121:2` | 2,041 × 1,074 | Step 2; Google Authenticator instructions, QR mock, six-digit code, `Verify` |
| 2FA enabled | `122:2` | 2,041 × 1,074 | Success copy, backup codes, `Copy`, `Continue` |
| Sign annual agreement | `120:2` | 2,041 × 1,074 | Step 3; MOU text, consent checkbox, `Sign the agreement` |
| Existing school — school information locked | `183:2` | 2,041 × 1,095 | Step 1; pre-filled school fields marked “Managed by Small Moves” |

The current `-> Screens` page has no login frame. Three `Auth — Login` frames
exist only inside the static user-flow page (`179:2`, `179:2486`, and
`179:3610`). They show `Forgot your password?`, but the file contains no
prototype reaction or destination for it.

### Principal dashboard

| Screen/state | Node ID | Purpose |
|---|---|---|
| Welcome — first login | `123:2` | First-login modal over the dashboard |
| Default dashboard | `128:2` | School, contacts, MOU, budget, action-needed banner, open requests |
| Request submitted confirmation | `127:2` | Success modal after request submission |
| Annual agreement modal | `126:2` | MOU view modal |
| Additional contacts modal | `125:2` | Contact editing modal |

### Principal requests

| Screen/state | Node ID | Purpose |
|---|---|---|
| Requests list | `137:2` | Open/Paid/Denied tabs, search, status-specific row actions |
| New request | `135:2` | Beneficiary, student, amount, reason, category, context, MOU compliance |
| Detail — Waiting on Principal | `138:2` | `Complete Request` action and five-step status presentation |
| Detail — Changes Requested | `132:2` | `Complete Changes` action and admin note |
| Detail — Paid | `133:2` | Closed request and activity history |
| Edit request | `131:2` | Request edit modal |
| Cancel request confirmation | `134:2` | Destructive confirmation |
| Enter payout details | `130:2` | Recipient, contact, and payout-method form |
| Payout submitted confirmation | `136:2` | Success modal and Waiting on Beneficiary copy |

### Principal account

| Screen/state | Node ID | Purpose |
|---|---|---|
| Profile | `143:2` | Profile, password, and 2FA cards |
| Profile — set up 2FA | `141:2` | 2FA setup modal |
| Profile — 2FA enabled | `142:2` | Backup-code success modal |
| Help | `144:2` | Help accordions, FAQ, contact card, annual-agreement reminder |

### Admin dashboard

| Screen/state | Node ID | Purpose |
|---|---|---|
| Default dashboard | `140:2` | Summary cards, process-health cards, ready-to-pay breakdown, filters, queue |

### Admin requests

| Screen/state | Node ID | Purpose |
|---|---|---|
| Full queue | `150:2` | Search, tabs, sortable/filterable request table |
| Detail — In Review | `146:2` | `Reject` and `Approve` |
| Detail — Waiting on Principal | `147:2` | `Send reminder` |
| Detail — Waiting on Beneficiary | `151:2` | Edit payout and resend actions |
| Detail — Ready to Pay | `149:2` | `Send back to principal` and `Mark as paid` |
| Detail — Change Requested | `148:2` | Singular status copy, `Request changes`, and `Mark as paid` |
| Detail — Paid | `153:2` | Closed request and activity log |
| Detail — Denied | `152:2` | Closed denied request |
| Edit request | `158:2` | Request edit modal |
| Edit payout details | `157:2` | Payout edit modal |
| Remind principal | `161:2` | Reminder modal |
| Approve request | `155:2` | Approval confirmation modal |
| Mark as paid | `159:2` | Payment confirmation modal |

### Admin schools

| Screen/state | Node ID | Purpose |
|---|---|---|
| Schools list | `170:2` | Search, status filters, funder, balance, status, MOU |
| Add a school | `169:2` | School, funder, budget, principal, and optional contacts |
| School profile | `165:2` | Fund, principal, contacts, requests, activity |
| Manage school-year fund | `171:2` | Set baseline or add funds |
| Edit principal contact | `173:2` | Principal contact modal |
| Additional contacts | `167:2` | Additional-contact modal |
| Edit school details | `174:2` | School and funder modal |

### Admin funders, contacts, management, and account

| Screen/state | Node ID | Purpose |
|---|---|---|
| Funders list | `156:2` | Funder, type, contact, associated schools, committed budget |
| Add funder | `160:2` | Funder and contact modal |
| Contacts list | `172:2` | Principal/additional-contact directory |
| Admin management | `168:2` | Admin user table |
| Add admin user | `166:2` | Admin user modal |
| Admin profile | `162:2` | Profile, password, and 2FA cards |

## Exact implementation evidence

### Onboarding

- **Explicit Figma evidence — `116:2`:** `School name`, `Number of
  students`, `Street address`, `School phone`, `City`, `State`, `Zip code`,
  `Your full name`, `Title`, `Your email`, `Your phone`, `Password`, `Confirm
  password`, and `Additional contacts (optional)`.
- **Explicit Figma evidence — `183:2`:** `Managed by Small Moves` and `Your
  school is already set up. These details are pre-filled and can't be edited
  here — contact Small Moves if anything looks incorrect.`
- **Explicit Figma evidence — `121:2`:** setup is described specifically for
  Google Authenticator and the QR code is labeled `mock — accept any 6 digits`.
- **Explicit Figma evidence — `122:2`:** three backup codes are displayed and
  the page says `We can also reset this for you anytime.`
- **Explicit Figma evidence — `120:2`:** the agreement is `tied to your school`
  and `renewed each school year`; the MOU body says the principal will be
  notified to review and re-sign.
- **Unknown:** invite binding, authentication strength, 2FA secret storage,
  recovery, backup-code semantics, session behavior, and signature evidence.

### Principal request workflow

- **Explicit Figma evidence — `135:2`:** the new-request form warns, `Please
  hold off on notifying the beneficiary until the request is approved — you'll
  enter their contact details at that time.`
- **Explicit Figma evidence — `135:2`:** `Requested amount ($) *`,
  `$12,500 remaining this year · max $2,000 per request.`, `Reason for request
  *`, `What will the funds be used for? *`, `Additional context (optional)`,
  `Submit for review`, and `Cancel`.
- **Explicit Figma evidence — `137:2`:** tabs are `Open · 5`, `Paid · 1`, and
  `Denied · 0`; visible row actions include `Complete Request` and `Respond to
  message`.
- **Explicit Figma evidence — `134:2`:** `This will cancel request SY2025D002
  for C. Williams. This action cannot be undone.` Actions are `Keep request` and
  `Yes, cancel it`.
- **Explicit Figma evidence — `130:2`:** `Beneficiary directly`,
  `Third-party payee (landlord, counselor, trusted adult)`, `Email`, `Text`,
  `Zelle`, `PayPal`, `Check`, `Gift card`, and `Other`.
- **Explicit Figma evidence — `136:2`:** success copy says the recipient was
  sent the request to review and accept payment and the status is now `Waiting
  on Beneficiary`.

### Admin workflow

- **Explicit Figma evidence — `140:2`:** process-health cards cover `Waiting on
  principal`, `Waiting on beneficiary`, and `Ready to pay`; the visible filter
  row also contains `Processing · 1`.
- **Explicit Figma evidence — `150:2`:** the queue includes `Time in status`,
  `Payment method`, and `Status`.
- **Explicit Figma evidence — `146:2`:** the In Review detail uses `Reject`,
  while other written sources use both “reject” and “deny.”
- **Explicit Figma evidence — `149:2`:** Ready to Pay offers `Send back to
  principal` and `Mark as paid`.
- **Explicit Figma evidence — `148:2`:** the status is singular `Change
  Requested`; the same screen exposes `Request changes` and `Mark as paid`.
- **Explicit Figma evidence — `157:2`:** changing payout details while Waiting
  on Beneficiary says it will resend confirmation to the beneficiary.

### School, funder, contact, and admin management

- **Explicit Figma evidence — `169:2`:** add-school fields include school
  information, an existing-funder select, school-year fund amount, optional
  principal information, and up to two additional contacts.
- **Explicit Figma evidence — `171:2`:** the fund modal supports `Set baseline`
  and `Add funds`.
- **Explicit Figma evidence — `156:2`:** the funder table includes type,
  primary contact, associated schools, and committed budget.
- **Explicit Figma evidence — `160:2`:** the add-funder modal visibly includes
  name, primary contact name, email, phone, and notes; a funder-type field is not
  visible in this frame.
- **Explicit Figma evidence — `172:2`:** filters are `All`, `Principals`, and
  `Additional Contacts`; no beneficiary, student, or payee filter is present.
- **Explicit Figma evidence — `168:2` and `166:2`:** Admin Management has an
  admin-user table and an Add Admin User modal.

## Status presentation

| Display label | Example node IDs | Evidence |
|---|---|---|
| In Review | `137:2`, `146:2` | Current principal/admin designs |
| Waiting on Principal | `138:2`, `147:2` | Current principal/admin details |
| Waiting on Beneficiary | `137:2`, `151:2` | Current list/detail |
| Ready to Pay | `137:2`, `149:2` | Current list/detail |
| Changes Requested | `128:2`, `132:2` | Current principal designs use plural |
| Change Requested | `150:2`, `148:2` | Current admin designs use singular |
| Response Requested | `128:2`, `137:2` | Current principal dashboard/list only |
| Paid | `133:2`, `153:2` | Closed principal/admin details |
| Denied | `150:2`, `152:2` | Admin queue/detail and principal Denied tab |
| Processing | `140:2` | Stale-looking admin dashboard filter only |
| Canceled | None | Cancellation confirmation exists, but no distinct terminal screen or tab |

The five-step request presentation visible across details is:

1. `Submit Request` — `Principal submits`
2. `Admin Review` — `Small Moves reviews`
3. `Payout Details` — `Principal enters payout info`
4. `Beneficiary Confirms` — `Recipient confirms payment`
5. `Payment` — `Funds disbursed`

## Design measurements

These are observed values, not named Figma tokens.

### Shell and layout

| Measurement | Principal example | Admin example | Exact value |
|---|---|---|---:|
| Screen frame | `128:2` | `140:2` | 2,041 × 1,074 |
| Sidebar | `128:6` | `140:6` | 208 px |
| Header | `128:51` | `140:83` | 56 px |
| Main-content padding | `128:62` | `140:94` | 24 px on all sides |
| Header horizontal padding | `128:51` | `140:83` | 16 px |

### Typography

Observed font families/styles:

- Inter Regular, Medium, Semi Bold, Bold, and Medium Italic
- Menlo Regular and Semi Bold for code-like values

Observed type sizes are predominantly 14, 12, and 10 px, with 16, 18, 20, 24,
26, and 30 px used for larger text. Figma contains no local text styles, so
these values are measurements rather than a published type scale.

### Color and shape

Frequently observed fills include:

| Value | Likely visible use | Evidence classification |
|---|---|---|
| `#0FA3B1` | Primary teal actions and accents | Design-derived inference |
| `#1A2E44` | Admin sidebar | Explicit from visible screen/layout |
| `#F8FAFC`, `#F1F5F9`, `#FFFFFF` | Page and surface backgrounds | Design-derived inference |
| `#1D293D`, `#314158`, `#45556C`, `#62748E`, `#90A1B9` | Text and neutral UI | Design-derived inference |
| `#5A8A20`, `#EEF6E0` | Success/ready presentation | Design-derived inference |
| `#FFF7ED`, `#CA3500` | Warning/attention presentation | Design-derived inference |

Observed corner radii are primarily 8 and 12 px, with 6 px also common.
Observed Auto Layout gaps include 4, 8, 10, 12, 16, 24, and 32 px. No named
paint, effect, grid, or spacing tokens are present.

## Prototype and navigation evidence

- **Explicit Figma evidence:** the current `-> Screens` page contains zero
  prototype reactions.
- **Explicit Figma evidence:** `-> User Flows` contains static Principal
  (`91:2`) and Admin (`91:2443`) sections.
- **Design-derived inference:** arrows and repeated screen placements in the
  user-flow diagrams suggest intended sequences.
- **Unknown:** destination node IDs, overlay placement rules, history/back
  behavior, transitions, and dead-end handling.

Implementation must use the route inventory in the portal sitemap. It must not
claim a route is prototype-validated merely because the screen appears in a
static Figma flow.

## Responsive and accessibility evidence

- All current screens use the same desktop canvas width. No mobile, tablet, or
  alternate-width current frames were found.
- Legacy frames are 980 × 720 working canvases, not documented responsive
  variants of the 2,041 px current screens.
- Figma provides no explicit breakpoint, reflow, hidden-column, or navigation
  collapse annotations.
- Visible controls use icons plus text in many places and statuses use text
  labels in addition to color.
- No explicit keyboard order, focus ring, accessible name, error association,
  contrast annotation, target-size requirement, modal focus behavior, or
  reduced-motion alternative was found.
- No claim of WCAG conformance can be made from this file.

## Legacy and stale-design evidence

- The July 9 page (`100:853`) contains dated principal/admin wireframes and was
  inventoried as provenance only.
- The July 14 page (`100:1634`) contains 980 × 720 principal and admin
  wireframes.
- The July 16 page (`100:3170`) contains a `Processing` screen
  (`100:4674`) and `Message Principal` screen (`100:4743`).
- The current admin dashboard (`140:2`) still carries a `Processing` filter even
  though the current written state flow removes Processing and current
  request-detail designs use send-back states.
- Treat the dated wireframe pages as provenance only. Do not implement from
  them unless a reconciliation decision explicitly revives a behavior.

## Known gaps requiring reconciliation

The actionable conflict list is maintained in
[Figma reconciliation](../planning/figma-reconciliation.md). The highest-risk
items are:

- stale Processing UI and status-name drift;
- Denied versus Canceled terminal behavior;
- existing-school MOU carry-over versus re-signing;
- inconsistent review-time copy;
- contradictory budget numbers in current frames;
- missing current designs for login/recovery, send-back variants, exports,
  responsive layouts, validation/error/loading states, and several dialogs;
- no Figma variables, styles, current components, or prototype reactions.

## Coverage checklist

- [x] Every Figma page inventoried
- [x] Every current section inventoried
- [x] Every current top-level screen/state frame inventoried
- [x] Principal and admin current screens inspected
- [x] Authentication/onboarding current screens inspected
- [x] Current modal/state frames inventoried
- [x] Current status and critical-copy evidence sampled
- [x] Current prototype reactions checked
- [x] Current local variables and styles checked
- [x] Current component/component-set presence checked
- [x] Responsive-frame presence checked
- [x] Legacy page provenance checked
- [ ] Complete validation, error, loading, empty, disabled, and permission-state
      coverage — these states are not fully present in the file
- [ ] Accessibility implementation requirements — not annotated in Figma
- [ ] Production interaction behavior — not wired in Figma
