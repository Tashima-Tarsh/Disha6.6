# IDS/IPS and filtering

Covers Suricata and Snort, pfBlockerNG, and Zenarmor/Sensei on the pf platforms, and UniFi threat management, CyberSecure, and DPI-based traffic identification. The detection mechanics are durable; engines, rule sources, and product names shift.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

### Signature-based detection: IDS versus IPS

A signature engine inspects packets or reassembled streams against a ruleset. In **IDS** mode it observes a copy and **alerts** without stopping anything. In **IPS** (inline) mode it sits in the packet path and can **drop** on a match, which means false positives now break real traffic, so IPS is tuned before it is trusted. The trade is detection value against operational risk, and the tuning work (disabling noisy rules, suppressing known-good) is the actual job, not the install.

Placement matters: inspecting on the WAN sees pre-NAT internet traffic (loud, mostly background scanning); inspecting on the LAN sees post-NAT internal traffic (fewer alerts, closer to what matters). Encrypted traffic is opaque to signatures without interception, which is why signature IDS/IPS catches less than it used to and why DNS-layer and reputation filtering (below) carry more weight now.

### Reputation and DNS filtering

Separate from signatures: block by **who** rather than **what**. IP reputation feeds drop traffic to or from known-bad addresses at the firewall. **DNSBL** (DNS blocklists) answer queries for known-bad or unwanted domains with a null result, killing ads, trackers, and malware callbacks before a connection is even attempted. This is cheap, encryption-proof (it acts on the DNS question), and often higher-value per CPU cycle than deep packet inspection.

### DPI and L7 identification

Deep packet inspection classifies flows by application (this is Netflix, this is BitTorrent, this is a specific SaaS) using patterns and increasingly metadata, since payloads are encrypted. It powers per-application visibility, reporting, and app-aware policy. Its accuracy degrades as more traffic hides inside TLS and QUIC, so treat L7 identification as strong for visibility and coarse policy, weaker as a security control on its own.

## OPNsense specifics (v, 26.7)

- IDS/IPS: **Services > Intrusion Detection** runs **Suricata** (built into OPNsense, no separate package). Enable, choose interfaces, and switch on IPS mode for inline dropping. Rulesets under the Download/Rules tabs: ET Open and others, with the Rules tab for per-rule enable/disable and the Policy tab for bulk actions. Suricata is multi-threaded, which is why OPNsense standardized on it. (v)
- L7 and full DPI: **Zenarmor** (the plugin formerly called Sensei, package `os-sensei`). Adds application-aware filtering, per-user/-app reporting, and cloud threat intel. Free and paid tiers; the richer policy and history are paid. Configure under **Services > Zenarmor**. (v)
- Reputation and blocklists: OPNsense does IP blocklists and GeoIP through aliases (URL-table and GeoIP alias types, see `firewall-rules.md`), plus Unbound DNSBL-style blocklisting under the DNS resolver. There is no pfBlockerNG on OPNsense; the equivalent is native aliases plus Unbound blocklists. (v)

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- IDS/IPS: two packages, **Suricata** and **Snort** (**System > Package Manager**, then **Services > Suricata** or **Services > Snort**). Both offer IDS and inline IPS mode. Choose one per box, not both on the same interface. pfSense Plus 26.07 adds **Snort 3** as a Nexus-exclusive component. (v)
- Rule sources: ET Open (free), ET Pro (paid), and Snort's Talos rules (registered/subscriber Oconf codes). Configure the rule categories, then tune with disable/suppress lists. (v)
- **pfBlockerNG**: the pfSense package for IP reputation and DNSBL (**Firewall > pfBlockerNG**). IP tab pulls reputation and GeoIP feeds into aliases and blocks at the firewall; DNSBL tab uses the DNS Resolver to null-route unwanted domains. This is the highest-value-per-effort add-on on pfSense for most sites. There is no direct OPNsense port; OPNsense reaches similar ends with native aliases plus Unbound. (v)
- **ThreatGate** (Plus 26.07, Nexus-exclusive) (v): manages bulk address and domain lists for firewall rules, aliases, and CoreDNS groups, integrated with CoreDNS for high-volume list processing. It overlaps pfBlockerNG's territory inside the Nexus stack; see `dns-dhcp-services.md`. Verify current capability and how it coexists with pfBlockerNG.
- Plus Nexus GUI (v): filtering pages are part of the transition.

## UniFi specifics (v, Network 9.x)

- **Threat management**: **Settings > Security** exposes IDS/IPS built on a signature engine, with Detect (alert) and Detect and Block (inline) levels, plus sensitivity categories. It is the UniFi analogue of Suricata IDS/IPS with far fewer knobs. (v)
- **CyberSecure**: a paid, subscription signature tier (Proofpoint-powered) that expands the ruleset well beyond the free built-in signatures, available on qualifying gateways. Positioned as the enterprise detection upgrade. Confirm gateway eligibility and current provider. (v)
- **DPI / traffic identification**: UniFi's deep packet inspection drives the per-application traffic breakdowns, client insights, and app/domain-based **Traffic Rules** and **Traffic Routes**. It is strong for visibility and for coarse app blocking, and it feeds the same identification into ZBF policy matching where the version supports it. (v)
- No pfBlockerNG/Zenarmor equivalent as such: UniFi bundles a slice of each (signatures, DPI, content/ad blocking via DNS filtering and Traffic Rules) into the controller rather than exposing separate engines.

## Cross-platform translation (quick view)

| Capability | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Signature IDS/IPS | Suricata (built in) | Suricata or Snort package (Snort 3 on Plus/Nexus) | Threat management (Detect / Detect+Block) |
| Premium signature feed | ET Pro | ET Pro / Talos subscriber | CyberSecure subscription |
| IP reputation + GeoIP blocking | Native aliases (URL table, GeoIP) | pfBlockerNG (IP) | Built-in threat + Traffic Rules |
| DNS blocklisting | Unbound blocklists | pfBlockerNG (DNSBL) | DNS content filtering / Traffic Rules |
| App-aware L7 (DPI) | Zenarmor (os-sensei) | limited without Zenarmor-style add-on | Built-in DPI |

Portable lesson: signatures catch less as traffic encrypts, so DNS and reputation filtering earn their keep. pfSense splits these into distinct engines you assemble (Suricata/Snort plus pfBlockerNG plus optional Zenarmor), OPNsense builds Suricata in and leans on aliases plus Zenarmor, and UniFi folds a lighter version of all of it into the controller with the premium tier behind CyberSecure.
