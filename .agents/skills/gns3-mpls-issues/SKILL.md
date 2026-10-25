---
name: "MPLS/LDP/VPN Issues Injection"
description: "MPLS, LDP and MPLS L3VPN related network faults for troubleshooting practice"
category: "computer-networking"
---

# MPLS/LDP/VPN Issues Injection

MPLS, LDP and MPLS L3VPN related network faults for troubleshooting practice

## Supported Protocols
- mpls
- ldp
- mpls-vpn

## Fault Injection Scenarios & Troubleshooting Procedures

### LDP Neighbor Session Failure (Severity: HIGH)

Configure LDP with mismatched transport address, authentication, or label space

**Diagnostic Symptoms:**
- LDP session fails to establish between MPLS routers
- No label bindings exchanged
- MPLS forwarding fails
- LDP stuck in INIT state

**Troubleshooting Commands & Remediation:**
- `Check LDP neighbor with 'show mpls ldp neighbor'`
- `Verify LDP transport address matches routing`
- `Check LDP authentication with 'show mpls ldp neighbor detail'`
- `Ensure LDP router-id is reachable via IGP`
- `Check for 'mpls ldp password' mismatch`
- `Verify label space compatibility (per-platform vs per-interface)`

### MPLS Label Forwarding Failure (Severity: HIGH)

Configure incorrect label forwarding causing MPLS traffic to be dropped or forwarded incorrectly

**Diagnostic Symptoms:**
- MPLS ping/test failure
- Traffic dropped at LSR
- Label switched path broken
- TTL expired in transit

**Troubleshooting Commands & Remediation:**
- `Check MPLS forwarding table with 'show mpls forwarding-table'`
- `Use 'ping mpls ipv4 <prefix>' to test LSP`
- `Check 'show mpls lsp' for LSP status`
- `Verify label operations (swap/push/pop) at each hop`
- `Check for missing labels in LFIB`
- `Use 'traceroute mpls' to trace LSP path`

### MPLS Explicit Null Misconfiguration (Severity: MEDIUM)

Configure MPLS with wrong explicit null setting causing PHP to fail

**Diagnostic Symptoms:**
- Penultimate hop popping fails
- Extra lookup required at egress router
- MPLS performance degradation
- PHP not working as expected

**Troubleshooting Commands & Remediation:**
- `Check 'mpls ip propagate-forwarded' or BGP label configuration`
- `Explicit null (label 0) signals PHP capability`
- `Verify 'bgp send-label' includes explicit-null`
- `Use 'show mpls forwarding-table' to check for implicit-null`
- `Egress LSR must pop implicit null label`
- `MPLS PHP reduces lookup on egress LSR`

### MPLS VPN Route Target Mismatch (Severity: HIGH)

Configure mismatched route targets (import/export) between PE routers

**Diagnostic Symptoms:**
- VPN routes not exchanged between PE routers
- VRF route leaking not working
- MPLS L3VPN partial connectivity
- Route distinguisher not imported

**Troubleshooting Commands & Remediation:**
- `Check VRF route targets with 'show bgp vpnv4 rd <rd>'`
- `Verify route-target import/export communities match`
- `Route target format: <asn>:<vpn-id> (type 0) or <ipv4>:<vpn-id> (type 1)`
- `Import requires matching export from remote PE`
- `Check 'show ip route vrf <vrf>' for VPN routes`
- `Verify 'address-family vpnv4/vpnv6' is activated`

### LDP Discovery (Hello) Failure (Severity: HIGH)

Configure LDP discovery mechanism incorrectly, preventing LDP hello messages from reaching potential neighbors

**Diagnostic Symptoms:**
- LDP neighbors not discovered on directly connected links
- No LDP Hellos (UDP 646) exchanged
- LDP session not initiating
- Label bindings not distributed

