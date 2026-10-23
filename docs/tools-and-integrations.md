# Tools and integrations — static evidence

## Collector registry

`backend/app.py` contains **36 source-defined `@collector` decorators**. They span breach metadata, public account presence checks, identity validation, public infrastructure observations, optional external command wrappers and network inspection. This is a **decorator count**, not an audited inventory of live, authorized or functioning integrations.

## MCP surfaces

- `disha/services/mcp/src/server.ts` installs MCP request handlers for tools, resources and prompts.
- `disha/services/mcp/src/index.ts` creates a stdio transport; `http.ts` creates an SSE transport.
- `disha/services/mcp/src/http.ts` returns **501** for `POST /mcp`, so Streamable HTTP is not implemented in this wrapper.
- `src/entrypoints/mcp.ts` is separate from the Explorer and includes imports that do not resolve to tracked sibling paths within root `src/`; it must not be counted as an operational server without build verification.

## Large integration trees

The tracked tree contains **1,233 files under `disha/services/integrations/`**, but no claim about registered/admitted/executable tools follows from this file count. The `.agents/` tree contains 467 files including many SKILL documents; skill text is not a live DISHA agent registration.

## What needs verification

For each module, record manifest, source function, registration point, actual caller, required configuration, permission/policy boundary, error/timeout handling, dataset provenance, test evidence and whether it is reachable in the product. Avoid importing unrelated project features into Disha6.6.

[Source graph](architecture-graph.json) · [Coverage manifest](repository-manifest.json).
