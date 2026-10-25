---
name: "Port Security Issues Injection"
description: "Switch port security related network faults for troubleshooting practice"
category: "computer-networking"
---

# Port Security Issues Injection

Switch port security related network faults for troubleshooting practice

## Supported Protocols
- port-security
- switch

## Fault Injection Scenarios & Troubleshooting Procedures

### Port Security Maximum MAC Limit Too Low (Severity: HIGH)

Set maximum MAC addresses too low causing port to err-disable or drop traffic

**Diagnostic Symptoms:**
- Port enters err-disable state
- New devices cannot connect to the switch port
- MAC address limit violation alarms
- Secure MAC count exceeds configured maximum

**Troubleshooting Commands & Remediation:**
- `Check port security status with 'show port-security interface <intf>'`
- `Default max MAC count is 1`
- `Use 'switchport port-security maximum <1-132>'`
- `Set to appropriate number based on connected devices`
- `A hub behind the port requires more MAC addresses`
- `Check 'show port-security' for violation counts`

### Port Security Violation Action Misconfiguration (Severity: LOW)

Configure violation action to 'protect' instead of 'restrict' or 'shutdown' causing silent traffic drops

**Diagnostic Symptoms:**
- Traffic silently dropped on the port
- No violation counters or SNMP traps generated
- Port stays up but drops unauthorized traffic
- Difficult to detect and troubleshoot port security violations

**Troubleshooting Commands & Remediation:**
- `Check violation mode with 'show port-security interface <intf>'`
- `Violation actions: protect, restrict, shutdown`
- `Protect: silently drops violating traffic (no notification)`
- `Restrict: drops violating traffic and increments counter`
- `Shutdown: err-disables the port (most common, most visible)`
- `Use 'switchport port-security violation {protect|restrict|shutdown}'`

### Port Security Sticky MAC Learning Disabled (Severity: LOW)

Disable sticky MAC learning causing MAC addresses to be lost after switch reload

**Diagnostic Symptoms:**
- MAC addresses lost after switch reload
- Port security violations after reboot
- Dynamically learned MACs not saved to running config
- Port err-disables after reboot until MACs re-learn

**Troubleshooting Commands & Remediation:**
- `Check sticky status with 'show port-security interface <intf>'`
- `Sticky MACs are saved to running-config`
- `Use 'switchport port-security mac-address sticky' to enable`
- `Sticky MACs convert dynamic MACs to secure sticky MACs`
- `Configure with 'switchport port-security mac-address sticky <mac>'`
- `Sticky entries persist across reloads if config is saved`

### Port Security Shutdown / Err-Disable Recovery (Severity: LOW)

Configure err-disable recovery disabled, requiring manual port re-enable after violation

**Diagnostic Symptoms:**
- Port remains err-disabled until manually recovered
- User unplugged indefinitely after violation
- No auto-recovery of security-violation ports
- Extended outage for legitimate devices after false violation

**Troubleshooting Commands & Remediation:**
- `Check err-disable status with 'show interfaces <intf> status'`
- `Err-disabled ports show 'err-disabled' in interface status`
- `Recover with 'shutdown' then 'no shutdown' on the interface`
- `Enable auto-recovery: 'errdisable recovery cause psecure-violation'`
- `Set recovery timer: 'errdisable recovery interval <seconds>'`
- `Check 'show errdisable recovery' for recovery configuration`

### Port Security Static MAC Conflict (Severity: HIGH)

Configure static secure MAC that conflicts with dynamically learned MACs

**Diagnostic Symptoms:**
- Static MAC address failing to configure
- Conflict between static and dynamic secure MACs
- Legitimate device blocked due to MAC conflict
- Port security violation on expected device

**Troubleshooting Commands & Remediation:**
- `Check secure MAC addresses with 'show port-security address'`
- `Static secure MAC: 'switchport port-security mac-address <mac>'`
- `Static MAC must not duplicate existing dynamic/sticky MACs`
- `Remove conflicting MAC or use a different one`
- `Static MACs are saved in running-config`
- `Static MAC takes precedence over others`

### Port Security Voice VLAN Misconfiguration (Severity: MEDIUM)

Configure port security with voice VLAN not allowing enough MACs for phone and PC

**Diagnostic Symptoms:**
- IP phone fails after PC powers on
- PC has connectivity but phone does not (or vice versa)
- Port security violation on voice VLAN after PC connects
- Phone MAC or PC MAC blocked due to limit

