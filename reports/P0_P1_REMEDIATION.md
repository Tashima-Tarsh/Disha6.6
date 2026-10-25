# DISHA 6.6 — P0 & P1 Remediation Record

**Date:** October 25, 2026  
**Auditor:** Principal Systems Architect & Cybersecurity Lead  
**Branch:** `repair/production-hardening-godmode`  
**Repository:** https://github.com/Tashima-Tarsh/Disha6.6  

---

## 1. P0.1 — Cloudflare Edge Proxy Origin & Telemetry Truthfulness

### Root Cause
`web/cloudflare-proxy.ts` contained hardcoded origin bindings (`http://localhost:3000`), fabricated telemetry in error handlers (`status: "ok"`, `evidenceCount: 1`), hardcoded execution durations (`42ms`), and brittle regex-based HTML injection on `/login` that relaxed Content Security Policy (`'unsafe-inline'`).

### Concrete Changes
- Created `getApprovedOrigin(env)` to dynamically resolve origins from `UPSTREAM_ORIGIN`, `DISHA_APP_ORIGIN`, `NEXT_PUBLIC_APP_URL`, or sanitized request URLs.
- Replaced synthetic telemetry: failed DNS/CT queries accurately report `status: "failed"`, `evidenceCount: 0`, and real measured execution time (`Date.now() - t0`).
- Removed fragile regex HTML injection and CSP `'unsafe-inline'` relaxation on `/login`. The native `DishaDesktopDepth` React component is now used directly in Next.js without edge HTML manipulation.

### Files Modified
- `web/cloudflare-proxy.ts`

### Regression Test Coverage
- `web/tests/cloudflare-proxy.test.ts` (4/4 tests passed):
  - `resolves upstream origin dynamically from environment variables`
  - `reports real failed status and zero evidence count when probe fails`
  - `does not inject HTML or weaken CSP on login route`
  - `computes genuine adapter health summary without hardcoded values`

---

## 2. P0.2 — Production Docker Images & Release Workflows

### Root Cause
`.github/workflows/release.yml` only built a single image for `web`. The root `Dockerfile` lacked non-root user enforcement and healthchecks. `docker-compose.prod.yml` lacked a dedicated Python OSINT backend service, causing container networking failures.

### Concrete Changes
- Updated `.github/workflows/release.yml` with a build matrix producing two separate container images:
  1. `disha-web` (built from `web/Dockerfile`)
  2. `disha-osint-backend` (built from `./Dockerfile`)
- Hardened root `Dockerfile` for the Python OSINT backend:
  - Non-root user `disha:10001`
  - Exposed port 8000
  - Native HTTP healthcheck probe on `/tools/status`
- Hardened `web/Dockerfile`:
  - Multi-stage Next.js builder/runner with non-root user `nextjs:1001`
  - Standalone assets copying and container healthcheck
- Updated `docker-compose.prod.yml`:
  - Added dedicated `osint-backend` service
  - Configured `DISHA_OSINT_BACKEND_URL: http://osint-backend:8000`
  - Added shared volume `osint_data`

### Files Modified
- `.github/workflows/release.yml`
- `Dockerfile`
- `web/Dockerfile`
- `docker-compose.prod.yml`

---

## 3. P0.3 — Python OSINT Backend Client & Failure Accounting

### Root Cause
Next.js API routes communicated with the Python backend via hardcoded `http://localhost:8000` URLs. When the Python backend failed or was unreachable, routes fell back to recording `governed_osint_adapter_executed` in the Evidence Ledger, misrepresenting failures as completed executions.

### Concrete Changes
- Implemented `web/lib/server/osint-backend-client.ts`:
  - `getOsintBackendUrl()` dynamically reads `DISHA_OSINT_BACKEND_URL` (with fallback to `OSINT_BACKEND_URL`)
  - `callOsintBackend()` implements timeouts, retry logic, and structured JSON parsing
- Updated all API routes (`web/app/api/osint/*`, `web/app/api/v1/osint/*`, `web/app/api/v1/vyuha/*`) to use `callOsintBackend()`
- In `web/app/api/v1/osint/run/route.ts`: Upon backend execution failure, an audit event `governed_osint_adapter_failed` is logged with failure metadata, preventing false positive entries in the evidence ledger.

