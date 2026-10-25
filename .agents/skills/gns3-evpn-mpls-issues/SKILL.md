---
name: "EVPN MPLS Issues Injection"
description: "EVPN over MPLS control/data plane related network faults"
category: "computer-networking"
---

# EVPN MPLS Issues Injection

EVPN over MPLS control/data plane related network faults

## Supported Protocols
- evpn
- mpls
- ldp
- pim

## Fault Injection Scenarios & Troubleshooting Procedures

### EVPN MPLS Label Allocation Failure (Severity: HIGH)

EVPN MPLS service label not allocated for an EVI (EVPN Instance)

**Diagnostic Symptoms:**
- EVPN MPLS label missing for the EVI
- MPLS forwarding table has no entry for EVPN prefix
- EVPN route received but no label for forwarding
- L2VPN service broken (label missing)

**Troubleshooting Commands & Remediation:**
- `Check EVPN label with 'show bgp l2vpn evpn <prefix>' for label field`
- `Verify 'evpn mpls label <id>' or auto-derived label`
- `On egress PE: label allocated per EVI or per MAC`
- `Check 'show mpls forwarding-table' for label entries`
- `Per-EVI label: all traffic for the EVI uses same label`
- `Per-MAC label: unique label per MAC address (aliasing)`

### EVPN MPLS LSP Tunnel Failure (Severity: HIGH)

MPLS LSP (Label Switched Path) not available for EVPN forwarding between PEs

**Diagnostic Symptoms:**
- EVPN MPLS traffic not forwarded between PEs
- LSP ping fails between PE endpoints
- BGP EVPN routes exchanged but MPLS path broken
- Underlay reachability fine but labeled path fails

**Troubleshooting Commands & Remediation:**
- `Check MPLS LSP with 'ping mpls ipv4 <peer-router-id>'`
- `Verify LDP sessions between PEs (direct or targeted)`
- `For SR-MPLS: check prefix-SID for the PE loopback`
- `Check 'show mpls forwarding-table' for transport label`
- `EVPN service label is inner, transport label is outer`
- `Use 'traceroute mpls ipv4 <peer>' to trace LSP path`

### EVPN MPLS Encapsulation Type Mismatch (Severity: HIGH)

Configure EVPN MPLS with wrong encapsulation type (VLAN vs Ethernet)

**Diagnostic Symptoms:**
- EVPN MPLS forwarding not working between PEs
- Encapsulation type mismatch between peers
- VLAN tag handling inconsistent across the network
- L2 frame corruption at egress PE

**Troubleshooting Commands & Remediation:**
- `EVPN encapsulation: VLAN (802.1Q preserved) or Ethernet (dot1q stripped)`
- `Encapsulation type must match on all PEs in the same EVI`
- `Check with 'show evpn evi <id>' for encapsulation type`
- `VLAN-based: one EVI per VLAN (VLAN tag transmitted)`
- `VLAN-bundle: multiple VLANs mapped to same EVI (tags stripped)`
- `VLAN-aware: single EVI, per-VLAN service with VLAN ID`

### EVPN MPLS Multicast / P2MP LSP Issues (Severity: HIGH)

EVPN MPLS multicast traffic not flowing due to missing P2MP LSP

**Diagnostic Symptoms:**
- BUM traffic not forwarded across EVPN MPLS network
- P2MP LSP not established for EVPN multicast
- Ingress replication working but mLDP/P2MP not
- Multicast receiver not receiving VPLS/EVPN BUM traffic

**Troubleshooting Commands & Remediation:**
- `EVPN MPLS BUM: ingress replication or P2MP LSP (mLDP/RSVP-TE)`
- `Check 'show l2vpn evpn multicast' for BUM forwarding mode`
- `Ingress replication: traffic replicated per PE (simpler)`
- `P2MP LSP: more efficient for multicast distribution`
- `Check mLDP: 'show mpls mldp database' for P2MP tree`
- `Verify PIM is enabled on underlay interfaces for multicast`

### EVPN MPLS EVI (EVPN Instance) Misconfiguration (Severity: HIGH)

Configure EVI with wrong parameters (RD, RT) on different PEs

**Diagnostic Symptoms:**
- EVPN MPLS service not operational
- EVI parameters not consistent across PEs
- Route import/export failure for the EVI
- L2VPN service configuration incomplete

**Troubleshooting Commands & Remediation:**
- `Check EVI with 'show evpn evi <id>'`
- `EVI configuration: 'evpn evi <id> rd <rd> route-target <rt>'`
- `RD must be unique per EVI per PE`
- `RT must match across PEs for the same EVI (import/export)`
- `Check 'show bgp l2vpn evpn evi <id>' for EVI routes`
- `Control-word: 'mpls control-word' for L2 header preservation`

### EVPN MPLS MAC Distribution / Learning Failure (Severity: LOW)

MAC addresses not distributed via EVPN MPLS between PEs

**Diagnostic Symptoms:**
- Remote MAC addresses not learned via EVPN MPLS
- Type 2 routes present in BGP but MAC not installed
- CE-facing interfaces not learning remote MACs
- Flooding unknown unicast across the MPLS core

