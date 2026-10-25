# NAT

Covers source NAT (outbound), port forwarding (rdr), 1:1 (binat), IPv6 prefix translation (NPt), NAT reflection, and the order in which translation and filtering happen. The order is the part people get wrong.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

### Order of operations in pf (OPNsense and pfSense)

pf translates before it filters on the way in, and filters before it translates on the way out. Concretely, for a packet arriving on WAN destined for a port forward:

1. The inbound **rdr** (redirect) rule rewrites the destination to the internal host and port.
2. The **filter** rules then evaluate the packet with the destination already rewritten to the internal address.

This is why, on both products, the firewall rule that permits a port forward matches the **internal** IP and port, not the WAN address. The GUI hides this by offering to auto-create the matching filter rule when you build the port forward, but when you write the rule by hand you must target the translated (internal) destination. Getting this backwards, writing a WAN rule to the public IP, is the classic "my port forward does not work" cause.

Outbound is the mirror: the packet is filtered on the internal interface, routed, then **source-NAT'd** as it leaves WAN.

Because NAT bindings live in the **state** created for the flow, translation is stateful and return traffic is un-translated automatically against that state. Change a NAT rule and existing states keep their old binding until they expire.

### The four translation types

- **Outbound / source NAT**: rewrite the source address of traffic leaving an interface, usually to the WAN address, so private ranges can reach the internet. Many-to-one (PAT) by default via port rewriting.
- **Port forward / rdr / destination NAT**: rewrite the destination of inbound traffic to an internal host and port. One public socket to one internal socket.
- **1:1 / binat**: a bidirectional static map of one external address to one internal address, all ports. Outbound from that internal host uses the mapped external address, and inbound to the external address lands on the internal host. Used when a host needs a stable public identity.
- **NPt (IPv6 Network Prefix Translation)**: stateless one-to-one mapping of an IPv6 **prefix** to another prefix, address bits preserved. Not PAT. Used to present a stable internal ULA or prefix behind a changing delegated prefix, without the port-rewriting that IPv4 PAT implies. IPv6 is meant to be routed end to end, so NPt is a targeted tool, not a default.

### NAT reflection (hairpin)

When an internal host reaches your own public IP to hit a port-forwarded service, the request would normally go out to WAN and fail to come back. NAT reflection (hairpin NAT) rewrites that internal-to-public request so it loops back to the internal server. It has modes and caveats on every platform, and split DNS (an internal DNS answer that resolves the name straight to the internal IP) is usually the cleaner fix.

## OPNsense specifics (v, 26.7)

- Outbound: **Firewall > NAT > Outbound**. Modes: Automatic (rules follow your interfaces), Hybrid (automatic plus your manual rules on top, the usual choice), Manual, Disabled.
- Port forward: **Firewall > NAT > Port Forward**. The "Filter rule association" field auto-creates or links the matching filter rule; leaving it on "Pass" writes an associated rule that already targets the internal host.
- 1:1: **Firewall > NAT > One-to-One**.
- NPt: **Firewall > NAT > NPt**.
- Reflection: per-rule options on the port forward, plus global toggles under **Firewall > Settings > Advanced** (NAT reflection, automatic outbound helper). (v)

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- Outbound: **Firewall > NAT > Outbound**, same four modes (Automatic, Hybrid, Manual, Disabled).
- Port forward: **Firewall > NAT > Port Forward**, with a "Filter rule association" selector that will "Add associated filter rule" so the internal-targeted rule is created for you.
- 1:1: **Firewall > NAT > 1:1**.
- NPt: **Firewall > NAT > NPt**.
- Reflection: per-rule, plus **System > Advanced > Firewall & NAT** for the global NAT Reflection mode (Pure NAT, NAT + Proxy, Disable). (v)
- Plus Nexus GUI (v): the NAT pages are among those moving to the Go controller on 8443 during the transition. The pf mechanics above do not change; verify which GUI is live before quoting a path.

## UniFi specifics (v, Network 9.x)

UniFi does source NAT automatically for internet-bound traffic (WAN masquerade) with no rule to write in the normal case. What you configure is inbound.

- Port forwarding: **Settings > NAT** or the Port Forwarding page (path varies by minor, verify) (v). You define WAN port, forward IP, and forward port.
- The ZBF rule that trips people up: **on a gateway running ZBF, a port forward alone does not pass traffic.** The forward rewrites the destination, but the External-to-Internal (or External-to-DMZ) zone policy must also **allow** the now-translated flow. This is the same translate-then-filter order as pf, surfaced as two separate objects you must both create: the port forward and the matching zone policy. Build both or the service stays closed.
- 1:1 NAT and NPt: UniFi's exposure of static one-to-one and IPv6 prefix translation is limited and model-dependent; check the running version and gateway before promising it, and expect to drop to config for anything the GUI will not express. (v)
- Underneath: masquerade and DNAT live in nftables `nat` chains; `nft list ruleset` shows them if you need to confirm what the controller built.

## Cross-platform translation (quick view)

| NAT type | OPNsense / pfSense | UniFi |
|---|---|---|
| Source NAT for internet access | Firewall > NAT > Outbound (Hybrid) | Automatic WAN masquerade |
| Inbound service exposure | Firewall > NAT > Port Forward (+ auto filter rule) | Port forward **plus** an External-to-target zone allow policy |
| Static public identity for a host | Firewall > NAT > 1:1 (binat) | Limited, verify per model (v) |
| IPv6 prefix mapping | Firewall > NAT > NPt | Limited, verify per model (v) |
| Reach your own public IP from inside | NAT reflection / split DNS | Split DNS preferred; reflection support varies (v) |

The single portable lesson: translation happens before filtering on the way in, so the permitting rule always targets the internal, translated destination, and on UniFi ZBF that permitting rule is a separate policy you must not forget.
