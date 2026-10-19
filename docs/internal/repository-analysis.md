# Repository Analysis

## Summary

DISHA is a monorepo with overlapping product lines rather than a single deployable unit. The repository combines:

- a production-hardening track for `web/` and `src/`
- a legacy FastAPI backend in `backend/`
- multiple AI research and orchestration modules in `disha/`
- an AI platform prototype in `disha-agi-brain/`

This explains most of the current documentation drift, naming inconsistency, and duplicated concepts.

## System Purpose

At a high level, DISHA aims to provide:

- AI-assisted reasoning and decision workflows
- secure web and CLI operator interfaces
- repository-aware tooling and MCP-compatible runtime hooks
- experimental AI, defense, and strategy modules

The current production-focused implementation is strongest in the web and CLI hardening path.

## Major Runtime Surfaces

### `web/`

Primary authenticated web surface with:

- auth routes
- RBAC and CSRF controls
- rate limiting
- audit logging
- export and share workflows
- filesystem access policy

### `src/`

TypeScript runtime modules with:

- MCP entrypoint
- secure storage policy
- secure credential fallback control
- audit hooks for tool execution

### `backend/`

Legacy FastAPI service exposing:

- agent orchestration
- investigation routes
- multimodal routes
- ranking and RL endpoints
- streaming support

### `disha/`

Broad AI and platform namespace containing:

- cognitive loop
- agent framework
- models and simulation modules
- strategy dashboard
- prompts
- services and integrations

### `disha-agi-brain/`

Prototype AI platform backend focused on:

- analytics
- cache
- rate limiting
- security
- local AI services
- tenancy and vault concerns

## Dependencies And Data Flow

### Web path

`browser -> Next.js route -> service module -> server security layer -> Postgres/Redis/external backend`

### CLI path

`operator -> MCP entrypoint -> policy/storage checks -> audited tool execution`

### Legacy AI path

`request -> FastAPI router -> orchestrator or agent service -> model/graph/memory utilities`

## Documentation Gaps

- README mixes marketing language with inaccurate setup paths.
- Existing docs do not distinguish primary, legacy, and experimental modules.
- Architecture ownership by folder is not stated clearly.
- Database, auth, and security behavior for the hardened web path was under-documented.
- There was no coherent TDD or unified wiki index.

## Structural Inconsistencies

- Duplicate backend concepts exist across `backend/`, `disha/`, and `disha-agi-brain/`.
- Package manager expectations are mixed across npm, Bun, and Python requirements files.
- Naming is inconsistent between `apps`, `services`, `backend`, `legacy-root-src`, and root-level `src`.
- Some docs describe folders that no longer exist or no longer represent the main path.

## Recommended Convergence

The repository should converge toward a clearly segmented monorepo:

```text
platform/
  web/
  cli/
services/
  api/
  ai-core/
  ai-platform/
legacy/
  fastapi-backend/
docs/
  wiki/
  diagrams/
  decisions/
```

That convergence should happen in stages. The documentation set added here establishes the target model first so code moves can happen safely later.
