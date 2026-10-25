# CVSS — Scoring and Prioritization

Canonical source: FIRST.org (https://www.first.org/cvss/) — specification, calculator, and examples. Two versions live in the wild: **v3.1** (still dominant in NVD data and most tooling) and **v4.0** (current standard). State which version a score uses, always, and never mix metrics across versions in one vector.

## Non-negotiable conventions

- **Always give the full vector string, never a bare number.** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` (9.8) is auditable; "9.8" is an assertion. The vector *is* the reasoning.
- **Score the vulnerability, not the worst imaginable outcome.** Base metrics reflect the vulnerable component's exploitation characteristics. Environmental context comes in through the Environmental metric group — not by inflating the base.
- **Base scores are severity, not risk.** This is the single most common misuse. A 9.8 on an air-gapped lab box can matter less than a 6.5 on the internet-facing payment gateway. Prioritization requires context the base score deliberately excludes.

## v3.1 in brief

Base (AV/AC/PR/UI, Scope, C/I/A) + Temporal (E/RL/RC) + Environmental (modified base metrics + CR/IR/AR security requirements). The **Scope** metric (S:U vs S:C) trips people: it changes when exploitation impacts resources beyond the vulnerable component's security authority — a hypervisor escape is the canonical S:C.

## v4.0 changes that matter

- Nomenclature is explicit about what's included: **CVSS-B** (base), **CVSS-BT** (+threat), **CVSS-BE** (+environmental), **CVSS-BTE** (all). Label scores accordingly.
- Scope is retired, replaced by separate impact sets for the **Vulnerable System (VC/VI/VA)** and **Subsequent Systems (SC/SI/SA)** — cleaner for architecture discussions of blast radius.
- Temporal group became **Threat** (essentially exploit maturity, E), sharpening the intent: a CVSS-BT score with E:U (no known exploitation) can legitimately drop priority.
- New base metric **AT** (Attack Requirements) distinguishes deployment-condition prerequisites from attack complexity; **UI** is refined (N/P/A).
- Supplemental metrics (Safety, Automatable, Recovery, etc.) inform but don't change the score.

## Prioritization methodology (what to actually recommend)

CVSS alone does not produce a patch queue. Layer, in order:

1. **CVSS-B** — intrinsic severity (usually from NVD/vendor; recompute if the advisory's vector is wrong for the deployment).
2. **Threat/exploitation evidence** — CISA **KEV** catalog membership (known exploited → jump the queue regardless of score) and **EPSS** probability (https://www.first.org/epss/) for likelihood-of-exploitation. CVSS says how bad; EPSS says how likely; KEV says it's happening.
3. **Environmental context** — exposure (internet-facing?), the asset's CR/IR/AR (a confidentiality-critical data store raises CR), compensating controls, and business criticality. This is where the architect earns the title: encode environment once as Environmental metrics and reuse across findings.
4. **Compliance constraints** — e.g., PCI DSS external ASV scans require remediating findings scored 4.0+ (CVSS-based), and Req. 6.3.1/6.3.3 impose risk-ranked patching with defined timelines for critical/high vulns. Note where a regime forces a floor under the risk-based ordering.

Present the result as tiers with rationale (e.g., "Tier 1 — KEV-listed or internet-facing Critical: 72h"), not a raw score sort.

## Pitfalls

- Rescoring vendor advisories downward without documented environmental justification — that's suppression, not scoring. Use Environmental metrics so the adjustment is explicit and reversible.
- Treating NVD vectors as infallible; NVD analysts score from advisory text and sometimes miss context. Disagreement is fine if the vector-level reasoning is shown.
- Applying CVSS to things it doesn't fit: misconfigurations without a vulnerability, systemic design weaknesses, most AI/ML attack classes (see `mitre-atlas.md`), and aggregate risk. Say "CVSS is not the right instrument here" and use risk-assessment language (SP 800-30) instead.
