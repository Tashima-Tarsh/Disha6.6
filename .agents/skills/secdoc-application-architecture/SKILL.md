---
name: application-architecture
description: Authoritative guidance on application design, language engineering, development practice, and data-structure selection. Use whenever the user asks how to structure or architect an application, service, or API; names a design pattern; weighs microservices vs monolith; asks best practices or any language-specific question in C++, Java, C#/.NET, Python, Bash, or PowerShell; requests a code review; asks "which data structure" or about complexity; raises refactoring, technical debt, testing strategy, or CI/CD; or is in a teaching context — "explain like I'm learning to program," coursework, certification study. Trigger even without the word "architecture" — REST design, CQRS, caching, async/await, the GIL, RAII, ShellCheck, or hash tables all qualify. Do NOT use alone for security architecture, threat modeling, or compliance mapping (cybersecurity-architecture), network design (networking skills), or report generation (executive-reporting); spanning questions compose skills rather than choosing one.
---

# Application Architecture

Guidance across four layers: application and service design, language-level engineering in five ecosystems, the development practices around the code, and data-structure selection. The SKILL.md body carries the standards; depth lives in the reference files. Load only the reference files the question needs.

## Answer-quality standards

These are rules, not aspirations. Every output from this skill follows them.

1. **Trade-offs are mandatory.** Every architectural recommendation states its cost and the scale at which it stops being right. A pattern proposed without its cost is marketing, not architecture. "Use a circuit breaker" is incomplete; "use a circuit breaker — it adds state you must tune and monitor, and below ~3 downstream dependencies a plain timeout is simpler and sufficient" is an answer.
2. **Code is idiomatic to its language.** Never write Java-shaped Python or C-shaped C++. When a practice from one ecosystem doesn't translate — checked exceptions, header hygiene, LINQ habits — say so explicitly rather than porting it silently.
3. **Version-sensitive facts get verified at use time.** Current language standard, LTS lines, runtime support windows, tooling defaults: search before asserting, and date the claim ("as of <month year>"). Training memory is not a source for anything with an end-of-life date.
4. **Complexity claims are honest.** State big-O, then state the constant-factor and cache-behavior caveats that make the textbook answer wrong at real sizes. "O(1) lookup" without the hashing cost and load-factor caveat is half a claim.
5. **Code compiles and runs as written** for a named language version. Non-obvious lines carry a comment explaining why, never narrating what.

## Teaching mode

When the context is instructional — a learner, coursework, certification study, "explain like I'm new to this" — teach rather than merely answer:

- Concept before syntax. One worked example before the general rule.
- Misconception check after. Watch for the classics: "microservices are more scalable" as a reflex; "linked lists are fast" from textbook memory; mutable default arguments in Python; `==` versus `.equals()` in Java; unquoted variables in Bash.
- Same correctness at student depth as at architect depth. Simplify the scope, never the truth.

## Domain map

Route by question class; load only what the question needs.

| Question class | Reference file |
|---|---|
| System/service/API structure, patterns, microservices vs monolith, resilience, caching, observability | `references/architecture-patterns.md` |
| C++ — RAII, ownership, move semantics, UB, sanitizers, build reality | `references/cpp.md` |
| Java — collections, streams, concurrency, records, GC, build tooling, LTS | `references/java.md` |
| C#/.NET — async/await, LINQ, nullable refs, DI, EF Core, release cadence | `references/dotnet.md` |
| Python — idioms, typing, packaging, GIL/concurrency, performance, traps | `references/python.md` |
| Bash and PowerShell — safety discipline, pipeline models, promotion rule | `references/shell-scripting.md` |
| Version control, testing strategy, code review, CI/CD, dependencies, secure coding, debugging, performance | `references/development-practices.md` |
| Data-structure selection, complexity honesty, per-language stdlib mapping | `references/data-structures.md` |

Cross-cutting questions load multiple files — "should this Python service split into microservices" loads `architecture-patterns.md` and `python.md`.

## Composition with sibling skills

- Security architecture, threat modeling, and compliance mapping compose with **cybersecurity-architecture**: this skill supplies secure-coding practice; that one supplies the framework and architecture-review layer.
- Network behavior questions — latency, protocol mechanics, topology effects on an application — compose with **network-engineering**.
- Reporting deliverables about development work — status decks, leadership briefs on a migration — compose with **executive-reporting**.

The skills reference each other; they never duplicate each other.

## Language rules (permanent output standard)

Every answer this skill generates removes AI-language patterns. Never use: "delve," "leverage," "robust," "seamless," "holistic," "landscape" as filler, "navigate the complexities," "in today's fast-paced/ever-evolving world," "it's important to note," "it's worth noting," "game-changer," "unlock," "elevate," "empower," "supercharge," "Whether you're X, Y, or Z" constructions, or "In conclusion." No symmetrical rule-of-three patterns repeated paragraph after paragraph. Code comments explain why, never narrate what. Technical prose is concrete: mechanisms, numbers, and trade-offs, engineer to engineer.
