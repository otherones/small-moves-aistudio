# Small Moves PEF Portal — Product Preparation

This repository contains the product requirements, design evidence, content
inputs, and infrastructure baseline for the Small Moves Principal Emergency
Fund (PEF) portal. It is a preparation repository; it does not yet contain an
application.

## Start here

1. Use the
   [implementation requirements specification](docs/requirements/implementation-requirements.md)
   as the initial-release implementation contract.
2. Read the [pre-build readiness review](docs/planning/pre-build-readiness.md).
3. Review the read-only
   [Figma evidence package](docs/design/figma-evidence.md) and
   [reconciliation matrix](docs/planning/figma-reconciliation.md).
4. Review the
   [infrastructure and operations requirements](docs/requirements/infrastructure-and-operations.md).
5. Resolve or explicitly defer the items in the
   [decision log](docs/planning/decision-log.md).
6. Use the [requirements index](docs/requirements/README.md) and
   [implementation traceability matrix](docs/requirements/implementation-traceability.md)
   to prepare implementation tickets.

## Repository map

| Path | Purpose | Authority |
|---|---|---|
| `docs/requirements/implementation-requirements.md` | Standalone initial-release requirements, acceptance criteria, verification plan, and Definition of Done | Implementation contract |
| `docs/requirements/portal-sitemap.md` | Routes, screens, controls, roles, and visible data | Primary UI scope input |
| `docs/requirements/request-state-flow.md` | Request and school state machines, transitions, permissions, and lifecycle rules | Primary workflow input |
| `docs/requirements/infrastructure-and-operations.md` | GCP/Firebase platform, deployment, migration, observability, recovery, and security requirements | Primary platform and operations input |
| `docs/content/email-templates-and-help-center.md` | Notification copy and principal help content | Primary content input |
| `docs/design/figma-evidence.md` | Exact Figma pages, screens, node IDs, measurements, and coverage limits | Visual evidence; not domain authority |
| `docs/planning/figma-reconciliation.md` | Conflicts among Figma, requirements, and prototype observations | Required reconciliation queue |
| `docs/requirements/implementation-traceability.md` | Route/feature scope, evidence, decisions, build posture, and acceptance anchors | Implementation planning bridge |
| `docs/planning/pre-build-readiness.md` | Coverage review, risks, blockers, and recommended build gates | Readiness assessment |
| `docs/planning/decision-log.md` | Resolved and unresolved product and technical decisions | Must be resolved or deliberately deferred |

## Working rules

- `otherones/small-moves-aistudio` is a separate Google AI Studio implementation experiment. This copied documentation is a working baseline; `otherones/small-moves` remains the canonical planning repository and the future Codex implementation target. Legacy Principal Emergency Fund repositories remain out of scope and must not be treated as authoritative sources.
- Treat statements labeled as current-code behavior, implementation quirks, or
  mock behavior as prototype observations, not approved architecture.
- Treat dated Figma wireframes as provenance, not the current visual target.
- Do not infer backend behavior from action visibility, static flow diagrams,
  mock values, or missing Figma screens.
- Do not silently choose between conflicting requirements. Record the decision
  in `docs/planning/decision-log.md` and update every affected source document.
- Preserve personally identifiable information (PII) only in approved systems;
  do not add real beneficiary, student, or payout data to this repository.
- Keep requirements, content, design evidence, implementation decisions, and
  tests traceable through stable IDs and links.
