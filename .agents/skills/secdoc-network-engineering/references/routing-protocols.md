# Routing Protocols

Contents: routing table logic and AD · static/default routing · distance-vector mechanics (RIP) · EIGRP and DUAL · OSPF · IS-IS · BGP · redistribution · summarization · convergence comparison · first-hop redundancy.

## Routing table logic

A router forwards on the **longest prefix match**, always. Protocol preference only matters when two sources offer the *same* prefix. The selection order:

1. Longest prefix match wins regardless of source (a static /24 loses to an OSPF /25 for hosts inside the /25).
2. For identical prefixes from different protocols, lowest **administrative distance** (AD) wins.
3. For identical prefixes within one protocol, lowest **metric** wins; equal metrics install as ECMP entries.

AD is a local trustworthiness rank, not exchanged in any packet. Cisco defaults (other vendors differ — Junos calls it "route preference" with different values, e.g. OSPF internal 10, IS-IS L1 15):

| Source | AD |
|---|---|
| Connected | 0 |
| Static | 1 |
| EIGRP summary | 5 |
| eBGP | 20 |
| EIGRP internal | 90 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP external | 170 |
| iBGP | 200 |

Metric semantics are protocol-local and incomparable across protocols: RIP counts hops, OSPF sums interface costs, EIGRP computes a composite, BGP doesn't have a scalar metric at all — it runs an attribute-comparison list. This incomparability is why redistribution needs seed metrics.

## Static and default routing

A static route is an administrative assertion: this prefix is reachable via this next hop, believe it at AD 1. Uses: stub networks, deterministic paths, floating static backups (raise the AD above the dynamic protocol so it installs only on failure — e.g. `ip route 0.0.0.0 0.0.0.0 203.0.113.1 250` on IOS-XE). The default route 0.0.0.0/0 is the shortest possible prefix — it matches last, by design.

Trade-off: static routes never converge and never lie; they also never notice a downstream failure past the resolvable next hop. Pair with IP SLA/BFD tracking or accept the blind spot.

## Distance-vector mechanics — RIP as the teaching case

Distance-vector: each router advertises its full table to neighbors ("routing by rumor"); each neighbor adds its own cost and re-advertises. No router knows the topology — only distances and directions.

**RIP/RIPv2 specifics:** hop-count metric, 15 max, 16 = unreachable. Timers: update 30 s (jittered), invalid 180 s, hold-down 180 s, flush 240 s. RIPv1 broadcasts and is classful (no mask in the update — cannot do VLSM); RIPv2 multicasts to 224.0.0.9, carries masks, supports authentication. RIPng covers IPv6.

**Loop prevention**, because rumors loop:

- **Split horizon** — never advertise a route back out the interface it was learned on.
- **Poison reverse** — advertise it back anyway, with metric 16, making the "don't route through me" statement explicit.
- **Hold-down timers** — after a route goes unreachable, ignore worse news about it for 180 s so a stale rumor can't resurrect it.
- **Triggered updates** — send changes immediately rather than waiting for the 30 s cycle.

Count-to-infinity is the failure these exist for: without them, two routers can increment a dead route's metric between each other until it hits 16. RIP's value in 2026 is pedagogical and in tiny/lab networks; its convergence (minutes in worst cases) disqualifies it elsewhere. Trade-off stated honestly: nothing is simpler to configure, and nothing converges worse.

## EIGRP and DUAL

EIGRP is an advanced distance-vector protocol (Cisco-origin; informationally published as RFC 7868, with real interoperability still mostly a Cisco-shop affair). It sends partial, bounded updates over its own transport (RTP, IP protocol 88, multicast 224.0.0.10) rather than periodic full tables. Hello 5 s / hold 15 s on most links (60/180 on low-speed multipoint).

**Metric:** composite of bandwidth and delay by default (K1=K3=1, K2=K4=K5=0): metric = 256 × (10⁷/min-bandwidth-kbps + cumulative-delay-in-tens-of-µs). Load and reliability CAN be included and almost never should be — they make the metric oscillate.

**DUAL's vocabulary is the whole protocol:**

