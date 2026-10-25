# Risk Analysis — SP 800-30 Executed Properly

NIST SP 800-30 Rev. 1 is the skill's risk-analysis backbone. The framework's structure lives in cybersecurity-architecture; this file is execution discipline — how a chain gets built so it traces, how the scales get applied so they're consistent, and the traps that make registers lie.

## Contents

1. The chain, every link named
2. Threat sources
3. Likelihood without vibes
4. Impact anchored to scoping
5. Register construction
6. Qualitative vs. quantitative honesty — FAIR at orientation depth
7. Aggregation traps

---

## 1. The chain, every link named

Every risk in every output carries the full SP 800-30 chain, explicitly:

**threat source → threat event → vulnerability or predisposing condition → likelihood → impact → risk**

"Ransomware risk: high" is not analysis — it names none of the links, so nothing about it can be examined, challenged, or re-scored when conditions change. The same risk as a chain:

> Financially motivated criminal group (capability: moderate — commodity tooling plus purchased access) [threat source] → deploys ransomware via the internet-facing file-transfer service [threat event: initial access T1190, impact T1486, ATT&CK v16] → which runs an unsupported OS version with no egress filtering from its segment [vulnerability + predisposing condition] → Likelihood: High (SP 800-30 App. G scale — actor capability matches the exposed weakness; KEV-listed CVE present, flagged for confirmation) → Impact: High (App. H scale — service hosts the customer-document store classified Confidential in scoping §2) → **Risk: High** (App. I matrix).

Every link is a claim someone can check. That is the point.

**Scales named, applied consistently.** Use the SP 800-30 Rev. 1 appendix scales (App. D/E/G/H/I) or a stated organizational equivalent — but one scale set per assessment, named in the report, applied to every row. Mixing scales within an assessment, or leaving the scale implicit, makes ratings incomparable across rows and indefensible under sampling.

## 2. Threat sources

Taken from scoping when the organization stated its actors of concern. When unstated, use a defensible default set — adversarial (cybercriminal, insider, and, where the sector warrants, state-sponsored), accidental (user/admin error), structural (equipment and software failure), environmental — labeled as an assumption per methodology.md §3, and characterized per SP 800-30 App. D: capability, intent, targeting for adversarial sources. The characterization is not decoration; likelihood depends on it (§3).

## 3. Likelihood without vibes

Likelihood is assessed against two things, both from the assessment itself:

1. **The threat source's capability and intent** (App. D characterization). A weakness exploitable only with sustained access and custom tooling rates differently against a commodity-kit actor than against a targeted one. If the rating would not change when the actor changes, the rating was vibes.
2. **The predisposing conditions** (App. F): exposure (internet-facing vs. internal), the state of relevant controls as *verified in the artifacts* (claimed ≠ verified — a claimed control moderates likelihood only with the claim flagged), and environmental factors from scoping.

Evidence that legitimately moves likelihood, cited when used: KEV membership (exploitation confirmed in the wild), EPSS context, exploit maturity, the entry point's reachability established in the threat model. All version/date-sensitive — flag for confirmation at assessment time.

What does not move likelihood: how scary the threat event sounds, how recently it made news, or how uncomfortable the finding is for the design team.

## 4. Impact anchored to scoping

Impact ties to the **data classification and business context extracted in scoping** — not to worst-case imagination. The chain's impact link cites what is actually at that component: "hosts the store classified Confidential per scoping §2" scores differently than "hosts session-transient telemetry," even for the same technical event.

If classification was a scoping gap, every impact rating downstream inherits that gap explicitly: "Impact rated High assuming the PII handling described in [artifact §x]; unconfirmed — see Assumptions / Information Gaps." Regulatory drivers from scoping feed impact too (breach-notification exposure, availability obligations), which is where the compliance crosswalk anchors.

## 5. Register construction

- **One risk per row.** One chain, one rating, one set of mapped controls. "Weak authentication and logging gaps across several services" is three or more rows pretending to be one; it cannot be scored, assigned, or closed coherently.
- **Chains traceable.** Every row's links resolve to something in the assessment: the threat event to a threat-model path (by path ID), the vulnerability/predisposing condition to an artifact citation or a stated gap, likelihood and impact to the named scales with their reasoning, mapped controls to SP 800-53 Rev. 5 enhancement-granularity citations.
- **No orphan findings.** Nothing enters the register that did not come through the workflow — no path, no chain, no row. A concern that surfaced outside enumeration goes back through the model first (which usually improves it) or into a "observations outside assessed scope" note, clearly not register material.
- **Crosswalk once.** Compliance regimes crosswalk onto the row's mapped control, one row regardless of how many regimes care (SKILL.md standard). The crosswalk column says which regimes; the finding exists once.
- **Row anatomy** (matches the report table in reporting.md §3): Risk ID | Threat Source | Threat Event | Vulnerability / Predisposing Condition | Likelihood | Impact | Risk Rating | Mapped Control(s) | CVSS Vector where applicable | Compliance Crosswalk.

## 6. Qualitative vs. quantitative honesty — FAIR at orientation depth

The appendix scales are qualitative/semi-quantitative. That is a feature for most assessments — defensible with the evidence actually available — and a limit worth stating: qualitative ratings order risks; they do not price them.

When leadership wants dollars, FAIR (Factor Analysis of Information Risk) is the honest pointer, offered at orientation depth:

- FAIR decomposes risk into loss event frequency and loss magnitude, estimated as calibrated ranges, combined by simulation into an annualized-loss-exposure distribution.
- **Its data hunger stated plainly:** FAIR output is only as good as its inputs — loss-event frequency data, loss-magnitude data from actual incident costs, and calibrated estimation where data is thin. An organization without incident cost history and estimation discipline gets ranges wide enough to be honest and too wide to be useful. Running FAIR on vibes produces the same vibes with a dollar sign.
- The composition: this skill's chains and register are correct FAIR inputs (threat events, conditions, affected assets). Offer the mapping; do not fake the quantification inside a qualitative assessment. A register row never carries an invented dollar figure.

## 7. Aggregation traps

Three ways a technically correct register produces a wrong conclusion:

1. **Averaging risk ratings.** Ordinal ratings cannot be averaged; "overall risk: medium" computed over rows is arithmetic on labels. Posture is communicated as a distribution — "2 Critical, 3 High, 12 Medium, top three below" — never a mean.
2. **Double-counting one vulnerability across many paths.** One weakness reachable by four paths is one register row (the worst-case chain rated), with the other paths referenced by ID in the row. Four rows for one fix inflates the register, splits the remediation signal, and gets caught in sampling as padding.
3. **The portfolio view that hides the one critical under twelve mediums.** Counts and heat maps invite reading volume as posture. The report's executive layer leads with the top risks by rating and consequence — the internet-facing critical outranks any pile of mediums, and the roadmap's top-three discipline (scoring-prioritization.md §5) enforces it. If the summary would read differently after deleting all the mediums, the summary was written wrong.