**Troubleshooting Commands & Remediation:**
- `Check local MAC learning: 'show l2vpn evpn mac evi <id>'`
- `Check remote MAC: 'show l2vpn evpn mac evi <id>' (remote entries)`
- `Verify Type 2 routes in BGP: 'show bgp l2vpn evpn route-type 2'`
- `MAC mobility: sequence numbers track MAC moves`
- `Disable MAC advertisement: 'no evpn advertise mac'`
- `IRB: routed interfaces need 'evpn arp advertise' for IP routes`

### EVPN MPLS Control-Word / Sequencing Misconfiguration (Severity: LOW)

Configure EVPN MPLS control-word incorrectly causing frame sequencing or OAM issues

**Diagnostic Symptoms:**
- L2 frame sequencing issues across EVPN MPLS
- Control-word not preserving frame ordering
- OAM not working over EVPN MPLS PW
- Control-word mismatch between PEs

**Troubleshooting Commands & Remediation:**
- `Control word (CW): 4 bytes preserving L2 header info`
- `Use 'mpls control-word' under EVPN instance or EVI`
- `CW must be consistent across all PEs in EVI`
- `CW includes: sequence number, flags, fragment info`
- `Check 'show evpn evi <id>' for control-word status`
- `Without CW: some L2 frames may arrive out of order`

### EVPN MPLS Bandwidth / EVI Load Balancing Issue (Severity: LOW)

Configure EVPN MPLS multi-homing but bandwidth not load shared across PEs

**Diagnostic Symptoms:**
- Single PE carries all traffic for multi-homed CE
- EVPN multi-homing not load balancing across PEs
- DF election not distributing traffic per EVI
- Bandwidth across PEs not utilized

**Troubleshooting Commands & Remediation:**
- `DF election per EVI determines traffic forwarding`
- `Check 'show evpn ethernet-segment <esi> evi <id>' for DF`
- `Load balancing: use service carving (DF per EVI)`
- `Use 'lacp max-bundle' or distribute VLANs across PEs`
- `Verify ESI configuration consistent on multi-homed PEs`
- `Check 'show evpn ethernet-segment' for multi-homing status`

### EVPN MPLS-VXLAN Interworking Gateway (Severity: CRITICAL)

Configure EVPN MPLS to VXLAN interworking gateway but mapping between MPLS labels and VNI fails

**Diagnostic Symptoms:**
- Traffic from EVPN MPLS domain not reaching VXLAN domain
- Gateway label-to-VNI mapping incorrect
- EVPN route exchange across gateway fails
- L2VPN stitching between MPLS and VXLAN broken

**Troubleshooting Commands & Remediation:**
- `EVPN MPLS-to-VXLAN interworking: 'l2vpn evpn mpls vxlan'`
- `Gateway translates MPLS labels to VNI (and reverse)`
- `Check 'show evpn interworking' for gateway status`
- `VNI must map one-to-one with MPLS service label`
- `Control plane: BGP EVPN routes carry both info`
- `Data plane: label->VNI or VNI->label at gateway`

### EVPN MPLS over SR-MPLS / SR Policy Interop Issue (Severity: HIGH)

Configure EVPN MPLS over Segment Routing transport but SID labels not properly processed

**Diagnostic Symptoms:**
- EVPN traffic not forwarded over SR-MPLS transport
- SR labels not pushed for EVPN traffic
- Transport LSP broken between EVPN PEs
- EVPN service label combined incorrectly with SR label

**Troubleshooting Commands & Remediation:**
- `EVPN over SR-MPLS: transport via SR labels, service via EVPN label`
- `Check 'show mpls forwarding-table <evpn-peer>' for SR label stack`
- `EVPN service label = inner, SR label = outer`
- `Requires prefix-SID for all PEs in IGP`
- `Check EVPN tunnel encapsulation: 'show evpn evi <id> detail'`
- `SR-TE policies may override default SR paths`

### EVPN MPLS CE Dual-Homing / Active-Active Failure (Severity: LOW)

Configure EVPN MPLS dual-homing with active-active mode but traffic not load balanced

**Diagnostic Symptoms:**
- Only one PE forwarding traffic for multi-homed CE
- Active-active mode not load balancing
- DF election not distributing traffic per EVI
- Single-homed-like behavior despite multi-homing config

### EVPN MPLS PMSI Tunnel / Inclusive Multicast Issue (Severity: HIGH)

Configure EVPN MPLS PMSI (Provider Multicast Service Interface) tunnel but BUM traffic not flowing

**Diagnostic Symptoms:**
- BUM traffic not delivered to all PEs in EVI
- PMSI tunnel not established
- IMET route (Type 3) missing PMSI tunnel attribute
- Ingress replication not working for BUM

**Troubleshooting Commands & Remediation:**
- `PMSI: Inclusive (I-PMSI) or Selective (S-PMSI)`
- `I-PMSI: one tunnel per EVI, all PEs receive all BUM`
- `Check 'show bgp l2vpn evpn route-type 3' for PMSI info`
- `PMSI tunnel type: ingress-rep, mLDP P2MP, RSVP-TE P2MP`
- `Ingress replication: each PE replicates to all PEs`
- `P2MP tunnel: more efficient for multicast distribution`

