---
name: "EVPN Issues Injection"
description: "EVPN control plane related network faults for troubleshooting practice"
category: "computer-networking"
---

# EVPN Issues Injection

EVPN control plane related network faults for troubleshooting practice

## Supported Protocols
- evpn
- vxlan
- bgp

## Fault Injection Scenarios & Troubleshooting Procedures

### EVPN L2VNI Not Created on Leaf (Severity: HIGH)

L2VNI not configured or created on a leaf switch causing EVPN service not available

**Diagnostic Symptoms:**
- EVPN service not operational on specific VNI
- No MAC addresses learned via EVPN for the VNI
- Show vxlan vni missing the expected VNI
- End hosts cannot communicate across the fabric

**Troubleshooting Commands & Remediation:**
- `Check VNI with 'show vxlan vni' or 'show nve vni'`
- `Verify 'vni <id> l2' configuration under evpn`
- `Ensure VLAN-to-VNI mapping is correctly configured`
- `Check 'show bgp l2vpn evpn' for VNI-based routes`
- `VNI range: 1-16777215 (24-bit)`
- `Verify NVE interface is properly configured for the VNI`

### EVPN eBGP Peer Not Established (Severity: HIGH)

EVPN BGP peer session not established between leaf and spine

**Diagnostic Symptoms:**
- EVPN BGP session down between leaf and spine
- No EVPN routes exchanged
- BGP state stuck in IDLE or ACTIVE
- Underlay reachability issue to BGP peer

**Troubleshooting Commands & Remediation:**
- `Check BGP EVPN summary with 'show bgp l2vpn evpn summary'`
- `Verify peer IP address and AS number are correct`
- `Check 'show bgp l2vpn evpn neighbors <ip>' for state`
- `Ensure underlay routing reaches the peer IP`
- `Verify 'address-family l2vpn evpn' is activated for the peer`
- `Check 'send-community extended' is configured`

### EVPN VLAN-to-VNI Mapping Mismatch (Severity: HIGH)

Configure different VLAN-to-VNI mapping on leaf switches for the same tenant

**Diagnostic Symptoms:**
- VLAN not mapped to correct VNI across leaves
- Tenant L2 connectivity broken
- VLAN on one leaf maps to different VNI than another leaf
- MAC addresses learned but traffic not forwarded

**Troubleshooting Commands & Remediation:**
- `Check VLAN-VNI mapping with 'show vlan mapping' or 'show vxlan vni'`
- `Verify VNI mapping is consistent across all leaves`
- `L2VNI must be the same for the same broadcast domain`
- `Check 'show l2route evpn mac' for MAC-to-VNI consistency`
- `Verify 'evpn vni <id> l2' configuration matches on all leaves`
- `L3VNI must be consistent for the same VRF across leaves`

### EVPN Anycast Gateway IP Not Configured (Severity: HIGH)

Missing anycast gateway IP on IRB/SVI causing hosts unable to reach default gateway

**Diagnostic Symptoms:**
- Hosts cannot reach gateway IP for inter-subnet routing
- Different gateway MAC on different leaves
- Anycast gateway not responding to ARP requests
- First-hop redundancy not working

**Troubleshooting Commands & Remediation:**
- `Check anycast gateway with 'show irb' or 'show vlan irb'`
- `Verify 'anycast-gateway-mac <mac>' under IRB configuration`
- `All leaves must use the same anycast MAC address`
- `Use 'ip virtual-router address' for VARP support`
- `Check 'show l2route evpn mac ip' for gateway MAC distribution`
- `Anycast gateway enables active-active forwarding`

### EVPN Type 2 Route Missing (Severity: HIGH)

MAC/IP advertisement routes not being sent or received in EVPN

**Diagnostic Symptoms:**
- MAC addresses not learned via EVPN
- Hosts reachable locally but not across fabric
- Missing MAC mobility bindings
- Show l2route evpn mac missing expected entries

**Troubleshooting Commands & Remediation:**
- `Check EVPN MAC routes with 'show bgp l2vpn evpn route-type 2'`
- `Verify 'rewrite-evpn-rt-asn' is configured if needed`
- `Check 'show l2route evpn mac' for local MAC advertisements`
- `Type 2 routes carry MAC/IP and VLAN binding information`
- `Verify EVPN route targets are properly configured`
- `Check 'show bgp l2vpn evpn' for route distribution`

### EVPN Type 3 IMET Route Missing (Severity: HIGH)

Configure EVPN but Inclusive Multicast Ethernet Tag (IMET) routes not generated, preventing BUM traffic

