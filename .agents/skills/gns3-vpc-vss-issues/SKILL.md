---
name: "vPC/VSS/Stackwise Issues Injection"
description: "Virtual Port Channel, Virtual Switching System and stacking related faults"
category: "computer-networking"
---

# vPC/VSS/Stackwise Issues Injection

Virtual Port Channel, Virtual Switching System and stacking related faults

## Supported Protocols
- vpc
- vss
- stackwise
- port-channel
- stacking

## Fault Injection Scenarios & Troubleshooting Procedures

### vPC Peer-Link Misconfiguration (Severity: HIGH)

Configure vPC peer-link with wrong parameters causing vPC domain isolation

**Diagnostic Symptoms:**
- vPC peer-link not coming up
- vPC peers isolated (no keepalive)
- vPC orphaned ports behavior issue
- Secondary vPC peer suspends member ports

**Troubleshooting Commands & Remediation:**
- `Check vPC status with 'show vpc'`
- `Peer-link: 'vpc peer-link <port-channel-id>'`
- `Must be 10GE or higher, dedicated link between peers`
- `Peer-link failure: secondary switch suspends vPC member ports`
- `Check 'show vpc consistency-parameters' for type-1 mismatches`
- `Enable 'peer-gateway' for optimal forwarding`

### vPC Keepalive Link Failure (Severity: CRITICAL)

vPC keepalive link between peer switches down causing false primary detection

**Diagnostic Symptoms:**
- Both vPC peers assume primary role
- vPC member links incorrectly suspended
- Dual-active scenario (split-brain)
- Data-plane forwarding disruption

**Troubleshooting Commands & Remediation:**
- `Check vPC keepalive with 'show vpc peer-keepalive'`
- `Keepalive uses mgmt0 or separate SVI`
- `Keepalive link: separate from peer-link, layer 3 reachable`
- `Use 'vpc keepalive destination <peer-mgmt-ip>'`
- `Keepalive heartbeat interval: 1s default`
- `Hold timeout: 3s (3 missed keepalives = peer down)`

### vPC Type-1 Configuration Consistency Mismatch (Severity: HIGH)

Configure inconsistent Type-1 parameters on vPC peers causing member ports suspended

**Diagnostic Symptoms:**
- vPC member ports suspended on secondary peer
- Type-1 parameter mismatch warning
- vPC not forming across all member links
- Inconsistent VLAN or STP config across peers

**Troubleshooting Commands & Remediation:**
- `Check with 'show vpc consistency-parameters global'`
- `Type-1: must match (MTU, VLAN, STP, port-channel)`
- `Type-2: recommended to match (no suspension if mismatched)`
- `Common Type-1 mismatches: STP mode, MST region name`
- `Suspend on mismatch: secondary suspends its vPC members`
- `Fix: align all Type-1 parameters between peers`

### vPC Orphan Port Misconfiguration (Severity: LOW)

Device connected to only one vPC peer causing orphan port issues

**Diagnostic Symptoms:**
- Designated node (non-vPC connected) facing unpredictable behavior
- Traffic loss when the connected vPC peer fails
- Active/standby device not failing over properly
- Orphan port not receiving BPDUs correctly

**Troubleshooting Commands & Remediation:**
- `Orphan port: device connected to single vPC peer only`
- `Use 'lacp rate fast' on orphan ports for faster detection`
- `Check 'show vpc orphan-port' for orphan port list`
- `Critical: orphan ports lose connectivity if the peer they connect to fails`
- `Consider dual-homing for critical devices (servers, firewalls)`
- `Monitor orphan port state during vPC peer failures`

### VSS Switch ID / Switch Number Conflict (Severity: CRITICAL)

Configure same switch ID on both VSS members causing split-brain

**Diagnostic Symptoms:**
- VSS not forming between member switches
- Both switches claim same switch number
- VSL (Virtual Switch Link) not established
- Virtual switch domain membership failure

**Troubleshooting Commands & Remediation:**
- `Check VSS with 'show switch virtual' or 'show switch'`
- `Each member needs a unique switch number (e.g., switch 1, switch 2)`
- `Use 'switch <id> switch <virtual-id>' for VSS configuration`
- `Dual-active detection required for VSS`
- `VSL must be configured between members`
- `Active/standby roles determined by switch priority`

### VSS VSL (Virtual Switch Link) Failure (Severity: CRITICAL)

VSL link down causing VSS to split into two standalone switches

