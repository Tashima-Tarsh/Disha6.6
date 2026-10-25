---
name: "VXLAN Issues Injection"
description: "VXLAN encapsulation and tunnel related network faults for troubleshooting practice"
category: "computer-networking"
---

# VXLAN Issues Injection

VXLAN encapsulation and tunnel related network faults for troubleshooting practice

## Supported Protocols
- vxlan
- evpn

## Fault Injection Scenarios & Troubleshooting Procedures

### VXLAN VNI Mismatch (Severity: HIGH)

Configure different VNI values on VTEPs for the same L2 segment

**Diagnostic Symptoms:**
- VXLAN segment not connected across VTEPs
- VNI mismatch between EVPN route target and VXLAN segments
- L2 connectivity broken across the fabric
- Hosts in the same L2 segment cannot communicate

**Troubleshooting Commands & Remediation:**
- `Check VNI mapping with 'show vxlan vni' or 'show nve vni'`
- `VNI must match across all VTEPs in the same L2 segment`
- `VNI range: 1-16777215 (24-bit)`
- `VNI to EVPN route-target mapping must be consistent`
- `Check L2VNI vs L3VNI configuration`
- `Verify 'show bgp l2vpn evpn' for VNI-based route import`

### VTEP Reachability Failure (Severity: HIGH)

Configure incorrect VTEP (VXLAN Tunnel Endpoint) IP or routing preventing tunnel establishment

**Diagnostic Symptoms:**
- VXLAN tunnel not coming up
- Underlay routing missing between VTEPs
- VXLAN packet encapsulation not happening
- VTEP unreachable from remote VTEP

**Troubleshooting Commands & Remediation:**
- `Check VTEP IP with 'show nve interface' or 'show vxlan interface'`
- `Verify underlay routing (OSPF/ISIS) between VTEP IPs`
- `VTEP IP must be reachable via underlay (not overlay)`
- `Use ping to verify underlay connectivity`
- `Check loopback interface used as VTEP source is advertised in underlay`
- `Verify MTU across underlay path (must be > 1550 for VXLAN overhead)`

### VXLAN UDP Destination Port Misconfiguration (Severity: MEDIUM)

Configure non-standard UDP destination port for VXLAN, or firewall blocking standard UDP 4789

**Diagnostic Symptoms:**
- VXLAN encapsulation/decapsulation not working
- VXLAN packets dropped by firewall or ACL
- VXLAN traffic not forwarded between VTEPs
- Non-standard port requires platform support

**Troubleshooting Commands & Remediation:**
- `Standard VXLAN UDP port is 4789 (IANA assigned)`
- `Check 'show vxlan' or 'show nve' for UDP port configuration`
- `Verify firewall/ACL permits UDP 4789`
- `Non-standard port requires matching configuration on all VTEPs`
- `Use 'udp port <port>' under VXLAN/NVE configuration`
- `Check for MTU issues (VXLAN adds 50 bytes overhead)`

### VXLAN MTU Mismatch (Severity: HIGH)

Configure incorrect MTU causing VXLAN packet fragmentation or drops

**Diagnostic Symptoms:**
- Large packets dropped across VXLAN
- VXLAN fragmentation causing performance issues
- TCP PMTU discovery failures
- Application-specific issues with large packets

**Troubleshooting Commands & Remediation:**
- `VXLAN adds 50 bytes overhead (14B eth + 20B IP + 8B UDP + 8B VXLAN)`
- `Physical MTU must be at least 1550 bytes for 1500 byte payload`
- `Check 'show interface' for MTU on all links in underlay`
- `Use 'ip mtu 9216' for jumbo frames (allows 9166 byte payload)`
- `Verify 'show vxlan' for MTU configuration`
- `Check for ICMP fragmentation needed messages`

### VXLAN EVPN RD/RT Configuration Mismatch (Severity: HIGH)

Configure VXLAN with EVPN but Route Distinguisher or Route Target values inconsistent across leaf switches

**Diagnostic Symptoms:**
- EVPN routes not imported for specific VNIs across leaves
- VNI-based route target mismatch prevents MAC learning
- RT import/export values inconsistent for same tenant
- L2VNI/L3VNI routes missing from remote leaves

**Troubleshooting Commands & Remediation:**
- `Check RT configuration with 'show bgp l2vpn evpn vni <id>'`
- `Each VNI needs consistent route-target across all leaves`
- `Use 'evpn vni <id> l2 route-target import <rt> export <rt>'`
- `Verify RD format matches on all leaves for same VNI`
- `Check 'show evpn vni <id>' for VNI operational status`
- `L3VNI requires separate RT from L2VNI`

### VXLAN L3VNI / IP VRF VNI Misconfiguration (Severity: CRITICAL)

