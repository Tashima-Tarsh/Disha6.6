# DISHA 6.6 Agentic Workbench

The agentic workbench is a local Next.js product surface at `/workbench`. It moves a DISHA mission through governed API calls without hiding the reasoning path from the analyst.

## Flow

1. Mission input: analyst writes the mission, selects domain, and tags the scope.
2. Signal normalization: text becomes a structured `DishaSignal` preview with intent, entities, sensitivity, and risk.
3. Lens routing: recommended lenses are shown with reasons and remain editable by the analyst.
4. Lens execution: governed APIs expose findings, confidence, uncertainty, evidence markers, and non-executable actions.
5. Fusion: the workbench separates agreements, conflicts, and synthesized insight.
6. Policy gate: the output is explicitly read-only, confirmation-required, or escalated.
7. Evidence ledger: source-linked evidence events show mission provenance.
8. Final report: the analyst can copy, print, export JSON, or save the governed result after confirmation.

## Runtime Boundary

The workbench must not use deterministic demo data as operational output. It should call:

- `POST /api/v1/mission`
- `POST /api/v1/agentic/mission`
- `POST /api/v1/policy/evaluate`
- `GET /api/v1/evidence/{missionId}`
- `POST /api/v1/evidence/export`

If one of those services is unavailable, the UI should report the unavailable dependency and avoid showing invented incident counts, legal conclusions, government figures, or source records.

## Integration Notes

The UI is intentionally split between:

- `web/app/workbench/workbench-client.tsx`: interactive client flow.
- `web/app/workbench/workbench.module.css`: route-scoped presentation.

The user experience should show every policy decision, uncertainty marker, and evidence event returned by the governed services.
