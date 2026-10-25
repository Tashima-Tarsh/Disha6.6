# OSI Model and Core Protocols

Contents: the seven layers and encapsulation · OSI vs TCP/IP honestly · protocol mechanics by layer (ARP, ICMP, IPv4/IPv6, TCP, UDP, DNS, DHCP, TLS, application protocols) · layer-by-layer troubleshooting methodology.

## The seven layers, PDUs, and encapsulation

| # | Layer | PDU | Addressing / identity | Owns |
|---|---|---|---|---|
| 7 | Application | Data | — | Protocol semantics (HTTP methods, SMTP verbs, DNS queries) |
| 6 | Presentation | Data | — | Syntax: encoding, serialization, historically encryption |
| 5 | Session | Data | — | Dialog control, session establishment/teardown |
| 4 | Transport | Segment (TCP) / Datagram (UDP) | Port numbers | End-to-end delivery, multiplexing, (TCP) reliability & flow control |
| 3 | Network | Packet | IP address | Logical addressing, routing between networks |
| 2 | Data link | Frame | MAC address | Delivery on the local link, framing, error detection (FCS) |
| 1 | Physical | Bits/symbols | — | Signaling, media, connectors, line coding |

**Encapsulation, done precisely:** application data is handed to transport, which prepends a TCP/UDP header (data → segment); network prepends an IP header (segment → packet); data link prepends a header *and appends a trailer* — the frame check sequence (packet → frame); physical serializes the frame to bits/symbols. Each layer treats everything above it as opaque payload. Decapsulation reverses this hop by hop at layer 2 (frames are rewritten every hop; source/destination IPs normally survive end to end, MACs never do — the single most useful fact for reading a capture).

The layer boundaries are also the demultiplexing chain: EtherType (0x0800 IPv4, 0x86DD IPv6, 0x0806 ARP) tells L2 what L3 is; the IP protocol number (6 TCP, 17 UDP, 1 ICMP, 89 OSPF) tells L3 what's next; the port tells L4 which socket.

## OSI vs TCP/IP — the honest note

The TCP/IP model (Link, Internet, Transport, Application) is what the internet actually implements; OSI layers 5–7 collapse into "Application" because almost nothing on the wire distinguishes them. Session and presentation are teaching abstractions in modern practice: their functions exist (TLS does encryption and session-ish handshaking, serialization formats do presentation work) but no separate protocol layer performs them. Use the OSI model for what it's genuinely good at — a shared vocabulary for isolating faults ("that's a layer 2 problem") — and don't defend it as an implementation map. Devices refuse the boxes too: a "layer 2 switch" makes CAM-table decisions but speaks IP for management; a router ARPs (L2/L3 seam) and terminates BGP over TCP (L4). Where a device *forwards* is the layer we assign it; what it *does* is always several.

Teaching contexts (Network+, CCNA): teach the seven layers as the exam demands, then give students the paragraph above so the model survives their first packet capture.

## Protocols at their layers

### ARP (the L2/L3 seam)

Maps a known IPv4 address to an unknown MAC on the local link. Request is a broadcast (ff:ff:ff:ff:ff:ff) — "who has 192.0.2.10?" — reply is unicast from the owner. Entries cache (typically minutes; OS-dependent). **Gratuitous ARP** — announcing your own IP unrequested — updates neighbors' caches on failover (FHRPs and live migrations depend on it) and detects duplicates. ARP has no authentication; cache poisoning is the classic on-link MITM, which is why switches offer Dynamic ARP Inspection. Off-link destinations are never ARPed for directly: the host ARPs for its *gateway* — the mechanic behind "wrong subnet mask" pathologies. IPv6 replaces ARP with NDP (Neighbor Solicitation/Advertisement over ICMPv6, solicited-node multicast instead of broadcast).

### ICMP

