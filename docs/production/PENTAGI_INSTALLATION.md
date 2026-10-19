# PentAGI in DISHA6.6

The installation lives in `D:\Disha6.6`. The upstream Community Edition source is checked out at `integrations/pentagi/upstream`; the existing vendored `disha/services/integrations/Pentagi` tree is preserved. Runtime versions and image digests are recorded in `infra/pentagi/upstream.lock.json`.

## Operations

Run these commands from the DISHA6.6 repository in PowerShell:

```powershell
.\scripts\pentagi.ps1 install
.\scripts\pentagi.ps1 start
.\scripts\pentagi.ps1 status
.\scripts\pentagi.ps1 verify
.\scripts\pentagi.ps1 stop
.\scripts\pentagi.ps1 credentials
```

The local address is `http://127.0.0.1:8443`. HTTP is intentional for this loopback-only installation. The database and browser service have no published host ports. Deployments exposed beyond the workstation need a TLS reverse proxy and explicit origin configuration.

`install` generates installation secrets in the ignored `infra/pentagi/.env`, creates a Windows DPAPI-encrypted administrator credential in `infra/pentagi/credentials.local.xml`, and rotates the upstream seeded password through the authenticated password-change API. The `credentials` command explicitly displays that credential for the current Windows user. Do not commit or share either file. `stop` preserves the database and evidence.

The System console at `/system` obtains PentAGI availability through the existing authenticated `/api/v1/runtime/status` endpoint and offers a link to its separate login. This is a platform handoff. DISHA6.6 does not automatically submit targets, execute flows, or import PentAGI output as verified case evidence.

## Local Inference

PentAGI uses the existing `disha-local-ai` Docker container over the additional `disha66-pentagi-models` network. Start DISHA6.6's Ollama container before running `install` or `start`; the script reconnects that container if it was recreated. The PentAGI database and scraper stay on their own Compose network.

Inference uses the genuine upstream `qwen2.5:3b` model and vector retrieval uses `nomic-embed-text`. Both are downloaded by the install script. `infra/pentagi/ollama.provider.yml` maps agent roles to the same local model with bounded response sizes. A 3B model is a resource compromise; installation and a successful tool-call smoke test do not establish reliable completion of complex autonomous investigations.

The 2026-10-15 review found existing local tags labelled `qwen2.5:7b` and `deepseek-r1:8b` containing a 494.03M Qwen model. These aliases are preserved so other work is not overwritten. They should not be cited as proof that genuine 7B Qwen or 8B DeepSeek weights are installed.

## Execution Access

PentAGI's non-root process has access to the Docker daemon socket so the upstream platform can create tool containers. Membership in the socket's group grants control of the local Docker daemon. Loopback binding limits network exposure but does not reduce that privilege. `DOCKER_INSIDE=false` prevents handing the Docker socket to worker containers; `DOCKER_NET_ADMIN=false` disables that optional capability. Human questions are enabled with `ASK_USER=true`; this setting is not a sandbox or a per-command authorization guarantee.

No target test flow is started by installation. Use the PentAGI interface to define scope for systems you control or are authorized to assess.

## Optional Services

The full upstream source includes these optional stacks, which are not started by the local installation:

| Stack | Upstream file |
| --- | --- |
| Graphiti and Neo4j | `docker-compose-graphiti.yml` |
| Langfuse and its dependencies | `docker-compose-langfuse.yml` |
| Grafana and infrastructure telemetry | `docker-compose-observability.yml` |

They require additional memory, configuration, credentials, and a separate review of their published ports. The current Docker VM has approximately 8 GB RAM shared with DISHA6.6, Ollama, IRIS, and Flowsint. Existing IRIS or Flowsint stores are not reused as PentAGI stores.

Community Edition has REST and GraphQL APIs. The pinned upstream documentation explicitly distinguishes Enterprise MCP support from this Community Edition; no PentAGI MCP connector is advertised here.

## Updates

Review upstream commits and open pull requests before changing the source commit or image digests. The installation never pulls or merges an open pull request. The lock pins the application image to upstream commit `843dfeb4bfc809c09d1bc5022e567c602d8fc9dd`. PostgreSQL uses the existing official pgvector PostgreSQL 16 image under a separate database volume. The scraper uses upstream's pinned image; its old publication date remains a dependency-review concern.
