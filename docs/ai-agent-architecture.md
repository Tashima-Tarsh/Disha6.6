# AI, agent architecture and MCP boundaries

## What source proves

| Component | Exact source behavior | What is **not** proven |
| --- | --- | --- |
| `ReasoningBrain` | `create_plan()` directly returns `_heuristic_plan(command,memory)` | Production LLM-based planning |
| `AppContext` | Instantiates reasoning, planning, memory, executor, risk, decision, anomaly, graph and governed registry components | All components participate in every API request |
| `runWorkflow` | Exports a workflow engine with `chat`, `http`, `sleep`, `set` node types | A production workflow scheduler or background worker |
| `StatefulInvestigationGraph` | Defines investigation graph state and imports model gateway / evidence ledger | Live model/evidence pipeline end-to-end |
| `memoryGraph.ts` | Imports Redis client and `brainFetch` and provides graph merge/read helpers | Durable healthy connections in production |
| `OpenOsintMcpClient` | Implements client logic via fetch/spawn helpers | All declared tools installed or reachable |
| `Explorer MCP server` | Provides SDK request handlers for tools/resources/prompts | Its listed tools successfully execute under every transport |
| `Explorer HTTP /mcp` | Explicitly responds with HTTP 501 | Streamable HTTP implementation |
| `src/entrypoints/mcp.ts` | A second SDK entry point exists and references siblings missing from the tracked root `src` tree | Successful build or executable runtime |

## Traceable implementation references

- [Brain context](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/api/routes.py#L43-L79)
- [Deterministic heuristic](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/brain/reasoning.py#L6-L45)
- [Web agent workflow](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/agent/workflow.ts#L1-L20)
- [Web investigation graph](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/agent/langchain-pipeline.ts#L1-L25)
- [Memory graph](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/agent/memoryGraph.ts#L1-L60)
- [OpenOSINT MCP client](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/openosint-mcp-client.ts)
- [Explorer MCP server](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/server.ts#L143-L179)
- [HTTP wrapper placeholder](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/http.ts#L45-L48)
- [Alternative root MCP entry](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/src/entrypoints/mcp.ts#L1-L29)

## Semantic distinctions

1. **Registered** means a method/handler/collector declaration is visible; **operational** requires executable path, configuration, dependencies and verification.
2. **Model gateway imported** is not the same as real provider-backed inference.
3. **MCP server source** is not proof of a valid installed ChatGPT plugin.
4. **Local agent skills** under `.agents/skills/` are content resources, not automatically active Disha6.6 runtime agents.
5. **Brain, OSINT backend and Explorer MCP** have distinct security assumptions and process boundaries.
