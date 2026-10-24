# Production Roadmap — After the Unique Core

The constitutional core is landed. This document prioritises what comes next.

## Priority 1 — Durability & Security (do next)

1. **Postgres EvidenceStore**
   - Schema: `packages/evidence-ledger/schema.sql`
   - Implementation: `PostgresEvidenceStore` (skeleton landed)
   - Wire into `@disha/orchestrator` and `@disha/api` via env `DATABASE_URL`

2. **Finish OSINT backend hardening**
   - Apply the exact steps in `backend/SECURE_WIRING.md`
   - Auth + CORS + path sandbox on every sensitive route in `backend/app.py`

3. **Secrets & config**
   - `DISHA_API_KEY`, `DISHA_OSINT_API_KEY`, `MCP_API_KEY`, `DATABASE_URL`
   - Never default to open

## Priority 2 — More high-quality adapters

Add only public, legally clean adapters that emit EvidenceEvents:

- Certificate / DNS / IP family (partially done)
- Public company / domain WHOIS-style (careful with ToS)
- Public news / GDELT-style (rate-limited)
- Government open-data sources (jurisdiction-specific)

Rule: every new adapter must declare `legalBasis`, `dataSensitivity`, and emit evidence.

## Priority 3 — Product surface

- Minimal Mission Workbench (list missions, run adapters, see evidence timeline)
- Review Console (pending queue + elevate / reject)
- Integrity indicator (hash-chain status)

## Priority 4 — Assurance

- Automated tests for hash-chain integrity
- Adapter contract tests (must emit EvidenceEvents)
- Truthful readiness endpoint
- Backup / restore proof for the Ledger

## What we explicitly defer

- Large unverified upstream catalogs
- Autonomous high-risk actions
- Claiming cognitive / Vyuha components as production intelligence
- Multi-tenant isolation (until single-tenant path is solid)

---

**Success metric remains unchanged**

A third party must be able to reconstruct any final conclusion from the Evidence Ledger alone.
