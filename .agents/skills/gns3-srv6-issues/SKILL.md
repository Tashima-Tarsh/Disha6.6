---
name: "SRv6 Issues Injection"
description: "Segment Routing over IPv6 (SRv6) related network faults for troubleshooting practice"
category: "computer-networking"
---

# SRv6 Issues Injection

Segment Routing over IPv6 (SRv6) related network faults for troubleshooting practice

## Supported Protocols
- srv6
- segment-routing
- ipv6
- isis
- ospfv3
- bgp

## Fault Injection Scenarios & Troubleshooting Procedures

### SRv6 Locator Prefix Overlap / Allocation Conflict (Severity: CRITICAL)

Configure SRv6 locator prefixes that overlap between different routers in the same domain

**Diagnostic Symptoms:**
- Duplicate locator prefixes in SRv6 domain
- SID allocation failures on multiple routers
- IPv6 routing conflicts for locator prefixes
- SRv6 traffic forwarded to wrong endpoint

**Troubleshooting Commands & Remediation:**
- `Each SRv6 node must have a unique locator prefix`
- `Locator format: <prefix>:<function>:<args> (IPv6 address)`
- `Use <prefix-length> to define locator size (commonly /48)`
- `Check 'show segment-routing srv6 locator' for locator details`
- `Locator sub-prefixes aggregated into IGP for reachability`
- `Verify locator prefix allocation plan to avoid overlaps`

### SRv6 Locator / End SID Not Reachable (Severity: CRITICAL)

Configure SRv6 End SID but locator prefix not reachable via IGP, preventing traffic to the endpoint

**Diagnostic Symptoms:**
- SRv6 End SID not reachable from remote nodes
- Locator prefix missing from IPv6 routing table
- SRv6 traffic blackholed to endpoint
- Ping to SID endpoint fails

**Troubleshooting Commands & Remediation:**
- `SRv6 End SID uses locator which must be routable via IGP`
- `Verify locator prefix in IPv6 routing table`
- `Check 'show ipv6 route <locator-prefix>' for next-hop`
- `Locator prefix redistributed via IS-IS/OSPFv3 SR extension`
- `Ensure 'segment-routing srv6' enabled under IGP process`
- `Check 'show isis database' for SRv6 capabilities TLVs`

### SRv6 SID Format / uSID vs Non-Compressed Mismatch (Severity: HIGH)

Configure SRv6 with incompatible SID formats (uSID compressed vs non-compressed) between nodes

**Diagnostic Symptoms:**
- SRv6 nodes cannot interoperate due to SID format mismatch
- uSID format not supported on all nodes
- c-SID (compressed SID) encoding mismatch
- SRH processing fails at intermediate nodes

**Troubleshooting Commands & Remediation:**
- `uSID (micro-segment): 32-bit SIDs compressed in 128-bit IPv6`
- `Non-compressed: each SID = full 128-bit IPv6 address`
- `Check 'show segment-routing srv6 capabilities' for supported formats`
- `uSID reduce header overhead for deep SID stacks`
- `Not all hardware supports uSID compression`
- `Use consistent SID format across the SR domain`

### SRv6 End SID (Node SID) Processing Failure (Severity: CRITICAL)

Configure SRv6 End SID but the endpoint node fails to process the SRH or update destination address

**Diagnostic Symptoms:**
- SRv6 packets received at endpoint but not locally delivered
- End SID not matching any local function
- SRH processing error at endpoint
- Traffic not decapsulated and forwarded to destination

**Troubleshooting Commands & Remediation:**
- `End SID = DA is my locator, SRH SL=0 -> process locally`
- `Check 'show segment-routing srv6 sid <sid>' for SID status`
- `Verify End SID function is locally configured`
- `SL decrement must result in 0 at endpoint`
- `Use 'show segment-routing srv6 sid-db' for local SID database`
- `End SID also known as Node-SID in SRv6`

### SRv6 End.X SID (Adjacency SID) Mapping Issue (Severity: HIGH)

Configure SRv6 End.X SID but adjacency mapping to outgoing interface is incorrect or not resolved

**Diagnostic Symptoms:**
- SRv6 packets not forwarded to correct outgoing interface
- End.X SID not resolving to adjacency
- Traffic steered to wrong next-hop
- IGP not advertising End.X SID correctly

