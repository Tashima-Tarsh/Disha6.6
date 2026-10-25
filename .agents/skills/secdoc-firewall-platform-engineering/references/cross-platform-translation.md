# Cross-platform translation

Read this when the task is to map a concept, rule, route, or workflow from one of the three products to the other two. It gathers the per-domain mappings into one place and, just as important, names where a concept has **no equivalent**, because implying parity that does not exist is the way translation goes wrong.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## How to translate without lying

1. Reduce the request to a **mechanic**, not a menu: "expose an internal service" (not "make a port forward"), "steer a VLAN down a tunnel" (not "add a traffic route").
2. Give each product's construct for that mechanic, with the exact path marked `(v)`.
3. If a product lacks the mechanic, say so and give the nearest honest substitute and its cost. Do not dress a gap as a feature.

OPNsense and pfSense are siblings: both are pf on FreeBSD, so most concepts map almost one to one, and the differences are menu layout, plugin/package names, and which backend is current. UniFi is the outlier: Linux, nftables, FRR, a controller model, and a zone firewall, so translation to UniFi is where the real gaps appear.

## The shared lineage in one paragraph

Anything you know about pf you know about both OPNsense and pfSense: first-match with `quick`, states, aliases compiling to tables, `route-to` for policy routing, NAT translating before filtering, CARP/pfsync/XMLRPC for HA. OPNsense adds MVC-style config models (IPsec Connections, OpenVPN Instances, Kea), colored rule categories, and the os-* plugin/tool family. pfSense keeps the classic layout and is mid-move to the Nexus Go GUI on Plus. Translate pf-to-pf by swapping menu paths and plugin names; the mechanics do not move.

## Firewall rules

| Mechanic | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Ordered rule, stops on match | Firewall > Rules > [iface] (implicit `quick`) | Firewall > Rules > [iface] (implicit `quick`) | Policy in a zone-pair cell |
| Cross-interface / background policy | Floating rule (Quick on/off) | Floating rule (Quick on/off) | Zone-pair default action |
| Reusable host/port object | Alias (Firewall > Aliases) | Alias (Firewall > Aliases) | Object/group or zone membership |
| Automatic stateful return | pf state on pass | pf state on pass | Auto Allow Return Traffic (conntrack) |
| Organize a long ruleset | Categories (colored) | Separators | Zone matrix (visual by design) |
| See the compiled rules | `pfctl -sr` | `pfctl -sr` | `nft list ruleset` |

Gap to name: UniFi has **no floating-rule concept** and no per-interface In/Out/Local split anymore; everything is zone-to-zone. The mental translation from a pfSense rulebase is "which zone is the source, which is the destination", and one legacy rule often becomes several zone policies.

## NAT

| Mechanic | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Source NAT for internet | Firewall > NAT > Outbound (Hybrid) | Firewall > NAT > Outbound (Hybrid) | Automatic WAN masquerade |
| Expose an internal service | NAT > Port Forward (+ auto filter rule) | NAT > Port Forward (+ auto filter rule) | Port forward **plus** a matching zone allow policy |
| Static public identity | NAT > One-to-One | NAT > 1:1 | Limited, model-dependent (v) |
| IPv6 prefix mapping | NAT > NPt | NAT > NPt | Limited, model-dependent (v) |
| Hit your own public IP internally | Reflection / split DNS | Reflection / split DNS | Split DNS preferred (v) |

Gap to name: on UniFi ZBF a port forward is **two objects** (the forward and the External-to-target allow policy), not one. Translating a working pfSense port forward means remembering to add the second piece.

## Routing and PBR

| Mechanic | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Static route | System > Routes > Configuration | System > Routing > Static Routes | Settings > Routing > Static Routes (v) |
| Monitored gateway | System > Gateways > Configuration | System > Routing > Gateways | Per-WAN, Settings > Internet |
| Multi-WAN failover/load share | Gateway group (tiers) | Gateway Groups (tiers) | Settings > Internet failover priority |
| Route by rule (PBR) | Rule Advanced > Gateway | Rule Advanced > Gateway | Settings > Routing > Traffic Routes |
| OSPF | os-frr plugin (full) | FRR package (full) | GUI on supported gateways, partial (v) |
| BGP | os-frr plugin (full) | FRR package (full) | Config-only, high-end models, if at all (v) |

Gap to name: full dynamic routing (BGP especially) is a real capability on both pf platforms and a **partial, model-gated** one on UniFi. If a design needs BGP, that is a pf-platform answer, not a UDM answer.

## VPN

