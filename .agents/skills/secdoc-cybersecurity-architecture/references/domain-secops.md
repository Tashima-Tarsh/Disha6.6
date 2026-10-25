# Security Operations & Threat Management Architecture

## Scope

This domain covers the architecture of detection, response, and threat management: SOC design and operating models, SIEM and telemetry architecture, detection engineering, SOAR/automation, threat intelligence, threat hunting, and incident response. Boundary with neighbors: what to log and detect *per domain* (endpoint telemetry, cloud audit logs, identity events) lives in each domain file; this file owns where that telemetry goes, who watches it, and what happens when it fires. Adversary technique mapping lives in `mitre-attack.md`; this file consumes it.

## Architecture patterns

**SOC operating models.** Three real options, and the staffing math decides more than the diagrams do:
- **In-house 24×7** — full control, full context, and the honest arithmetic: continuous coverage requires roughly 8–12 analysts minimum (shifts, PTO, attrition, training), before counting detection engineers, threat intel, and leadership. Below several hundred million in revenue this rarely pencils out, and pretending otherwise produces a "24×7 SOC" that is two tired people and a pager.
- **MSSP/MDR** — outsourced monitoring (MSSP: alert triage against your tooling) or managed detection and response (MDR: provider's stack plus response actions). Trade-offs: cost and coverage against context loss — the provider doesn't know that server, that admin, that quarter-close pattern. The contract details are the architecture: response authority (can they isolate a host?), escalation SLAs, telemetry access and *portability* (whose SIEM holds the data when you leave?), and co-managed content (can your team see and tune the detections?).
- **Hybrid** — the most common defensible pattern at mid-size: provider handles overnight/weekend triage and commodity alerts; in-house owns detection engineering, escalations, context-heavy investigation, and response decisions. The seam to design deliberately is the handoff: shared case management, documented severity model, and joint runbooks — otherwise the hybrid is two SOCs ignoring each other.

**SIEM architecture.** Three decisions dominate:
- **Collection tiers.** Not all telemetry is equal, and licensing/storage economics force a tiering: hot searchable storage for high-detection-value sources, warm/cold or a data-lake tier for compliance and forensic retention, and a routing layer (forwarders, collectors, or an observability pipeline) that filters and normalizes before ingest. The anti-pattern is "send everything to the SIEM" — it maximizes cost and buries signal.
- **Log source prioritization by detection value.** Order of onboarding, argued by what detections they enable: identity provider and authentication logs (most techniques touch identity), EDR/endpoint telemetry, cloud control-plane audit logs, DNS, email security, network egress, then application logs for crown-jewel systems. A SIEM full of firewall permit logs and empty of IdP events is inverted. Map sources to ATT&CK Data Sources (DS-series) to argue the prioritization — missing telemetry is an architecture finding (`mitre-attack.md`, detection coverage).
- **Retention economics.** Retention is a compliance and forensics requirement colliding with a per-GB bill. Set it by driver: regulatory floors (PCI DSS Req. 10.5.1 — 12 months, 3 months immediately available; check each regime in play), incident-investigation reality (median dwell times argue for ≥ 6–12 months of *searchable* identity and endpoint history), and cost tiers for the rest. Document the retention schedule per source class; "we keep everything forever" and "whatever the default was" are both findings.

**Detection engineering as a discipline.** Detections are software and deserve software practice: version-controlled rules (detection-as-code), peer review, test cases with sample events, CI validation, and metrics per rule (fire rate, true-positive rate, time-to-triage). Coverage planning is ATT&CK-driven — build the relevant-technique shortlist for the environment, map existing detections against it, and work the gaps by priority rather than by vendor content-pack order. False-positive economics are the discipline's budget constraint: every noisy rule spends analyst attention, and an unreviewed rule set grows until triage collapses; a standing tuning/retirement process is part of the architecture, not an afterthought.

**SOAR and automation, staged honestly.** Automation maturity in the order it actually works: (1) enrichment — auto-attach context (asset owner, identity risk, threat intel, prior cases) to every alert; this is where most of the payoff lives and almost nothing can go wrong; (2) containment with human approval — one-click isolate/disable/block with an analyst deciding; (3) full auto-response for a narrow, well-understood alert class with high confidence and low blast radius (e.g., known-bad hash on a non-critical endpoint). Buying a SOAR platform before the severity model, runbooks, and case management exist automates chaos. The playbook library is the asset; the platform is plumbing.

**Threat intelligence architecture.** Feeds are not intelligence. Indicator feeds (hashes, IPs, domains) plug into the SIEM/EDR for matching and age out fast; *intelligence* is analyzed adversary behavior (who targets this sector, with what tradecraft) and drives detection priorities, hunt hypotheses, and control decisions. Integration points that matter: automated indicator ingestion with expiry, technique-level intel into the detection backlog (ATT&CK Groups/Campaigns as the vocabulary), and a requirements process so collection answers questions someone asked. A TIP without stated intelligence requirements is a bookmark manager.

**Threat hunting as a program.** Hypothesis-driven, not "look around": each hunt starts from a technique or behavior ("if an actor used T1078.004 against our cloud tenant, what would we see?"), states required telemetry, and ends in one of three outputs — a finding, a new detection, or a documented telemetry gap. Cadence and scope sized to maturity; a hunt program with no outputs feeding detection engineering is theater.

**Incident response architecture.** Align to **SP 800-61** (verify current revision — the IR lifecycle framing was restructured in the Rev. 3 update to align with CSF 2.0): preparation, detection/analysis, containment/eradication/recovery, post-incident. The architecture decisions:
- **Severity model** — defined levels with objective criteria, notification obligations per level (including the regulatory clocks: GDPR Art. 33's 72 hours, and per-contract/regime breach terms — see `compliance.md`), and declared authority (who can declare, who can order containment that takes revenue systems down).
- **Evidence handling** — forensic acquisition capability decided *before* the incident (imaging, memory capture, cloud snapshot procedures), chain-of-custody discipline, and log integrity (AU-9-style protection) so evidence survives scrutiny.
- **Tabletop discipline** — exercises on a calendar, scenario-driven (pick from the threat model, not generic ransomware every year), with executives in the room for the decisions that are actually theirs (pay/don't-pay, disclose/don't, shut down/keep running), and findings tracked to closure like any other finding.

## Control mapping

- **SP 800-53 Rev. 5**: IR family (IR-4 handling, IR-6 reporting, IR-8 plan), AU family (AU-2/AU-3 events and content, AU-6 review/analysis, AU-9 protection, AU-11 retention), SI-4 (system monitoring), RA-10 (threat hunting), PM-16 (threat awareness program).
- **CSF 2.0**: Detect (DE.CM continuous monitoring, DE.AE adverse-event analysis) and Respond (RS.MA management, RS.AN analysis, RS.CO communication) functions; Govern for the operating-model and roles decisions.
- **ATT&CK**: the coverage-mapping method and Data Source discipline in `mitre-attack.md`; D3FEND for countermeasure vocabulary.
- **Compliance hooks**: PCI DSS Req. 10 (logging) and 12.10 (IR plan, tested annually); SOC 2 CC7.2–CC7.5; SOX operations ITGC evidence; GDPR Art. 33/34 detection-and-notification capability; CMMC/800-171 3.3 (audit) and 3.6 (IR) families — see `compliance.md`.

## Decision criteria

- **Small org / low maturity**: MDR + EDR + IdP logging beats a self-run SIEM every time; spend the first internal hire on the provider relationship and asset/identity context, not on console-watching.
- **Mid-size**: hybrid model; bring detection engineering in-house first (it's where context compounds), keep overnight triage external; SIEM choice driven by ingest economics and the team's query fluency more than feature matrices.
- **Large / regulated**: in-house or co-managed 24×7 with follow-the-sun if global; formal detection-as-code pipeline; dedicated intel and hunt functions with stated requirements; IR retainer with a firm that has done your sector's breaches.
- Across all sizes: telemetry before tooling, runbooks before automation, and the severity model before the SOAR.

## Assessment questions

- What percentage of the relevant ATT&CK technique shortlist has a mapped, *tested* detection — and when did a detection last fire correctly in a purple-team or simulation exercise?
- Which log sources are not being collected, and who decided that? (Look for IdP, cloud control plane, and EDR gaps first.)
- What is the alert-to-triage funnel: alerts/day, triaged/day, median time-to-triage, and the false-positive rate on the top ten noisiest rules?
- Who can isolate a host, disable an account, or block egress at 3 a.m., and how long does it take? If the answer involves a ticket queue, that's the finding.
- When was the last tabletop, what scenario, who attended, and which findings from it are closed?
- If the MDR/MSSP contract ended tomorrow, what telemetry, detections, and case history would the organization keep?
- Can the IR process determine within 72 hours whether personal data was involved and whose? (GDPR Art. 33 readiness — see `compliance.md`.)