### Files Modified
- `web/lib/server/osint-backend-client.ts`
- `web/app/api/osint/scan/route.ts`
- `web/app/api/osint/tools/route.ts`
- `web/app/api/osint/health/route.ts`
- `web/app/api/osint/resolve/route.ts`
- `web/app/api/osint/data/load/route.ts`
- `web/app/api/osint/graph/stats/route.ts`
- `web/app/api/osint/vyuh/formations/route.ts`
- `web/app/api/osint/vyuh/activate/route.ts`
- `web/app/api/v1/osint/run/route.ts`
- `web/app/api/v1/osint/tools/route.ts`
- `web/app/api/v1/osint/tools/health/route.ts`
- `web/app/api/v1/osint/search/route.ts`
- `web/app/api/v1/vyuha/formations/route.ts`
- `web/app/api/v1/vyuha/activate/route.ts`

---

## 4. P0.4 & P0.5 — Universal OSINT Execution Recipes & Result Semantics

### Root Cause
`web/lib/osint/universal-execution-service.ts` used arbitrary shell argument concatenation and a generic output parser that automatically assigned `findingsCount = 1` even when stdout was empty. Tool status lacked standardization (`ToolStandardStatus`).

### Concrete Changes
- Introduced `ToolStandardStatus` enum:
  `COMPLETED_WITH_FINDINGS`, `COMPLETED_NO_FINDINGS`, `PARTIAL`, `FAILED`, `TIMEOUT`, `AUTH_REQUIRED`, `NOT_INSTALLED`, `BLOCKED_BY_POLICY`, `UPSTREAM_UNAVAILABLE`.
- Implemented `TOOL_RECIPES` with custom argument builders and dedicated output parsers for core tools:
  - `subfinder`
  - `amass`
  - `sherlock`
  - `maigret`
  - `holehe`
  - `phoneinfoga`
  - `theharvester`
  - `spiderfoot`
  - `photon`
  - `nuclei`
- Implemented `parseGenericOutput()`: requires verified non-empty lines or records to increment findings. Empty outputs yield `findingsCount = 0` and status `COMPLETED_NO_FINDINGS`.
- Missing binaries truthfully return `NOT_INSTALLED` without synthetic findings.

### Files Modified
- `web/lib/osint/universal-execution-service.ts`

### Regression Test Coverage
- `web/tests/universal-osint-execution-semantics.test.ts` (7/7 tests passed)
- `web/tests/osint-532-tool-universe.test.ts` (9/9 tests passed)

---

## 5. P1.1 — Durable Transactional Authorization Grants

### Root Cause
Authorization grants for active reconnaissance and identity enumeration resided solely in process memory (`Map`). Process restarts or scale-out events resulted in lost or desynchronized authorizations.

### Concrete Changes
- Created PostgreSQL migration `web/database/202610250001_durable_authorization_grants.sql` and rollback `202610250001_durable_authorization_grants.down.sql`.
- Registered migration in `web/scripts/apply-schema.mjs`.
- Updated `web/lib/server/authorization-grants.ts`:
  - In-memory cache for ultra-fast checks.
  - Atomic disk persistence (`data/authorization-grants.json`) for file-backed resilience.
  - Transactional PostgreSQL persistence (`authorization_grants` table) when a database pool is configured.

### Files Modified
- `web/database/202610250001_durable_authorization_grants.sql`
- `web/database/rollbacks/202610250001_durable_authorization_grants.down.sql`
- `web/scripts/apply-schema.mjs`
- `web/lib/server/authorization-grants.ts`

### Regression Test Coverage
- `web/tests/durable-authorization-grants.test.ts` (3/3 tests passed)

---

## 6. P1.2 — God Mode Advanced Investigative Intelligence

### Root Cause
The platform lacked a unified multi-hop research orchestrator with bounded budgets, relationship extraction, contradiction detection, and explainable execution traces.

### Concrete Changes
- Implemented `web/lib/intelligence/god-mode-research.ts`:
  - `GodModeResearchEngine` with bounded budgets (`maxDepth`, `maxTools`, `maxExecutionTimeMs`, `maxApiCalls`).
  - Multi-hop entity research expanding across domains, IPs, organizations, certificates, and web archives.
  - Relationship extraction (`resolves_to`, `operates`, `registered_by`, `owns`).
  - Contradiction & corroboration engine evaluating claims across independent sources.
  - Explainable execution trace logging every hop, action, tool, reason, duration, and plan alteration.
  - Cryptographically anchored `InvestigationDossier` with SHA-256 provenance hash.
- Implemented REST endpoint `POST /api/v1/intelligence/god-mode`.

### Files Modified
- `web/lib/intelligence/god-mode-research.ts`
- `web/app/api/v1/intelligence/god-mode/route.ts`

### Regression Test Coverage
- `web/tests/god-mode-research.test.ts` (2/2 tests passed)

