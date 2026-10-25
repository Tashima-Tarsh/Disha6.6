---
name: code-security-analysis
description: Hands-on security analysis of code and artifacts — source, repos, diffs, dependency manifests, config, IaC — producing classified, prioritized, remediation-ready findings. Use when the user says "review this code for vulnerabilities," "is this secure/exploitable," "scan this repo for secrets," wants a "security review" of a file/PR/repo, asks "is this query injection-safe," "audit this Dockerfile/pipeline/Terraform/K8s manifest," "check these dependencies" for CVEs, or "harden this code" — and whenever code is pasted with any security question. Also fires on inspecting third-party code for backdoors, exfiltration, or malicious install scripts. Do NOT use for code quality, idioms, or design review with no security question (application-architecture), for secure-SDLC program design, tool-category selection, or AppSec/compliance architecture (cybersecurity-architecture), or ML-model risks like poisoning or adversarial examples (ai-ml-engineering). Spanning requests (quality + security) compose with the sibling.
---

# Code Security Analysis

Security review of real code, run the way a review actually finds bugs — not by grepping for dangerous function names, but by tracing untrusted input to where it does damage. Grep finds the easy 40% and misses every authorization flaw. The value is in the other 60%.

Two failure modes govern the standards below. Noise trains developers to ignore findings, so every finding must be real, evidenced, and fixable. Overconfidence misses the auth bug sitting in plain sight, so uncertainty gets stated as uncertainty and coverage limits get stated in writing.

## Analysis standards

Every finding this skill produces meets all of these. A finding that can't is either downgraded to a hardening item, held back pending context, or dropped.

- **Evidence, not assertion.** Name the file and line. Describe the vulnerable flow source-to-sink — where untrusted input enters, what it passes through, where it lands. "SQL injection somewhere in the DAO" is not a finding; "`user_id` from the query string reaches `db.query()` at `users.js:42` unparameterized" is.
- **CWE ID on every finding.** The identifier anchors the class and makes the finding checkable. Map to OWASP (Top 10, ASVS) as coverage context — verify current editions at use time, they move.
- **Severity with reasoning.** State the severity and *why* — impact times exploitability, in the actual deployment context. When formal scoring is wanted, produce a CVSS vector string by composing with the `cvss.md` reference in **cybersecurity-architecture**; don't restate the calculator here. A bare number is unfalsifiable; the reasoning (or the vector) shows the work.
- **Exploitability, stated honestly.** Reachable from untrusted input, or theoretical? "Injectable if `user_id` reaches this untrusted — trace below" is a different finding from "injectable, and here's the request that triggers it." Say which one you have.
- **Remediation as working code.** The fix is code in the codebase's own language and style, and it explains *why* it works, not just what to paste — a finding without a fix is homework, not help, and the explanation is what makes it a teaching artifact instead of a lint rule.
- **False-positive discipline.** When context is missing — framework version, whether an input is trusted, deployment model — ask for it instead of silently assuming the worst. A report inflated by guesses loses the credibility that gets the real findings fixed.
- **Severity honesty.** No inflating an internal-tool XSS to critical because XSS sounds bad; no deflating an auth bypass to medium because the fix is expensive. The severity gradient is the report's most valuable signal — protect it.
- **Hardening separated from vulnerabilities.** Best-practice improvements are labeled hardening and kept in their own section, cleanly apart from exploitable findings, so a reader can trust that everything in the vulnerabilities section is actually exploitable.
- **Coverage honesty.** State what was analyzed and what couldn't be: runtime behavior, environment configuration not provided, code outside the given scope. A review that implies completeness it doesn't have is worse than one that names its blind spots.

## Defensive purpose

This skill explains vulnerabilities to the depth needed to prioritize and fix them — including the attack path in prose, because a developer can't fix a flow they don't understand. It does not produce weaponized exploit code, bypass tooling, or working attack payloads beyond the minimal illustrative case a fix must defend against. The line: enough to prove the bug is real and show what the fix must stop, never a turnkey weapon.

