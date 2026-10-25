---
name: "VLAN/Trunking Issues Injection"
description: "VLAN, 802.1Q trunking, DTP and native VLAN related network faults"
category: "computer-networking"
---

# VLAN/Trunking Issues Injection

VLAN, 802.1Q trunking, DTP and native VLAN related network faults

## Supported Protocols
- vlan
- trunk
- 802.1q
- dtp
- vtp
- svi

## Fault Injection Scenarios & Troubleshooting Procedures

### VLAN Mismatch Across Trunk (Severity: HIGH)

Configure different allowed VLAN lists on trunk endpoints

**Diagnostic Symptoms:**
- Hosts in certain VLANs cannot communicate across trunk
- Trunk operational but specific VLANs blocked
- Inconsistent VLAN list on both sides
- Some VLANs dropped at trunk

**Troubleshooting Commands & Remediation:**
- `Check trunk with 'show interfaces trunk'`
- `Verify 'switchport trunk allowed vlan' on both sides`
- `VLANs must be allowed on both trunk ends`
- `Use 'switchport trunk allowed vlan add <vlan>' to add`
- `Default allows all VLANs (1-4094)`
- `Check VLAN exists with 'show vlan brief'`

### Native VLAN Mismatch on Trunk (Severity: HIGH)

Configure different native VLANs on trunk endpoints

**Diagnostic Symptoms:**
- Native VLAN mismatch errors in logs
- CDP/VTP/DTP communication issues over trunk
- Broadcast storms possible (VLAN 1 default)
- Spanning tree issues on native VLAN

**Troubleshooting Commands & Remediation:**
- `Check native VLAN with 'show interfaces trunk'`
- `Use 'switchport trunk native vlan <vlan>' to set`
- `Native VLAN must match on both sides of trunk`
- `Default native VLAN is 1`
- `Cisco recommends using a non-default, unused VLAN as native`
- `Native VLAN mismatch causes VLAN hopping security risk`

### DTP Mode Mismatch (Severity: HIGH)

Configure Dynamic Trunking Protocol modes that are incompatible

**Diagnostic Symptoms:**
- Trunk not forming automatically
- Port stuck in access mode despite desire for trunk
- DTP negotiation failure
- Mismatched trunk status (one side trunk, one side access)

**Troubleshooting Commands & Remediation:**
- `Check DTP mode with 'show interfaces <intf> switchport'`
- `Modes: access, dynamic desirable, dynamic auto, trunk`
- `Access + dynamic auto = access (no trunk)`
- `Trunk + dynamic desirable/auto = trunk`
- `Dynamic desirable + dynamic desirable/auto = trunk`
- `Static trunk ('switchport mode trunk') disables DTP negotiation`

### Access VLAN Misconfiguration (Severity: MEDIUM)

Assign port to the wrong access VLAN

**Diagnostic Symptoms:**
- Host in wrong broadcast domain
- Cannot reach other hosts in intended VLAN
- IP address mismatch with VLAN subnet
- DHCP not working (different subnet)

**Troubleshooting Commands & Remediation:**
- `Check access VLAN with 'show vlan brief'`
- `Verify 'switchport access vlan <vlan>' assignment`
- `Host IP must match the VLAN's subnet`
- `Use 'show interfaces <intf> switchport' for port VLAN`
- `Check 'show mac address-table' for MAC-to-VLAN mapping`
- `Verify VLAN exists in VLAN database`

### VLAN Deleted from VLAN Database (Severity: MEDIUM)

Delete a VLAN from the VLAN database causing all ports in that VLAN to become inactive

**Diagnostic Symptoms:**
- All ports in the VLAN become inactive
- Hosts in the VLAN lose connectivity
- SVI/interface VLAN down
- VLAN not listed in 'show vlan brief'

**Troubleshooting Commands & Remediation:**
- `Check 'show vlan brief' for the VLAN`
- `Re-create VLAN: 'vlan <id>' then 'name <name>'`
- `VLAN 1, 1002-1005 are default (cannot be deleted)`
- `Extended VLANs (1006-4094) require VTP transparent mode`
- `Ports assigned to a deleted VLAN cannot forward traffic`
- `Use 'show interfaces status' to see port status`

### SVI (Switch Virtual Interface) Down (Severity: HIGH)

SVI not configured or shut down causing no inter-VLAN routing

**Diagnostic Symptoms:**
- No inter-VLAN routing for the VLAN
- SVI interface administratively down
- Hosts can only communicate within their VLAN
- Gateway IP not reachable

**Troubleshooting Commands & Remediation:**
- `Check SVI with 'show ip interface brief | include Vlan'`
- `Use 'interface vlan <id>' to create SVI`
- `SVI requires 'no shutdown'`
- `SVI requires the VLAN to exist in VLAN DB`
- `At least one port in VLAN must be up for SVI to be up`
- `Use 'autostate exclude' to ignore port status`

