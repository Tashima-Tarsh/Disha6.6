# Repository Audit

## What DISHA Is Really Solving

DISHA is strongest when framed as a Constitutional Cyber Audit system for India-facing public-interest operations.

The working product problem is:

- public records, RTI responses, service-gap reports, sensor signals, and cyber telemetry arrive fragmented
- operators need to know what is evidence, what is allegation, what is contradiction, and what is unresolved
- cyber or public-service action must be defensive, lawful, audited, and human-governed
- unsupported claims must not become public truth

The unique product direction is not generic AGI. It is governed intelligence: evidence class, constitutional/public-authority relevance, risk score, No-First-Use status, human approval, and audit hash all attached to the same decision.

## Production Spine

These areas are the current production spine:

- `disha/brain/graph/`
- `disha/brain/evidence/`
- `disha/brain/governance/`
- `disha/brain/policy/`
- `disha/brain/yudh/`
- `disha/brain/vyuha/`
- `disha/brain/audit/`
- `disha/brain/memory/`
- `web/`
- `src/`
- `tests/test_disha_brain_graph.py`

## Stale Or High-Debt Surfaces

These areas contain useful ideas but should not be treated as production truth without review:

- older AGI/elite-positioning docs that claim more than the verified implementation
- duplicate web surfaces under `disha/apps/web/`
- experimental AI model, physics, strategy, and service folders under `disha/ai/` and `disha/services/`
- removed demo payload references in older documentation
- legacy architecture reports that mention retired paths or broad AGI claims
- placeholder smoke tests in service folders

Do not delete them blindly. Promote them only through a review path: ownership, security posture, tests, dependency audit, and integration into the Brain spine.

## New Innovation Added

The repo now has a Constitutional Action Ledger in `disha/brain/governance/constitutional_audit.py`.

For each graph run it records:

- public authority signal
- implicated constitutional/public-interest principles
- evidence gaps
- allowed actions
- blocked actions
- human review requirement
- verification status
- lawful action path

The graph stores this ledger in audit metadata, so constitutional reasoning is attached to the evidence trail instead of living only in docs.

The repo also has a Dharma-Yudh-Vyuha planner in `disha/brain/vyuha/dynamic.py`.

This planner turns each run into a governed decision:

- Pramana: evidence class, confidence, source count, verification status, and gaps
- Dharma: public-authority signal and constitutional/public-interest principles
- Yudh: risk posture and formation reason
- Karma: permitted actions, blocked actions, and action discipline

The planner does not reward aggressive action. It prefers the formation that is best supported by proof, lawful duty, and defensive constraints. A public-authority RTI contradiction should move toward NYAYA Audit Vyuha; a high-risk defensive incident should still remain NFU-governed and approval-gated.

## Product Rule

DISHA must not become a surveillance platform. It should become a public-interest audit and cyber-protection system:

- aggregate or source-linked evidence
- no individual-level surveillance
- no unauthorized access
- no retaliation
- no public claim without evidence status
- human approval for ambiguous or high-risk actions

## Next Technical Debt Targets

1. Add promotion labels for legacy/experimental modules.
2. Move stale AGI claims behind a historical-docs section.
3. Add official-source connector interfaces for `data.gov.in`, RTI records, audit reports, and cyber telemetry.
4. Replace heuristic constitutional mapping with a reviewed taxonomy file.
5. Add a persistent graph/audit export path for production deployments.
