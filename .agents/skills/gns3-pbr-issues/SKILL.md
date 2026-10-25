---
name: "PBR Issues Injection"
description: "Policy-Based Routing and route-map related network faults for troubleshooting practice"
category: "computer-networking"
---

# PBR Issues Injection

Policy-Based Routing and route-map related network faults for troubleshooting practice

## Supported Protocols
- pbr
- route-map

## Fault Injection Scenarios & Troubleshooting Procedures

### PBR Route-Map Not Applied to Interface (Severity: HIGH)

Configure route-map but fail to apply it to the required interface

**Diagnostic Symptoms:**
- PBR policy not taking effect
- Traffic not matching route-map despite correct ACL
- All traffic following regular routing table
- Policy completely inactive

**Troubleshooting Commands & Remediation:**
- `Check 'show ip policy' for applied policies`
- `Use 'ip policy route-map <name>' on the interface`
- `PBR must be applied to the inbound interface`
- `Verify 'route-map <name>' exists with 'show route-map'`
- `Check interface is not 'no ip policy'`
- `PBR processes inbound traffic only`

### PBR ACL Match Criteria Incorrect (Severity: HIGH)

Configure route-map with ACL that matches wrong traffic (too broad or too narrow)

**Diagnostic Symptoms:**
- Wrong traffic matched by PBR
- Expected traffic not matching PBR
- Unintended traffic being policy-routed
- PBR hits on wrong packets

**Troubleshooting Commands & Remediation:**
- `Check ACL matches with 'show access-lists <acl>'`
- `Verify sequence numbers in route-map`
- `Use 'match ip address <acl>' in route-map`
- `Check ACL permit/deny logic`
- `Add 'log' keyword to ACL for debugging`
- `PBR ignores 'deny' entries in ACL (not routed by policy)`

### PBR Set Next Hop Unreachable (Severity: HIGH)

Configure PBR to set next hop that is not reachable

**Diagnostic Symptoms:**
- PBR does not route traffic to specified next hop
- Traffic falls back to normal routing
- Policy-routed packets dropped
- Next hop unreachable from router

**Troubleshooting Commands & Remediation:**
- `Check 'show ip route <next-hop>' for reachability`
- `Verify 'set ip next-hop <ip>' in route-map`
- `PBR requires next hop to be directly connected or reachable`
- `Use 'set ip next-hop verify-availability' for object tracking`
- `Use 'set interface' as alternative to next-hop`
- `Check 'show route-map' for match statistics`

### PBR Set Interface Wrong or Down (Severity: HIGH)

Configure PBR to set exit interface that is down or incorrectly specified

**Diagnostic Symptoms:**
- PBR failing to route via specified interface
- Set interface is down or not operational
- Traffic not forwarded as expected
- PBR falls back to default routing

**Troubleshooting Commands & Remediation:**
- `Check interface status with 'show interfaces <intf>'`
- `Verify 'set interface <intf>' in route-map`
- `Interface must be up/up for PBR to work`
- `Use backup next-hop: 'set ip next-hop <ip1> <ip2>'`
- `PBR can set multiple next-hops for redundancy`
- `Use 'show route-map' to verify PBR matches`

### PBR Local Policy Not Configured (Severity: MEDIUM)

PBR not applied to locally generated traffic (packets originated by the router)

**Diagnostic Symptoms:**
- Transit traffic policy-routed correctly
- Locally originated traffic ignores PBR
- Router-originated packets (ping, tftp, NTP) not policy-routed
- Management traffic not following PBR policy

**Troubleshooting Commands & Remediation:**
- `PBR by default only applies to transit traffic`
- `Use 'ip local policy route-map <name>' for local packets`
- `Local PBR affects packets originated by the router`
- `Check 'show ip local policy' for applied policy`
- `Local policy uses same route-map structure`
- `Be careful with local PBR (can affect critical traffic)`

### PBR Route-Map Sequence Order Error (Severity: LOW)

Configure route-map entries in wrong sequence order causing incorrect matching

**Diagnostic Symptoms:**
- More specific matches never reached
- Broad match catches traffic before specific match
- Route-map entries not evaluated as expected
- Some traffic gets wrong PBR action

