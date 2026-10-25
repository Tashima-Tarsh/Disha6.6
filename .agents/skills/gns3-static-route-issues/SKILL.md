---
name: "Static Route Issues Injection"
description: "Static route related network faults for troubleshooting practice"
category: "computer-networking"
---

# Static Route Issues Injection

Static route related network faults for troubleshooting practice

## Supported Protocols
- static
- ipv4
- ipv6

## Fault Injection Scenarios & Troubleshooting Procedures

### Incorrect Static Route Next Hop (Severity: HIGH)

Add static route with wrong next hop IP address

**Diagnostic Symptoms:**
- Traffic forwarded to wrong destination
- Black hole routing
- Connectivity failure to specific networks
- Traceroute shows unexpected path

**Troubleshooting Commands & Remediation:**
- `Check routing table with 'show ip route' (Cisco) or 'display ip routing-table' (Huawei)`
- `Verify next hop is reachable with ping`
- `Use 'traceroute' to see path traffic takes`
- `Check for hidden static routes with 'show run | include ip route'`
- `Compare routing tables across multiple routers`

### Incorrect Static Route Destination Network (Severity: HIGH)

Add static route with wrong destination network or subnet mask

**Diagnostic Symptoms:**
- Specific subnets unreachable
- Too broad or too specific route covering wrong destinations
- Traffic to valid destinations sent to wrong next hop

**Troubleshooting Commands & Remediation:**
- `Check routing table for the expected prefix`
- `Verify destination network and mask in static route`
- `Use 'show run | include ip route' to review all static routes`
- `Longest prefix match determines which route is used`
- `Check for overlapping static routes`

### Floating Static Route Wrong Administrative Distance (Severity: LOW)

Set administrative distance too high or too low on floating static route

**Diagnostic Symptoms:**
- Backup route active when primary is available
- Floating static route not taking over when primary fails
- Route from dynamic protocol not preferred over static

**Troubleshooting Commands & Remediation:**
- `Check administrative distance with 'show ip route <prefix>'`
- `Default static route AD is 1 (Cisco), lower than any dynamic protocol`
- `Floating static should have AD higher than the dynamic protocol`
- `OSPF AD=110, EIGRP AD=90/170, RIP AD=120, iBGP AD=200`
- `Use 'ip route <prefix> <mask> <next-hop> <AD>' to set distance`
- `Verify primary route AD is lower than floating static AD`

### Static Route to Null0 (Black Hole) (Severity: LOW)

Add static route pointing to null0 interface causing traffic to be dropped

**Diagnostic Symptoms:**
- Traffic to specific destinations silently dropped
- No route to host for valid IPs in the range
- Ping fails but no ICMP unreachable sent
- Discard route causing connectivity loss

**Troubleshooting Commands & Remediation:**
- `Check routing table for Null0 routes with 'show ip route'`
- `Null0 is a virtual interface that discards packets`
- `Used for route summarization to prevent loops`
- `Verify if Null0 route is too broad (covers valid hosts)`
- `Check for 'ip route <prefix> <mask> Null0' statements`
- `Remove or narrow the Null0 route if incorrectly configured`

### Static Route Recursive Lookup Failure (Severity: HIGH)

Static route with next hop that requires recursive lookup to a network that is not reachable

**Diagnostic Symptoms:**
- Static route not installed in routing table
- 'Gateway of last resort is not set'
- Route is configured but does not appear in RIB
- Connectivity to destination network fails

**Troubleshooting Commands & Remediation:**
- `Check if static route appears in 'show ip route'`
- `Verify next hop is reachable via another route`
- `Cisco requires next hop to be reachable for route to be installed`
- `Use exit interface instead of next hop for directly connected networks`
- `Check for routing loop in recursive lookup`
- `Use 'show ip route <next-hop>' to verify next-hop reachability`

### Missing Default Route (Gateway of Last Resort) (Severity: CRITICAL)

Remove or misconfigure the default route causing no internet/upstream connectivity

**Diagnostic Symptoms:**
- 'Gateway of last resort is not set'
- No internet/upstream connectivity
- Traffic to external networks dropped
- Only local subnets reachable

