<div align="center">

<img src="docs/public/assets/disha66-architecture.svg" alt="DISHA 6.6" width="100%" />

# DISHA 6.6

### *The Constitutional Evidence Operating System*

**Evidence before conclusions. Source before claims. Human review before action.**

[![CI](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/ci.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/ci.yml)
[![E2E Constitutional Spine](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/e2e-spine.yml/badge.svg)](https://github.com/Tashima-Tarsh/Disha6.6/actions/workflows/e2e-spine.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-16a34a.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-6.6-0ea5e9.svg)](package.json)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs)](package.json)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](requirements.txt)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)](web/)

[What is DISHA?](#what-is-disha) · [🎬 3D Motion Graphic README](#premium-3d-motion-graphic-readme) · [GOD MODE](#god-mode--unified-mission-control) · [Capabilities](#capability-map) · [Skills Ecosystem](#skills-ecosystem) · [VYUHA](#vyuha--adaptive-defensive-formations) · [BharatData](#bharatdata--india-open-data-platform) · [Quick Start](#quick-start) · [Constitutional Guarantees](#constitutional-guarantees) · [Engineering](#engineering)

</div>

---

## 🎬 Premium 3D Motion Graphic README

View the interactive, offline, no-server 3D motion graphic catalog of DISHA 6.6:

**[▶ Open 3D Motion Graphic README →](README_3D_MOTION_GRAPHIC.html)**

A self-contained HTML file (no dependencies, no server required) covering:
- **Tools** — collectors, MCP, adapters, breach analysis
- **Skills** — 1,806 indexed skills, 503 expert roles, n8n workflow bridge
- **Adapters** — governed Adapter Bus + OSIRIS intelligence proxies
- **OSIRIS** — USGS earthquakes, NASA FIRMS fires, maritime, satellites, weather, CCTV, news/GDELT/osint
- **Cyber Security** — No-First-Use doctrine, deny-by-default policy gate, hash-chained evidence ledger
- **VYUHA** — adaptive defensive formations (Chakra, Garuda, Kurma, Padma, Vajra)
- **BharatData** — 9 live India government data endpoints
- **Architecture diagram** — one mission, many capabilities, one evidence chain

---

## What is DISHA?

**DISHA 6.6** is a sovereign, evidence-first intelligence and defense operating system. It is built for operators who demand that every conclusion carries its source, every decision is traceable, and no action bypasses human accountability.

It is not a dashboard. It is not a chatbot wrapper. It is an **operating system for governed intelligence work** — combining OSINT, authorized security assessment, scientific research, real-time Indian government data probing, defensive threat modeling, multi-agent skill automation, and constitutional policy enforcement into one unified mission runtime.

> **Core principle:** No observation becomes a claim, and no claim becomes a finding, until it has been sourced, hash-chained into the evidence ledger, policy-gated, and reviewed by a human.

```
Source / Sensor ──► Governed Adapter Bus ──► EvidenceEvent
                  ──► Mission Correlation ──► Policy Gate ──► Human Review ──► VERIFIED Finding
```

Everything DISHA does flows through the same constitutional spine:

```
contract → policy → evidence → test
```

---

## GOD MODE — Unified Mission Control

**GOD MODE** is DISHA's operator-governed command model. One mission. Specialized capabilities. One accountable evidence chain.

### The Mission Cycle

```
1. SCOPE    ──► Define objective, authorized targets, source restrictions, success criteria
2. PLAN     ──► Match mission to skill registry, expert roles, and registered adapters
3. EXECUTE  ──► Dispatch workflows and capabilities through policy-enforced interfaces
4. OBSERVE  ──► Record source provenance, execution state, evidence IDs, and results
5. DEFEND   ──► Evaluate signals with VYUHA formation recommendations
6. VERIFY   ──► Route evidence-supported findings through authorized human review
7. DELIVER  ──► Assemble reconstructible reports, research artifacts, timelines, and decisions
```

---

## Capability Map

DISHA 6.6 indexes **1,806 skill definitions across nine families** and **503 expert role definitions**, with a capability-readiness API for identifying execution modes and available bindings.

| Domain | DISHA Capability | Entry Point |
|---|---|---|
| **OSINT intelligence** | DNS, certificate transparency, archives, IP, GitHub public metadata | `packages/adapters/` |
| **Authorized security assessment** | Scoped infrastructure checks, network research, API configuration analysis | `packages/adapter-bus/`, `backend/` |
| **Scientific & AI research** | Numerical routines, scientific skill catalogues, code analysis | `.agents/`, `web/lib/skills/` |
| **Workflow orchestration** | Authenticated n8n integration, governed skill execution, durable jobs | `web/app/api/v1/workflows/n8n/` |
| **VYUHA defensive formations** | Threat classification, formation selection, policy-aware defensive proposals | `skills/vyuha-defense-engine/` |
| **Honeypot intelligence** | Approved deception-sensor event intake, correlation, evidence preservation | `web/lib/extensions/honeypot-evidence.ts` |
| **BharatData live probes** | Real-time queries to 9 Indian government data endpoints | `bharatdata/live/` |
| **Breach exposure awareness** | Source-qualified defensive exposure analysis, risk metadata | `web/lib/unified/breach-dataset-adapter.ts` |
| **Evidence & review** | Tamper-evident observations, verification states, review decisions | `packages/evidence-ledger/`, `packages/review/` |

---

## Skills Ecosystem

DISHA ships with a governed skill and expert-role ecosystem:

- **1,806 indexed skill definitions** across scientific computing, AI research, software engineering, design/frontend, cybersecurity, computer networking, cognitive memory, general, and intelligence/OSINT families.
- **503 expert role definitions** (`.agents/roles/`) — from cryptographer to forensic analyst — each with instructions, plugin manifest, and governance contract.
- **Skill Registry** (`web/lib/skills/`) — catalogs, resolves, and executes skills through the policy gate, with readiness states and execution-status tracking.
- **n8n Workflow Bridge** — authenticated, 8-step governed skill execution with principal propagation and fail-stop behavior.

Skills are not loose prompts. Every skill execution is routed through the Constitutional Gateway, logged to the Evidence Ledger, and requires human review before a claim is promoted to `VERIFIED`.

---

## VYUHA — Adaptive Defensive Formations

**VYUHA** (व्यूह) is DISHA's defensive doctrine — inspired by the ancient Sanskrit concept of battle formations, translated into a modern threat-analysis and response-planning framework.

```
Approved sensor / alert ──► Threat classification ──► VYUHA formation selection
                          ──► Policy & scope evaluation ──► Defensive recommendation
                          ──► Evidence capture ──► Human decision & recovery
```

### Formation Library

| Formation | Doctrine | Use Case |
|---|---|---|
| **Chakra** (Wheel) | Rotating perimeter defense | DDoS, port-scan, probe saturation |
| **Garuda** (Eagle) | High-speed precision strike on identified threat | Targeted intrusion, lateral movement |
| **Kurma** (Tortoise) | Deep defensive hardening | Persistent threat, data-exfiltration attempt |
| **Padma** (Lotus) | Layered concentric containment | Insider threat, zero-day active exploitation |
| **Vajra** (Thunderbolt) | Rapid authorized counter | Active adversary in owned perimeter |

---

## BharatData — India Open Data Platform

**BharatData** is DISHA's dedicated India government data ingestion, verification, and live probe subsystem.

### Live Adapter Matrix

| Domain | Endpoint | Mechanism | Status |
|---|---|---|---|
| **CoWIN** | `api.cowin.gov.in` + CDN + ApiSetu | 3-host fallback chain, no key | ✅ Live |
| **ECI Electoral Search** | `electoralsearch.eci.gov.in` | Captcha + JSF POST | ✅ Live |
| **VAHAN** | `vahan.parivahan.gov.in` | JSF ViewState + captcha | ✅ Live |
| **Sarathi DL** | `sarathi.parivahan.gov.in` | JSF ViewState + captcha | ✅ Live |
| **e-Challan** | `echallan.parivahan.gov.in` | POST JSON | ✅ Live |
| **Aadhaar Offline** | Signed QR in e-Aadhaar PDF | Local Verhoeff + pyzbar, zero UIDAI call | ✅ Live |
| **GST Taxpayer Search** | `services.gst.gov.in` + GSP sandbox | Public search + fallback chain | ✅ Live |
| **e-Way Bill** | `ewaybillgst.gov.in` | EWB number + vehicle lookup | ✅ Live |
| **NSSO SSO** | `sso.gov.in` | OAuth2 probe + userinfo | ✅ Live |

### Privacy Invariants

- Aadhaar raw UIDs are **never stored** — only masked `XXXX-XXXX-XXXX` references
- All offline verification is purely local cryptographic (Verhoeff algorithm)
- Live cache TTL is 24 hours with SHA-256 keyed paths

---

## DISHA Brain — Python Intelligence Graph

The `disha/brain/` module is DISHA's research and reasoning runtime, operating exclusively through a governed read-only adapter.

| Component | Role |
|---|---|
| **Knowledge Graph** | Entity relationships, contradiction detection, provenance tracking |
| **Evidence Classifier** | Tags evidence as `sensor / document / rti_record / audit_report / government_open_data` |
| **Vyuha Selector** | Maps threat class to formation recommendation |
| **Constitutional Auditor** | Validates public-authority claims against RTI-sourced sources |
| **Memory Persistence** | Durable session memory with restart-safe storage |
| **Version Router** | Routes signals to DISHA brain sub-graphs |

---

## Constitutional Guarantees

DISHA is governed by [`CONSTITUTION.md`](CONSTITUTION.md) — enforced runtime contracts, not aspirational guidelines.

| Guarantee | Enforcement |
|---|---|
| No unverified claim is surfaced to the operator | `VerificationState` gate on every evidence event |
| No action taken without human approval on sensitive paths | `PolicyDecision.requiresHumanApproval` blocks execution |
| No raw Aadhaar UID stored anywhere | Verhoeff check is ephemeral-only; only masked UIDs persist |
| No scope creep — adapters can only read, never write external state | Adapter contract enforces read-only surface |
| Every evidence event is hash-chained and non-repudiable | Evidence Ledger v2 with SHA-256 chain integrity |
| Every AI output is validated before surfacing | Output validators run on all model responses |
| Every request is authenticated and authorized | `withContext` gateway on all sensitive API routes |
| Every request carries a traceable ID | `X-Request-ID` on every response |

---

## Quick Start

### Prerequisites

```bash
Node.js 22+    Python 3.11+    Git LFS
```

### 1. Clone & Install

```bash
git clone https://github.com/Tashima-Tarsh/Disha6.6.git
cd Disha6.6
npm install
pip install -r requirements.txt
```

### 2. Environment

```bash
cp .env.example .env.local
# Fill in your API keys — see .env.example for all required variables
```

### 3. Run Web Console

```bash
cd web
npm run dev
# Opens at http://localhost:3000
```

### 4. Initialize BharatData

```bash
cd bharatdata
pip install -r requirements.txt
sqlite3 index/bharat.db < schema/aadhaar.sql
sqlite3 index/bharat.db < schema/eci.sql
sqlite3 index/bharat.db < schema/vahan.sql
sqlite3 index/bharat.db < schema/cowin.sql
sqlite3 index/bharat.db < schema/icmr.sql
sqlite3 index/bharat.db < schema/views.sql
sqlite3 index/bharat.db < schema/join.sql
python -m pytest tests -v
```

### 5. Run Health Check

```bash
cd bharatdata
python live/healthcheck.py
```

### 6. Docker (Full Stack)

```bash
docker compose up -d
# Web console: http://localhost:3000
# Brain API:   http://localhost:8000
```

---

## Engineering

### Security & Constitutional Enforcement

- Every non-health request is **authenticated**; every sensitive action is **authorized**
- All API routes are served through the `proxy` middleware with CORS, `X-Request-ID`, CSP, and strict transport headers
- No client-supplied paths, URLs, roles, model names, or user IDs are trusted
- Passwords hashed with bcrypt/argon2/scrypt; secrets in environment variables or a managed secret store
- All AI outputs validated before storage, ranking, or return
- Critical flows have **deterministic fallback logic** that explains why fallback was used
- Every request carries `X-Request-ID`; logs are structured JSON in production

### Testing

```bash
# Web / TypeScript
cd web && npm run test && npm run type-check && npm run build

# BharatData / Python
cd bharatdata && python -m pytest tests -v   # 15/15 passing

# Full suite (53 tests)
python -m pytest tests -v
```

### Repository Structure

```
Disha6.6/
├── web/                    # Next.js 15 — browser product, public API gateway
├── packages/               # Canonical constitutional packages
├── disha/brain/            # Python intelligence graph & research runtime
├── bharatdata/             # India open data platform
├── skills/                 # VYUHA defense engine
├── backend/                # Authorized security assessment backend
├── .agents/                # 503 expert role definitions
├── CONSTITUTION.md         # Governing rules — source of all policy decisions
├── ARCHITECTURE.md         # Single source of truth for system architecture
└── docker-compose.yml      # Full-stack container orchestration
```

---

<footer align="center">

**DISHA 6.6** — *One evidence chain. One mission. Accountable to the citizen.*

A governed intelligence runtime built to be the 1%: where every conclusion is sourced, every decision is policy-gated, and every finding is human-verified.

[Architecture](ARCHITECTURE.md) · [Constitution](CONSTITUTION.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

</footer>