**Troubleshooting Commands & Remediation:**
- `LDP Hellos sent via UDP multicast (224.0.0.2) on port 646`
- `Check 'debug mpls ldp bindings' for hello exchange`
- `Verify 'mpls ip' is enabled on interfaces`
- `ACL blocking UDP 646 (LDP Hellos) or TCP 646 (LDP session)`
- `LDP router-id must be reachable from peer`
- `Check 'show mpls ldp discovery' for neighbor discoveries`

### LDP Session Protection / Hold Timer Issue (Severity: MEDIUM)

Configure LDP session hold timer or session protection incorrectly, causing LDP session flapping on link events

**Diagnostic Symptoms:**
- LDP session flaps when interface goes down and comes up
- MPLS forwarding disrupted during LDP reconvergence
- LDP session hold timer expiring too quickly
- Label bindings lost unnecessarily during link flapping

**Troubleshooting Commands & Remediation:**
- `LDP session hold timer default: 180 seconds`
- `Use 'mpls ldp holdtime <seconds>' to adjust`
- `LDP session protection: maintains LDP session even if link down`
- `Use 'mpls ldp session protection [duration <secs>]'`
- `Session protection prevents label loss during brief outages`
- `Check 'show mpls ldp neighbor detail' for session protection status`

### LDP/IGP Synchronization Failure (Severity: HIGH)

Configure LDP IGP synchronization incorrectly, causing MPLS traffic to be dropped until label binding propagates

**Diagnostic Symptoms:**
- IP reachability via IGP but MPLS label path not ready
- Traffic dropped at MPLS label imposition points
- MPLS LSP not complete despite IGP convergence
- LDP synchronization delaying MPLS traffic

**Troubleshooting Commands & Remediation:**
- `LDP IGP sync: IGP advertises link with high metric until LDP converges`
- `Use 'mpls ldp igp sync' on OSPF or IS-IS interfaces`
- `Check 'show mpls ldp igp sync' for sync status`
- `Without sync: IP traffic flows but MPLS may blackhole`
- `Sync ensures IGP and LDP are consistent before forwarding`
- `Disable with 'mpls ldp igp sync disable' on specific interfaces`

### LDP Label Advertisement Control / Label Filter (Severity: HIGH)

Configure LDP label filtering incorrectly, blocking legitimate label advertisements

**Diagnostic Symptoms:**
- MPLS label missing for specific prefixes despite LDP session up
- Label bindings not advertised for certain FECs
- Incomplete LFIB causing forwarding failures
- Label filtering ACL/prefix-list matching wrong prefixes

**Troubleshooting Commands & Remediation:**
- `Use 'mpls ldp advertise-labels' to control label advertisement`
- `Use 'mpls ldp label-for-ace' to filter labels`
- `Label filters can block specific prefixes from label binding`
- `Check 'show mpls ldp bindings' for missing label entries`
- `Use 'for [acl]' or 'to [acl]' to control label scope`
- `Default: advertise labels for all FECs in routing table`

### LDP Graceful Restart Capability Mismatch (Severity: MEDIUM)

Configure LDP graceful restart incorrectly, causing label forwarding table to be flushed during LDP restart

**Diagnostic Symptoms:**
- MPLS forwarding stops during LDP restart
- Label bindings immediately deleted on session failure
- LDP graceful restart helper not preserving stale labels
- LDP NSR (Non-Stop Routing) not functioning

**Troubleshooting Commands & Remediation:**
- `LDP graceful restart preserves labels during control plane restart`
- `Use 'mpls ldp graceful-restart' to enable`
- `Forwarding preserves stale labels until reconvergence`
- `Recovery timer: how long to wait before deleting stale labels`
- `Check 'show mpls ldp parameters' for graceful restart settings`
- `Both peers must support graceful restart for it to function`

### MPLS TTL Propagation / Uniform Model Issue (Severity: MEDIUM)

Configure MPLS TTL propagation incorrectly, causing traceroute to not show MPLS hops or hide network topology