| Need | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Site-to-site | IPsec Connections / WireGuard | IPsec Tunnels / WireGuard | Settings > VPN > Site-to-Site |
| Remote users | IPsec Mobile / OpenVPN Instance / WireGuard | OpenVPN (Wizard + Client Export) / IPsec Mobile / WireGuard | VPN Server, or Teleport |
| Egress via remote endpoint | WG/OVPN client + PBR | WG/OVPN client + PBR | VPN Client + Traffic Route |
| Control tunnel reach | Rules on VPN interface | Rules on VPN interface / IPsec tab | VPN-zone policies |

Gap to name: **Teleport** (UniFi's zero-config WireGuard remote access keyed to SSO) has no pf-platform equivalent; the closest is a hand-built WireGuard road-warrior setup. Conversely, pf's fine-grained per-tunnel firewalling and route-based IPsec (VTI) go beyond what UniFi's role-based VPN exposes.

## High availability

| Element | OPNsense / pfSense | UniFi |
|---|---|---|
| Shared virtual gateway IP | CARP VIP | None |
| Stateful failover | pfsync | None |
| Config kept in sync | XMLRPC config sync | None |
| Internet-link resilience | Multi-WAN group | Dual-WAN failover |
| Box redundancy | CARP pair (any two nodes) | Model-specific, high-end only (v) |

Gap to name: this is the widest gap in the set. UniFi has **no CARP/pfsync**. Seamless active/passive firewall failover with preserved connections is a pf-platform capability, full stop. Translating an HA requirement to UniFi means telling the truth: it is not there on a normal gateway.

## IDS/IPS and filtering

| Capability | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Signature IDS/IPS | Suricata (built in) | Suricata / Snort (Snort 3 on Plus/Nexus) | Threat management |
| Premium feed | ET Pro | ET Pro / Talos | CyberSecure subscription |
| IP reputation / GeoIP block | Native aliases | pfBlockerNG (IP) | Built-in + Traffic Rules |
| DNS blocklisting | Unbound blocklists | pfBlockerNG (DNSBL) | DNS content filtering |
| App-aware DPI | Zenarmor (os-sensei) | Zenarmor-style add-on / limited | Built-in DPI |

Gap to name: **pfBlockerNG is pfSense-only.** On OPNsense the honest translation is native aliases plus Unbound blocklists (and Zenarmor for L7), not a like-named package. On pfSense Plus, ThreatGate covers similar list-handling inside Nexus.

## DNS and DHCP

| Role | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Recursive resolver | Unbound | Unbound (DNS Resolver) | Not exposed (dnsmasq forward) |
| Forwarder | Dnsmasq | Dnsmasq (DNS Forwarder) | dnsmasq |
| DHCP | Kea (ISC deprecating) | DHCP Server (ISC to Kea) (v) | Per-network dnsmasq |
| DNS blocklist | Unbound blocklists | pfBlockerNG DNSBL | Content filtering |
| High-perf DNS + lists | n/a | CoreDNS/rexdns + ThreatGate (Plus/Nexus) (v) | n/a |

Gap to name: UniFi exposes **no validating recursive resolver** as a choice; it is dnsmasq forwarding. CoreDNS/rexdns is a Plus-and-Nexus feature with no CE or OPNsense twin.

## Management and lifecycle

| Task | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Config storage | /conf/config.xml (one file) | /cf/conf/config.xml (one file) | Controller state |
| Backup | System > Configuration > Backups | Diagnostics > Backup & Restore, ACB | Network app .unf backup |
| Lockout recovery | Console menu | Console menu (opt 4/13) | Controller/device reset |
| Shell beneath GUI | SSH, configctl, pfctl | SSH, pfSsh.php, pfctl | SSH, unifi-os shell, nft, vtysh |
| GUI in transition | Stable PHP | PHP moving to Nexus (Go, 8443) (v) | UniFi OS 443 (Gen1 CK 8443) (v) |

Gap to name: the pf platforms give you a **single portable config file**; UniFi does not, so "restore this config to a new box" is a file copy on pf and a controller-backup restore (or adoption) on UniFi.

## The three-line summary for any translation

- OPNsense to pfSense (and back): same pf mechanics, swap menu paths and plugin names, watch the OPNsense MVC models (Kea, IPsec Connections, OpenVPN Instances) and the pfSense Plus Nexus move.
- Either pf platform to UniFi: map the mechanic to a **zone** model, remember port forwards need an allow policy, and check for the four big gaps (no CARP/pfsync, partial dynamic routing, no exposed recursive resolver, no single config file).
- UniFi to a pf platform: you gain fine-grained rules, full FRR, CARP HA, and a portable config, and you give up Teleport, the controller's turnkey DPI/threat bundle, and the single-pane multi-site controller.