Configure VXLAN L3VNI (Layer 3 VNI for IP VRF) incorrectly, breaking inter-subnet routing

**Diagnostic Symptoms:**
- Inter-subnet routing not working in VXLAN fabric
- L3VNI not configured or mismatched across leaves
- VRF routes not advertised via EVPN Type-5
- IP prefix routes missing across tenants

**Troubleshooting Commands & Remediation:**
- `L3VNI carries tenant IP routes across the VXLAN fabric`
- `Check 'show vxlan vni' for L3VNI (not L2VNI) entries`
- `L3VNI must be same across all leaves for same VRF`
- `IRB (Integrated Routing and Bridging) interface uses L3VNI`
- `Check 'show bgp l2vpn evpn route-type 5' for IP prefix routes`
- `L3VNI uses same underlay but different VNI range from L2VNI`

### VXLAN Symmetric IRB Routing Configuration Error (Severity: HIGH)

Configure VXLAN symmetric IRB incorrectly, preventing MAC/IP forwarding between leaf switches

**Diagnostic Symptoms:**
- Inter-VNI traffic dropped at egress leaf
- Symmetric IRB not performing L3 lookup on both ingress and egress
- L3VNI not used for IP routing between VNIs
- IP mobility between leaves failing

**Troubleshooting Commands & Remediation:**
- `Symmetric IRB: both ingress and egress leaf perform L3 routing`
- `Requires L3VNI for IP VRF on every leaf`
- `Check 'show l3vni' for VRF to L3VNI mapping`
- `Each leaf needs all tenant VRFs with matching L3VNI`
- `Type-2 routes carry MAC + IP + VNI + next-hop info`
- `Type-5 routes carry IP prefix + L3VNI for inter-subnet`

### VXLAN Asymmetric IRB Routing Issue (Severity: MEDIUM)

Configure VXLAN asymmetric IRB incorrectly, requiring all leaves to have all L2VNI definitions

**Diagnostic Symptoms:**
- Asymmetric IRB routing failing when destination leaf lacks source VNI
- EVPN Type-2 routes not containing routing information
- Inter-subnet traffic dropped at remote leaf
- Leaf does not have source VLAN/VNI definition

**Troubleshooting Commands & Remediation:**
- `Asymmetric IRB: ingress leaf routes, egress leaf bridges`
- `Requires all L2VNI present on every leaf (NxN VNI provisioning)`
- `Disadvantage: VNI explosion as number of tenants grows`
- `Check destination leaf for source VNI presence`
- `Asymmetric IRB simpler in small fabrics`
- `Symmetric IRB preferred for large-scale fabrics`

### VXLAN BUM / Ingress Replication Configuration Error (Severity: HIGH)

Configure VXLAN ingress replication incorrectly for BUM traffic, causing missed or flooded traffic

**Diagnostic Symptoms:**
- BUM traffic not reaching all VTEPs
- Broadcast traffic dropping in VXLAN fabric
- Unknown unicast flooding not working across VTEPs
- Ingress replication list incomplete

**Troubleshooting Commands & Remediation:**
- `BUM = Broadcast, Unknown unicast, Multicast in VXLAN`
- `Ingress replication: headend sends BUM copies to all remote VTEPs`
- `Check 'show nve vni' for ingress replication list`
- `EVPN Type-3 (IMET) routes signal BUM reachability`
- `Verify Type-3 routes received from all remote VTEPs`
- `Alternative: multicast underlay for BUM distribution`

### VXLAN Multicast Underlay for BUM Misconfiguration (Severity: HIGH)

Configure VXLAN with multicast underlay (instead of ingress replication) but PIM/IGMP not correctly set up

**Diagnostic Symptoms:**
- BUM traffic not reaching VTEPs in multicast group
- PIM not forwarding VXLAN multicast traffic
- IGMP join for VXLAN group missing
- Multicast underlay not delivering BUM to all VTEPs

**Troubleshooting Commands & Remediation:**
- `Multicast underlay: each VNI maps to a multicast group`
- `VTEPs join the multicast group for BUM reception`
- `Check 'show ip igmp groups' for VXLAN group membership`
- `Verify PIM neighbors established on underlay`
- `Check 'show ip mroute <group>' for multicast forwarding`
- `Requires PIM-SM or PIM-SSM in underlay`

### VXLAN ARP/ND Suppression Misconfiguration (Severity: MEDIUM)

Configure VXLAN ARP suppression incorrectly, causing ARP timeouts or flooding across fabric

**Diagnostic Symptoms:**
- Excessive ARP flooding across VXLAN fabric
- ARP entries not cached locally on VTEP
- ARP suppression causing connectivity loss
- Host ARP requests not responded to by local VTEP

