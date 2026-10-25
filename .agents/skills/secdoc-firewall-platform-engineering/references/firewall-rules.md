# Firewall rule model and evaluation

Covers how each platform decides to pass or block a packet: rule ordering and evaluation, states, aliases, rule grouping, and the UniFi zone model with its one-way migration.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Re-verify them before relying on them. Durable mechanics carry no mark.

## Durable mechanics

### pf, the engine under OPNsense and pfSense

Both products are a GUI and a set of services wrapped around FreeBSD's `pf`. Every rule you write in the web interface is compiled into a pf ruleset and loaded by `pfctl`. Understanding pf explains both products at once.

pf's native rule is: evaluate every rule in order, and the **last** matching rule decides the packet, unless a matching rule carries the `quick` keyword, in which case evaluation stops there and that rule decides. This is the single most misunderstood point on these platforms. OPNsense and pfSense both generate their normal interface rules **with `quick` set**, so from the operator's point of view evaluation is **first-match, top-down**: the first rule that matches wins and processing stops. That is true for interface rules and for floating rules that you mark Quick. It is not true for floating rules left non-quick, which fall back to pf's native last-match behavior and are the deliberate exception used for broad, low-priority policy.

A rule matches on the packet's direction, interface, address family, protocol, source, destination, and port. A `pass` rule creates state (below) unless you disable it. A `block` rule drops silently; a `reject` rule sends a TCP RST or ICMP unreachable so the sender fails fast instead of timing out.

Default posture: a fresh install blocks all inbound on WAN and permits LAN-to-any via a default allow rule the installer creates. There is an invisible ruleset above your rules (anti-lockout, anti-spoof via `antispoof`, bogon and block-private options per interface, the automatic rules for VPNs and services). Your GUI rules sit inside that frame, they are not the whole ruleset. On pfSense see the full compiled set with `pfctl -sr`; on OPNsense the same, plus the GUI's own rule categories.

### States

pf is a stateful firewall. When a `pass` rule admits the first packet of a flow, pf records a **state**: the addresses, ports, protocol, and the connection's progress, keyed so that reply traffic and subsequent packets of the same flow are matched against the state table directly and admitted without re-consulting the ruleset. This is why you write rules in one direction only and return traffic just works, and why changing a rule does not tear down flows already in the state table. Inspect states with `pfctl -ss`; count them with `pfctl -si`. State is also where NAT bindings live, which is why the NAT and filter stories are joined (see `nat.md`).

State policy matters at scale and on multi-WAN. Default `keep state` is floating (not interface-bound) on these builds, which is what lets asymmetric and reply-path traffic match. `sloppy` state relaxes TCP sequence checking for asymmetric routing. State timeouts and adaptive scaling protect the table under load.

### nftables, the engine under UniFi

UniFi gateways run Linux. The controller compiles your intent into **nftables** rules (`nft list ruleset` from a gateway shell shows the live set) and conntrack provides stateful return handling, the same idea as pf state under different machinery. Within an nftables chain, rules are evaluated in order and the first terminal verdict (accept, drop, reject) wins, which is first-match like the `quick` behavior above. The controller abstraction means you rarely touch nftables directly, but knowing it is there tells you where to look when the GUI cannot express something.

## OPNsense specifics (v, 26.7)

