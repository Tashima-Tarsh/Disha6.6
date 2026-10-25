---
name: executive-reporting
description: Synthesize source material (emails, documents, spreadsheets, web data, meeting notes, raw metrics) into executive-level deliverables — email briefs, Word reports, or PowerPoint decks. Use this skill whenever the user asks for an "exec summary," "executive summary," "board update," "leadership brief," "status report," "monthly rollup," "QBR," "program update," "steering committee update," or asks to turn emails, reports, notes, or numbers into a brief, report, or deck for a boss, VP, leadership, the board, or stakeholders. Trigger on the task shape — multiple sources synthesized into an upward-facing report — even when the user never says "executive." Do NOT use for ordinary document formatting or editing requests that involve no synthesis of sources for a leadership audience.
---

# Executive Reporting

Turn messy source material into a deliverable an executive acts on. The two disciplines that make this work: an ingestion inventory that makes every claim traceable, and synthesis standards that put the answer first and attach a "so what" to every number.

## Workflow

Run these steps in order. Do not skip the inventory — it is the foundation of the source appendix and the provenance discipline.

1. **Inventory the sources.** List every source before reading any of them closely (format below).
2. **Ingest.** Read each source using the appropriate skill or tool (see Source ingestion).
3. **Confirm audience and output type** if not already clear from the request (see Audience calibration).
4. **Synthesize** per the standards below: BLUF, findings → implications → recommendations → asks.
5. **Draft** the deliverable(s) per the requested output type's reference file.
6. **Format and deliver.** Delegate file production to the docx and pptx skills — never reimplement document generation. Attach the source appendix built from the inventory.

## Source ingestion

Accept any mix of: pasted or uploaded email content (or email fetched via a connected mail integration), URLs and web search results, uploaded documents (.docx, .pdf, .xlsx, .csv, .pptx — read via the docx, pdf, xlsx, and pptx skills respectively), raw stats and metrics, and meeting notes. Sources will be messy — forwarded threads with quoted history, half-finished spreadsheets, vendor PDFs. The inventory is what makes that mess reportable.

### Inventory first

Before synthesizing, produce a source inventory. Every source gets an identifier (S1, S2, ...), a type, a date, and a one-line summary. This inventory becomes the report's source appendix verbatim.

**Inventory format:**

| ID | Type | Date | Summary |
|----|------|------|---------|
| S1 | Email (fwd thread) | 2026-07-28 | Vendor confirms migration slips two weeks; new cutover Aug 22 |
| S2 | Spreadsheet (.xlsx) | 2026-07-31 | July cloud spend by team; two tabs, second tab incomplete |
| S3 | Web (vendor status page) | fetched 2026-08-04 | Platform SLA history, last 90 days |
| S4 | Meeting notes | 2026-07-30 | Steering committee: budget freeze on new tooling until Q4 |

If a source carries no date, record "undated" and treat its claims as unverified for freshness purposes.

### Provenance on every claim

Every finding, number, and quote in the deliverable traces to a source ID. In working drafts, tag claims inline (e.g., "spend is 18% over plan [S2]"); in the final deliverable, carry provenance in the source appendix, footnotes, or speaker notes as the output type's reference file specifies.

If two sources conflict, surface the conflict. Either resolve it with stated reasoning ("S2 shows $412K, S1's forwarded figure of $390K predates the July true-up; using S2") or present both with their dates. Never silently pick one.

### Freshness flags

Compare each source's date against the reporting period. Flag anything stale ("headcount figure is from May; reporting period is July"). Time-sensitive claims — market data, headcounts, statuses, prices — carry their as-of date in the deliverable itself, not just the appendix.

### No invented data — hard rule

If the sources don't support a number or claim the report structure seems to want, write "not available in provided sources" or ask the user. Never fabricate, never extrapolate without labeling the extrapolation as such, never fill a template cell with a plausible value. An executive who catches one invented number distrusts the entire report and the tool that made it. An honest gap costs nothing; a fabricated figure costs everything.

