# C++ — Modern Engineering

Verify at use time: the current published standard, compiler adoption status of its features (GCC/Clang/MSVC support tables), and which standard the user's toolchain actually targets. Do not assert "the current standard is C++XX" from training memory — date the claim when you make it. Guidance below is written against the C++17-and-later baseline that production codebases actually run.

## Contents
- RAII as the organizing idea
- Ownership: smart pointers
- Rule of zero / three / five
- Const-correctness
- Move semantics and value categories
- Undefined behavior and sanitizers
- Standard library first
- Error handling: exceptions vs expected/status
- Build and dependency reality
- Which features to reach for

---

## RAII as the organizing idea

Every resource — memory, file handle, mutex, socket, transaction — is owned by an object whose destructor releases it. This is the load-bearing idea the rest of modern C++ hangs from: exception safety falls out of it (stack unwinding runs destructors), and "who frees this?" stops being a question because scope answers it.

The practical rule: if you write `new`, `delete`, `fopen`, `lock`, or any acquire without a wrapping type, stop and wrap it. `std::lock_guard`/`std::scoped_lock` for mutexes, `std::fstream` for files, smart pointers for heap memory, a small struct with a destructor for anything else.

## Ownership: smart pointers

- `std::unique_ptr<T>` — sole ownership, zero overhead over a raw pointer (with the default deleter). The default for heap allocation. Transfer with `std::move`; the type system now documents the transfer.
- `std::shared_ptr<T>` — shared ownership with an atomic reference count. The atomics cost on every copy, and the control block is a second allocation unless you use `std::make_shared`. Reach for it when lifetime genuinely has multiple independent owners — which is rarer than its usage suggests. A `shared_ptr` everywhere codebase is usually a codebase that never decided who owns what.
- `std::weak_ptr<T>` — breaks `shared_ptr` cycles and expresses "observe if still alive."
- Raw pointers and references still have a job: non-owning access. `T*` or `T&` as a parameter means "I use it, I don't own it." Passing `const std::shared_ptr<T>&` to a function that only reads the object is noise; pass `const T&`.

## Rule of zero / three / five

- **Rule of zero (the goal):** write no destructor, no copy/move operations — let members (smart pointers, containers, RAII wrappers) handle everything. Most classes should be here.
- **Rule of five:** if you write any of destructor / copy ctor / copy assign / move ctor / move assign, you must consider all five, because writing one suppresses or alters the implicit generation of others. Declaring a destructor disables implicit move — a class with `~Widget()` and nothing else silently copies where it could move.
- **Rule of three** is the pre-C++11 version; you'll meet it in legacy code.

If you find yourself writing the five, ask whether a member with the right semantics (a `unique_ptr` with a custom deleter, often) gets you back to zero.

## Const-correctness

`const` on member functions is a promise checked by the compiler and a statement of thread-compatibility by convention (a `const` method should be safe to call concurrently — the standard library assumes this of your types). `const T&` parameters for anything you read but don't take. Const-correctness applied late is a viral refactor; applied from the start it's free. `constexpr` moves work to compile time and documents that a function has no runtime dependencies; use it where it's natural, don't contort code to chase it.

## Move semantics and value categories at working depth

Working model: an rvalue is an expression whose resources can be stolen (temporaries, `std::move`d names); an lvalue has identity and persists. `std::move` performs no move — it's a cast to rvalue reference that makes the object *eligible* for moving. The move happens (or doesn't) in the constructor/assignment that receives it.

The rules that prevent real bugs:
- A moved-from standard-library object is valid but unspecified — you may assign to it or destroy it; reading its value is a latent bug.
- Don't `return std::move(local);` — it defeats copy elision (NRVO). Return the local; the compiler elides or moves.
- `std::move` on a `const` object silently copies. The compiler won't warn; the profiler will.
- In templates, `T&&` is a forwarding reference, not an rvalue reference — pass it on with `std::forward<T>`, and treat perfect forwarding as a tool for wrapper/factory code, not everyday API design.

## Undefined behavior and the sanitizer toolchain

UB is not "it crashes" — it's "the optimizer may assume this never happens," which produces time-traveling miscompiles: null checks deleted because a prior dereference implied non-null, signed-overflow loops "optimized" into infinity. The frequent offenders: signed integer overflow, out-of-bounds access, use-after-free, data races, strict-aliasing violations, dereferencing invalidated iterators (the vector that reallocated mid-loop).

Non-negotiable toolchain, in CI, not just on laptops:
- **ASan** (`-fsanitize=address`) — heap/stack/global out-of-bounds, use-after-free. ~2x slowdown; run your test suite under it always.
- **UBSan** (`-fsanitize=undefined`) — overflow, misalignment, invalid casts. Cheap enough to leave on in debug builds.
- **TSan** (`-fsanitize=thread`) — data races. Incompatible with ASan in the same binary; separate CI job. 5–15x slowdown, worth every cycle for concurrent code.
- Warnings as errors: `-Wall -Wextra` minimum, and treat new warnings as defects.

## Standard library first

`std::vector` is the default container (see `data-structures.md` for why cache locality makes it win contests it "should" lose). `std::unordered_map`/`std::map` for associative data. `<algorithm>` over hand-rolled loops — `std::sort`, `std::find_if`, `std::transform` and (C++20's ranges where available) both compress code and dodge off-by-one bugs. Hand-rolled data structures need a measured justification; the standard library versions have twenty years of edge cases fixed.

## Error handling: exceptions versus expected/status returns — honestly compared

- **Exceptions:** zero cost on the non-throwing path with modern table-based unwinding, expensive when thrown (unwinding, RTTI). Compose naturally with RAII and constructors (which can't return status). Costs: invisible control flow (any call may throw — reviewers can't see the paths), and some domains ban them (many embedded targets, historically many game codebases) making libraries that throw unusable there.
- **`std::expected<T,E>` (C++23) / status-return types (`absl::StatusOr`, `outcome`):** errors in the type signature, visible at every call site, no hidden control flow. Costs: ceremony at each call, error paths you must consciously propagate, and constructors still can't use them — factory functions become the constructor idiom.
- **The honest selection rule:** pick per codebase, not per function, and be consistent — a codebase mixing both styles ad hoc gets the weaknesses of each. Exceptions for genuinely exceptional failures in application code; expected/status for expected failures (parse errors, not-found) and for libraries that must serve exception-free environments. Verify `std::expected` support in the target toolchain before recommending it as available.

## Build and dependency reality

CMake is the de facto standard, whatever anyone thinks of the language. Modern CMake means targets and properties (`target_link_libraries`, `target_include_directories` with PRIVATE/PUBLIC/INTERFACE), not directory-level variable soup. Package management is genuinely unsolved-but-improving: vcpkg and Conan are the serious contenders, FetchContent works for small dependency counts, and vendoring persists for reasons ranging from defensible (supply-chain control) to inertial. Verify current tool state at use time before pronouncing on which is winning. Dependency count discipline matters more in C++ than most ecosystems because each dependency is also a build-system integration.

## Which features to reach for

Stable, use freely (given a C++17+ toolchain): structured bindings, `if constexpr`, `std::optional`/`std::variant`/`std::string_view` (mind `string_view` lifetime — it's a non-owning view), class template argument deduction where it aids clarity.

C++20-and-later features (concepts, ranges, coroutines, modules, `std::format`, `std::expected`, `std::print`): adoption is uneven across GCC/Clang/MSVC and across the standard-library implementations — verify the specific feature against the target toolchain at use time rather than assuming the standard's year implies availability. Modules in particular have lagged their paper status in real build systems; check current support before designing a codebase around them.
