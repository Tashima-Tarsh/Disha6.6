# Development Practices — The Layer Around the Code

## Contents
- Version-control workflow
- Testing strategy
- Code review as engineering practice
- CI/CD fundamentals
- Dependency and supply-chain hygiene
- Secure-coding fundamentals
- Debugging methodology
- Performance engineering

---

## Version-control workflow — branching honesty

- **Trunk-based development** (short-lived branches merged within a day or two, or direct-to-trunk with feature flags): fits teams with solid CI, good test coverage, and the discipline to keep changes small. It's what the DORA-style delivery research correlates with high performance — but the correlation runs through the prerequisites: without fast reliable tests and flags for incomplete work, trunk-based is just merging broken code faster.
- **Long-lived feature branches:** fit low-trust integration environments (open-source drive-by contributions), release-certification regimes (regulated firmware), and teams without the CI maturity for trunk-based — at the known cost: merge conflicts grow with branch age, integration surprises arrive late, and "it worked on my branch" is the recurring lie.
- GitFlow specifically is over-structured for continuously-deployed services (its release/hotfix branch machinery models boxed-software releases); it retains a niche where you genuinely maintain multiple released versions.
- The team-shape rule: pick the heaviest-weight workflow your constraints *require*, not the one that feels safest. Whatever the model: small commits with messages that say why, rebase-or-merge chosen once and enforced, and protected trunk with required CI.

## Testing strategy

- **The test pyramid** — many unit, fewer integration, fewest end-to-end — stated with its critics: the pyramid's logic is cost and feedback speed, and it assumes unit tests catch most defects. The honest critique (the "testing trophy" school): in integration-heavy systems (services that mostly orchestrate IO), heavily-mocked unit tests verify the mocks, not the system, and mid-level tests against real-ish dependencies (containerized databases, in-process fakes) catch more per test. Resolve it per codebase: pure-logic-rich code earns the pyramid; glue-heavy code earns the trophy. Both schools agree on the apex: broad end-to-end suites are slow, flaky, and expensive — keep few, covering money paths.
- **Unit versus integration boundaries drawn by contract:** a "unit" is a unit of behavior with a stable contract, not a class — testing through the public contract survives refactoring; testing each private method welds the tests to the implementation. Mock at architectural boundaries you own (the port to the payment provider), not at every internal seam.
- **Property-based testing** (Hypothesis, jqwik, FsCheck) earns its place for code with algebraic properties — parsers (round-trip), serialization, arithmetic/date logic, anything with invariants ("output is sorted," "never throws on any string"). It finds the edge cases example tests didn't imagine; its cost is thinking in properties and diagnosing shrunk counterexamples. Wrong tool for orchestration glue with no interesting invariants.
- **Coverage is a signal, not a target:** low coverage tells you where tests aren't; high coverage tells you lines ran, not that anything was asserted. Setting a coverage number as a target manufactures assertion-free tests (Goodhart, on schedule). Use diff coverage on changed code as a review prompt, and read uncovered regions as a map of risk.

## Code review as engineering practice

- **Division of labor with machines:** anything a linter/formatter can flag (style, formatting, obvious bug patterns) must be flagged by the linter in CI, not by a human in review — every style comment from a human is a process failure and a distraction from what humans catch: wrong requirements, missing edge cases, misleading names, contract-breaking changes, designs that will hurt in six months, and "this test doesn't test what it claims."
- **Review-size discipline:** defect-detection ability degrades hard with diff size; past a few hundred changed lines, review decays into approval theater ("LGTM" on 2 000 lines means "I scrolled"). Enforce small PRs structurally — stacked changes, refactor-then-behavior splits — rather than exhorting people to review harder.
- Review latency is a team throughput cost: a day-long review queue on hour-long tasks reshapes how people batch work, for the worse. Treat review turnaround as an SLO.
- Author's duty: the PR description says why, what changed, and how it was tested; a reviewer reconstructing intent from the diff is doing archaeology you caused.

## CI/CD fundamentals

- **Pipeline stages, canonical shape:** fast checks first (lint, compile, unit) for feedback in minutes → integration tests → build artifact once → deploy that artifact through environments. Fail fast, and keep the fast stage genuinely fast — a 40-minute pre-merge pipeline changes developer behavior in every bad way.
- **Artifact versioning:** build once, promote the same immutable artifact (image digest, not tag; version stamped in) through dev → staging → prod. Rebuilding per environment reintroduces the "staging tested a different binary" class of failure that promotion exists to kill.
- **Environment promotion:** each environment adds confidence (integration → capacity/smoke → production); config differs per environment, artifact doesn't (twelve-factor, in `architecture-patterns.md`). Deploy strategies — rolling, blue/green, canary — trade rollback speed against infrastructure cost; canary plus automated rollback on SLO burn is the mature end state, boring rolling deploys are a fine start.

