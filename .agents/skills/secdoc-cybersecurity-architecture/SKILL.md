---
name: cybersecurity-architecture
description: Perform cybersecurity architecture work grounded in authoritative frameworks — MITRE ATT&CK and ATLAS, NIST Special Publications (800-53, 800-37, 800-30, 800-171, 800-207, CSF), CVSS scoring, and compliance regimes (SOX, SOC 2, PCI DSS, GDPR, CMMC). Use this skill whenever the user asks about security architecture reviews, threat modeling, control selection or mapping, risk assessment, vulnerability prioritization, compliance gap analysis, zero trust design, AI/ML system security, audit preparation, or wants any security recommendation tied to a recognized framework, or asks domain questions — SOC/SIEM/detection engineering, incident response, cloud security, endpoint/EDR, secure SDLC/supply chain, DLP/encryption/key management, IAM/PAM/federation, segmentation/ZTNA, governance/risk programs, CMMC/CUI scoping. Also trigger on artifacts like a system design to review, a finding to score, an SoA, a controls matrix, or asks "what does NIST/ATT&CK/PCI say about X" — even if they don't use the word "architecture."
---

# Cybersecurity Architecture

This skill supports architecture-grade security work: analysis that a senior practitioner could defend in front of an audit committee, a CISO, or an assessor. Two principles govern everything below.

**Cite specifically, never vaguely.** "NIST recommends MFA" is worthless in architecture work. "NIST SP 800-63B AAL2 requires multi-factor authentication using either a multi-factor authenticator or a combination of two single-factor authenticators" is usable. Every framework claim gets an identifier: a control ID (AC-2(1)), a technique ID (T1078.004), a requirement number (PCI DSS 8.3.6), a Trust Services criterion (CC6.1), an article (GDPR Art. 32(1)(a)), an 800-171 requirement (3.5.3). If you cannot name the identifier, say so and verify before asserting.

**Verify versions before citing.** These frameworks move. ATT&CK ships two releases a year and deprecates/merges techniques. CVSS v4.0 coexists with v3.1 in the wild. PCI DSS v4.0.1 superseded v4.0, and future-dated requirements became mandatory March 2025. NIST SP 800-53 is at Rev. 5 with periodic patch releases; the CSF is at 2.0. CMMC program status, level requirements, and rollout timing change across revisions. GDPR transfer mechanisms (adequacy decisions, SCC status) move. When a citation carries version-sensitive weight (a specific technique ID, a scoring vector, a requirement that recently changed, a program-status claim), confirm currency via web search against the canonical source before presenting it. When working offline or search is unavailable, state the version you are citing against and flag that it should be confirmed.

## Task routing — frameworks

Identify what the user actually needs, then load only the relevant references. Most real requests span two or three of these.

| Task | Read | Typical output |
|---|---|---|
| Threat model a system or design | `references/mitre-attack.md` (+ `mitre-atlas.md` if AI/ML components) | Threat model with mapped technique IDs and mitigations |
| Secure an AI/ML system, LLM app, or model pipeline | `references/mitre-atlas.md` + `references/mitre-attack.md` | ATLAS-mapped threat model, AI-specific controls |
| Select, map, or tailor controls | `references/nist-sp.md` | Control baseline / crosswalk with control IDs |
| Assess or document risk | `references/nist-sp.md` | Risk register entries per SP 800-30 methodology |
| Score or prioritize vulnerabilities | `references/cvss.md` | CVSS vector strings + contextual prioritization |
| Compliance gap analysis, audit prep (SOX / SOC 2 / PCI DSS / GDPR / CMMC) | `references/compliance.md` | Gap matrix, remediation roadmap, evidence guidance |
| Architecture review, zero trust, defense-in-depth design | `references/architecture-best-practices.md` + others as relevant | Findings with framework-anchored recommendations |

## Task routing — domains

Eight domain files cover the architect's practice areas. Each carries the same internal shape — scope, architecture patterns, control mapping, decision criteria, assessment questions — so they compose cleanly. Load the domain file(s) the question lands in; cross-domain questions (most real ones) load two or three.

| Question class | Read |
|---|---|
| SOC design, SIEM, detection engineering, SOAR, threat intel, threat hunting, incident response | `references/domain-secops.md` |
| Cloud security, landing zones, IaC security, CSPM/CNAPP, workload identity, hybrid boundaries, Kubernetes | `references/domain-cloud-hybrid.md` |
| Endpoint stack, EDR/XDR, hardening baselines, MDM/BYOD, PAWs, OT/IoT endpoints, coverage | `references/domain-endpoint.md` |
| Secure SDLC, threat modeling programs, SAST/DAST/SCA, supply chain/SBOM/SLSA, API security, secrets | `references/domain-appsec.md` |
| Data classification, encryption architecture, key management, DLP, tokenization, PQC readiness | `references/domain-data-crypto.md` |
| IdP/directory design, MFA/passwordless, RBAC/ABAC/ReBAC, PAM, identity governance, NHI, conditional access | `references/domain-iam.md` |
| Zones and segmentation, rulebase governance, egress policy, NDR, ZTNA policy, TLS inspection | `references/domain-network-perimeter.md` |
| Program operating model, CISO reporting, policy hierarchy, risk register mechanics, metrics, third-party risk, budget, compliance program design | `references/domain-governance.md` |

