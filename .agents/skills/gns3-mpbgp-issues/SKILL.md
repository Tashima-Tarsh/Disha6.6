---
name: "MP-BGP Issues Injection"
description: "Multiprotocol BGP (MP-BGP) address family, VPNv4/VPNv6, 6PE/6VPE, BGP-LS related network faults for troubleshooting practice"
category: "computer-networking"
---

# MP-BGP Issues Injection

Multiprotocol BGP (MP-BGP) address family, VPNv4/VPNv6, 6PE/6VPE, BGP-LS related network faults for troubleshooting practice

## Supported Protocols
- bgp
- mpbgp
- vpnv4
- vpnv6
- mpls
- l3vpn
- 6pe
- 6vpe
- bgp-ls

## Fault Injection Scenarios & Troubleshooting Procedures

### VPNv4/VPNv6 Neighbor Session Not Established (Severity: CRITICAL)

Configure BGP peering for IPv4 unicast but fail to activate VPNv4 address family, preventing MPLS L3VPN route exchange

**Diagnostic Symptoms:**
- BGP IPv4 unicast session up but VPNv4 session not established
- No VPNv4 prefixes exchanged between PE routers
- MPLS L3VPN services not working
- VRF routes not propagated to remote PEs

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp vpnv4 unicast all summary' for VPNv4 session status`
- `Verify 'neighbor <ip> activate' under address-family vpnv4`
- `Ensure 'neighbor <ip> send-community extended' is configured`
- `Check both PE routers have VPNv4 address family enabled`
- `Verify VRF configuration on originating PE`
- `MP-BGP VPNv4 session requires address-family activation`

### BGP Route Target (RT) Import/Export Error (Severity: CRITICAL)

Configure incorrect or missing Route Target on VRF, causing VPN routes not to be imported or exported correctly

**Diagnostic Symptoms:**
- VPN routes not received on remote PE
- Routes exported from VRF but not imported on remote side
- Route Target mismatch between PEs
- MPLS VPN service not working for specific sites

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp vpnv4 unicast all' for RT extended community`
- `Verify 'route-target export <RT>' and 'route-target import <RT>'`
- `Import RT must match export RT of remote PE`
- `Use 'show ip bgp vpnv4 vrf <name>' to check VRF routes`
- `Multiple RTs can be configured for complex topologies`
- `RT format: <ASN>:<number> (e.g., 65000:100)`

### BGP Route Distinguisher (RD) Duplicate or Misconfiguration (Severity: HIGH)

Configure duplicate Route Distinguishers for different VRFs or incorrect RD format, causing route confusion

**Diagnostic Symptoms:**
- VPN routes from different customers mixed up
- Duplicate VPN prefixes in BGP table
- VRF routes not appearing correctly
- Route installation failures

**Troubleshooting Commands & Remediation:**
- `RD uniquely identifies VPN prefixes across MPLS network`
- `Different VRFs on same PE MUST have different RDs`
- `Same VRF on different PEs can use same or different RDs`
- `Check 'show ip bgp vpnv4 vrf <name>' for RD in prefix`
- `Format: <ASN:ID> or <IP:ID>`
- `RD does NOT need to match between PEs for route exchange`

### MP-BGP MPLS Label Allocation Failure (Severity: CRITICAL)

Configure BGP label allocation incorrectly or MPLS label distribution fails, preventing VPN label propagation

**Diagnostic Symptoms:**
- VPNv4 routes received without MPLS labels
- Label allocation failure messages
- MPLS forwarding fails for VPN traffic
- 'show mpls forwarding' shows missing labels

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp vpnv4 unicast all <prefix>' for label`
- `Use 'label-mode per-vrf' or 'label-mode per-prefix' on PE`
- `Verify 'mpls label protocol' configuration`
- `Check LDP session between P and PE routers`
- `Ensure 'mpls ip' is enabled on MPLS-facing interfaces`
- `Check 'show mpls ldp neighbor' for LDP session status`

### VRF Route Not Propagated to MP-BGP (Severity: HIGH)

Configure VRF but fail to redistribute routes into MP-BGP, causing VRF routes to not be advertised to remote PEs

