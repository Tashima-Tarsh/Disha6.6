# Threat Modeling Toolkit

Methodology selection with honest criteria. The methodologies are not interchangeable and not competitors; each answers a different question. Framework reference material (ATT&CK structure, ATLAS structure, STRIDE definitions) lives in cybersecurity-architecture — consult it, never fork it. This file covers how this skill *uses* them in an assessment.

## Contents

1. Trust boundaries first — always
2. ATT&CK-driven attack-path enumeration (the default)
3. STRIDE per element
4. PASTA
5. Attack trees
6. Scoring folklore: DREAD
7. AI/ML and LLM components: ATLAS and the two load-bearing rules
8. Abuse cases and misuse stories
9. Coverage honesty

---

## 1. Trust boundaries first — always

Regardless of methodology, the first act of any threat model is drawing the trust boundaries: every point where privilege, ownership, network trust, or tenancy changes. Not from diagram layout (methodology.md §6) — from evidence in the artifacts or from questions asked and answered.

Every attack path in the output names the trust boundary it crosses. A path that crosses no boundary is either not a path or evidence the boundaries were drawn wrong. If boundaries cannot be established from the artifacts, that is a scoping gap that caps what the model can claim — state it and proceed at reduced confidence, or stop.

## 2. ATT&CK-driven attack-path enumeration — the default

The skill's default modeling method: enumerate credible adversary paths through the architecture, each step tagged with its ATT&CK technique ID, matrix (Enterprise/Mobile/ICS), and framework version — e.g., "T1190 Exploit Public-Facing Application (ATT&CK v16, Enterprise)." Version stated once per report is acceptable if a single version governs throughout; per-ID flags when versions mix (they should not).

Why default: ATT&CK paths are checkable against a maintained catalog, map directly to detection and control discussions, and speak the language the SOC and the CISO already use. A path expressed in ATT&CK IDs can be sampled by an external party; a path expressed in prose cannot.

Discipline:
- Paths run from an entry point (external interface, supply chain, insider position) to an impact on an asset identified in scoping. Entry → steps → impact, each step an ID, each boundary crossing named.
- Technique IDs are version-sensitive: sub-technique renumbering and deprecation happen. Flag every ID for confirmation against the canonical source at assessment time (library standard: verify what ages).
- Enumerate against the threat actors of concern from scoping. A path requiring nation-state capability matters differently than one scriptable from a commodity kit — the distinction feeds likelihood (risk-analysis.md §3).
- Do not pad. Ten credible paths beat forty theatrical ones. Credibility criteria: reachable from an actual entry point, consistent with the deployment model, and not already severed by a control verified present (not merely claimed — a claimed control downgrades the path, it does not delete it, and the report says which).

## 3. STRIDE per element

**Use when:** the input is (or can be redrawn as) a data-flow diagram and the goal is structured coverage — every element examined against every applicable threat class, so gaps in thinking surface as empty cells rather than silence.

**Honest limits:** STRIDE guarantees you asked the question for each element; it does not guarantee good answers, does not sequence threats into paths, and produces volume that must be pruned before it enters the register (one risk per row — risk-analysis.md §5). STRIDE output feeds path enumeration; it does not replace it.

Mechanics: per element type, apply the applicable classes (processes: all six; data stores: primarily T, I, D; data flows: T, I, D; external entities: S, R). Findings phrased as concrete threat events against that element, not class names.

## 4. PASTA

**Use when:** business-impact framing must lead — the audience is risk governance rather than engineering, and the model must start from business objectives and impact analysis before touching technical decomposition. PASTA's seven stages front-load business context that ATT&CK-first modeling backfills later.

**Honest limits:** heavyweight; its value is the business linkage, not superior technical enumeration (stages 4–6 end up doing ATT&CK-style work anyway). For most engineering-audience assessments, extracting business context in scoping and running ATT&CK-first achieves the same end cheaper. Choose PASTA deliberately, usually when the organization already runs it.

## 5. Attack trees

**Use when:** one crown-jewel outcome deserves decomposition — "attacker exfiltrates the signing key," "attacker corrupts the model registry." Root = the outcome; children = alternative ways to achieve it; leaves = concrete steps, tagged with ATT&CK IDs where they exist.

**Honest limits:** trees scale badly past a handful of roots and hide lateral movement between trees. They are a depth tool for the one or two assets that matter most, layered on top of path enumeration, not a coverage tool.

## 6. Scoring folklore: DREAD

DREAD's inconsistency is documented and structural: the five axes are undefined enough that two competent raters diverge widely on the same finding, and averaging the axes launders that disagreement into false precision. Microsoft, its originator, dropped it.

If a legacy process requires DREAD: comply, and say what it is and what it isn't — a rough communication shorthand, not a defensible scoring instrument. Put the SP 800-30 chain next to every DREAD number so the assessment stands on the chain. Never introduce DREAD into a process that does not already require it.

## 7. AI/ML and LLM components: ATLAS and the two load-bearing rules

Model AI/ML components with MITRE ATLAS — AML.T-series technique IDs, version stated, same verify-at-assessment-time flag as ATT&CK. ATLAS paths and conventional ATT&CK paths appear in the same threat model table; an attack that crosses from infrastructure into the model pipeline is one path with IDs from both catalogs.

Two rules from the seed prompt, load-bearing, applied to every system with an LLM component:

1. **Model output after untrusted input is untrusted.** Once untrusted content (user input, retrieved documents, tool results, scraped web content) has entered the context, everything the model emits downstream is untrusted data. Any component that consumes model output — executes it, renders it, passes it to a tool, writes it to a store another system reads — is a trust boundary crossing and gets modeled as one.
2. **Every injection sink gets identified.** Enumerate every point where content the adversary can influence enters model context: direct prompts, RAG retrieval, tool/function results, memory and history, file uploads, inter-agent messages, system-prompt assembly from stored data. Each sink is a row in the threat model. An unenumerated sink is a coverage gap; say so.

Mechanics of the attacks — how extraction, poisoning, or inversion actually work, feasibility against a given architecture — compose with ai-ml-engineering. This skill places them in paths, boundaries, and the register. Scoring note: most model-layer attacks are not CVSS material (scoring-prioritization.md §3).

## 8. Abuse cases and misuse stories

The bridge between the model and the register. For each significant path, write the abuse case as a short narrative: actor, capability, entry, steps, outcome — the register row's chain in human sequence. Two jobs:

- **Validation.** A path that cannot be told as a coherent story is usually missing a step or assuming an unstated capability; writing it out finds the hole.
- **Communication.** The abuse case is what the design team and the risk committee actually read; the register row is what gets tracked and sampled. Same content, two renderings; they must agree.

Misuse stories (legitimate-capability abuse: the admin who exports, the partner API used at hostile volume) come from the same exercise and catch what boundary-crossing enumeration misses — the paths that cross no technical boundary because the actor is already inside one.

## 9. Coverage honesty

Every threat model states what it enumerated against, so its completeness claim is checkable:

> "Enumerated against MITRE ATT&CK v[X] (Enterprise) and MITRE ATLAS v[Y] for the components in scope (§Scope), using ATT&CK-driven path enumeration with STRIDE-per-element applied to the data-flow diagram in [artifact]. Not enumerated: [out-of-scope components, missing-artifact areas]."

An unstated coverage claim reads as a completeness claim, and a completeness claim that cannot be checked fails sampling. The rapid tier states its narrower claim in the same form (methodology.md §4).
