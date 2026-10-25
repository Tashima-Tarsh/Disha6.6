# Endpoint & Host Security Architecture

## Scope

This domain covers the security architecture of endpoints and hosts: the layered endpoint stack, the EPP/EDR/XDR category map, mobile and BYOD, privileged workstation patterns, server-versus-user-endpoint divergence, OT/IoT exceptions, and the coverage question. Boundary with neighbors: what the EDR telemetry feeds and who watches it is `domain-secops.md`; the identities logging into the endpoints are `domain-iam.md`; disk and file encryption policy details compose with `domain-data-crypto.md`; network-side controls the endpoint talks through are `domain-network-perimeter.md`. This file owns the host-side stack and its architecture.

## Architecture patterns

**The endpoint stack, architected as layers.** Each layer catches what the previous one misses; a design leaning on any single one has a finding at that point (`architecture-best-practices.md`, defense in depth):

1. **Hardening baseline** — the free layer everyone skips: CIS Benchmarks (commercial/general estates) or DISA STIGs (federal/DoD-adjacent, and the CMMC-relevant choice) applied via managed configuration, with documented deviations. An unhardened endpoint makes every layer above it work harder. Baseline drift monitoring closes the loop — a baseline applied once and never verified is a point-in-time claim.
2. **EDR** — the detection-and-response layer; deployment questions that matter more than vendor choice: coverage percentage (below), tamper protection on, telemetry retention, and blocking mode actually enabled (an EDR in detect-only mode is a flight recorder).
3. **Application control** — allowlisting (platform-native: WDAC/AppLocker-class, or third-party) is the highest-value, highest-friction layer; deploy in audit mode first, then enforce on the populations that can bear it (servers and privileged workstations first — their software set is stable; general user estates need a managed-catalog approach).
4. **Host firewall** — enforced-on with a managed default-deny inbound policy; the cheap microsegmentation layer nobody turns on, and the enforcement point host-based segmentation products build upon.
5. **Disk encryption** — full-disk (BitLocker/FileVault-class) with *escrowed recovery keys* in the management platform — unescrowed encryption converts device loss into data loss; verify enforcement, not just policy existence.
6. **Patch architecture** — ring-based deployment (canary → broad → critical-systems-last-with-testing), measured as time-to-patch against the vulnerability-management SLAs (`cvss.md` prioritization feeds this), with the honest exception register for what can't patch on cycle and its compensating controls.

**EPP/EDR/XDR — the category map, acronym inflation named.** **EPP** is prevention (signatures, heuristics, exploit mitigation); **EDR** adds telemetry, detection, investigation, and response actions on the endpoint; **XDR** is the vendor term for correlating endpoint telemetry with identity, email, and network signal — sometimes a real cross-domain detection layer, sometimes a rebadged EDR console with connectors. Evaluate XDR claims by asking what *non-endpoint* telemetry is natively analyzed and what cross-signal detections exist out of the box; "open XDR" versus single-vendor stacks is a data-gravity decision that belongs to the SIEM architecture conversation (`domain-secops.md`). Practically, EPP and EDR have merged in every serious product; the architecture question is telemetry quality, response actions available, and coverage — not the acronym.

**MDM/UEM and the BYOD trust decision.** Managed mobility is an identity-and-data problem wearing a device costume. The architecture decision ladder: fully managed corporate devices (full stack applies) → corporate-enrolled personal devices via UEM with a work profile/container (platform separation of work data, selective wipe) → app-level management only (MAM: policy travels with the app, no device enrollment) → unmanaged access, which should mean browser-only access to low-sensitivity data or no access. The honest BYOD conversation: the org cannot see or control what it doesn't manage, so the trust granted must match the management level — encode that as conditional-access policy tied to device compliance signals (`domain-iam.md`), not as a written policy nobody enforces.

**Privileged workstation patterns.** Admin work from the daily-driver endpoint means every phishing email is one hop from domain admin. The tiering pattern: **PAWs** (privileged access workstations) — hardened, application-controlled, no email/browsing, dedicated to administration — for the highest tier; **jump hosts / bastion services** as the brokered path into managed infrastructure (with session recording, tying into PAM — `domain-iam.md`); and a tier model that forbids credential exposure downward (tier-0 credentials never typed on tier-1/2 systems). Virtualization variants (privileged VM on shared hardware, cloud-hosted PAW) trade isolation strength for cost — state the trade explicitly rather than calling them equivalent.

