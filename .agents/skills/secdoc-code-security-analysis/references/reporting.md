# Reporting — findings that get fixed

A finding gets fixed when the reader can see it's real, understand why it matters, and paste a fix that works. A report full of unranked maybes gets skimmed and closed. The format below is built to be actionable and to double as a teaching artifact — the remediation explains *why*, so the developer learns the class, not just this instance.

## Contents
- The finding format
- Report assembly and ordering
- The false-positive log
- Re-review discipline
- The executive rollup

## The finding format

Every finding carries these fields, in this order:

1. **Title — impact, not category.** State what an attacker gets. "Unauthenticated SQL injection in the login endpoint allows full database read" beats "SQL Injection (CWE-89)." The category is a field below; the title is the consequence.
2. **Evidence — location and flow.** File and line(s), and the vulnerable flow source-to-sink in prose: where untrusted input enters, what it passes through, where it lands. Show the minimal code excerpt. If the flow crosses out of scope, say where.
3. **CWE.** The identifier, plus the OWASP mapping as coverage context (verify current editions).
4. **Severity with reasoning.** The rating and *why* — impact × exploitability in this deployment context. When formal scoring is wanted, the CVSS vector string (composed via **cybersecurity-architecture** `cvss.md`), never a bare number.
5. **Exploitability — stated honestly.** Reachable from untrusted input now, or theoretical/conditional? Name the condition if there is one ("reachable only when the legacy import path is enabled").
6. **Remediation — working code, with the why.** The fix in the codebase's own language and style, and one or two sentences on *why it closes the flow* — parameterization separates data from command; the allowlist converts arbitrary-target into known-target. The why is what makes it teach.
7. **Verification — how to confirm the fix.** What to test or check to know the fix landed: the request that used to work now fails safely, the sanitizer now matches the sink's context, the dependency resolves to the fixed version. A fix without a verification step is unverified.

## Report assembly and ordering

- **Order by real risk, not by discovery order or CWE number.** Reachable-and-severe first; name the top three things to fix first, because an undifferentiated list of 30 findings gets triaged by nobody. Risk ordering *is* the prioritization the reader needs.
- **Hardening separated from vulnerabilities.** Two sections. Exploitable findings in one; best-practice improvements labeled hardening in another. Mixing them destroys the severity gradient — a reader who finds a "critical" that's really a nice-to-have stops trusting the criticals.
- **Coverage and limits — always present.** State what was analyzed (which files, which depth tier) and what wasn't (runtime behavior, environment config not provided, code outside scope, dynamic flows not traceable statically). This section is what separates an honest review from one that implies a completeness it doesn't have. A clean report without a limits section is making a promise it can't keep.

## The false-positive log

Part of the deliverable, not an afterthought. List what was checked and cleared, and why: "the `exec` call at `jobs.py:40` takes only a hardcoded internal constant — not injectable"; "the query at `report.py:88` looked concatenated but the interpolated value is a validated enum." What was checked and cleared builds as much trust as what was found — it shows the review was thorough and that the findings section isn't padded. It also stops the next reviewer from re-flagging the same cleared item.

## Re-review discipline

When fixes come back for re-review:
- Verify the fix actually closes the traced flow, not just that code changed near the finding. A fix that HTML-escapes a value still landing in a JS context didn't fix the XSS.
- Check the fix didn't move the bug — a validation added in one handler but not the sibling that shares the sink.
- Confirm no regression opened an adjacent flow. Re-run the source-to-sink trace against the patched code; "they changed the line" is not "the flow is closed."

## The executive rollup

When the audience is leadership rather than the developer, compose with **executive-reporting** for the deliverable shape and lead with different content:
- **Business risk in plain language.** What's exposed, what an incident would cost, not CWE IDs. "Customer records are reachable without authentication" — not "IDOR at `/api/users/:id`."
- **Posture and trend**, not line numbers: how many critical/high, whether the code is improving, where the systemic weakness is (e.g., authorization checks applied inconsistently — a pattern, not ten separate bugs).
- **The decision being asked** — what to fund, what to prioritize, what risk to accept in writing.
- Keep the identifier-precise engineering detail in an appendix or the developer-facing report; the executive version references it, doesn't reproduce it.

## Language — every finding, every report

Apply the language rules in SKILL.md. Finding prose is three beats — evidence, mechanism, fix — with no marketing cadence, no "it's important to note," no rule-of-three padding. A finding written to sound impressive reads as a tool dump; a finding written as evidence-mechanism-fix reads as something a developer can act on this afternoon.
