# Java — JVM-Era Engineering

Verify at use time: the current LTS line and its successor's date, virtual-thread maturity status in the user's target version, and framework version compatibility (Spring Boot's Java baseline moves). Date every such claim. Guidance below assumes the Java 17+ baseline that current LTS-following shops run; call out where a feature landed later.

## Contents
- Collections framework selection
- Streams — and when a loop is clearer
- Concurrency: executors, CompletableFuture, virtual threads
- Records and sealed types
- Generics and variance in practice
- GC awareness without folklore
- Dependency injection: pattern vs framework
- Build tooling
- LTS awareness and ecosystem honesty

---

## Collections framework selection

- `ArrayList` — the default list. Contiguous backing array, cache-friendly iteration, O(1) amortized append. `LinkedList` almost never wins in practice (see `data-structures.md`); if you think you need it, you probably want `ArrayDeque`.
- `HashMap` — the default map. `LinkedHashMap` when iteration order must match insertion (or for a cheap LRU via `removeEldestEntry`). `TreeMap` when you need sorted keys or range queries — you pay O(log n) per operation for it.
- `HashSet`/`EnumSet`/`EnumMap` — use the enum-specialized versions for enum keys; they're bit-vector/array-backed and both faster and smaller.
- `ArrayDeque` for stacks and queues — not `Stack` (legacy, synchronized) and not `LinkedList`.
- Size collections at construction when the size is known (`new ArrayList<>(n)`, `HashMap.newHashMap(n)` where available) — rehashing/regrowing on a known size is waste.
- Return `List.of(...)`/`Map.of(...)` immutables for fixed data; document mutability expectations at API boundaries rather than defensively copying everywhere by reflex.
- Concurrent variants (`ConcurrentHashMap`, `CopyOnWriteArrayList`) only where concurrent access is real — see `data-structures.md`.

## Streams — and when a loop is clearer

Streams earn their place for pipeline-shaped transformations: filter → map → collect reads as the data flow it is. They stop earning it when:
- The lambda needs to mutate local state or throw checked exceptions — the workarounds (wrapper exceptions, arrays-as-mutable-cells) are worse than a loop.
- You need index access, early exit with a value, or iteration over two collections in lockstep.
- The pipeline nests flatMaps three deep and the reviewer has to reconstruct the types by hand.

`parallelStream()` is not a performance feature to sprinkle: it uses the common ForkJoinPool (shared, and blockable by anyone else's parallel streams), and it pays coordination overhead that loses on small collections and cheap operations. Measure before and after; the honest default is sequential.

## Concurrency

- **Executors, not raw threads.** `ExecutorService` owns thread lifecycle; sizing is workload-dependent — CPU-bound pools near core count, IO-bound pools sized by concurrency-of-waiting (or replaced by virtual threads, below). Always shut down executors; leaked pools are leaked threads.
- **`CompletableFuture`** for composing async stages (`thenApply`, `thenCompose`, `allOf`). Two standing bugs: forgetting that `thenApply` after a completed future may run on the completing thread (use the `*Async` variants with an explicit executor when it matters), and dropping exceptions by never attaching `exceptionally`/`handle`.
- **Virtual threads** (Project Loom): thread-per-request programming without platform-thread cost — blocking becomes cheap, so the executor-sizing puzzle for IO-bound work largely dissolves. Verify at use time: which version they landed as final in, the maturity of pinning diagnostics, and whether the user's frameworks/drivers have removed `synchronized`-block pinning issues (the ecosystem was actively fixing these; current status is a use-time fact). The design guidance that survives version churn: virtual threads replace *thread pooling for IO concurrency*, not `CompletableFuture` composition where you genuinely want dataflow structure, and CPU-bound work still belongs on a bounded platform pool.
- Prefer immutability and confinement over locks; when you lock, keep critical sections small and never call unknown code (listeners, callbacks) while holding one.

## Records and sealed types

- `record Point(int x, int y)` — nominal tuples with value semantics: final fields, canonical constructor, `equals`/`hashCode`/`toString` generated. Use for DTOs, value objects, map keys, multi-value returns. Validate in the compact constructor. They're shallowly immutable — a record holding a mutable list is a shared-mutation bug wearing a value-type costume; copy to `List.copyOf` on the way in.
- Sealed interfaces + records + pattern matching (`switch` with type patterns) give closed sum types: model a domain's fixed alternatives (`sealed interface PaymentResult permits Approved, Declined, Retry`) and let exhaustiveness checking turn "forgot a case" into a compile error. This trio is the biggest working-Java improvement of the era; use it where you'd previously have written a visitor or an enum-with-casts.

## Generics and variance in practice

- PECS: producer `extends`, consumer `super`. `List<? extends Number>` you read from; `List<? super Integer>` you write into. Apply wildcards at API boundaries (method parameters), not in local variables or return types where they only spread ceremony.
- Arrays are covariant and generics are invariant — which is why `List<String>` is not a `List<Object>` and why mixing arrays with generics produces the unchecked warnings it does. Prefer lists.
- Type erasure means no `new T[]`, no `instanceof List<String>`; where runtime type is needed, pass a `Class<T>` token.
- Suppress an unchecked warning only with a comment proving why it's safe, at the narrowest scope.

## GC awareness without GC folklore

What's true: modern collectors (G1 as the long-standing default; ZGC and Shenandoah for low-pause goals — verify current default and generational-ZGC status at use time) make most allocation cheap and most tuning unnecessary. Young-generation allocation is a pointer bump; short-lived objects are nearly free.

What's folklore: object pooling for ordinary objects (it defeats the generational hypothesis and adds bugs), `System.gc()` calls, cargo-culted flag sets copied from a 2012 blog post. 

What still matters: allocation *rate* in hot paths (visible in a profiler as GC pressure), humongous allocations under G1, and heap sizing relative to live set. The discipline: measure with the tools (JFR/Java Flight Recorder is built in and production-safe; GC logs via `-Xlog:gc*`) before touching flags, and change one flag at a time with a benchmark that resembles production.

## Dependency injection: the pattern versus the framework

The pattern is constructor injection: dependencies as constructor parameters, wiring done at the composition root. This costs nothing, needs no framework, and makes every class trivially testable. Field injection (`@Autowired` on a private field) hides dependencies and blocks plain-constructor testing; treat it as a defect in review.

The framework (Spring's container, or Guice/Dagger) earns its place when the object graph is large enough that hand-wiring the composition root is real maintenance — plus the lifecycle, configuration, and AOP services that come along. The honesty rule: keep classes framework-agnostic (constructor injection, no framework annotations in the domain layer where avoidable) so the pattern survives the framework.

## Build tooling

Maven: convention-first, declarative, verbose, predictable — the safe default for teams that value boring builds. Gradle: flexible, faster on large builds (incremental + build cache), and its flexibility is exactly the mechanism by which builds become unmaintainable — hold Gradle builds to a "declarative unless proven necessary" standard (Kotlin DSL, version catalogs, no logic in build scripts that could live in a plugin). Either way: lock dependency versions (Maven enforcer / Gradle version catalogs + locking), and treat the build file as reviewed code.

## LTS awareness and ecosystem honesty

Java ships a release every six months; LTS lines are what production standardizes on. Verify at use time which LTS is current, which is next and when, and the support windows of the vendor distribution in play (Temurin, Corretto, Oracle) — do not recite these from memory; they're dated facts. Guidance keyed to features should name the version a feature landed in, so the user can map it to their baseline.

Ecosystem honesty: Spring (Boot) is the de facto answer for web services, and pretending otherwise wastes the reader's time — name it where it's the answer. But keep the guidance framework-portable: state the underlying pattern (DI, configuration binding, transactional boundaries) so the advice survives on Quarkus, Micronaut, or plain Java, and flag which parts are Spring-specific rather than Java-general.
