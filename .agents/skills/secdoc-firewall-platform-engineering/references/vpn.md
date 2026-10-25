# VPN

Covers IPsec (site-to-site and mobile), OpenVPN, and WireGuard on OPNsense and pfSense, and UniFi site-to-site, VPN server and client, and Teleport. Mechanics of each protocol are durable; where each product configures them is perishable.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

### IPsec

IPsec builds an encrypted tunnel in two negotiations. **Phase 1 (IKE)** authenticates the peers and establishes a secure channel; IKEv2 is the current version and the default choice, IKEv1 remains for legacy peers. **Phase 2 (Child SA)** negotiates the actual encryption of the traffic and defines which subnets the tunnel carries. Two deployment shapes: **site-to-site** joins two networks with a fixed policy on each end, and **mobile / road-warrior** terminates many clients, usually with EAP or xauth authentication and a virtual address pool. Policy-based IPsec keys the tunnel to the local and remote subnet pair; route-based IPsec (VTI) presents a virtual interface you route into, which is cleaner for dynamic routing and overlapping policy.

### OpenVPN

OpenVPN is a TLS-based tunnel over a single UDP or TCP port. A **server** instance terminates clients, authenticates with certificates (and optionally user credentials), and pushes routes and DNS. A **client** instance dials a remote server. It runs in `tun` (routed, layer 3, the norm) or `tap` (bridged, layer 2) mode. Its strengths are firewall-friendliness (one port, TCP if you must) and mature certificate handling; its cost is per-packet overhead higher than WireGuard.

### WireGuard

WireGuard is a fixed modern cipher suite with a tiny attack surface. There is no session negotiation in the IPsec sense: each **peer** has a public key, and a peer's **AllowedIPs** does double duty as a routing table (which destinations go into this tunnel) and an ACL (which source addresses are accepted out of it). This dual role is the concept to teach: AllowedIPs is not just "the remote subnet", it is what the tunnel will route and accept, so a too-broad or too-narrow value is the usual reason a WireGuard tunnel passes some traffic and drops the rest. It is connectionless and roams cleanly, which is why it wins for mobile.

### The rule every VPN needs

A tunnel coming up is not traffic passing. On every platform you still need firewall rules that permit traffic on the VPN interface or zone, and routes (or AllowedIPs) that point the right subnets into the tunnel. A tunnel that is "up" but passes nothing is almost always a missing filter rule on the VPN interface or a routing/AllowedIPs gap.

## OPNsense specifics (v, 26.7)

- IPsec: **VPN > IPsec**. OPNsense has moved IPsec to an MVC "Connections" model: **VPN > IPsec > Connections** is the current style, while **Tunnel Settings [legacy]** remains for older configs. Mobile clients under **VPN > IPsec > Mobile Clients**. Verify which model a given box uses. (v)
- OpenVPN: **VPN > OpenVPN**, likewise migrated to **Instances** (**VPN > OpenVPN > Instances**) alongside the legacy Servers/Clients pages. (v)
- WireGuard: **VPN > WireGuard**, native in the kernel (no plugin needed on 26.7). Configure Local (this box's keys and listen port) and Endpoints/Peers (each peer's public key and AllowedIPs), then assign and enable the WireGuard interface so you can write rules on it.
- Filter rules for any VPN go on the tunnel's interface (assign it first) or as floating rules.

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- IPsec: **VPN > IPsec**, with Tunnels (Phase 1 / Phase 2) and Mobile Clients tabs. Route-based IPsec uses a VTI (Virtual Tunnel Interface) you then route into.
- OpenVPN: **VPN > OpenVPN**, Servers and Clients tabs, plus the Wizard for a road-warrior server. The Client Export package generates ready-made client bundles.
- WireGuard: **VPN > WireGuard**. On CE this is the WireGuard package; on Plus it is integrated. Same Local/Tunnel and Peers/AllowedIPs model, then assign the interface to write rules.
- Filter rules: on the assigned VPN interface, or on the IPsec tab of Firewall > Rules for policy-based IPsec.
- Plus Nexus GUI (v): VPN pages move to the Go controller during the transition; protocol mechanics are unchanged.

## UniFi specifics (v, Network 9.x)

UniFi presents VPN as a set of prebuilt roles rather than raw daemons.

- Site-to-site: **Settings > VPN > Site-to-Site VPN**, with IPsec (manual or auto) and WireGuard options to join two UniFi sites or reach a third-party peer. (v)
- VPN Server: **Settings > VPN > VPN Server**, offering WireGuard, OpenVPN, and L2TP servers for remote clients. (v)
- VPN Client: **Settings > VPN > VPN Client**, to send selected traffic out a commercial or remote WireGuard/OpenVPN endpoint, paired with a Traffic Route to choose what goes in (see `routing-pbr.md`). (v)
- **Teleport**: UniFi's zero-config remote access. It is WireGuard-based, keyed to the UniFi SSO account and the gateway's remote-access link, and gives a user a one-tap tunnel back to the site through a shared invite link, with no manual key exchange. It is the easy road-warrior path in the UniFi world and has no equivalent object on the pf platforms. (v)
- Filtering: under ZBF, VPN traffic lands in the **VPN zone**, so what a tunnel can reach is governed by VPN-zone-to-destination-zone policies, not by a per-interface rule. Bringing a tunnel up and then writing the VPN-zone policy is the two-step every UniFi VPN needs.

## Cross-platform translation (quick view)

| Need | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Join two sites | VPN > IPsec Connections, or WireGuard | VPN > IPsec Tunnels, or WireGuard | Settings > VPN > Site-to-Site |
| Terminate remote users | IPsec Mobile, OpenVPN Instance, or WireGuard | OpenVPN server (Wizard + Client Export), IPsec Mobile, WireGuard | Settings > VPN > VPN Server, or Teleport |
| Send traffic out a remote endpoint | WireGuard/OpenVPN client + PBR rule | WireGuard/OpenVPN client + PBR rule | VPN Client + Traffic Route |
| Control what a tunnel reaches | Rules on the assigned VPN interface | Rules on the assigned VPN interface / IPsec tab | VPN-zone policies in the matrix |

Portable lesson: pick the protocol by peer and by mobility (IPsec for interop with appliances, OpenVPN for certificate-heavy firewall-friendly access, WireGuard for speed and roaming), and remember AllowedIPs on WireGuard is routing and ACL at once. UniFi trades raw control for prebuilt roles and adds Teleport for the easy case.
