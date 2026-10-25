# SASE and SSE

## Definitions and how they relate

- **SASE (Secure Access Service Edge)** — Gartner's 2019 term for the convergence of WAN edge networking (SD-WAN) and cloud-delivered security into a single, ideally cloud-native, service. Full SASE = networking + security.
- **SSE (Security Service Edge)** — Gartner's 2021 subset: the security half only (SWG + CASB + ZTNA at minimum, commonly FWaaS, DLP, RBI). SSE exists because most buyers were adopting the security stack on a different timeline — and often from a different vendor — than their SD-WAN.
- Relationship in one line: **SASE = SD-WAN + SSE.** An organization can be "doing SASE" via one vendor or via an SD-WAN vendor paired with an SSE vendor.

## The SSE component stack

| Component | What it does | Replaces / augments | Watch for |
|---|---|---|---|
| **SWG** (Secure Web Gateway) | Inline web traffic inspection: URL filtering, malware scanning, TLS inspection | On-prem proxy appliances (legacy Blue Coat–style) | TLS 1.3/ECH inspection gaps; certificate pinning breakage; privacy/works-council constraints on decryption in some jurisdictions |
| **CASB** (Cloud Access Security Broker) | Visibility and control over SaaS: sanctioned-app policy, shadow IT discovery, API-mode scanning of data at rest in SaaS | Nothing directly — new control layer | Inline vs API mode are different capabilities; API mode coverage varies enormously by SaaS app |
| **ZTNA** (Zero Trust Network Access) | Per-application, identity- and posture-based access brokering; user never lands "on the network" | Remote-access VPN | Legacy protocols (VoIP, server-initiated flows, thick clients) often need "universal ZTNA"/tunnel fallback; agentless mode limits inspection |
| **FWaaS** (Firewall as a Service) | L3–L7 firewalling delivered from the provider's PoPs, including non-web ports/protocols | Branch NGFW appliances (partially) | Egress IP management for allowlist-dependent apps; performance for non-web protocols |
| **DLP** | Content inspection for data exfiltration across web, SaaS, email channels | Standalone DLP suites (partially) | Unified policy across inline + API channels is the differentiator; classification accuracy still requires tuning |
| **RBI** (Remote Browser Isolation) | Renders risky web content in a disposable cloud browser, streams pixels/DOM | Nothing — risk-reduction layer for uncategorized/risky sites | User experience cost; usually applied selectively, not universally |

## Architecture: how SSE is actually delivered

- Traffic reaches the provider via **forwarding methods**: endpoint agent (dominant for managed devices), IPsec/GRE tunnels from sites (SD-WAN integration point), proxy PAC/explicit proxy, or clientless reverse proxy (for BYOD to sanctioned SaaS).
- The provider operates a global **PoP (point of presence) network**. PoP density and peering quality directly determine user experience — this, not feature checklists, is where SSE vendors genuinely differ. Ask: number of full-compute PoPs (not just front doors), peering with Microsoft/Google/AWS, and where TLS inspection actually happens relative to the user.
- **Single-pass inspection** — mature platforms decrypt once and apply SWG/CASB/DLP/ATP engines in one pass. Bolt-on architectures chain services and stack latency; this is a fair technical evaluation question.

## Single-vendor vs multi-vendor SASE

**Single-vendor** (one platform for SD-WAN + SSE — e.g., Cato natively; Fortinet, Palo Alto, Cisco, Netskope, Zscaler in varying degrees of integration; verify current state):
- Pros: one policy model, one agent, one support throat to choke, tighter telemetry correlation.
- Cons: best-of-breed compromise in one half, deeper lock-in, migration timing forced to align.

**Multi-vendor** (SD-WAN vendor A + SSE vendor B, stitched via IPsec/GRE service chaining):
- Pros: independent best-of-breed selection, independent refresh cycles, preserves existing SD-WAN investment.
- Cons: two policy planes, tunnel capacity limits per PoP, split troubleshooting, integration is your problem.

Decision heuristic: organizations mid-lifecycle on a satisfactory SD-WAN should adopt SSE separately (multi-vendor); greenfield or simultaneous-refresh organizations should weigh single-vendor seriously. Team structure matters — if network and security are separate organizations with separate budgets, multi-vendor often reflects reality; forcing convergence on the org chart via a product purchase usually fails.

## VPN → ZTNA migration (the most common SSE entry point)

1. Inventory private applications (expect the inventory to be wrong; ZTNA discovery modes help find what VPN was actually carrying).
2. Deploy app connectors in data centers/VPCs; publish a low-risk app cohort to a pilot group.
3. Run VPN and ZTNA in parallel; move app cohorts progressively. Legacy/awkward protocols move last or stay on a shrunken VPN/universal-ZTNA tunnel.
4. Decommission or drastically shrink VPN concentrators; the remaining attack surface reduction (no listening VPN service, no lateral movement post-auth) is the headline security win — CISA/NSA guidance repeatedly cites internet-exposed VPN appliances as a top initial-access vector.

## Standards and framework anchors

- **NIST SP 800-207** — ZTNA maps to the PEP; the SSE policy cloud maps to PE/PA. Use 800-207 language to cut through vendor zero-trust claims.
- **Gartner SASE/SSE Magic Quadrants and Strategic Roadmap** — category definitions; verify the current year's composition before citing specifics.
- **MEF 117** — SASE service attribute standardization (less adopted than MEF 70 for SD-WAN, but exists).
- For regulated buyers: check FedRAMP authorization of the specific SSE service, data-residency options per PoP region, and whether TLS inspection locations satisfy GDPR/works-council requirements.
