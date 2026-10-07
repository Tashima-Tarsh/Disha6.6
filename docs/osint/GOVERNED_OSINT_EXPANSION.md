# DISHA Governed OSINT Expansion

DISHA's OSINT runtime is designed as an evidence-producing, policy-gated collection layer rather than a shell around arbitrary reconnaissance tools.

## Production adapters

The default production bus currently registers:

- Google Public DNS-over-HTTPS (passive DNS resolution)
- crt.sh Certificate Transparency (public certificate discovery)
- RDAP.org (public domain/IP registration data)
- Internet Archive Wayback CDX (historical public-web snapshots)
- Common Crawl (public web-crawl captures)
- GDELT DOC 2.0 (global public-news discovery)
- CISA Known Exploited Vulnerabilities (defensive vulnerability intelligence)
- GitHub Public Repository Metadata (upstream/repository provenance)
- SEC EDGAR Submissions (official US company filing metadata)
- OpenAlex (public scholarly graph)
- World Bank API (public macroeconomic indicators)
- Wikidata Search (public knowledge-graph entity discovery)
- DISHA Official Public Source Probe (allowlisted government/public sources)
- DISHA Dynamic Public Source adapter (allowlisted source-registry endpoints)
- NIST NVD CVE API (official CVE/CVSS enrichment)
- FIRST EPSS (defensive exploitation-probability scoring)
- RIPEstat Whois (public IP/ASN registry and routing-registry context)
- CelesTrak GP (bounded public orbital-element lookup by catalog number)
- NOAA SWPC alerts (official machine-readable space-weather alerts)
- ReliefWeb API v2 (humanitarian reports when `RELIEFWEB_APPNAME` is configured)\n- OpenSanctions Search API (public entity/sanctions/PEP discovery when `OPENSANCTIONS_API_KEY` is configured)\n- OpenCorporates API (public company and officer discovery when `OPENCORPORATES_API_TOKEN` is configured)\n- ThreatFox Community API (defensive IOC/hash-to-IOC enrichment when `THREATFOX_AUTH_KEY` is configured)\n- MalwareBazaar Community API (metadata-only malware hash lookup when `MALWAREBAZAAR_AUTH_KEY` is configured; no sample downloads)
Every adapter declares purpose, authentication type, legal/blocked uses, timeouts, retry limits, and an execution class. The default bus fails closed for active reconnaissance, identity enumeration, and prohibited execution classes.

## Universal Search

`GET /api/v1/osint/search?q=<target>` provides a single governed entry point over the production adapter bus. It does not bypass adapter policy.

The planner classifies the target and chooses only relevant passive/public adapters:

| Target | Default routing |
| --- | --- |
| Domain / website | DNS, certificate transparency, RDAP, Wayback, Common Crawl, GDELT |
| IP address | RDAP, RIPEstat Whois, GDELT |
| ASN such as `AS13335` | RIPEstat Whois, GDELT |
| CVE | CISA KEV, NVD, EPSS, GDELT |
| NORAD/CATNR identifier | CelesTrak GP, GDELT |
| Space-weather query | NOAA SWPC, GDELT |
| Humanitarian/disaster topic | ReliefWeb (when configured), GDELT |
| GitHub repository | GitHub public repository metadata, GDELT |
| `CIK <number>` | SEC EDGAR, GDELT |
| Person, company, organisation or topic | Wikidata, OpenAlex, GDELT |
| Email, phone or `@username` | Public reporting only; cross-site identity enumeration stays disabled |

The response exposes the detected target type, normalized target, adapters executed, per-adapter status and duration, source-linked evidence, provenance hashes, evidence class, warnings, and explicit execution boundaries.

The authenticated `/investigate` surface uses the canonical DISHA target model and a richer Target -> Connector routing registry. That route can add configured entity providers, defensive CTI providers and governed ASTRA worker jobs while still reporting unavailable/restricted sources explicitly. The standalone `GET /api/v1/osint/search` endpoint remains the synchronous passive/public core-bus search and must not imply that investigation-only workers or restricted vehicle sources were executed.

### Authenticated investigation routing

The post-login investigation flow exposes Name first and Vehicle second, followed by phone, email, username, company, network, evidence and space identifiers. Notable enrichment paths include:

- Name: Wikidata, public reporting/web discovery, OpenSanctions and OpenCorporates officer search when configured.
- Company: Wikidata, public reporting/web discovery, OpenSanctions and OpenCorporates company search when configured.
- Phone: public discovery plus PhoneInfoga only when the ASTRA worker, tool flag, deployment approval and per-investigation operator/admin authorization are configured.
- Email: public discovery plus Holehe under the same explicit identity policy; password-recovery modules remain disabled.
- Username: public discovery plus Sherlock and Maigret under the same explicit identity policy.
- Domain/URL: public core adapters plus theHarvester, passive Amass, Subfinder, SpiderFoot and allowlisted Recon-ng modules when their worker flags are configured. OpenCTI and IntelOwl add configured CTI/enrichment service results. Photon can add a bounded depth-1 public-site crawl only when the deployment gate and per-investigation operator/admin authorization are both present.
- IP: public RDAP/RIPEstat, Shodan when configured, public reporting, ThreatFox, configured OpenCTI/IntelOwl enrichment, and passive SpiderFoot.
- Hash/IOC: public discovery plus configured ThreatFox, OpenCTI and IntelOwl; file hashes also use configured MalwareBazaar metadata lookup. Malware samples are not downloaded by these DISHA investigation adapters.
- Vehicle: Indian registration identifiers are normalized and public discovery can run immediately. VAHAN/National Transport Repository and eChallan remain restricted placeholders until an approved data/API entitlement is connected.