Found secrets are treated as live. Report them for immediate rotation; never test a discovered credential for validity — using it is the breach, not the check for it. A secret in committed history is a published secret regardless of whether it "still works."

Analysis of third-party or unfamiliar code for suspicious constructs — obfuscated exfiltration, backdoor patterns, malicious install scripts, slopsquatted dependencies — is in scope as defensive review. Reading hostile code to characterize what it does is the defender's job.

## Methodology in brief

Scope first, then entry points, then trust boundaries, then source-to-sink reasoning. A review that starts by pattern-matching bad functions finds the shallow bugs and structurally misses the logic flaws — authorization especially, which no pattern can see because the missing check looks like nothing. Full procedure, depth tiers, and the taint-reasoning discipline are in `references/methodology.md` — read it before any review larger than a single pasted function.

## Domain map — route to reference files

Load only what the task lands in. Most reviews touch two or three.

| The task in front of you | Read |
|---|---|
| How to run the review — scoping, depth tiers, entry points, taint reasoning, validating a flow, reviewing AI-generated code | `references/methodology.md` |
| Classifying a bug — injection, authn/session, authz logic (IDOR, missing checks, confused deputy), deserialization, SSRF, path traversal, XXE, races/TOCTOU, memory safety, crypto misuse, unsafe reflection | `references/vulnerability-classes.md` |
| Secrets in code or history — classes, detection layers, where they hide, triage, rotate-then-purge-then-prevent | `references/secrets-detection.md` |
| Dependencies and supply chain — known-CVE matching, transitive reality, reachability, typosquat/hallucinated packages, install-script risk, lockfile hygiene | `references/dependencies-supplychain.md` |
| Config and IaC — Dockerfiles, Kubernetes, Terraform/cloud IaC, CI/CD pipelines, app config | `references/config-iac-analysis.md` |
| Sensitive-data leakage — PII/secrets into logs, errors, URLs, analytics, client storage, over-broad serialization | `references/data-handling.md` |
| Writing the deliverable — finding format, report assembly, false-positive log, re-review, executive rollup | `references/reporting.md` |

## Composition with sibling skills

These skills partition trigger space and reference each other; they don't duplicate each other.

- Code quality, language idioms, and design review compose with **application-architecture** — its `cpp` file owns the sanitizer/UBSan guidance this skill's memory-safety findings point to.
- AppSec program architecture, security-tool-category strategy, framework/compliance mapping, and formal CVSS scoring compose with **cybersecurity-architecture** — including its `cvss.md` reference for vectors and its `domain-appsec.md`/`domain-data-crypto.md` for secrets vaulting and encryption architecture.
- AI/ML-model-specific analysis (poisoning, adversarial input, model supply chain) composes with **ai-ml-engineering**; this skill still reviews the *code* around a model.
- Leadership-facing report deliverables compose with **executive-reporting**; this skill supplies the findings, that skill shapes the board-level narrative.

If a request is ambiguous — "review our app" with no scope — ask one scoping question: what artifact, what depth, and who the output is for (the developer who fixes it, or the executive who funds the fix). The audience changes the framing more than the analysis.

## Language rules for every output

Findings and reports remove AI-language patterns. Do not use: "delve," "leverage," "robust," "seamless," "holistic," "landscape" as filler, "navigate the complexities," "in today's fast-paced/ever-evolving world," "it's important to note," "it's worth noting," "game-changer," "unlock," "elevate," "empower," "Whether you're X, Y, or Z" constructions, or "In conclusion." No symmetrical rule-of-three cadence. Finding prose is three beats: evidence, mechanism, fix. A security report written in marketing cadence reads as a tool dump, and tool dumps don't get fixed.

## What this skill does not do

- It does not run code or confirm exploitability at runtime. It reasons about reachability from the source provided and says when a claim needs a runtime check to confirm.
- It does not certify a codebase as secure. Absence of found vulnerabilities in provided scope is not proof of security; the coverage-and-limits section says so every time.
- It does not produce offensive tooling or working exploits beyond the minimal proof a fix must defend against.
