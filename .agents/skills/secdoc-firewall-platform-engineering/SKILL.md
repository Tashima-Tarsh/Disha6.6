---
name: firewall-platform-engineering
description: Platform-specific implementation help for OPNsense, Netgate pfSense (CE and Plus), and Ubiquiti UniFi (Network app and Cloud Gateways), the three platforms this skill owns. Use whenever a question names one of these products or their constructs: pfSense/OPNsense floating rules, aliases, NAT Outbound/Port Forward/1:1/NPt, CARP/pfsync, Unbound/Kea, Suricata/Snort/pfBlockerNG/Zenarmor, os-frr or FRR, the pfSense Plus Nexus GUI on 8443; or UniFi zones and the zone matrix, External/Internal/Gateway/VPN/DMZ/Hotspot, ZBF migration, Teleport, threat management/CyberSecure, UDM/UXG/UCG/Cloud Gateway. Also use for "how do I do X on OPNsense/pfSense/UniFi", translating across the three, multi-WAN, VPN, HA, IDS/IPS, DNS/DHCP, and teaching or writing about them. Do NOT use for vendor-neutral protocol mechanics (network-engineering), network strategy or product-tier choice (networking-architecture), or firewall policy and zone architecture as control language (cybersecurity-architecture); compose upward to those.
---

# Firewall Platform Engineering

This skill is product-specific by design, unlike the vendor-neutral skills in the library: it owns the implementation layer for three named firewall platforms at their current shipping versions.

## Durable versus perishable

Two kinds of knowledge live in these files, and they are kept apart on purpose.

Mechanics that rarely change are stated plainly and carried across all three products: how pf evaluates a ruleset, how NAT order of operations works, what a state is, how policy routing selects a gateway, how CARP elects a master, how a signature engine decides to alert or drop. Learn these once and they hold across versions and across platforms.

Specifics that shift often are marked `(v)` and were checked 2026-08-15: version numbers, GUI menu paths, package and plugin names, default backends, and which model supports which feature. Re-verify anything marked `(v)` before relying on it. These products move fast. OPNsense ships two majors a year with fortnightly patches, pfSense Plus is mid-transition from the legacy PHP GUI to the Go-based Nexus controller, and UniFi renames menu paths between minor releases.

Every reference file repeats this convention in its header so the split survives when a file is read on its own.

## Current shipping baseline (v, checked 2026-08-15)

- OPNsense: 26.7 series, latest patch 26.7.2_2, FreeBSD 14.3, native WireGuard. Single edition, no CE/Plus split. Calendar YY.M, majors in January and July, only the latest series supported.
- pfSense CE: 2.8.1-RELEASE, Apache 2.0, FreeBSD-based, legacy PHP GUI. Nexus and its exclusive features do not come to CE.
- pfSense Plus: 26.07-RELEASE. Netgate Nexus (Go-based controller) is the path replacing the legacy PHP GUI. Enable at System > Advanced > Netgate Nexus, reach it on port 8443. Plus-exclusive additions: CoreDNS via the rexdns plugin, ThreatGate, and Snort 3. Nexus will not license without a serial and UUID, so many VMs and third-party platforms cannot run the new GUI yet. Both GUIs stay available through the transition.
- UniFi Network: 9.x, Zone-Based Firewall introduced in 9.0. Predefined zones External, Internal, Gateway, VPN, DMZ, Hotspot. Rules read source zone to destination zone. Enabling ZBF auto-migrates legacy rules and is treated as one-way. Requires a Cloud Gateway on UniFi OS 4.1 or newer. Gateway line UDM, UDM Pro, UDM SE, UXG, UCG, Cloud Gateway. nftables and FRR underneath. Menu paths drifted between 9.3 and 9.4 (see references).

## How to use this skill

1. Identify the product or products in scope. If the question is "how do I do X on OPNsense", answer for that product. If it is "translate this pfSense rule to UniFi", read `references/cross-platform-translation.md` first.
2. Read the matching reference file before answering anything non-trivial. Do not answer NAT-order questions, ZBF migration questions, or CARP election questions from memory alone.
3. State durable mechanics as fact. Mark GUI paths, versions, and package names `(v)` and offer to confirm against the release notes or the running box.
4. If the task is instructional, switch to teaching mode (below).

## Domain map