**Troubleshooting Commands & Remediation:**
- `End.X SID = DA matches SID, SL>0 -> forward out specific adjacency`
- `Check 'show segment-routing srv6 sid sid-addr <sid> f1' for details`
- `Verify adjacency SID with 'show isis adjacency sid' or 'show ospfv3 sr sid'`
- `End.X SID generated from SRv6 adjacency`
- `Check IGP database for SRv6 End.X sub-TLV`
- `End.X SID must be unique per adjacency`

### SRv6 End SID Flavor (PSP/USP/PSP) Mismatch (Severity: MEDIUM)

Configure SRv6 End SID flavors (Penultimate Segment Pop, Ultimate Segment Pop) inconsistently between nodes

**Diagnostic Symptoms:**
- SRv6 packets not correctly processed at segment endpoints
- PSP flavor not removing SRH when expected
- USP flavor not removing outer IPv6 header
- SRH processing mismatch between source and endpoint

**Troubleshooting Commands & Remediation:**
- `PSP: pop SRH on penultimate segment (SL=1 -> SL=0)`
- `USP: ultimate segment pop removes outer IPv6 header`
- `No PSP: endpoint receives packet with SRH intact`
- `Check 'show segment-routing srv6 sid <sid>' for flavors`
- `Flavors allow trade-off between processing and visibility`
- `PSP/USP reduce header overhead at endpoint`

### SRv6 SRH Encapsulation / T.Encap Behavior Failure (Severity: HIGH)

Configure SRv6 T.Encap (encapsulation with SRH) but outer IPv6 header or SRH not correctly constructed

**Diagnostic Symptoms:**
- SRv6 traffic not encapsulated correctly at headend
- SRH missing or malformed in encapsulating packets
- Outer IPv6 header not constructed with correct locator
- T.Encap behavior not performing SRH insertion

**Troubleshooting Commands & Remediation:**
- `T.Encap: ingress encapsulate IPv6 packet with outer header + SRH`
- `Outer DA = first SID in segment list`
- `Check 'show segment-routing srv6 srh' for SRH statistics`
- `Verify SID list structure for segment ordering`
- `T.Encap requires correct policy configuration at headend`
- `T.Encap adds outer IPv6, SRH, and optional TLVs`

### SRv6 SRH Insert / T.Insert Behavior Failure (Severity: HIGH)

Configure SRv6 T.Insert (insert SRH into existing IPv6 packet) but SRH not inserted between original IPv6 header and payload

**Diagnostic Symptoms:**
- SRv6 T.Insert not adding SRH to original packet
- Original IPv6 packet not modified with SRH
- Segment list not inserted into traffic flow
- SRH insertion causing MTU issues

**Troubleshooting Commands & Remediation:**
- `T.Insert: insert SRH between original IPv6 header and payload`
- `Original DA copied to SRH segment list[0] (last entry)`
- `First segment in list becomes new outer DA`
- `MTU increases by SRH header size (8 bytes + 16 per SID)`
- `T.Insert preferred for incremental SRv6 deployment`
- `Check 'show segment-routing srv6 srh' for T.Insert statistics`

### SRv6 SRH Segments Left (SL) Validation Error (Severity: HIGH)

Configure SRv6 where SL value in SRH becomes corrupted or inconsistent with segment list, causing incorrect processing

**Diagnostic Symptoms:**
- SRv6 packets processed at wrong segment
- SL decrement issues causing premature or late processing
- Packet dropped due to SL validation failure
- SRH corruption causing incorrect segment selection

**Troubleshooting Commands & Remediation:**
- `SL indicates current active segment in SRH`
- `SL decremented at each segment endpoint`
- `SL must be <= total segments in segment list`
- `When SL=0: endpoint must process locally`
- `SL mismatch causes RFC 8754 validation failure`
- `Check 'show segment-routing srv6 srh statistics' for errors`

### SRv6 Policy Headend Configuration Error (Severity: CRITICAL)

Configure SRv6 Policy (color/endpoint) but headend cannot instantiate the policy or candidate path

