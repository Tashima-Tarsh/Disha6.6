# Scoring & Prioritization — The Right Instrument

Scoring fails two ways: the wrong instrument applied because it was familiar (CVSS on a design flaw), and the right instrument's output misread (base score treated as risk). This file prevents both. CVSS specification detail composes with cybersecurity-architecture; this is usage discipline.

## Contents

1. CVSS: where it fits
2. CVSS vector discipline
3. "CVSS is not the right instrument here"
4. Context-driven prioritization: severity ≠ risk
5. Roadmap discipline

---

## 1. CVSS: where it fits

CVSS scores **conventional vulnerabilities in the serving and infrastructure stack**: software vulnerabilities (CVE-mapped or not) in services, dependencies at design-visible level, OS and platform components, network devices, and exploitable weaknesses with a definable attack vector, complexity, and impact in CVSS's terms.

Every CVSS use in an assessment carries the **full vector string**, not just the number — the vector is the reasoning, the number is a summary:

> CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H — 9.8 Critical

## 2. CVSS vector discipline

- **Version stated: v3.1 or v4.0. Never mixed within an assessment.** Scores from different versions are not comparable; a register mixing them is quietly incoherent. When ingested findings (a scanner export, a code-security-analysis report) arrive in the other version, convert the assessment to one version — re-scoring from the vulnerability, not arithmetic on the score — and state which and why.
- Score in the assessed system's context. A published base score assumes the reference configuration; if the environment changes a metric (the service is not network-reachable: AV differs), the assessment's vector reflects the environment, with the divergence from the published vector noted. Environmental metrics are the sanctioned mechanism when the organization uses them — say so if used.
- CVSS vectors appear in the register's "CVSS Vector where applicable" column — meaning the column is legitimately empty for most design-level rows. An empty column is honesty, not a gap.

## 3. "CVSS is not the right instrument here"

The explicit call, made in the report's own voice, for findings CVSS cannot express:

- **Model extraction, inversion, and poisoning** (ATLAS AML.T-series): no meaningful AV/AC/PR decomposition; a "score" for model theft via query access is a number wearing a costume.
- **Misconfigurations as predisposing conditions:** an open egress policy or an over-permissive trust relationship is not itself a vulnerability with a CVSS-shaped exploit; it is a condition that moves likelihood in the chains it touches.
- **Systemic design weaknesses:** missing segmentation, shared credentials across trust boundaries, absent tenant isolation. These are the highest-consequence findings in most design assessments, and forcing them into CVSS either produces a fake vector or — worse — omits them because they would not score.

These findings get **SP 800-30 risk language instead** (risk-analysis.md §1): full chain, named scales, rating from the matrix. The report states the instrument choice per finding class once, plainly: "design-level findings are rated with SP 800-30; CVSS vectors are provided only where a conventional vulnerability supports one." An assessment sampled by someone competent gets credit for that sentence; an assessment with CVSS vectors on design flaws gets its scoring thrown out wholesale.

## 4. Context-driven prioritization: severity ≠ risk

**Base scores are severity, not risk.** Stated plainly, applied everywhere. A 9.8 on an isolated, monitored, low-value internal service can rank below a 6.5 on the internet-facing service in front of the crown jewels. Prioritization layers context onto severity:

| Layer | What it moves | Discipline |
|---|---|---|
| KEV membership | Exploitation confirmed in the wild — likelihood floor rises sharply | KEV is a living catalog: flag each cited entry for confirmation at assessment time, with date checked |
| EPSS | Probability-of-exploitation signal | Cite score and date; EPSS is a model output, an input to judgment, not an override of it |
| Exposure | Internet-facing vs. internal vs. isolated — from the threat model's reachability, not asserted | An "internal" service reachable through an enumerated path is not internal for this purpose |
| Asset criticality | From scoping's data classification and business context | The same weakness ranks differently by what sits behind it |

The output of this layering is the **risk-informed priority order** — which is the SP 800-30 chain doing its job: KEV/EPSS/exposure land in likelihood, criticality lands in impact, and the rating that falls out is the priority input. Severity is one column; priority is the conclusion.

## 5. Roadmap discipline

- **Group findings by risk × effort.** Rating alone does not sequence work: a High fixed by one firewall rule change precedes a High requiring a re-architecture, and the roadmap says so. Effort is estimated honestly at t-shirt granularity (configuration change / engineering task / project), not invented in hours.
- **Top three actions named first.** Before tiers, before tables: the three actions that most reduce risk, in order, each with its rationale in one sentence. If the reader stops after the top three, they stopped in the right place.
- **Tiered timelines with rationale.** The seed pattern: findings in the internet-facing-critical / KEV class are measured in **hours and days, not quarters** — confirmed exploitation against reachable surface does not wait for a planning cycle, and the tier's rationale says exactly that. Subsequent tiers (near-term, planned, strategic) each carry their reasoning; a timeline without a rationale is a preference, and this skill does not present preferences as mandates.
- **Requirement vs. implementation in every roadmap entry.** "[SC-7(5) requires deny-by-default network communications traffic; in this environment the cleanest implementation is [Y] because [Z]" — the framework anchors the requirement, the environment justifies the implementation, and the two are never fused into a fake mandate.
- **Residual risk closes the roadmap.** What the completed roadmap does not fix, which compensating controls carry interim weight, and which risks the organization is implicitly or explicitly accepting — stated, because an unstated residual is the next assessment's finding against this one.