**Diagnostic Symptoms:**
- Traceroute does not show MPLS LSR hops
- MPLS TTL expiry packets not generated
- Uniform vs pipe model confusion
- IP TTL propagation unexpected behavior

**Troubleshooting Commands & Remediation:**
- `Default: IP TTL copied into MPLS label header (uniform model)`
- `Use 'no mpls ip propagate-ttl' for pipe model (hide MPLS core)`
- `Pipe model: TTL decremented only in MPLS domain, not IP TTL`
- `Uniform model: TTL consistent across IP and MPLS domains`
- `Check 'show mpls forwarding-table' for TTL propagation config`
- `Pipe model common in service provider MPLS core`

### MPLS MTU / Label Stack Depth Fragmentation Issue (Severity: HIGH)

Configure interface MTU too small for MPLS label stack, causing packet drops when labels pushed

**Diagnostic Symptoms:**
- Large packets dropped in MPLS core
- PMTUD failure through MPLS network
- DF bit set packets dropped with MPLS label push
- MPLS label stack exceeding interface MTU

**Troubleshooting Commands & Remediation:**
- `Each MPLS label adds 4 bytes per label`
- `VPN: 2 labels (transport + VPN), TE: 3+ labels possible`
- `Use 'mpls mtu <bytes>' on interfaces for larger MTU`
- `Set interface MTU = IP MTU + label stack overhead`
- `Check 'show mpls forwarding-table' for label stack depth`
- `Common issue: GRE/IPsec tunnels within MPLS (additional overhead)`

### MPLS ECMP Load Balancing Failure (Severity: MEDIUM)

Configure MPLS with multiple equal-cost paths but load balancing not working for MPLS traffic

**Diagnostic Symptoms:**
- Uneven traffic distribution across MPLS LSPs
- Only one path utilized despite multiple ECMP paths
- MPLS ECMP load balancing not functioning
- Traffic polarization on specific LSRs

**Troubleshooting Commands & Remediation:**
- `MPLS ECMP: LSR can load balance across multiple LSPs`
- `Check 'show mpls forwarding-table <prefix>' for multiple paths`
- `Load balancing hash based on label stack + IP header`
- `Entropy label (RFC 6790) improves ECMP distribution`
- `Check for traffic polarization (same hash across hops)`
- `Use 'mpls load-sharing' algorithms on supporting platforms`

### MPLS LSP End-to-End Verification Failure (Severity: HIGH)

Configure MPLS LSP (Label Switched Path) but LSP ping/traceroute fails to reach destination

**Diagnostic Symptoms:**
- 'ping mpls' fails to reach destination
- LSP traceroute incomplete
- Return path LSP issues
- LSP broken at intermediate LSR

**Troubleshooting Commands & Remediation:**
- `Use 'ping mpls ipv4 <prefix>' to test LSP reachability`
- `Use 'traceroute mpls ipv4 <prefix> ttl <max>' to trace LSP`
- `LSP ping tests both forward and possibly reverse path`
- `Check 'show mpls forwarding-table <prefix>' on each LSR`
- `Use 'show mpls forwarding-table labels <label>' for label info`
- `For MPLS-TE: use 'ping mpls traffic-eng <tunnel>'`

### MPLS Label Stack Depth / Multiple Labels Issue (Severity: MEDIUM)

Configure MPLS with too many labels in stack (VPN+TE+FRR) exceeding platform label depth or interface MTU

**Diagnostic Symptoms:**
- Deep label stack causing packet drops
- Platform label imposition depth limit exceeded
- MPLS performance issues with deep label stacks
- Hardware inability to push more than N labels

**Troubleshooting Commands & Remediation:**
- `Three+ label layers: transport(LDP), VPN(BGP), TE, FRR, entropy`
- `Platforms have label imposition depth limits`
- `Check 'show mpls forwarding-table' for effective label stack`
- `Use 'show platform mpls' for hardware label capacity`
- `Reduce labels: PHP removes outer label, explicit-null adds one`
- `Entropy labels add an additional label to the stack`