**Diagnostic Symptoms:**
- BUM traffic not reaching remote VTEPs
- Type 3 routes missing from EVPN database
- Broadcast frames not forwarded across fabric
- Ingress replication list incomplete

**Troubleshooting Commands & Remediation:**
- `Type 3 carries VTEP IP, VNI, and PMSI tunnel info for BUM`
- `Check 'show bgp l2vpn evpn route-type 3' for IMET routes`
- `Each VTEP generates Type 3 per VNI/L2VNI`
- `Type 3 enables BUM traffic distribution`
- `Verify ingress replication or multicast tunnel signaled`
- `Check 'show evpn vni <id>' for IMET status`

### EVPN Type 5 IP Prefix Route Missing (Severity: HIGH)

Configure EVPN Type 5 route for IP prefix advertisement but routes not generated or imported correctly

**Diagnostic Symptoms:**
- IP prefixes not advertised via EVPN
- External/NAT prefixes missing from remote leaves
- Type 5 routes not in EVPN database
- L3VNI not associated with Type 5 routes

**Troubleshooting Commands & Remediation:**
- `Type 5 carries IP prefix + L3VNI + GW IP for inter-subnet/external`
- `Check 'show bgp l2vpn evpn route-type 5' for prefix routes`
- `Use 'advertise ipv4 unicast' under EVPN to generate Type 5`
- `Requires L3VNI configured on all leaf switches`
- `Type 5 redistributes connected/static/BGP routes into EVPN`
- `Verify route-target matches the L3VNI configuration`

### EVPN MAC Mobility / MAC Move Loop (Severity: LOW)

Configure EVPN with MAC mobility (host moves between ports) but sequence number or MAC move limit causes issues

**Diagnostic Symptoms:**
- MAC addresses flapping between local and remote VTEPs
- MAC mobility sequence number not incrementing correctly
- MAC move limit exceeded causing MAC freeze/blackhole
- Host connectivity loss after port-move event

**Troubleshooting Commands & Remediation:**
- `MAC mobility: sequence number tracks MAC location changes`
- `Check 'show l2route evpn mac <mac>' for sequence number`
- `Higher sequence number = newer location`
- `MAC move limit: default ~10 moves/sec triggers suppression`
- `Use 'mac move-limit <count>' to adjust threshold`
- `Stuck MAC: clear with 'clear l2route evpn mac <mac>'`

### EVPN DF (Designated Forwarder) Election Issue (Severity: MEDIUM)

Configure EVPN with multi-homed CE but designated forwarder election fails or incorrect DF elected

**Diagnostic Symptoms:**
- BUM traffic duplication from multi-homed CE
- DF election not converging for Ethernet segment
- Multiple PEs forwarding BUM to same CE
- Type 1 (Ethernet Auto-Discovery) routes not exchanged

**Troubleshooting Commands & Remediation:**
- `DF elected per Ethernet segment (ESI), per VNI`
- `Only DF forwards BUM traffic to multi-homed CE`
- `Check 'show evpn ethernet-segment <esi>' for DF status`
- `DF election: highest priority (modulo method), then highest IP`
- `Type 1 routes signal ESI label and DF election status`
- `All PEs in same ES must participate in DF election`

### EVPN ESI / Ethernet Segment Configuration Mismatch (Severity: CRITICAL)

Configure EVPN Ethernet Segment Identifier (ESI) inconsistently across PEs multi-homing the same CE

**Diagnostic Symptoms:**
- Multi-homing not working between PEs
- ESI mismatch prevents DF election
- Type 1 routes not generated for the ES
- MAC addresses flapping between PEs

**Troubleshooting Commands & Remediation:**
- `ESI uniquely identifies an Ethernet segment (10 bytes)`
- `PEs multi-homing same CE must use same ESI value`
- `Check 'show evpn ethernet-segment <esi> detail'`
- `ESI format: type 0/1/2/3/4/5 with specific encoding`
- `Auto-generated vs manually configured ESI`
- `ESI mismatch causes DF election failure and MAC flap`

### EVPN E-ALIASing / Load Balancing Issue (Severity: LOW)

Configure EVPN with aliasing (E-ALIAS) but load balancing not distributing traffic across multi-homed PEs

**Diagnostic Symptoms:**
- Traffic not load balanced across multi-homed PE links
- One PE carries all traffic for a MAC despite active-active
- Aliasing not working for single-active redundancy mode
- ESI label not programmed for load balancing