**Diagnostic Symptoms:**
- VRF routes present locally but not in MP-BGP table
- Remote PE cannot reach VRF networks
- VPNv4 prefixes missing from BGP table
- Redistribution not working under VRF address family

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp vpnv4 unicast vrf <name>' for VRF routes`
- `Verify 'redistribute' or 'network' under VRF address family`
- `Use 'address-family ipv4 vrf <name>' to enter VRF context`
- `Check 'export map' on VRF if filtering routes`
- `Ensure routes exist in VRF routing table before redistribution`
- `Connected routes require 'redistribute connected' under VRF AF`

### VRF Route Leaking Between VRFs (Severity: HIGH)

Configure incorrect route leaking between VRFs (import/export RT overlap), causing routes from one VRF to appear in another

**Diagnostic Symptoms:**
- Routes from VRF A appearing in VRF B
- IP address overlap conflicts
- Incorrect VRF routing table
- Unexpected route import behavior

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp vpnv4 vrf <name>' for unexpected routes`
- `Verify RT import/export values for each VRF`
- `VRF route leaking requires explicit configuration`
- `Use separate RTs for different customers`
- `For intentional leaking, use 'import map' or 'export map'`
- `Route leaking can create routing loops if misconfigured`

### MP-BGP AFI/SAFI Capability Mismatch (Severity: HIGH)

Configure different BGP address families on peers, causing AFI/SAFI negotiation failure and no routes exchanged for specific address families

**Diagnostic Symptoms:**
- BGP session up but no routes exchanged for specific address family
- AFI/SAFI capability not advertised by peer
- OPEN message shows missing capabilities
- Only IPv4 unicast working, other address families not

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp neighbor <ip> capabilities' for AFI/SAFI`
- `Both peers must support and advertise the same AFI/SAFI`
- `Verify address-family configuration on both peers`
- `Use 'show bgp neighbor <ip>' to see negotiated capabilities`
- `Different IOS versions may support different AFI/SAFIs`
- `Common AFI/SAFIs: 1/1 (IPv4 unicast), 1/128 (VPNv4), 2/128 (VPNv6)`

### MP-BGP Address Family Not Activated (Severity: HIGH)

Configure address family but fail to activate neighbor under that address family, preventing route exchange

**Diagnostic Symptoms:**
- Neighbor configured but routes not exchanged for address family
- Address family enabled but neighbor not active in it
- 'show bgp neighbor' shows neighbor not in address family
- Routes present locally but not sent to peer

**Troubleshooting Commands & Remediation:**
- `Neighbor activation is separate from BGP session establishment`
- `Use 'neighbor <ip> activate' under the specific address family`
- `Without activation, BGP session up but no routes exchanged`
- `Check 'show bgp neighbor <ip> | include Address Family'`
- `Verify neighbor is in correct VPN instance or VRF for L3VPN`
- `Default IPv4 unicast activation may interfere with other AFs`

### MP-BGP Send Community Missing for VPN (Severity: HIGH)

Fail to configure send-community extended for VPNv4/VPNv6 address family, causing RT communities to be stripped

**Diagnostic Symptoms:**
- VPNv4 prefixes received without extended communities
- Route Targets missing from BGP updates
- VRF routes not imported on remote PE
- MPLS VPN service not functioning

**Troubleshooting Commands & Remediation:**
- `Extended communities contain Route Target information`
- `Use 'neighbor <ip> send-community extended' under VPNv4 AF`
- `Standard send-community is not sufficient for VPN`
- `Check 'show bgp vpnv4 unicast all <prefix>' for communities`
- `Both send and extended may need to be configured`
- `Verify 'neighbor <ip> send-community' on both sides`

### 6PE MPLS Label Allocation Failure (Severity: CRITICAL)

Configure 6PE (IPv6 Provider Edge) but MPLS label allocation for IPv6 prefixes fails, breaking IPv6 transport over MPLS

**Diagnostic Symptoms:**
- 6PE routes received without IPv6 MPLS label
- IPv6 traffic not forwarded over MPLS core
- BGP IPv6 address family up but no label in NLRI
- IPv6 reachability broken across MPLS network

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp ipv6 unicast <prefix>' for MPLS label`
- `6PE uses MP-BGP IPv6 address family with labeled unicast`
- `Ensure 'neighbor <ip> send-label' under IPv6 unicast address family`
- `Verify MPLS forwarding table for IPv6 prefixes`
- `Check LDP or MPLS core connectivity`
- `IPv6 next-hop must be reachable via IGP and have label`

