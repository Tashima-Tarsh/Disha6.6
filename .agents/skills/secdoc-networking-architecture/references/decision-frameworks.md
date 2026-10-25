# Decision Frameworks

## Qualifying questions an architect asks before recommending anything

**Environment:**
1. How many sites, of what archetypes (HQ, large branch, micro-branch, retail, manufacturing/OT, international)? How many remote users vs office users?
2. Where do applications live — % data center, % IaaS, % SaaS — and what's the 3-year direction?
3. What transport exists today, and when do the circuit contracts expire? (Contract dates set the real migration clock.)
4. What real-time application requirements exist (voice, video, trading, telemetry) and what are their measured SLA needs?

**Organization:**
5. Are network and security separate teams/budgets? Who would own a converged platform?
6. What's the operational maturity — can the team run a policy-driven platform, or is it CLI-per-box today?
7. What's the compliance regime (PCI, HIPAA, FedRAMP, GDPR/works councils, SOX-relevant systems)?

**Current pain:**
8. What triggered this conversation — cost, an outage, an audit finding, a VPN compromise, M&A, cloud migration, contract renewal? (The trigger usually reveals the first project.)
9. What's the appetite: transformation program or targeted fix?

## Architecture selection heuristics

| Situation | Default recommendation | Reasoning |
|---|---|---|
| MPLS renewal approaching, SaaS-heavy traffic | SD-WAN with internet-first transport; retain MPLS only at measured-need sites | Cost + cloud on-ramp; renewal is the forcing function |
| VPN concentrator EOL, or VPN-related incident | ZTNA as the entry SSE project | Highest security ROI; removes a top initial-access vector |
| Branch NGFW refresh cycle | Evaluate FWaaS/SSE before buying appliances | Refresh cycles are the cheapest moment to change architecture |
| Already satisfied with SD-WAN, need security modernization | SSE from a security-led vendor (multi-vendor SASE) | Don't churn a working SD-WAN to get security |
| Greenfield, or simultaneous WAN + security refresh | Single-vendor SASE shortlist alongside best-of-breed pairing | Genuine convergence opportunity; compare honestly |
| Heavy M&A activity | SD-WAN overlay + ZTNA for day-1 connectivity | Overlays absorb acquired networks faster than re-IP projects |
| Audit finding on flat network / PCI scope | Macro-segmentation first, microsegmentation on crown jewels | Scope reduction is measurable and fundable |
| >10 VPCs/VNets, growing | Transit-gateway hub-and-spoke with centralized inspection | Peering meshes and ad hoc inspection don't scale |
| Latency-critical branch workloads (CV, OT analytics) | Edge compute + local survivability design | The WAN can't fix physics; move the workload |

## Trade-off ledger (make these explicit in recommendations)

- **Single-vendor SASE**: operational simplicity ↔ lock-in and compromise on one half. Exit costs are high once policy is deeply encoded.
- **Internet-first WAN**: cost and agility ↔ loss of end-to-end QoS; mitigated (not eliminated) by FEC/duplication and dual paths.
- **TLS inspection everywhere**: visibility ↔ privacy/legal constraints, app breakage, latency. Selective decryption with documented exceptions is the sustainable position.
- **FWaaS replacing branch firewalls**: fewer boxes ↔ dependence on tunnel capacity, provider PoPs, and egress-IP behavior. Local OT/IoT segmentation still needs on-prem enforcement.
- **Microsegmentation depth**: attack-surface reduction ↔ operational drag per policy; enforce where crown jewels justify the maintenance burden.
- **Cloud interconnects vs VPN**: performance and egress economics ↔ cost, lead time, and the obligation to engineer real redundancy.

## Migration sequencing template

A defensible transformation order for a typical established organization (adjust to triggers and contract dates):

1. **Months 0–3**: application/traffic baseline; circuit contract inventory; identity hygiene check (MFA coverage, device posture capability) — identity readiness gates everything zero-trust-shaped.
2. **Months 3–9**: SD-WAN pilot → coexistence rollout over existing transport; ZTNA pilot for one app cohort in parallel (different teams, minimal dependency).
3. **Months 9–18**: local internet breakout expansion paired with SWG/CASB enforcement; VPN cohort migration continues; MPLS rationalization begins as contracts allow.
4. **Months 18–36**: FWaaS/branch-appliance consolidation on refresh cycles; microsegmentation on crown-jewel apps; cloud transit/inspection architecture standardized; DLP policy unification across inline + API channels.

Rules embedded in the sequence: never remove a transport before measuring the replacement; never expand local breakout ahead of the security answer; pair every decommissioning with a contract date; run parallel workstreams only where team boundaries make them genuinely independent.

## Cost model shape (relative, not absolute — prices date fast)

- MPLS per-Mbps typically 3–10x DIA; DIA typically 2–5x broadband. LEO satellite pricing is volatile — verify.
- SASE/SSE is per-user or per-site subscription; model it against the *fully loaded* current state (appliance refresh + support contracts + backhaul bandwidth + operational hours), not just license-vs-license.
- The commonly missed line items: TLS inspection's compute implications, cloud egress charges under new traffic patterns, professional services for migration, and parallel-running costs during coexistence (budget 6–18 months of paying for both).

## Red flags in designs under review

- Local internet breakout enabled with no inspection story.
- "Zero trust" claimed while a flat network and standing VPN access persist.
- MPLS retirement scheduled on cost alone with no per-site path-quality data.
- ZTNA deployed but legacy VPN retained at full scope indefinitely ("temporary" parallel running with no cohort plan).
- Segmentation drawn on a diagram with no flow data behind it, or PCI segmentation never penetration-tested.
- Single interconnect/single tunnel anywhere labeled "redundant."
- A converged platform purchase intended to force two feuding teams to merge.
