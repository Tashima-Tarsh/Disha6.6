# Security Hardening Plan — Constitutional Grade

**Status**: Active  
**Priority Order**: Critical → High → Medium

---

## Critical (Do Immediately)

### 1. Authenticate the OSINT Backend
- File: `backend/app.py`
- Current state: `/scan`, `/api/v1/data/load`, `/api/v1/resolve` have no authentication
- Action: Require Bearer token or shared JWT. Fail closed.

### 2. Restrict CORS
- File: `backend/app.py`
- Current state: `allow_origins=["*"]`
- Action: Explicit trusted origins only.

### 3. Path Sandbox for Data Loading
- File: `backend/app.py` (data_load endpoint)
- Current state: Client-supplied `path` / `directory` accepted with insufficient containment
- Action: Resolve path and enforce `is_relative_to(allowed_root)`. Reject escapes.

### 4. Force Auth on OSINT Proxies
- Files: `web/app/api/osint/**`
- Current state: Proxies forward without calling principal/auth helper
- Action: Mandate authentication on every proxy route.

### 5. MCP Fail-Closed + Session Isolation
- File: `disha/services/mcp/src/http.ts`
- Current state: Auth optional; single shared SSE transport
- Action: Require API key (fail closed). Maintain per-client session map.

---

## High

### 6. Brain Path Containment
- File: `disha/brain/security/policy.py`
- Current state: String prefix check after resolve
- Action: Use proper relative containment (`relative_to` / `is_relative_to`).

### 7. Rate Limiting & Budgets
- Apply to all network-facing surfaces and to the Adapter Bus.

---

## Medium & Ongoing

- Remove or quarantine stranded code (`src/entrypoints/mcp.ts`)
- Ensure all high-impact actions emit EvidenceEvents
- Introduce truthful readiness endpoint
- Move toward OIDC + WebAuthn for human users
- Prove backup/restore (Disaster Recovery)

---

## Verification Checklist

- [ ] No unauthenticated sensitive endpoints remain
- [ ] CORS is explicit
- [ ] Path operations are sandboxed
- [ ] MCP authentication fails closed
- [ ] Every adapter emits evidence
- [ ] Policy decisions are recorded as evidence
- [ ] High-risk actions are proposal-only by default
