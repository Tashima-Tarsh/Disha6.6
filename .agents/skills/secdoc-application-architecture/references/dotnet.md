# .NET / C# — Modern Platform Engineering

Verify at use time: the current .NET version and whether it's LTS or STS, the next LTS date, and C# language-version pairing. The cadence is annual releases each November, alternating LTS (3-year support) and STS (18-month) — but which number is current is a dated fact; check it and date the claim. Guidance below assumes modern .NET (Core-lineage), not .NET Framework 4.x; call out the difference where it bites.

## Contents
- async/await done correctly
- LINQ and deferred execution
- Nullable reference types as a design tool
- Dependency injection as a platform feature
- Records and pattern matching
- Spans and memory types
- EF Core honesty
- Release cadence and deployment reality

---

## async/await done correctly

- **Async all the way.** `async` propagates up the call chain to the entry point. The classic deadlock: calling `.Result` or `.Wait()` on an async method from a context with a synchronization context (legacy ASP.NET, WPF/WinForms UI thread) — the continuation needs the thread that's blocked waiting for it. Modern ASP.NET Core has no synchronization context, so the deadlock class is mostly gone there, but sync-over-async still burns thread-pool threads and shows up as thread-pool starvation under load. The fix is never `ConfigureAwait` gymnastics at the call site; it's making the caller async.
- **`ConfigureAwait(false)` realities:** in library code, use it — you don't need the caller's context and you avoid forcing context hops. In ASP.NET Core application code it's a no-op (no context to capture); in UI code, omit it exactly where you need to resume on the UI thread. It is a library-hygiene tool, not a deadlock fix.
- **`Task` vs `ValueTask`:** `ValueTask` avoids allocation on synchronously-completing hot paths; it comes with rules (await once, don't store, don't await concurrently). Use it where profiling shows the `Task` allocation matters — typically library hot paths — not by default.
- **Cancellation:** accept a `CancellationToken` on every async public API, pass it through, and honor it in loops and IO. Cancellation retrofitted later is a signature-breaking change across the codebase.
- `async void` is for event handlers only — exceptions from it crash the process rather than surfacing at an await.

## LINQ and its deferred-execution traps

LINQ-to-objects is the idiomatic transformation tool; the traps are all about *when* the query runs:

- A query is a description; it executes at enumeration. Enumerating twice executes twice — filter, hit the database twice, or observe different results if the source changed. Materialize with `.ToList()` at the boundary where you intend "run now, run once."
- Captured variables are evaluated at enumeration, not at query construction — the modified-closure surprise.
- Returning `IEnumerable<T>` from a method whose consumer will enumerate repeatedly is handing them the double-execution trap; return a materialized collection, or `IReadOnlyList<T>` to say so.
- In EF Core, LINQ is translated, not executed (see EF Core section) — methods that can't translate either throw or silently switch to client evaluation depending on version and shape. Know which side of `AsEnumerable()` each operation runs on.
- Same honesty as Java streams: a `foreach` is clearer than a LINQ chain that needs state, indexes, or three nested `SelectMany`s.

## Nullable reference types as a design tool

NRT (enabled by default in new project templates) makes nullability part of the type: `string` means not-null, `string?` means maybe. Treat it as a design tool, not a compiler chore:

- Turn it on codebase-wide (`<Nullable>enable</Nullable>`) and treat warnings as errors; a codebase where NRT warnings scroll by is a codebase where they mean nothing.
- The annotations are compile-time only — no runtime enforcement. Validate at trust boundaries (deserialization, API input) where the annotations are promises external data hasn't made.
- The null-forgiving operator `!` is a claim you're making with no evidence attached; each use deserves the same scrutiny as an unchecked cast. Repeated `!` on the same path means the types are wrong, not the compiler.
- Design consequence: making null explicit pushes you toward types that don't need it — required init properties, factory methods that return a result type instead of null.

## Dependency injection as a first-class platform feature

Unlike Java, the DI container ships in the platform (`Microsoft.Extensions.DependencyInjection`) and the ecosystem is built on it. The working knowledge:

