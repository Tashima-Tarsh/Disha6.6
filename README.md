<div align="center">

# DISHA 6.6
### The Constitutional Intelligence & Defense Operating System

**One mission. Many capabilities. One evidence chain.**

A governed, evidence-first platform combining **OSINT, scientific research, authorized cybersecurity assessment, defensive threat intelligence, adaptive VYUHA formations, honeypot telemetry, and multi-agent automation**.

[![Fast CI](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/ci.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/ci.yml)
[![E2E Constitutional Spine](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/e2e-spine.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/e2e-spine.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-16a34a.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22-337b55?logo=nodedotjs)](package.json)
[![Version](https://img.shields.io/badge/Version-6.6-17bdda.svg)](package.json)

[Architecture](#system-architecture) · [Capabilities](#capability-map) · [GOD MODE](#god-mode--unified-mission-control) · [VYUHA](#vyuha--adaptive-defensive-formations) · [Quick Start](#quick-start) · [Engineering](#engineering-direction)

</div>

---

## The intelligence platform where evidence comes before conclusions

DISHA 6.6 is a modular **Constitutional Evidence Operating System**. It is designed to let an operator conduct a mission spanning public-source research, authorized infrastructure assessment, software and scientific analysis, and defensive incident response—without losing source provenance, policy controls, or human accountability.

> **Core principle:** No claim becomes knowledge until it is sourced, policy-checked, recorded as evidence, and human-reviewable.

```text
Source / Sensor → Governed Adapter Bus → EvidenceEvent
                → Mission Correlation → Human Review → VERIFIED Finding
```

Every capability contributes to the same operational advantage: decisions that are **traceable, reconstructible, contestable, and safe to act upon**.

## System architecture

![DISHA 6.6 — constitutional intelligence, unified mission, skill, n8n, VYUHA, honeypot and evidence architecture](docs/public/assets/disha66-architecture.svg)

<div align="center">
  <sub><strong>Architecture map:</strong> blue highlights core platform services, purple maps orchestration and skills integration, and green represents the governed defensive-response pathway. <a href="docs/ORCHESTRATION_ARCHITECTURE.md">Explore the full architecture blueprint.</a></sub>
</div>

### The operating model

| Layer | Function | Source |
|---|---|---|
| **Mission Control** | Capture objectives, organize missions, present decisions, and route reviews | `packages/mission/`, `web/` |
| **Constitutional Gateway** | Authenticate, enforce scope, classify risk and apply human approvals | [`CONSTITUTION.md`](CONSTITUTION.md), `web/lib/unified/policy-gate.ts` |
| **Skills & Agents** | Discover indexed expert roles, instructions, and category-specific executors | `web/lib/skills/skill-registry.ts`, `.agents/` |
| **OSINT & Scanning** | Public-source adapters and approved, bounded infrastructure checks | `packages/adapter-bus/`, `packages/adapters/`, `backend/` |
| **Workflow Runtime** | Process selected durable jobs and integrate incoming n8n events | `web/lib/unified/workflow-executor.ts`, `web/app/api/v1/workflows/n8n/` |
| **VYUHA Defense** | Analyze signals and propose No-First-Use defensive formations | `skills/vyuha-defense-engine/`, `web/lib/extensions/vyuha-defense.ts` |
| **Honeypot Evidence** | Admit and analyze telemetry from owned or authorized deception environments | `web/lib/extensions/honeypot-evidence.ts` |
| **Evidence & Verification** | Hash-chain observations, preserve decisions and route claims to human review | `packages/evidence-ledger/`, `packages/review/` |

### Canonical constitutional packages

| Package | Responsibility |
|---|---|
| `@disha/contracts` | `VerificationState`, `EvidenceEvent`, `Adapter`, `PolicyDecision` |
| `@disha/evidence-ledger` | Tamper-evident, hash-chained evidence events; persistence abstractions |
| `@disha/adapter-bus` | Governs external observations under common contracts |
| `@disha/mission` | Case/mission lifecycle and legal state model |
| `@disha/review` | Human review queue; source of authority for `VERIFIED` |
| `@disha/orchestrator` | Composition of evidence, policy and mission components |
| `@disha/api` | Fail-closed HTTP interface |

The wider monorepo connects Next.js, Python, OSINT, AI, MCP and specialist research components. The [Current Status](docs/CURRENT_STATUS.md) and [Orchestration Architecture](docs/ORCHESTRATION_ARCHITECTURE.md) describe the interfaces, integration pathways and deployment configuration for each runtime.

---


## GOD MODE — unified mission control

**GOD MODE** is DISHA's operator-governed command model: **one mission, specialized capabilities, and one accountable evidence chain**. It brings research, OSINT, security assessment, threat intelligence, scientific analysis and defensive planning into a common mission workflow.

### The mission cycle

1. **Scope** — define the objective, authorized targets, source restrictions and success criteria.
2. **Plan** — match the mission to the skill registry, expert roles and registered adapters.
3. **Execute** — dispatch supported workflows and bounded capabilities through policy-enforced interfaces.
4. **Observe** — record source provenance, execution state, evidence identifiers and results.
5. **Defend** — evaluate controlled-environment signals with VYUHA formation recommendations.
6. **Verify** — route evidence-supported findings through authorized human review.
7. **Deliver** — assemble reconstructible reports, research artifacts, timelines and decisions.

The mission architecture is grounded in the **Constitutional Gateway, Mission Engine, Skill Registry, Workflow Bridge, Evidence Ledger and Review Queue**. Scope authorization and traceable execution are built into this operating model.

[Explore the architecture](docs/ORCHESTRATION_ARCHITECTURE.md) · [Read the Constitution](CONSTITUTION.md)


## Capability map

DISHA 6.6 brings its capabilities together through the constitutional mission and evidence architecture. The repository indexes **1,806 skill definitions across nine families** and **503 expert role definitions**, with a capability-readiness API for identifying execution modes and available bindings.

| Domain | DISHA capability | Entry point |
|---|---|---|
| **Skills & expert roles** | Indexed skill discovery, specialized instructions, category validators and execution-readiness reporting | `web/lib/skills/`, `GET /api/v1/skills/readiness` |
| **OSINT intelligence** | Public-domain, DNS, certificate-transparency, archive, IP and GitHub observations | `packages/adapters/`, `packages/adapter-bus/` |
| **Authorized security assessment** | Scoped investigations, network research and approved environment checks | `web/`, `backend/`, `packages/adapter-bus/` |
| **Scientific & AI research** | Numerical routines, scientific skill catalogues and research-oriented code analysis | `web/lib/skills/skill-registry.ts`, `.agents/` |
| **Workflow orchestration** | Authenticated n8n integration, an eight-step governed skill workflow and selected durable jobs | `web/app/api/v1/workflows/n8n/`, `web/lib/unified/workflow-executor.ts` |
| **VYUHA formations** | Defensive formation rules, threat classification and policy-aware response proposals | `skills/vyuha-defense-engine/`, `web/lib/extensions/vyuha-defense.ts` |
| **Honeypot intelligence** | Approved deception-sensor event intake, correlation and evidence preservation | `web/lib/extensions/honeypot-evidence.ts` |
| **Exposure awareness** | Source-qualified defensive breach-exposure analysis and risk-oriented metadata | `web/lib/unified/breach-dataset-adapter.ts` |
| **Evidence & review** | Tamper-evident observations, verification states, review decisions and mission provenance | `packages/evidence-ledger/`, `packages/review/` |

### Execution integrity

DISHA tracks **catalogue readiness** and **actual job execution** separately. The skill-readiness route identifies instruction-driven entries and category-backed execution paths, while governed workflows return step-level results and correlate evidence records.

```text
Capability: CATALOGUED → BINDING_VALIDATED → READY → SMOKE_PASSED → PRODUCTION_READY
Workflow:   QUEUED → RUNNING → SUCCEEDED / PARTIAL / FAILED / BLOCKED
```

A successful tool run is backed by a supported executor, validated output and evidence. Explicit execution states preserve the distinction between skill discovery, analysis and completed operations.

### Skill families

| Category | Indexed skills |
|---|---:|
| Scientific computing | 764 |
| AI research | 311 |
| Software engineering | 257 |
| General | 143 |
| Design / frontend | 139 |
| Cybersecurity | 100 |
| Computer networking | 74 |
| Cognitive memory | 13 |
| Intelligence / OSINT | 5 |
| **Total** | **1,806** |

---


## VYUHA — adaptive defensive formations

**VYUHA** translates the formation concepts of **Chakra, Garuda, Kurma, Padma** and other defensive patterns into a threat-analysis and response-planning framework. The rules and classification engine live in [`skills/vyuha-defense-engine/`](skills/vyuha-defense-engine/).

```text
Approved sensor / alert → Threat classification → VYUHA formation selection
                        → Policy & scope evaluation → Defensive recommendation
                        → Evidence capture → Human decision & recovery
```

### “Attack the Attack” — defender-controlled response

DISHA's defensive doctrine focuses on disrupting hostile activity **within infrastructure the operator owns or is authorized to protect**. Its response playbooks cover:

- Correlating indicators, behavior and timelines from permitted sources.
- Evaluating network throttling and containment options at owned enforcement points.
- Host isolation, artifact quarantine, credential rotation and service recovery planning.
- Learning from controlled honeypot signals with documented sensor provenance.
- Preserving evidence and reviewer decisions across the response lifecycle.

**Formation engine:** rule-based classification and policy-aware response proposals. **Honeypot integration:** governed admission of telemetry from approved deception environments. This provides a practical foundation for integrating authorized defense controls, approvals and recovery playbooks.

[Formation library](skills/vyuha-defense-engine/formation-rules/) · [Defense architecture](docs/ORCHESTRATION_ARCHITECTURE.md)

---

## OSINT, scanning, breach awareness & research

DISHA aims to bring public-source discovery, authorized assessments and defensive research into an evidence-centered mission flow.

- **OSINT:** DNS, certificate transparency, archives, public GitHub metadata and permitted data sources.
- **Authorized security assessment:** owned domains, services, API configurations, network controls and bounded checks.
- **Breach exposure awareness:** verified notifications and lawful exposure metadata—without ingesting stolen credentials or redistributing leaked personal records.
- **Research and analysis:** technical documents, models, code, datasets, reproducible experiments and evidence-linked synthesis.
- **Deception and threat hunting:** permitted sensors and isolated, owned honeypot telemetry.

Collection and scanning are subject to **law, authorization, source terms, privacy controls and risk-based permissions**. The architecture intentionally separates passive observation from privileged or active operations.


## n8n-style orchestration

DISHA's workflow plane connects event-driven automation with **authenticated execution, scope checks, skill readiness and evidence-backed results**.

| Interface | Responsibility |
|---|---|
| `POST /api/v1/workflows/n8n/webhook` | Receives governed, schema-validated workflow events |
| `POST /api/v1/workflows/n8n/skills` | Runs up to **eight ordered registered-skill steps**, with principal propagation, prevalidation and fail-stop handling |
| `GET /api/v1/workflows/n8n/schemas` | Exports an importable n8n workflow template |
| `GET /api/v1/skills/readiness` | Reports indexed skill capability and execution readiness |
| `web/lib/unified/workflow-executor.ts` | Executes selected source-ingestion, OSINT-watch and intelligence-activation jobs |

```text
n8n / Mission Trigger
        ↓
Authenticated Gateway → Authorization & policy
        ↓
Governed Skill Steps → Evidence Ledger
        ↓
Execution Summary → Human Review / Reporting
```

The skill bridge enforces ordered dependencies, an eight-step ceiling, principal-aware authorization and correlated ledger entries. It records denied, unsupported and unsuccessful steps as explicit outcomes.

[Governed Skill Orchestration](docs/GOVERNED_SKILL_ORCHESTRATION.md) provides request examples, credentials and integration tests. [Orchestration Architecture](docs/ORCHESTRATION_ARCHITECTURE.md) details the extensible DAG, worker isolation and durable workflow design.

---


## Evidence is the product

DISHA preserves the provenance and verification state of every finding:

`OBSERVED` · `INFERRED` · `CORRELATED` · `PREDICTED` · `VERIFY_REQUIRED` · `VERIFIED` · `REJECTED`

The Evidence Ledger anchors observations in a tamper-evident chain. **Authorized human review** is the decision point for promoting a finding to `VERIFIED`. This preserves a clear distinction between collected source material, machine-generated analysis and an accountable conclusion.

The result is a reconstructible evidence trail for investigations, scientific analysis, incident response and reporting.

## Quick start

### Requirements

- **Node.js 22.x** for the current web workspace.
- Python dependencies for the OSINT backend when using that service.
- PostgreSQL / Redis and configured service credentials where required by the selected runtime.

```bash
git clone https://github.com/Tashima-Tarsh/Disha6.6.git
cd Disha6.6

# Start Next.js web development workspace
npm --prefix web ci
npm --prefix web run dev
```

The development web interface normally uses `http://localhost:3000`. Connected API routes require appropriate environment configuration and running backend dependencies. **Do not expose a development stack or example database credentials on public networks.**

### Constitutional API

The separate `@disha/api` service is documented at [docs/API.md](docs/API.md) (default local port `8787`). Configure `DISHA_API_KEY`; durable production deployments require a configured PostgreSQL store.

Example API request shape:

```http
POST /v1/missions
Authorization: Bearer <DISHA_API_KEY>
Content-Type: application/json

{"title":"Authorized public-domain check","activate":true}
```

```http
POST /v1/missions/:id/run
Authorization: Bearer <DISHA_API_KEY>
Content-Type: application/json

{"adapterIds":["dns-lookup","crtsh"],"input":{"domain":"example.com"}}
```

### Validate your environment

```bash
npm --prefix web run lint
npm --prefix web run type-check:full
npm --prefix web test
npm --prefix web run build
```

**Continuous integration:** Fast CI runs lint, tests, TypeScript checks, dependency auditing and production builds. The E2E Constitutional Spine validates core governance flows. Both checks passed on the 26 October 2026 repository baseline; the badges at the top of this page display current GitHub Actions status.

---

## Security & constitutional rules

This repository follows the [DISHA Constitution](CONSTITUTION.md) and [Security Policy](SECURITY.md):

1. **Authorization first:** permission, ownership and target scope are required for active operations.
2. **No First Use:** no retaliation or unauthorized targeting of external systems.
3. **Models are advisory:** AI cannot self-authorize high-impact actions or produce `VERIFIED` findings.
4. **Governed adapters:** external observation uses registered, policy-checked interfaces.
5. **Fail closed:** missing credentials, invalid approvals and integrity failures block privileged execution.
6. **Privacy:** limit retention, redact sensitive data and exclude stolen credentials or unlawfully obtained records.
7. **Reproducibility:** distinguish observed facts, deductions, predictions and human conclusions.

Please report security vulnerabilities privately through [GitHub Security Advisories](https://github.com/Tashima-Tarsh/Disha6.6/security/advisories), not public issues.


## Engineering direction

DISHA's ongoing engineering work is organized around four product tracks:

| Track | Focus |
|---|---|
| **Unified orchestration** | Extend typed skill-execution graphs, durable workflow state, retries and operator visibility |
| **Execution coverage** | Expand registered executor bindings, capability-specific integration tests and readiness certification |
| **Defensive automation** | Connect policy-approved VYUHA playbooks, controlled deception environments and recovery controls |
| **Evidence assurance** | Strengthen cross-runtime provenance, replay testing, operational security and deployment resilience |

### Delivered milestones

- Constitutional core, adapter contracts, mission lifecycle and evidence/review packages.
- Public-source adapters and authorized mission examples.
- Registry containing **1,806 skills** and **503 expert roles**.
- Governed n8n webhook, importable workflow schema and authenticated sequential skill bridge.
- Capability-readiness reporting, evidence-correlated workflow results and fail-stop behavior.
- VYUHA formation library, defensive recommendations and owned-honeypot telemetry intake.
- CI repairs covering React lint, TypeScript, security dependencies and build verification.

**Engineering standard:** every published finding has a source, every execution has a verifiable outcome, and every reviewed conclusion has a responsible decision-maker.

---

## Documentation

| Resource | What it covers |
|---|---|
| [Constitution](CONSTITUTION.md) | Binding authorization, verification, provenance and No-First-Use rules |
| [Unified Orchestration Blueprint](docs/ORCHESTRATION_ARCHITECTURE.md) | Dynamic mission DAG, skills, n8n, VYUHA, workflow contracts and roadmap |
| [Current Status](docs/CURRENT_STATUS.md) | Repository-maintained implementation status |
| [API](docs/API.md) | Constitutional mission, adapter, review and integrity endpoints |
| [Evidence Ledger](docs/EVIDENCE_LEDGER_V3.md) | Hash-chain model and integrity concepts |
| [Adapter Bus](docs/ADAPTER_BUS.md) | Governed source/collector contract |
| [Production Roadmap](docs/PRODUCTION_ROADMAP.md) | Durability, security, adapters and assurance |
| [Security](SECURITY.md) | Vulnerability disclosure and trust boundaries |

## Contributing & license

Contributions in adapters, scientific research skills, defensive telemetry, workflow integration, documentation, accessibility and testing are welcome. Capability contributions include an executor contract, scoped permission model, reproducible smoke-test evidence and meaningful execution outcomes.

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and the [MIT license](LICENSE). Individual third-party tools, datasets and bundled skills may carry separate licenses or usage restrictions.

---

<div align="center">

### DISHA 6.6

**Intelligence that protects. Automation that empowers. Evidence you can verify.**

**One mission. Many minds. One evidence chain.**

</div>
