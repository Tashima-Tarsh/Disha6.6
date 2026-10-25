---
name: "VPLS/VPWS/L2VPN Issues Injection"
description: "VPLS, VPWS (AToM, Martini) and L2VPN related network faults"
category: "computer-networking"
---

# VPLS/VPWS/L2VPN Issues Injection

VPLS, VPWS (AToM, Martini) and L2VPN related network faults

## Supported Protocols
- vpls
- vpws
- l2vpn
- mpls

## Fault Injection Scenarios & Troubleshooting Procedures

### VPLS Virtual Circuit ID Mismatch (Severity: HIGH)

Configure different VC IDs on two sides of a VPLS/VPWS pseudowire

**Diagnostic Symptoms:**
- VPLS pseudowire not established
- VC state shows down
- L2VPN cross-connect not operational
- CE-to-CE connectivity broken

**Troubleshooting Commands & Remediation:**
- `Check VPLS with 'show l2vpn vc' or 'show mpls l2transport vc'`
- `VC ID must match on both PE routers`
- `Use 'xconnect <peer> <vc-id> encapsulation mpls' for VPWS`
- `For VPLS: 'member vfi <name>' and 'vpn id <vc-id>'`
- `Check 'show l2vpn pseudowire' for VC state`
- `VC status: up = operational, down = not functional`

### VPLS/VPWS MTU Mismatch (Severity: LOW)

Configure different MTU values on VPLS pseudowire endpoints

**Diagnostic Symptoms:**
- VC status shows up but with MTU mismatch
- Large frames dropped across pseudowire
- Layer 2 MTU parameters not matching
- VC stays down due to MTU negotiation failure

**Troubleshooting Commands & Remediation:**
- `Check VC MTU with 'show l2vpn vc detail'`
- `MTU must match on both PE endpoints for the VC`
- `L2VPN MTU differs from interface MTU (includes L2 header)`
- `Use 'mtu <size>' under the xconnect or pseudowire config`
- `Check interface MTU across the MPLS core path`
- `Some platforms use 'l2vpn mtu <size>' globally`

### VPLS Encapsulation Type Mismatch (Severity: HIGH)

Configure different encapsulation types (Ethernet vs VLAN) on VPLS endpoints

**Diagnostic Symptoms:**
- VPLS pseudowire not operational
- VC down due to encapsulation mismatch
- L2VPN encapsulation type conflict
- CE traffic not forwarded through VPLS

**Troubleshooting Commands & Remediation:**
- `Check encapsulation with 'show l2vpn vc detail'`
- `Encapsulation types: Ethernet (tagged/untagged), VLAN`
- `Must match on both PE routers`
- `Use 'encapsulation <type>' under xconnect`
- `VPLS must use consistent encapsulation across all PEs`
- `VLAN encapsulation strips/pushes VLAN tags`

### VPLS Full-Mesh Pseudowire Missing (Severity: HIGH)

VPLS requires full mesh of pseudowires between all PEs but some are missing

**Diagnostic Symptoms:**
- VPLS forwarding incomplete (some remote PEs unreachable)
- MAC addresses not learned across all VPLS endpoints
- Split-horizon preventing flooding to specific PE
- Traffic blackholed between certain PEs

**Troubleshooting Commands & Remediation:**
- `VPLS requires full mesh of pseudowires (split-horizon)`
- `Check VPLS members with 'show vfi <name>'`
- `Use 'member <ip> <vc-id>' for each remote PE`
- `H-VPLS simplifies mesh with hierarchical design`
- `Check 'show l2vpn vc' for all peer status`
- `Split-horizon prevents forwarding between PWs on same VFI`

### VPLS MAC Flush / Withdrawal Issue (Severity: HIGH)

VPLS MAC flush not working when link fails causing stale MAC entries

**Diagnostic Symptoms:**
- Stale MAC entries after link failure in VPLS network
- Traffic blackholed after convergence
- MAC not relearned on backup path
- Forwarding failure after link recovery

**Troubleshooting Commands & Remediation:**
- `VPLS MAC withdrawal is signaled via LDP`
- `Check 'show l2vpn vc' for MAC withdrawal stats`
- `MAC flush triggered by VC status change (up→down)`
- `Standby/primary pseudowire: 'redundancy' for backup`
- `MAC flush delay: 'mac-address-table notify'`
- `Ingest replication of MAC flush from VPLS signaling`