- **Feasible Distance (FD)** — this router's best metric to the prefix.
- **Reported Distance (RD)** — the neighbor's own metric to the prefix, as advertised.
- **Successor** — the next hop on the best path.
- **Feasibility Condition** — a neighbor is a **feasible successor** iff its RD < this router's FD. Logic: if your distance to the destination is less than my whole best path, you cannot possibly be routing through me, so switching to you cannot loop.
- **Passive/Active** — a route with a live successor is passive. Lose the successor with a feasible successor standing by: promote it in milliseconds, stay passive. Lose it with no FS: go **active** and send queries to every neighbor asking for a path.

**Query scoping is the operational risk.** Queries propagate until answered; a router waiting on replies is stuck (historically "stuck in active," SIA, ~3 min then neighbor reset). Bound the query domain with summarization (a summary answers the query at the boundary) and **stub routers** (spokes that answer "no alternate path" immediately). An unbounded EIGRP domain with hundreds of routers is a query storm waiting for a flap.

Trade-off: fastest failover in the business when feasible successors exist and near-zero steady-state chatter; in exchange, loop-freedom depends on the FC, which can reject real loop-free paths (RD ≥ FD) — those simply aren't available as instant backups.

## OSPF

Link-state, RFC 2328 (v2/IPv4), RFC 5340 (v3/IPv6). Every router floods link-state advertisements; every router in an area holds an identical database (LSDB) and runs Dijkstra/SPF over it independently. IP protocol 89; AllSPFRouters 224.0.0.5, AllDRouters 224.0.0.6. Hello/dead: 10/40 s on broadcast and point-to-point, 30/120 on NBMA. Hello, dead interval, area ID, area type, subnet mask (on broadcast), and authentication must match or adjacency never forms.

**Neighbor state machine:** Down → (Attempt, NBMA only) → Init (hello seen) → 2-Way (my RID in your hello; DROther pairs stop here) → ExStart (master/slave and DBD sequence negotiation) → Exchange (DBD headers) → Loading (LSRs for missing LSAs) → Full. Diagnostic value: stuck in ExStart/Exchange is almost always an MTU mismatch; stuck in Init is one-way hello visibility (ACL, unidirectional link); stuck in 2-Way between the wrong pair means a DR election surprise.

**DR/BDR** (broadcast/NBMA segments only): reduces n² adjacencies to hub-and-spoke through the DR. Election: highest interface priority, tie → highest RID; priority 0 = never; **non-preemptive** — a better router joining later does not take over. That non-preemption surprises people constantly: DR identity is boot-order-dependent unless you set priorities deliberately.

**Areas:** all inter-area traffic transits area 0 (backbone). ABRs sit on the boundary, ASBRs inject external routes.

- **Standard** — everything floods in.
- **Stub** — blocks type 5 externals; ABR injects a default.
- **Totally stubby** (Cisco extension) — blocks externals and inter-area summaries; default only.
- **NSSA** — stub that still needs to inject its own externals: they enter as type 7, ABR translates to type 5.
- **Totally NSSA** — the two combined.

**LSA types worth knowing cold:** 1 Router (per-router, intra-area), 2 Network (DR-generated per multi-access segment), 3 Summary (ABR, inter-area prefixes), 4 ASBR-Summary (how to reach the ASBR), 5 AS-External, 7 NSSA-External. External metric types: E1 adds internal cost, E2 (default) doesn't — E2 ties break on internal cost anyway.

**Cost** = reference bandwidth / interface bandwidth, default reference 100 Mbps — which makes FastEthernet, gigabit, and 100 G all cost 1 unless you raise `auto-cost reference-bandwidth` **identically on every router**. A mismatched reference bandwidth is a slow-burning routing anomaly, not a syntax error.

SPF behavior: intra-area routes are computed; inter-area and external routes are distance-vector-style additions hanging off the ABR/ASBR — OSPF is only "link-state" inside an area. Modern implementations throttle SPF (initial delay/backoff, e.g. IOS-XE `timers throttle spf`) so a flapping link doesn't peg the CPU.

