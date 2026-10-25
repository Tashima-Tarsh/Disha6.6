# Application & Software Security Architecture

## Scope

This domain covers the security architecture of software delivery: secure-SDLC gate placement, threat modeling as a program, the testing tool map, software supply chain, API security, secrets management, and runtime protection. Boundary sentence: coding practice, language idioms, and CI/CD engineering compose with the application-architecture skill; this file owns the security architecture those practices plug into — where the gates go, what the tools cover, and how the program scales. AI/ML application threats (prompt injection, model supply chain) compose with `mitre-atlas.md`.

## Architecture patterns

**Secure-SDLC architecture — where the gates actually go.** SP 800-218 (SSDF) is the reference framing (verify current version; cite practices by ID — e.g., PW.7 code review, PS.1 protect code); the architecture work is placing its practices at enforcement points:

- **Requirements** — security requirements derived from data classification and regime obligations enter the backlog as acceptance criteria (OWASP ASVS as the requirements catalog, selected by application risk tier); this is the cheapest gate and the least used.
- **Design review** — threat modeling (below) triggered by risk tier and by change type (new external interface, new data category, new trust boundary), not by calendar.
- **Pre-merge** — the automated gate: SAST and SCA on the pull request, secrets scanning blocking the merge, with a triage policy so the gate doesn't decay into an ignored checkbox. Findings above an agreed severity block; the rest flow to the backlog with owners.
- **Pre-deploy** — artifact-level checks: dependency and container-image scan against current intelligence, build-integrity verification (signature/provenance, below), IaC policy checks (compose with `domain-cloud-hybrid.md`), DAST against the staging deployment for the tiers that warrant it.
- **Runtime** — the gate that admits reality: WAF/API gateway policy, runtime protection where justified (below), and the telemetry feeding `domain-secops.md`.

The design rule: every gate needs a bypass path with approval and logging (emergencies happen), and gate placement follows the paved-road principle (`architecture-best-practices.md`) — centrally maintained pipeline templates that teams inherit, so security travels with the template instead of depending on per-team diligence.

**Threat modeling as a program.** Methodology at orientation depth: **STRIDE** (per-element threat categories — the teachable default, pairs naturally with data-flow diagrams) and **PASTA** (seven-stage, risk-and-business-impact-driven — heavier, suited to high-stakes systems); attack trees and misuse cases as supplements. The program question matters more than the methodology question: threat modeling scales by **risk tier** — crown-jewel and external-facing systems get facilitated sessions with an architect; mid-tier gets developer-led modeling from a checklist/question set with security review; low-tier gets the secure defaults of the paved road and no ceremony. Every model produces tracked outputs (findings into the same backlog as everything else) and gets revisited on architectural change, or it was theater. Pair with ATT&CK for infrastructure-adjacent threats and first-principles/STRIDE for business-logic abuse ATT&CK doesn't enumerate (`mitre-attack.md`, pitfalls).

**The testing tool map — what each finds and misses.**
- **SAST** — source/bytecode analysis; finds injection patterns, dangerous APIs, taint flows; misses runtime configuration, auth logic flaws, anything requiring deployed context; noise profile demands tuning investment or teams learn to ignore it.
- **DAST** — black-box probing of the running app; finds what's actually exposed and exploitable-ish; misses code paths it can't reach (auth-gated flows without scripted login, non-HTTP surfaces) and explains findings poorly.
- **IAST** — instrumentation inside the running app during test traffic; better precision than either, at the cost of agent deployment and language support limits; adoption remains narrow — recommend where the stack supports it, not as a default assumption.
- **SCA** — dependency inventory and known-vulnerability matching; the highest signal-to-effort ratio in the map, and the tool that feeds the supply-chain program; misses everything not in a manifest (vendored code, binaries) unless it does binary analysis.
- Fuzzing and manual testing/pentest sit above the map for the tiers that justify them. No tool finds authorization logic flaws reliably — that's what threat modeling and code review are for; say so rather than implying the scanner stack equals coverage.

**Software supply chain architecture.** The build is an attack surface with well-known incident history; the architecture:
- **SBOM** — generate at build (CycloneDX/SPDX as the format pair), store per released artifact, and make it *queryable* — the SBOM's value is answering "where do we run log4j" in minutes; an SBOM in a folder is compliance décor. Ingestion of vendor SBOMs feeds third-party risk (`domain-governance.md`).
- **Dependency provenance** — internal registry/proxy as the single source for dependencies (blocks dependency-confusion by construction), pinned versions with lockfiles, allow/deny policy for licenses and known-bad packages, and quarantine-on-anomaly for newly published versions.
- **Build integrity** — **SLSA** at orientation depth (verify current spec version): levels expressing build-platform trust, from documented builds up through hardened, provenance-generating build platforms; the practical moves are hermetic/isolated builds, signed provenance attestations, artifact signing (Sigstore-class tooling as the representative category), and verification *at deploy time* — signing without a verifying consumer is paperwork. Protect the pipeline itself as a privileged system: the CI runner's credentials and the artifact registry are tier-0-adjacent (`domain-cloud-hybrid.md`, pipeline enforcement).

