# Architecture Patterns — Selection Criteria, Not a Catalog

Rule for this file: every pattern entry names the team size and load at which it starts making sense and at which it stops. A pattern without its operating envelope is trivia.

## Contents
- Structural patterns: layered, hexagonal, modular monolith, microservices
- Event-driven and messaging
- CQRS and event sourcing
- API design: REST, gRPC
- Resilience patterns
- Caching
- Twelve-factor and configuration
- Observability as a design input

---

## Structural patterns

### Layered architecture
Presentation → application → domain → persistence, dependencies pointing down. The default shape most codebases grow into whether or not anyone chose it.

- **Starts making sense:** immediately, any team size. It's the zero-cost baseline.
- **Stops making sense:** when layers become pass-through ceremony — a controller calling a service calling a repository, each method one line. That's layering as ritual. Collapse layers that add no decision.
- **Cost:** the classic failure is domain logic leaking into the persistence layer (queries encoding business rules) or the presentation layer (validation living only in the UI). The layers are only worth having if the dependency rule is enforced.

### Hexagonal / ports-and-adapters
Domain core with interfaces (ports) at the boundary; infrastructure implements adapters. The point is testability and swappable infrastructure, not diagram aesthetics.

- **Starts making sense:** when you have real reasons to isolate the core — multiple delivery mechanisms (HTTP + queue consumer + CLI), a database decision you genuinely expect to revisit, or a domain complex enough that testing it without infrastructure pays for the indirection. Roughly: team ≥ 3, domain logic that would take > 1 day to re-verify manually.
- **Stops making sense:** CRUD services with thin logic. A port/adapter pair around a repository that will only ever be Postgres is abstraction rent with no tenant.
- **Cost:** every boundary is an interface, a DTO mapping, and a place for the two models to drift. Budget one mapping layer, not three.

### Modular monolith
One deployable, internally partitioned into modules with enforced boundaries (separate packages/assemblies, no cross-module internals access, module-level APIs). The correct default for most teams, most of the time.

- **Starts making sense:** team of ~4–25, single product, load servable by vertical scaling plus a few horizontal replicas (which covers the vast majority of business systems — a boring stateless service on modest hardware handles thousands of requests/second).
- **Stops making sense:** when independent deployment cadence becomes a real organizational need — multiple teams shipping on conflicting schedules and stepping on each other's releases — or when one component's resource profile (memory-hungry batch, GPU inference) genuinely can't share a process.
- **Cost:** boundary enforcement takes tooling discipline (ArchUnit, .NET architecture tests, import linters). Without enforcement it decays into a big ball of mud with extra folders.

### Microservices
Independently deployable services, each owning its data, communicating over the network.

The operational bill, itemized — this is what the pattern actually costs, and the answer to "should we do microservices" is usually the answer to "can we pay this":
- Every in-process call that becomes a network call gains latency, partial-failure modes, and a serialization boundary.
- Distributed data: no cross-service transactions. You buy sagas, outbox patterns, eventual consistency, and the customer-support tickets eventual consistency generates.
- Each service needs its own pipeline, deployment, monitoring, alerting, on-call story, and dependency-update cadence. Ten services is ten of everything.
- Debugging moves from a stack trace to distributed tracing. If you don't have tracing before you split, you'll be flying blind after.
- Contract management between services: versioning, backward compatibility, consumer-driven contract tests or the outage that teaches you why they exist.

- **Starts making sense:** multiple teams (rule of thumb: more than ~3 teams / 25+ engineers) whose deployment coupling is a measured drag, or genuinely divergent scaling/runtime needs per component, or organizational boundaries (separate ownership, compliance isolation) that map to service boundaries.
- **Stops making sense:** it never made sense for a 5-person team, and "we might need to scale someday" is not a reason — a modular monolith with clean boundaries converts to services later far more cheaply than a premature distributed system converts to anything.
- **Migration honesty:** extract one service from the monolith where the pain is measured, run it in production, and let the experience price the next extraction. Big-bang decomposition fails at a rate that should embarrass the industry.

## Event-driven and messaging

Asynchronous communication through events (facts that happened) or commands (requests to act) on a broker.

- **Core distinction:** events decouple — the publisher doesn't know consumers exist; commands direct — the sender expects a specific handler. Naming them honestly prevents the "event" that's secretly a command with a mandatory consumer.
- **Delivery semantics:** at-least-once is the practical default, which means consumers must be idempotent. Exactly-once claims from brokers apply to narrow scopes; design as if duplicates arrive, because they will.
- **Ordering:** guaranteed only within a partition/queue, and partitioning by key trades ordering scope against parallelism. If your design needs global ordering, that's a signal to reconsider the design.
- **Starts making sense:** genuine fan-out (one fact, several independent reactions), workload leveling (spiky producer, steady consumer), or integration between systems with different availability profiles.
- **Stops making sense:** request/response wearing an async costume — publishing an event and then polling for the reply reinvents RPC with worse latency and worse debugging. If the caller needs the answer to proceed, call synchronously.
- **Cost:** the broker is now infrastructure you run and monitor; the flow of the system no longer reads top-to-bottom in any one codebase; dead-letter handling and replay tooling are mandatory, not optional.

## CQRS and event sourcing

CQRS: separate the write model from the read model — different types at minimum, different stores at the aggressive end.

