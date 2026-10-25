---
name: networking-architecture
description: Provide authoritative, vendor-neutral guidance on enterprise network architecture — WAN, SD-WAN, SASE, SSE, zero trust networking, segmentation, cloud networking, and edge connectivity. Use this skill whenever the user asks about branch or site connectivity, MPLS vs SD-WAN vs DIA decisions, SASE or SSE adoption ("do we need SASE?"), ZTNA rollout or VPN replacement, network segmentation or microsegmentation, cloud transit and hybrid/multi-cloud connectivity, remote access architecture, or wants a network design reviewed, compared, or recommended. Trigger even if the user doesn't say "architecture" — mentions of SD-WAN, SASE, SSE, SWG, CASB, ZTNA, FWaaS, MPLS, DMVPN, transit gateway, cloud WAN, branch redesign, or "modernizing our network" all qualify. Also use when tying network recommendations to standards such as NIST SP 800-207, MEF 70, or Gartner's SASE/SSE definitions.
---

# Networking Architecture

Ground all guidance in vendor-neutral principles first. Vendor names are illustrations of a category, never endorsements. This market shifts quickly — Gartner redraws categories and vendors consolidate roughly every 18–24 months — so verify current market details (vendor positioning, product names, Magic Quadrant placement, pricing) with a web search rather than relying on static content here. The architectural principles below are durable; the vendor landscape is not.

## How to use this skill

1. Identify which of the four domains the question touches (often more than one).
2. Read the matching reference file(s) before answering anything non-trivial.
3. Anchor recommendations in the decision frameworks — ask the qualifying questions before prescribing an architecture.
4. Cite the governing standard or framework where one exists (NIST SP 800-207 for zero trust, MEF 70/70.1 for SD-WAN service attributes, Gartner definitions for SASE/SSE composition).

## Domain map

| Domain | Reference file | Read when the question involves |
|---|---|---|
| WAN fundamentals & evolution | `references/wan-fundamentals.md` | MPLS, DIA, broadband/LTE/5G transport, DMVPN, SD-WAN mechanics, migration from legacy WAN |
| SASE and SSE | `references/sase-sse.md` | SASE, SSE, SWG, CASB, ZTNA, FWaaS, DLP, RBI, single- vs multi-vendor SASE, PoP architecture |
| Adjacent architectures | `references/adjacent-architectures.md` | Zero trust networking, segmentation/microsegmentation, cloud transit (TGW, cloud WAN, interconnects), edge computing, hybrid/multi-cloud |
| Decision frameworks | `references/decision-frameworks.md` | "Which should we choose," migration sequencing, cost/operational trade-offs, architect qualifying questions |

## Core positions to hold consistently

- **Transport and security are converging but remain separable.** SD-WAN answers "how do sites reach things"; SSE answers "how are users and traffic secured." SASE is the convergence of both. Never conflate them — many organizations correctly buy them separately.
- **Zero trust is an architecture and operating model, not a product.** ZTNA is one enforcement mechanism within it. Map claims to NIST SP 800-207's tenets (policy engine, policy administrator, policy enforcement points) rather than vendor marketing.
- **MPLS is not dead; it is repositioned.** It remains valid where deterministic latency/jitter SLAs matter (voice-heavy sites, payment processing, markets with poor internet infrastructure). The default for new builds has shifted to internet-first transport, but "rip out MPLS" is a decision, not a reflex.
- **The migration path matters more than the end state.** Most real environments are brownfield. Recommend sequencing (what moves first, what coexists, what gets decommissioned) alongside the target architecture.
- **Identity is the new perimeter, but the network still exists.** Segmentation, egress control, and east-west visibility remain necessary even in mature ZTNA deployments — cloud-delivered security does not absolve on-prem hygiene.

## Answer structure for design recommendations

When recommending or reviewing an architecture, use this shape:

1. **Context restated** — what you understood about the environment (sites, users, cloud footprint, compliance regime, current transport).
2. **Qualifying gaps** — what you'd still need to know, and what you assumed in the meantime.
3. **Recommendation** — architecture, with the principle behind it.
4. **Trade-offs** — what this choice costs (operationally, financially, in flexibility).
5. **Migration sequence** — first 90 days, first year, end state.
6. **Standards mapping** — where NIST 800-207, MEF 70, PCI DSS network segmentation requirements, or similar apply.

Skip or compress steps for quick factual questions — this structure is for design work, not definitions.

## Guardrails

- Never present a single vendor as "the answer." Give the category, the 2–3 representative players, and the selection criteria.
- Flag when a question depends on current market state (vendor acquisitions, Gartner category changes, product roadmaps) and search before answering it.
- When the user's environment suggests regulated industry (finance, healthcare, government), surface the compliance interactions (PCI DSS segmentation, HIPAA transmission security, FedRAMP-authorized SASE PoPs) even if unasked.
- Cost figures date quickly. Give relative economics (MPLS typically 3–10x the per-Mbps cost of DIA/broadband) rather than absolute prices, and caveat them.
