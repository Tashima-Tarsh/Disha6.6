---
name: "RIP Issues Injection"
description: "RIP protocol related network faults for troubleshooting practice"
category: "computer-networking"
---

# RIP Issues Injection

RIP protocol related network faults for troubleshooting practice

## Supported Protocols
- rip

## Fault Injection Scenarios & Troubleshooting Procedures

### RIP Version Mismatch (Severity: MEDIUM)

Configure mismatched RIP versions (RIP v1 vs v2) on interfaces

**Diagnostic Symptoms:**
- RIP routes not propagating
- Subnet mask inconsistencies
- RIP not receiving updates
- Classful routing behavior

**Troubleshooting Commands & Remediation:**
- `Check RIP version with 'show ip protocols'`
- `RIP v1 is classful, RIP v2 supports CIDR`
- `Ensure RIP versions match on broadcast segments`
- `Check for 'version mismatch' messages`
- `RIP v2 supports VLSM and authentication`

### RIP Passive Interface Blocking Updates (Severity: HIGH)

Configure passive-interface on RIP interface preventing route advertisement

**Diagnostic Symptoms:**
- RIP updates not sent on specific interface
- Routes from this router not reaching neighbors
- One-way RIP learning
- Other interfaces working normally

**Troubleshooting Commands & Remediation:**
- `Check 'show ip protocols' for passive interfaces`
- `Passive interfaces receive but do not send RIP updates`
- `Verify 'passive-interface default' if used`
- `Use 'no passive-interface <intf>' to allow sending updates`
- `Check 'show run | section router rip' for passive statements`

### RIP Authentication Mismatch (Severity: HIGH)

Configure RIP v2 authentication on one side but not the other, or use different keys

**Diagnostic Symptoms:**
- RIP routes not received from authenticated side
- Authentication failure messages in logs
- RIP routing updates rejected
- One-way route learning

**Troubleshooting Commands & Remediation:**
- `Check RIP authentication with 'show ip protocols'`
- `RIP v2 supports MD5 and clear text authentication`
- `Verify key-chain configuration matches on both sides`
- `Ensure both interfaces use same authentication mode`
- `Check key IDs and key strings match exactly`
- `Use 'debug ip rip' to see authentication failures`

### RIP Split Horizon Issues (Severity: MEDIUM)

RIP split horizon preventing route advertisement on specific interfaces

**Diagnostic Symptoms:**
- RIP routes not advertised back to neighbors
- Routing table incomplete on some routers
- Hub-and-spoke routing issues
- Frame relay NBMA routing problems

**Troubleshooting Commands & Remediation:**
- `Split horizon prevents advertising routes back out same interface`
- `Disable split horizon on hub in NBMA topologies`
- `Use 'no ip split-horizon' on hub interface for RIP`
- `RIP split horizon is enabled by default`
- `Check split horizon status with 'show ip interface <intf>'`

### RIP Auto-Summarization Error (Severity: MEDIUM)

Enable RIP auto-summarization causing discontiguous subnet routing issues

**Diagnostic Symptoms:**
- Discontiguous subnets unreachable
- Routes summarized to classful boundary
- Specific subnet routes missing
- Incorrect routing to wrong part of network

**Troubleshooting Commands & Remediation:**
- `Check 'show ip protocols' for auto-summarization status`
- `RIP v1 always auto-summarizes, RIP v2 can disable`
- `Use 'no auto-summary' under router rip (RIP v2)`
- `Auto-summarization summarizes to classful boundary`
- `Discontiguous networks require auto-summarization disabled`
- `Use 'ip summary-address rip' for manual summarization`

### RIP Update / Invalid / Hold Timer Mismatch (Severity: LOW)

Configure non-standard RIP timers on different routers causing slow convergence or route expiration

**Diagnostic Symptoms:**
- RIP routes expiring prematurely on some routers
- Slow convergence after route changes
- Route flapping due to timer mismatch
- Update timer differences causing inconsistent timing

**Troubleshooting Commands & Remediation:**
- `RIP timers: update (30s), invalid (180s), hold (180s), flush (240s)`
- `Check 'show ip protocols' for current timer values`
- `Use 'timers basic <update> <invalid> <hold> <flush>'`
- `Timer mismatch does not prevent adjacency (unlike OSPF)`
- `Shorter update timer = faster convergence, more bandwidth`
- `Hold timer prevents route oscillation after withdrawal`