### VTP Domain / Version Mismatch (Severity: HIGH)

Configure VTP with different domain names or versions between switches

**Diagnostic Symptoms:**
- VLAN database not synchronized across switches
- VTP advertisements not received
- VTP domain mismatch errors
- VLANs not propagated from VTP server

**Troubleshooting Commands & Remediation:**
- `Check VTP status with 'show vtp status'`
- `VTP domain name must match (case-sensitive)`
- `VTP version must be compatible across the domain`
- `VTP v1/v2 incompatibility prevents sync`
- `VTP v3 supports extended VLANs and private VLANs`
- `Use VTP transparent mode if VTP is not required`

### VTP Pruning Blocking VLAN Propagation (Severity: MEDIUM)

Configure VTP pruning incorrectly blocking necessary VLANs from trunk links

**Diagnostic Symptoms:**
- VTP-pruned VLANs not available on downstream switches
- VLAN exists on VTP server but not on some client switches
- Trunk not carrying expected VLANs
- VTP pruning list inadvertently excluding required VLANs

**Troubleshooting Commands & Remediation:**
- `VTP pruning: only forwards broadcast/multicast to switches needing the VLAN`
- `Check pruning status: 'show vtp status' (Pruning: Enabled/Disabled)`
- `Use 'vtp pruning' to enable (VTP v2 or higher)`
- `Pruning-eligible list: 'switchport trunk pruning vlan <vlan-list>'`
- `VLAN removed from pruning-eligible list is always forwarded`
- `VTP pruning doesn't prevent configuration of VLAN on client`

### Private VLAN / Community/Isolated VLAN Misconfiguration (Severity: HIGH)

Configure private VLAN with wrong community/isolated/primary mapping causing isolation failures

**Diagnostic Symptoms:**
- Private VLAN isolation not working between ports
- Community VLAN ports cannot communicate with each other
- Promiscuous port not forwarding properly
- Isolated port still reaching other isolated ports

**Troubleshooting Commands & Remediation:**
- `Private VLAN: primary VLAN + secondary (community/isolated) VLAN`
- `Check 'show vlan private-vlan' for mapping`
- `Use 'private-vlan primary' and 'private-vlan community/isolated'`
- `SVI: 'private-vlan mapping <primary> <secondary>'`
- `Port mode: 'switchport mode private-vlan host/promiscuous'`
- `Host ports: 'switchport private-vlan host-association <primary> <secondary>'`

### Access / Trunk Mode Mismatch Between Switches (Severity: HIGH)

Configure port as access on one side and trunk on the other causing link issues

**Diagnostic Symptoms:**
- Link up but traffic not passing between switches
- One side trunk, other side access
- Frame tagged by one side stripped by the other
- Intermittent connectivity for specific VLANs

**Troubleshooting Commands & Remediation:**
- `Access port expects untagged frames only`
- `Trunk port sends/receives tagged frames (except native VLAN)`
- `Check 'show interfaces switchport' for operational mode`
- `Both sides should agree on trunk or access mode`
- `Use 'switchport mode trunk' on both sides for trunk links`
- `Use 'switchport mode access' on both sides for access links`

### Private VLAN Promiscuous / Trunk Port Issue (Severity: HIGH)

Configure private VLAN across trunk or with promiscuous trunk port incorrectly

**Diagnostic Symptoms:**
- Private VLAN traffic not traversing trunk link
- Promiscuous trunk not carrying PVLAN traffic
- Secondary VLAN traffic blocked on trunk
- Router-on-a-stick with PVLAN not routing

**Troubleshooting Commands & Remediation:**
- `Promiscuous trunk: carries primary + secondary VLANs`
- `Check 'show vlan private-vlan type' for VLAN roles`
- `Trunk must allow both primary and secondary VLANs`
- `SVI on promiscuous port: 'private-vlan mapping'`
- `Router sub-interface for PVLAN uses promiscuous trunk`
- `PVLAN trunk filtering may block secondary VLANs by default`

### DTP / Trunk Security Misconfiguration (Severity: HIGH)

Configure DTP dynamic desirable/auto allowing unauthorized trunk establishment (DTP attack)

**Diagnostic Symptoms:**
- Unauthorized device negotiates trunk with switch port
- Access port unexpectedly moves to trunk mode
- DTP enabled on access ports unnecessarily
- VLAN hopping attack possible

**Troubleshooting Commands & Remediation:**
- `DTP vulnerability: attacker can negotiate trunk`
- `Use 'switchport mode access' + 'switchport nonegotiate' on access ports`
- `'switchport nonegotiate' disables DTP frames`
- `Check DTP mode with 'show interfaces <intf> switchport'`
- `Static access mode prevents DTP negotiation`
- `Security best practice: disable DTP on all access ports`

