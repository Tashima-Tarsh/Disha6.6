# DISHA6.6 Production Repository Audit

**Audit date:** 7 October 2026  
**Scope:** production architecture, repository ownership, OSINT runtime truthfulness, stale material, failure semantics, CI gates, build context and product documentation.

This audit distinguishes repository presence from production ownership. A file being committed does not mean it belongs to the deployed product.

## Executive findings

### Critical — catalog state was being promoted to runtime state

`scripts/osint/build-lockfile.mjs` defaulted ordinary catalog entries to `EXECUTABLE_VERIFIED` and `HEALTHY`, then wrote those values back into `data/osint/upstream-registry.json`.

That logic did not prove that the executable existed in a deployed worker. It also generated synthetic functional-test targets such as demonstration domains, addresses and phone numbers. This was inconsistent with the product's "real data or no data" rule.

**Required architecture:** catalog provenance, deployment manifest and live runtime health must remain separate data planes.

### Critical — repository snapshot and runtime snapshot disagreed

At audit time the catalog contained entries labelled as executable/healthy while the checked-in runtime smoke snapshot reported the majority of command-line tools as `UNCONFIGURED`, primarily because the executables were not present in the environment that produced the smoke report.

This does not mean the owned ASTRA worker set is unusable. It means a large upstream catalog must not be represented as the live worker inventory.

**Required architecture:** the primary product should report live status only for owned runtimes and explicitly mark all other upstream projects as catalog/reference material.

### High — CI was manual-only

`.github/workflows/ci.yml` was configured only for `workflow_dispatch`. A production branch could therefore change without automatically running the main lint/test/type/audit/build gate.

**Required architecture:** pull requests and changes to `main` automatically execute the production gate; manual execution remains available.

### High — stale and archive material is large

The repository contains:

- `legacy/` — archived earlier applications/backends;
- `disha/legacy-root-src/` — a large imported historical runtime tree;
- `demos/` — demonstration payloads;
- generated lint / OSINT reports;
- internal audits and archive documentation.

The historical trees are not part of the canonical production spine defined by `ARCHITECTURE.md`.

However, `disha/legacy-root-src/` is still referenced by the optional MCP service (`disha/services/mcp/src/server.ts`). It therefore should **not** be bulk-deleted until that MCP dependency is removed or replaced.

**Immediate safe action:** remove archive/demo/generated material from Docker build contexts.  
**Later action:** migrate or retire the MCP dependency and then remove the imported historical tree in a dedicated deletion PR.

### High — production build contexts included irrelevant repository material

Root-context worker builds did not exclude the major archive/demo/report trees. This increases context upload, cache invalidation and remote build time without increasing product capability.

**Required architecture:** build contexts contain only runtime-owned material and explicitly required upstream source trees.

### Medium — non-portable local interpreter configuration

`pyproject.toml` contained a Windows-specific `pyrefly` interpreter path. That path is tied to one workstation and does not belong in a portable production repository.

### Medium — empty search could become a real search

Universal OSINT helper and some search routes contained fallbacks that could substitute a real phrase when an input was empty. For an investigative system, an empty target must not silently become another target.

**Required architecture:** reject missing investigation input or use a product-specific dashboard brief endpoint whose default subject is explicit by design.

### Medium — runtime report artifacts are source snapshots, not telemetry

`data/osint/runtime-status.json` and `reports/osint-runtime-report.*` are generated snapshots. They can be useful as audit artifacts but must not be cited as the current deployment state unless generated from that deployment at release time.

### Medium — advanced worker depends on Git submodules

The advanced ASTRA worker copies SpiderFoot, Recon-ng, Recon-ng Marketplace and Photon from submodule paths.

A checkout that does not initialize submodules can fail to build this worker.

**Operational requirement:** production checkout/deployment must initialize the required submodules, or a future hardening pass should replace those source-tree copies with immutable release artifacts.

## Canonical production spine

The production-owned system is:

