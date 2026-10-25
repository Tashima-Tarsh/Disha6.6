# DISHA 6.6 — Constitutional Evidence Operating System

> **The only intelligence platform where every conclusion is reconstructible, policy-checked, and human-reviewable by design.**

Disha is not another OSINT collector dump or LLM wrapper.  
It is an evidence-first system in which **no claim becomes knowledge** until it is sourced, policy-checked, recorded as immutable evidence, and human-reviewable.

---

## The Unique Core (now in code)

```
Source → Adapter Bus → EvidenceEvent → Mission → Human Review → VERIFIED
```

| Package | Role |
|---------|------|
| [`CONSTITUTION.md`](CONSTITUTION.md) | Supreme governing document |
| `@disha/contracts` | VerificationState, EvidenceEvent, Adapter, PolicyDecision |
| `@disha/evidence-ledger` | Hash-chained, verifiable Evidence Ledger v3 |
| `@disha/adapter-bus` | Only legal gateway for external observations |
| `@disha/mission` | Mission lifecycle + legal state machine |
| `@disha/review` | Human Review Queue — **only path to VERIFIED** |
| `@disha/orchestrator` | Wires the full constitutional loop |
| `@disha/api` | Thin HTTP API (fail-closed) |

**Governed adapters (examples)**  
`github-user` · `dns` · `wayback` · `crtsh` · `ip-lookup`

All adapters emit `EvidenceEvent`s. High-risk actions default to proposal-only.  
Models and agents are strictly advisory — they can never create a `VERIFIED` finding.

---

## Quick start (Constitutional API)

```bash
export DISHA_API_KEY="$(openssl rand -hex 32)"
# from packages/api
npm start
```

```http
POST /v1/missions
{ "title": "Public check", "activate": true }

POST /v1/missions/:id/run
{ "adapterIds": ["dns-lookup", "crtsh"], "input": { "domain": "example.com" } }

GET  /v1/reviews
POST /v1/reviews/:id   { "decision": "elevate_verified", "notes": "..." }

GET  /v1/integrity
```

See [docs/API.md](docs/API.md) and [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md).

---

## Constitutional principles (non-negotiable)

1. No claim becomes knowledge until sourced, policy-checked, evidenced, and human-reviewable.
2. Models / agents are advisory only. They cannot create `VERIFIED` findings.
3. All external I/O goes through the Adapter Bus.
4. Policy is evaluated before execution. High-risk actions are proposal-only by default.
5. Authentication, path containment, and configuration **fail closed**.
6. Prefer fewer high-quality, legally clean adapters over large unverified catalogs.

Full text: [CONSTITUTION.md](CONSTITUTION.md)

---

## Repository reality (honest status)

This monorepo also contains a large amount of earlier code (Next.js web app, Python Brain, standalone OSINT FastAPI, MCP, legacy collections, Vyuha/Cognitive scaffolding, etc.).

**Presence of a directory or class does not mean it is production-ready or wired into the constitutional loop.**

The **product spine** going forward is the set of packages listed above.  
Legacy surfaces are being secured and gradually aligned; they are not the uniqueness claim.

Key remaining hardening (see `backend/SECURE_WIRING.md` and `docs/SECURITY_HARDENING_PLAN.md`):
- Finish wiring auth + CORS + path sandbox into the large `backend/app.py`
- Postgres-backed EvidenceStore
- Premium Workbench UI on top of the evidence chain

---

## Documentation map

| Document | Purpose |
|----------|---------|
| [CONSTITUTION.md](CONSTITUTION.md) | Binding rules |
| [docs/UNIQUE_CORE.md](docs/UNIQUE_CORE.md) | Why this is unique |
| [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) | What is real today |
| [docs/API.md](docs/API.md) | HTTP API reference |
| [docs/EVIDENCE_LEDGER_V3.md](docs/EVIDENCE_LEDGER_V3.md) | Ledger specification |
| [docs/ADAPTER_BUS.md](docs/ADAPTER_BUS.md) | Bus specification |
| [docs/CONSTITUTIONAL_REARCHITECTURE.md](docs/CONSTITUTIONAL_REARCHITECTURE.md) | Target architecture |
| [docs/SECURITY_HARDENING_PLAN.md](docs/SECURITY_HARDENING_PLAN.md) | Hardening checklist |

---


## Governed n8n skill orchestration (new, bounded)

The web API now accepts authenticated, sequential skill workflows at
`POST /api/v1/workflows/n8n/skills`. An importable n8n template is available
from `GET /api/v1/workflows/n8n/schemas` (field `governedSkillWorkflow`).

A registry entry or expert prompt is **not** proof of runtime capability.
The 1,806 indexed skill records and 503 role instruction personas have different
execution maturity. Unsupported instruction-only capabilities report
`NOT_EXECUTED`; no packet capture, model training, or domain verification is
implied merely by loading a skill. Workflows stop on a denied, unsupported, failed,
or unevidenced step, and final results are ledger-recorded.

See [Governed Skill Orchestration](docs/GOVERNED_SKILL_ORCHESTRATION.md) for the
architecture, request example, n8n credentials setup, authorization boundaries and
remaining integration milestones.

---

## License

See [LICENSE](LICENSE).

---

**Disha competes on reconstructibility and accountability, not on volume of collectors or speed of unverified answers.**
