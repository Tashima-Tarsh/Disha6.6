---
name: "EtherChannel/LACP Issues Injection"
description: "EtherChannel, LACP (802.3ad) and PAgP related network faults for troubleshooting practice"
category: "computer-networking"
---

# EtherChannel/LACP Issues Injection

EtherChannel, LACP (802.3ad) and PAgP related network faults for troubleshooting practice

## Supported Protocols
- lacp
- pagp
- etherchannel

## Fault Injection Scenarios & Troubleshooting Procedures

### LACP Rate Mismatch (Severity: LOW)

Configure different LACP rate (fast vs slow) on bundle members

**Diagnostic Symptoms:**
- LACP rate negotiation issues on bundle
- Slow LACP PDU rate causing delayed failure detection
- LACP rate mismatch between peers
- Bundle convergence time not meeting requirements

**Troubleshooting Commands & Remediation:**
- `Check LACP rate with 'show lacp <id> counters'`
- `Fast rate: 1s LACP PDUs, slow rate: 30s`
- `Use 'lacp rate fast' on interface for 1s hello`
- `Rate configuration affects link failure detection time`
- `Both sides can have different rates (rate not negotiated)`
- `Fast rate recommended for faster convergence`

### LACP Port Configuration Mismatch (Severity: HIGH)

Configure member ports with inconsistent settings (speed, duplex, VLAN)

**Diagnostic Symptoms:**
- EtherChannel bundle not forming
- Member ports stuck in 'suspended' state
- Inconsistent port parameters across bundle
- Some ports not joining the bundle

**Troubleshooting Commands & Remediation:**
- `Check bundle with 'show etherchannel <id> summary'`
- `All member ports must have same speed and duplex`
- `All members must be same switchport mode (access/trunk)`
- `For trunk: all members must have same allowed VLAN list`
- `Use 'show interfaces <intf> etherchannel' for port status`
- `Suspended ports indicate parameter mismatch`

### LACP Max-Bundle Limit Exceeded (Severity: LOW)

Configure LACP max-bundle too low causing ports to be placed in standby

**Diagnostic Symptoms:**
- Not all ports in the bundle are active
- Some LACP ports in standby mode
- Total capacity lower than expected
- Load balancing not utilizing all links

**Troubleshooting Commands & Remediation:**
- `Check bundle with 'show etherchannel <id> summary'`
- `Use 'lacp max-bundle <count>' to increase active ports`
- `Default: all eligible ports are active`
- `Standby ports activate if active ports fail`
- `Max-bundle limits the number of active ports`
- `Useful for deterministic capacity planning`

### PAgP Mode Mismatch (Severity: HIGH)

Configure incompatible PAgP modes on peers

**Diagnostic Symptoms:**
- PAgP bundle not forming
- Ports not bundling despite correct parameters
- PAgP negotiation failure between peers
- Bundle in 'auto' mode with other side also 'auto'

**Troubleshooting Commands & Remediation:**
- `Check PAgP mode with 'show etherchannel <id> detail'`
- `PAgP modes: desirable, auto, on`
- `Desirable + Desirable = bundle (active negotiation)`
- `Desirable + Auto = bundle (one side initiates)`
- `Auto + Auto = no bundle (neither initiates)`
- `On + On = static bundle (no negotiation), no PAgP PDUs`

### EtherChannel Load Balancing Misconfiguration (Severity: LOW)

Configure inappropriate EtherChannel load balancing method causing uneven distribution

**Diagnostic Symptoms:**
- Uneven traffic distribution across bundle members
- One link saturated while others underutilized
- Load balancing polarization
- Hash method not suitable for traffic pattern

**Troubleshooting Commands & Remediation:**
- `Check load balance with 'show etherchannel load-balance'`
- `Use 'port-channel load-balance <method>' globally`
- `Methods: src-ip, dst-ip, src-dst-ip, src-mac, dst-mac, src-dst-mac`
- `src-dst-ip is common for routed interfaces`
- `src-dst-mac is common for switched interfaces`
- `L4 ports: use 'src-dst-ip l4port' for granular distribution`

### LACP System ID Duplicate (Severity: HIGH)

Configure duplicate LACP system ID causing bundle membership issues

**Diagnostic Symptoms:**
- LACP bundle not forming between two switches
- LACP partner state mismatch across bundle
- System ID conflict detected
- Bundle instability with duplicate MAC addresses

