# Constitutional Rearchitecture Blueprint

**Goal**: Make Disha 6.6 the most unique, trustworthy, and premium evidence-first intelligence platform in the world.

**Governing Document**: [CONSTITUTION.md](../CONSTITUTION.md)

---

## 1. Executive Positioning

Disha does not try to be the fastest or the most feature-rich OSINT tool.  
Disha aims to be the only system in which every intelligence conclusion can be fully reconstructed, challenged, and audited.

This is the opposite of nearly every commercial OSINT platform and AI agent system.

---

## 2. Target Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (Premium UX)                            │
│  Next.js App Router • Mission Workbench • Evidence Explorer │
│  Policy Console • Human Review Queue • Geospatial Canvas    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Strict typed contracts + auth
┌──────────────────────────▼──────────────────────────────────┐
│  Policy & Governance Gateway (The Constitution)             │
│  Policy Engine • Approval Workflows • Risk Classification   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Evidence Core (Single Source of Truth)                     │
│  Evidence Ledger v3 (hash-chained, append-only)             │
│  Canonical Observation / Claim / Finding model              │
│  Provenance Graph • Verification State Machine              │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
│ Adapter Bus     │ │ Cognitive    │ │ Case / Mission  │
│ (OSINT + Tools) │ │ Runtime      │ │ Engine          │
│ - Timeout       │ │ (Advisory)   │ │ - Lifecycle     │
│ - Rate limit    │ │ - 7-stage    │ │ - Tasks         │
│ - Retry         │ │ - Vyuha      │ │ - Approvals     │
│ - Evidence emit │ │ - Agents     │ │ - Reports       │
└─────────────────┘ └──────────────┘ └─────────────────┘
```

---

## 3. Non-Negotiable Rules

1. Models and agents are advisory only. They cannot create VERIFIED findings.
2. All external I/O passes through the Adapter Bus.
3. Policy is evaluated before execution. High-risk actions are proposal-only by default.
4. Authentication, path containment, and configuration fail closed.
5. Prefer fewer high-quality, legally clean adapters over large unverified catalogs.
6. Every significant action emits an EvidenceEvent.

---

## 4. Canonical Contracts

See `packages/contracts/` (to be created) and the reference specifications:

- VerificationState
- EvidenceEvent (immutable, hash-chained)
- Adapter + AdapterResult
- PolicyDecision

---

## 5. Phased Implementation Roadmap

### Phase 0 — Foundation (Immediate)
- Land this Constitution and blueprint
- Secure existing trust boundaries (auth, CORS, path sandbox)
- Freeze capability over-claims

### Phase 1 — Spine
- Evidence Ledger v3
- Adapter Bus
- Policy Gateway hardening
- Canonical contracts package

### Phase 2 — Product Core
- Mission / Case lifecycle with full evidence
- Human Review Console
- 8–12 high-quality public-source adapters
- Truthful readiness endpoint

### Phase 3 — Premium Experience
- Polished Mission Workbench
- Evidence Explorer (hash-chain timeline)
- Policy Console
- Report generation with full provenance export

### Phase 4 — Expansion & Assurance
- Controlled addition of new adapters (legal + quality gate)
- Multi-tenant isolation
- Optional cryptographic signing of evidence
- Disaster recovery proven by restore tests

---

## 6. Success Metric

After this rearchitecture, a third-party auditor must be able to take any final report and fully reconstruct:

- Every source observation
- Every policy decision
- Every model suggestion
- Every human approval or rejection
- The exact verification path that elevated a claim to VERIFIED

If that reconstruction is not possible, the system has failed its constitutional purpose.
