# Source evidence index

All links point to the **baseline main source**, not to invented deployed components. The path inventory is [repository-manifest.json](repository-manifest.json); content review covers only the [34-file sample](repository-coverage.md).

| Claim | Source evidence |
| --- | --- |
| Web Next/React/version | [web/package.json](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/package.json) |
| Web redirects according to session cookie | [web/app/route.ts#L10-L23](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/route.ts#L10-L23) |
| OSINT UI fetches proxy routes and processes SSE | [web/app/osint/page.tsx#L41-L137](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/osint/page.tsx#L41-L137) |
| Scan proxy calls standalone Python | [web/app/api/osint/scan/route.ts#L8-L15](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/scan/route.ts#L8-L15) |
| Data ingestion route accepts path/directory | [backend/app.py#L827-L848](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L827-L848) |
| OSINT 36 decorator registrations | [backend/app.py#L165-L375](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L165-L375) |
| Brain registers router and websocket | [disha/brain/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/app.py) |
| Brain AppContext constructs components | [disha/brain/api/routes.py#L43-L79](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/api/routes.py#L43-L79) |
| Brain API bearer helper | [disha/brain/security/auth.py#L8-L19](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/security/auth.py#L8-L19) |
| Heuristic planner | [disha/brain/brain/reasoning.py#L6-L16](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/brain/reasoning.py#L6-L16) |
| SQLiteStore methods | [disha/brain/database/store.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/database/store.py) |
| Brain workspace prefix check | [disha/brain/security/policy.py#L56-L60](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/security/policy.py#L56-L60) |
| Explorer SSE and 501 /mcp | [disha/services/mcp/src/http.ts#L17-L49](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/http.ts#L17-L49) |
| Explorer factory registration | [disha/services/mcp/src/server.ts#L143-L155](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/server.ts#L143-L155) |
| Separate root MCP imports | [src/entrypoints/mcp.ts#L1-L29](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/src/entrypoints/mcp.ts#L1-L29) |

The underlying architectural relationship dataset is [architecture-graph.json](architecture-graph.json).