### 6VPE VRF Configuration Error for IPv6 VPN (Severity: HIGH)

Configure 6VPE (IPv6 MPLS L3VPN) with incorrect IPv6 VRF parameters, preventing IPv6 VPN route exchange

**Diagnostic Symptoms:**
- IPv6 VPN routes not exchanged between PEs
- VRFv6 routes missing from BGP VPNv6 table
- IPv6 VRF not functioning for customer traffic
- VPNv6 address family not exchanging routes

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp vpnv6 unicast vrf <name>' for IPv6 VPN routes`
- `Verify VRF has both IPv4 and IPv6 address families`
- `Use 'vrf definition <name>' with dual-stack address families`
- `Check 'address-family ipv6' under VRF configuration`
- `Ensure 'neighbor <ip> activate' under address-family vpnv6`
- `6VPE uses VPNv6 AFI/SAFI (2/128)`

### 6PE IGP/BGP Synchronization Issue (Severity: HIGH)

Configure 6PE next-hop not reachable via IGP or not labeled, causing IPv6 prefixes to have unreachable next-hop

**Diagnostic Symptoms:**
- 6PE routes present in BGP table but not in routing table
- BGP next-hop not reachable for IPv6 prefixes
- MPLS label missing for BGP next-hop
- IPv6 traffic blackholed across MPLS core

**Troubleshooting Commands & Remediation:**
- `6PE next-hop is the PE's IPv4 address (carried in MP_REACH)`
- `Check 'show bgp ipv6 unicast <prefix>' for next-hop`
- `Verify MPLS LSP to the BGP next-hop`
- `Use 'show mpls forwarding-table <next-hop>' for label`
- `Ensure LDP distributes label for PE loopback address`
- `Use 'ping mpls ipv4 <next-hop>' to test LSP`

### BGP-LS Session Not Establishing (Severity: HIGH)

Configure BGP-Link State (BGP-LS) but session fails due to address family or capability issues

**Diagnostic Symptoms:**
- BGP-LS session not establishing
- Link state database not populated
- No BGP-LS NLRI exchange
- SDN controller cannot obtain network topology

**Troubleshooting Commands & Remediation:**
- `BGP-LS uses AFI 16388/SAFI 71`
- `Verify 'address-family link-state' on both peers`
- `Check 'show bgp link-state summary' for session status`
- `BGP-LS typically uses eBGP multihop between router and controller`
- `IGP (OSPF/IS-IS) must have link-state database populated`
- `Check 'show bgp link-state database' for topology entries`

### BGP-LS IGP Synchronization Failure (Severity: HIGH)

Configure BGP-LS but IGP (OSPF/IS-IS) link-state database not populated or not exported to BGP-LS

**Diagnostic Symptoms:**
- BGP-LS database empty
- Topology information not available to controller
- IGP running but BGP-LS not reflecting IGP topology
- Missing nodes, links, or prefixes in BGP-LS database

**Troubleshooting Commands & Remediation:**
- `Check 'show bgp link-state database' for entries`
- `BGP-LS requires IGP to be running on the router`
- `Use 'show ip ospf database' or 'show isis database' for IGP LSDB`
- `IGP redistribution to BGP-LS is automatic when configured`
- `Not all IGP protocols supported (OSPF, IS-IS, OSPFv3)`
- `Check for 'capability link-state' under BGP configuration`

### BGP FlowSpec Peer Configuration Error (Severity: HIGH)

Configure BGP FlowSpec address family incorrectly, causing flow specification rules not to propagate to peers

**Diagnostic Symptoms:**
- FlowSpec rules not received by downstream routers
- BGP FlowSpec session not established
- Traffic filtering policies not applied
- FlowSpec NLRI not exchanged between peers