**Troubleshooting Commands & Remediation:**
- `E-ALIAS: remote PE sends traffic to any multi-homed PE`
- `Type 1 routes carry ESI label for aliasing`
- `Check 'show evpn ethernet-segment <esi> aliasing'`
- `All PEs in ES must advertise same ESI for aliasing`
- `Single-active: one PE forwards, others standby per VLAN`
- `All-active: all PEs forward traffic simultaneously`

### EVPN L3VNI / IP VRF Configuration Mismatch (Severity: CRITICAL)

Configure EVPN L3VNI (IP VRF VNI) inconsistently across leaf switches, breaking IP routing

**Diagnostic Symptoms:**
- IP routes not exchanged between leaves via EVPN
- L3VNI mismatch between leaf switches
- Type 5 routes missing for VRF prefixes
- VRF RT import/export incorrectly matching L3VNI

**Troubleshooting Commands & Remediation:**
- `L3VNI must be same across all leaves for the same VRF`
- `Check 'show vrf <name>' for L3VNI assignment`
- `Use 'vni <id> l3' to map L3VNI to VRF`
- `Route-target for L3VNI must be consistent`
- `Check 'show bgp l2vpn evpn route-type 5' for prefix routes`
- `L3VNI different from L2VNI (separate VNI range or allocation)`

### EVPN ARP/ND Suppression Cache Miss (Severity: LOW)

Configure EVPN with ARP/ND suppression but cache miss causes BUM flooding for ARP/ND packets

**Diagnostic Symptoms:**
- Excessive ARP flooding across VXLAN fabric
- ARP suppression cache miss rate high
- Remote host ARP entries not populated from EVPN
- ND suppression not working for IPv6

**Troubleshooting Commands & Remediation:**
- `EVPN Type-2 routes populate ARP/ND suppression database`
- `Check 'show evpn arp-cache vni <id>' for cached entries`
- `Cache miss = ARP flooded to all remote VTEPs`
- `Ensure all hosts MAC/IP advertised via Type-2`
- `ND suppression for IPv6 Neighbor Discovery`
- `Threshold tuning: 'arp suppression interval <seconds>'`

### EVPN IRB Anycast Gateway MAC Conflict (Severity: HIGH)

Configure EVPN anycast gateway with same IP but different MAC addresses across leaf switches

**Diagnostic Symptoms:**
- Hosts experiencing intermittent gateway connectivity
- ARP resolution returning different MAC for same gateway IP
- Traffic forwarded incorrectly due to MAC mismatch
- Gateway load balancing not working

**Troubleshooting Commands & Remediation:**
- `All leaves must use identical anycast gateway MAC`
- `Configure 'fabric forwarding anycast-gateway-mac <mac>'`
- `Default anycast MAC: 2022.0000.0000 (Cisco)`
- `Check 'show ip arp <gateway-ip>' on multiple leaves`
- `Different MACs = hosts confused about which leaf is gateway`
- `Anycast MAC enables active-active first-hop redundancy`

### EVPN VNI Route Target Import/Export Filtering (Severity: HIGH)

Configure EVPN VNI route target filtering incorrectly, preventing VNI-specific route exchange

**Diagnostic Symptoms:**
- EVPN routes for specific VNI not imported on remote leaf
- RT filtering blocking VNI-specific routes
- Partial VNI operation - some leaves get routes, others don't
- Type 2/3 routes for specific VNI missing

**Troubleshooting Commands & Remediation:**
- `Each VNI has its own RT import/export policy`
- `Check 'show bgp l2vpn evpn vni <id>' for RT configuration`
- `Use 'route-target both <rt>' under 'evpn vni <id> l2'`
- `RT format usually follows VNI or tenant AS (e.g., 65000:<vni>)`
- `RT mismatch is the most common EVPN configuration error`
- `Auto-RT generation: <bGP-AS>:<VNI> or <bGP-AS>:<VLAN-ID>`

### EVPN E-Tree / Root-and-Leaf Topology Misconfiguration (Severity: LOW)

Configure EVPN E-Tree incorrectly, causing leaf-to-leaf communication when isolation is required

**Diagnostic Symptoms:**
- Leaf (AC) ports communicate when they should be isolated
- Root (MP) ports not forwarding correctly
- E-Tree VLAN/EVPN isolation tag not applied
- BUM traffic between leaves not expected

**Troubleshooting Commands & Remediation:**
- `E-Tree isolates leaf (AC) ports but connects them via root (MP)`
- `Leaf-to-leaf communication must be blocked in E-Tree`
- `Root-to-leaf and leaf-to-root communication allowed`
- `Check 'show evpn etree vlan <id>' for isolation status`
- `EVPN E-Tree uses DF election for leaf isolation`
- `Common in Mobile Backhaul and aggregation networks`