Trade-off: full-topology knowledge and fast, loop-free convergence, paid for in LSDB memory, SPF CPU, and design discipline (area planning, backbone continuity). OSPF punishes sloppy area design in ways EIGRP's flat deployments never made visible.

## IS-IS at working depth

Link-state like OSPF, but running directly over layer 2 (no IP transport — un-attackable via IP, and it carries any address family via TLVs, which is why IPv6 and SR extensions bolted on cleanly). Routers are Level 1 (intra-area), Level 2 (backbone), or L1/L2. The backbone is the contiguous set of L2-capable routers — not a numbered area — so the "everything transits area 0" rigidity doesn't exist. Addressing uses a NET (CLNS-derived, e.g. 49.0001.1921.6800.1001.00). AD 115 on Cisco.

When it beats OSPF: very large flat domains (its LSP/TLV encoding and less chatty flooding scale famously well — most large ISP cores run it), and anywhere protocol extensibility matters (new TLV vs. new OSPF LSA type). When it doesn't: enterprise familiarity — the talent pool that can troubleshoot IS-IS at 2 a.m. is thinner, and that is a legitimate design input.

## BGP — the path-vector case

BGP-4 (RFC 4271) runs over TCP 179 between explicitly configured peers — no discovery, no multicast. It is a policy engine that happens to route: the unit of loop prevention is the **AS_PATH** (an eBGP router rejects any route already carrying its own ASN).

