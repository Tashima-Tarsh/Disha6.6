---
name: "Cross-Protocol Interaction Issues Injection"
description: "End-to-end and cross-protocol network faults for advanced troubleshooting practice"
category: "computer-networking"
---

# Cross-Protocol Interaction Issues Injection

End-to-end and cross-protocol network faults for advanced troubleshooting practice

## Supported Protocols
- ospf
- bgp
- mpls
- ldp
- vrrp
- hsrp
- nat
- pbr
- ip-sla
- tracking
- dhcp-snooping
- dai
- stp
- vlan

## Fault Injection Scenarios & Troubleshooting Procedures

### OSPF-BGP Route Redistribution Loop (Severity: CRITICAL)

Configure mutual redistribution between OSPF and BGP without route filtering causing routing loops

**Diagnostic Symptoms:**
- Routing loops between OSPF and BGP domains
- Route flapping (route withdrawn and re-advertised repeatedly)
- High CPU on redistribution routers
- Inconsistent routing tables across the network
- Suboptimal routing or black holes

**Troubleshooting Commands & Remediation:**
- `Use route tags to identify redistributed routes`
- `Apply route-maps with match tags to prevent feedback`
- `Check 'show ip route <prefix>' for multiple protocol sources`
- `Verify administrative distance ordering is correct`
- `Use 'show ip protocols' for redistribution statements`
- `Implement distribute-lists or prefix-lists on redistribution points`

### MPLS LDP-IGP Label Distribution Desync (Severity: CRITICAL)

LDP sessions not established despite IGP convergence causing label black holes

**Diagnostic Symptoms:**
- IP forwarding works but MPLS forwarding fails
- LSP ping fails despite IP reachability
- MPLS traffic blackholed at specific router
- VPN/MPLS services broken while underlay IP works

**Troubleshooting Commands & Remediation:**
- `Check 'show mpls ldp neighbor' for LDP session status`
- `Verify 'show mpls forwarding-table' for label entries`
- `Check 'show mpls ldp igp sync' for sync state`
- `LDP router ID must be reachable via IGP`
- `Use 'mpls ldp igp sync' to prevent blackholing during convergence`
- `Verify transport address in LDP matches IGP reachable address`

### VRRP/HSRP NAT Failover Tracking (Severity: HIGH)

VRRP/HSRP active router loses upstream connectivity but NAT state not synchronized to backup

**Diagnostic Symptoms:**
- NAT translations lost after VRRP/HSRP failover
- Existing connections broken after master switch
- New connections work through backup but old ones fail
- Stateful failover not configured between firewalls

**Troubleshooting Commands & Remediation:**
- `Check VRRP/HSRP state on both routers`
- `NAT is stateless by default - failover drops all translations`
- `Configure NAT stateful failover (bulk sync)`
- `Use 'show ip nat translations verbose' for session info`
- `HSRP with 'standby track' adjusts priority on upstream loss`
- `For stateful NAT: configure 'ip nat stateful id' and bulk sync`

### PBR with IP SLA Tracking Failure (Severity: HIGH)

PBR set next hop with IP SLA tracking not causing failover when next hop becomes unreachable

**Diagnostic Symptoms:**
- Traffic continues to go to unreachable next hop
- IP SLA probe shows down but PBR still using the next hop
- No failover to backup next hop
- PBR set next-hop verify-availability not configured

**Troubleshooting Commands & Remediation:**
- `Check IP SLA with 'show ip sla statistics'`
- `Verify track object with 'show track <id>'`
- `PBR must use 'set ip next-hop verify-availability' for tracking`
- `Check 'show route-map' for match counts`
- `Without verification, PBR uses ARP table for reachability`
- `Configure multiple next-hops: 'set ip next-hop <ip1> <ip2>'`

### Combined DHCP Snooping + DAI + IP Source Guard (Severity: HIGH)

One of the switch security features blocking traffic while others allow it

**Diagnostic Symptoms:**
- DHCP client gets IP but cannot communicate
- ARP packets blocked by DAI despite valid DHCP binding
- IP Source Guard drops traffic from valid source IP
- One feature blocking while the others pass traffic

**Troubleshooting Commands & Remediation:**
- `Check 'show ip dhcp snooping binding' for valid entries`
- `Check 'show ip arp inspection interfaces' for DAI status`
- `Check 'show ip verify source' for IP Source Guard status`
- `Ensure DHCP snooping trust on uplink ports`
- `DAI requires DHCP snooping bindings to validate ARP`
- `IPSG requires DHCP snooping bindings to verify IP traffic`

### HSRP/VRRP with Uplink Object Tracking Chain (Severity: HIGH)

Configure HSRP with multiple tracked objects causing priority decrement miscalculation

**Diagnostic Symptoms:**
- HSRP active router does not yield mastership when multiple uplinks fail
- Cumulative priority decrement miscalculated
- Failover too sensitive (single link failure triggers failover)
- Failover not sensitive enough (all uplinks down but no failover)

**Troubleshooting Commands & Remediation:**
- `Check HSRP state with 'show standby'`
- `Verify track objects with 'show track' for each tracked object`
- `Use track list (AND/OR) for complex tracking logic`
- `Check priority decrement values: cumulative across all tracked objects`
- `Total decrement must be > (active priority - standby priority)`
- `Use 'standby <group> preempt delay <seconds>' for stable failback`