**Troubleshooting Commands & Remediation:**
- `VTEPs learn and cache remote MAC-IP bindings via EVPN Type-2`
- `ARP suppression: VTEP responds to ARP from its proxy cache`
- `Check 'show vxlan arp-cache' for proxy ARP entries`
- `ARP suppression reduces BUM flooding significantly`
- `If cache entry missing: ARP is flooded to all VTEPs`
- `ND suppression: same concept for IPv6 neighbor discovery`

### VXLAN VTEP Multi-Homing / vPC Anycast VTEP Issue (Severity: HIGH)

Configure VTEP multi-homing (dual-homed host) with vPC but anycast VTEP IP or BUM handling fails

**Diagnostic Symptoms:**
- Dual-homed host not reachable via both VTEPs
- Anycast VTEP IP conflict causing MAC flap
- BUM traffic duplication on dual-homed link
- vPC peer-link forwarding issues for VXLAN

**Troubleshooting Commands & Remediation:**
- `Anycast VTEP: same VTEP IP on both vPC peers`
- `Both peers present themselves as the same VTEP to remote leaves`
- `Check 'show vpc consistency-parameters vxlan' for consistency`
- `Use 'anycast-mac' to share MAC across VTEP pair`
- `VXLAN traffic via peer-link causes latency (avoid)`
- `Anycast VTEP enables active-active load balancing`

### VXLAN VTEP Source IP Interface Flapping (Severity: CRITICAL)

Configure VTEP source interface (loopback) going down, causing all VXLAN tunnels to fail

**Diagnostic Symptoms:**
- VTEP source interface down impacting all VXLAN tunnels
- All VXLAN traffic drops when source loopback flaps
- VXLAN tunnel interface state follows source interface state
- Multiple VTEPs unreachable simultaneously

**Troubleshooting Commands & Remediation:**
- `VTEP source interface = loopback used as tunnel source`
- `If loopback goes down, all VXLAN tunnels using it go down`
- `Use 'nve source-interface loopback <id>' for VTEP source`
- `Ensure loopback is always up (not dependent on any physical link)`
- `Use IP redundancy (anycast IP) on dual VTEPs`
- `Monitor 'show nve interface' for source interface status`

### VXLAN MAC Learning / MAC Table Issues (Severity: HIGH)

Configure VXLAN with EVPN control plane but MAC learning inconsistencies between data plane and control plane

**Diagnostic Symptoms:**
- MAC addresses learned via data plane not advertised via EVPN
- Stale MAC entries not cleaned from VXLAN table
- MAC flap between local and remote VTEP
- MAC table full on leaf switch

**Troubleshooting Commands & Remediation:**
- `EVPN replaces data-plane MAC learning with control-plane learning`
- `Check 'show l2route evpn mac' for EVPN MAC entries`
- `Check 'show mac address-table' for VXLAN MACs`
- `Disable data-plane learning for VXLAN interfaces`
- `MAC mobility: sequence number tracks latest location`
- `MAC tables > VXLAN scale require hardware review`

### VXLAN vPC BUM Traffic Replication Issue (Severity: HIGH)

Configure VXLAN with vPC but BUM traffic duplicated or not reaching dual-homed hosts

**Diagnostic Symptoms:**
- Dual-homed host receives duplicate BUM packets
- BUM traffic not reaching one leg of dual-homed host
- vPC peer-link carrying VXLAN BUM unnecessarily
- Traffic storm on vPC peer-link

**Troubleshooting Commands & Remediation:**
- `vPC VTEP peers coordinate BUM replication for dual-homed hosts`
- `Use vPC ARP synchronization to avoid duplicate responses`
- `Check 'show vpc vxlan consistency' for BUM handling`
- `Ingress replication: only one vPC peer should forward BUM`
- `Use 'ip igmp snooping vpc' for multicast underlay with vPC`
- `Split Horizon: avoid forwarding BUM back to originating VTEP`

### VXLAN QoS / DSCP Mapping Misconfiguration (Severity: MEDIUM)

Configure VXLAN with incorrect DSCP-to-outer-VXLAN mapping, causing QoS markings to be lost across fabric

**Diagnostic Symptoms:**
- DSCP markings not preserved across VXLAN tunnel
- QoS policies not applying correctly to VXLAN traffic
- Inner packet DSCP not copied to outer VXLAN header
- Incorrect QoS treatment in underlay network

**Troubleshooting Commands & Remediation:**
- `VXLAN outer IP header has DSCP field for QoS marking`
- `Configure 'qos trust' or DSCP mapping on NVE interface`
- `Copy inner DSCP to outer VXLAN header for end-to-end QoS`
- `Use 'show qos interface nve <id>' for QoS status`
- `Underlay QoS policies classify based on outer DSCP`
- `VXLAN outer DSCP independent of inner customer markings`