**Troubleshooting Commands & Remediation:**
- `FlowSpec uses AFI 1/SAFI 133 (IPv4) or AFI 2/SAFI 133 (IPv6)`
- `Verify 'address-family ipv4 flowspec' configuration`
- `Ensure 'neighbor <ip> activate' under flowspec address family`
- `Check 'show bgp ipv4 flowspec summary'`
- `Validate flow specification encoding (NLRI format)`
- `Different vendors may have different FlowSpec implementation`

### EVPN Over MP-BGP Address Family Error (Severity: CRITICAL)

Configure EVPN address family under MP-BGP incorrectly, preventing EVPN route exchange

**Diagnostic Symptoms:**
- EVPN routes not exchanged between VTEPs
- EVPN address family not active on BGP session
- Type-2/Type-3 routes missing
- VXLAN/EVPN fabric not operational

**Troubleshooting Commands & Remediation:**
- `EVPN uses AFI 25/SAFI 70 (L2VPN EVPN)`
- `Verify 'address-family l2vpn evpn' on both peers`
- `Ensure 'neighbor <ip> activate' under EVPN address family`
- `Check 'show bgp l2vpn evpn summary'`
- `Verify 'neighbor <ip> send-community extended' for RT propagation`
- `EVPN requires MP-BGP support for multi-protocol NLRI`

### Inter-AS Option A (VRF-to-VRF) Configuration Error (Severity: HIGH)

Configure Inter-AS Option A with ASBR VRF-to-VRF back-to-back links but redistribution fails between ASBRs

**Diagnostic Symptoms:**
- VPN routes not exchanged between ASBRs
- Back-to-back VRF links not establishing BGP session
- PE in one AS cannot reach PE in neighboring AS
- VRF import/export RT mismatch between ASBR VRFs

**Troubleshooting Commands & Remediation:**
- `Option A: ASBRs have back-to-back VRFs connected via sub-interface`
- `Each VRF has separate eBGP session across ASBR interconnect`
- `Verify eBGP session between ASBR VRFs is established`
- `Use separate RDs and RTs for each ASBR VRF`
- `Route Target must match between AS VRF and PE VRF`
- `Check interface IP and connectivity between ASBRs`

### Inter-AS Option B (ASBR VPNv4 Exchange) Label Issue (Severity: CRITICAL)

Configure Inter-AS Option B with VPNv4 exchange between ASBRs but label allocation or next-hop handling fails

**Diagnostic Symptoms:**
- VPNv4 routes exchanged between ASBRs but labels missing
- Next-hop not updated at ASBR boundary
- MPLS label switched path breaks across AS
- VPN traffic cannot traverse AS boundary

**Troubleshooting Commands & Remediation:**
- `Option B: ASBRs exchange VPNv4 routes via eBGP with labels`
- `ASBR must re-allocate labels before advertising to neighbor ASBR`
- `Check 'show bgp vpnv4 unicast all <prefix>' for label on ASBR`
- `Use 'no bgp default route-target filter' on ASBR`
- `Verify 'neighbor <ip> send-community extended' on ASBR links`
- `ASBR must preserve or update next-hop per VPN routing policy`

### Inter-AS Option C (PE Multi-Hop) Labeled Route Issue (Severity: CRITICAL)

Configure Inter-AS Option C with eBGP multi-hop labeled unicast exchange but LSP between PEs fails

**Diagnostic Symptoms:**
- eBGP labeled unicast session not establishing between PE routers
- LSP from PE to remote PE not complete
- VPN routes exchanged but MPLS tunnel not functioning
- MPLS forwarding table missing labels for remote PE loopback

**Troubleshooting Commands & Remediation:**
- `Option C: PEs exchange labeled routes via eBGP multi-hop`
- `PEs need 'neighbor <ip> send-label' for IPv4 unicast address family`
- `IGP/LDP within each AS distributes label to PE loopback`
- `ASBRs must propagate labeled routes without popping labels`
- `Check 'show mpls forwarding-table <remote-pe-loopback>'`
- `Verify LSP stitching via RSVP-TE or LDP across ASBRs`

### BGP Labeled Unicast (AFI 1/SAFI 4) Config Error (Severity: HIGH)

Configure BGP labeled unicast IPv4 address family incorrectly, preventing MPLS label distribution for IPv4 prefixes