### MPLS VPN PE-CE Route Redistribution Issue (Severity: HIGH)

Configure PE-CE routing protocol redistribution into/out-of VRF incorrectly, causing missing or incorrect routes

**Diagnostic Symptoms:**
- CE routes not appearing in VRF on remote PE
- PE-CE protocol (eBGP/OSPF/EIGRP) not redistributed into VPN
- Missing 'redistribute' under VRF address family
- CE routes present on local PE but not propagated

**Troubleshooting Commands & Remediation:**
- `PE-CE routes must be redistributed into MP-BGP for VPN propagation`
- `Use 'address-family ipv4 vrf <name>' then 'redistribute <protocol>'`
- `For OSPF: OSPF routes redistributed into BGP with domain-tag`
- `Use 'network' command under VRF address family for specific prefixes`
- `Check 'show bgp vpnv4 vrf <name>' for VRF routes in BGP`
- `Verify backdoor routes not blockingMP-BGP redistribution`

### MPLS VPN Label Allocation Mode Issue (Severity: MEDIUM)

Configure VPN label allocation mode (per-VRF vs per-prefix) incorrectly, causing label scaling or forwarding issues

**Diagnostic Symptoms:**
- Too many MPLS labels allocated in large VPN deployment
- Per-VRF label mode causes aggregation issues
- Per-prefix label mode consumes excessive label space
- Label allocation not matching expected behavior

**Troubleshooting Commands & Remediation:**
- `Per-VRF: all routes in VRF share same label (scalable)`
- `Per-prefix: each prefix gets unique label (more specific)`
- `Use 'label mode per-vrf' or 'label mode per-prefix' under VRF`
- `Per-prefix needed for EFP (Explicit Forwarding Path)`
- `Check 'show mpls forwarding-table vrf <name>' for label count`
- `Per-VRF default on most platforms`

### MPLS VPN OSPF Sham-Link Configuration Error (Severity: HIGH)

Configure OSPF sham-link in MPLS VPN incorrectly, causing suboptimal OSPF backdoor routing

**Diagnostic Symptoms:**
- OSPF backdoor link preferred over MPLS VPN path
- Suboptimal routing between OSPF sites connected via MPLS
- Sham-link not forming between PE routers
- OSPF intra-area route not preferring MPLS path

**Troubleshooting Commands & Remediation:**
- `Sham-link needed when OSPF backdoor link exists between VPN sites`
- `Sham-link endpoint: /32 addresses in OSPF, not BGP-advertised`
- `Use 'area <id> sham-link <local-ip> <remote-ip>'`
- `Sham-link cost sets OSPF metric for MPLS path`
- `Sham-link makes MPLS path appear as intra-area route`
- `Check 'show ip ospf sham-links' for sham-link status`

### MPLS AAll Registration / Label Manager Issue (Severity: CRITICAL)

Configure MPLS label manager incorrectly or label space exhaustion, preventing new label allocation

**Diagnostic Symptoms:**
- MPLS labels not allocated for new FECs
- Label allocation failures in logs
- Dynamic label space (0-100000) exhausted
- MPLS forwarding entries not programmed

**Troubleshooting Commands & Remediation:**
- `Check 'show mpls label table' for label space utilization`
- `Dynamic label range: 16-100000 (per-platform or per-interface)`
- `Per-platform labels: same label for all LDP peers`
- `Check 'show mpls forwarding-table summary' for total entries`
- `Label space exhaustion in large-scale MPLS networks`
- `Use 'show mpls label table summary' for utilization stats`

### MPLS QoS / EXP Bit Misconfiguration (Severity: MEDIUM)

Configure MPLS EXP (Experimental) bits incorrectly for QoS, causing incorrect traffic prioritization in MPLS core

**Diagnostic Symptoms:**
- QoS markings not preserved across MPLS label operations
- MPLS EXP bits not copied correctly at label swap/push
- Different traffic classes receiving same treatment in MPLS core
- MPLS QoS policy not matching EXP-based classification

