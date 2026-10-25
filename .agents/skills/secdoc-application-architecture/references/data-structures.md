# Data Structures — Selection Judgment

The rule for this file: complexity claims come with the constant-factor and memory-locality caveats that decide real contests. Big-O ranks algorithms as n → ∞; your n is finite and your memory hierarchy is not flat.

## Contents
- Arrays and dynamic arrays
- Linked lists — the modern honesty
- Stacks and queues
- Hash tables
- Trees: BSTs, balanced variants, B-trees
- Heaps and priority queues
- Tries
- Graphs
- Complexity analysis done honestly
- Per-language stdlib mapping
- Concurrency-safe variants

---

## Arrays and dynamic arrays

Contiguous memory: O(1) index, and — the property that wins most real contests — sequential access that the prefetcher predicts and the cache rewards. Dynamic arrays (vector/ArrayList/List<T>/list) grow geometrically, making append O(1) *amortized* — individual appends are occasionally O(n) reallocation+copy, which matters for latency-sensitive paths (pre-size when the count is known). Insert/delete in the middle is O(n) shifting — and yet for small-to-moderate n, the shift over contiguous memory still beats pointer-chasing alternatives. Deletion trick when order doesn't matter: swap with last, pop — O(1).

**Default status: the dynamic array is the answer to "which sequence type" unless a measured reason says otherwise.**

## Linked lists — and the modern honesty

Textbook story: O(1) insert/delete at a known node, no reallocation, O(n) access. Modern reality that demotes them: every node is a separate allocation somewhere in the heap, so traversal is a cache miss per element — a linear scan of a linked list can run 10–100x slower than the same scan of an array, and "O(1) insert" requires *already holding the node pointer*, which usually cost an O(n) cache-missing search to obtain. Meanwhile the array's O(n) shift is a memcpy the hardware loves. Benchmarks of insert-in-middle workloads routinely show vectors beating lists well into the thousands of elements.

Where they still earn a living: intrusive lists inside systems code (the node is inside an existing object — no extra allocation, and you *do* hold the pointer: OS run queues, LRU chains inside caches), stable node addresses under mutation, and lock-free structures built from CAS on next-pointers. Where they don't: application code that reached for `LinkedList` from textbook memory. In teaching contexts, teach them — pointer manipulation and the array-of-nodes contrast are foundational — then teach the honesty.

## Stacks and queues

Discipline wrappers over other structures. Stack: dynamic array (push/pop at the end — contiguous, fast, done). Queue: ring buffer / array-backed deque (ArrayDeque, collections.deque, VecDeque) — not a linked list, and in Java specifically not the legacy `Stack` class (synchronized, extends Vector). Uses beyond the obvious: stacks for iterative DFS, undo, and parser state; queues for BFS and work distribution; deques for sliding-window algorithms and work-stealing.

## Hash tables

The default associative answer, and deservedly: O(1) average lookup/insert/delete by paying memory (load factor headroom) and giving up ordering. Working knowledge that separates use from folklore:

- **Collision strategies:** separate chaining (buckets of entries — tolerant of high load factors; Java's HashMap, which converts long chains to red-black trees as a DoS defense) versus open addressing (probe sequences in one flat array — better cache behavior, needs lower load factor, deletion via tombstones; the design family behind Python's dict and the fast modern maps like Swiss tables/F14).
- **Load factor** is the memory/speed dial: as it rises, probes/chains lengthen; implementations resize (rehash everything, O(n)) at a threshold — another reason to pre-size when the count is known.
- The costs the O(1) hides: hashing the key (hash a 60-char string key and you've paid a nontrivial constant), the miss on the bucket, and — for open addressing — the probe walk. For small n (tens), a linear scan of a flat array of pairs beats the hash table; several standard libraries know this internally.
- **Worst case is O(n)** under adversarial keys — why hash-flooding defenses (randomized seeds, tree-ified buckets) exist in every serious runtime, and why exposed services shouldn't hash attacker-chosen keys with a toy function (composes with cybersecurity-architecture for the DoS framing).

## Trees

- **BSTs:** ordered by invariant; O(log n) *only if balanced* — a plain BST fed sorted input degenerates to an O(n) linked list, which is why nobody ships plain BSTs.
- **Balanced variants:** red-black trees (the standard-library choice — std::map, Java TreeMap, .NET SortedDictionary internals) rebalance cheaply per write; AVL balances tighter (faster reads, costlier writes). Choose the *sorted* structure at all only when you need what hashing can't give: ordered iteration, range queries ("everything between A and B"), floor/ceiling lookups, or a sorted stream maintained under mutation. Otherwise the hash table's O(1) beats the tree's O(log n) — with the caveat that log n is small (log₂ of a million ≈ 20) and tree constants are honest, so the gap at real sizes is smaller than the notation suggests.
- **B-trees and why databases love them:** high-fanout nodes sized to pages, so a million-row index is 3–4 levels deep — 3–4 page reads instead of 20 binary-tree hops, which is the whole game when a hop is a disk/SSD page fetch rather than a pointer dereference. The same locality logic makes B-tree-shaped maps win *in memory* too (cache lines are small pages). Every serious database index is a B-tree/B+-tree unless it's an LSM tree — a write-optimized trade (sequential writes, compaction later, slower point reads) for ingest-heavy workloads.

## Heaps and priority queues

Array-embedded binary heap: O(log n) push/pop of the extreme element, O(1) peek, no pointers, cache-decent. The answer to "repeatedly need the min/max of a changing set": schedulers, Dijkstra's frontier, top-K over streams (a size-K heap processes n elements in O(n log K) and constant memory — the interview classic that's also actually used), timer wheels' simpler cousin. Not the answer for full sorting (just sort) or for lookup by key. Standard-library caveats: Python's heapq is min-only (negate for max) and decrease-key isn't supported in most stdlib heaps — the standard workaround is lazy deletion (push the updated entry, skip stale ones on pop).

## Tries

Character/byte-keyed trees: O(key length) lookup independent of entry count, and — the unique selling point — prefix operations: autocomplete, longest-prefix match (IP routing tables are compressed tries — radix/Patricia trees), lexicographic iteration for free. The cost: naive tries are pointer-and-memory-hungry (per-node child arrays), so real implementations compress (radix trees merge single-child chains). Reach for a trie when prefixes are the workload; for plain string lookup, the hash table wins.

## Graphs

- **Representations:** adjacency list (the default — O(V+E) space, iterate neighbors cheaply) versus adjacency matrix (O(V²) space, O(1) edge test, and dense-math friendly — right for dense graphs and algorithms that multiply matrices). Edge lists for algorithms that sort edges (Kruskal).
- **Traversal:** BFS (queue) — shortest path in *hops*, level structure; DFS (stack/recursion — mind stack depth on large graphs) — cycle detection, topological sort (the dependency-ordering workhorse: builds, task schedulers, migrations), connected components.
- **Shortest paths:** unweighted → BFS; non-negative weights → Dijkstra (binary heap: O((V+E) log V)); negative edges → Bellman-Ford (and negative-*cycle* detection); all-pairs on small dense graphs → Floyd-Warshall (O(V³)); heuristic-guided single-target → A*.
- The applied note: most "graph problems" in application work are dependency ordering (topo sort) and reachability — recognize them as graphs and the algorithms are off-the-shelf.

## Complexity analysis done honestly

