# Topology and Network Design

Contents: physical vs logical topology · classic forms and where they survive · collision/broadcast domains and switching · spanning tree and link aggregation · hierarchy models (three-tier, collapsed core, spine-leaf) · campus vs datacenter pressures · redundancy and failure domains · oversubscription · VLAN and addressing-plan design · QoS at design level · the documentation standard.

## Physical versus logical topology

Physical topology is where the cables go; logical topology is how frames flow. They diverge constantly and the divergence is the analysis: classic hub-based Ethernet was a physical star and a logical bus (one collision domain); a switched VLAN is a physical star and a logical broadcast domain shaped by trunking; an MPLS or VXLAN overlay is a logical full mesh over whatever physical path the underlay chose. Troubleshoot the logical topology; repair the physical one.

## The classic forms — and where each still genuinely appears

- **Star**: everything homes to a central node. The default for access layers everywhere. Trade-off: the center is the failure domain and the capacity ceiling.
- **Full mesh**: every node to every node — n(n−1)/2 links, which is why it survives only where n is small and the stakes are high: WAN cores between a handful of sites, iBGP full mesh (logical), firewall HA pairs.
- **Partial mesh**: redundancy where it pays, spokes where it doesn't. Most real WANs and every hub-and-spoke overlay (DMVPN) are this.
- **Ring**: each node to two neighbors. Alive in metro/carrier Ethernet (G.8032 ERPS), SONET/DWDM transport, and industrial networks (rings tolerate a single cut with deterministic failover). Trade-off: two cuts partition it, and add-node operations touch the ring.
- **Bus**: shared medium. Extinct in LANs; conceptually alive in PONs and some industrial fieldbus/vehicle networks (CAN).
- **Hybrid**: what every real network is — stars hanging off a partial-mesh core. Name the sub-topologies when analyzing failure behavior; "hybrid" alone analyzes nothing.

## Collision domains, broadcast domains, and the switching behaviors that define them