**Troubleshooting Commands & Remediation:**
- `MPLS EXP bits (3 bits) carry QoS information in label header`
- `Use 'mpls qos' to copy IP DSCP to MPLS EXP at imposition`
- `EXP bits preserved/modified at each LSR hop`
- `Check 'show mpls forwarding-table <prefix>' for EXP mapping`
- `Use 'set mpls experimental <value>' in route-maps for BGP`
- `MPLS QoS policies use EXP bits for classification at mid-points`

### MPLS LFIB Programming / Hardware Resource Issue (Severity: HIGH)

Configure MPLS forwarding but LFIB (Label Forwarding Information Base) not programmed in hardware

**Diagnostic Symptoms:**
- MPLS labels assigned in control plane but not programmed in hardware
- 'show mpls forwarding-table' shows entries but traffic not forwarded
- Software forwarding used instead of hardware
- TCAM/Label memory exhaustion

**Troubleshooting Commands & Remediation:**
- `Check 'show mpls forwarding-table' for hardware vs software entries`
- `Hardware label memory limited on some platforms`
- `Use 'show platform hardware' for TCAM utilization`
- `Reduce label count: per-VRF label mode, summarization`
- `Use 'show controllers forwarding-option' for hardware status`
- `Check for error messages in 'show logging' about hardware programming`

### LDP Session MD5 Authentication Mismatch (Severity: HIGH)

Configure LDP MD5 authentication with mismatched passwords between LDP peers, preventing TCP connection

**Diagnostic Symptoms:**
- LDP TCP session fails to establish
- LDP stuck in INIT state
- TCP MD5 signature mismatch
- No label bindings exchanged

**Troubleshooting Commands & Remediation:**
- `LDP uses TCP port 646 for session establishment`
- `Use 'mpls ldp password <password>' under LDP neighbor`
- `Password must match on both LDP peers`
- `Check 'show mpls ldp neighbor detail' for auth status`
- `LDP MD5 secures the TCP connection (not labels)`
- `Changing password requires clearing existing LDP session`

### LDP Targeted Hello / Session Establishment Failure (Severity: HIGH)

Configure LDP targeted session (non-directly connected peers) but discovery or transport address fails

**Diagnostic Symptoms:**
- LDP session not establishing between non-directly connected peers
- LDP targeted hellos not exchanged
- LDP router-id unreachable
- LDP session over loopbacks not working

**Troubleshooting Commands & Remediation:**
- `LDP targeted hellos sent via unicast UDP to specific IP`
- `Use 'mpls ldp neighbor <ip> targeted' for explicit targeted peers`
- `LDP router-id must be reachable via IGP`
- `Targeted sessions survive interface failures (session protection)`
- `Check 'show mpls ldp discovery' for targeted hello status`
- `For MPLS TE tunnels: targeted LDP over TE tunnel required`

### LDP Label Retention Mode / Label Withdrawal Issue (Severity: MEDIUM)

Configure LDP label retention mode (liberal vs conservative) incorrectly, causing excessive label memory or slow convergence

**Diagnostic Symptoms:**
- Excessive number of labels in LFIB (no free labels)
- Labels not retained for non-adjacent LSRs causing slow convergence
- Label retention mode mismatch between peers
- Label withdrawal not propagated correctly

**Troubleshooting Commands & Remediation:**
- `Liberal retention (default): retain all labels from all LDP peers`
- `Conservative retention: only retain labels from next-hop LSR`
- `Liberal: faster convergence, uses more label space`
- `Conservative: saves label space, slower convergence`
- `Use 'show mpls ldp parameters' for label retention mode`
- `Label retention is a per-platform setting`

### LDP Label Withdrawal / Binding Loss (Severity: HIGH)

Configure interface or route changes causing LDP to withdraw labels prematurely, breaking MPLS forwarding

