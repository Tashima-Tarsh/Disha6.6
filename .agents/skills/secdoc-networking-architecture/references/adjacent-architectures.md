# Adjacent Architectures

## Zero trust networking (NIST SP 800-207 grounding)

Core tenets to apply, paraphrased: all resources are resources regardless of location; all communication is secured regardless of network position; access is per-session; policy is dynamic (identity + device posture + behavioral/environmental attributes); integrity and posture are monitored; authentication and authorization are strictly enforced before access; telemetry feeds continuous improvement.

Architecture roles: **Policy Engine** (decision), **Policy Administrator** (session establishment), **Policy Enforcement Point** (data path). Map any vendor claim to these roles — if a product can't articulate which role it plays, that's a red flag.

The three 800-207 deployment approaches:
1. **Enhanced identity governance** — identity-centric, network position nearly irrelevant. Fits SaaS-heavy organizations.
2. **Microsegmentation** — gateway/host-based segmentation of workloads. Fits data-center/IaaS-heavy estates.
3. **Network infrastructure + SDP (software-defined perimeter)** — overlay-based, where ZTNA lives.

Most real programs blend all three. Zero trust is a multi-year operating-model shift; anyone selling it as a SKU is selling one enforcement point.

## Segmentation and microsegmentation

- **Macro-segmentation** — zones via VLANs/VRFs/firewalls: user zone, server zone, PCI CDE, OT/ICS, guest, IoT. Table stakes; PCI DSS scope reduction is the classic business driver (segmentation controls must be penetration-tested per PCI DSS 4.x — annually, or every six months for service providers).
- **Microsegmentation** — workload-level east-west policy, enforced by host agents (identity/process-aware), hypervisor/NSX-style constructs, cloud-native security groups, or Kubernetes network policies/service mesh (mTLS via sidecar or ambient).
- Practical sequencing: visibility first (flow mapping — you cannot write policy for flows you can't see), then alert-only policy, then enforce on crown-jewel applications, then expand. Big-bang microsegmentation projects fail; application-by-application ones succeed.
- East-west visibility remains necessary even with mature ZTNA — ZTNA governs user→app; microsegmentation governs app→app.

## Cloud networking

**Within one cloud:**
- Hub-and-spoke via **transit gateway** (AWS TGW, Azure vWAN/Virtual Network Manager, GCP Network Connectivity Center) is the default at >~10 VPCs/VNets. Full-mesh peering doesn't scale; TGW-style hubs centralize routing, inspection insertion, and hybrid attachment.
- Centralized inspection VPC/VNet with cloud-native or NVA firewalls; weigh the throughput cost and single-point-of-failure design carefully.

**Hybrid connectivity:**
- **Dedicated interconnects** (AWS Direct Connect, Azure ExpressRoute, GCP Cloud Interconnect/Partner Interconnect) for deterministic latency, high throughput, and egress-cost reduction; site-to-site VPN as backup or low-volume primary. Resilience patterns matter: dual circuits, separate locations, tested failover — a single interconnect is a scheduled outage.
- **Cloud WAN services** (AWS Cloud WAN, Azure vWAN) and **multicloud NaaS providers** (e.g., Megaport, Equinix Fabric, Aviatrix as a software layer) address multi-region and multi-cloud backbones. Verify current offerings — this segment moves fast.

**Multi-cloud:** avoid cloud-to-cloud traffic where possible (egress economics and latency); when required, use a NaaS/colo fabric or a consistent overlay rather than internet-riding IPsec at scale. Keep a consistent segmentation and policy model across clouds — inconsistency, not any single cloud's design, is the usual audit finding.

## Edge computing implications

- Latency-sensitive workloads (retail computer vision, factory OT analytics, AR) push compute to branch/metro edge; the WAN design must then treat the branch as a mini data center: local survivability (what still works when the WAN is down), local segmentation, and data-gravity-aware backhaul.
- 5G/MEC and LEO satellite expand where "edge" can exist; SD-WAN with wireless WAN underlays is the connective tissue.
- OT/ICS edge: Purdue-model-aware segmentation, unidirectional gateways where warranted, and the recognition that OT change windows and device lifespans (15–20 years) dominate design choices. IT-style patching assumptions do not transfer.

## How these interlock (the mental model to convey)

- SD-WAN connects **sites** to everything.
- SSE secures **users and their traffic** to web/SaaS/private apps.
- ZTNA replaces **network-level remote access** with app-level access.
- Microsegmentation constrains **workload-to-workload** movement.
- Cloud transit architecture connects and inspects **VPC/VNet-to-anything**.
- Zero trust (800-207) is the **policy philosophy** spanning all of the above; identity and device posture are the shared control inputs.

A complete modern architecture answer usually names which of these six layers the question sits in, and which adjacent layers the decision will touch.