**API security architecture.** The API estate is the application attack surface, and inventory is its first problem — undocumented and zombie endpoints ship, so discovery (gateway-derived, traffic-derived) precedes policy. Then:
- **Authn/authz patterns** — OAuth 2.0/OIDC as the protocol substrate (mechanics in `domain-iam.md`); the architecture rules: authorization enforced *per request at the resource layer*, never solely at the gateway or client; object-level checks explicit (BOLA — broken object level authorization — is the dominant real-world API flaw class); service-to-service auth via workload identity/mTLS rather than shared static API keys.
- **Gateway enforcement** — the gateway carries the cross-cutting policy: authentication, coarse authorization, rate limiting and quota, schema validation against the contract (reject-unknown for sensitive APIs), and telemetry. It does not absolve services of fine-grained authorization — a gateway-only auth model is a standing finding.
- **OWASP API Security Top 10** as the review checklist (verify current edition; cite by item ID, e.g., API1 BOLA, API2 broken authentication) — a checklist for review coverage, not a security standard, per the OWASP caveat in `architecture-best-practices.md`.

**Secrets architecture.** Secrets-in-code is a solved problem with unsolved adoption. The architecture: a central vault (secrets-manager category — cloud-native or dedicated) as the source of truth; applications retrieve at runtime via their *workload identity* (the bootstrap credential problem dissolves when the platform authenticates the workload — `domain-cloud-hybrid.md`); rotation automated and *verified* (rotation that breaks consumers gets silently disabled — design the consumer to re-fetch); short-lived dynamic credentials over static ones wherever the backend supports issuance; secrets scanning in the pipeline (pre-merge gate) and against history — with an incident-response answer for what happens when scanning finds one, because it will: found-in-history means rotate, not delete-and-hope.

**Runtime protection, honestly assessed.** WAFs block known-pattern attacks and buy patching time (virtual patching); they are evadable, tuning-hungry, and routinely run in monitor-only mode for fear of blocking revenue — count a WAF as a control only in blocking mode with a tuning owner. PCI DSS 6.4.2 makes an automated technical solution for public-facing web apps a requirement in-scope — one of the few places a regime forces the decision (`compliance.md`). RASP/in-app protection offers precision with the same agent-adoption economics as IAST. API-specific runtime protection (behavioral anomaly detection on API traffic) is the growth category; evaluate on detection specificity, not category membership. None of it substitutes for authorization done right in the code.

## Control mapping

- **SP 800-53 Rev. 5**: SA-11 (developer testing — the tool map's control home), SA-15 (development process), SA-17 (architecture and design), SR-3/SR-4/SR-11 (supply chain), SI-10 (input validation), IA-5 (authenticator management — secrets), CM-3 (change control at the gates), RA-5 (vulnerability monitoring).
- **CSF 2.0**: Protect (PR.PS-06 secure development lifecycle integration), Identify (ID.RA for the threat-modeling outputs), Govern (GV.SC — supply chain risk, elevated to its own category in 2.0).
- **ATT&CK**: T1195 (Supply Chain Compromise) and sub-techniques, T1552.001 (Credentials in Files) for secrets-in-code, T1190 (Exploit Public-Facing Application) as what this whole domain reduces; map per `mitre-attack.md`.
- **Compliance hooks**: PCI DSS Req. 6 end-to-end (6.2 secure development, 6.3 vulnerability management, 6.4.2 public-facing app protection, 6.4.3 payment-page scripts); SOC 2 CC8.1 (the SDLC gates are the change-management evidence); SOX change-management ITGC for financial systems; CMMC/800-171 3.14 and, via SP 800-218 alignment, the federal secure-development attestation requirements for software sold to the government (verify current status) — see `compliance.md`.

## Decision criteria

- **Small team / startup**: SCA + secrets scanning + the platform's built-in SAST, wired into the PR — near-zero operational cost, catches the majority of what matters; threat model the auth and payment flows once, properly; buy the paved road (managed platform services) instead of building gates.
- **Mid-size**: pipeline templates as the enforcement vehicle; risk-tiering formalized so scanner rigor and threat-modeling depth scale with tier; API inventory started before the estate is unmapable; a security champions structure so the program has hands inside teams.
- **Large / regulated**: SSDF-mapped program with evidence generation designed in (the attestation and audit artifact); SLSA-leveled build platform for crown-jewel software; SBOM pipeline with query capability; dedicated AppSec engineering owning the paved road, and product-security incident response wired to `domain-secops.md`.
- Universal ordering: dependency and secrets hygiene → gate automation → threat modeling program → supply-chain integrity → runtime exotica.

## Assessment questions

- Walk me through what happens between a pull request and production: which security checks run, which *block*, and when was the last time a block was overridden — by whom, logged where?
- Which applications have a current threat model, when were they last updated, and where do their findings live? (If the answer is "a wiki page from the redesign," that's the finding.)
- Can you answer "which running services include dependency X" today, and how long would it take? Show me for a real CVE from the last quarter.
- How does a service get a database credential — vault via workload identity, environment variable set by hand, or a config file in the repo history?
- What's the API inventory of record, how are unlisted endpoints discovered, and where is object-level authorization enforced — show me for one endpoint.
- What does the build platform attest about artifacts, and does anything verify signatures/provenance at deploy time?
- Is the WAF in blocking mode? Who tunes it, and what did it block last week?
- For LLM-integrated applications: where does model output cross into tool calls, queries, or rendering, and what treats it as untrusted? (`mitre-atlas.md`)
