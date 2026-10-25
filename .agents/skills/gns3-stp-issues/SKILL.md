---
name: "STP/RSTP/MSTP Issues Injection"
description: "Spanning Tree Protocol (STP, RSTP, MSTP) related network faults for troubleshooting practice"
category: "computer-networking"
---

# STP/RSTP/MSTP Issues Injection

Spanning Tree Protocol (STP, RSTP, MSTP) related network faults for troubleshooting practice

## Supported Protocols
- stp
- rstp
- mstp

## Fault Injection Scenarios & Troubleshooting Procedures

### STP Root Bridge Election Manipulation (Severity: LOW)

Set bridge priority to force the wrong switch to become the root bridge

**Diagnostic Symptoms:**
- Unexpected root bridge elected
- Suboptimal spanning tree topology
- Traffic traverses suboptimal path to reach root
- Redundant links not utilized optimally

**Troubleshooting Commands & Remediation:**
- `Check root bridge with 'show spanning-tree'`
- `Bridge priority default is 32768, lower value wins election`
- `Root bridge is elected by lowest bridge priority, then lowest MAC`
- `Use 'spanning-tree vlan <vlan> priority <0-61440>' to set priority`
- `Only multiples of 4096 are valid priorities`
- `Use 'spanning-tree vlan <vlan> root primary/secondary' for macro`

### STP Portfast Misconfiguration (Severity: HIGH)

Enable Portfast on trunk ports or disable Portfast on access ports causing slow convergence

**Diagnostic Symptoms:**
- Trunk port with Portfast causes loop on configuration change
- Access port takes 30-50s to transition to forwarding
- Host connectivity delayed after link up
- BPDU received on Portfast port triggers loop

**Troubleshooting Commands & Remediation:**
- `Check Portfast status with 'show spanning-tree interface <intf>'`
- `Portfast should only be enabled on access ports`
- `Portfast bypasses listening/learning states (immediate forwarding)`
- `Use 'spanning-tree portfast' on access ports only`
- `Combine Portfast with BPDUguard for access port security`
- `'spanning-tree portfast default' enables on all non-trunk ports`

### STP Port Path Cost Manipulation (Severity: LOW)

Set artificially high or low path cost on a port to alter STP topology

**Diagnostic Symptoms:**
- STP blocking wrong port in a redundant topology
- High-speed link blocked while low-speed link forwarding
- Suboptimal traffic flow
- Expected forwarding port is in blocking state

**Troubleshooting Commands & Remediation:**
- `Check path cost with 'show spanning-tree interface <intf>'`
- `Default cost: 10G=2, 1G=4, 100M=19, 10M=100`
- `Use 'spanning-tree cost <value>' to override default`
- `Cost determines port role (Root/Designated/Alternate)`
- `Lower cost path to root is preferred`
- `Reference: short mode (1-65535) vs long mode (1-200000000)`

### STP BPDU Guard Misconfiguration (Severity: HIGH)

Disable BPDU guard on access ports, or enable BPDU guard on trunk ports

**Diagnostic Symptoms:**
- Access port receives BPDU causing STP topology change
- Port with BPDU guard err-disabled when BPDU received
- Unauthorized switch connected to access port causes loop
- BPDU guard mistakenly blocking legitimate BPDUs on trunk

**Troubleshooting Commands & Remediation:**
- `Check BPDU guard with 'show spanning-tree interface <intf>'`
- `BPDU on access port usually indicates unauthorized device`
- `Use 'spanning-tree portfast bpduguard' on access ports`
- `'spanning-tree portfast bpduguard default' globally enables`
- `BPDU guard err-disables the port on BPDU reception`
- `Clear err-disabled with 'shutdown' followed by 'no shutdown'`

### STP Loop Guard Misconfiguration (Severity: MEDIUM)