### VLAN Change Triggering STP Reconvergence (Severity: LOW)

Add or remove a VLAN on a trunk causing STP topology change for that VLAN

**Diagnostic Symptoms:**
- STP reconvergence after VLAN changes on trunk
- Traffic interruption for specific VLANs only
- Mac-address-table flush due to topology change
- Temporary forwarding delay after VLAN modification

**Troubleshooting Commands & Remediation:**
- `VLAN changes on trunk trigger STP TC (Topology Change)`
- `TC causes MAC-table flush for the affected VLAN`
- `RSTP converges faster (sub-second) vs classic STP (30-50s)`
- `Use 'show spanning-tree vlan <vlan>' for STP state`
- `Check TCN count with 'show spanning-tree detail'`
- `Use Portfast on access ports to reduce TC propagation`

### IPv4/IPv6 DNS Resolution Failure (Severity: LOW)

DNS server reachable via IPv4 but not IPv6 (or vice versa) causing name resolution failures

**Diagnostic Symptoms:**
- DNS resolution fails for specific address family
- IPv6-only hosts cannot resolve names
- DNS server not responding on IPv6 transport
- Applications preferring one address family over the other

**Troubleshooting Commands & Remediation:**
- `Check DNS server reachability: 'ping <dns-ip>' over both AF`
- `Verify DNS server listens on both IPv4 and IPv6`
- `Use 'nslookup -query=AAAA <host>' vs 'nslookup -query=A <host>'`
- `Check DNS resolution order in '/etc/resolv.conf' or 'name-server' config`
- `Dual-stack clients prefer IPv6 by default (RFC 6724)`
- `Verify firewall rules allow DNS (UDP/TCP 53) for both AF`

### BGP/OSPF Administrative Distance Conflict (Severity: HIGH)

Configure BGP and OSPF with overlapping prefixes causing incorrect route preference due to AD mismatch

**Diagnostic Symptoms:**
- BGP route preferred over OSPF (or vice versa) unexpectedly
- iBGP (AD 200) less preferred than OSPF (AD 110)
- eBGP (AD 20) more preferred than OSPF (AD 110)
- Route selection not matching routing policy intent

**Troubleshooting Commands & Remediation:**
- `Default AD: eBGP=20, OSPF=110, iBGP=200`
- `Use 'distance <ext> <int> <local>' under BGP to adjust`
- `Use 'distance ospf <intra> <inter> <external>' under OSPF`
- `Check 'show ip route <prefix>' for AD of installed route`
- `Higher AD = less trusted (iBGP 200 vs OSPF 110)`
- `Careful: changing AD affects all prefixes, not specific ones`

### NAT + DNS / Split-DNS Interworking Issue (Severity: HIGH)

Configure NAT with split-DNS but internal users get wrong IP for external resources

**Diagnostic Symptoms:**
- Internal users receive private IP for public resource
- Split-DNS returning wrong IP for internal query
- NAT and DNS not coordinated for internal/external resolution
- Users can't access services via hostname

**Troubleshooting Commands & Remediation:**
- `Split-DNS: internal DNS returns private IP, external returns public`
- `NAT DNS doctoring (ALG) rewrites DNS response payload`
- `Check NAT ALG: 'ip nat service dns' (enables DNS ALG)`
- `Without split-DNS: internal users get public IP (NAT may not work)`
- `With split-DNS: users get private IP (direct access, no NAT)`
- `Best practice: split-DNS + no NAT for internal-to-internal access`

### MPLS + BGP Label Allocation / BGP-Free Core Issue (Severity: HIGH)

Configure BGP labeled routes not being used for BGP-free core MPLS forwarding

**Diagnostic Symptoms:**
- Core P routers running BGP despite BGP-free design
- BGP routes not labeled for MPLS transport through core
- PHP routers popping labels too early
- Label stack depth insufficient for BGP-free forwarding

**Troubleshooting Commands & Remediation:**
- `BGP-free core: P routers only run IGP/LDP, no BGP`
- `Edge routers impose BGP label + transport label stack`
- `Use 'neighbor <ip> send-label' for BGP labeled unicast`
- `Check 'show mpls forwarding-table <bgp-prefix>' for label stack`
- `PHP pops transport label, leaving BGP label for egress PE`
- `Without send-label: PEs need iBGP full mesh for BGP routes`

### 802.1X + DHCP Snooping / Authentication Interop (Severity: HIGH)

Configure 802.1X with DHCP snooping but DHCP snooping bindings not created after 802.1X auth

**Diagnostic Symptoms:**
- DHCP snooping bindings not created for authenticated clients
- IP Source Guard blocking authenticated clients
- DAI dropping ARP from authenticated devices
- Security features conflicting with NAC flow

**Troubleshooting Commands & Remediation:**
- `802.1X authenticates, DHCP snooping learns IP binding`
- `Order: authenticate -> DHCP -> snooping binding -> IPSG/DAI`
- `Check 'show ip dhcp snooping binding' after auth`
- `Ensure 'ip dhcp snooping' is enabled on the authentication VLAN`
- `DHCP snooping trust on uplink to DHCP server`
- `IPSG: 'ip verify source' after DHCP snooping binding created`

