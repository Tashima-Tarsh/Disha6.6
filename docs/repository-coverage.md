# Repository coverage — static architecture investigation

**Date:** 2026-10-23  
**Repository:** `Tashima-Tarsh/Disha6.6`, default `main`  
**Tree object:** `4b7caad2612199a0870bc7b60396d93fc307f38a` (GitHub returned `truncated: false`).  
**Method:** GitHub tracked-tree enumeration + individual source reads; no builds, tests, dependency installation, deployments, network calls to project services, or migrations.

## Census and counting rules

| Metric | Count |
| --- | ---: |
| All tracked Git tree entries | 7,550 |
| Tracked blob entries | 5,757 |
| Tracked tree/directory entries | 1,775 |
| Tracked `disha/` files | 4,015 |
| Tracked `web/` files | 744 |
| Tracked `.agents/` files | 467 |
| Tracked `legacy/` files | 161 |
| Tracked `docs/` files | 141 |
| Tracked `skills/` files | 56 |
| Tracked `scripts/` files | 44 |
| Individually content-read files | 34 |
| Files not content-reviewed in this pass | 5,723 |

The 34 inspected files are **not** a random or representative sample: they were selected for runtime entry points, manifests, major interfaces, and security boundaries. No claim of full source audit or first-party-only coverage is justified. Blob counts include documentation, snapshots, generated/vendored-like material, and other non-runtime assets. The `disha/legacy-root-src/` directory alone is substantial; its relationship to active code is not established.

## Individually inspected paths

1. `README.md`
2. `package.json`
3. `AGENTS.md`
4. `backend/app.py`
5. `disha/brain/app.py`
6. `disha/brain/api/routes.py`
7. `disha/brain/security/auth.py`
8. `disha/brain/security/policy.py`
9. `disha/brain/database/store.py`
10. `disha/brain/modules/registry.py`
11. `disha/brain/brain/executor.py`
12. `disha/brain/brain/reasoning.py`
13. `disha/brain/brain/risk_engine.py`
14. `disha/services/mcp/src/index.ts`
15. `disha/services/mcp/src/server.ts`
16. `disha/services/mcp/src/http.ts`
17. `src/entrypoints/mcp.ts`
18. `web/app/api/osint/scan/route.ts`
19. `web/app/api/osint/resolve/route.ts`
20. `web/app/api/osint/tools/route.ts`
21. `web/app/api/osint/vyuh/activate/route.ts`
22. `web/app/route.ts`
23. `web/app/osint/page.tsx`
24. `web/lib/server/brain-client.ts`
25. `web/lib/server/auth.ts`
26. `web/lib/server/agent/workflow.ts`
27. `web/lib/server/agent/langchain-pipeline.ts`
28. `web/lib/server/agent/memoryGraph.ts`
29. `web/lib/server/openosint-mcp-client.ts`
30. `web/package.json`
31. `pyproject.toml`
32. `disha/brain/requirements.txt`
33. `docs/implementation-gap-matrix.md`
34. `web/app/api/osint/data/load/route.ts`

**Inspected** means source content was retrieved and structurally examined; it does *not* imply every individual line was manually annotated or execution-verified.

## Classification status

| Source class | Status |
| --- | --- |
| Root and major subsystem tracked paths | Enumerated through recursive tree |
| Source files outside inspected list | **Not individually inspected** |
| Third-party / generated / copied legacy sources | Not exhaustively classified |
| All registered tools, endpoints, agents, adapters | **Unknown** — avoid aggregate operational counts |
| Confirmed architectural edges | See small evidence-backed graph; not exhaustive |
| Graph edges inferred solely from names | **None** |
| Dynamic runtime behavior | Not tested |
| Static security findings | Source indications only; see technical audit |

### Next audit passes required for exhaustive certification

- Build a path-by-path manifest classifying all 5,757 tracked blobs as first-party, generated, vendored, legacy, binary, doc or test.
- Read every first-party source file and mark a coverage record, including `disha/services/integrations/`, `disha/legacy-root-src/`, `web/app/api/`, `web/lib/unified/`, and `disha/ai/`.
- Enumerate routes, tools, models, adapters and agents from actual registration sites, resolving aliases and conditional loading.
- Trace authenticated web journeys, database migrations and tenant boundaries; distinguish imports from live calls.
- Verify static graph integrity and diagram consistency; perform runtime verification only under a separately approved scope.
