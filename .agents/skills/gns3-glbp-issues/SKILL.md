---
name: "GLBP Issues Injection"
description: "GLBP first-hop redundancy protocol related network faults"
category: "computer-networking"
---

# GLBP Issues Injection

GLBP first-hop redundancy protocol related network faults

## Supported Protocols
- glbp

## Fault Injection Scenarios & Troubleshooting Procedures

### GLBP Priority / AVG Election Manipulation (Severity: LOW)

Set wrong GLBP priority causing suboptimal AVG (Active Virtual Gateway) election

**Diagnostic Symptoms:**
- Wrong router elected as GLBP AVG
- Suboptimal gateway redundancy
- AVG not the preferred router
- GLBP load balancing not as designed

**Troubleshooting Commands & Remediation:**
- `Check GLBP status with 'show glbp' or 'show glbp brief'`
- `Priority default is 100, higher priority wins AVG election`
- `Use 'glbp <group> priority <1-255>' to set priority`
- `AVG assigns AVF (Active Virtual Forwarder) roles`
- `Preempt enabled by default for AVG`
- `Check 'show glbp <group>' for AVG and AVF states`

### GLBP AVF (Active Virtual Forwarder) Preempt Disabled (Severity: LOW)

AVF preempt disabled causing AVF role not reclaimed after recovery

**Diagnostic Symptoms:**
- AVF roles not redistributed after router recovery
- One router handling more traffic than expected
- Weight-based AVF election not working as expected
- AVF role stuck on backup router

**Troubleshooting Commands & Remediation:**
- `Check AVF preempt with 'show glbp <group>'`
- `AVF preempt controls whether a router reclaims AVF role`
- `Use 'glbp <group> preempt' to re-enable AVF preempt`
- `AVG assigns up to 4 AVFs per GLBP group`
- `Each AVF owns a unique virtual MAC`
- `Preempt delay: 'glbp <group> preempt delay <seconds>'`

### GLBP Weight Tracking Misconfiguration (Severity: LOW)

Configure GLBP weight tracking with wrong decrement value causing premature AVF change

**Diagnostic Symptoms:**
- AVF role changes when tracking object goes down
- Router becomes a 'secondary' AVF after weight drops below threshold
- Weight decrement too large causing unnecessary AVF switch
- Gateway failover not sensitive enough to upstream loss

**Troubleshooting Commands & Remediation:**
- `Check GLBP weight with 'show glbp'`
- `Weight tracks interface or object state`
- `Use 'glbp <group> weighting maximum <max> [lower <low>]'`
- `When weight drops below lower threshold, router loses AVF role`
- `Use 'glbp <group> weighting track <obj> [decrement <value>]'`
- `Total weight decrement should consider multiple tracked objects`

### GLBP Timer Mismatch (Severity: LOW)

Configure GLBP timers that are too fast or too slow causing instability or slow failover

**Diagnostic Symptoms:**
- GLBP groups flapping (hello timer too fast)
- Failover too slow (hello timer too slow)
- AVG election delayed
- GLBP state transitions unexpected

**Troubleshooting Commands & Remediation:**
- `Check GLBP timers with 'show glbp'`
- `Default hello is 3s, hold is 10s (like HSRP)`
- `Use 'glbp <group> timers <hello> <hold>' to configure`
- `Hold timer should be 3x hello timer (minimum)`
- `Sub-second timers for fast convergence`
- `All routers should have consistent timer settings`

### GLBP Virtual IP Address Mismatch (Severity: HIGH)

Configure different virtual IP addresses in the same GLBP group

**Diagnostic Symptoms:**
- GLBP group not operating correctly
- Hosts configured with wrong default gateway
- AVG not responding to ARP for expected VIP
- Virtual IP conflict between routers

**Troubleshooting Commands & Remediation:**
- `Check GLBP VIP with 'show glbp'`
- `Use 'glbp <group> ip <virtual-ip>' to configure`
- `VIP must match on all routers in the GLBP group`
- `GLBP group number must match across routers`
- `AVG responds to ARP requests for VIP with different AVF MACs`
- `Up to 4 virtual MACs per GLBP group for load balancing`

### GLBP Load Balancing Method Misconfiguration (Severity: LOW)

Configure GLBP load balancing method that doesn't match traffic patterns

**Diagnostic Symptoms:**
- Uneven traffic distribution across gateways
- Host IP or MAC based balancing not distributing equally
- Round-robin not cycling through AVFs correctly
- Host-dependent balancing sending all traffic to one AVF

