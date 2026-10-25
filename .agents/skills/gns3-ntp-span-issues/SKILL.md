---
name: "NTP/SPAN Issues Injection"
description: "NTP time synchronization and SPAN/RSPAN/ERSPAN port mirroring related network faults"
category: "computer-networking"
---

# NTP/SPAN Issues Injection

NTP time synchronization and SPAN/RSPAN/ERSPAN port mirroring related network faults

## Supported Protocols
- ntp
- span
- rspan
- erspan
- mirroring

## Fault Injection Scenarios & Troubleshooting Procedures

### NTP Server Unreachable (Severity: HIGH)

Configure NTP with unreachable or incorrect NTP server address

**Diagnostic Symptoms:**
- NTP clock not synchronizing
- Clock offset increasing over time
- NTP stratum level too high
- NTP reachability counter zero

**Troubleshooting Commands & Remediation:**
- `Check NTP with 'show ntp status' and 'show ntp associations'`
- `Verify 'ntp server <ip> [prefer]' configuration`
- `Test UDP 123 reachability: 'telnet <ntp-server> 123'`
- `Use 'ntp source <intf>' for consistent source IP`
- `Check routing to NTP server from source interface`
- `Firewall must allow NTP (UDP 123)`

### NTP Authentication Mismatch (Severity: HIGH)

Configure NTP authentication on one side but not the other

**Diagnostic Symptoms:**
- NTP peer/server not synchronizing
- Authentication failures for NTP packets
- NTP association stuck in 'configured' state
- NTP keys not matching

**Troubleshooting Commands & Remediation:**
- `Enable NTP auth: 'ntp authenticate'`
- `Define key: 'ntp authentication-key <id> md5 <key>'`
- `Trust key: 'ntp trusted-key <id>'`
- `Server: 'ntp server <ip> key <id>'`
- `Peer: 'ntp peer <ip> key <id>'`
- `Key number, type and string must match on both ends`

### NTP Source Interface Misconfiguration (Severity: LOW)

Configure NTP with wrong source interface causing packets dropped by ACL

**Diagnostic Symptoms:**
- NTP packets sent from wrong interface
- ACL on NTP server blocking due to unexpected source IP
- NTP working from some routers but not others (same server)
- Source interface IP not reachable from NTP server

**Troubleshooting Commands & Remediation:**
- `Use 'ntp source <interface>' to set source interface`
- `NTP server may have per-source ACL or restriction`
- `Use loopback as ntp source for consistency`
- `Check routing back to source interface`
- `Verify 'show ntp associations' for source IP used`
- `ACL on NTP server must permit the source IP`

### NTP Stratum Level Manipulation (Severity: LOW)

Configure wrong NTP stratum level causing time source not preferred

**Diagnostic Symptoms:**
- Router becoming NTP time source when it shouldn't
- Stratum number too high causing less accurate time
- NTP peer with higher stratum not synchronizing
- Preferred NTP server not selected

**Troubleshooting Commands & Remediation:**
- `Check stratum with 'show ntp status'`
- `Stratum 1: directly to atomic/radio clock`
- `Stratum 2: sync'd to stratum 1, etc.`
- `Use 'ntp master [stratum]' to set as time source`
- `Lower stratum = more accurate (preferred)`
- `Default stratum when acting as master is 8`

### SPAN Destination Port Misconfiguration (Severity: HIGH)

Configure SPAN with wrong destination port or destination port misconfigured

**Diagnostic Symptoms:**
- Monitoring tool not receiving mirrored traffic
- SPAN destination port not forwarding traffic
- Destination port still forwarding normal traffic (should be monitor-only)
- SPAN session not active

**Troubleshooting Commands & Remediation:**
- `Check SPAN with 'show monitor session <id>'`
- `Destination port: 'monitor session <id> destination interface <intf>'`
- `Destination port stops normal switching (dedicated to monitoring)`
- `Use 'show monitor session <id>' for operational status`
- `Check destination port state (should be up/up)`
- `Verify monitoring device can receive traffic on destination port`

### SPAN Source / VLAN Misconfiguration (Severity: HIGH)

Configure SPAN with wrong source interfaces or VLANs

**Diagnostic Symptoms:**
- Wrong traffic mirrored to monitoring port
- Expected traffic not captured by monitoring tool
- Too much traffic (entire VLAN) mirrored when only specific port needed
- RX/TX direction not specified correctly

**Troubleshooting Commands & Remediation:**
- `Check SPAN sources with 'show monitor session <id>'`
- `Source interface: 'monitor session <id> source interface <intf> [rx|tx|both]'`
- `Source VLAN: 'monitor session <id> source vlan <vlan> [rx|tx|both]'`
- `RX = received traffic, TX = transmitted traffic, Both = both directions`
- `VLAN SPAN (VSPAN) mirrors all ports in the VLAN`
- `Verify monitoring tool filter matches the source`

