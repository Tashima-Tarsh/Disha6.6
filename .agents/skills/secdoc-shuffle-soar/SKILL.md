---
name: shuffle-soar
description: Use when building or calling Shuffle SOAR workflows via API.
version: 1.0.0
author: CIPHER
license: MIT
metadata:
  hermes:
    tags: [shuffle, soar, automation, api, soc]
    related_skills: [wazuh, graylog]
---

# Shuffle SOAR (API + workflow-as-code)

Building and driving Shuffle workflows programmatically instead of through the drag-and-drop UI.
Durable mechanics are stated as fact; anything that varies by deployment (host, ports, licensing,
credential names) is called out so you confirm it against the target instance. Written against a
self-hosted, unlicensed Shuffle; Shuffle Cloud differs where noted.

## When to Use

Load when the task involves Shuffle SOAR via its API rather than the UI:
- Creating, editing, or reordering a workflow programmatically (workflow-as-code).
- Calling Shuffle endpoints: execute a workflow, read results, manage app auth, use the datastore.
- Wiring an alert source (e.g. a SIEM integration) to a Shuffle webhook trigger.
- Debugging why a Shuffle node reference, app auth, or an on-prem feature (AI, schedule, list_cache)
  fails.
NOT for pure UI click-through guidance, and not for SIEM detection logic itself (compose with a SIEM
skill such as wazuh / graylog).

## Connection & auth

Self-hosted Shuffle typically exposes the UI on one port and the API on another (commonly `3001` UI /
`3443` API on the appliance — confirm for your host). Self-signed TLS is normal → `curl -sk`.

- Auth header: `Authorization: Bearer <apikey>`.
- **The apikey is the UUID** shown on the user Profile → Apikey field. It is NOT the account password.
  A frequent trap: storing the login password and trying to use it as a Bearer token → 401. Keep the
  apikey (UUID) and the password as separate secrets, and use the apikey for the API.
- Probe: `GET /api/v1/me` → 200 with `{admin, org}` confirms auth and shows your org id.

## Key endpoints

| Purpose | Endpoint |
|---------|----------|
| Identity / org | `GET /api/v1/me` |
| Workflows | `GET /api/v1/workflows`, `GET/PUT /api/v1/workflows/{id}`, `POST /api/v1/workflows` |
| Execute | `POST /api/v1/workflows/{id}/execute` body `{"execution_argument":"<json-string>"}` → `execution_id` |
| Result | `GET /api/v1/streams/results` (POST `{execution_id}`) |
| Apps / actions | `GET /api/v1/apps` |
| App auth | `GET /api/v1/apps/authentication`; update = `PUT` with `action:update` in the body |
| Datastore (org cache) | `POST /api/v1/orgs/{org}/set_cache` / `delete_cache` (body: key, value, category, org_id) |
| Webhook receive | `POST /api/v1/hooks/webhook_{trigger_id}` (the hook itself takes no auth) |

## Workflow-as-code (the hard-won part)

Shuffle is a visual builder; its API is best at triggering and reading workflows. Authoring complex
graphs via API is possible but has sharp edges:

- **Authoring = whole-object PUT.** There is no per-node create API. Read the full workflow JSON
  (actions, triggers, branches, positions), mutate it, and PUT it back. Adapt node/branch/parameter
  SHAPES from a known-good workflow rather than hand-inventing the schema. Build incrementally and
  read-back-verify each save.
- **`execute_python` returns STDOUT**, not a return value. Emit results with `print(json.dumps(...))`,
  NOT `return {...}` or `exit({...})` (those produce a status wrapper, not your data). Downstream, the
  result is wrapped — reference it as `$Node.message.<field>`. Native app actions use their own output
  path instead (e.g. an HTTP/intel app might expose `$Node.body.data`). When a reference resolves empty,
  the wrapping path is the usual cause.
- **App auth attaches to a node via `authentication_id`**, not via apikey parameters on the action.
  Passing the key as an action parameter often shows the literal placeholder ("Secret. Replaced during
  app execution!") at runtime — that means the node isn't linked to a stored auth object.
- **An app-auth `url` field must be the BASE only** (e.g. `https://api.vendor.com`). If the app appends
  its own path and the auth url already contains it, you get path doubling → 404
  (`/api/v2/api/v2/...`).
- **Webhook/notify targets:** a dead webhook token typically returns 401; a healthy webhook returns 2xx
  (e.g. Discord 204). From a raw `urllib`/scripted client (as opposed to Shuffle's own HTTP app),
  some providers (Cloudflare-fronted, e.g. Discord) return 403 unless you set a real `User-Agent` header.

## Self-hosted / unlicensed limitations (verify via `/api/v1/getinfo`)

On a self-hosted, unlicensed instance several "cloud/hybrid" features are inert. Check `getinfo` before
designing around them:

- **Shuffle AI is cloud-only** (`ai_enabled:false`, `licensed:false`). `generate_report` /
  `shuffle_cloud_inference` won't run — build briefs with local `execute_python` instead.
- **No working schedule trigger** (the start endpoints 404). If you need periodic execution, schedule it
  host-side (cron) and call `/execute`, rather than relying on an in-Shuffle schedule.
- **`list_cache` can return empty**, so you may not be able to enumerate the datastore by category via
  API. Don't design a "workflow writes N keys, external drainer lists them" pattern on such a build;
  aggregate host-side from the authoritative source instead.
- **Webhook trigger activation may be UI-only** — API start endpoints 404 on some builds. Toggle the
  trigger to Running in the UI; only then does the hook URL accept POSTs (before that it 400s).
- `delete_cache` needs both `category` and `org_id` in the body on some builds.

## SIEM → Shuffle integration pattern

A common wiring is a SIEM forwarding alerts to a Shuffle webhook (many SIEMs ship a stock "shuffle"
integration that POSTs the alert JSON to the hook URL — no auth on the hook). Two rules that prevent a
self-inflicted flood:

- **Scope the forward tightly.** Filtering on severity/level ALONE is a foot-gun: a bulk event (a
  vulnerability-feed re-read, a scan burst) can fire many alerts at once and hammer the workflow and any
  downstream chat webhook (which are themselves rate-limited). Add a category/group/rule filter and
  prefer correlation/composite rules over raw per-event rules.
- **Verify reachability first.** Confirm the SIEM host can reach the Shuffle hook URL before enabling the
  integration, and confirm the hook trigger is Running.

## Efficiency

When guessing an undocumented request shape, stop after ~2 failed attempts and probe for the error
contract instead of grinding: send a minimal or empty object and read which fields the validator names,
then build from that. If an operation (e.g. certain reorder/activation actions) resists the API entirely,
check whether it's a UI-only action before spending more calls.