## API

- `GET /api/v1/osint/catalog` lists production adapters, adapter health, and reviewed GitHub upstream projects.
- `GET /api/v1/osint/search?q=<target>` performs governed universal public-source search.
- `GET /api/v1/osint/sources` searches the OSINT/CTI/SPACEINT source universe.
- `GET /api/v1/osint/restricted-sources` shows restricted-source governance posture and configuration status without ingesting restricted content.
- `POST /api/v1/osint/run` executes one governed adapter for a mission and writes the result into Evidence Ledger v2.
- `GET /api/v1/osint/watches` and `POST /api/v1/osint/watches` manage continuous governed watches.
- `POST /api/v1/osint/watch-bundles` creates approved multi-source watch bundles, including vulnerability, network-resource, humanitarian, orbital-object, and space-weather watches.

Example single-adapter request body:

```json
{
  "missionId": "mission-123",
  "adapterId": "public-rdap",
  "purpose": "defensive infrastructure ownership verification",
  "input": { "query": "example.org", "kind": "domain" }
}
```

Example Universal Search request:

```text
GET /api/v1/osint/search?q=example.org
```

## GitHub upstream rule

GitHub OSINT projects are **kept as pinned upstream source trees** under `disha/services/integrations/osint-upstreams/` using Git submodules. This preserves the original repositories and exact reviewed revisions without turning source presence into automatic execution. Projects such as SpiderFoot, theHarvester, IntelOwl, Recon-ng, OWASP Amass, Photon, Sherlock, Maigret, and Holehe still have materially different network behavior, privacy implications, licenses, and dependency chains.

Promotion into DISHA production requires all of the following:

1. A module-level capability review.
2. A compatible license and recorded upstream repository.
3. A governed adapter contract.
4. Passive/public-source behavior by default.
5. Policy evaluation before execution.
6. Bounded timeouts, retries, and result sizes.
7. Evidence/provenance output for every successful collection.
8. No credential harvesting, secret discovery, exploit delivery, authentication bypass, or private-account access.

Active-recon and identity-enumeration capabilities remain gated. Source availability never authorizes execution: Photon requires explicit active-crawl authorization, and identity tools retain their deployment plus per-investigation authorization gates.

## Next production promotions

OpenCTI and IntelOwl are now promoted as configured service-backed adapters without bypassing the governed bus: OpenCTI exposes bounded read-only STIX core-object search, while IntelOwl accepts observables only and runs the server-side `INTELOWL_ANALYZERS_ALLOWLIST` with bounded job polling/report normalization. Further promotions should keep the same contract for additional official/public corporate, sanctions, media/geolocation, and approved transport/movement sources.

SpiderFoot, Maigret, Sherlock, Amass and similar projects must not be exposed as arbitrary command execution. A production connector should select a reviewed passive profile, enforce target/purpose policy, bound runtime and result volume, and convert every accepted observation into DISHA evidence/provenance records.

## OSINT + CTI + SPACEINT source universe

DISHA also maintains a searchable source universe at `GET /api/v1/osint/sources`. This registry is deliberately broader than the live adapter bus and records 100+ investigation, cyber-intelligence, and space-intelligence sources with explicit access and risk metadata.

The registry includes:

- master directories and investigation toolkits,
- search engines, archives, image/media verification and geolocation,
- conflict/event, humanitarian, corporate, sanctions and public-record sources,
- aviation/maritime movement sources and public social-media research tools,
- internet-wide scanners, IOC/malware feeds, DNS/routing services and vulnerability sources,
- CTI knowledge bases and frameworks such as MITRE ATT&CK, MISP, SpiderFoot and OpenCTI,
- orbital catalogs, satellite databases, space-situational-awareness providers, SatNOGS and signal references,
- Sentinel/Landsat/NASA Earth observation, commercial imagery providers, space-policy sources, launch warnings and space weather.

Every entry is labeled as one of `builtin`, `connector_ready`, `requires_configuration`, `reference_only`, or `blocked_by_default`. Catalog presence never implies that DISHA can call the source without credentials, licensing review, or policy approval.

Credential/breach repositories, leaked-data archives, active-reconnaissance frameworks, and other restricted sources remain non-executable by Universal Search unless a separately reviewed lawful workflow is added.

## Restricted-source governance

`GET /api/v1/osint/restricted-sources` exists for governance and configuration status only. It covers restricted sources such as Distributed Denial of Secrets, WikiLeaks, Intelligence X, and DeHashed without fetching, storing, mirroring, searching, or returning leaked datasets, breach rows, credentials, passwords, tokens, secrets, or private records.

The restricted-source posture records:

- whether an operator approval flag is present,
- the source's `blocked_by_default` mode and `restricted` risk,
- permitted governance-only uses,
- prohibited ingestion/search uses,
- required legal, mission, audit, retention, and redaction controls,
- output rules that allow only non-sensitive metadata and references.

Approval flags such as `DISHA_RESTRICTED_SOURCE_DEHASHED_APPROVED=true` are audit metadata only. They do not create an executable adapter and do not allow Universal Search to query restricted sources. A separate, reviewed workflow is required for any lawful, redacted metadata-only use case.