**Troubleshooting Commands & Remediation:**
- `Check 'show route-map' for sequence evaluation`
- `Route-map entries are processed in sequence number order (low to high)`
- `Specific matches should have lower sequence numbers`
- `Permit entries set the action when matched`
- `Deny entries skip that route-map instance`
- `Use 'sequence <number>' to control evaluation order`

### PBR Default Route / No Match Fallback (Severity: LOW)

Configure PBR where no route-map match occurs and traffic falls to default routing

**Diagnostic Symptoms:**
- PBR not matching expected traffic (hit count zero)
- Traffic uses regular routing table despite PBR configured
- Missing 'match ip address' causing no traffic classification
- Empty ACL in route-map permit entry

**Troubleshooting Commands & Remediation:**
- `Check 'show route-map <name>' for match/not match counters`
- `Route-map permit without match = match ALL`
- `Route-map deny without match = skip this sequence for ALL`
- `If no match in any sequence: traffic follows normal routing`
- `Use 'match ip address <acl>' in route-map for specific traffic`
- `Add deny ACE at end of ACL for logging unmatched traffic`

### PBR for IPv6 (IPv6 PBR) Misconfiguration (Severity: HIGH)

Configure PBR for IPv6 traffic incorrectly using IPv4-based match statements

**Diagnostic Symptoms:**
- IPv6 traffic not affected by PBR
- IPv6 ACL not matching IPv6 traffic
- Set next-hop for IPv6 using IPv4 address
- PBR only working for IPv4 traffic

**Troubleshooting Commands & Remediation:**
- `Use 'ipv6 policy route-map <name>' for IPv6 PBR`
- `IPv6 PBR uses 'match ipv6 address <acl>'`
- `IPv6 ACL: 'ipv6 access-list <name>'`
- `Set actions: 'set ipv6 next-hop <ipv6>'`
- `Show IPv6 PBR: 'show ipv6 policy'`
- `IPv6 PBR works the same as IPv4 PBR, just with IPv6 addresses`

### PBR for MPLS / PBR with MPLS Labels (Severity: HIGH)

Configure PBR that conflicts with MPLS forwarding or VPN routing

**Diagnostic Symptoms:**
- PBR not working for MPLS encapsulated traffic
- PBR next-hop not reachable in MPLS VPN context
- PBR overriding MPLS label switching incorrectly
- Traffic policy-routed before MPLS label imposition

**Troubleshooting Commands & Remediation:**
- `PBR processes before MPLS label push (Cisco order of ops)`
- `PBR can override VPN next-hop in MPLS L3VPN`
- `For MPLS VPN: PBR in VRF context`
- `Check 'show ip policy vrf <vrf>' for VRF PBR`
- `CE-facing PBR in VRF may alter routing behavior`
- `PBR with MPLS may cause unexpected label behavior`

### PBR Route-Map for Redistribution Filtering Error (Severity: MEDIUM)

Configure route-map used for both PBR and redistribution with unintended effects

**Diagnostic Symptoms:**
- Route-map used for redistribution affecting PBR
- Same route-map name used for different purposes
- Modifying route-map for one use breaks the other
- set commands in route-map applied to redistribution incorrectly

**Troubleshooting Commands & Remediation:**
- `Route-maps used in PBR and redistribution are separate instances`
- `But changing the route-map affects ALL uses`
- `Use separate route-map names for PBR vs redistribution`
- `PBR uses set commands: set ip next-hop, set interface`
- `Redistribution uses: set metric, set tag, set community`
- `Check 'show route-map <name>' for all references`

### PBR Set DSCP / QoS Marking via Route-Map (Severity: LOW)

Configure PBR with set dscp but QoS marking not applied to policy-routed traffic

**Diagnostic Symptoms:**
- DSCP marking not applied to policy-routed traffic
- set dscp in PBR route-map not taking effect
- Traffic matches PBR but markings unchanged
- QoS policy not seeing expected DSCP from PBR

**Troubleshooting Commands & Remediation:**
- `Use 'set ip dscp <value>' in PBR route-map`
- `PBR marking occurs before QoS policing/queuing`
- `Check 'show route-map <name>' for set actions`
- `PBR set dscp can mark traffic before routing`
- `Verify DSCP marking reflects in 'show policy-map interface'`
- `PBR marking can replace trust-based marking`