**Diagnostic Symptoms:**
- BGP labeled unicast routes exchanged without labels
- IPv4 routes in BGP labeled unicast table but no MPLS label
- Labeled unicast address family not active
- Interior BGP prefix labels not allocated

**Troubleshooting Commands & Remediation:**
- `Labeled Unicast uses AFI 1/SAFI 4 (labeled IPv4 unicast)`
- `Use 'address-family ipv4 labeled-unicast' configuration`
- `Ensure 'neighbor <ip> activate' under labeled unicast AF`
- `Use 'neighbor <ip> send-label' for label distribution`
- `Check 'show bgp ipv4 labeled-unicast summary'`
- `Common in Inter-AS Option C and seamless MPLS designs`

### BGP Labeled Unicast IGP Prefix Delegation Failure (Severity: HIGH)

Configure BGP to distribute IGP loopback prefixes with labels but delegation from IGP to BGP fails

**Diagnostic Symptoms:**
- IGP loopback prefixes not appearing in labeled unicast BGP
- MPLS label not assigned to IGP learned loopbacks
- LSP incomplete for BGP next-hop addresses
- Route delegation from IGP to BGP not working

**Troubleshooting Commands & Remediation:**
- `Use 'bgp prefix-label' or 'label route-map' to assign labels`
- `IGP/MPLS interworking requires label allocation for IGP routes`
- `Check 'show mpls forwarding-table' for IGP prefixes with labels`
- `BGP labeled unicast distributes /32 host routes with labels`
- `Verify 'label allocation-mode host-routes' configuration`
- `Common in seamless MPLS and Inter-AS Option C deployments`

### MVPN Address Family Configuration Error (Severity: HIGH)

Configure MVPN (Multicast VPN) address family incorrectly, preventing multicast route exchange between PEs

**Diagnostic Symptoms:**
- Multicast routes not exchanged between PEs
- MVPN address family not active on BGP session
- C-multicast routes (Type 6/7) missing from BGP table
- VRF multicast forwarding not working

**Troubleshooting Commands & Remediation:**
- `MVPN uses AFI 1/SAFI 129 (IPv4 MVPN) or AFI 2/SAFI 129 (IPv6 MVPN)`
- `Verify 'address-family ipv4 mvpn' on PE routers`
- `Ensure 'neighbor <ip> activate' under MVPN address family`
- `Check 'show bgp ipv4 mvpn summary' for MVPN session`
- `Verify VRF multicast configuration on all PEs`
- `MVPN Type 1-7 NLRI types cover different multicast signaling`

### MVPN Intra-AS I-PMSI Tunnel Setup Failure (Severity: HIGH)

Configure MVPN but Inclusive PMSI (Provider Multicast Service Interface) tunnel fails to establish between PEs

**Diagnostic Symptoms:**
- I-PMSI tunnel not established between PEs in same MVPN
- MVPN Type 1 (I-PMSI A-D) routes missing
- Multicast traffic from one PE not reaching other PEs
- PE multicast replication failure

**Troubleshooting Commands & Remediation:**
- `I-PMSI distributes multicast traffic to all PEs in the same MVPN`
- `Check 'show bgp ipv4 mvpn' for Type 1 I-PMSI A-D routes`
- `Verify P-tunnel technology (PIM-SM, MLDP, P2MP RSVP-TE)`
- `Ensure multicast core connectivity between PEs`
- `Check I-PMSI tunnel status: 'show mpls mldp database'`
- `P-tunnel mismatch between PEs prevents multicast forwarding`

### MVPN S-PMSI Switchover Failure (Severity: HIGH)

Configure MVPN S-PMSI (Selective PMSI) tunnel but switchover from I-PMSI fails for high-bandwidth multicast streams

**Diagnostic Symptoms:**
- All multicast traffic stays on I-PMSI tunnel
- S-PMSI tunnel not established despite threshold exceeded
- Type 3 (S-PMSI A-D) routes not generated
- Core bandwidth inefficient and PEs overwhelmed with unnecessary traffic

**Troubleshooting Commands & Remediation:**
- `S-PMSI provides optimal tree for high-bandwidth streams`
- `Check MVPN S-PMSI threshold: 'bandwidth <base> <threshold>'`
- `Verify S-PMSI is enabled under VRF multicast configuration`
- `Check 'show bgp ipv4 mvpn' for Type 3 S-PMSI A-D routes`
- `S-PMSI switchover triggered by bandwidth threshold`
- `Root PE generates S-PMSI routes for streams exceeding threshold`