**Diagnostic Symptoms:**
- SRv6 Policy not active on headend
- Candidate path not valid or not selected
- BSID (Binding SID) not allocated for policy
- Color/endpoint resolution failure

**Troubleshooting Commands & Remediation:**
- `SRv6 Policy = color + endpoint (BGP-TE extensions)`
- `Check 'show segment-routing traffic-eng policy <name>' for status`
- `Verify locator reachability for endpoint`
- `Candidate path preferences: higher = better (preference value)`
- `Policy must have at least one valid segment list to be active`
- `BSID assigned to policy for nesting/referencing`

### SRv6 Policy Segment List Validation Failure (Severity: HIGH)

Configure SRv6 Policy segment list that contains SIDs not reachable or invalid, causing policy to be inactive

**Diagnostic Symptoms:**
- SRv6 Policy segment list not valid
- SIDs in segment list not reachable
- Candidate path inactive due to invalid segment list
- Traffic not steered to SRv6 Policy

**Troubleshooting Commands & Remediation:**
- `All SIDs in segment list must be reachable from headend`
- `Check 'show segment-routing traffic-eng segment-list <name>'`
- `Verify each SID locator exists in IPv6 routing table`
- `Segment list validation performed at policy activation`
- `Unreachable SID = segment list invalid`
- `Use ping with SRH to test segment list connectivity`

### SRv6 TI-LFA Backup Path Not Installed (Severity: HIGH)

Configure SRv6 TI-LFA (Topology Independent LFA) but backup path for link/node protection not programmed

**Diagnostic Symptoms:**
- No TI-LFA backup path for protected prefix
- Link failure causes traffic loss until IGP converges
- TI-LFA FRR not protecting SRv6 paths
- Post-convergence path not pre-programmed

**Troubleshooting Commands & Remediation:**
- `TI-LFA precomputes backup path using SRv6 SID list`
- `Check 'show isis fast-reroute ti-lfa <prefix>' for backup info`
- `TI-LFA requires adjacency SIDs (End.X) on backup path`
- `Verify IS-IS/OSPFv3 SR extension with TI-LFA enabled`
- `Use 'fast-reroute per-prefix ti-lfa' under IGP`
- `TI-LFA provides sub-50ms protection for SRv6`

### SRv6 TI-LFA PQR / Post-Convergence Repair Path Failure (Severity: HIGH)

Configure SRv6 TI-LFA but post-convergence repair path (PQR) not computed correctly

**Diagnostic Symptoms:**
- TI-LFA protection active but post-convergence path suboptimal
- Microloops after TI-LFA protection activation
- PQR path longer than optimal post-convergence path
- Traffic stay on backup path longer than necessary

**Troubleshooting Commands & Remediation:**
- `TI-LFA computes PQR to minimize microloops after convergence`
- `Check 'show isis fast-reroute ti-lfa <prefix> detail' for PQR`
- `PQR uses additional SID list to avoid microloops`
- `PQR only active during convergence window`
- `Disable PQR if causing issues: 'microloop avoidance disable'`
- `PQR adds additional SIDs to post-convergence path`

### SRv6 Flexible Algorithm (Flex-Algo) Definition Mismatch (Severity: HIGH)

Configure SRv6 Flexible Algorithm with inconsistent definitions across the domain

**Diagnostic Symptoms:**
- Flex-Algo SIDs not installed on all nodes
- Flex-Algo definition mismatch between routers
- SID calculation inconsistent in different parts of network
- Flex-Algo traffic not following expected path

**Troubleshooting Commands & Remediation:**
- `Flex-Algo uses algorithm 128-255 (custom algorithms)`
- `All routers in Flex-Algo domain must have same definition`
- `Check 'show segment-routing traffic-eng algorithm <num>'`
- `Flex-Algo = metric-type + constraints (affinity/exclude)`
- `Verify IGP advertises Flex-Algo definition correctly`
- `Nodes not matching definition participate in default SPF only`

### SRv6 Flex-Algo SID Not Allocated (Severity: HIGH)

Configure SRv6 Flex-Algo but algorithm-specific SIDs not allocated for prefixes or adjacencies

**Diagnostic Symptoms:**
- Flex-Algo Node SIDs not found in SID database
- Only default algorithm (0) SIDs allocated
- Flex-Algo adjacency SIDs missing
- Flex-Algo path computation fails