### RIP Route Redistribution Error (Severity: HIGH)

Configure redistribution from other protocols into RIP with incorrect metric or without subnets

**Diagnostic Symptoms:**
- Redistributed routes missing or incorrect metric in RIP
- Routes from OSPF/static/EIGRP not appearing in RIP updates
- Redistributed routes without subnet mask (classful)
- Metric of redistributed routes too high (invalid route)

**Troubleshooting Commands & Remediation:**
- `RIP default metric for redistributed routes: 0 (unreachable!)`
- `Always set metric: 'redistribute <protocol> metric <1-16>'`
- `Use 'default-metric <1-16>' for all redistributed routes`
- `RIP max hop count = 15 (16 = unreachable/infinite)`
- `Redistribution filters: 'redistribute <protocol> route-map <name>'`
- `Check 'show ip rip database' for redistributed entries`

### RIP Default Route Distribution Issue (Severity: HIGH)

Configure RIP to advertise default route but propagation fails due to metric or redistribution issues

**Diagnostic Symptoms:**
- Default route not propagated via RIP
- Routers have no gateway of last resort
- Static default route not redistributed correctly
- Default route metric set to 16 (unreachable)

**Troubleshooting Commands & Remediation:**
- `Use 'default-information originate' under router rip`
- `Requires default route in routing table (static or other)`
- `Or 'redistribute static' with metric if static default exists`
- `Metric of default route must be <= 15`
- `Default route advertised to all RIP neighbors`
- `Check 'show ip rip database' for default route entry`

### RIP Offset-List Metric Manipulation (Severity: MEDIUM)

Configure RIP offset-list incorrectly adding unexpected metric to routes

**Diagnostic Symptoms:**
- Specific routes have unexpectedly higher hop count
- Offset-list matching wrong interfaces or routes
- Route metric increased beyond 15 (unreachable)
- Unexpected route selection changes

**Troubleshooting Commands & Remediation:**
- `Offset-list adds to metric: 'offset-list <acl> {in|out} <offset>'`
- `Offset value 1-14 recommended (max 15 before unreachable)`
- `Check offset applied to correct interface and direction`
- `Use 'show ip rip database' to verify metric changes`
- `Offset per interface: 'offset-list <acl> in <offset> <intf>'`
- `Common for traffic engineering in RIP networks`

### RIP Triggered Extensions / RIPng Configuration Error (Severity: HIGH)

Configure RIP triggered extensions or RIP next generation (RIPng) for IPv6 incorrectly

**Diagnostic Symptoms:**
- RIPng (RIP for IPv6) process not running
- IPv6 routes not exchanged via RIPng
- Triggered updates not working as expected
- RIPng interface not enabled

**Troubleshooting Commands & Remediation:**
- `RIPng: 'ipv6 router rip <tag>' and 'ipv6 rip <tag> enable' under interface`
- `RIPng uses UDP port 521, multicast FF02::9`
- `Check 'show ipv6 rip' for RIPng process and interfaces`
- `RIPng timer default: update 30s, timeout 180s`
- `RIPng supports split horizon and poison reverse`
- `RIPng metric same hop-count limit (15)`

### RIP Maximum Paths / Load Balancing Error (Severity: LOW)

Configure RIP with multiple equal-cost paths but load balancing limited by maximum-paths

**Diagnostic Symptoms:**
- Only one RIP path in routing table despite multiple equal-cost routes
- Load balancing not utilizing all available equal-cost links
- Maximum-paths limit preventing path utilization
- Unequal traffic distribution

**Troubleshooting Commands & Remediation:**
- `RIP supports up to maximum-paths (default 4, up to 16)`
- `Use 'maximum-paths <number>' to increase path count`
- `All paths must have equal metric (same hop count)`
- `Check 'show ip route <prefix>' for number of RIP paths`
- `CEF per-destination vs per-packet load balancing`
- `Unequal cost not possible with RIP (no variance-like feature)`

### RIP Hop Count Exceeded / Routing Loop (Severity: HIGH)