### BGP IPv6 FlowSpec Address Family Config Error (Severity: HIGH)

Configure BGP IPv6 FlowSpec address family incorrectly, preventing IPv6 flow specification rules from being exchanged

**Diagnostic Symptoms:**
- IPv6 FlowSpec rules not exchanged between peers
- IPv6 traffic filtering not working via FlowSpec
- IPv6 flow specification address family not established
- IPv6 FLOWSPEC NLRI validation failure

**Troubleshooting Commands & Remediation:**
- `IPv6 FlowSpec uses AFI 2/SAFI 133`
- `Verify 'address-family ipv6 flowspec' configuration`
- `Ensure 'neighbor <ip> activate' under IPv6 flowspec AF`
- `IPv6 flow encoding includes source/dest prefix, next-header, etc.`
- `Different vendors may have different IPv6 FlowSpec support`
- `Check 'show bgp ipv6 flowspec summary' for session status`

### BGP FlowSpec for VPNv4 Address Family Error (Severity: HIGH)

Configure BGP FlowSpec for VPNv4 (flow rules within MPLS VPN context) but address family or RT validation fails

**Diagnostic Symptoms:**
- VPN FlowSpec rules not propagated within MPLS VPN
- FlowSpec rules for VPN prefixes not working
- FlowSpec VPNv4 address family not established
- VPN FlowSpec RT mismatch prevents rule import

**Troubleshooting Commands & Remediation:**
- `FlowSpec VPNv4 uses AFI 1/SAFI 134 (VPN FlowSpec)`
- `Verify 'address-family ipv4 flowspec' with VPN route-target`
- `FlowSpec rules must include RT matching VRF RT`
- `Check 'show bgp ipv4 flowspec vpnv4 summary'`
- `FlowSpec actions applied per-VRF within MPLS VPN`
- `RT filtering may block FlowSpec rules from reaching target VRF`

### BGP FlowSpec Action Application Failure (Severity: MEDIUM)

Configure BGP FlowSpec with actions (traffic-rate, redirect, marking) but actions not applied to forwarding plane

**Diagnostic Symptoms:**
- FlowSpec rules received but traffic not affected
- FlowSpec action (drop/rate-limit) not taking effect
- Traffic-rate action not limiting bandwidth
- Redirect VRF action not redirecting traffic

**Troubleshooting Commands & Remediation:**
- `Check 'show flow-spec ipv4' for installed rules in forwarding`
- `Verify FlowSpec actions are supported: 1=traffic-rate, 2=drop, 3=redirect`
- `traffic-rate 0 = drop all matching traffic`
- `traffic-rate <rate> = policer (bytes/sec)`
- `redirect VRF requires target VRF configuration`
- `Different Cisco platforms support different action sets`

### BGP Entropy Label Capability Mismatch (Severity: MEDIUM)

Configure BGP entropy label for load balancing but capability mismatch prevents entropy label insertion

**Diagnostic Symptoms:**
- Entropy labels not inserted in MPLS label stack
- ECMP load balancing not working for BGP traffic
- Entropy label capability not negotiated
- Uneven traffic distribution across MPLS LAG/ECMP

**Troubleshooting Commands & Remediation:**
- `Entropy label inserted by ingress PE for load balancing`
- `RFC 6790: Entropy Label Capability via BGP`
- `Use 'entropy-label' under address-family or per-VRF`
- `Both ingress and egress PEs must support entropy labels`
- `Check 'show bgp vpnv4 unicast all <prefix>' for entropy label`
- `Egress PE signals ELI (Entropy Label Indicator) in BGP`

### BGP SR Policy Address Family Config Error (Severity: HIGH)

Configure BGP Segment Routing Policy address family incorrectly, preventing SR Policy candidate paths from being exchanged

**Diagnostic Symptoms:**
- SR Policy routes not exchanged between headend and controller
- BGP SR Policy address family not established
- Candidate paths not received by SR headend
- Segment list validation failure