**Diagnostic Symptoms:**
- LDP labels withdrawn for specific FECs
- MPLS forwarding entries removed
- Traffic blackholed despite IGP convergence
- Label bindings disappearing intermittently

**Troubleshooting Commands & Remediation:**
- `LDP withdraws label when FEC route removed from routing table`
- `Check 'show mpls ldp bindings' for withdrawn labels`
- `'show mpls ldp neighbor' for session status`
- `LDP session flap causes label withdrawal for all FECs`
- `Use LDP session protection to prevent unnecessary withdrawals`
- `IGP route stability critical for stable LDP label bindings`

### LDP Dual-Stack (IPv4/IPv6) Interworking Issue (Severity: HIGH)

Configure LDP for dual-stack (both IPv4 and IPv6) but IPv6 FEC label bindings missing or not exchanged

**Diagnostic Symptoms:**
- IPv6 MPLS LSP not established
- LDP IPv6 FECs not advertised
- Dual-stack LDP session not negotiating IPv6 address family
- IPv6 prefixes missing from LDP bindings

**Troubleshooting Commands & Remediation:**
- `LDP dual-stack (RFC 5561): LDP capability for IPv4+IPv6 FECs`
- `Use 'mpls ldp address-family ipv6' configuration`
- `Check 'show mpls ldp capabilities' for dual-stack support`
- `LDP session must negotiate both IPv4 and IPv6 address families`
- `IGP must have IPv6 routes for LDP to allocate labels`
- `Common in 6PE and 6VPE deployments`

### LDP Auto-Configuration / Interface Error (Severity: HIGH)

Configure LDP auto-configuration on IGP interface but LDP not enabled automatically or misapplied

**Diagnostic Symptoms:**
- LDP not enabled on interface despite auto-config
- Some interfaces missing LDP enablement
- Auto-config not working with passive-interfaces
- LDP enabled on wrong set of interfaces

**Troubleshooting Commands & Remediation:**
- `IS-IS: 'mpls ldp auto-config' under router isis`
- `OSPF: 'mpls ldp auto-config' under router ospf`
- `Auto-config enables LDP on all IGP-enabled interfaces`
- `Use 'mpls ldp igp autoconfig disable' on specific interfaces`
- `Check 'show mpls ldp discovery' for auto-enabled interfaces`
- `Auto-config simplifies deployment but lacks granularity`

### MPLS TTL Expired ICMP Generation Failure (Severity: MEDIUM)

Configure MPLS but TTL-expired ICMP messages not generated by LSR, breaking traceroute

**Diagnostic Symptoms:**
- Traceroute shows asterisks at intermediate LSRs
- ICMP TTL exceeded not generated for MPLS packets
- Path characterization impossible through MPLS core
- MPLS TTL expiry handled incorrectly

**Troubleshooting Commands & Remediation:**
- `LSR generates ICMP TTL exceeded when MPLS TTL=1`
- `ICMP generated only if LSR has IP routing to source`
- `Check 'show mpls forwarding-table' for ICMP generation config`
- `Pipe model: 'no mpls ip propagate-ttl' affects ICMP generation`
- `ICMP generation issues in MPLS with no route to source`
- `Use 'ping mpls ipv4 <prefix>' as alternative traceroute method`

### BFD over MPLS / LSP BFD Failure (Severity: HIGH)

Configure BFD over MPLS LSP but BFD session fails to establish or LSP ping mismatch

**Diagnostic Symptoms:**
- BFD over MPLS LSP not establishing
- LSP BFD session flapping
- MPLS fast failure detection not working
- BFD discriminator mismatch in MPLS network

**Troubleshooting Commands & Remediation:**
- `BFD over MPLS LSP (RFC 5884): BFD control packets in MPLS label stack`
- `BFD target: IP address of egress LSR`
- `Check 'show bfd neighbors' for BFD over MPLS sessions`
- `BFD discriminator must match on both ends`
- `Bidirectional LSP needed (or BFD echo mode)`
- `Use 'bfd-map interface' for BFD policy mapping`