Configure RIP with hop count reaching 16 (infinite metric) due to routing loop or network diameter exceeding limit

**Diagnostic Symptoms:**
- Routes showing metric 16 (unreachable) in RIP database
- Routing loop with count-to-infinity
- Some networks unreachable via RIP
- Hold-down preventing route advertisement

**Troubleshooting Commands & Remediation:**
- `RIP max hop count = 15, 16 = unreachable (infinite)`
- `Network diameter > 15 hops not supported by RIP`
- `Hold-down timer prevents routing loops`
- `Poison reverse and triggered updates mitigate loops`
- `Use 'show ip rip database' for metric values`
- `Split horizon must be enabled to prevent loops`

### RIP Route Filter / Distribute-List Error (Severity: HIGH)

Configure RIP distribute-list filtering incorrectly, blocking legitimate routes or allowing unwanted routes

**Diagnostic Symptoms:**
- Expected routes not received from RIP neighbor
- Unwanted routes accepted and installed
- Distribute-list ACL matching wrong prefixes
- Inbound filters blocking specific routes

**Troubleshooting Commands & Remediation:**
- `Use 'distribute-list <acl> in' or 'distribute-list <acl> out'`
- `Check 'access-list' entries for correct prefix matching`
- `Alternative: 'distribute-list prefix <name> in/out' for prefix-list`
- `Implicit deny at end of ACL blocks all non-permitted routes`
- `Use 'show ip protocols' for active distribute-lists`
- `Check interface-specific distribute-lists`

### RIP Route Tagging / Policy Routing Error (Severity: MEDIUM)

Configure RIP route tag incorrectly causing redistribution policy to filter or modify routes unexpectedly

**Diagnostic Symptoms:**
- Route tags missing or incorrect on redistributed routes
- Route-map matching tag not matching intended routes
- Tag-based redistribution filtering rejecting legitimate routes
- Route tag propagation inconsistent

**Troubleshooting Commands & Remediation:**
- `RIP route tag: 16-bit value describing route origin`
- `Set tag: 'set tag <value>' in route-map during redistribution`
- `Match tag: 'match tag <value>' in route-map`
- `Check 'show ip rip database <prefix>' for tag value`
- `RIP does not propagate tags to other RIP neighbors by default`
- `Route tag used to prevent redistributed route loops`

### RIP BFD Integration / Fast Failure Detection (Severity: LOW)

Configure RIP with BFD for fast link failure detection but BFD not integrated with RIP

**Diagnostic Symptoms:**
- RIP convergence still slow (30s update timer based)
- BFD session not integrated with RIP neighbor tracking
- Sub-second failure detection not reducing RIP convergence
- BFD down not triggering immediate RIP neighbor removal

**Troubleshooting Commands & Remediation:**
- `RIP default convergence: 30s update + 180s timeout`
- `BFD integration: some platforms support BFD for RIP`
- `Platform support for RIP-BFD varies widely`
- `Use 'bfd all-interfaces' under router rip if supported`
- `RIP may need workarounds: PBR + IP tracking for faster convergence`
- `Consider replacing RIP with EIGRP or OSPF if fast convergence needed`

### RIPng Interface Not Enabled for IPv6 (Severity: HIGH)

Configure RIPng globally but not enabled on the required interface

**Diagnostic Symptoms:**
- RIPng not advertising IPv6 routes
- No RIPng updates sent on specific interface
- IPv6 routes missing from RIPng database
- RIPng process running but no routes exchanged

### RIPng Split Horizon / Poison Reverse Issue (Severity: MEDIUM)

Configure RIPng with split horizon enabled on hub causing spoke-to-spoke routing failures

**Diagnostic Symptoms:**
- RIPng routes not propagating from hub to spokes
- Split horizon blocking route advertisement
- Spoke-to-spoke reachability via hub fails
- Partial IPv6 routing table on spokes

### RIPng Default Route / Default-Information Originate (Severity: HIGH)

Configure RIPng default route but propagation fails

**Diagnostic Symptoms:**
- No IPv6 default route (::/0) via RIPng
- RIPng routers have no default in IPv6 routing table
- Static default not redistributed into RIPng
- Default-information originate not configured