**eBGP vs iBGP:** eBGP peers sit in different ASes (AD 20); iBGP carries external routes across your own AS (AD 200). The iBGP rule that shapes everything: **a route learned from one iBGP peer is not re-advertised to another iBGP peer** (AS_PATH can't prevent loops inside one AS). Consequence: full mesh among iBGP speakers — n(n−1)/2 sessions — or one of two escapes: **route reflectors** (RR re-advertises among clients, adding CLUSTER_LIST/ORIGINATOR_ID for loop protection; the RR's path choice becomes everyone's, a real loss of path diversity) or **confederations** (sub-ASes; rarer, heavier).

**Path selection** — attribute comparison in order, first difference wins. The widely cited order is Cisco's; the standard (RFC 4271 §9.1) omits WEIGHT entirely, and vendors diverge in the tie-breaker tail, so name the platform:

1. Highest WEIGHT (Cisco-only, local to the router)
2. Highest LOCAL_PREF (AS-wide, "which exit do we prefer outbound")
3. Locally originated
4. Shortest AS_PATH
5. Lowest ORIGIN (IGP < EGP < incomplete)
6. Lowest MED (compared, by default, only between routes from the same neighboring AS — "how do you prefer to enter me")
7. eBGP over iBGP
8. Lowest IGP metric to the next hop
9. Oldest eBGP route, then lowest RID, then lowest neighbor address

**Communities** are the policy interface: opaque 32-bit tags (RFC 1997; well-known: NO_EXPORT, NO_ADVERTISE) that customers and peers use to request treatment — prepend, regional scoping, blackholing (RTBH) — without the provider writing per-customer route-maps.

**When BGP belongs inside an enterprise:** multihoming to two ISPs with your own address space and ASN (the canonical case); as the datacenter underlay/overlay protocol (eBGP in spine-leaf, EVPN address family); when policy must be expressed per-prefix in ways IGP metrics can't say; at organizational seams (mergers, extranets) where you want an administrative boundary rather than a merged IGP. When it doesn't: a single-homed site defaulting to one ISP gains nothing from BGP but complexity.

Trade-off: unmatched policy control and scale (the global table is ~1M IPv4 routes), paid for in deliberately slow convergence (session-based, timer-damped, add-paths and BFD help but don't make it an IGP) and configuration surface where one bad route-map is a global incident.

## Redistribution and its failure modes

Redistribution injects routes from one protocol into another at a boundary router. It needs a **seed metric** because metrics don't translate (OSPF cost means nothing to EIGRP). Defaults vary by direction and platform — into EIGRP the default is unreachable (infinity) unless seeded; into OSPF, redistributed routes arrive as E2 with metric 20 (BGP redistributes at 1) on Cisco.

Failure modes, in the order they bite:

- **Routing feedback / domain re-entry:** two redistribution points, and protocol A's routes re-enter A via B with a better AD or metric. Result: suboptimal paths at best, loops at worst. Defense: tag routes at redistribution and deny your own tag on re-entry; filter prefixes explicitly.
- **AD inversion:** external EIGRP is 170 precisely so redistributed-back routes lose to native ones — but OSPF (110) redistributed into RIP and back can beat the original. Every mutual-redistribution design needs an AD table sketched before configuration.
- **Metric flattening:** everything redistributed gets the same seed metric, erasing internal path preference. Two-exit designs then load-share by accident or pin to one exit.
- **Missing-mask assumptions** (classful legacy) and lost route attributes (communities, tags) at the boundary.

Rule: one redistribution point is a design; two are a project with a filtering plan; ad-hoc mutual redistribution in three places is an outage schedule.

## Summarization

Summarization advertises one shorter prefix in place of many longer ones. Effects, all at once: smaller tables, suppressed downstream churn (a flapping /24 inside a stable /16 is invisible past the summary point — this is the convergence tool people forget), and query/LSA-flood scoping (EIGRP summaries answer queries; OSPF inter-area summaries live on the ABR — OSPFv2 can only summarize at ABRs/ASBRs, a real design constraint). Cost: precision. A summary attracts traffic for unallocated space inside it (send it to Null0 at the summarizing router to prevent loops with a default route), and it hides the failure of any component prefix. Summarizable addressing has to be planned at allocation time — see the topology-design reference — because retrofitting it onto scattered assignments is renumbering.

## Convergence comparison

Convergence = detect + propagate + recompute + install (FIB). Ranked for a typical single-link failure, best steady-state assumptions:

| Protocol | Typical order | What dominates |
|---|---|---|
| EIGRP w/ feasible successor | ms | Detection only; the backup is precomputed |
| OSPF / IS-IS (tuned, BFD) | tens–hundreds of ms | SPF throttle timers + flooding |
| OSPF / IS-IS (defaults) | ~1–5 s | Dead timer (40 s if no carrier loss!) + SPF delay |
| EIGRP active (no FS) | 100s of ms – s (SIA risk) | Query diameter |
| BGP | seconds–minutes | Hold timer (180 s default), MRAI, table size |
| RIP | tens of s – minutes | Hold-down + periodic timers |

Detection is the great equalizer: on any protocol, a failure without loss of carrier waits for dead/hold timers unless **BFD** (50 ms-class hello/detection, feeding all clients at once) is deployed. Tuning protocol hellos aggressively is the poor man's BFD and costs CPU; use BFD.

## First-hop redundancy and gateway design

Hosts hold one configured gateway IP; FHRPs make that IP survive a router failure by floating a virtual IP/MAC between routers.

- **HSRP** (Cisco, RFC 2281 informational): active/standby, virtual MAC 0000.0c07.acXX (v1), hellos to 224.0.0.2 UDP 1985 (v2: 224.0.0.102, adds IPv6 and wider group numbers). Priority default 100, highest wins; **preemption off by default** — a recovered former-active stays standby until you enable `preempt`, another boot-order trap.
- **VRRP** (RFC 5798, open standard): master/backup, 224.0.0.18, IP protocol 112, virtual MAC 0000.5e00.01XX. **Preempts by default** — the mirror image of HSRP's default, and the detail exam questions and change windows both hinge on. Can own the real interface address (owner priority 255).
- **GLBP** (Cisco): adds first-hop load balancing — one AVG answers ARP with up to four AVFs' virtual MACs round-robin, so hosts spread across gateways without per-VLAN active/standby gymnastics.

Design notes: track upstream interfaces/routes and decrement priority so the active gateway with a dead uplink actually fails over; align the FHRP active router with the STP root per VLAN, or first-hop traffic crosses the inter-switch link twice; on modern switch pairs, MLAG/stacking or an anycast gateway (EVPN environments) increasingly replaces classic FHRP — same problem, moved into the fabric.