**Server versus user-endpoint divergence.** One "endpoint security" policy covering both is a design smell. Servers: stable software inventory (application control is cheap here), no interactive browsing/email (different threat model), agent performance budgets on database/latency-sensitive workloads, change windows instead of continuous patching, and — increasingly — the workload-protection agents from the cloud stack (`domain-cloud-hybrid.md`, CWPP) rather than desktop EDR. User endpoints: hostile-input-facing (browser, email, documents), so exploit mitigation, content filtering, and phishing-resistant auth carry more weight. Architect the two estates as separate policy classes sharing a management plane.

**OT/IoT endpoints — the exception class that breaks the model.** Unpatchable firmware, no agent support, vendor-controlled maintenance windows, 15-year lifecycles, and availability requirements that make "just reboot it" a safety conversation. The model that works is compensating architecture: network isolation and unidirectional flows where warranted (the Purdue-model zoning conversation — compose with `domain-network-perimeter.md` and, for ICS threat mapping, the ATT&CK ICS matrix per `mitre-attack.md`), passive discovery and monitoring instead of agents, and strict control of the crossing points (jump hosts into the OT zone, removable-media policy). SP 800-82 is the reference publication (verify current revision). The finding to look for: OT devices discovered *on the IT network* because nobody drew the boundary.

**The visibility question that decides everything else.** Every layer above is a percentage claim: EDR "deployed" means deployed to what fraction of what inventory? The architecture prerequisite is an asset inventory the coverage can be measured against — endpoint management, EDR console, directory, and network-discovered device counts reconciled, with the deltas explained. Unmanaged and unknown endpoints are where incidents start; a 95%-coverage EDR with an inventory that's 80% complete is really 76% coverage with false confidence. Make the coverage number a standing metric, not an onboarding-project artifact.

## Control mapping

- **SP 800-53 Rev. 5**: CM-2/CM-6 (baseline configuration — the hardening layer), CM-7(5) (allowlisting), SI-3 (malicious code protection), SI-2 (flaw remediation — patch architecture), SC-28 (protection at rest — disk encryption), SI-4 (monitoring — EDR telemetry), MP family for media, AC-19 (mobile devices).
- **CSF 2.0**: Protect (PR.PS platform security — hardening, patching, software integrity), Detect (DE.CM), Identify (ID.AM — the inventory the coverage question depends on).
- **ATT&CK**: the endpoint is where most Enterprise techniques land; mitigations M1038 (Execution Prevention — application control), M1042 (Disable or Remove Feature or Program — hardening), M1051 (Update Software); map detections to endpoint Data Sources per `mitre-attack.md`.
- **Compliance hooks**: PCI DSS Req. 5 (anti-malware) and 2.2 (hardening standards) for in-scope endpoints; CIS/STIG baselines as the evidence artifact; CMMC/800-171 3.4 (configuration management) and 3.14 (system integrity); SOX ITGC operations for in-scope servers — see `compliance.md`.

## Decision criteria

- **Small org**: platform-native stack first (built-in EDR tier, native encryption and firewall, cloud-managed baseline via the endpoint-management suite already licensed) — deployed to 100% beats best-of-breed at 60%; MDR watching it (`domain-secops.md`).
- **Mid-size**: dedicated EDR with real response capability, ring-based patching, application control on servers, PAW-lite (separate admin accounts + browser/email-free admin VMs) as the affordable tiering step.
- **Large / regulated**: full tiering with physical PAWs for tier-0, application control enforced broadly, formal exception register with compensating controls and expiry dates, coverage metrics reported monthly, OT estate under its own architecture.
- The universal ordering: inventory → baseline → EDR coverage → application control → the exotic layers. Skipping ahead buys dashboards, not defense.

## Assessment questions

- What is the endpoint inventory of record, how is it reconciled against EDR/management-console/directory counts, and what's the current unexplained delta?
- What percentage of the estate has EDR in *blocking* mode with tamper protection on? Show the exclusions list and who approved it.
- Which hardening baseline applies, how is drift detected, and when did someone last verify a sample machine against it?
- Where do administrators do administration — the same machine as email and browsing? What does tier-0 access physically require?
- Show the patch metrics: median time-to-patch for critical (KEV-listed — `cvss.md`) vulnerabilities on internet-facing, server, and user populations, and the exception register for what's off-cycle.
- What can an unmanaged personal device reach, and what enforces that boundary — policy document or conditional access?
- Are recovery keys for disk encryption escrowed, and has restore-from-escrow been tested?
- What OT/IoT devices exist, who owns them, and what network can they see?