**Troubleshooting Commands & Remediation:**
- `Check GLBP load balance with 'show glbp'`
- `Methods: round-robin, weighted, host-dependent`
- `Round-robin: AVG cycles through AVFs for each ARP request`
- `Weighted: based on AVF weighting value`
- `Host-dependent: same host always gets same AVF`
- `Use 'glbp <group> load-balancing <method>' to set`

### GLBP Authentication Mismatch (Severity: HIGH)

Configure GLBP authentication on one side but not the other, or use different keys

**Diagnostic Symptoms:**
- GLBP neighbors not forming adjacency
- Authentication failures in logs
- GLBP group isolated (routers not seeing each other)
- Multiple AVGs elected (split brain)

**Troubleshooting Commands & Remediation:**
- `Check GLBP auth with 'show glbp'`
- `Use 'glbp <group> authentication <text|md5> <key>'`
- `Authentication must match on all routers in the group`
- `Text auth is insecure, MD5 recommended`
- `Key string is case-sensitive`
- `GLBP MD5 auth field: 'authentication md5 key-string <key>'`

### GLBP Object Tracking / Interface Tracking Failure (Severity: HIGH)

Configure GLBP object tracking but weight decrement not triggered or track object wrong

**Diagnostic Symptoms:**
- GLBP weight not decrementing when tracked object fails
- AVF role not changing after upstream link failure
- Weight tracking not reflecting object state
- GLBP not failing over when expected

**Troubleshooting Commands & Remediation:**
- `Use 'glbp <group> weighting track <obj-id> decrement <value>'`
- `Check 'show track <id>' for tracking object status`
- `Weight decrement must bring total weight below lower threshold`
- `Multiple tracked objects can compound weight reduction`
- `Use 'glbp <group> weighting maximum <max> lower <min>'`
- `Verify track object references the correct IP SLA or interface`

### GLBP Virtual Forwarder MAC / VMAC Conflict (Severity: MEDIUM)

Configure GLBP virtual MAC addresses conflicting with real MACs on network

**Diagnostic Symptoms:**
- GLBP virtual MAC used by another device
- ARP table shows unexpected MAC for gateway IP
- Traffic forwarded to wrong destination
- GLBP AVF MAC conflict with existing host

**Troubleshooting Commands & Remediation:**
- `GLBP VMAC range: 0007.b400.XXYY (XX=group, YY=AVF ID)`
- `Up to 4 AVFs per GLBP group (AVF 1-4)`
- `Check 'show glbp' for assigned virtual MACs`
- `MAC conflicts cause intermittent forwarding failures`
- `Ensure VMAC doesn't overlap with statically assigned MACs`
- `GLBP VMAC used as source for ARP responses`

### GLBP for IPv6 / IPv6 Gateway Redundancy (Severity: HIGH)

Configure GLBP for IPv6 (link-local address) incorrectly

**Diagnostic Symptoms:**
- IPv6 default gateway redundancy not working
- GLBP IPv6 not establishing adjacency
- IPv6 ND RA sent from non- GLBP MAC
- Dual-stack hosts losing IPv6 connectivity on failover

**Troubleshooting Commands & Remediation:**
- `GLBP for IPv6: 'glbp <group> ipv6 <link-local-addr>'`
- `GLBPv6 supports AVG/AVF model like IPv4`
- `Check 'show glbp <group> ipv6' for IPv6 status`
- `IPv6 ND uses virtual MAC for seamless failover`
- `Both IPv4 and IPv6 GLBP can run simultaneously`
- `IPv6 GLBP not available on all platforms (check support)`

### GLBP Split-Brain / Multiple AVG Election (Severity: CRITICAL)

Configure GLBP group isolation causing multiple AVGs elected

**Diagnostic Symptoms:**
- Multiple routers claim AVG role in same GLBP group
- Different virtual MACs advertised by different AVGs
- Hosts see different MAC addresses for same VIP
- Traffic blackholed or forwarded to wrong gateway

**Troubleshooting Commands & Remediation:**
- `Split-brain: link between GLBP routers lost, both think they are AVG`
- `Check 'show glbp' for AVG state on each router`
- `Hello protocol: verify Layer 2 connectivity between GLBP peers`
- `Authentication mismatch can cause split-brain`
- `Timers too aggressive can cause false peer down detection`
- `Ensure hello packets (224.0.0.102) not blocked by VLAN/ACL`