L3's control channel (IP protocol 1; ICMPv6 is 58 and is load-bearing — NDP, PMTUD — so "block all ICMP" breaks IPv6 outright). Echo request/reply (type 8/0) is ping; Time Exceeded (11) is what traceroute harvests by walking TTL 1, 2, 3...; Destination Unreachable (3) carries the diagnostic codes, of which **code 4, Fragmentation Needed + DF set**, is the one that matters: it drives Path MTU Discovery, and filtering it creates the classic PMTUD black hole — small packets pass, bulk transfers hang.

### IPv4 and IPv6 addressing behavior

IPv4: 32-bit, mask-delimited network/host split; a host decides "on-link or via gateway" by ANDing destination with its own mask — mismatched masks between neighbors produce the one-way-traffic pattern where A can reach B but B ARPs futilely for A. Fragmentation exists but is hostile to performance and middleboxes; DF+PMTUD is the modern behavior. Broadcast exists (subnet-directed and 255.255.255.255).

IPv6: 128-bit; no broadcast — multicast and anycast replace it; interfaces hold multiple addresses natively (link-local fe80::/10 always present and used for routing protocol adjacencies and next hops, plus global). SLAAC lets hosts self-configure from RA-advertised prefixes; DHCPv6 coexists for stateful control. No fragmentation by routers, ever — sources must PMTUD, hence ICMPv6's protected status. On-link determination comes from RA prefix flags, not mask arithmetic.

Subnetting/VLSM mechanics live in the topology-design reference (addressing plans); the layer fact here: the mask is local policy that must agree between on-link neighbors, and nothing on the wire enforces that agreement.

### TCP

Connection-oriented byte stream. **Handshake:** SYN (client's initial sequence number) → SYN-ACK (server's ISN, ACK = client ISN+1) → ACK. SYN and FIN each consume one sequence number; data bytes consume one each — that's the entire sequencing model: every byte has a number, ACKs are cumulative ("I have everything below N"), SACK options patch the holes cumulative ACKs can't express.

**Windowing:** the receiver advertises a window (its buffer headroom) — flow control; the sender additionally maintains a congestion window (slow start, congestion avoidance; algorithm varies — Reno/CUBIC/BBR differ meaningfully) — congestion control. Effective send rate ≈ min(rwnd, cwnd)/RTT. The 16-bit window field caps at 64 KB without the window-scale option — negotiated only in the handshake, which is why mid-stream "fixes" can't help a badly opened connection.

**Teardown:** four segments — FIN, ACK, FIN, ACK — each side closes independently (half-close is legal). The side closing first holds TIME_WAIT (2×MSL) to absorb stragglers; port-exhaustion via TIME_WAIT pileup is a real server pathology. RST aborts without ceremony.

**Common pathologies worth naming:** retransmission timeouts vs fast retransmit (3 dup-ACKs); MSS/MTU black holes (see ICMP above — hangs exactly at the first full-size segment, so the handshake succeeds and the transfer stalls, a signature worth memorizing); silly window syndrome; Nagle vs delayed-ACK interaction (200 ms stalls in chatty request/response protocols); half-open connections after asymmetric failure.

### UDP and when each is right

UDP: 8-byte header — ports, length, checksum — and no promises: no ordering, no retransmission, no flow or congestion control, no connection state. Right when the application can't use TCP's repairs (real-time voice/video, where a retransmitted packet arrives too late to play), does its own reliability (QUIC — which is why HTTP/3 rides UDP), or exchanges single small request/response pairs where a handshake triples the cost (DNS, NTP, SNMP, DHCP). TCP is right for anything that must arrive completely and in order and can tolerate latency variance: files, mail, most APIs. The trade is stated in one line: TCP spends latency and state to buy delivery guarantees; UDP refuses the purchase and hands the problem to the application.

### DNS resolution walk-through