## Synthesis standards

**BLUF.** Bottom line up front, always. The single most important finding or decision goes in the first sentence of the email, the first paragraph of the report, the first slide of the deck. Background never comes first.

**So-what discipline.** Every metric carries its implication. "Revenue is $4.2M" is data. "Revenue is $4.2M, which puts us 9% behind the level the Q4 plan assumes" is reporting. If a number appears without an implication, either find the implication in the sources or cut the number.

**Structure: findings → implications → recommendations → asks.** In that order, clearly separated. Executives skim for the ask — make it findable in seconds, with an owner and a deadline where the sources support one.

**Risk and confidence honesty.** Where evidence is thin, say so in plain language: "one source, unverified," "vendor's own figure, not independently confirmed," "extrapolated from six weeks of data." Never dress uncertainty in confident prose.

**Audience calibration.** Ask (or infer from context) whether the audience is the board, the C-suite, or a steering committee / VP level, then adjust altitude:
- **Board:** strategy, exposure, material risk, decisions requiring board action. No operational detail.
- **C-suite:** performance against plan, cross-functional impact, resource decisions.
- **Steering committee / VP:** progress against plan, blockers, dependencies, near-term asks.

If the request already names the audience ("for my VP," "board update"), don't ask — proceed.

## Output types

The user picks the output type per run. Read only the reference file for the requested type:

- **Email brief** → read `references/email-brief.md`
- **Word report** → read `references/word-report.md` (produced via the docx skill)
- **PowerPoint deck** → read `references/pptx-deck.md` (produced via the pptx skill)

"All three" is a valid request. When producing all three, they must tell the same story with the same numbers: the email summarizes the report, the deck presents it. Draft the report's content first as the master narrative, then derive the email and deck from it. Any number that appears in more than one deliverable must match exactly.

File production is delegated: the docx skill builds the Word report, the pptx skill builds the deck. This skill supplies content, structure, and conventions — it never reimplements document generation.

## Language rules — permanent standard

These apply to every deliverable this skill generates, on every run, without the user asking.

Do not use: "delve," "leverage," "robust," "seamless," "holistic," "landscape" as filler, "navigate the complexities," "in today's fast-paced world," "in today's ever-evolving world," "it's important to note," "it's worth noting," "game-changer," "unlock," "elevate," "empower," "Whether you're X, Y, or Z" constructions, or "In conclusion."

Do not build paragraphs on symmetrical rule-of-three patterns repeated one after another. Do not build slide titles or subject lines on buzzword abstraction.

Executive prose is short declarative sentences carrying numbers and implications. When a sentence can lose a word without losing meaning, lose the word. Read the draft back before delivery; if any sentence would fit in a vendor's marketing deck, rewrite it.

## Worked example

**Ingestion inventory (as it appears in the working draft and the source appendix):**

| ID | Type | Date | Summary |
|----|------|------|---------|
| S1 | Email thread (5 msgs) | 2026-07-25 to 2026-08-01 | Infra lead and vendor negotiating remediation timeline for failed DR test |
| S2 | .xlsx upload | 2026-07-31 | July uptime and incident counts by service |
| S3 | Vendor PDF | 2026-06-15 | Contracted SLA terms — **flag: predates the July contract amendment mentioned in S1** |

**Slide title, before and after:**

- Before (topic label): "Cloud Spend Update"
- After (takeaway): "Cloud spend is 18% over plan, driven by two teams [S2]"

The before version tells the reader what the slide is about. The after version tells the reader what the slide means — they could skip the slide body and still leave with the message. Every slide title, section heading, and subject line follows the after pattern.

## Delivery

Every deliverable ships with its source appendix (the inventory), its freshness flags resolved or stated, and its conflicts surfaced. If the user's sources left a gap the report structure wanted filled, the gap is named in the deliverable, not papered over.
