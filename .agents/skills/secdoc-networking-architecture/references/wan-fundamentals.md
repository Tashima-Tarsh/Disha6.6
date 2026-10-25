# WAN Fundamentals and Evolution

## Transport options and where each fits

| Transport | Strengths | Weaknesses | Still choose it when |
|---|---|---|---|
| MPLS (L3VPN) | Deterministic latency/jitter, carrier SLAs, QoS end-to-end, inherent traffic separation | Cost (typically 3–10x DIA per Mbps), slow provisioning (30–120 days), poor cloud on-ramp, carrier lock-in | Voice/video-critical sites, trading floors, regions with unreliable internet, contractual SLA requirements |
| DIA (Dedicated Internet Access) | Symmetric bandwidth, SLA-backed, fast cloud access | No inherent QoS beyond your edge, DDoS exposure | Primary transport for SD-WAN at medium/large sites |
| Broadband (cable/fiber/DSL) | Cheapest per Mbps, fast provisioning | Asymmetric, best-effort, consumer-grade support | Secondary/tertiary SD-WAN path, small branches, backup |
| LTE/5G | Rapid deployment, path diversity (different physical infrastructure), day-1 connectivity | Data caps, variable latency, carrier congestion | Backup path, temporary sites, retail/kiosk, out-of-band management |
| Satellite (LEO) | Reaches anywhere, improving latency (LEO ~25–60ms vs GEO ~600ms) | Weather sensitivity, capacity contention | Remote/maritime/rural sites where terrestrial fails |

## Legacy WAN patterns you will encounter in brownfield work

- **Hub-and-spoke MPLS with centralized internet breakout** — all branch traffic hairpins through the data center for security inspection. The pattern SD-WAN and SASE exist to dismantle: it made sense when applications lived in the data center; it adds latency and backhaul cost now that they live in SaaS/IaaS.
- **DMVPN (Dynamic Multipoint VPN)** — Cisco's mGRE + NHRP + IPsec overlay. Phase 1 (hub-and-spoke), Phase 2/3 (spoke-to-spoke with NHRP redirect). Effectively a precursor to SD-WAN overlays; organizations running DMVPN are prime SD-WAN migration candidates because they already operate an overlay mindset.
- **Dual-MPLS active/passive** — expensive resilience. The usual first SD-WAN win is converting this to MPLS + DIA active/active, then MPLS retirement where SLAs allow.
- **IPsec site-to-site meshes** — manageable to ~20 sites, then key management, routing complexity, and change control collapse. Scale pain here is an SD-WAN trigger.

## SD-WAN mechanics (what actually differentiates it)

Per MEF 70/70.1, an SD-WAN service delivers application-aware, policy-driven forwarding over multiple underlay transports via an encrypted overlay, with centralized orchestration. In practice the differentiating capabilities are:

1. **Transport abstraction** — the overlay treats MPLS, DIA, broadband, LTE as an aggregate pool; policy, not routing protocol, picks the path.
2. **Application-aware routing** — per-application SLA policies (e.g., voice requires <150ms/<30ms jitter/<1% loss) with automatic path failover measured by continuous probes (BFD or proprietary).
3. **Forward error correction and packet duplication** — usable voice over two lossy broadband links; this is the capability that makes MPLS retirement credible.
4. **Local internet breakout with policy** — direct SaaS access from the branch, selectively, per application — the piece that pairs with SSE.
5. **Zero-touch provisioning** — device calls home, pulls config from orchestrator; branch turn-up without a network engineer on-site.
6. **Centralized orchestration/telemetry** — single point of policy and visibility across hundreds of sites.

Representative vendors (categories, not endorsements): Cisco (Catalyst SD-WAN, née Viptela), Fortinet Secure SD-WAN, VMware/Broadcom VeloCloud, Palo Alto Prisma SD-WAN (née CloudGenix), Versa, HPE Aruba EdgeConnect (née Silver Peak), Cato (SD-WAN as part of cloud-native SASE). Verify current ownership — this list churns.

## Migration path: legacy WAN → SD-WAN

Typical sequencing that works in practice:

1. **Baseline** — application inventory, per-site traffic profiles, current circuit contracts and termination dates (contract cycles often dictate the real timeline).
2. **Pilot** — 3–5 sites spanning the site archetypes (large branch, small branch, international), running overlay over existing MPLS + added DIA. No transport removal yet.
3. **Coexistence phase** — SD-WAN edge deployed broadly; MPLS retained as one underlay. Validate voice/video quality on internet paths using the vendor's remediation features before touching MPLS contracts.
4. **Transport rationalization** — MPLS dropped or downsized site-by-site as contracts lapse and internet-path performance is proven. Keep MPLS where measurement (not sentiment) says internet paths can't meet SLA.
5. **Security integration** — local breakout expands, which creates the distributed-security problem SSE solves. This is where the SD-WAN project becomes a SASE conversation (see `sase-sse.md`).

Common failure modes: treating it as a router refresh rather than an operating-model change; skipping the application baseline; retiring MPLS on cost alone before validating real-time app performance; enabling local breakout without a security answer.