Stub resolver (the host) sends a recursive query to its configured resolver (port 53, UDP first; TCP for truncated responses and zone transfers; EDNS0 extends the old 512-byte UDP limit). The recursive resolver, on a cold cache, iterates: root servers → referral to the TLD servers (.com) → referral to the domain's authoritative servers → answer. Every response carries a TTL and is cached at the resolver (and OS, and browser), so the full walk is rare. Records to know: A/AAAA (address), CNAME (alias — the resolver restarts the query at the canonical name), MX, NS, PTR (reverse), SOA, TXT. Negative answers (NXDOMAIN) cache too, per the SOA minimum. Split-horizon DNS serves different answers by query source — remember it exists before declaring records "wrong." DNSSEC signs records; it authenticates, it does not encrypt (DoT/DoH do that, and relocate whose resolver sees your queries).

### DHCP — DORA

Discover (client broadcast, UDP 68→67, source 0.0.0.0) → Offer (server proposes address + options) → Request (client broadcasts acceptance of one offer — broadcast so losing servers withdraw) → Ack (lease confirmed: address, mask, gateway, DNS, lease time). Renewal is unicast to the leasing server at T1 (50% of lease), broadcast rebind at T2 (87.5%). Because Discover is a broadcast, it dies at the router: remote-subnet DHCP requires a **relay** (`ip helper-address` on IOS-XE) that unicasts client broadcasts to the server with the relay's interface address in giaddr — which is also how the server picks the right scope. Rogue-server defense is DHCP snooping at the switch.

### TLS — and where it actually sits

TLS wraps a reliable transport (normally TCP; DTLS adapts it to UDP; QUIC integrates TLS 1.3 directly) and offers the application an encrypted, authenticated byte stream. In OSI terms it straddles 5/6 — session establishment plus presentation-layer cryptography — which is exactly why the honest answer to "what layer is TLS?" is "between transport and application; the OSI slots are a retrofit." TLS 1.3 (RFC 8446): one-RTT handshake — ClientHello (key shares) → ServerHello + certificate + Finished → Finished — with ephemeral key exchange mandatory (forward secrecy) and the legacy renegotiation/compression removed. The certificate authenticates the server against the client's trusted CAs; SNI in the ClientHello names the intended host (encrypted only with ECH, still in deployment — flag for verification if currency matters).

### Common application protocols, placed

HTTP/1.1 and /2 over TCP 443 via TLS (80 clear), HTTP/3 over QUIC/UDP 443; SSH TCP 22; SMTP 25 (server-to-server) / 587 submission; IMAP 993/POP3 995; NTP UDP 123; SNMP UDP 161/162; syslog UDP 514 (TCP/TLS variants exist); FTP's two-channel design (control 21 + separate data channel) survives mainly as a firewall lesson.

## Layer-by-layer troubleshooting — the diagnostic backbone

Three sweep strategies; choosing correctly is the skill:

- **Bottom-up** (physical → application): when there's no connectivity at all, or the failure is total. Link lights, interface counters (`show interface` — CRC errors say L1/duplex, drops say congestion), then ARP/MAC tables, then IP reachability, then ports, then the app. Cost: slow; it front-loads work that's wasted if the transport is obviously fine.
- **Top-down** (application → physical): when *something* works — the user reaches some sites, some services. Start at the failing application, walk down. Cost: painful without access to the application layer's own diagnostics.
- **Divide-and-conquer**: start at the layer the symptom implicates — almost always L3, with ping — and let the result choose a direction. Ping by IP succeeds but by name fails: go up (DNS). Ping fails: go down (route, ARP, link). This is the default for experienced engineers because one test halves the search space.

Symptom → layer mappings that pay rent: "can ping but can't resolve" → L7/DNS path, not the network; "can resolve but can't connect" → L4 (filtering, service down, wrong port); "works one direction only" → asymmetric routing, ACL, or mask mismatch (see IPv4 above); "small transfers fine, large ones hang" → MTU/PMTUD; "intermittent, correlates with load" → congestion drops or duplex mismatch (CRC + late collisions = duplex, a diagnosis you can make from counters alone); "flapping adjacency" → L1 errors or timer/MTU mismatch at the protocol seam.

Method rules regardless of strategy: change one variable per test; test from both ends before blaming the middle; trust counters over narratives; and when the capture and the diagram disagree, the diagram is wrong.