Disable loop guard on ports where it should be enabled (or enable where it shouldn't)

**Diagnostic Symptoms:**
- Unidirectional link failure causes STP loop
- Alternate port transitions to forwarding when not receiving BPDUs
- Loop guard keeps port in loop-inconsistent state
- Port stuck in blocking despite redundant path

**Troubleshooting Commands & Remediation:**
- `Check loop guard with 'show spanning-tree interface <intf>'`
- `Loop guard prevents alternate ports from becoming designated`
- `Port in loop-inconsistent state recovers when BPDUs received`
- `Enable on all ports where BPDUs are expected`
- `Use 'spanning-tree guard loop' on non-designated ports`
- `Loop guard and UplinkFast are mutually exclusive`

### STP TCN (Topology Change Notification) Flood (Severity: HIGH)

Configure frequent STP topology changes causing TCN propagation and MAC table flushing across the network

**Diagnostic Symptoms:**
- MAC address tables being flushed frequently
- High CPU due to STP recalculation
- Network-wide MAC flooding after changes
- TCN storms disrupting network operations

**Troubleshooting Commands & Remediation:**
- `Check 'show spanning-tree detail' for TC count`
- `TCN flushes learned MAC addresses`
- `Identify source of TCN: 'show spanning-tree vlan <vlan> detail'`
- `Use portfast on access ports to prevent TCNs from host changes`
- `'spanning-tree uplinkfast' reduces convergence impact`
- `Use 'spanning-tree bpduguard portfast' to stop unauthorized switch additions`

### MSTP Region / Instance Mapping Misconfiguration (Severity: HIGH)

Configure MST region name, revision or VLAN-to-instance mapping inconsistently across switches

**Diagnostic Symptoms:**
- Switches not joining MST region as expected
- MST region boundary issues
- CIST (Common Internal Spanning Tree) broken
- VLAN-to-instance mapping mismatch between switches

**Troubleshooting Commands & Remediation:**
- `Check MST config: 'show spanning-tree mst configuration'`
- `Region name, revision number, and VLAN map must match across all switches`
- `Use 'spanning-tree mst configuration' then 'instance <id> vlan <vlan-list>'`
- `'region <name>' and 'revision <num>' must be identical across region`
- `Mismatch = region boundary (CIST runs instead of MST)`
- `Maximum 16 MST instances (0-15), instance 0 is CIST`

### STP BPDU Filter / BPDU Ignore on Access Ports (Severity: HIGH)

Configure BPDU filter on access port ignoring incoming BPDUs, preventing loop detection

**Diagnostic Symptoms:**
- Port not processing received BPDUs
- STP loop formed despite BPDU sent into the network
- Access port with BPDU filter ignores all BPDUs
- BPDU filter bypassing STP protection mechanisms

**Troubleshooting Commands & Remediation:**
- `BPDU filter prevents sending AND receiving BPDUs on port`
- `'spanning-tree bpdufilter enable' on interface`
- `BPDU filter + Portfast = immediate forwarding, no BPDU processing`
- `Danger: if a loop-forming cable connects two filtered ports, loop occurs`
- `Use BPDU guard instead of BPDU filter for better protection`
- `BPDU guard err-disables the port; BPDU filter allows the loop`

### STP Root Guard Blocking Legitimate BPDU (Severity: MEDIUM)

Configure root guard on wrong ports preventing optimal root bridge placement

**Diagnostic Symptoms:**
- Designated port transitions to root-inconsistent state
- Port blocked despite being intended forwarding port
- Root guard triggering incorrectly on superior BPDUs
- Network segmentation due to root guard

**Troubleshooting Commands & Remediation:**
- `Root guard on port blocks it if superior BPDU received`
- `Apply root guard on ports that should never become root port`
- `Use 'spanning-tree guard root' on root-facing ports`
- `Port in root-inconsistent recovers when BPDU stops`
- `Don't apply on ports expected to receive superior BPDUs`
- `Root guard is per-port, not per-VLAN`

### STP UplinkFast / BackboneFast Misconfiguration (Severity: LOW)

Configure STP acceleration features (UplinkFast, BackboneFast) incorrectly causing convergence issues

**Diagnostic Symptoms:**
- UplinkFast not accelerating failover on uplink loss
- BackboneFast not expediting LSA expiry for indirect failures
- UplinkFast / BackboneFast not compatible with other features
- UplinkFast and loop guard mutually exclusive

**Troubleshooting Commands & Remediation:**
- `UplinkFast: instant failover on root port loss, replaces 30s STP delay`
- `Use 'spanning-tree uplinkfast' globally`
- `Increases path cost by 3000 on all ports`
- `BackboneFast: reduces convergence after indirect link failure`
- `BackboneFast expires max-age quickly for inferior BPDUs`
- `Modern RSTP/MSTP replaces these legacy acceleration features`

### STP VLAN Mismatch / PVST+ Simulation Inconsistency (Severity: HIGH)

Configure PVST+ with inconsistent VLANs across trunk links causing STP per-VLAN issues

**Diagnostic Symptoms:**
- PVST+ simulation inconsistency detected on trunk
- Trunk port moved to root-inconsistent state
- Some VLANs blocked while others forwarding
- VLAN pruning or allowed list mismatch

**Troubleshooting Commands & Remediation:**
- `PVST+ simulation mismatch: Cisco PVST+ vs MST interoperability`
- `Check 'show spanning-tree <vlan>' per-VLAN root status`
- `Ensure allowed VLAN list matches on both trunk ends`
- `'switchport trunk allowed vlan' must match across trunk`
- `Native VLAN mismatch causes PVST+ simulation issues`
- `Use 'spanning-tree vlan <vlan> root primary/secondary' for selection`

### STP Guard Loop / Unidirectional Link (Severity: CRITICAL)

Configure unidirectional link (fiber TX/RX issue) causing STP loop despite loop guard

**Diagnostic Symptoms:**
- STP loop despite all protection mechanisms
- Unidirectional link (fiber cut one direction)
- Port receives BPDUs but cannot send
- Loop guard not detecting the failure

**Troubleshooting Commands & Remediation:**
- `Unidirectional link: BPDU sent but not received = port becomes designated`
- `Loop guard prevents designated transition if BPDUs stop`
- `UDLD (Unidirectional Link Detection) works at Layer 1/2`
- `Use 'udld enable' and 'udld port aggressive' for fiber links`
- `UDLD + loop guard together for complete protection`
- `Fiber links: one strand broken = perfect unidirectional failure`

