# Methodology — how a review actually runs

A review is not a scan. Scanning grep-matches dangerous function names and finds the shallow 40%; the flaws that hurt — broken authorization, trust-boundary confusion, logic bugs — are invisible to pattern matching because the vulnerability is a *missing* check or a *wrong* assumption, which looks like ordinary code. The order below exists because it surfaces those.

## Contents
- Depth tiers — what each can and can't conclude
- The review sequence: scope → entry points → trust boundaries → taint
- Entry-point enumeration
- Trust-boundary mapping
- Taint reasoning and the sanitizer-that-doesn't rule
- Cross-file data-flow, honestly bounded
- The manual/tool split
- Validation before reporting
- Reviewing AI-generated code as its own discipline

## Depth tiers

Pick the tier the request and the available material support, and state which one you ran. Each concludes different things.

**Triage pass.** Fast orientation over a repo or large file. Enumerates entry points, spots obvious high-severity patterns (hardcoded secrets, `eval` on input, disabled TLS verification, raw SQL string-building), and produces a prioritized *what to look at next* — not a clean bill of health. Concludes: "here are the likely hot spots and the shape of the attack surface." Cannot conclude: "no injection exists" — triage doesn't trace flows to ground.

**Deep review.** Full source-to-sink tracing of the reachable attack surface, authorization logic read by hand, crypto and session handling examined, dependencies checked. Concludes findings with exploitability stated. Still cannot conclude runtime-only facts (actual header values, load-balancer behavior, environment config not provided) — name those in coverage.

**Diff-focused PR review.** Scoped to the change plus the code it touches. The discipline: read the diff for what it *introduces*, but also for what it *assumes* about code it calls and code that calls it — a PR that adds a handler inherits every trust assumption of the router that dispatches to it. Concludes whether the change adds, fixes, or moves risk. Cannot conclude anything about code the diff doesn't touch; say so, so a green PR review isn't mistaken for a clean repo.

## The review sequence

1. **Scope.** What am I looking at, what language/framework/version, what's the deployment model, what's trusted vs untrusted, and what does the output feed? Missing answers that change the analysis get *asked*, not assumed (see false-positive discipline in SKILL.md).
2. **Entry points.** Enumerate every place external data enters. You cannot trace taint you haven't found the source of.
3. **Trust boundaries.** Draw the lines the data crosses. A vulnerability is almost always a trust boundary treated as if it weren't one.
4. **Source-to-sink.** For each dangerous sink, work backward to a source, or for each source, work forward to a sink. A flow that connects an untrusted source to a dangerous sink with no effective sanitizer in between is a finding.

## Entry-point enumeration

Untrusted input is not just HTTP request parameters. Enumerate:
- **HTTP surface** — routes, handlers, path/query/body/header/cookie params, file uploads, content negotiation.
- **Message consumers** — queue/topic subscribers, webhook receivers, event handlers. The payload is external even when the transport feels internal.
- **CLI and args** — argv, stdin, environment variables read as data.
- **File and format parsers** — anything that reads a file whose contents an attacker can influence (uploaded documents, config pulled from a bucket, XML/YAML/CSV/image metadata).
- **Deserialization endpoints** — any point that reconstructs objects from bytes.
- **Inter-service calls** — data from another service is untrusted unless a boundary explicitly makes it trusted; "internal" is a network fact, not a trust fact.

## Trust-boundary mapping

Before matching a single pattern, mark where data changes trust level: client→server, internet→DMZ→internal, unauthenticated→authenticated, one tenant→another, user-space→privileged operation, external-package→your-code. Most real vulnerabilities live exactly on one of these lines, treated as if the data had already been validated on the other side. Authorization flaws in particular are boundary failures: the caller crossed from "can request" to "can access this specific object" and nothing checked the crossing.

## Taint reasoning and the sanitizer-that-doesn't rule

Trace three things per flow: the **source** (where untrusted data enters), the **sink** (where it does something dangerous — a query, a shell, a file path, a template, a deserializer), and any **sanitizer** between them.

The rule that catches the subtle bugs: **verify the sanitizer actually neutralizes the sink's context.** Sanitization is context-specific and mismatches are common and silent:
- HTML-escaping output that lands in a JavaScript string context (needs JS encoding, not HTML) — still XSS.
- `escapeshellarg` on one argument while another is concatenated raw — still command injection.
- Escaping quotes for SQL but the value lands in an identifier or `LIKE` pattern or `ORDER BY` — still injection.
- Path canonicalization that runs *before* the `../` is decoded, or that a symlink defeats — still traversal.
- A validation regex anchored wrong (`^` without `$`, or `.` matching newline) — bypassable.
- An allowlist that's actually a denylist wearing an allowlist's clothes.

A sanitizer that doesn't match its sink's context is not mitigation; the flow is still a finding, and the finding names the mismatch specifically.

## Cross-file data-flow, honestly bounded

Real flows cross files: a source in a controller, a sink in a repository three modules away. Trace as far as the provided code allows, and when the flow leaves the given scope — into a package, a called service, a file not shared — say so and state what you'd need to close it. A half-traced flow reported as confirmed is a false positive waiting to embarrass the report; a half-traced flow reported as "reaches `helpers.sanitize()` which isn't in scope — confirm it neutralizes shell context" is an honest, actionable finding.

## The manual/tool split

Know what pattern analysis catches and what only reading catches, so the review spends effort where it pays.

- **Pattern/tool territory** (fast, do it, but don't stop there): hardcoded secrets, known-CVE dependencies, dangerous-function usage (`eval`, `pickle.loads`, `os.system`), disabled cert verification, weak crypto primitives, obviously unparameterized queries. These are necessary and cheap.
- **Manual-only territory** (where the review earns its keep): authorization logic — *is there a check that this caller may touch this object, and is it correct?* No scanner sees a missing check. Also: business-logic flaws, multi-step flows, trust-boundary confusion, whether a sanitizer matches its context, race conditions, and whether a "validated" input is actually validated for the sink it reaches. Read the auth logic by hand, every time.

## Validation before reporting

Before a flow becomes a finding, ask: **can this actually execute?** Is the source genuinely attacker-controlled? Is the vulnerable branch reachable — not behind a feature flag that's off, a route that's unregistered, a guard earlier in the chain? Is the "untrusted" input actually validated upstream at a boundary you didn't initially see? A finding that fails this check is a false positive; if the answer is "reachable only under conditions X," the finding says exactly that and severity reflects it.

## Reviewing AI-generated code as its own discipline

AI-generated code (increasingly most code) is checked *harder*, not softer, because it fails in a specific way: it produces plausible-looking security code that is subtly wrong. Security code that *looks* right is more dangerous than code that looks sketchy, because it survives casual review.

- **Distrust confident-looking security code.** A hand-rolled JWT verification, a "sanitize" function, a permission check written to look idiomatic — read it as if it's wrong until proven right. Common failures: signature verified but `alg:none` accepted, comparison not constant-time, allowlist with a gap, validation that returns the wrong boolean on error.
- **Verify every imported package exists and is canonical.** Hallucinated and slopsquatted dependencies are a live entry vector: the model imports `python-jwt-utils` or `requests-oauth-helper`, an attacker who's watching registers that name, and the install pulls hostile code. Confirm each non-stdlib import is a real, canonical package (see `dependencies-supplychain.md`) before trusting anything it does.
- **Watch for defaults that don't fit.** Generated code reaches for permissive defaults — CORS `*`, `verify=False` to make a request "work," debug on, a wildcard IAM policy. These aren't malice; they're the path of least resistance, and they ship.