**Troubleshooting Commands & Remediation:**
- `LACP system ID = LACP priority + switch MAC address`
- `Use 'lacp system-priority <value>' to differentiate`
- `Stack switches share a MAC - adjust system priority`
- `Check 'show lacp neighbor' for actor/partner info`
- `Duplicate system IDs cause bundle confusion`
- `Each switch must have a unique LACP system identifier`

### LACP Min-Links / Minimum Active Links Not Met (Severity: HIGH)

Configure LACP min-links requiring more active ports than available, bundle stays down

**Diagnostic Symptoms:**
- EtherChannel bundle not coming up despite member ports configured
- LACP min-links threshold not met
- Bundle stays down with partial link failure
- Min-links value too high for available ports

**Troubleshooting Commands & Remediation:**
- `Check 'show etherchannel <id> summary' for bundle state`
- `Use 'lacp min-bundle <count>' to set minimum active ports`
- `Default min-links: 1 (bundle comes up with any single port)`
- `Higher min-links ensures minimum bandwidth before bundle activates`
- `Bundle stays down if active port count < min-links`
- `Useful for QoS bandwidth guarantees`

### LACP Fast Switchover / Port Priority Issue (Severity: LOW)

Configure LACP port priority incorrectly causing suboptimal active port selection

**Diagnostic Symptoms:**
- Wrong ports selected as active in max-bundle scenario
- LACP port priority not controlling active port selection
- Standby ports not becoming active when expected
- Preferred ports stuck in standby mode

**Troubleshooting Commands & Remediation:**
- `Check port priority with 'show lacp <id> counters'`
- `LACP port priority: lower value = more likely to be active`
- `Default port priority: 32768`
- `Use 'lacp port-priority <0-65535>' on interface`
- `When max-bundle limits active ports, lowest priority ports stay standby`
- `Port priority only matters when max-bundle is configured`

### PAgP Aggressive / Failover Mode Misconfiguration (Severity: LOW)

Configure PAgP with wrong failover or misconfig causing bundle instability

**Diagnostic Symptoms:**
- PAgP port flapping between bundle states
- PAgP silent mode preventing neighbor discovery
- PAgP timeout mismatch causing port removal
- Bundle member taking long to failover

**Troubleshooting Commands & Remediation:**
- `PAgP modes: 'pagp port-priority <value>' for port selection`
- `PAgP silent mode: 'pagp silent' for one-node segments`
- `PAgP non-silent: expects partner PDUs`
- `PAgP learn method: 'pagp learn-method {physical|aggregation-port}'`
- `Check 'show pagp <id>' for PAgP bundle state`
- `PAgP provides faster failover than static EtherChannel`

### EtherChannel Configuration Inconsistency / Mismatch (Severity: HIGH)

Configure EtherChannel with mismatched protocol (LACP vs PAgP) or mode (active vs passive vs on)

**Diagnostic Symptoms:**
- EtherChannel bundle not forming between peers
- LACP configured on one side, PAgP on the other
- Active/passive/on mode mismatch
- Static channel configured but no PDUs exchanged

**Troubleshooting Commands & Remediation:**
- `Both sides must use the same protocol (LACP or PAgP)`
- `LACP: {active, passive} or 'on' (static)`
- `PAgP: {desirable, auto} or 'on' (static)`
- `LACP active + active = bundle; active + passive = bundle`
- `Passive + passive = no bundle (neither initiates)`
- `On + On = static bundle (no negotiation), must match`

### LACP Member Port Error / Incompatible Neighbor (Severity: HIGH)

Configure LACP member port with an incompatible neighbor device (non-EtherChannel capable)

**Diagnostic Symptoms:**
- LACP port attempting to bundle with non-LACP neighbor
- Port stuck in 'down' or 'suspended' state
- Neighbor not sending LACP PDUs
- Physical link up but bundle member inactive

**Troubleshooting Commands & Remediation:**
- `Check 'show etherchannel <id> port-channel' for members`
- `LACP requires LACP-capable neighbor (both sides)`
- `Non-LACP neighbor: use 'channel-group <id> mode on' instead`
- `Static 'on' mode works without LACP negotiation`
- `LACP PDUs not received = neighbor does not support LACP`
- `Verify port not in 'err-disabled' or 'suspended' state`