**Troubleshooting Commands & Remediation:**
- `Check 'show ip route' for default route (0.0.0.0/0)`
- `Verify 'ip route 0.0.0.0 0.0.0.0 <next-hop>' configuration`
- `For IPv6, check 'ipv6 route ::/0 <next-hop>'`
- `Ensure next hop is reachable`
- `Check the router needs to reach the next hop directly`
- `Verify the upstream device is configured correctly`

### Static Route with Object Tracking Failure (Severity: HIGH)

Configure static route with object tracking but tracked object not reachable or tracking not working

**Diagnostic Symptoms:**
- Static route removed from routing table despite valid next-hop
- Track object shows down when it should be up
- Failover not triggering when tracked link fails
- Tracking probe (ICMP) not reaching target

**Troubleshooting Commands & Remediation:**
- `Use 'track <id> ip sla <sla-number>' or 'track <id> interface <intf>'`
- `Check 'show track <id>' for tracking object status`
- `Static route: 'ip route <prefix> <mask> <next-hop> track <id>'`
- `Tracker down = route withdrawn from RIB`
- `ICMP echo probe: 'ip sla <id> icmp-echo <target>'`
- `Tracking delay prevents route flapping on brief failures`

### Permanent Static Route / Persistent Route Issue (Severity: MEDIUM)

Configure permanent static route that remains in routing table even when next-hop unreachable

**Diagnostic Symptoms:**
- Static route remains in routing table after next-hop fails
- Traffic black-holed to unreachable next-hop
- 'permanent' keyword prevents route removal
- Failover not occurring despite primary path down

**Troubleshooting Commands & Remediation:**
- `'ip route <prefix> <mask> <next-hop> permanent' keeps route forever`
- `Use 'show ip route <prefix>' to verify route is permanent`
- `Permanent routes do not require next-hop reachability`
- `Useful for null0 routes but dangerous for next-hop routes`
- `Remove 'permanent' keyword to allow next-hop validation`
- `Alternative: use object tracking for conditional static routes`

### Static Route Within VRF Context Error (Severity: HIGH)

Configure static route in VRF but VRF context missing or next-hop not in VRF routing table

**Diagnostic Symptoms:**
- Static route in VRF not installed in VRF routing table
- Next-hop not reachable within VRF
- VRF-aware static route configured without VRF context
- Route leaking between VRFs via static not working

**Troubleshooting Commands & Remediation:**
- `VRF static: 'ip route vrf <vrf-name> <prefix> <mask> <next-hop>'`
- `Next-hop must be reachable within the same VRF`
- `Use 'show ip route vrf <vrf-name>' to verify VRF routes`
- `VRF static routes can point to global routing table with 'global' keyword`
- `Common for MPLS VPN CE-to-PE static routing`
- `Check VRF definition includes RD and RT values`

### Static Route Load Balancing / ECMP Issue (Severity: LOW)

Configure multiple static routes to same destination but ECMP not working as expected

**Diagnostic Symptoms:**
- Only one static route used despite multiple configured
- Uneven traffic distribution across static routes
- Load balancing not working for static routes
- Backup route not taking over when primary fails

**Troubleshooting Commands & Remediation:**
- `Same AD and metric = ECMP across multiple next-hops`
- `Check 'show ip route <prefix>' for multiple next-hops`
- `Use 'maximum-paths <number>' to allow more ECMP routes`
- `Different AD = floating static (backup only)`
- `CEF per-destination vs per-packet load balancing`
- `Verify all next-hops are reachable`

### Discard Route / Null0 Summary Route Conflict (Severity: MEDIUM)

Configure static route to Null0 as discard route but summary too broad causing legitimate traffic to be dropped

**Diagnostic Symptoms:**
- Legitimate hosts within Null0 summary range unreachable
- Discard route absorbing traffic for valid destinations
- Aggregate route null0 causing false blackholing
- More specific routes not overriding Null0 as expected

**Troubleshooting Commands & Remediation:**
- `Null0 routes prevent routing loops for summarized prefixes`
- `Check 'show ip route null0' for all discard routes`
- `More specific routes override Null0 (longest prefix match)`
- `Ensure more specific routes exist for all active subnets`
- `Use 'show ip route <prefix>' to verify exact match`
- `Null0 route without component routes = black hole`