**Troubleshooting Commands & Remediation:**
- `SR Policy uses AFI 1/SAFI 73 (SR Policy)`
- `Verify 'address-family ipv4 sr-policy' on both peers`
- `SR Policy carries segment lists, binding SID, preference`
- `Controller distributes candidate paths to headend via BGP`
- `Check 'show bgp ipv4 sr-policy summary' for session status`
- `Different candidates have different preferences (higher=better)`

### BGP SR Policy Candidate Path Validation Failure (Severity: HIGH)

Receive BGP SR Policy candidate paths but segment list validation fails or preference order incorrect

**Diagnostic Symptoms:**
- SR Policy candidate paths received but not installed
- Segment list validation errors
- Lower preference candidate path used instead of higher
- SR-TE policy not steering traffic

**Troubleshooting Commands & Remediation:**
- `Candidate paths validated: segment availability, SID reachability`
- `Higher preference value = better candidate path`
- `Check 'show segment-routing traffic-eng policy <name>'`
- `Verify all SIDs in segment list are reachable`
- `SR Policy headend must resolve segment list into label stack`
- `SRv6 Policy extensions carry different SID types`

### BGP Route Target Constraint (SAFI 132) Filtering Failure (Severity: MEDIUM)

Configure BGP RT Constraint to filter VPN route exchange but configuration error prevents filtering from working

**Diagnostic Symptoms:**
- PE receiving VPN routes for RTs it does not import
- RT Constraint address family not established
- Unwanted VPN routes not filtered at source
- Route generation inefficiency in large-scale VPN networks

**Troubleshooting Commands & Remediation:**
- `RT Constraint uses AFI 1/SAFI 132 (RT Membership)`
- `Verify 'address-family ipv4 rt-filter' configuration`
- `PE advertises RT membership to route reflector`
- `Route reflector only sends VPN routes for advertised RTs`
- `Check 'show bgp ipv4 rt-filter summary' for session`
- `RT Constraint dramatically reduces BGP table in large VPN networks`

### VRF BGP Multicast (SAFI 2) within VPN Config Error (Severity: HIGH)

Configure BGP multicast address family within VRF incorrectly, preventing multicast RPF route exchange in VPN

**Diagnostic Symptoms:**
- Multicast RPF information not exchanged between PEs
- BGP multicast within VRF not established
- Multicast routing failure in MPLS VPN
- PIM-SM bootstrap signaling broken across PEs

**Troubleshooting Commands & Remediation:**
- `Multicast BGP uses AFI 1/SAFI 2 (multicast) or MVPN-specific`
- `Verify 'address-family ipv4 multicast vrf <name>' configuration`
- `Check 'show bgp ipv4 multicast vrf <name> summary'`
- `MBGP carries multicast RPF information`
- `Used with MSDP for inter-domain multicast`
- `Different from MVPN: carries unicast routes for RPF check`

### BGP IPv6 Labeled Unicast (AFI 2/SAFI 4) Config Error (Severity: HIGH)

Configure BGP IPv6 labeled unicast address family but label allocation or signaling fails

**Diagnostic Symptoms:**
- IPv6 labeled prefixes exchanged without proper MPLS labels
- IPv6 LSP not established for BGP next-hops
- Labeled IPv6 unicast address family not active
- IPv6 MPLS forwarding not functioning

**Troubleshooting Commands & Remediation:**
- `IPv6 Labeled Unicast uses AFI 2/SAFI 4`
- `Use 'address-family ipv6 labeled-unicast' configuration`
- `Ensure 'neighbor <ip> send-label' under IPv6 labeled AF`
- `Check 'show bgp ipv6 labeled-unicast summary' for session`
- `IPv6 labeled unicast used for 6PE and Inter-AS Option C (IPv6)`
- `Verify MPLS forwarding table has IPv6 label entries`

### MP-BGP IPv6 Multicast Address Family Config Error (Severity: HIGH)

Configure MP-BGP IPv6 multicast (AFI 2/SAFI 2) address family incorrectly, preventing IPv6 multicast RPF exchange

**Diagnostic Symptoms:**
- IPv6 multicast RPF information not exchanged
- BGP IPv6 multicast address family session not active
- Inter-domain IPv6 multicast not working
- IPv6 MBGP routes missing from routing table