- Big-O discards constants and lower-order terms by design — it ranks growth, not speed. Two O(n) passes differing 50x in constant are both "O(n)."
- **Memory locality is the dominant hidden constant:** cache hits are a few cycles, main-memory misses are hundreds. Structures that stride contiguously (arrays, open-addressed tables, B-tree nodes) get hardware help; pointer-chasers (linked lists, naive trees) pay a miss per hop. This one fact explains most of the "textbook says X, benchmark says Y" surprises above.
- **Real-size crossover points:** asymptotically-better wins *eventually*; at your n it may lose. Linear scan beats hashing at tens of elements; insertion sort beats mergesort under ~32 elements (why production sorts hybridize — introsort, Timsort); the vector beats the list at insert-in-middle for surprisingly large n. The professional habit: state the asymptotic answer, then check n. If n ≤ a few thousand and the code runs occasionally, the simplest structure wins on the metric that dominates at that scale — maintenance.
- Amortized ≠ worst-case per-op (the resize/rehash spike matters for tail latency); average-case carries assumptions (hashing assumes non-adversarial keys); and space complexity is a first-class axis — the O(n log n) time win that costs O(n) extra memory is a trade, not a free upgrade.

## Per-language stdlib mapping

| Need | C++ | Java | C#/.NET | Python | Bash / PowerShell |
|---|---|---|---|---|---|
| Dynamic array | `std::vector` | `ArrayList` | `List<T>` | `list` | indexed arrays / `@()` (see note) |
| Hash map | `std::unordered_map` | `HashMap` | `Dictionary<TKey,TValue>` | `dict` | `declare -A` (Bash 4+) / `@{}` hashtable |
| Sorted map | `std::map` (red-black) | `TreeMap` | `SortedDictionary` | — (use `sortedcontainers` pkg) | — |
| Hash set | `std::unordered_set` | `HashSet` | `HashSet<T>` | `set` | (keys of a hashtable) |
| Deque/queue | `std::deque` | `ArrayDeque` | `Queue<T>`/`Stack<T>` | `collections.deque` | — |
| Heap | `std::priority_queue` | `PriorityQueue` | `PriorityQueue<TElement,TPriority>` | `heapq` (min-heap functions over a list) | — |

Implementation notes worth knowing:
- `std::deque` is chunked (not one contiguous block); `std::unordered_map` is chaining with iterator-stability guarantees that cost it speed against flat-map alternatives.
- Java `HashMap` treeifies long chains; `ArrayList` and `HashMap` both benefit from pre-sizing.
- .NET `List<T>` of structs stores them inline — a `List<Point>` of struct Points is genuinely contiguous data, a locality lever Java historically lacked (its value-types story: verify current status).
- Python's `list` is an array of object pointers — contiguous pointers, scattered objects — so its locality is worse than it looks; `dict` is open-addressed, compact, and insertion-ordered by guarantee; `deque` is chunked with O(n) middle indexing.
- Shells: Bash arrays hold strings only — nesting requires simulation, which is a promotion-rule signal (`shell-scripting.md`). PowerShell's `@()` array is fixed-size (`+=` copies the whole array — O(n²) accumulation loops are the classic perf bug; use `[System.Collections.Generic.List[T]]` for growth), and its hashtables are real .NET hashtables.

## Concurrency-safe variants and when they're needed

- The first question is whether shared mutation is needed at all — confinement (each thread owns its data), immutable snapshots, and message passing beat clever concurrent structures where they fit.
- When sharing is real: `ConcurrentHashMap` (Java — striped, contention-friendly, plus `compute`/`merge` atomic ops), `ConcurrentDictionary`/`ConcurrentQueue`/`Channel<T>` (.NET), `queue.Queue` and multiprocessing queues (Python — noting that CPython's GIL makes individual dict/list ops atomic-ish, which is a trap to *not* rely on: check-then-act sequences still race), and in C++ the standard library gives you primitives, not concurrent containers — reach for TBB/folly's concurrent maps or design around a mutex.
- The honest defaults: an ordinary structure behind a mutex is correct, simple, and fast enough until contention is *measured*; concurrent structures earn their complexity under real contention. `CopyOnWriteArrayList`-style structures fit read-heavy/write-rare (listener lists), and compose atomically only per-operation — an iterate-then-modify sequence over any concurrent structure is still a race unless the structure's API makes it one operation.
