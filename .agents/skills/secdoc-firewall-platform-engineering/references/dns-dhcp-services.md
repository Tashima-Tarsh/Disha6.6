# DNS and DHCP services

Covers the resolver and DHCP stacks on each platform: Unbound versus Dnsmasq, ISC versus Kea DHCP, the pfSense Plus move to CoreDNS via the rexdns plugin, and UniFi's dnsmasq-based equivalents. The roles are durable; the backends are actively changing on all three.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

### Resolver versus forwarder

A **recursive resolver** answers a query by walking the DNS hierarchy itself, from the root down, and can validate **DNSSEC** signatures end to end. A **forwarder** hands the query to an upstream resolver (your ISP, a public resolver) and relays the answer. Resolving gives you independence and validation at the cost of first-query latency; forwarding gives you speed and simplicity at the cost of trusting and depending on the upstream. Most firewalls can do either, and the choice is a privacy/latency/trust trade, not a feature gap.

### DHCP: leases, reservations, options

DHCP hands out an address from a pool for a **lease** time, and a **static mapping / reservation** ties a MAC to a fixed address so a host is predictable. **Options** push more than an address: gateway, DNS servers, domain, NTP, TFTP/boot for PXE, and vendor options. The durable design point is that DHCP and DNS want to be joined: register DHCP leases into the resolver so internal names resolve, which is a checkbox on these platforms and the reason internal name resolution "just works" when set up right.

### The backend churn

The DHCP and DNS backends are mid-generational change across the industry. ISC dhcpd is end-of-life and being replaced by **Kea**; forwarder/resolver choices are shifting too. This is exactly the perishable layer to verify at use, because which backend is default (and which is even present) has moved recently on both pf platforms.

## OPNsense specifics (v, 26.7)

- Resolver: **Services > Unbound DNS** (validating recursive resolver, DNSSEC capable, the default). Blocklists for DNSBL-style filtering live here under Unbound's Blocklist settings.
- Forwarder: **Services > Dnsmasq DNS** as the lightweight forwarder alternative.
- DHCP: OPNsense has moved to **Kea DHCP** (**Services > Kea DHCP**), with ISC DHCP deprecated and on its way out. Which is active/default on a given box depends on version and whether it was upgraded, so verify. Kea's config model and the ISC-to-Kea migration are the current friction point to check. (v)
- DHCPv6 and Router Advertisements are configured alongside the v4 server per interface. (v)

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- Resolver: **Services > DNS Resolver** (Unbound). Forwarder: **Services > DNS Forwarder** (Dnsmasq). Register DHCP leases into the resolver with the "Register DHCP leases in the DNS Resolver" option so internal names resolve.
- DHCP: **Services > DHCP Server**. pfSense is migrating from ISC to **Kea** as the backend, selectable/being defaulted depending on version; confirm which backend the box is running and whether static mappings and failover behave as expected under Kea, since that migration has been bumpy. (v)
- **CoreDNS on Plus (26.07, Nexus-exclusive)** (v): pfSense Plus adds **CoreDNS**, powered by a new Netgate plugin called **rexdns**, as a high-performance DNS component inside the Nexus controller, built to work with **ThreatGate** for large address/domain list handling. This is a Plus-and-Nexus feature, not present on CE, and it sits alongside (not simply replacing) the Unbound resolver during the transition. Verify how CoreDNS/rexdns and the legacy DNS Resolver coexist on a given box and which one is authoritative for what. (v)
- Plus Nexus GUI (v): DNS and DHCP pages are part of the PHP-to-Go transition.

## UniFi specifics (v, Network 9.x)

UniFi runs **dnsmasq** on the gateway for DHCP and DNS, wrapped by the controller so you rarely see it directly.

- DHCP: per network at **Settings > Networks > [network]**, set the DHCP range, lease time, gateway, DNS, and DHCP options; static reservations are made from the client's entry. (v)
- DNS: the gateway acts as forwarder/DNS for clients by default; you can set custom upstream DNS and enable content filtering. UniFi's **DNS Shield / content filtering** and domain-based **Traffic Rules** cover the blocklist role that pfBlockerNG/Unbound-blocklists fill on the pf side. (v)
- There is no Unbound-style validating recursive resolver exposed as such and no Kea/ISC choice to make; the dnsmasq-based stack is what you get, tuned through the controller. Drop to the gateway shell only when the controller will not express a needed dnsmasq option, and expect controller overwrites of hand edits. (v)

## Cross-platform translation (quick view)

| Role | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Validating recursive resolver | Unbound (Services > Unbound DNS) | Unbound (Services > DNS Resolver) | Not exposed; dnsmasq forwarding |
| Lightweight forwarder | Dnsmasq (Services > Dnsmasq DNS) | Dnsmasq (Services > DNS Forwarder) | dnsmasq (default gateway DNS) |
| DHCP server | Kea (Services > Kea DHCP), ISC deprecating | DHCP Server, ISC-to-Kea migration (v) | Per-network DHCP (dnsmasq) |
| DNS blocklisting | Unbound blocklists | pfBlockerNG DNSBL | DNS content filtering / Traffic Rules |
| High-performance DNS + list engine | Not applicable | CoreDNS/rexdns + ThreatGate (Plus/Nexus) (v) | Not applicable |
| Register leases into DNS | Unbound option | Resolver registration option | Automatic on the gateway |

Portable lesson: everyone offers resolve-or-forward and DHCP-with-reservations, and everyone wants leases registered into DNS. The perishable part is the backend: ISC is giving way to Kea on both pf platforms, and pfSense Plus is layering CoreDNS/rexdns and ThreatGate into Nexus. Verify the live backend before quoting behavior. UniFi keeps it simple with dnsmasq and pushes filtering into the controller.
