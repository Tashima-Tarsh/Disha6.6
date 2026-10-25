# Reporting — Outputs That Survive Scrutiny

The report is the assessment as far as anyone downstream is concerned: the audit committee samples it, the CISO cross-examines it, the design team works from it. This file specifies the flagship report, the rapid-tier memo, and the executive rollup — and the voice that runs through all of them.

## Contents

1. The flagship report: format and naming rules
2. Section order (fixed)
3. The two tables
4. Presentation standards
5. Rapid-tier variant: the findings memo
6. Executive rollup
7. The reporting voice

---

## 1. The flagship report: format and naming rules

The full-assessment deliverable is a **single self-contained HTML file**:

- Renderable offline: no external CDNs, no network calls, no remote fonts, no fetched scripts. All CSS inline or in a `<style>` block; any chart or figure rendered as inline SVG or CSS. The file a security review produced should not itself phone home, and it must open identically on an air-gapped review workstation in five years.
- Self-contained means printable: the file must produce a sane PDF via the browser's print path (print CSS included), because that is how it enters the audit binder.
- One file, versioned in its own header block: report title, system assessed, assessment date, depth tier, assessor context, methodology and catalog versions used (ATT&CK vX, ATLAS vY, SP 800-30 Rev. 1, SP 800-53 Rev. 5, CVSS v3.1 or v4.0), and the artifact inventory (each input document with its date/version).

### File and companion-artifact naming

Every threat-model artifact begins with the assessment-start timestamp in the exact form `YYYYmmdd_hh:mm:ss_name`. Example: `20260825_15:45:30_lab-architecture-threat-model.html`.

- The timestamp is first. Do not name an artifact `lab-architecture-20260825...`.
- State the timezone in the report header because the filename does not carry one.
- Use one prefix for all companion artifacts from the same assessment, for example `.html`, `.tm`, `.svg`, `.json`, and evidence files. This keeps the set adjacent in lexical file listings.
- A re-assessment receives a new start timestamp. Do not overwrite the prior dated model.
- If the destination filesystem prohibits `:`, ask for an approved filesystem-safe substitution. Do not silently depart from the naming rule.

## 2. Section order (fixed)

1. **Executive Summary** — business risk in plain language: what the system does, what the most consequential exposures are and to whom, overall posture as a distribution (never an average — risk-analysis.md §7), and the **top three priorities** with one-sentence rationales. No framework IDs in the first paragraph; the executive layer earns the reader's attention before the citations start.
2. **Scope & Context** — the scope-extraction checklist results (methodology.md §2) with artifact citations, threat actors of concern, regulatory drivers, and the **Assumptions / Information Gaps** subsection, prominent, formatted per methodology.md §3.
3. **Threat Model** — the coverage-honesty statement (threat-modeling.md §9), then the table (§3 below), then the abuse-case narratives for the significant paths.
4. **Risk Register** — the register table (§3 below), one risk per row, chains traceable.
5. **Prioritized Remediation Roadmap** — top three first, then tiers with rationale, entries in the requirement-vs-implementation pattern, grouped by risk × effort (scoring-prioritization.md §5).
6. **Residual Risk & Limitations** — uncovered gaps, compensating controls carrying interim weight, accepted risks, what this tier could not conclude (methodology.md §4), and the **attestation disclaimer**: this assessment informs preparation and is not a compliance attestation; only a QSA attests PCI DSS, only a CPA firm attests SOC 2, only the external financial auditor attests SOX.

If an embedded directive was found in any artifact (methodology.md §5), it is reported as a finding in the register and noted in Scope & Context.

## 3. The two tables

**Threat Model table** — columns, in order:

| Attack Path | ATT&CK/ATLAS ID (version) | Trust Boundary Crossed | Affected Component |
|---|---|---|---|

Each path has an ID (TM-01…) so register rows and roadmap entries can reference it. Multi-step paths list the ID sequence entry-to-impact.

**Risk Register table** — columns, in order:

| Risk ID | Threat Source | Threat Event | Vulnerability / Predisposing Condition | Likelihood | Impact | Risk Rating | Mapped Control(s) | CVSS Vector (where applicable) | Compliance Crosswalk |
|---|---|---|---|---|---|---|---|---|---|

- Mapped controls at SP 800-53 Rev. 5 **enhancement granularity** — AC-2(1), SC-7(5) — with requirement language paraphrased in the row or its note, never the bare title.
- CVSS column: full vector string with version, or empty (an empty cell is the instrument call, per scoring-prioritization.md §3).
- Crosswalk: regimes listed on the row's control once; no per-regime duplicate rows.

## 4. Presentation standards

- **Color-coded ratings** — Critical/High/Medium/Low with consistent colors across every table and the summary, encoded in text as well as color (the rating word always appears; color alone fails print and accessibility).
- **Every framework reference carries identifier and version**, in the reference itself, not a footnote the reader must hunt: "SC-7(5), SP 800-53 Rev. 5," "T1190, ATT&CK v16."
- Version-sensitive citations (ATT&CK/ATLAS IDs, KEV entries, EPSS values) carry the confirm-at-assessment-time flag established in the standards; the report's header block states the catalog versions once, rows flag exceptions.
- Tables sortable if scripted locally (inline JS only, still zero network); degrade gracefully unscripted and in print.

## 5. Rapid-tier variant: the findings memo

The rapid design review (methodology.md §4) ships a **findings memo**, not the full register — HTML or Markdown, same offline rules if HTML:

1. What was reviewed and at what depth (the tier's limits stated — no completeness claim).
2. Assumptions / Information Gaps — *more* prominent than in the full report, because there are more of them.
3. Top attack paths, ATT&CK/ATLAS IDs and boundary crossed, abbreviated table.
4. Top risks, each with its full 800-30 chain in narrative form (the chain is non-negotiable at every tier).
5. Top three actions with rationale.
6. The attestation disclaimer and what a full assessment would add.

The memo omits the exhaustive register and roadmap tiers; it never omits chains, gaps, versions, or the disclaimer.

## 6. Executive rollup

When the audience is a board or executive committee rather than an engineering team, the rollup **composes with executive-reporting** — that skill owns the deliverable format (brief, deck, memo); this skill supplies the content: posture distribution, top risks in business language, top three priorities, residual risk, and the attestation disclaimer, which survives every compression. The register and threat model do not get pasted upward; they get cited as the underlying record.

## 7. The reporting voice

The requirement-versus-implementation sentence pattern is the reporting voice throughout, not just the roadmap's:

> "[Framework ID + version] requires [X, paraphrased]; in this environment the cleanest implementation is [Y] because [Z]."

Everywhere the report recommends, that structure holds: the mandate is the framework's, cited; the implementation is a justified choice, argued; and no sentence lets a preference borrow a framework's authority. Assessment prose is evidence, chain, and citation — the language rules in SKILL.md apply to every output without exception, because the register of an assessor whose work gets sampled is the only register that survives sampling.