### MPLS GAL / G-ACh Channel Configuration Error (Severity: MEDIUM)

Configure MPLS Generic Associated Channel (G-ACh) incorrectly, preventing VCCV/BFD or OAM over LSP

**Diagnostic Symptoms:**
- VCCV (Virtual Circuit Connectivity Verification) not working
- G-ACh not signaled in label binding
- BFD over LSP not functioning
- MPLS OAM channel not established

**Troubleshooting Commands & Remediation:**
- `GAL (G-ACh Label, label 13) signals G-ACh channel presence`
- `G-ACh carries OAM packets like BFD, VCCV, NTP`
- `Check 'show mpls forwarding-table labels 13' for GAL support`
- `GAL must be understood by all intermediate LSRs`
- `VCCV uses G-ACh for L2VPN connectivity verification`
- `Not all platforms support GAL/G-ACh in hardware`

### MPLS VPN Hub-and-Spoke Topology Error (Severity: HIGH)

Configure MPLS VPN hub-and-spoke topology incorrectly, allowing spoke-to-spoke direct communication instead of via hub

**Diagnostic Symptoms:**
- Spoke-to-spoke direct path used instead of hub
- RT import/export not enforcing hub-and-spoke model
- Spoke routes imported directly by other spokes
- Hub not receiving control traffic between spokes

**Troubleshooting Commands & Remediation:**
- `Hub RT: export spoke-RT, import spoke-RT + hub-RT`
- `Spoke RT: export spoke-RT, import hub-RT only`
- `Check 'show bgp vpnv4 vrf <name>' for imported routes`
- `Spoke must NOT import spoke-RT from other spokes`
- `Use separate route-targets for hub and spoke`
- `Verify import/export RT configuration on each VRF`

### MPLS VPN AS-Override / Site-of-Origin Error (Severity: HIGH)

Configure MPLS VPN with AS-override or Site-of-Origin incorrectly, causing route acceptance/rejection problems

**Diagnostic Symptoms:**
- CE receiving routes with own AS in AS path
- Routes rejected due to AS loop detection
- SoO preventing legitimate route advertisement
- Duplicate AS numbers in BGP path from MPLS VPN

**Troubleshooting Commands & Remediation:**
- `AS-override: replaces CE's AS with PE's AS in AS path`
- `Use 'neighbor <ce-ip> as-override' on PE`
- `SoO (Site-of-Origin): prevents routing loops for multi-homed CE`
- `Use 'neighbor <ce-ip> soo <ext-community>'`
- `Check route-target filtering with SoO enabled`
- `Common in MPLS VPN with overlapping customer AS numbers`

### MPLS VPN Extranet / VRF Route Leaking Misconfiguration (Severity: HIGH)

Configure MPLS VPN extranet (cross-VRF route leaking) incorrectly, exposing wrong sets of routes between VRFs

**Diagnostic Symptoms:**
- Routes from VRF A not appearing in VRF B despite extranet config
- Unintended VRF routes leaking to external customer
- Partial extranet connectivity working intermittently
- Route-target mismatch causing import/export failures

**Troubleshooting Commands & Remediation:**
- `Extranet: RT of VRF A exported with RT that VRF B imports`
- `Use separate RT values for each VRF's extranet policy`
- `Check 'show ip route vrf <name>' for extranet routes`
- `Extranet supports selective route sharing between VRFs`
- `Use 'import map' on VRF for controlled route import`
- `Verify RT values used for extranet do not conflict with regular VPN RTs`

### BGP VRF Select (Source-Based VRF Selection) Error (Severity: HIGH)

Configure BGP VRF Select incorrectly, failing to select the correct VRF based on source IP or other match criteria

**Diagnostic Symptoms:**
- Traffic from certain sources not mapped to correct VRF
- VRF selection based on source IP not working
- Default VRF used when specific VRF should be selected
- VRF selection policy not matching intended traffic