**Troubleshooting Commands & Remediation:**
- `Check port security for voice VLAN with 'show port-security interface <intf>'`
- `Voice VLAN ports need at least 2 MACs (phone + PC)`
- `Phone behind PC needs 2 MACs (phone passthrough)`
- `Set 'switchport port-security maximum 2' or more`
- `MAC address count includes all VLANs on the port`
- `Use 'switchport port-security maximum 3' for phone + PC + service`

### Port Security MAC Flapping / MAC Move Between Ports (Severity: HIGH)

Configure port security causing MAC flap violation when host moves between switch ports

**Diagnostic Symptoms:**
- Port security violation when laptop moves between desks
- MAC address flapping between two secure ports
- Err-disabled port after host reconnects to different port
- User mobility causing port security issues

**Troubleshooting Commands & Remediation:**
- `Secure MAC addresses are per-port (host cannot move freely)`
- `Check 'show port-security address' for MAC-to-port bindings`
- `Sticky MACs are per-port, different port = new MAC required`
- `Clear old binding: 'clear port-security sticky <intf> <mac>'`
- `Auto-recovery: 'errdisable recovery cause psecure-violation'`
- `Consider 802.1X + port security for user mobility`

### Port Security on Trunk Port Misconfiguration (Severity: HIGH)

Configure port security on trunk port causing MAC limit per-VLAN issues

**Diagnostic Symptoms:**
- Trunk port with port security blocking legitimate VLAN traffic
- MAC addresses per VLAN exceeding limit
- VLAN pruning causing port security violations
- Secure MAC count across VLANs unexpected

**Troubleshooting Commands & Remediation:**
- `Port security on trunk: MAC limit applies to ALL VLANs combined`
- `Check 'show port-security interface <intf>' for VLAN counts`
- `Maximum MAC count must account for all VLANs on trunk`
- `voice VLAN adds additional MACs per VLAN`
- `Consider MAC limit based on number of active VLANs`
- `Port security on trunk NOT recommended in most designs`

### Port Security MAC Aging Misconfiguration (Severity: MEDIUM)

Configure port security MAC aging incorrectly causing premature MAC removal or non-aging

**Diagnostic Symptoms:**
- Secure MACs not aging out after host disconnects
- Once-learned MACs never cleared from port security table
- Port fills MAC table with stale entries
- New hosts unable to connect due to MAC table full

**Troubleshooting Commands & Remediation:**
- `Check 'show port-security interface <intf>' for aging config`
- `Sticky MAC aging: 'switchport port-security aging time <minutes>'`
- `Aging types: absolute (after time), inactivity (after no traffic)`
- `Use 'switchport port-security aging type {absolute|inactivity}'`
- `Inactivity aging recommended for guest ports`
- `Static MACs do not age out`

### Port Security with 802.1X / Multi-Domain Auth Conflict (Severity: HIGH)

Configure port security with 802.1X authentication but MAC-based authentication fails

**Diagnostic Symptoms:**
- 802.1X authenticated host unable to access port
- Port security violation after successful 802.1X
- MAC authentication bypass (MAB) port security conflict
- Multi-domain authentication (voice+data) port security limit

**Troubleshooting Commands & Remediation:**
- `Port security and 802.1X can coexist with proper configuration`
- `Sticky learning may conflict with 802.1X MAC authentication`
- `Use 'authentication port-control auto' with port security`
- `Multi-domain (voice+data) needs secure mac-count >= 2`
- `MAB: port security learns authenticated MAC`
- `Check 'show authentication sessions <intf>' for auth state`

### Port Security Voice VLAN / MAC Limit Per VLAN (Severity: MEDIUM)

Configure port security on voice VLAN without accounting for phone MAC

**Diagnostic Symptoms:**
- IP phone fails after PC connects
- Port security violation when both phone and PC are active
- Voice VLAN traffic blocked after data VLAN passes
- Phone and PC compete for MAC address limit

**Troubleshooting Commands & Remediation:**
- `Voice VLAN ports need separate MAC counting per VLAN`
- `Set 'switchport port-security maximum <count>' high enough for both VLANs`
- `Phone: uses voice VLAN, PC: uses data VLAN`
- `Check 'show port-security interface <intf>' for per-VLAN counts`
- `Use 'switchport port-security maximum 2' or more`
- `Port with IP phone typically needs 2-3 allowed MACs`

### Port Security + DHCP Snooping + IP Source Guard Interop (Severity: HIGH)

Configure port security with DHCP snooping and IPSG but features conflict

**Diagnostic Symptoms:**
- Port security violation after DHCP lease obtained
- IPSG blocks traffic despite valid DHCP binding
- Sticky learning does not capture IP from DHCP snooping
- Port security and IPSG interaction causing drops

