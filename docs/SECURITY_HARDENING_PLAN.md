# Security Hardening Plan — Constitutional Grade

**Status**: Verified & Hardened  
**Audit Date**: October 2026  
**Audited & Verified Baseline**: Main Branch Hardening Review

---

## 1. Verified Controls (Production Hardened)

### 1. Authenticate the OSINT Backend
- **Files**: `backend/app.py`, `backend/secure_bootstrap.py`
- **Implementation**: Bearer token authentication via `verify_api_key` enforced on all sensitive endpoints (`/scan`, `/api/v1/data/load`, `/api/v1/resolve`). Unauthenticated calls fail closed with HTTP 401.

### 2. Restrict CORS
- **Files**: `backend/app.py`, `backend/secure_bootstrap.py`
- **Implementation**: Explicit origin whitelist via `DISHA_ALLOWED_ORIGINS` (defaults to trusted domains). Wildcard `*` origins rejected in production.

### 3. Path Sandbox for Data Loading
- **Files**: `backend/app.py` (`data_load`), `web/lib/server/security.ts` (`resolveWorkspacePath`)
- **Implementation**: Canonical paths resolved using `pathlib.Path.resolve()` and `fs.realpathSync()`. Paths must satisfy `is_relative_to(ALLOWED_ROOT)`. Symlink escapes and sensitive credentials (`.env*`, secrets, keys) rejected with 403.

### 4. Forced Auth on OSINT Proxies & Web Routes
- **Files**: `web/app/api/osint/**`, `web/lib/unified/api.ts`
- **Implementation**: Every non-health route wrapped in `withContext` running `requirePrincipal` and `assertCan` policy checks.

### 5. Durable Authorization Grants
- **File**: `web/lib/server/authorization-grants.ts`
- **Implementation**: Cryptographic HMAC-SHA256 signatures with `DISHA_JWT_SECRET`. Tampered or unsigned grants rejected on lookup. Dual-control RBAC (admin required for active recon, vulnerability scan, and self-healing).

### 6. Reviewer Identity Boundary
- **File**: `packages/api/src/server.ts`
- **Implementation**: Service API keys resolve as `system` principal. Human reviewer elevation to `VERIFIED` strictly requires cryptographically verified `X-Disha-Reviewer-Token` issued to reviewer/admin roles.

### 7. Governed Autonomous Code Repair (Self-Healing)
- **Files**: `web/app/api/v1/autonomous/self-heal/route.ts`, `packages/autonomous/self_healing_engine.py`
- **Implementation**: Admin-only RBAC, required `high_risk_execution` authorization grant, non-ALLOW policy blocking, allowlisted test runners (`npm`, `pytest`, `python -m unittest`, `node --test`), strict command sanitization without shell execution (`shell=False`), and atomic rollback.

### 8. Rate Limiting & Identity Protection
- **File**: `web/lib/server/rate-limit.ts`
- **Implementation**: Rate limiting keyed to authenticated token hash or Cloudflare connecting IP (`cf-connecting-ip`), with Redis backing in distributed production.

---

## 2. Verification Checklist

- [x] No unauthenticated sensitive endpoints remain (fail-closed Bearer auth)
- [x] CORS is restricted to explicit trusted origins
- [x] Path operations are sandboxed and symlink-traversal protected
- [x] High-risk actions require cryptographic authorization grants
- [x] Self-healing commands are strictly allowlisted and run without a shell
- [x] Every execution emits immutable events to the Evidence Ledger
- [x] Human reviewer elevation cannot be claimed by service API keys alone
- [x] Release pipeline is gated on full test suite, typecheck, and container integrity
