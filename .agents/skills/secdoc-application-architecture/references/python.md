# Python — Production Engineering, Not Just Scripting

Verify at use time: the current CPython release and EOL table, free-threading (no-GIL) build status and library compatibility, and the packaging-tool state of play — this corner of the ecosystem moves fast enough that training-memory answers about tooling are stale by default. Date every such claim.

## Contents
- Idioms and the Zen applied
- The typing system as actually used
- Dataclasses vs attrs vs pydantic
- Packaging and environments
- The GIL and concurrency by workload
- Performance honesty
- The classic traps

---

## Idioms and the Zen applied

- **Comprehensions versus loops, honestly:** a comprehension is the idiom for build-a-collection-from-an-iterable — one clause, maybe a filter. It stops being the idiom when it needs nested conditionals, side effects, or a second line of mental parsing; "flat is better than nested" applies to comprehensions too, and a three-clause nested comprehension is worse than the loop it replaced. Generator expressions when you're iterating once and the collection would only exist to be consumed.
- **EAFP over LBYL** where the "look" races the "leap": `try: d[k] except KeyError` beats `if k in d: d[k]` when another thread/process can change the answer between check and use — and it's one lookup instead of two. LBYL remains fine for pure local logic. Don't let EAFP become exception-swallowing: catch the narrowest exception, at the level that can handle it.
- Unpacking, `enumerate`, `zip`, `with` for every resource, f-strings, `pathlib` over `os.path` string surgery. Dunder protocols over type-checking: if it needs to be iterable, iterate it; don't `isinstance(x, list)`.

## The typing system as it's actually used

Gradual typing is the point: annotate the public surfaces and the data models first, let inference cover locals, and run a checker (mypy or pyright) in CI — annotations without a checker are comments with extra syntax.

- Modern syntax: built-in generics (`list[int]`), `X | None` over `Optional[X]`. Which shorthand works unversioned depends on the minimum Python you support — check against the project's floor.
- **Protocols** (structural typing) are the honest way to type "anything with a `.read()`" — they type the duck typing Python already does, without forcing inheritance. Prefer a small `Protocol` over an ABC when the relationship is capability, not identity.
- `TypedDict` for dict-shaped data crossing boundaries (JSON payloads) you don't want to (or can't yet) convert to classes; `Literal`, `Final`, `NewType` for the precision they add at near-zero cost.
- The escape hatches (`Any`, `cast`, `# type: ignore`) are debt entries — each one narrows what the checker can promise; use with a comment saying why.

## Dataclasses vs attrs vs pydantic — by use case

- **`dataclasses`** (stdlib): plain data holders, config objects, internal value types. Zero dependencies, `frozen=True` + `slots=True` for immutable memory-lean values. No validation — it trusts its inputs.
- **attrs**: dataclasses' more powerful ancestor — validators, converters, more control — for when stdlib dataclasses run out of road but you don't need parsing. Fine choice; smaller mindshare than the other two, so team familiarity is a real input.
- **pydantic**: parsing and validation at trust boundaries — API request/response models, config loaded from files/env, anything arriving as untyped JSON. It *coerces and validates*, which is exactly right at the boundary and pure overhead for internal values two functions pass between themselves.
- The architecture rule: pydantic at the edges, dataclasses in the core. A codebase where every internal type is a pydantic model is paying validation tax on data it already validated.

## Packaging and environments

The stable ground: `pyproject.toml` is the metadata standard; build backends are pluggable; virtual environments are non-negotiable per project; lockfiles are non-negotiable for applications (libraries declare ranges, applications pin). Wheels are how things install; anything compiling from sdist in your deploy pipeline is a build dependency you're pretending not to have.

The moving ground — verify at use time before naming "the" tool: the resolver/installer/workspace-manager space has been consolidating rapidly (uv's rise being the recent headline), and recommendations here go stale in months. The durable advice: pick one tool per project for environment + lockfile management, commit the lockfile, rebuild environments from it in CI rather than accreting them, and treat "works in my venv" with the same suspicion as "works on my machine."

## The GIL and what it does and doesn't mean

The GIL serializes *bytecode execution* in one process. Consequences by workload:

- **IO-bound, moderate concurrency:** threads work fine — the GIL releases during blocking IO. `concurrent.futures.ThreadPoolExecutor` is the low-ceremony answer.
- **IO-bound, high concurrency (thousands of connections):** `asyncio` — single-threaded cooperative scheduling, no per-connection thread cost. The bill: coloring (async infects the call chain), an ecosystem split (you need async drivers end-to-end), and one blocking call in a handler stalls the whole loop. Choose it for connection-count reasons, not fashion.
- **CPU-bound:** threads buy nothing (GIL); `multiprocessing`/`ProcessPoolExecutor` buys real parallelism at the cost of process startup and pickling data across the boundary — chunk the work so serialization doesn't eat the win. Or drop to native (below), where C extensions release the GIL and NumPy-style workloads parallelize inside one process.
- **Free-threading:** CPython's no-GIL build exists as an official variant; its maturity, performance tax on single-threaded code, and C-extension ecosystem readiness are moving targets — verify current status before designing for it, and don't recommend it as the production default without checking.

## Performance honesty — when Python is the wrong layer

Pure-Python inner loops run rough orders of magnitude slower than native code. The engineering response is layering, not lament:

1. **Measure first** — `cProfile`/`pstats` for where, `py-spy` for production sampling without code changes, `timeit` for micro-questions. Optimizing unprofiled Python is guesswork.
2. **Algorithm before implementation** — the O(n²) fixed to O(n log n) beats any rewrite of the O(n²).
3. **Use the native layer that already exists** — NumPy/pandas vectorization for array-shaped work, the stdlib's C-implemented functions (`sorted`, `str` methods, `itertools`) over hand loops.
4. **Drop to native deliberately** — Cython, Rust via PyO3, or C extensions for the profiled hot function; keep the boundary coarse (cross it rarely with big payloads, not per-element).
5. **JIT-shaped options** (PyPy where dependencies allow; the specializing interpreter improvements in recent CPython) help broad workloads — verify current numbers rather than quoting old benchmarks.

Python's job in such systems is orchestration, glue, and the 95% of code that isn't hot — which it does with the lowest maintenance cost in the building.

## The classic traps

- **Mutable default arguments:** `def f(x, acc=[])` — the list is created once at def time and shared across calls. Use `acc=None` + `if acc is None: acc = []`. Same for `{}` and any mutable default.
- **Late-binding closures:** `[lambda: i for i in range(3)]` — every lambda sees the final `i` (2). Bind at definition: `lambda i=i: i`.
- **Import-time side effects:** module top-level code runs at first import, once, in import order — connections opened, config read, registries mutated at import time make testing miserable and startup order load-bearing. Modules should define things; `main()` and factories should do things.
- Chained equality surprises (`x == y == z` is chained comparison, usually right but occasionally shocking), `is` versus `==` (identity vs equality — small-int caching makes `is` *appear* to work until it doesn't), and shadowing stdlib names (`json.py` in your project directory silently wins the import).
