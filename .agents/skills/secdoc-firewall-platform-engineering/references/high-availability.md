# High availability

Covers CARP, pfsync, and XMLRPC config sync on pfSense and OPNsense, and UniFi failover behavior and its limits. The pf platforms do true active/passive firewall HA; UniFi does not, and saying so plainly saves a lot of wasted design time.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

Firewall HA on the pf platforms is three separate mechanisms that people conflate. They are independent and you configure all three.

### CARP (the shared virtual IP)

CARP (Common Address Redundancy Protocol) is FreeBSD's answer to VRRP. Two firewalls share a **virtual IP** on each interface. Each interface's CARP VIP has a **VHID** (the group id, must match between peers and be unique on the segment) and an **advskew / advbase** that sets how often each node advertises. The node advertising most aggressively (lowest skew) becomes **master** and owns the VIP; the other is **backup** and stays silent until it stops hearing the master, then takes the VIP over. Clients use the VIP as their gateway, so failover is invisible to them: the IP simply moves. CARP is failover, not load balancing. (A narrow CARP load-balancing mode exists using ARP hashing, but the default and the normal design is active/passive.)

### pfsync (the state sync)

CARP moving the IP is not enough on its own, because the backup has no state table, so every existing connection would drop on failover. **pfsync** replicates the pf **state table** between the two nodes over a dedicated sync interface, so when the backup takes the VIP it already knows the live connections and they survive the switch. pfsync is what makes CARP failover seamless rather than a reset-everything event. Run it on its own interface or VLAN between the two firewalls.

### XMLRPC config sync (keeping the pair identical)

The two nodes must have matching rules, NAT, aliases, and objects, or failover moves traffic to a box that blocks it. **Config sync** (XMLRPC) pushes designated config sections from the master to the backup automatically so you edit one box and the other follows. You still set per-node things (interface addresses, CARP skew) individually; everything policy-shaped syncs.

Put together: CARP owns the address, pfsync owns the state, XMLRPC owns the config. All three, or the HA is incomplete.

## OPNsense specifics (v, 26.7)

- CARP VIPs: **Interfaces > Virtual IPs > Settings**, add a CARP type VIP per interface with a VHID and password, matching VHIDs across the pair, different skews.
- HA settings: **System > High Availability > Settings** holds the pfsync configuration (sync interface) and the XMLRPC synchronization (peer address, credentials, and the list of config sections to sync). **System > High Availability > Status** shows sync state and lets you force a maintenance/failover.
- Enter CARP maintenance mode from the Status page to drain a node for patching without yanking the cable.

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- CARP VIPs: **Firewall > Virtual IPs**, add CARP VIPs per interface (VHID, skew, password).
- Sync: **System > High Avail. Sync** configures pfsync (State Synchronization: the sync interface) and Configuration Synchronization (XMLRPC: peer IP, admin credentials, and the checkboxes for which config areas to push).
- Netgate's documented pattern is a dedicated sync interface, a primary with low skew and a secondary with higher skew, and outbound NAT and services bound to CARP VIPs so they follow the master.
- Plus Nexus GUI (v): HA pages are part of the PHP-to-Go transition. The CARP/pfsync/XMLRPC mechanics are unchanged; confirm the live GUI before quoting a path.

## UniFi specifics (v, Network 9.x)

State the limit first: **UniFi has no CARP/pfsync equivalent.** A UniFi gateway is normally a single box, and there is no active/passive stateful firewall pair in the pfSense sense.

What UniFi does offer for resilience:
- **Dual-WAN failover**: two internet uplinks on one gateway with a failover priority, so a WAN outage fails over while the gateway itself stays the single point. Set under **Settings > Internet** per WAN. (v)
- **Gateway redundancy / shadow modes** exist only on specific higher-end Cloud Gateway models and are limited compared to CARP; do not assume a UDM-class device can pair. Check the exact model and Network version before promising any gateway-level redundancy, and treat it as model-specific, not a platform feature. (v)
- The practical consequence for design: if the requirement is seamless firewall failover with state preservation, that points at OPNsense or pfSense with CARP and pfsync, not at a single UniFi gateway. Say so rather than stretching UniFi to fit.

## Cross-platform translation (quick view)

| HA element | OPNsense / pfSense | UniFi |
|---|---|---|
| Shared virtual gateway IP | CARP VIP (VHID, skew) | None |
| Stateful failover (connections survive) | pfsync | None |
| Config kept identical across pair | XMLRPC config sync | None |
| Internet-link resilience | Multi-WAN gateway group | Dual-WAN failover priority |
| Gateway-box redundancy | CARP pair (any two matching nodes) | Model-specific, high-end only (v) |

Portable lesson: on the pf platforms, HA is CARP plus pfsync plus config sync, three parts you must all configure. UniFi gives you WAN failover on a single gateway and, on select models, limited redundancy, but not stateful active/passive firewall HA. Match the requirement to the platform instead of forcing it.
