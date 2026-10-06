# DISHA Investigation Universe

## Canonical search targets

The authenticated investigation flow now shares one canonical target model across classification, planning, source routing and the search UI. The explicit search choices start with **Name** and **Vehicle**, followed by phone, email, username, company, domain/network, vulnerability and evidence identifiers.

Vehicle identifiers are normalized before planning. Standard Indian state/UT registration formats (for example `DL01AB1234`) and Bharat Series identifiers (for example `22BH1234AA`) are recognized as `vehicle_identifier`.

Recognition is not the same as registry entitlement. Vehicle searches may run approved public discovery sources immediately, while VAHAN/National Transport Registry and eChallan enrichment remain `RESTRICTED` until a reviewed, authorized connector and the required access entitlement are configured. The product must not fabricate vehicle-owner or registration fields when that connector is unavailable.

Worker-backed ASTRA 6 tools are represented truthfully in the route plan. PhoneInfoga, Sherlock, Maigret, Holehe, theHarvester, Amass and Subfinder execute through the existing isolated Postgres-backed worker queue only when `DATABASE_URL` and the relevant tool enable flag are configured. Email/phone/username routes additionally require deployment approval plus explicit operator/admin authorization for that investigation. SpiderFoot remains cataloged but is not executable until a compatible isolated runtime is packaged and smoke-tested. Otherwise the source remains `NOT_CONFIGURED` or `RESTRICTED`; catalog presence does not count as executed evidence.

The default authenticated route is `/investigate`. Password, form and OIDC login share a validated local return URL; an explicit valid return URL takes priority. Operations remains at `/operations`; `/dashboard` remains a compatible secondary route.

## Runtime configuration

Use the existing Node 22 / GCP application runtime and authentication/database configuration. Do not create continuous CI.

- `REDIS_URL`: required shared temporary store. Use a dedicated Redis instance with RDB snapshots and AOF persistence disabled, access controls, TLS across hosts and no backups of these temporary keys. Results and uploads are AES-256-GCM encrypted, bounded, owner-scoped and expire after 15 minutes. A missing or unavailable Redis instance fails explicitly; no process-local fallback is used.
- `DISHA_INVESTIGATION_KEY`: optional independent secret of at least 32 characters. Otherwise, a domain-separated encryption key is derived from the existing `DISHA_JWT_SECRET`. All replicas must have the same secret. Rotate only after active sessions have expired.
- `BRAVE_SEARCH_API_KEY`: optional official public web search. Supports exact public references for names, email addresses, phone numbers, usernames, companies and topics. Missing key means `NOT_CONFIGURED`.
- `SHODAN_API_KEY`: optional official passive host lookup and filtered domain/ASN search. The server checks `/api-info` and available query credits before a filtered search. It retrieves only the first page. Search may consume one query credit. No active probes or scanning requests are made. `REST_HEALTHY` is reported only after successful API execution. Streaming is deliberately not used and is never marked healthy or entitled.
- `GOOGLE_CLOUD_VISION_API_KEY`: optional Google Cloud Vision `WEB_DETECTION`. When configured, uploaded images are sent to that provider for public page/image matches. The upload UI discloses this. No face identification is requested. Provider-side processing and retention follow the provider's service terms.
- `DATABASE_URL` plus `DISHA_ASTRA6_<TOOL>_ENABLED=true` (or `DISHA_ASTRA6_ALL_TOOLS_ENABLED=true`): enables the durable ASTRA 6 queue bridge for reviewed worker-backed tools. The investigation stores only the external run id while the worker executes, then polls the persisted result and normalizes accepted records into the same evidence model.
- `DISHA_IDENTITY_ENUMERATION_APPROVED=true`: separately required before PhoneInfoga/Sherlock or other identity-sensitive ASTRA routes can execute. Without this explicit approval, those routes stay `RESTRICTED`.

Public DNS, RDAP, certificate transparency, Wayback, Common Crawl, RIPEstat, GDELT, Wikidata, NVD, CISA KEV, EPSS and CelesTrak use existing governed adapters according to target class. Provider outages and limits remain visible. A phone number requires an explicit valid international country code. Local number formats are never assigned a guessed country. Email local-part case is preserved. Automatic name classification is a routing heuristic; the type selector can override ambiguous names/topics.