A **collision domain** is the scope within which two simultaneous transmissions interfere (CSMA/CD's problem). A hub extends one collision domain across all ports. A **switch terminates a collision domain per port**; with full-duplex links, collisions cease to exist — CSMA/CD is off, and any collision/late-collision counters on a full-duplex port indicate a duplex mismatch, not "normal Ethernet."

A **broadcast domain** is the scope a broadcast frame reaches. Switches flood broadcasts (and unknown unicasts, and unregistered multicasts) out every port in the VLAN — so a VLAN *is* a broadcast domain, and a **router (or L3 boundary) terminates it**. Switch behaviors that define the domain: learn source MACs into the CAM table, forward known unicasts out the learned port, flood the unknown. CAM exhaustion turns a switch into a hub (fail-to-flood) — the mechanism behind MAC-flooding attacks and the reason port security exists.

Sizing guidance that survives contact with reality: broadcast domains are bounded by broadcast/flooding background load and failure blast radius, not by an exact host count — but a /23 (~500 hosts) is a defensible ceiling for general campus VLANs, and "one giant flat /16" is a design smell regardless of what the switches can technically do.

## Spanning tree and link aggregation

Redundant L2 links create forwarding loops, and Ethernet frames carry no TTL — a loop doesn't degrade, it melts (broadcast storms, CAM thrash). STP buys loop-freedom by disabling redundancy: it elects a **root bridge** (lowest bridge ID = priority, default 32768 + VLAN, then lowest MAC — meaning an unconfigured network elects its oldest switch as root; **set root priority deliberately, always**), computes least-cost paths to the root, and blocks everything else. Port roles: root port (best path to root, one per non-root switch), designated port (one per segment), the rest block.

- **802.1D classic**: timers — hello 2 s, max age 20 s, forward delay 15 s; a port walks blocking → listening → learning → forwarding, so convergence is 30–50 s. Historical baseline, still the fallback behavior.
- **802.1w RSTP**: replaces timers with a proposal/agreement handshake on point-to-point links — sub-second convergence; adds alternate/backup roles (precomputed failover) and **edge ports** (PortFast: host ports skip the state walk; a BPDU arriving on one reveals mis-cabling).
- **802.1s MSTP**: maps many VLANs onto few spanning-tree instances (against Cisco's per-VLAN RPVST+, one instance per VLAN) — the scaling answer when VLAN count × BPDU processing matters; costs configuration-region discipline (name/revision/mapping must match exactly).

**Failure modes to design against:** unidirectional links (BPDUs lost one way → a blocked port unblocks → loop; UDLD and 802.3ah OAM exist for this), rogue/superior BPDUs moving the root (root guard), hosts or unmanaged switches injecting BPDUs (BPDU guard on all edge ports — non-negotiable in a defensible design), and asymmetric root/FHRP placement dragging traffic across the inter-switch link (align STP root and FHRP active per VLAN).

**Link aggregation (802.3ad/802.1AX, LACP)** bundles parallel links into one logical link — STP sees one interface, so the redundancy isn't blocked, and bandwidth adds. The honest caveats: load distribution is per-flow hash (src/dst MAC/IP/port), so one elephant flow uses one member link — aggregate ≠ faster single flow; and both ends must agree (LACP active/passive; static "on" bundles fail silently when miswired). **MLAG/vPC** extends aggregation across two switches, removing STP blocking from the access layer entirely at the cost of a control-plane dependency between the pair — which is exactly the trade spine-leaf later removes by abolishing L2 redundancy altogether.

## Hierarchy: three-tier, collapsed core, spine-leaf

**Three-tier (access / distribution / core):** access terminates hosts and enforces port-level policy; distribution aggregates access, holds the L2/L3 boundary (historically), applies policy and summarization; core forwards fast and does nothing else — no policy in the core, because policy in the core makes every change a core change. Choose it when: large campus, many wiring closets, geography that makes aggregation layers physically natural. Trade-off: cost and hop count; three tiers of hardware and licenses for traffic that's mostly north-south.

**Collapsed core**: distribution and core merge into one (redundant pair) layer. The honest criterion is size: when one switch pair can carry the aggregate load and port count, a separate core adds boxes, not value. Most networks under a few thousand users belong here, and pretending otherwise sells hardware. Trade-off: the pair is a shared failure domain and an upgrade chokepoint; growth past its capacity forces a disruptive re-tiering.

**Spine-leaf (Clos):** every leaf connects to every spine; spines never connect to each other, leaves never to each other; every leaf-to-leaf path is exactly two hops via ECMP (routed underlay, commonly eBGP or OSPF, with VXLAN/EVPN overlay where L2 adjacency or multitenancy is required). Choose it when traffic is **east-west dominant** (server-to-server, storage, VM mobility) and when predictable latency and horizontal scale matter: capacity grows by adding spines, ports by adding leaves, with no redesign. Trade-offs stated plainly: it spends ports and optics on fabric links (the price of non-blocking behavior), assumes L3 discipline and automation maturity (dozens of routed devices configured identically or not at all), and is the wrong answer for a north-south campus where users talk to a datacenter, not each other.

**The honest selection criteria** are traffic direction (north-south → hierarchy; east-west → Clos), scale trajectory (Clos scales horizontally; tiers scale by forklift), and operational model (Clos without automation is a typo-distribution system).

## Campus versus datacenter design pressures

Campus: humans and their devices — dominant flows are north-south to services; ports are cheap and numerous; the design pressures are user mobility (wireless as primary access), endpoint policy (802.1X/NAC at the port), PoE budgets, and broadcast-domain hygiene. Oversubscription is high and correct — users are idle most of the time.

Datacenter: workloads — dominant flows are east-west; the pressures are latency consistency, non-blocking bandwidth, workload mobility (which drives overlay L2), storage traffic that tolerates neither loss nor jitter (lossless classes, PFC/ECN where RoCE lives), and automation as a first-class requirement. Oversubscription is low and calculated. The two environments share protocols and share nothing else; importing campus assumptions into a datacenter (or billing a campus for datacenter-grade non-blocking fabric) is the classic mis-design in both directions.

## Redundancy and failure-domain thinking

Redundancy is only real when the failure domains are actually disjoint: dual switches on one power circuit, dual links in one conduit, dual supervisors in one chassis, and dual anything in one configuration file all fail together. Design method: enumerate what fails (link, line card, node, power, room, site, *config change* — the most common outage cause on most networks), and for each, name the blast radius and the recovery mechanism (ECMP reroute, FHRP failover, STP reconvergence, human). N+1 vs 2N is a cost statement: N+1 survives one failure at degraded capacity; 2N survives one at full capacity and doubles the bill. And bound the domains deliberately: summarization bounds routing churn, VLANs bound broadcast, L3 access bounds STP, sites bound everything — a design where any single failure is visible everywhere has no failure domains, only a failure.

## Oversubscription ratios

Oversubscription = offered downstream capacity ÷ upstream capacity, computed per boundary. Working figures: campus access→distribution 20:1 is the traditional ceiling (48×1G access with 2×10G uplinks ≈ 2.4:1 — modern gear makes the classic ratios easy to beat); distribution→core 4:1; datacenter leaf→spine 3:1 typical general-purpose, approaching 1:1 (non-blocking) for storage/AI fabrics — where the fabric bill is justified by workloads that measurably saturate it. The ratio is a claim about traffic concurrency; state it in the design doc with its assumption ("20:1 assumes office-productivity load") so the next engineer knows what invalidates it (a VDI rollout does).

## VLAN and addressing-plan design

VLAN plan: segment by function/security zone (users, voice, printers, servers, management, guest) rather than by floor for its own sake; keep VLANs site-local (a VLAN spanning sites is an outage spanning sites); number with a legend (e.g., 1xx user, 2xx voice, 9xx infrastructure) and reserve ranges; never use VLAN 1 for anything deliberate, and prune trunks to the VLANs actually needed.

Addressing plan: allocate hierarchically so summarization is possible *by construction* — per-site aggregates (say, a /16 per site from 10.0.0.0/8, sites numbered in the second octet), function-aligned blocks inside each site, and VLSM applied so each subnet fits its population with **growth headroom** (size for the 5-year count, then round up one bit; a /30 or /31 per point-to-point link; loopbacks from one dedicated aggregate per site so management ACLs summarize too). Rules that prevent the classic messes: no overlapping RFC 1918 reuse between sites that will ever merge or VPN (mergers make this a certainty, plan as if); document every allocation including the reserved space; IPv6 in the same hierarchy (per-site /48s, /64 per subnet — no VLSM agonizing, the design effort moves entirely into the aggregation hierarchy). The test of an addressing plan is the routing table it produces: one summary per site plus locals, or the plan failed.

## QoS at design level

QoS is unnecessary until the instant it isn't — it exists for congestion moments, and configuring it during an outage is too late. Design-level treatment: **classify and mark at the trusted edge** (access port or ingress boundary; DSCP — EF for voice, AF41 for interactive video, CS6 for network control, a scavenger class below best-effort for the traffic you'd sacrifice first), **trust markings only from infrastructure**, and **queue where congestion actually occurs**: WAN egress above all (the 1G-LAN-into-100M-circuit boundary is where QoS earns its existence), uplink oversubscription points, and any speed mismatch. Voice gets a priority queue with a policer (unbounded priority queues let one class starve the box); everything else gets bandwidth-share queues; WRED where TCP-dominant queues need early drop. What matters at design time is the *policy* — a 4- or 8-class model documented once and applied identically everywhere — not per-box artistry; and the honest scoping note: inside a non-blocking datacenter fabric QoS mostly reduces to protecting storage/RoCE classes, while on the WAN it's load-bearing daily.

## The design-documentation standard

A design is not done until it is diagrammable and survivable by the next engineer:

- **Diagrams**: physical (devices, links, port assignments) and logical (L3 topology, VLANs, routing protocol boundaries, summarization points) as *separate* drawings — one diagram trying to be both is neither.
- **The addressing plan as a table**: every allocation, every reservation, the summarization scheme, and the growth rule, in a format that can be diffed — not in a drawing.
- **The decision record**: each major choice (hierarchy model, routing protocol, STP flavor, oversubscription ratios, QoS class model) with its trade-off and the assumption that would invalidate it.
- **The failure ledger**: enumerated failure modes with expected behavior and recovery mechanism — the section that turns a diagram into a design.

The test is transfer: if the next engineer can extend the addressing plan without asking anyone, add a site without violating the summarization scheme, and predict failover behavior from the documents alone, the design is done. If any of those requires oral tradition, it isn't.