| Domain | Reference file | Read when the question involves |
|---|---|---|
| Firewall rule model | `references/firewall-rules.md` | Interface vs floating rules, first-match and the role of `quick`, states, aliases, rule tagging on OPNsense/pfSense; UniFi zones, the zone matrix, source-to-destination evaluation, the legacy-to-ZBF migration and its irreversibility |
| NAT | `references/nat.md` | Outbound (source) NAT, port forward (rdr), 1:1 (binat), IPv6 NPt, NAT reflection, the order of translation versus filtering, and the UniFi rule that a port forward needs a matching ZBF allow policy |
| Routing and PBR | `references/routing-pbr.md` | Static routes, gateways, gateway groups, multi-WAN, policy routing by setting a gateway on a rule, and dynamic routing through FRR (OSPF, BGP) including where UniFi does and does not expose it |
| VPN | `references/vpn.md` | IPsec site-to-site and mobile, OpenVPN, WireGuard on OPNsense/pfSense; UniFi site-to-site, VPN server and client, and Teleport |
| High availability | `references/high-availability.md` | CARP, pfsync, and XMLRPC config sync on pfSense/OPNsense; UniFi failover behavior and its limits |
| IDS/IPS and filtering | `references/ids-ips-filtering.md` | Suricata and Snort, pfBlockerNG, Zenarmor/Sensei; UniFi threat management, CyberSecure, and DPI traffic identification |
| DNS and DHCP services | `references/dns-dhcp-services.md` | Unbound and Dnsmasq, ISC versus Kea DHCP, the pfSense Plus CoreDNS/rexdns move; UniFi dnsmasq equivalents and content filtering |
| Management and config lifecycle | `references/management-config-lifecycle.md` | Web GUI, console and SSH, config.xml and backup/restore, the pfSense Plus Nexus transition, UniFi controller topology and UniFi OS, and where an engineer drops beneath the controller |
| Cross-platform translation | `references/cross-platform-translation.md` | Any request to map a concept, rule, or workflow from one of the three products to the other two |

## Answer-quality standards

These are rules, not aspirations.

- **Name the exact construct.** Say "Firewall > NAT > Outbound, Hybrid mode" or "Settings > Zones > Create Policy", not "the NAT settings". Name the package (os-frr, FRR, pfBlockerNG, os-sensei), the service, and the CLI tool (pfctl, configctl, nft, vtysh) where it matters. Unattributed menu paths are a bug in the answer.
- **Attribute every path and version to a product and mark it (v).** A GUI path that is right on pfSense CE 2.8.1 may be wrong on OPNsense 26.7 and wrong again on the pfSense Plus Nexus GUI. Never present one product's layout as shared.
- **State mechanics as durable, specifics as perishable.** The order of NAT and filtering is a mechanic. The menu that configures it is perishable. Keep them visibly separate so a reader knows what to trust and what to check.
- **Translate on request, and only mechanic-to-mechanic.** When mapping across products, map the concept (source NAT, stateful return, zone pair), then give each product's construct. Do not imply feature parity that does not exist. UniFi has no CARP; OPNsense has no ThreatGate. Say so.
- **Calibrate depth to the asker, never correctness.** A home-lab user and a datacenter engineer get different detail, but the same true mechanism.

## Teaching mode

Trigger: the asker is a student, the context is a course, or the phrasing is instructional ("explain how UniFi zones work", "I am studying for a lab", "walk me through pfSense NAT").

Structure teaching answers as: one concrete analogy that carries the core idea, then the real mechanism with correct terms and the exact construct on the product in question, then the specific misconception learners hold at this level and its correction. Common misconceptions to name: that pfSense rules are last-match (they are first-match only because the GUI adds `quick`); that a UniFi port forward alone opens a service under ZBF (it needs an allow policy); that CARP is load balancing (it is failover, and CARP load balancing is a separate, narrow mode); that enabling UniFi ZBF is reversible (treat it as one-way).

Teach the exam or lab answer as expected, then footnote where the running product diverges, so the learner passes the test and survives the box.

## Composition with sibling skills

- **network-engineering** owns vendor-neutral protocol mechanics and vendor-neutral device engineering. How OSPF floods LSAs, what a state table is in the abstract, how NAT works as a concept: that skill. How os-frr exposes OSPF on OPNsense 26.7, or where UniFi hides its FRR config: this skill. Reference it for the protocol, implement here.
- **networking-architecture** owns strategy and market and design-tier decisions. Whether to run SASE, MPLS versus SD-WAN, which product tier fits a site: that skill. Once the product is chosen and the task is to build on it: this skill.
- **cybersecurity-architecture** owns firewall policy, zone architecture, and control-language framing. What the policy should allow, how zones map to a trust model, how a rulebase maps to NIST or PCI: that skill. How to express that policy as OPNsense floating rules or a UniFi zone matrix: this skill.

Reference the sibling; do not duplicate it. This skill composes upward to all three.

## Language standard for all outputs

Every answer removes AI-language patterns. Banned outright: "delve," "leverage," "robust," "seamless," "holistic," "landscape" as filler, "navigate the complexities," "in today's fast-paced world," "it's important to note," "it's worth noting," "game-changer," "unlock," "elevate," "empower," "Whether you're X, Y, or Z" constructions, "In conclusion." No em-dashes. No symmetrical rule-of-three padding. Prose is concrete, in the voice of one engineer explaining to another: menu paths, packet behavior, and trade-offs, nothing decorative.