### VPLS PE Router-ID Reachability Issue (Severity: HIGH)

PE router ID not reachable via MPLS core preventing VPLS pseudowire setup

**Diagnostic Symptoms:**
- VPLS pseudowire not coming up
- PE router not reachable via MPLS LSP
- LDP session down between PEs
- Targeted LDP session cannot be established

**Troubleshooting Commands & Remediation:**
- `VPLS uses targeted LDP sessions between PEs`
- `Check targeted LDP with 'show mpls ldp neighbor'`
- `PE router-id must be reachable from remote PE`
- `IGP must have route to the peer PE router-id`
- `Use 'mpls ldp router-id <interface>' for LDP source`
- `Check 'ping mpls ipv4 <peer-rid>/32' for LSP reachability`

### VPWS L2VPN Interworking Mode Mismatch (Severity: MEDIUM)

Configure VPWS interworking mode (Ethernet to VLAN) incorrectly

**Diagnostic Symptoms:**
- VPWS cross-connect not forwarding traffic correctly
- Interworking mode mismatch between endpoints
- L2 frames encapsulated with wrong header format
- CE-facing encapsulation misalignment

**Troubleshooting Commands & Remediation:**
- `VPWS interworking: Ethernet (raw) vs VLAN (tagged)`
- `Ethernet interworking: same L2 header format on both ends`
- `VLAN interworking: VLAN tag preserved or manipulated`
- `Use 'interworking ethernet' or 'interworking vlan' under xconnect`
- `Check with 'show l2vpn xconnect detail' for interworking mode`
- `Mis-match causes traffic to be dropped at the egress PE`

### VPLS LDP / BGP Signaling Protocol Mismatch (Severity: CRITICAL)

Configure VPLS with LDP signaling on one side and BGP signaling on the other

**Diagnostic Symptoms:**
- VPLS pseudowire not establishing between PEs
- Signaling protocol mismatch between endpoints
- LDP signaled PW cannot connect to BGP signaled PW
- VPLS service broken across different signaling domains

**Troubleshooting Commands & Remediation:**
- `VPLS signaling: LDP (RFC 4762) or BGP (RFC 4761)`
- `Both PEs must use the same signaling protocol for the VPLS`
- `Check 'show l2vpn vc' for signaling protocol used`
- `LDP VPLS uses VC type + VC ID for pseudowire`
- `BGP VPLS uses NLRI with VE ID + VE block`
- `Interworking requires gateway between signaling types`

### VPLS Pseudowire Redundancy / Backup PW Failure (Severity: HIGH)

Configure VPLS backup pseudowire but failover from primary to backup not working

**Diagnostic Symptoms:**
- Backup pseudowire not taking over when primary fails
- VPLS traffic blackholed after primary PW goes down
- Standby PW not operational
- Redundancy group misconfiguration

**Troubleshooting Commands & Remediation:**
- `VPLS redundancy: 'backup peer <ip> <vc-id>'`
- `Primary/backup pseudowire per VPLS instance`
- `Check 'show l2vpn vc' for backup status`
- `PW preference: 'preference <value>' for priority`
- `MAC flush on switchover: LDP MAC withdrawal`
- `Use 'revertive <seconds>' to delay reversion to primary`

### VPLS QoS / EXP Bit Preservation Issue (Severity: LOW)

Configure VPLS but MPLS EXP (QoS) bits not preserved across pseudowire

**Diagnostic Symptoms:**
- QoS markings not preserved across VPLS pseudowire
- EXP bits set to 0 despite QoS configuration
- Customer QoS marking lost in VPLS network
- MPLS QoS mismatch between PE routers

**Troubleshooting Commands & Remediation:**
- `VPLS transports L2 frames, EXP bits set by ingress PE`
- `Use 'set mpls experimental' in QoS policy on ingress PE`
- `EXP bits copied from inner frame CoS if configured`
- `Check 'show policy-map interface' for EXP marking`
- `Use 'exp <value>' in pseudowire class for default EXP`
- `EXP preservation: qos group or explicit configuration`