- **Starts making sense:** read and write workloads with genuinely different shapes and scales — heavy denormalized reads against a normalized write model, or read replicas with different indexing needs. Also earns its place when the domain's write-side invariants and the UI's read shapes fight each other in one model.
- **Stops being CQRS and starts being over-engineering:** two stores, a projection pipeline, and eventual consistency between your own write and your own read — for a system where a well-indexed single database was never the bottleneck. Most systems that "need CQRS" need an index and a view.
- **Event sourcing** (storing state as an event log) compounds both the benefits and the bill: perfect audit history and temporal queries, against schema-evolution-of-events-forever, projection rebuild operations, and a mental model most new hires haven't seen. Justify it with a real audit/replay requirement, not with a conference talk.

## API design

### REST resource modeling
- Model nouns (resources), not verbs; use HTTP methods for the verb semantics. `POST /orders/{id}/cancel` is a fine escape hatch when the action doesn't map to a resource state change — purity that confuses consumers is not a virtue.
- **Versioning:** version in the URL path (`/v2/`) is the boring choice that works; header versioning is cleaner in theory and invisible in practice (curl, logs, caches). Add fields freely, never repurpose or remove without a version bump.
- **Pagination:** cursor-based for anything that grows or changes during iteration (offset pagination skips/duplicates rows under concurrent writes and gets slow at high offsets — `OFFSET 100000` scans 100 000 rows). Offset is acceptable for small, stable, UI-paged data.
- **Error contracts:** a consistent error body (RFC 9457 problem details or a house equivalent) with a machine-readable code, a human message, and a correlation ID. The correlation ID is the difference between a support ticket taking minutes and taking hours.

### gRPC
- **Earns its place:** service-to-service calls where you control both ends, want generated typed clients, streaming, and lower serialization overhead. Contract-first via protobuf is a real discipline benefit.
- **Doesn't:** public APIs for arbitrary consumers and browser-facing endpoints (grpc-web exists but adds a proxy layer). REST/JSON remains the lingua franca at the edge.

## Resilience patterns

Ordered by how early you need them:

1. **Timeouts** — every network call, no exceptions, and shorter than the caller's own timeout. The unbounded call is the root cause of most cascade failures. This is the pattern; the rest are refinements.
2. **Retry with backoff and jitter** — retries without exponential backoff and jitter synchronize into thundering herds and turn a blip into an outage. Retry only idempotent operations, cap the attempts, and budget total retry time inside the caller's timeout.
3. **Idempotency** — idempotency keys on mutating endpoints make retries safe. Design this in before you need it; retrofitting is painful because clients already exist.
4. **Circuit breaker** — stop calling a dependency that's failing so it can recover and so your threads aren't parked on a corpse. Adds tunable state (thresholds, half-open probing) you must monitor. Worth it once you have several downstream dependencies or a dependency with a history; below that, timeout + retry covers you.
5. **Bulkhead** — partition resources (connection pools, thread pools, semaphores) per dependency so one slow dependency can't consume everything. Matters when one process talks to several dependencies with different reliability profiles.

## Caching

- **Layers, in order of preference:** HTTP caching (Cache-Control, ETags — free infrastructure the internet already runs) → CDN/edge → application-level (in-process or Redis/memcached) → database-internal. Prefer the outermost layer that works; every layer you add inward is invalidation you own.
- **Invalidation honesty:** the two workable strategies are TTL (accept bounded staleness — and say the bound out loud to the business owner) and explicit invalidation on write (accept the complexity and the failure mode where the invalidate is lost). Write-through and write-behind refine the second. Anyone promising cache coherence without one of these trade-offs is selling something.
- **The failure modes that page you:** stampede (many concurrent misses on a hot key — mitigate with request coalescing or probabilistic early refresh), and stale-forever (invalidation message lost — mitigate with a TTL backstop even on explicitly invalidated entries).
- **When not to cache:** before measuring. A cache added on intuition is a second data store with an undocumented consistency model.

## Twelve-factor and configuration discipline

The still-load-bearing core: config in the environment, not in the build artifact (one artifact promoted through environments); backing services as attached resources (swappable by config); stateless processes with state in backing stores; logs as event streams to stdout, aggregation as the platform's job; dev/prod parity kept close enough that "works on my machine" is rare.

Configuration discipline beyond twelve-factor: secrets come from a secrets manager, never environment files in the repo (practice-level guidance in `development-practices.md`; framework mapping composes with cybersecurity-architecture). Feature flags are config with a lifecycle — every flag has an owner and a removal date, or you accumulate a combinatorial testing problem.

## Observability as a design input

Designed in, not sprinkled on afterward:

- **Structured logging** — key-value/JSON events, not printf prose. Include the correlation/trace ID in every line. Decide log levels by "who gets paged" not by mood.
- **Metrics** — the RED set per service (rate, errors, duration as histograms — averages hide the p99, and the p99 is where users live) plus saturation for the resources you actually exhaust.
- **Tracing** — propagate context (W3C traceparent) across every hop from day one. Adding trace propagation after the fact means touching every service boundary you own.
- **The design-input part:** if you can't answer "how would we know this is failing" for a component during design review, the design isn't done. Alert on symptoms (user-visible error rate, latency SLO burn), not on every cause.
