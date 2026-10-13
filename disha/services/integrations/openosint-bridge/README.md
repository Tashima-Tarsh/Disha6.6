# OpenOSINT MCP bridge for DISHA 6.6

This service runs the official [OpenOSINT](https://github.com/OpenOSINT/OpenOSINT) Python package and communicates with its official stdio MCP server. Disha reaches it through an authenticated internal HTTP API; the bridge does not expose OpenOSINT's agent/REPL or arbitrary MCP execution.

## Included

- Pinned OpenOSINT package version `2.34.0` and original MCP tool definitions.
- Authenticated internal endpoints: `GET /health`, `GET /v1/tools`, and `POST /v1/tools/call`.
- Explicit tool allowlist, per-tool argument schema, input-size limits, one MCP call at a time, and a 45-second tool deadline.
- Passive tools are the default. The supplied Compose definitions do not publish a host port for the bridge.
- Identity lookups need both `DISHA_OPENOSINT_ALLOW_ACTIVE=true` and `DISHA_OPENOSINT_IDENTITY_ENUMERATION_APPROVED=true`; Disha must independently authorize the investigation.
- Upstream errors and missing provider credentials are not presented as verified findings.

## Configure

Generate a strong secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Place the secret only in the server secret store or private `.env`:

```dotenv
DISHA_OPENOSINT_BRIDGE_TOKEN=<strong-random-secret>
DISHA_OPENOSINT_BASE_URL=http://openosint-bridge:8090
DISHA_OPENOSINT_ENABLED=true
DISHA_OPENOSINT_ALLOW_ACTIVE=false
DISHA_OPENOSINT_IDENTITY_ENUMERATION_APPROVED=false
```

Optional provider keys, set only when you are entitled to use those providers:

- `ABUSEIPDB_API_KEY`
- `VIRUSTOTAL_API_KEY`
- `SHODAN_API_KEY`
- `CENSYS_API_ID` and `CENSYS_SECRET`
- `IPINFO_TOKEN` and `IP2LOCATION_API_KEY`
- `GITHUB_TOKEN`
- `HIBP_API_KEY`
- `BRIGHTDATA_API_KEY`, `BRIGHTDATA_SERP_ZONE`, and `BRIGHTDATA_UNLOCKER_ZONE`

Some providers are paid, quota-limited, or have separate terms. OpenOSINT's MIT licence does not make third-party data free or unrestricted. No LLM API key is required for deterministic MCP tool calls. OpenOSINT's agentic REPL and multi-target agent are not exposed through this bridge.

## Run in Compose

The bridge is an optional `full`-profile service. Configure the token before starting it; in this profile Disha's web app uses the URL above.

```bash
docker compose --profile full up --build -d openosint-bridge web
```

For production, keep the bridge on the internal container network, put keys in the deployment secret manager, keep active tools disabled unless reviewed, and check `/api/v1/osint/service-connectors?probe=1` through an authenticated Disha session.

Use only for authorized public-source research. A tool being available in MCP is not permission to use it; Disha's target policy and investigation-level authorization still apply. Do not send confidential indicators or URLs to third parties without reviewing their data visibility and provider terms.