## Request and cleanup lifecycle

1. `POST /api/v1/osint/investigations` accepts `{ "target": "...", "targetType": "auto" }`. It authenticates, authorizes, validates, rate-limits, creates encrypted temporary state, and immediately returns a queued plan.
2. The browser advances one bounded source via authenticated `POST /api/v1/osint/investigations/{id}/run`, and polls `GET /api/v1/osint/investigations/{id}` for progress. Public/API adapters remain request-bounded. Reviewed ASTRA CLI tools are enqueued as durable Postgres worker jobs and tracked by `externalRunId`; later run calls poll the worker state and ingest only terminal parsed output. Shared investigation leases and deterministic ASTRA run ids prevent duplicate execution. Closing or expiring an investigation cancels/removes its queued worker rows, and worker finalization is fenced so a cancelled run cannot be resurrected as completed.
3. Only actual records in adapter output become evidence. A lookup summary, an empty array, an unsuccessful request or an unknown response shape never becomes a finding. Wikidata entities form separate possible candidate matches by provider record; multiple records from one source are never merged just because a name matches. Public web/news results remain references, not inferred identities or phone ownership. No synthetic confidence, corroboration, relationships or locations are added.
4. `POST /api/v1/osint/investigations/image` accepts one multipart `image` JPG/PNG (5 MB maximum, 25 megapixels maximum). The server checks bytes and declared MIME, safely decodes, computes SHA-256 and a 64-bit difference perceptual hash, and extracts allowlisted EXIF fields. GPS, serial numbers, owner strings and arbitrary EXIF text are excluded. Uploaded bytes live only as encrypted temporary Redis content, with no public URLs or filesystem upload paths. The metadata record is explicitly labeled local image analysis.
5. `DELETE /api/v1/osint/investigations/{id}` marks a shared stop flag, aborts local or remote active requests, waits for the execution lease to release, deletes state and uploaded bytes, and confirms deletion. Atomic Redis checks fence all late writes. If stopping cannot be confirmed within 10 seconds, the endpoint returns a cleanup error; the UI retains state and offers retry. Retry is idempotent for the owner. No new investigation starts before closure.
6. Navigation attempts a keepalive close. An absolute TTL removes abandoned state and uploads without requiring another user request; the UI also requests closure at expiration. Access to every investigation requires the same authenticated owner. Minimal owner hashes and stop markers expire shortly after the result TTL.

No investigation results are inserted into `evidence_events`, mission storage, evidence inventory, persistent graphs or global timelines. Audit records contain investigation ID, actor, target class, times, adapter IDs and sanitized statuses only. There is no default long-term save action. A future explicit selected-evidence save workflow must have its own authorization, reason and provenance preservation; it must not auto-save results.

The 3D view contains category navigation before search. After search it renders target, distinct candidates, source-backed evidence and adapter runs. Only evidence-backed typed backend edges are rendered. Evidence details are contextual and keyboard accessible. There is no default operations map, persistent inspector or inherited timeline. WebGL failure retains the search and accessible evidence list. DPR is capped; evidence meshes are instanced; geometry, textures, listeners, controls and animation frames are disposed.

## Manual validation

From `web/`, run before committing:

```
npm run lint
npm run type-check
npm run type-check:full
npm test
npm run build
git diff --check
```

For the Redis integration tests, start an isolated Redis with persistence disabled and run:

```
DISHA_TEST_REDIS_URL=redis://127.0.0.1:6387 npm test
```

Integration tests use only their own random investigation keys and remove them afterwards. They never flush the database. Browser acceptance should cover login, search, source progress, evidence selection, cancellation during execution, image upload, confirmed close and a clean second search. Provider credentials and deployment access must be configured and checked on the actual production service separately.

Official provider references: https://developer.shodan.io/api ; https://docs.cloud.google.com/vision/docs/detecting-web ; https://api.search.brave.com/app/documentation/web-search/get-started
