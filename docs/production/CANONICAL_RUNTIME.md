# DISHA6.6 — Canonical Production Runtime Contract

This document defines the production ownership and runtime boundaries of DISHA6.6. It intentionally avoids hard-coded instance IPs, deployment commit SHAs, and source-catalog counts because those are deployment or release observations, not architecture.

## 1. Canonical product boundary

DISHA6.6 is a governed evidence and intelligence operating system. The canonical production spine is:

- `web/` — authenticated application, API gateway, investigation orchestration, policy, evidence and runtime control.
- `web/services/` — application services for investigations and related workflows.
- `web/lib/server/` — authentication, persistence, audit, rate limiting and server-only controls.
- `web/lib/unified/` — source adapters, target routing, evidence contracts, ASTRA integration and runtime policy.
- `web/scripts/` — production workers and operational processes.
- `disha/brain/` — isolated governed analysis/research service.
- `infra/` — production database and worker images plus infrastructure definitions.
- `data/osint/upstream-registry.json` — upstream catalog and provenance metadata.
- `scripts/osint/` — catalog verification, deployment-manifest generation and environment-local runtime probes.

Historical, demo and imported trees are not production merely because they remain in the monorepo.

## 2. Reference production topology

The reference topology in `docker-compose.prod.yml` contains:

| Service | Responsibility |
| --- | --- |
| `postgres` | PostgreSQL 16 persistence, PostGIS/pgvector-capable image, investigation and worker state |
| `redis` | cache/runtime coordination where used by product services |
| `embeddings` | isolated embedding runtime |
| `disha-brain` | governed Python analysis/research service |
| `web-migrate` | schema migration before application startup |
| `web` | Next.js 16 standalone application and API |
| `astra6-identity-worker` | governed identity OSINT worker |
| `astra6-infrastructure-worker` | passive infrastructure OSINT worker |
| `astra6-advanced-worker` | passive/authorized advanced OSINT worker |
| `dynamic-worker` | internal scheduler/workflow background execution |

The actual cloud placement, hostname, external IP, TLS edge and release SHA belong to deployment inventory and release metadata, not this architecture contract.

## 3. Web application

- **Directory:** `web/`
- **Framework:** Next.js 16
- **Node runtime:** Node.js 22
- **Production mode:** standalone container
- **Authenticated investigation surface:** `/investigate`
- **Health:** `/api/v1/health`
- **Runtime status:** `/api/v1/runtime/status`
- **Production readiness:** `/api/v1/production/readiness`
- **OSINT tool registry/runtime view:** `/api/v1/osint/tools`, `/api/v1/osint/tools/health`

The web process does not run heavy ASTRA command-line tools inside request handlers.

## 4. DISHA Brain

- **Directory:** `disha/brain/`
- **Runtime:** Python service
- **Reference internal port:** `8080`
- **Role:** bounded analysis/research behind a governed adapter boundary.

Brain output is analysis. It does not automatically become verified evidence.

## 5. Persistence

### PostgreSQL

PostgreSQL is the durable source of truth for product state that requires persistence. Production schema includes evidence, investigation/workflow state and ASTRA worker/run state.

### Redis

Redis is an auxiliary runtime dependency for cache/coordination patterns. It is not a substitute for durable evidence persistence.

### Evidence rule

If durable persistence is unavailable, the product must expose that condition. It must not label an unpersisted observation as durably admitted evidence.

## 6. ASTRA6 execution plane

Heavy OSINT execution is separated into worker classes.

### Identity worker

- **Dockerfile:** `infra/workers/Dockerfile.identity`
- **Owned tools:** PhoneInfoga, Sherlock, Maigret, Holehe, Instaloader, Telegram Public Metadata/Telethon.
- **Controls:** non-root user, read-only runtime posture, bounded arguments, worker heartbeat, deployment enable flags.
- **Policy:** identity-sensitive investigation execution requires deployment approval and per-investigation operator/admin authorization.

### Infrastructure worker

- **Dockerfile:** `infra/workers/Dockerfile.infrastructure`
- **Owned tools:** ProjectDiscovery Subfinder, OWASP Amass and theHarvester.
- **Posture:** passive infrastructure discovery only.

### Advanced worker

- **Dockerfile:** `infra/workers/Dockerfile.research-osint`
- **Owned tools:** SpiderFoot, Recon-ng and Photon.
- **Posture:** passive module allowlists for SpiderFoot and Recon-ng; Photon is policy-gated active crawling.
- **Source dependency:** this image currently copies selected upstream Git submodules. Production checkout/build must initialize them until they are replaced with immutable release artifacts or signed internal images.