**Troubleshooting Commands & Remediation:**
- `Flex-Algo requires separate SID allocation per algorithm`
- `Check 'show segment-routing srv6 sid' for algorithm info`
- `Node-SIDs allocated for each Flex-Algo configured`
- `IS-IS: 'metric-style wide' + 'segment-routing srv6 algorithm <num>'`
- `Flex-Algo SIDs use different locator or SID space`
- `Use 'show isis fast-reroute <prefix> algorithm <num>' for details`

### SRv6 VPN Encapsulation / VPN SID Allocation Failure (Severity: CRITICAL)

Configure SRv6-based L3VPN but VPN SID (uSID or SID) not allocated for VRF routes

**Diagnostic Symptoms:**
- VPN routes not advertised with SRv6 SID
- BGP VPNv4 routes missing SRv6 SID attribute
- VRF routes not encapsulated with IPv6+SID
- Remote PE cannot reach VRF destinations

**Troubleshooting Commands & Remediation:**
- `SRv6 VPN: BGP advertises VPN prefix + SRv6 SID`
- `Check 'show bgp vpnv4 unicast <prefix>' for SRv6 SID attribute`
- `Endpoint PE allocates VPN SID from locator block`
- `Use 'segment-routing srv6 locator <name>' under VRF`
- `Encapsulation T.Encap at ingress PE`
- `Decapsulation at egress PE when DA matches VPN SID`

### SRv6 EVPN Over SRv6 / Mac-VRF SID Issue (Severity: CRITICAL)

Configure EVPN over SRv6 but MAC-VRF SID allocation fails or Type-2/Type-3 routes missing SRv6 encapsulation

**Diagnostic Symptoms:**
- EVPN routes over SRv6 missing VPN SID for unicast
- IMET (Type-3) routes not carrying SRv6 SID
- MAC/IP advertisement routes not populated
- Layer 2 forwarding failing over SRv6 fabric

**Troubleshooting Commands & Remediation:**
- `EVPN over SRv6 uses SRv6 SID for encap/forwarding`
- `Check 'show bgp l2vpn evpn' for SRv6 encapsulation attribute`
- `MAC-VRF assigns SID for unicast forwarding`
- `IMET routes carry SID for BUM traffic replication`
- `Use 'segment-routing srv6 locator' under EVPN instance`
- `VTEP endpoints must support SRv6 T.Encap/T.Decap`

### SRv6 Ping / Traceroute with SRH Failure (Severity: MEDIUM)

Configure SRv6 but ping/traceroute over SRv6 path fails due to ICMPv6 processing or SRH handling

**Diagnostic Symptoms:**
- Ping over SRv6 path fails
- Traceroute shows only headend or endpoint
- ICMPv6 not returned from intermediate SRv6 nodes
- SRH not processed correctly for OAM packets

**Troubleshooting Commands & Remediation:**
- `SRv6 ping sends ICMPv6 echo with SRH`
- `Intermediate nodes process SRH and forward`
- `Endpoint decapsulates and replies`
- `Check 'ping <dest> source <src> srv6 header'`
- `Traceroute may not show intermediate hops if SRH not returned`
- `Use OAM-specific SID behaviors (End.Operator) for telemetry`

### SRv6 Path MTU / SRH Overhead Issue (Severity: HIGH)

Configure SRv6 but SRH overhead causes packets to exceed PMTU, causing fragmentation or drops

**Diagnostic Symptoms:**
- Large packets dropped in SRv6 network
- PMTUD not working with SRv6 encapsulation
- SRH overhead causing MTU exceedance
- Fragmentation required after SRH insertion

**Troubleshooting Commands & Remediation:**
- `SRH adds 8 bytes (header) + 16 bytes per SID`
- `T.Encap: outer IPv6 (40) + SRH (8+16n) + original packet`
- `T.Insert: SRH (8+16n) inserted into existing IPv6 packet`
- `Reduce MTU on access facing interfaces to account for SRH`
- `Use path-mtu-discovery with SRv6 to detect MTU issues`
- `Deep SID lists significantly reduce effective MTU`

### SRv6/SR-MPLS Interworking Gateway Issue (Severity: HIGH)