- Interface rules: **Firewall > Rules > [interface]** (WAN, LAN, each VLAN and each OPT). Evaluated per interface on the inbound direction by default.
- Floating rules: **Firewall > Rules > Floating**. Match across multiple interfaces and either direction. Set Quick for first-match behavior, leave it off for last-match background policy.
- Rule categories: OPNsense adds a Category field and color tags so you can filter a long ruleset. This is an OPNsense feature with no pfSense equivalent.
- Aliases: **Firewall > Aliases**. Types include Host(s), Network(s), Port(s), URL tables (fetch a list on a schedule), GeoIP, MAC, and nested aliases. Aliases resolve into pf tables, which is why a large alias is cheap: pf matches against a table, not a hundred rules.
- Live ruleset and states: shell via **System > (console)** or SSH, then `pfctl -sr`, `pfctl -ss`, `configctl filter list rules`.
- OPNsense reloads the filter through its own MVC layer; a rule change is applied on Apply, and `configctl filter reload` forces it from the CLI.

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- Interface rules: **Firewall > Rules > [interface tab]**. Same per-interface, inbound-by-default model.
- Floating rules: **Firewall > Rules > Floating**, with the Quick checkbox carrying the same meaning as above.
- Aliases: **Firewall > Aliases**, tabs for IP, Ports, URLs. Same pf-table compilation.
- Separators and rule descriptions organize long lists; pfSense has separators rather than OPNsense's colored categories.
- CLI: console option 8 for a shell, then `pfctl -sr`, `pfctl -ss`; `pfSsh.php playback` for scripted actions.
- pfSense Plus Nexus GUI (v): the Go-based controller on port 8443 is replacing the PHP rule pages during the transition. Rule semantics (pf, quick, states) are unchanged underneath; only the page that edits them moves. Confirm which GUI the box is presenting before giving a path, because both are live during the transition.

## UniFi specifics (v, Network 9.x)

UniFi 9.0 replaced the old per-interface rule model (LAN In, WAN In, Guest In and the like) with a **Zone-Based Firewall**. You group networks, VLANs, WANs and VPNs into **zones**, then write **policies** that read source zone to destination zone.

- Predefined zones: **External, Internal, Gateway, VPN, DMZ, Hotspot**. Gateway is the firewall itself (traffic terminating on the gateway, for example the WAN management interface or a service the gateway hosts). Hotspot is guest-portal traffic. You add custom zones for trust tiers (IoT, cameras, servers).
- The **zone matrix**: a grid of source zone rows against destination zone columns. Each cell holds the policies that govern that pair, plus a default action. Reading the matrix is reading the whole policy at a glance, which is the point of the model.
- Policy actions: Allow, Block (silent drop), Reject (notify sender). "Auto Allow Return Traffic" adds the built-in reverse policy so replies pass, which is the conntrack stateful-return idea surfaced as a checkbox.
- Menu path drifted between minors (v): Network 9.4 uses **Settings > Zones > Create Policy** or **Settings > Policy Table > Create New Policy**; Network 9.3 used **Settings > Policy Engine > Zones > Create Policy**. Confirm the running minor before quoting a path.
- Underneath: policies compile to nftables chains keyed by zone. `nft list ruleset` from the gateway shows the result if you need to prove what the controller built.

### The migration and its irreversibility

Enabling ZBF **auto-migrates** your existing legacy rules into zone policies. Two things to warn every operator about. First, the conversion inflates rule count: a handful of custom legacy rules commonly becomes dozens of policies, because each legacy rule is expanded across the zone pairs it touched. Second, treat the switch as **one-way**. The migration takes an automatic config backup so a restore is technically possible, but Ubiquiti's guidance and field experience are consistent: plan to stay on ZBF once you enable it, and do the enable in a maintenance window with your own backup in hand, not on a live production gateway mid-day. The auto-conversion is also not always faithful, so audit the resulting matrix against intent rather than assuming parity.

## Cross-platform translation (quick view)

| Concept | OPNsense / pfSense | UniFi |
|---|---|---|
| Ordered rule that stops on match | Interface rule (implicit `quick`) | Policy inside a zone-pair cell |
| Broad low-priority background policy | Floating rule, Quick off (last-match) | Zone-pair default action |
| Reusable object of hosts or ports | Alias (compiles to a pf table) | Object / group, or zone membership |
| Stateful return without a reverse rule | pf state (automatic on pass) | Auto Allow Return Traffic (conntrack) |
| See the live compiled rules | `pfctl -sr` | `nft list ruleset` |

Fuller mapping in `cross-platform-translation.md`.