## Boundaries with sibling skills

These skills partition trigger space; compose across them rather than restating their content:
- **application-architecture** owns coding practice, language idioms, and CI/CD engineering; `domain-appsec.md` owns the security architecture those practices plug into.
- **network-engineering** owns device-level firewall/switch/router engineering; **networking-architecture** owns SASE/SSE adoption strategy and WAN design; `domain-network-perimeter.md` owns the security policy and zone architecture both implement.
- **ai-ml-engineering** owns ML attack mechanics and model engineering; AI-system *security architecture* stays here via `references/mitre-atlas.md`.
- **executive-reporting** owns the shape of leadership deliverables; `domain-governance.md` supplies the content architecture (which risks, which metrics, what decision is being asked).

If the request is ambiguous ("review our security posture"), ask one scoping question — what system/scope, and what the output feeds into (board report, auditor, engineering backlog) — because the audience changes the framing more than the analysis does.

## Core workflow

1. **Establish scope and context.** System boundaries, data classification, deployment model (on-prem / cloud / hybrid), regulatory drivers, and threat actors of concern. An architecture recommendation without scope is a guess. If the user has provided a diagram, design doc, or config, read it fully before mapping anything.

2. **Map to the adversary view first, controls second.** For any threat-informed task, start from ATT&CK/ATLAS (what can the adversary do here?) and only then map to NIST controls and compliance requirements (what stops it, and what does the paperwork require?). This ordering matters: compliance-first analysis produces checkbox architectures that pass audits and fail incidents.

3. **Crosswalk, don't duplicate.** When multiple regimes apply (common in financial services: SOX + SOC 2 + PCI DSS simultaneously; add GDPR for EU data subjects and CMMC for defense work), build one control set and map each regime's requirements onto it. A single well-designed access-review process can satisfy SOX ITGC access controls, SOC 2 CC6.2/CC6.3, PCI DSS Req. 7, GDPR Art. 25/32 access limitation, and 800-171 3.1 at once. Say so explicitly — control rationalization is where architecture earns its keep (`domain-governance.md`, compliance program architecture).

4. **Distinguish requirement from implementation.** Frameworks say *what*; architecture decides *how*. Present both layers separately: "PCI DSS 8.3.6 requires [X]; in your environment, the cleanest implementation is [Y] because [Z]." Never present an implementation choice as if the framework mandates it.

5. **State residual risk honestly.** Every recommendation set ends with what it does *not* cover. Compensating controls, accepted risks, and known gaps go in writing. An architecture document that claims completeness is a liability document.

## Output conventions

- Threat-model artifact names begin with `YYYYmmdd_hh:mm:ss_name`, using the assessment-start date and time. Keep the timestamp first and reuse the same prefix for companion artifacts. State the timezone in document metadata. If a destination filesystem rejects `:`, obtain an approved substitution instead of silently renaming the artifact.
- Deliverables (threat models, gap matrices, control mappings, risk registers) are structured documents — produce them as files when they exceed conversational scale, matching whatever format the user's workflow needs.
- Every framework reference carries its identifier and version (e.g., "T1557 — Adversary-in-the-Middle, ATT&CK v16" or "AC-6(9), SP 800-53 Rev. 5").
- CVSS scores always include the full vector string, never just the number. A bare "7.5" is unfalsifiable; the vector shows the reasoning.
- Recommendations are prioritized. Undifferentiated lists of 40 findings help no one; group by risk and effort, and name the top three things to do first.
- Match the audience: executive summaries lead with business risk in plain language; engineering sections carry the IDs, vectors, and configuration specifics.

## What this skill does not do

- It does not certify compliance. Gap analyses inform; only a QSA (PCI), a CPA firm (SOC 2, SOX), a C3PAO/DIBCAC (CMMC), or an authorized assessor can attest — and GDPR questions of lawfulness belong to counsel and the DPO. Say this when the output could be mistaken for attestation or legal advice.
- It does not replace scoping with the actual assessor. Where a requirement's applicability is genuinely contestable (PCI scoping, SOX materiality, CUI identification, GDPR lawful basis), flag it as an assessor or counsel conversation rather than resolving it unilaterally.
- It does not produce exploit code or offensive tooling. ATT&CK mapping describes adversary behavior to defend against it; the skill stays on the defensive side of that line.
