---
name: "Interface Issues Injection"
description: "Common interface-related network faults for troubleshooting practice"
category: "computer-networking"
---

# Interface Issues Injection

Common interface-related network faults for troubleshooting practice

## Supported Protocols
- all

## Fault Injection Scenarios & Troubleshooting Procedures

### Interface Shutdown (Severity: LOW)

Administratively shutdown a network interface to simulate link failure

**Diagnostic Symptoms:**
- Link status shows down/down
- Cannot ping devices across the link
- Interface status shows 'administratively down'
- Neighbor adjacencies lost

**Troubleshooting Commands & Remediation:**
- `Check interface status with 'show ip interface brief' (Cisco) or 'display ip interface brief' (Huawei/H3C)`
- `Look for 'administratively down' in interface status`
- `Use 'show interface <interface>' to see detailed status`
- `Check physical layer indicators if available`

### IP Address Configuration Error (Severity: MEDIUM)

Configure incorrect IP address, subnet mask, or duplicate IP on an interface

**Diagnostic Symptoms:**
- Partial connectivity (some hosts reachable, others not)
- ARP failures or duplicate IP warnings
- Routing protocol neighborship failures
- Subnet mismatch errors

**Troubleshooting Commands & Remediation:**
- `Verify IP configuration with 'show running-config' or 'display current-configuration'`
- `Check subnet mask matches network design`
- `Look for duplicate IP address error messages on console`
- `Use 'show ip arp' to detect IP conflicts`
- `Ping interface addresses to check for duplicates`

### Speed/Duplex Mismatch (Severity: MEDIUM)

Configure mismatched speed or duplex settings on Ethernet interfaces

**Diagnostic Symptoms:**
- Extremely slow performance
- High collision count (on half-duplex side)
- High CRC/error count (on full-duplex side)
- Intermittent connectivity

**Troubleshooting Commands & Remediation:**
- `Check interface statistics with 'show interface' counters`
- `Look for CRC, frame, or collision errors`
- `Verify speed and duplex settings match on both ends`
- `Check for 'late collisions' which indicate duplex mismatch`
- `Auto-negotiation issues may cause this`

### MTU Mismatch (Severity: MEDIUM)

Configure mismatched MTU values on two ends of a link, causing packet fragmentation issues

**Diagnostic Symptoms:**
- Small packets work, large packets fail
- Intermittent connectivity issues
- Specific applications fail (e.g., file transfer, VPN)
- TCP retransmissions and slow performance

**Troubleshooting Commands & Remediation:**
- `Check MTU with 'show interface <interface>' (Cisco) or 'display interface {interface}' (Huawei)`
- `Compare MTU values on both ends of the link`
- `Test with 'ping' using different packet sizes`
- `Check for 'Fragmentation needed' ICMP messages`
- `Verify path MTU discovery is working`

### Interface Error-Disabled State (Severity: HIGH)

Trigger interface error-disable condition due to port-security, BPDU guard, or other violation

**Diagnostic Symptoms:**
- Interface shows err-disabled status
- Link down despite physical connectivity
- Interface not forwarding traffic
- Violation cause shown in interface status

**Troubleshooting Commands & Remediation:**
- `Check 'show interface <intf>' for err-disabled status`
- `Identify cause: 'show interfaces status err-disabled'`
- `Common causes: port-security, BPDU guard, UDLD, loop guard`
- `Recover: 'shutdown' then 'no shutdown' on interface`
- `Use 'errdisable recovery cause <cause>' for auto-recovery`
- `Check 'show errdisable detect' for enabled detection causes`

### Interface Flapping / Link Instability (Severity: LOW)

Create conditions causing interface to go up/down repeatedly

**Diagnostic Symptoms:**
- Interface repeatedly going up and down
- Link status bouncing
- Routing neighbors constantly forming and losing adjacency
- Interface counters incrementing rapidly

**Troubleshooting Commands & Remediation:**
- `Check 'show interface' for up/down transitions`
- `Use 'show log' for interface state changes`
- `Check physical connections, transceivers, and cable`
- `Verify port admin settings (speed/duplex) match peer`
- `Check for loose connections or faulty SFP modules`
- `Monitor 'show interface <intf>' for input errors`

### Interface Storm Control Misconfiguration (Severity: LOW)

Configure storm control too restrictively, causing legitimate traffic to be suppressed

**Diagnostic Symptoms:**
- Broadcast/multicast/unknown unicast traffic suppressed unexpectedly
- Storm control threshold exceeded on normal traffic levels
- Packet drops for legitimate broadcast traffic
- Network services impacted (ARP, DHCP)