### RSPAN VLAN Misconfiguration (Severity: HIGH)

Configure RSPAN with wrong remote VLAN or VLAN not allowed on intermediate trunks

**Diagnostic Symptoms:**
- Remote monitoring device not receiving mirrored traffic
- RSPAN VLAN not allowed on intermediate trunk
- RSPAN session configured but no traffic at destination
- RSPAN VLAN conflict with data VLAN

**Troubleshooting Commands & Remediation:**
- `RSPAN uses dedicated VLAN to transport mirrored traffic`
- `Create RSPAN VLAN: 'vlan <id>' then 'remote-span'`
- `Source switch: 'monitor session <id> destination remote vlan <rspan-vlan>'`
- `Destination switch: 'monitor session <id> source remote vlan <rspan-vlan>'`
- `RSPAN VLAN must be allowed on all intermediate trunks`
- `Do not assign any ports to RSPAN VLAN (except via SPAN)`

### ERSPAN Type II/III Misconfiguration (Severity: HIGH)

Configure ERSPAN with wrong source/destination IP or GRE version

**Diagnostic Symptoms:**
- Mirrored traffic not reaching ERSPAN collector
- ERSPAN GRE encapsulation not working
- Wrong ERSPAN ID causing collector to drop packets
- ERSPAN flow ID / timestamp mismatch

**Troubleshooting Commands & Remediation:**
- `ERSPAN encapsulates mirrored traffic in GRE`
- `ERSPAN Type II: standard (4 bytes GRE + 4 bytes ERSPAN)`
- `ERSPAN Type III: extended header (8 bytes ERSPAN)`
- `Source IP: 'monitor session <id> type erspan-source'`
- `Destination IP: 'erspan-id <id>' and 'ip address <src> <dst>'`
- `Verify routing between ERSPAN source and destination IPs`

### NTP Peer / Symmetric Association Misconfiguration (Severity: LOW)

Configure NTP peer (symmetric active) but association not established or clock loop

**Diagnostic Symptoms:**
- NTP peer association not established
- Clock selection algorithm not picking correct peer
- NTP synchronization loop between peers
- Clock stratum bouncing between peers

**Troubleshooting Commands & Remediation:**
- `NTP peer: 'ntp peer <ip>' (symmetric active mode)`
- `Peers can synchronize to each other (unlike client-server)`
- `Check 'show ntp associations' for peer reachability`
- `Synchronization loop: ensure at least one peer has external ref`
- `Use 'ntp peer <ip> prefer' for preferred peer`
- `Stratum level prevents infinite loops (lower = better)`

### NTP Broadcast/Multicast Mode Misconfiguration (Severity: LOW)

Configure NTP broadcast/multicast but clients not receiving time updates

**Diagnostic Symptoms:**
- NTP broadcast clients not synchronizing
- NTP broadcast server not sending NTP broadcasts
- NTP multicast packets blocked by IGMP
- Broadcast time server not heard by clients

**Troubleshooting Commands & Remediation:**
- `Server: 'ntp broadcast <interface>' (broadcast mode)`
- `Client: 'ntp broadcast client' on interface`
- `NTP multicast: 'ntp multicast <group>' (multicast mode)`
- `Client: 'ntp multicast client' on interface`
- `Broadcast/multicast NTP is less accurate than unicast`
- `Use for LAN environments with many NTP clients`

### SPAN CPU / RSPAN/ERSPAN Resource Exhaustion (Severity: LOW)

Configure too many SPAN sessions causing CPU or hardware resource exhaustion

**Diagnostic Symptoms:**
- Multiple SPAN sessions consuming hardware resources
- SPAN session not created due to resource limit
- Monitoring impact on switch forwarding performance
- SPAN packet drops due to monitoring capacity

**Troubleshooting Commands & Remediation:**
- `Platform SPAN session limit: check with 'show monitor capacity'`
- `Resource limits: number of sessions, source interfaces, VLANs`
- `Reduce SPAN sources: mirror only needed ports, not entire VLANs`
- `Consider using netFlow instead of SPAN for traffic analytics`
- `ERSPAN adds CPU overhead due to GRE encapsulation`
- `Check 'show monitor session <id>' for operational status`

### NTP Access Group / ACL Restriction Misconfiguration (Severity: HIGH)

Configure NTP access group too restrictively blocking legitimate NTP peers

**Diagnostic Symptoms:**
- NTP server rejecting valid clients
- NTP synchronization failing despite reachable server
- Access group filtering legitimate NTP associations
- NTP packets blocked by ACL

**Troubleshooting Commands & Remediation:**
- `NTP access group: 'ntp access-group peer|serve|serve-only|query-only <acl>'`
- `Peer: full access (can synchronize and be synchronized)`
- `Serve: can synchronize to server but not vice versa`
- `Serve-only: can only synchronize (no configuration queries)`
- `Query-only: only allow NTP status queries`
- `Check ACL entries: ensure source IP of peer is permitted`