- `web/`
- `web/services/`
- `web/lib/server/`
- `web/lib/unified/`
- `web/scripts/`
- `disha/brain/`
- `infra/`
- `data/osint/` as catalog/provenance metadata
- `scripts/osint/` as catalog/runtime verification tooling

Everything else requires an explicit production owner and promotion path.

## OSINT ownership model

### Native governed adapter bus

The default bus contains owned adapters for DNS, certificate transparency, RDAP, RIPEstat, Wayback, Common Crawl, GDELT, CISA KEV, NVD, FIRST EPSS, SEC EDGAR, Wikidata, OpenAlex, World Bank, CelesTrak, NOAA SWPC, ReliefWeb, OpenSanctions, OpenCorporates, NHTSA VIN, Indian vehicle format validation, ThreatFox, MalwareBazaar, OpenCTI, IntelOwl and governed dynamic/official-source adapters.

### ASTRA6 managed worker manifest

The owned worker manifest defines:

- PhoneInfoga
- Sherlock
- Maigret
- Holehe
- Instaloader
- Telegram Public Metadata / Telethon
- theHarvester
- SpiderFoot
- OWASP Amass
- ProjectDiscovery Subfinder
- Recon-ng
- Photon

The primary investigation router currently routes only to the appropriate subset for the selected target and policy state.

### Upstream catalog

The larger upstream registry is an inventory/research/provenance layer. An entry can be upstream-verified while remaining absent from the deployed runtime.

## Stale / generated material disposition

| Path | Audit classification | Action |
| --- | --- | --- |
| `legacy/` | archive | keep out of build; delete later in dedicated history-cleanup PR if no retained requirement |
| `disha/legacy-root-src/` | archive with optional MCP dependency | keep out of production build; do not delete until MCP dependency is removed |
| `demos/` | demonstration data | keep out of production build |
| `lint_report.txt` | generated/stale artifact | safe to remove from tracked source |
| `reports/osint-runtime-report.*` | generated snapshot | do not treat as live telemetry |
| `predictive_risk_report.json` | generated analysis input/output | not canonical production state; script dependency must be considered before deletion |
| internal/archive docs | historical documentation | keep out of production images |

## Production failure semantics

The following are the desired truth-preserving states:

- source absent → `NOT_CONFIGURED` / `UNAVAILABLE`
- credential absent → `AUTH_REQUIRED`
- policy absent → `RESTRICTED` / blocked by policy
- worker heartbeat absent → `DEGRADED` or `UNCONFIGURED`
- rate limit → `RATE_LIMITED`
- provider timeout → failed/timed-out source
- no returned records → empty evidence set
- database absent → live-unpersisted / persistence-unconfigured
- upstream project known but no owned runtime → `CATALOGED`
- archive code → no production status at all

## Performance architecture recommendations

### Implemented or safe in this hardening pass

1. Remove historical/demo/generated material from Docker context.
2. Automatic CI on PR and main changes.
3. Separate catalog status from live runtime status.
4. Remove workstation-specific configuration.
5. Fail closed on missing investigation input.
6. Rewrite the README around product and runtime contracts rather than ephemeral infrastructure claims.

### Recommended follow-up work

1. Remove the MCP dependency on `disha/legacy-root-src/tools`, then delete the imported legacy tree.
2. Replace advanced-worker submodule source copies with immutable, checksummed upstream release artifacts or internally built signed images.
3. Move runtime smoke output to an ignored runtime-artifact directory rather than mutating catalog source files.
4. Generate an SBOM for each deployable image and tie it to the release commit.
5. Add release-level integration tests that boot the production compose topology and verify worker heartbeats, migrations, auth, source failures and evidence cleanup.
6. Add deployment SLOs and external alerting for web availability, database saturation, worker queue age, provider error rate and evidence-write latency.
7. Add a catalog/runtime drift check: an ASTRA manifest, worker image and investigation route should not be allowed to disagree silently.

## Verification boundary

This audit is based on repository code, configuration and checked-in runtime snapshots. It does **not** claim that a specific GCP deployment is healthy. Deployment health must be established from the running environment and its release commit.
