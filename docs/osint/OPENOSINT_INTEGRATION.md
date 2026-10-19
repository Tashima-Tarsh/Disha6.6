# OpenOSINT Integration Architecture & Operator Guide

## 1. Executive Summary

Official Upstream: [OpenOSINT/OpenOSINT](https://github.com/OpenOSINT/OpenOSINT)  
Pinned Release: `v2.34.0` (`commit 32c9ac9200febfecc7e38ce3cb892e9da271cbba`)  
Licence: **MIT Licence** (Permissive commercial & defensive use)  
Integration Location: `disha/services/integrations/osint-upstreams/OpenOSINT`  
Feature Branch: `feat/openosint-integration`

OpenOSINT is integrated into DISHA 6.6 as a first-class, governed intelligence component. Rather than serving as an isolated script or external container, it interfaces directly with DISHA's Investigation Engine, Evidence Ledger, Target Router, and Unified Bus through a typed, authenticated Model Context Protocol (MCP) client and an internal HTTP bridge.

---

## 2. Architecture & Request Flow

```
                      +---------------------------------------+
                      |       DISHA 6.6 Investigation UI      |
                      |        & Unified Investigation API     |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |       Target Route Registry           |
                      |   (domain, ip, email, repo, etc.)     |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |        Governed OSINT Bus             |
                      |  - openosint-dns    - openosint-ip    |
                      |  - openosint-rdap   - openosint-github|
                      |  - openosint-whois  - openosint-breach|
                      |  - openosint-dorks  - openosint-mcp   |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |    OpenOSINT MCP Client (TypeScript)   |
                      |   - Passive/Active policy check       |
                      |   - Investigation purpose validation  |
                      |   - Health & Dynamic list_tools cache |
                      +---------------------------------------+
                                     /         \
                      (Transport: stdio)     (Transport: HTTP Bridge)
                                   /             \
                                  v               v
            +---------------------------+   +---------------------------+
            |  Local Python MCP Server  |   |  FastAPI Bridge Service   |
            |  `python -m openosint...` |   |  `bridge.py` (Port 8055)  |
            +---------------------------+   +---------------------------+
                                  \               /
                                   \             /
                                    v           v
                      +---------------------------------------+
                      |       Official OpenOSINT Core         |
                      |       (20+ Built-in MCP Tools)        |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |     DISHA Evidence Normalizer         |
                      |  - SHA-256 Content Hash               |
                      |  - SHA-256 Provenance Hash            |
                      |  - Evidence Ledger Durable Store      |
                      +---------------------------------------+
```

### Transport Modes
1. **Stdio MCP Transport (Local Development):**
   - Automatically utilizes the Python virtual environment at `disha/services/integrations/osint-upstreams/OpenOSINT/.venv` or `OPENOSINT_PYTHON_PATH`.
   - Spawns `python -m openosint.mcp_server` and communicates over standard input/output using JSON-RPC 2.0 protocol (`initialize` -> `notifications/initialized` -> `tools/list` -> `tools/call`).
   - Handles EPIPE signals gracefully and limits execution lifetime with bounded timeouts.

2. **HTTP Bridge Transport (Docker / Production):**
   - Executes `bridge.py` inside the containerized service (`openosint:8055`).
   - Requires internal Bearer token authentication via `OPENOSINT_SERVICE_TOKEN`.
   - Exposes `/health`, `/tools` (dynamic MCP tool discovery), and `/run/{tool_name}`.

---

## 3. Tool Policy & Safety Guardrails

OpenOSINT adheres strictly to DISHA's defensive research mandates:

1. **Passive-by-Default:**
   - Tools classified as `Noise.PASSIVE` (DNS resolution, RDAP, WHOIS, Google dork generation, passive IP lookup, public GitHub searches) execute without touching the target infrastructure.
2. **Active Reconnaissance Guards:**
   - Active tools (e.g. `scrape_url`) and noisy tools require `DISHA_ACTIVE_RECON_APPROVED=true` in the environment AND per-investigation operator authorization (`activeAuthorization: true`).
3. **Identity Enumeration Guards:**
   - Identity tools (`search_username`, `search_email`, `search_phone`) require `DISHA_IDENTITY_ENUMERATION_APPROVED=true` AND per-investigation authorization (`identityAuthorization: true`). Without both, requests fail closed with `identity_authorization_required`.
4. **Truthful "Real Data or No Data" Invariant:**
   - Missing third-party API credentials (e.g. Shodan, HaveIBeenPwned) produce an accurate `AUTH_REQUIRED` status with the specific required key name (`[key_required]`).
   - DISHA never generates synthetic indicators, mock records, or hallucinated intelligence.

---

## 4. Governed Adapters & Target Routing

| Adapter ID | Target Types | Authority Level | Execution Class | Description |
|---|---|---|---|---|
| `openosint-dns` | `domain`, `url` | Primary | Passive Public | DNS records, SPF, DMARC, DKIM, MX inspection |
| `openosint-rdap` | `domain`, `ip`, `url`, `asn` | Primary | Authoritative Registry | Structured domain registration & registrar details |
| `openosint-whois` | `domain`, `url` | Primary | Authoritative Registry | Registrar WHOIS records |
| `openosint-dorks` | `domain`, `person_name`, `company`, `topic` | Secondary | Public Discovery | Google dork search queries for target footprinting |
| `openosint-ip` | `ip`, `domain` | Secondary | Curated CTI | Reverse DNS, ASN routing, and AbuseIPDB reputation |
| `openosint-github` | `repository`, `url`, `topic` | Primary | Public Discovery | Public repositories, commits, and developer footprint |
| `openosint-breach` | `email` | Secondary | Curated CTI | HaveIBeenPwned breach verification (requires key) |
| `openosint-mcp` | `domain`, `ip`, `email`, `repository` | Aggregator | Governed MCP | Dynamic multi-tool execution framework |

---

## 5. Configuration & Environment Variables

| Variable | Required? | Default | Purpose & Source |
|---|---|---|---|
| `OPENOSINT_BASE_URL` | Optional | `""` (uses stdio) | HTTP bridge URL (`http://openosint:8055` in Docker) |
| `OPENOSINT_SERVICE_TOKEN` | Optional | `""` | Internal shared secret for HTTP bridge authorization |
| `OPENOSINT_PYTHON_PATH` | Optional | auto-detected | Path to Python binary with OpenOSINT installed |
| `OPENOSINT_TIMEOUT_MS` | Optional | `30000` | Maximum tool execution timeout (in ms) |
| `SHODAN_API_KEY` | Optional | `""` | Shodan host/IP intelligence ([account.shodan.io](https://account.shodan.io/)) |
| `HIBP_API_KEY` | Optional | `""` | HaveIBeenPwned breach checks ([haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key)) |
| `ABUSEIPDB_API_KEY` | Optional | `""` | AbuseIPDB reputation reports ([abuseipdb.com/api](https://www.abuseipdb.com/api)) |
| `HUNTER_API_KEY` | Optional | `""` | Hunter.io email pattern lookup ([hunter.io/api](https://hunter.io/api)) |
| `BUILTWITH_API_KEY` | Optional | `""` | BuiltWith tech stack analysis ([builtwith.com](https://builtwith.com)) |
| `GITHUB_TOKEN` | Optional | `""` | GitHub PAT for higher API rate limits ([github.com/settings/tokens](https://github.com/settings/tokens)) |
| `GREYNOISE_API_KEY` | Optional | `""` | GreyNoise scanner intelligence ([viz.greynoise.io](https://viz.greynoise.io)) |
| `VIRUSTOTAL_API_KEY` | Optional | `""` | VirusTotal threat analysis ([virustotal.com](https://www.virustotal.com)) |

---

## 6. Local Setup Instructions (Windows)

### Prerequisites
- Python 3.12+ (managed by `uv` or installed on system)
- Node.js 20+

### Steps
1. Navigate to OpenOSINT upstream:
   ```powershell
   cd d:\Disha6.6\disha\services\integrations\osint-upstreams\OpenOSINT
   ```
2. Create and activate virtual environment:
   ```powershell
   uv venv .venv
   .\.venv\Scripts\activate
   ```
3. Install dependencies in editable mode:
   ```powershell
   uv pip install -e .
   uv pip install fastapi uvicorn mcp
   ```
4. Verify CLI and MCP server:
   ```powershell
   openosint --help
   python -m openosint.mcp_server
   ```
5. (Optional) Run the HTTP bridge locally:
   ```powershell
   python bridge.py
   # Service listens at http://127.0.0.1:8055
   ```

---

## 7. Production & Docker Deployment

The OpenOSINT service is containerized via `infra/openosint/Dockerfile` and integrated into `docker-compose.yml` and `docker-compose.prod.yml`:

```bash
# Build and run OpenOSINT along with DISHA services
docker compose --profile full up --build -d openosint web
```

### Healthcheck
```bash
# Probing OpenOSINT health
curl -s http://localhost:8055/health
# Response: {"status":"healthy","version":"2.34.0","total_tools":20}
```

### DISHA Status Endpoint
DISHA exposes OpenOSINT's dynamic status, tools catalog, and configuration posture via:
`GET /api/v1/osint/openosint` (requires authenticated `agent:read` context).

---

## 8. Verification & Test Evidence

- **Unit & Integration Tests:**
  `npx vitest run tests/openosint-mcp-integration.test.ts`
  - Dynamic tool discovery: **PASSED**
  - Search dork generation: **PASSED**
  - Passive DNS resolution: **PASSED**
  - Identity enumeration blocking: **PASSED**
  - Missing key detection: **PASSED**
  - Evidence normalization (SHA-256 hashes): **PASSED**
  - Route registry mapping: **PASSED**
- **Full Test Suite:**
  `npm run test` under `web/`
  - 60 test suites passed, 1 skipped, 456 tests passed, 0 failures.
- **TypeScript Typecheck:**
  `npm run type-check` under `web/`
  - 0 type errors (`tsc --noEmit` exited with code 0).
- **Production Build:**
  `npm run build` under `web/`
  - Next.js standalone build completed successfully in 38.7s across all 69 routes.
