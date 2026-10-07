# DISHA 6.6 — Canonical Production Runtime Architecture

## 1. System Identity and Infrastructure Baseline

DISHA 6.6 is an enterprise intelligence operating system deployed exclusively on Google Cloud Platform (GCP).

- **Cloud Platform**: Google Cloud Platform (GCP) Compute Engine
- **Instance**: `disha-os-core`
- **Zone**: `asia-south1-a`
- **Production IP**: `35.244.9.142`
- **Public Domain**: `https://disha6.6.thenitishkr.in`
- **Reverse Proxy**: Caddy (automatic TLS termination via Let's Encrypt / ZeroSSL)
- **Deployment Strategy**: Containerized systemd-managed Docker Compose (`/etc/systemd/system/disha-os.service`)
- **Prohibited Platforms**: Render, Netlify, Vercel, or unmanaged shared platforms.

---

## 2. Canonical Core Components

### 2.1 Web Application (Core Gateway & Interface)
- **Directory**: `web/`
- **Framework**: Next.js 14 (App Router, Node 20 LTS runtime)
- **Deployment Mode**: Standalone output container (`disha-web`)
- **Primary Routes**:
  - `/investigate`: Default authenticated investigation universe (search-first UX, 3D source galaxy, ephemeral query clearance)
  - `/dashboard`: Operational picture, mission tracking, and situation room
  - `/api/v1/health`: System health status, database ping, worker heartbeats, and canonical git build SHA
  - `/api/v1/unified-search`: Real multi-source OSINT target routing and orchestrator
- **Zero Mock Enforcement**: All mock, synthetic, and placeholder intelligence providers are strictly forbidden from entering investigation result pipelines.

### 2.2 Intelligence Brain (`disha-brain`)
- **Directory**: `brain/`
- **Framework**: Python 3.11 FastAPI service
- **Responsibilities**: Vector embedding generation, semantic similarity scoring, entity extraction, and target classification.
- **Port**: `8000` (internal network only)

### 2.3 Database and Vector Storage (`disha-postgres`)
- **Engine**: PostgreSQL 16 with `pgvector` extension
- **Responsibilities**: Relational persistence for cases, intelligence records, evidence provenance, and worker heartbeats (`disha_worker_heartbeats`).
- **Port**: `5432` (internal network only)

### 2.4 High-Speed Message Queue (`disha-redis`)
- **Engine**: Redis 7 Alpine
- **Responsibilities**: Job dispatch queue, ephemeral result caching, rate-limit state coordination.
- **Port**: `6379` (internal network only)

---

## 3. Canonical Worker Architecture

DISHA 6.6 decouples execution into bounded worker families running inside specialized container images to avoid dependency pollution:

### 3.1 Identity Worker (`osint-identity-worker`)
- **Dockerfile**: `infra/workers/Dockerfile.identity-worker`
- **Responsibilities**: Passive username enumeration, phone carrier and reputation intelligence, authorized profile queries.
- **Pinned Engines**:
  - Sherlock (Python 3.10 venv)
  - Maigret (Python 3.10 venv)
  - PhoneInfoga (Compiled Go binary)
  - Holehe (Python 3.10 venv)
- **Safety Gate**: Requires explicit policy clearance (`DISHA_IDENTITY_ENUMERATION_APPROVED=true`).

### 3.2 Infrastructure Worker (`osint-infrastructure-worker`)
- **Dockerfile**: `infra/workers/Dockerfile.infrastructure-worker`
- **Responsibilities**: Passive DNS enumeration, certificate transparency discovery, domain asset mapping.
- **Pinned Engines**:
  - OWASP Amass (Compiled Go binary with `-passive` flag enforced)
  - ProjectDiscovery Subfinder (Compiled Go binary)
  - theHarvester (Python 3.11 venv with passive search engine allowlist)

### 3.3 Advanced Reconnaissance Worker (`osint-advanced-worker`)
- **Dockerfile**: `infra/workers/Dockerfile.advanced-worker`
- **Responsibilities**: Multi-source correlation, passive module aggregation, authorized crawler modules.
- **Pinned Engines**:
  - SpiderFoot (Python 3.10 venv with passive module allowlist)
  - Recon-ng (Python 3.10 venv)
  - Photon (Python 3.10 venv with strict target domain boundary and active authorization gate)
- **Safety Gate**: Active crawling requires `activeAuthorization: true` persisted in dispatch run inputs; otherwise blocked by policy.

---

## 4. OSINT Upstream Registry and Lockfile Provenance

- **Master Registry**: `data/osint/upstream-registry.json` (512 distinct upstream projects)
- **Runtime Lockfile**: `data/osint/runtime-lock.json` (Immutable pinned SHAs, package versions, SPDX licenses, container assignments, and functional smoke targets)
- **Manifest Definitions**: `web/lib/unified/astra6-tool-manifest.ts` and `data/osint/manifests/*.json`
- **Output Parsers**: `web/lib/unified/astra6-output-parsers.ts` (Zero-mock typed standard schemas normalizing raw CLI stdout into structured evidence)
- **Service Connectors**: `web/lib/unified/osint-service-connectors.ts` (Authenticating OpenCTI, IntelOwl, and enterprise threat intelligence APIs)

---

## 5. Prohibited and Deprecated Code

1. **Synthetic / Mock Intelligence**: Any test mock in `web/tests/fixtures` or mocks in testing files are restricted strictly to Vitest unit test harnesses. Under no circumstances may mock providers be imported into `web/lib/unified` or runtime API routes.
2. **Duplicate Service Adapters**: `web/lib/unified/osint-service-adapters.ts` has been permanently removed in favor of `osint-service-connectors.ts`.
3. **Third-Party Hosting Manifests**: `render.yaml` or alternate PaaS deployment files are deprecated and ignored.
4. **Shell Injection Surface**: Targets passed to workers must strictly satisfy regex sanitization (`validateCommandTarget`) blocking shell metacharacters (`;&|\`$(){}[]<>!`).