**Troubleshooting Commands & Remediation:**
- `Check storm control with 'show storm-control <intf>'`
- `Configure: 'storm-control broadcast level <percent>'`
- `Default: no storm control (or platform-dependent level)`
- `Too low: legitimate broadcast traffic may be suppressed`
- `Use 'show storm-control <intf> count' for drop counters`
- `Apply to broadcast, multicast, unicast individually`

### Sub-Interface Configuration / VLAN Encapsulation Error (Severity: HIGH)

Configure sub-interface with incorrect VLAN encapsulation or dot1Q tag mismatch

**Diagnostic Symptoms:**
- Sub-interface not forwarding traffic
- VLAN encapsulation mismatch between devices
- Router-on-a-stick inter-VLAN routing broken
- Wrong VLAN tagged on sub-interface

**Troubleshooting Commands & Remediation:**
- `Check sub-interface config: 'show running-config interface <intf>.<sub>'`
- `Verify encapsulation: 'encapsulation dot1Q <vlan-id>'`
- `Native VLAN: 'encapsulation dot1Q <vlan-id> native'`
- `Check trunk allows the VLAN on the switch side`
- `Verify physical interface is UP`
- `Native VLAN mismatch causes connectivity issues`

### Loopback Interface Not Advertised / Missing (Severity: HIGH)

Configure loopback interface but IP not advertised in routing protocol, causing reachability issues

**Diagnostic Symptoms:**
- Cannot ping loopback IP from remote routers
- Loopback not appearing in routing protocol neighbor tables
- BGP sessions using loopback cannot form
- Management access to device via loopback fails

**Troubleshooting Commands & Remediation:**
- `Check 'show ip interface brief' for loopback status`
- `Verify loopback is included in routing protocol network statement`
- `Check routing table on remote router for loopback prefix`
- `Loopback is virtual and always up (unless shutdown)`
- `Used for router-id, BGP peering, OSPF router-id`
- `Loopback netmasks matter for routing protocol (/32 vs actual)`

### Management Interface / MGMT Port Configuration Error (Severity: LOW)

Configure management interface with wrong VLAN, IP, or routing causing management access issues

**Diagnostic Symptoms:**
- Cannot SSH/telnet to device management IP
- Management interface unreachable from network
- Management traffic forwarding to wrong interface
- Out-of-band management not functioning

**Troubleshooting Commands & Remediation:**
- `Check management interface config: 'show management-interface'`
- `Verify management VLAN and IP configuration`
- `Check routing for management traffic (may use separate VRF)`
- `Use 'management-vrf' for dedicated management routing`
- `OOB mgmt: verify physical connectivity to management network`
- `Check ACLs applied to management interface`

### Tunnel Interface / GRE/IPsec Tunnel Not Forming (Severity: HIGH)

Configure tunnel interface with incorrect source, destination, or transport issues

**Diagnostic Symptoms:**
- Tunnel interface up but traffic not passing
- Tunnel destination unreachable
- GRE/IPsec tunnel not establishing
- Tunnel MTU causing fragmentation

**Troubleshooting Commands & Remediation:**
- `Check tunnel status: 'show ip interface brief' for tunnel line/up`
- `Verify tunnel source IP reachable from remote side`
- `Check 'show interface tunnel <id>' for packets in/out`
- `Verify 'tunnel source' and 'tunnel destination' are correct`
- `Check tunnel keepalive settings (optional, configurable)`
- `GRE adds 24 bytes overhead affecting PMTU`

### Layer 3 Port / Routed Port Mode Issue (Severity: HIGH)

Configure switch port in wrong mode (L2 access vs L3 routed) causing routing failures

**Diagnostic Symptoms:**
- Cannot assign IP address to switch port
- Switch port not routing despite IP configuration
- L2 switchport enabled when L3 routing needed
- SVI not routing despite correct VLAN assignment

**Troubleshooting Commands & Remediation:**
- `Use 'no switchport' on IOS to convert L2 port to L3 routed`
- `Check 'show interface <intf> switchport' for L2/L3 status`
- `SVI: 'interface vlan <id>' for Layer 3 VLAN interface`
- `Routed port: configure IP directly on physical interface`
- `L2 port: configured with 'switchport' command`
- `Platform-dependent: L3 only on specific models`

### Cable Fault / Media Error / TDR Detection (Severity: LOW)

Physical layer issue with cable or connector causing high error rate or link instability

**Diagnostic Symptoms:**
- High CRC errors on interface
- FCS/runts/giants incrementing
- Input errors but output errors normal
- Intermittent packet loss

**Troubleshooting Commands & Remediation:**
- `Check 'show interface <intf>' for CRC, frame errors`
- `Use cable diagnostic TDR: 'test cable-diagnostics tdr interface <intf>'`
- `Replace faulty cable or connector`
- `Verify cable length within Ethernet specification`
- `Check for electromagnetic interference near cables`
- `Swap SFP/transceiver module if suspected`