**Diagnostic Symptoms:**
- VSS split into two standalone switches
- Both switches become active (dual-active)
- Dual-active detection triggering interface shutdown
- Layer 2 loop or duplicate IP addresses

**Troubleshooting Commands & Remediation:**
- `Check VSL with 'show switch virtual link'`
- `VSL uses multiple member links for redundancy`
- `VSL failure recovery is automatic (when re-established)`
- `Enable dual-active detection: 'dual-active detection pagp'`
- `Enhanced PAgP dual-active detection uses downstream switches`
- `VSL could use data ports or dedicated stacking ports`

### Switch Stack (StackWise) Member Misconfiguration (Severity: HIGH)

StackWise member priority or provisioning causes incorrect master election

**Diagnostic Symptoms:**
- Wrong switch elected as stack master
- Stack member provisioned with wrong switch number
- Stack member not joining the stack
- Configuration mismatch preventing stack formation

**Troubleshooting Commands & Remediation:**
- `Check stack with 'show switch detail' or 'show stack'`
- `Master election: priority > MAC address (higher priority wins)`
- `Use 'switch <id> priority <15>' to set member priority (higher = better)`
- `Stack member provisioning: 'switch <id> provision <type>'`
- `Stack cable must form a ring topology`
- `Stack members: up to 9 (3850) or 8 (3750/9300)`

### vPC Peer Gateway Misconfiguration (Severity: HIGH)

Configure vPC peer-gateway incorrectly causing suboptimal forwarding or ARP issues

**Diagnostic Symptoms:**
- Traffic to vPC peer gateway MAC forwarded across peer-link
- Suboptimal forwarding (traffic hairpins through peer-link)
- ARP requests for gateway not answered locally
- vPC peer-gateway feature not enabled

**Troubleshooting Commands & Remediation:**
- `Peer-gateway: vPC peer responds to ARP for each other's gateway IP`
- `Enable: 'vpc peer-gateway' (NX-OS)`
- `Without peer-gateway: traffic to peer's MAC goes across peer-link`
- `Peer-gateway avoids peer-link hairpinning`
- `Check 'show vpc' for 'peer-gateway' status`
- `Enable both vPC peers for peer-gateway`

### vPC Orphan Port Recovery / Critical Port Failure (Severity: HIGH)

Configure vPC orphan ports failing when connected peer switch fails

**Diagnostic Symptoms:**
- Orphan port traffic drops when primary vPC peer fails
- Single-homed server loses connectivity during vPC peer failure
- Orphan port not recovering after peer recovers
- No failover mechanism for orphan ports

**Troubleshooting Commands & Remediation:**
- `Orphan ports are single-homed to one vPC peer`
- `If that peer fails: orphan port loses all connectivity`
- `Monitor with 'show vpc orphan-port' for orphan list`
- `Mitigation: dual-home critical devices`
- `Or: use 'vpc orphan-port suspend' to disable on peer-link failure`
- `Use VLAN mismatch to avoid orphan port issues`

### VSS Dual-Active Detection / Recovery Failure (Severity: CRITICAL)

Configure VSS dual-active detection but PAgP/existing DAD fails to detect split

**Diagnostic Symptoms:**
- VSS split-brain not detected (both actives)
- Two active VSS switches causing network instability
- Duplicate IP and MAC addresses on both sides
- Enhanced PAgP DAD not detecting the split

**Troubleshooting Commands & Remediation:**
- `Dual-active detection: PAgP (enhanced) or fast-hello`
- `PAgP DAD uses downstream switches to detect dual-active`
- `Fast-hello: dedicated link (management or physical)`
- `Check 'show switch virtual dual-active detection'`
- `When detected: non-VSL interfaces on secondary/standby are shut`
- `Recovery: auto when VSL re-established`

### Stack Member Provisioning / Switch Type Mismatch (Severity: HIGH)

Configure stack provisioning with wrong switch type causing stack boot failure

**Diagnostic Symptoms:**
- Stack member not booting or joining the stack
- Stack provisioning type mismatch
- 'switch provision' model number incorrect
- Stack member stuck in boot loop

**Troubleshooting Commands & Remediation:**
- `Use 'switch <id> provision <model>' for stack provisioning`
- `Model number must match the physical switch (e.g., WS-C3750X-48)`
- `Mismatch: member won't join the stack`
- `Check stack status: 'show switch' for member state`
- `Verify model numbers match provisioning`
- `Remove provision: 'no switch <id> provision' then re-add`

