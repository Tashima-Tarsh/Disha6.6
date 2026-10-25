# Routing and policy-based routing

Covers static routes, gateways and gateway groups, multi-WAN failover and load sharing, policy routing (choosing a path by rule rather than by destination), and dynamic routing through FRR, including exactly where UniFi does and does not expose it.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

### How a packet picks a path by default

The routing table is consulted by **longest-prefix match**: the most specific route that contains the destination wins, and the default route (0.0.0.0/0, ::/0) catches everything else. This is destination-based routing and it is all a plain router does.

### What a gateway is on these platforms

A gateway is the next hop reachable out of an interface, usually the ISP router on WAN. Defining a gateway object lets the firewall monitor it (by pinging a target through it) and lets you attach that gateway to routes, to gateway groups, and to firewall rules for policy routing. Gateway monitoring is what makes multi-WAN failover possible: the firewall knows a WAN is down because the monitored target stops answering.

### Policy-based routing: overriding the table with a rule

Policy routing means a **firewall rule** decides the egress path instead of the routing table. On pf this is the `route-to` action: a pass rule with a gateway set sends matching traffic out that gateway regardless of what the routing table would have chosen. This is how you send guest traffic out WAN2, force IoT through a VPN, or keep VoIP on the low-latency link. The mechanism is durable across OPNsense and pfSense because it is a pf feature; only the field that sets it moves.

Two rules of thumb that do not change:
- Policy routing on a rule beats the routing table for traffic that matches the rule.
- Do not policy-route traffic destined for local or VPN-tunneled networks out a WAN gateway. Add pass rules above the policy-routed rule that leave the gateway unset for local and VPN destinations, or that traffic gets forced out WAN and breaks. This "skip PBR for local/VPN nets first" pattern is the most common multi-WAN mistake.

### Multi-WAN: gateway groups

A gateway group assigns **tiers** to gateways. Same tier means load share across them; different tiers means failover, lower tier preferred, higher tier used only when the lower fails its monitor. You then policy-route traffic at the group rather than a single gateway, so failover is automatic. Load sharing is per-connection, not per-packet, so a single flow stays on one WAN.

## OPNsense specifics (v, 26.7)

- Gateways: **System > Gateways > Configuration**. Set the monitor IP, weight, and priority. Gateway groups: **System > Gateways > Group**.
- Static routes: **System > Routes > Configuration**.
- Policy routing: on a rule at **Firewall > Rules > [interface]**, open Advanced and set **Gateway** to the gateway or gateway group. That is `route-to` under the hood.
- Dynamic routing: install the **os-frr** plugin (**System > Firmware > Plugins**, add `os-frr`). It exposes FRR under a **Routing** menu: General to enable the daemons, then OSPF, OSPFv3, BGP, RIP, and static as sub-pages. vtysh is available from a shell for FRR's native CLI. OPNsense's FRR support is full FRR: OSPF and BGP both usable. (v)

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- Gateways: **System > Routing > Gateways**. Gateway groups: **System > Routing > Gateway Groups**, with the Tier column driving failover versus load share. Static routes: **System > Routing > Static Routes**.
- Policy routing: on a rule at **Firewall > Rules > [interface]**, Advanced Options, set **Gateway**. Same `route-to`.
- Remember the skip-PBR-for-local/VPN pattern: on pfSense you place pass rules with gateway "default" (unset) above the policy-routed rule for LAN and VPN destinations. pfSense also has a "negate rules for traffic to..." helper under System > Advanced that auto-creates some of these; verify its scope. (v)
- Dynamic routing: the **FRR** package (**System > Package Manager**, install FRR), configured under **Services > FRR**, with Global/Zebra settings and per-protocol OSPF and BGP pages. Full FRR, OSPF and BGP both supported. (v)
- Plus Nexus GUI (v): routing pages are part of the PHP-to-Go transition. The routing and PBR mechanics are unchanged; confirm the live GUI before quoting paths.

## UniFi specifics (v, Network 9.x)

UniFi does destination routing and a GUI form of policy routing, but its dynamic-routing exposure is the important limit to state plainly.

- Static routes: **Settings > Routing > Static Routes** (path varies by minor, verify) (v).
- Policy routing: **Settings > Routing > Traffic Routes** (also called policy-based routes). You match traffic (by network, client, domain, or region) and send it out a specific interface or VPN. This is the UniFi equivalent of a `route-to` rule and is how you steer, for example, one VLAN through a WireGuard tunnel.
- Multi-WAN: dual-WAN failover and, on capable gateways, load balancing are set at **Settings > Internet** per WAN with failover priority. This is the gateway-group idea in UniFi's form.
- Dynamic routing: FRR runs underneath UniFi gateways, but the controller's exposure has been partial and model-dependent. **OSPF** has a GUI presence on gateways that support it; **BGP** has historically been config-file-only (upload an FRR-style config) on the gateways that allow it at all, typically the higher-end models. Do not promise full OSPF/BGP parity with OPNsense or pfSense on a UDM-class box. Check the running Network version and the specific gateway model, and expect to drop to a config upload or the underlying FRR for anything past basic OSPF. (v)
- Underneath: from a gateway shell, FRR's `vtysh` and the Linux routing table (`ip route`) show the real state when the controller view is not enough.

## Cross-platform translation (quick view)

| Task | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Add a static route | System > Routes > Configuration | System > Routing > Static Routes | Settings > Routing > Static Routes (v) |
| Define a monitored gateway | System > Gateways > Configuration | System > Routing > Gateways | Per-WAN under Settings > Internet |
| Multi-WAN failover / load share | Gateway group with tiers | Gateway Groups with tiers | Settings > Internet failover priority |
| Route by rule (PBR) | Rule Advanced > Gateway (`route-to`) | Rule Advanced > Gateway (`route-to`) | Settings > Routing > Traffic Routes |
| OSPF | os-frr plugin, full | FRR package, full | GUI on supported gateways, partial (v) |
| BGP | os-frr plugin, full | FRR package, full | Config-only on high-end models, if at all (v) |

Portable lesson: destination routing is the default, a rule-level gateway is how all three override it, and the further you push dynamic routing the more UniFi diverges from the two pf platforms.