**Troubleshooting Commands & Remediation:**
- `VRF Select (Cisco): 'bgp vrf-select' with match criteria`
- `Based on source IP ACL, QoS policy, or physical port`
- `Default VRF used if no VRF Select policy matches`
- `Check 'show ip vrf' for VRF Select configuration`
- `Alternative: policy-based routing (PBR) to VRF`
- `VRF Select allows multi-tenant/hosting with shared CEs`

### MPLS VPN Route Target Filter Restriction (Severity: HIGH)

Configure BGP route-target filter incorrectly on PE, blocking VPN route import that should be accepted

**Diagnostic Symptoms:**
- VPN routes present in BGP but not imported into VRF
- Route target filter blocking legitimate routes
- PE not importing routes for expected RTs
- 'show bgp vpnv4 unicast all' shows routes but VRF empty

**Troubleshooting Commands & Remediation:**
- `PE uses RT filter to determine which VPN routes to accept`
- `Default: only accepts routes with RT matching configured VRFs`
- `Use 'no bgp default route-target filter' to accept all VPN routes`
- `Check 'show bgp vpnv4 unicast all' for filtered routes`
- `RT filter reduces BGP table size on PE`
- `Use 'show ip bgp community-list <name>' for RT verification`

### MPLS Label Conflict / Duplicate Label Allocation (Severity: CRITICAL)

Configure MPLS labels overlapping or conflicting between static, dynamic, and SRGB label ranges

**Diagnostic Symptoms:**
- Label allocation failures or conflicts
- Duplicate label values in label table
- MPLS forwarding errors due to label overlap
- Static labels conflicting with dynamic label ranges

**Troubleshooting Commands & Remediation:**
- `Label ranges: dynamic (16-100000), static (16-8000), SRGB (16000+ varied)`
- `Check 'show mpls label table' for label allocation conflicts`
- `Use 'mpls label range <min> <max>' for dynamic label space`
- `SRGB must not overlap with dynamic label range`
- `Static labels assigned explicitly via 'mpls static label' commands`
- `Label conflict causes forwarding errors on intermediate LSRs`

### MPLS Convergence / ECMP Path Failure Convergence Delay (Severity: HIGH)

Configure MPLS network where link failure causes slow ECMP path convergence for MPLS traffic

**Diagnostic Symptoms:**
- MPLS traffic blackholed after link failure despite ECMP
- Slow recovery of MPLS forwarding after IGP convergence
- LDP convergence slower than IGP convergence
- Traffic dropped while LDP re-converges

**Troubleshooting Commands & Remediation:**
- `LDP convergence must follow IGP convergence for label bindings`
- `Use LDP IGP synchronization to avoid MPLS blackholing`
- `Check 'show mpls forwarding-table' for path count after failure`
- `LDP session protection helps during brief IGP outages`
- `MPLS Fast Reroute (FRR) provides sub-50ms protection`
- `Use 'mpls ldp igp sync' to prevent MPLS forwarding before LDP converges`

### MPLS UDP LDP / Inter-AS Option B LDP Discovery Issue (Severity: MEDIUM)

Configure LDP hello over UDP for targeted sessions but hello not reaching remote LDP peer due to firewall or routing issues

**Diagnostic Symptoms:**
- LDP discovery fails across non-routed segments
- LDP targeted hellos dropped by firewall
- UDP 646 not reaching LDP peer
- LDP session cannot establish via targeted discovery

**Troubleshooting Commands & Remediation:**
- `LDP discovery uses UDP 646 (hello), session uses TCP 646`
- `Both UDP and TCP 646 must be permitted in firewall/ACL`
- `Targeted LDP hellos sent to specific peer IP (unicast UDP)`
- `Link LDP hellos sent to 224.0.0.2 multicast (LDP discovery)`
- `Check 'show mpls ldp discovery' for targeted hello status`
- `Filtered UDP 646 prevents LDP neighbor discovery`