## Dependency and supply-chain hygiene

- **Lockfiles, committed, always, for applications** — builds reproducible to the exact dependency graph. Libraries declare compatible ranges instead; the application consuming them locks.
- **Minimal dependency surface:** every dependency is code you now ship, patch, and trust transitively. The is-it-worth-it test: would you rather own 30 lines of your own code or an 80-transitive-dependency tree for `left-pad`-shaped functionality? Audit the transitive graph occasionally; the direct list flatters you.
- **Update cadence beats update heroics:** small frequent updates (automated PRs from Renovate/Dependabot, merged on green) keep each diff reviewable; the alternative is the annual big-bang upgrade that's too large to review and too scary to ship — which is how systems end up running EOL frameworks.
- **Provenance awareness:** pin by digest where the ecosystem allows, prefer registries' signed/attested artifacts, and generate SBOMs so "are we exposed to X?" is a query, not an archaeology project. Framework mapping of all this (SLSA levels, compliance controls) composes with cybersecurity-architecture — this skill's job is the daily practice; that one owns the control framework.

## Secure-coding fundamentals (practice level)

Framework mapping — which control catalogs these satisfy, threat modeling, architecture review — belongs to cybersecurity-architecture. The daily practice belongs here:

- **Input validation** at trust boundaries: validate type, length, range, and format on arrival; prefer allowlists to blocklists; parse into typed structures early (pydantic-at-the-edge in `python.md` is this rule wearing Python clothes) so the rest of the code handles types, not strings.
- **Output encoding** is context-specific: parameterized queries for SQL (never string-built), context-aware escaping for HTML/JS (your template engine's auto-escaping, left on), argument arrays for shell execution (never string interpolation into a command — the same quoting defect class as `shell-scripting.md`, now with an attacker choosing the filename).
- **Secrets handling:** secrets live in a secrets manager or injected environment, never in source, never in build artifacts, never in logs; rotate on personnel change and on any suspicion; scan the repo history too, because the secret you deleted last month is still in git.
- **Least-privilege execution:** services run as non-root with the narrowest grants that work; each credential is scoped to one service and one purpose, so the blast radius of a leak is a sentence, not a paragraph.

## Debugging methodology

- **Reproduce before fixing** — the discipline that separates debugging from guessing. A fix for an unreproduced bug is a hypothesis you shipped. If reproduction is genuinely impossible (production-only race), instrument until the next occurrence is diagnosable, and treat the instrumentation as the deliverable.
- **Hypothesis-driven, not stare-driven:** state what you believe, derive what must be true if the belief holds, test that one thing, and let the result kill or confirm the hypothesis. Changing three things at once tells you nothing when the behavior changes.
- **Bisection** is the general-purpose weapon: `git bisect` over history (works whenever you have a good and bad point and a check — automate the check and it's O(log n) of your time), binary-search over input size, over config differences, over the pipeline stages between working and broken.
- Read the error message. All of it. Then the first error, not the last — cascades lie. And when the bug is finally found, ask what let it survive to production: the missing test, the swallowed exception, the log line that would have said everything.

## Performance engineering

- **Measure before optimizing** — the profiler is the arbiter; intuition about where time goes is wrong often enough to be a coin flip, and optimizing the wrong 90% has negative value (complexity added, nothing gained). Define the target first (p99 latency? throughput? memory ceiling?) — "make it faster" is not an engineering requirement.
- **Profiling tools per ecosystem:** C++ — perf/VTune, and the sanitizer builds distort timing so profile release builds; Java — JFR/async-profiler (production-safe, low overhead); .NET — dotnet-trace/dotnet-counters and PerfView; Python — cProfile for development, py-spy for attaching to production; shell — usually the answer is "the promotion rule" (`shell-scripting.md`).
- The usual suspects, in the order they usually pay: algorithmic complexity → IO round-trips (N+1 queries, chatty APIs — batch them) → allocation pressure → memory locality → micro-optimization, which is last and usually unreached.
- **The amortized cost of premature abstraction** is the quiet performance killer: every speculative interface, indirection layer, and just-in-case generality has a small runtime cost and a large comprehension cost, and the comprehension cost is what prevents the later real optimization — you can't make fast what you can't follow. Abstraction is bought with evidence of need, same as any other expenditure here.