**Troubleshooting Commands & Remediation:**
- `IPv6 multicast uses AFI 2/SAFI 2`
- `Verify 'address-family ipv6 multicast' configuration`
- `Ensure 'neighbor <ip> activate' under IPv6 multicast AF`
- `Check 'show bgp ipv6 multicast summary'`
- `MBGP carries unicast routes for RPF lookup`
- `Used with IPv6 PIM-SM for inter-domain multicast`

### BGP-LS SR-MPLS/SRv6 Extension Missing (Severity: HIGH)

Configure BGP-LS but SR (Segment Routing) extensions not populated, causing controller to lack SR topology information

**Diagnostic Symptoms:**
- BGP-LS database missing SR adj-SID or prefix-SID information
- Controller cannot compute SR paths
- BGP-LS TLV extensions not present
- SRGB range and MSD information missing

**Troubleshooting Commands & Remediation:**
- `SR extensions in BGP-LS carry prefix-SID, adj-SID, LAN adj-SID`
- `Verify IGP has SR extensions (OSPF SR or IS-IS SR)`
- `Check 'show bgp link-state link/prefix' for SR TLVs`
- `Minimum SR TLV information: SRGB range, MSD, SRLB`
- `For SRv6: locator, uSID, End/End.X SID information`
- `Ensure 'segment-routing mpls' is configured under IGP`

### BGP-LS Multi-Area Topology Collection Failure (Severity: MEDIUM)

Configure BGP-LS collecting topology from multiple IGP areas but inter-area links missing from topology database

**Diagnostic Symptoms:**
- BGP-LS database only contains single-area topology
- Multi-area topology incomplete
- Inter-area links not present in BGP-LS
- Controller lacks complete network topology

**Troubleshooting Commands & Remediation:**
- `Each IGP area must have BGP-LS session on area's ABR`
- `OR multiple BGP-LS speakers needed for multi-area visibility`
- `Check 'show bgp link-state' for node identifiers per area`
- `BGP-LS speakers must have full IGP database for their area`
- `Inter-area summaries reduced, not all L1/L2 IS-IS routes in LSDB`
- `Use multiple BGP-LS feeds per router per area if needed`

### MVPN I-PMSI Tunnel Setup Failure (Severity: HIGH)

Configure MVPN but Inclusive PMSI (Provider Multicast Service Interface) tunnel fails to establish between PEs

**Diagnostic Symptoms:**
- I-PMSI tunnel not established between PEs in same MVPN
- MVPN Type 1 (I-PMSI A-D) routes missing
- Multicast traffic from one PE not reaching other PEs
- PE multicast replication failure

**Troubleshooting Commands & Remediation:**
- `I-PMSI distributes multicast traffic to all PEs in the same MVPN`
- `Check 'show bgp ipv4 mvpn' for Type 1 I-PMSI A-D routes`
- `Verify P-tunnel technology (PIM-SM, MLDP, P2MP RSVP-TE)`
- `Ensure multicast core connectivity between PEs`
- `Check I-PMSI tunnel status: 'show mpls mldp database'`
- `P-tunnel mismatch between PEs prevents multicast forwarding`

### MVPN S-PMSI Switchover Failure (Severity: HIGH)

Configure MVPN S-PMSI (Selective PMSI) tunnel but switchover from I-PMSI fails for high-bandwidth multicast streams

**Diagnostic Symptoms:**
- All multicast traffic stays on I-PMSI tunnel
- S-PMSI tunnel not established despite threshold exceeded
- Type 3 (S-PMSI A-D) routes not generated
- Core bandwidth inefficient and PEs overwhelmed with unnecessary traffic

**Troubleshooting Commands & Remediation:**
- `S-PMSI provides optimal tree for high-bandwidth streams`
- `Check MVPN S-PMSI threshold: 'bandwidth <base> <threshold>'`
- `Verify S-PMSI is enabled under VRF multicast configuration`
- `Check 'show bgp ipv4 mvpn' for Type 3 S-PMSI A-D routes`
- `S-PMSI switchover triggered by bandwidth threshold`
- `Root PE generates S-PMSI routes for streams exceeding threshold`