### Queue and heartbeat

ASTRA jobs are persisted in PostgreSQL. Workers claim eligible queued jobs, re-check policy, update run status and publish heartbeats. A catalog entry or source manifest is not a heartbeat.

## 7. Native governed source plane

The default adapter bus owns public/source connectors including:

- public DNS
- certificate transparency
- RDAP
- RIPEstat
- Wayback CDX
- Common Crawl
- GDELT
- CISA KEV
- NVD
- FIRST EPSS
- SEC EDGAR
- Wikidata
- OpenAlex
- World Bank
- CelesTrak
- NOAA SWPC
- ReliefWeb
- NHTSA VIN
- India vehicle-registration format validation
- ThreatFox
- MalwareBazaar
- OpenSanctions
- OpenCorporates
- OpenCTI
- IntelOwl
- governed dynamic public sources
- official public-source probes

Each source can independently be healthy, unavailable, unconfigured, credential-gated, rate-limited or failed.

## 8. OSINT catalog vs deployment manifest vs live runtime

These are deliberately separate.

### Upstream catalog

`data/osint/upstream-registry.json`

Purpose: upstream discovery, ownership, license, source revision, capabilities and provenance metadata.

An upstream project being verified means its upstream can be verified at that point in time. It does **not** mean the tool exists in a deployed container.

### Deployment lock

Generated with:

```bash
node scripts/osint/build-lockfile.mjs
```

Output:

```
.disha/osint/runtime-lock.json
```

Purpose: environment/release-local deployment classification. It is ignored by Git so it cannot become a stale source-of-truth artifact.

The lock never stores a fabricated investigation target and does not claim live health. It records whether a catalog entry is owned by ASTRA, a service connector, reference-only, or catalog-only.

### Runtime probe

Generated with:

```bash
npm run osint:health
```

Output:

```
.disha/osint/runtime-status.json
```

Purpose: report the environment in which the probe actually ran.

### Runtime report

Generated with:

```bash
npm run osint:report
```

Output:

```
.disha/osint/reports/
```

The report explicitly separates catalog metadata from the optional environment-local runtime snapshot.

## 9. Truthful status model

| State | Meaning |
| --- | --- |
| `CATALOGED` | known upstream/reference; no live executor implied |
| `RUNTIME_MANIFESTED` | DISHA owns an execution contract, but live health still requires a probe |
| `CREDENTIAL_REQUIRED` | the owned connector needs credentials/entitlement |
| `POLICY_RESTRICTED` | execution requires explicit policy approval |
| `UNCONFIGURED` | required deployment capability is not configured |
| `DEGRADED` | runtime exists but current health is impaired |
| `REFERENCE_ONLY` | catalog/dataset/library/GUI reference, not an executable worker |
| `HEALTHY` | live deployment probe or heartbeat established runtime health |
| `NO_RESULTS` | execution succeeded without source-backed records |

No script may convert catalog presence into `HEALTHY` without a live runtime basis.

## 10. Security and policy boundaries

Production execution must preserve:

1. validated targets;
2. shell-metacharacter rejection for ASTRA commands;
3. `execFile`/argument-based execution instead of shell interpolation;
4. explicit source/tool allowlists;
5. bounded timeouts and output sizes;
6. non-root worker containers;
7. read-only filesystems where practical;
8. explicit credential configuration;
9. identity and active-recon authorization gates;
10. SSRF-aware outbound retrieval;
11. audit/provenance for governed actions;
12. fail-closed behavior when configuration or policy is absent.

## 11. Repository archive boundary

The following are retained history/research, not canonical product runtime:

- `legacy/`
- `disha/legacy-root-src/`
- `demos/`
- archive/internal design documents
- generated local reports

`disha/legacy-root-src/` currently has an optional MCP-service dependency and therefore requires a deliberate migration before physical deletion. Production Docker contexts exclude these trees so they do not inflate application/worker builds.

## 12. Release readiness

A source commit is not production-ready merely because it builds.

A release should establish, on the exact deployable commit:

- lint, tests, type checks and production build;
- dependency/security audit;
- database migration success;
- database health;
- required worker heartbeats;
- provider/credential configuration;
- policy state;
- evidence-write behavior;
- cleanup/expiry behavior;
- backup/restore readiness;
- external monitoring and alert routing.

The running environment is authoritative for operational readiness.