- **Lifetimes:** Singleton (one instance forever), Scoped (one per request in ASP.NET Core), Transient (new each resolve). The classic defect is a captive dependency — a Scoped service (like a `DbContext`) injected into a Singleton, silently becoming a singleton itself and shared across requests. The container validates some of this in development; don't rely on it catching everything.
- Constructor injection, same as everywhere; the platform container deliberately omits property injection and fancy features — if you genuinely need keyed/decorator/convention registration beyond what's built in (keyed services arrived in the platform container — verify version), that's the signal for a third-party container, not for service-locator hacks.
- `IOptions<T>` binds configuration to typed classes — use it instead of passing `IConfiguration` around and stringly-typed lookups.

## Records and pattern matching

- `record` (reference) and `record struct` (value): value-equality types with `with`-expression non-destructive mutation. Use for DTOs, messages, domain values. Same shallow-immutability caveat as Java: a record holding a mutable collection is not an immutable value.
- Pattern matching (`switch` expressions, property patterns, list patterns) plus exhaustiveness over closed hierarchies: model alternatives as an abstract base or interface with a fixed set of derived records, switch over them, and let the compiler flag missing cases. Prefer this to enum-plus-cast and to visitor ceremony.
- `required` + `init` properties give compile-checked initialization without constructor explosions.

## Spans and memory types — where performance work justifies them

`Span<T>`/`ReadOnlySpan<T>` are stack-only views over contiguous memory — slice strings and arrays without allocating substrings/copies. `Memory<T>` is the heap-storable, async-compatible counterpart. Where they pay: parsing and formatting hot paths, avoiding substring/`ToArray` allocation storms, interop buffers. Where they don't: ordinary application code, where the added lifetime rules (spans can't be stored on the heap, can't cross `await`) are complexity with no measured payoff. The rule is the general performance rule: profile first; reach for spans when allocation shows up in the trace, and keep the span-shaped code contained in the layer that needs it.

## EF Core honesty — what the abstraction costs and when to drop to SQL

What it's good at: change tracking and unit-of-work for transactional writes, migrations as versioned schema history, LINQ queries for straightforward reads, and keeping 80% of data access out of hand-written SQL.

What it costs, and the mitigations:
- **Translation opacity:** the LINQ you wrote is not the SQL that runs. Log generated SQL in development (`LogTo`/`EnableSensitiveDataLogging` locally) and read it for anything non-trivial.
- **N+1 and over-fetching:** lazy loading is the N+1 machine — prefer it off; use explicit `Include` or, better, projection (`Select` into a DTO) which fetches exactly the columns needed and is the single highest-value EF habit.
- **Tracking overhead:** `AsNoTracking()` for read-only queries; tracking thousands of entities you'll never modify is pure cost.
- **When to drop to SQL:** reporting/aggregation queries the translator handles badly, bulk operations (though `ExecuteUpdate`/`ExecuteDelete` cover set-based writes in-framework — verify availability in the target version), and any query where you've read the generated SQL and can beat it. `FromSql`/Dapper alongside EF is normal architecture, not an admission of failure. The boundary rule: EF for the transactional core, SQL where measurement says so, and both behind the same repository/service seam so callers don't know.

## Release cadence and cross-platform deployment reality

- LTS versus STS is a real operational choice: LTS every two years with three-year support; STS between them with eighteen months. Production defaults to LTS unless a specific feature pays for the faster treadmill. Verify current versions and dates at use time.
- Cross-platform is genuinely real for server workloads: Linux is the normal production target (containers), Windows-only remnants are the desktop stacks (WinForms/WPF) and OS-specific APIs. 
- Deployment modes and their trade-offs: framework-dependent (small artifact, shared runtime patching) versus self-contained (no runtime prerequisite, bigger artifact, you own runtime patching); ReadyToRun trades artifact size for startup; Native AOT gives fast-start small-footprint binaries at the cost of no runtime codegen — reflection-heavy libraries and some serializers need source-generator paths, so verify library compatibility before committing to AOT.
- Containers: use the official images, run as non-root, and prefer the chiseled/distroless variants for surface reduction (composing with cybersecurity-architecture for the policy layer).