Configure SRv6 to SR-MPLS interworking but SID-to-label mapping or encapsulation conversion fails

**Diagnostic Symptoms:**
- SRv6 domain cannot communicate with SR-MPLS domain
- SID-to-MPLS label mapping not configured on border router
- Forwarding across interworking gateway fails
- Encapsulation conversion errors

**Troubleshooting Commands & Remediation:**
- `Interworking gateway converts SRv6 SID to MPLS label (or reverse)`
- `Use 'srv6 interworking mpls' on border nodes`
- `SID-to-label binding: each SID maps to a label`
- `Check 'show segment-routing srv6 mpls interworking' for mapping`
- `Traffic from SRv6 domain decapsulated and re-encapsulated with MPLS`
- `Common in SRv6 migration scenarios`

### SRv6 Binding SID (BSID) Allocation / Forwarding Issue (Severity: HIGH)

Configure SRv6 Binding SID for policy interworking but BSID not allocated or not forwardable

**Diagnostic Symptoms:**
- BSID not allocated for SRv6 Policy
- Forwarding to BSID not working
- Policy chaining/nesting broken
- BSID not reachable from other nodes in domain

**Troubleshooting Commands & Remediation:**
- `BSID: traffic to this SID triggers policy forwarding`
- `Allocated from locator block for the policy`
- `Check 'show segment-routing traffic-eng policy <name>' for BSID`
- `BSID enables policy chaining: traffic enters policy1 -> BSID -> policy2`
- `BSID must be within local locator and reachable via IGP`
- `BSID behavior: forward according to policy segment list`

### SRv6 SRH Security / Filtering Misconfiguration (Severity: HIGH)

Configure SRv6 but no security filtering on SRH, allowing external SRv6 traffic to bypass routing

**Diagnostic Symptoms:**
- External hosts can inject SRH into network
- SRv6 traffic from untrusted sources not filtered
- RH type 4 (SRH) forwarding without verification
- Security policy bypass via SRv6 encapsulation

**Troubleshooting Commands & Remediation:**
- `SRH type 4 similar to RH type 0 (deprecated for security)`
- `Configure ACL to filter and drop packets with SRH from external interfaces`
- `Use 'validate source' and 'validate destination' for SRH processing`
- `RFC 8754 Section 7: security recommendations for SRv6`
- `Filter external traffic with SRH at network border`
- `Only accept SRH from known, trusted SRv6 domains`

### SRv6 Migration / Coexistence with Existing IPv6 (Severity: HIGH)

Configure SRv6 in existing IPv6 network but traffic routing conflicts or locator overlaps with existing addressing

**Diagnostic Symptoms:**
- Locator prefixes overlapping with existing IPv6 assignment
- IPv6 routing table conflicts between locator and existing prefixes
- SRv6 operational traffic affecting existing IPv6 routing
- Locator advertising causing routing table bloat

**Troubleshooting Commands & Remediation:**
- `SRv6 locators consume IPv6 address space from existing blocks`
- `Dedicate a prefix block for SRv6 locators (e.g., ::/32)`
- `Ensure locator range does not overlap with existing IPv6 allocations`
- `Use 'segment-routing srv6 locator <name> prefix <IPv6-prefix> block <block>'`
- `Aggregated locator routes reduce IPv6 routing table impact`
- `Plan locator block before SRv6 deployment`

### SRv6 Draft/Standard Transition Implementation Issues (Severity: HIGH)

Configure SRv6 with different draft or RFC versions between vendors causing interoperability issues

**Diagnostic Symptoms:**
- SRv6 features not interoperating between different vendors
- Draft-6man-srv6 vs RFC 8754 encoding differences
- SRH TLV processing format mismatch
- SID behavior interpretation differences

**Troubleshooting Commands & Remediation:**
- `SRv6 evolved from multiple drafts to RFCs 8754, 8986`
- `Check software versions for supported SRv6 RFC features`
- `Common differences: SRH TLV format, SID structure, flavors`
- `Use interoperability testing matrix between vendors`
- `Stick to base RFC 8754/8986 features for multi-vendor`
- `Advanced features (uSID, Flex-Algo) may have vendor-specific extensions`

