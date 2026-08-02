# Requirements Index

## Current source documents

### Implementation requirements

[PEF Portal — Implementation Requirements](implementation-requirements.md) is
the standalone initial-release implementation contract. It consolidates the
resolved product, workflow, data, budget, notification, design, accessibility,
platform, acceptance, test, sequencing, and Definition of Done requirements.

Use it for implementation scope and release verification. Follow its source
authority rules when a lower-level source is more specific, and record any
approved deviation in the decision log or an ADR before implementation.

### Portal sitemap

[Portal sitemap](portal-sitemap.md) inventories principal and admin routes,
screen content, controls, dialogs, visible data, and prototype implementation
notes.

Use it for:

- page and route scope;
- role-specific navigation and actions;
- forms, tables, dialogs, and visible validation;
- help-center placement and portal copy;
- the draft domain-field inventory.

Do not treat prototype-specific store names, component filenames, mock data, or
known implementation quirks as a required production architecture.

### Request state flow

[Request state flow](request-state-flow.md) defines the intended request
lifecycle, school onboarding lifecycle, permissions, budget calculations, and
notification triggers.

Use it for:

- allowed state transitions and actors;
- terminal versus open states;
- principal/admin/additional-contact permissions;
- school invitation and activation states;
- budget allocation, adjustment, reservation, release, and spend behavior;
- immutable status names, role-specific display-label configuration, and task context;
- principal/year MOU and manual admin payout behavior;
- required activity events and notification triggers.

The document explicitly records cases where intended states differ from the
prototype. Those differences must be resolved in the production domain model,
not copied accidentally from prototype behavior.

### Infrastructure and operations

[Infrastructure and operations requirements](infrastructure-and-operations.md)
defines the approved GCP/Firebase platform constraint and the proposed
implementation baseline for environments, deployment, Firestore migrations,
logging, monitoring, recovery, and platform security.

Use it for:

- Firebase Hosting, Firestore, Authentication, and trusted-compute boundaries;
- development, staging, and production isolation;
- GitHub Actions deployment with short-lived GCP credentials;
- Firestore schema evolution, migration jobs, rules, indexes, and recovery;
- structured logging, operational alerts, Cloud Audit Logs, and domain audit;
- PITR, scheduled backups, recovery objectives, restore validation, and drills;
- log retention, business-hours incident ownership, and service objectives;
- application retention, redaction, cleanup, hold, and account-deletion rules;
- App Check, least-privilege IAM, secrets, CI, and runtime security controls.

Firebase-backed identity recovery, the confidential-data security baseline,
manual admin payout, Additional Contact/Principal membership and permissions,
deferred export scope, continuity, observability, and application data lifecycle
are now approved. Production identifiers, locality, promotion, and emergency
deployment authority remain in DEC-018.

### Email and help-center content

[Email templates and help-center content](../content/email-templates-and-help-center.md)
contains principal/admin notification copy, portal links, expected response
times, and public help content.

Use it as the initial version for the admin-configured transition templates and
help content. Provider selection remains an implementation ADR; transition,
recipient, versioning, delivery-audit, and business-time behavior is approved.

### Figma evidence

[Figma evidence](../design/figma-evidence.md) records exact page, section,
screen, state, and node IDs from the design file, along with implementation
measurements and explicit coverage gaps.

Use it for:

- current screen/state inventory;
- exact visible labels and key copy;
- desktop shell measurements and observed visual values;
- identifying missing, stale, or contradictory design states.

Do not use Figma mock data to define financial rules. Do not claim a navigation
or interaction is prototype-validated: the current screen page has no prototype
reactions.

### Implementation traceability

[Implementation traceability](implementation-traceability.md) maps routes and
cross-cutting features to Figma nodes, written sources, open decisions, and a
build posture. Use it to construct tickets only after confirming every decision
dependency.

## Cross-document authority

When documents overlap:

1. A resolved decision-log entry controls and must be propagated to every
   affected source.
2. The implementation requirements document is the initial-release
   implementation contract and cross-source acceptance baseline.
3. The state-flow document controls lifecycle and transition semantics.
4. The sitemap controls route, screen, and control scope.
5. The infrastructure document controls approved platform, deployment,
   migration, observability, recovery, and platform-security requirements.
6. The content document controls approved user-facing email and help copy.
7. Figma controls the visual target after the discrepancy is reconciled in the
   [Figma reconciliation matrix](../planning/figma-reconciliation.md).

Figma does not define persistence, permissions, notifications, audit,
integration, or backend behavior unless the written requirements also approve
that behavior.

## Current evidence gaps

The repository now includes a standalone implementation requirements
specification, Figma evidence package, implementation traceability matrix, and
GCP/Firebase infrastructure baseline. It still does not include:

- executable authorization tests and Security Rules for the approved
  person/school-membership and own-request access model;
- an API contract, approved production data model, or integration inventory;
- final project/region identifiers and production promotion/emergency authority;
- configured backup, restore, monitoring, alert, retention-cleanup, hold, and
  account-deletion artifacts that implement the approved operating policies;
- updated Figma responsive/accessibility/settings/auth/manual-payout/MOU/budget
  states and reusable design tokens/components;
- executable test, deployment, migration, monitoring, or recovery artifacts and
  their operational runbooks.

See the [pre-build readiness review](../planning/pre-build-readiness.md) for
recommended gates.
