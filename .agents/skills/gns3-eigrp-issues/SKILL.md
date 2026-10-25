---
name: "EIGRP Issues Injection"
description: "EIGRP protocol related network faults for troubleshooting practice"
category: "computer-networking"
---

# EIGRP Issues Injection

EIGRP protocol related network faults for troubleshooting practice

## Supported Protocols
- eigrp

## Fault Injection Scenarios & Troubleshooting Procedures

### EIGRP K-Value Mismatch (Severity: HIGH)

Configure mismatched EIGRP K-values (metrics weights) between neighbors

**Diagnostic Symptoms:**
- EIGRP neighbor adjacency fails
- K-value mismatch error messages
- No EIGRP routes exchanged

**Troubleshooting Commands & Remediation:**
- `Check EIGRP K-values with 'show ip protocols'`
- `K-values must match on all EIGRP neighbors`
- `Default K-values are K1=1, K3=1, others=0`
- `Ensure metric weights same across AS`
- `Use 'metric weights <tos> <k1> <k2> <k3> <k4> <k5>' to adjust`

### EIGRP Autonomous System Number Mismatch (Severity: HIGH)

Configure EIGRP with different AS numbers on neighboring routers

**Diagnostic Symptoms:**
- EIGRP neighbor adjacency fails to form
- No EIGRP routes exchanged
- Neighbors stuck in INIT state
- AS number mismatch errors in logs

**Troubleshooting Commands & Remediation:**
- `Check EIGRP AS number with 'show ip eigrp interfaces'`
- `Verify AS number matches on all routers in the same domain`
- `EIGRP AS number is specified in 'router eigrp <AS>'`
- `All routers in the same EIGRP domain must share the same AS`
- `Named mode EIGRP also requires matching AS number`

### EIGRP Passive Interface Blocking Neighbors (Severity: HIGH)

Configure passive-interface on EIGRP interface preventing neighbor discovery

**Diagnostic Symptoms:**
- EIGRP neighbor adjacency not forming on specific interface
- No EIGRP hellos sent on the interface
- Routes missing only on one segment
- Other interfaces form adjacencies normally

**Troubleshooting Commands & Remediation:**
- `Check EIGRP interfaces with 'show ip eigrp interfaces'`
- `Passive interfaces will not appear in EIGRP interface list`
- `Verify 'passive-interface default' if used`
- `Use 'no passive-interface <intf>' to allow adjacencies`
- `Check 'show run | section router eigrp' for passive statements`

### EIGRP Authentication Mismatch (Severity: HIGH)

Configure EIGRP MD5 authentication on one side but not the other, or use wrong key

**Diagnostic Symptoms:**
- EIGRP neighbor adjacency fails
- Authentication errors in logs
- EIGRP neighbors stuck in INIT state
- MD5 authentication failure messages

**Troubleshooting Commands & Remediation:**
- `Check EIGRP authentication with 'show ip eigrp interfaces detail'`
- `Verify key-chain configuration matches on both sides`
- `Use 'authentication mode md5 key-chain <key-name>'`
- `Key-chain key must match exactly (case-sensitive)`
- `Check for 'authentication failure' in debug logs`
- `Verify 'ip authentication key-chain' is configured`

### EIGRP Hello/Hold Timer Mismatch (Severity: MEDIUM)

Configure mismatched EIGRP hello or hold timers between neighbors, causing adjacency instability

**Diagnostic Symptoms:**
- EIGRP neighbor adjacency flaps intermittently
- Hold timer expired messages in logs
- Neighbor transitions up and down repeatedly
- Route flapping with EIGRP adjacency changes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip eigrp neighbor' for uptime and hold`
- `Default hello 5s, hold 15s (broadcast); 60s/180s (NBMA)`
- `Use 'ip hello-interval eigrp <as> <seconds>' to adjust`
- `Use 'ip hold-time eigrp <as> <seconds>' to adjust`
- `Hold timer should be >= 3x hello interval`
- `Hold timer mismatch less strict than OSPF`

### EIGRP Network Type Misconfiguration (Severity: HIGH)

Configure EIGRP on NBMA network without proper neighbor statements or network type mismatch

**Diagnostic Symptoms:**
- EIGRP neighbor not forming on NBMA interface
- Hellos not reaching all neighbors on multi-access network
- Partial mesh not exchanging routing information
- Split horizon blocking routes on NBMA

**Troubleshooting Commands & Remediation:**
- `EIGRP on NBMA may require manual neighbor definition`
- `Use 'neighbor <ip>' under router eigrp for static neighbors`
- `Frame Relay/ATM networks may need broadcast keyword on map-class`
- `Split horizon disabled automatically on some topologies`
- `Check 'show ip eigrp neighbors' for interface status`
- `Verify Layer 2 connectivity between EIGRP neighbors`

### EIGRP Split Horizon Blocking Route Updates (Severity: HIGH)

Configure EIGRP with split horizon enabled on hub-and-spoke network, preventing spoke-to-spoke route propagation

**Diagnostic Symptoms:**
- Routes learned from one spoke not propagated to other spokes
- Hub router has all routes but spokes have partial routes
- Spoke-to-spoke communication fails via hub
- Split horizon preventing route advertisement back to same interface

**Troubleshooting Commands & Remediation:**
- `Split horizon prevents advertising routes out of received interface`
- `Use 'no ip split-horizon eigrp <as>' on hub interface`
- `Verify 'show ip interface <intf>' for split horizon status`
- `Hub-and-spoke designs require split horizon disabled on hub`
- `Disabling split horizon may increase loop risk`
- `Alternative: use next-hop-self on hub`

### EIGRP Not Enabled on Interface (Severity: HIGH)

Configure interface with IP address but EIGRP not enabled, preventing neighbor formation on that interface

**Diagnostic Symptoms:**
- EIGRP not running on interface despite correct network statement
- Interface missing from 'show ip eigrp interfaces'
- No EIGRP hellos sent on interface
- Network not advertised to EIGRP neighbors

**Troubleshooting Commands & Remediation:**
- `Check 'show ip eigrp interfaces' - interface missing from list`
- `Verify 'network <network> [wildcard]' includes interface IP`
- `Check 'passive-interface default' may block the interface`
- `Use 'no passive-interface <intf>' to enable on interface`
- `Named mode: ensure address-family interface configuration`
- `Wildcard mask controls which interfaces participate`

### EIGRP Multicast-to-Unicast Transport Issue (Severity: HIGH)

Configure EIGRP with unicast neighbor relationship but neighbor not reachable, or multicast blocked by ACL

**Diagnostic Symptoms:**
- EIGRP neighbor fails to establish via multicast
- ACL blocking EIGRP multicast (224.0.0.10)
- Unicast neighbor definition missing for NBMA
- Hellos not exchanged via multicast

**Troubleshooting Commands & Remediation:**
- `EIGRP uses multicast 224.0.0.10 for dynamic neighbor discovery`
- `For NBMA, use 'neighbor <ip>' to define unicast peers`
- `Check ACLs for 'deny 224.0.0.10' blocking EIGRP multicast`
- `Verify 'show ip eigrp interfaces' for multicast status`
- `Unicast neighbor relationships require manual configuration`
- `Named mode supports unicast neighbor under AF interface`

### EIGRP Stuck in Active (SIA) (Severity: CRITICAL)

Create conditions causing EIGRP route to remain in Active state because replies from neighbors not received in time

**Diagnostic Symptoms:**
- EIGRP route stuck in Active state
- SIA error messages in logs
- EIGRP neighbor reset when SIA-query/SIA-reply fails
- Routing table entries missing or incomplete

**Troubleshooting Commands & Remediation:**
- `Check 'show ip eigrp topology active' for stuck routes`
- `Default SIA timeout is 180 seconds (3 minutes)`
- `Common causes: congested links, high CPU, large network`
- `Use 'timers active-time <minutes>' to adjust SIA timer`
- `SIA query/reply mechanism prevents indefinite active state`
- `Check for packet drops between querier and neighbor`

### EIGRP Feasible Successor Condition Violation (Severity: MEDIUM)

Configure routing policy causing feasible successor condition (FD < RD) to be violated, preventing fast convergence

**Diagnostic Symptoms:**
- EIGRP route must go Active on successor loss (no feasible successor)
- Slow convergence after link failure
- DUAL query process triggered unnecessarily
- Feasible successor exists but condition not met

**Troubleshooting Commands & Remediation:**
- `Feasible successor: RD < current FD of successor`
- `Check 'show ip eigrp topology <prefix>' for FS candidates`
- `Use 'metric offsets' carefully - can break FS condition`
- `Increasing metric on successor route may disqualify FS`
- `Variance and offset-list can affect FS computation`
- `Fast convergence depends on having at least one FS`

### EIGRP Active Route Flapping (Severity: HIGH)

Configure network with route that continuously goes Active/Passive, causing routing instability

**Diagnostic Symptoms:**
- Route continuously transitions between Active/Passive
- Routing table entry appearing and disappearing
- Network-wide route oscillations
- EIGRP query process repeatedly triggered

**Troubleshooting Commands & Remediation:**
- `Check 'show ip eigrp topology active' for flapping routes`
- `Route flapping caused by unstable link or interface`
- `Check interface stability with 'show interface'`
- `Use 'show ip eigrp events' to see route history`
- `Implement route dampening if supported`
- `Feasible successors can mitigate flapping impact`

### EIGRP Query Scope Limitation (Severity: MEDIUM)

Configure network where EIGRP queries propagate too far, causing excessive convergence time and CPU usage

**Diagnostic Symptoms:**
- EIGRP convergence takes excessive time
- High CPU usage during route recomputation
- Queries propagate across entire EIGRP domain
- SIA on multiple routes simultaneously

**Troubleshooting Commands & Remediation:**
- `EIGRP queries propagate until they reach a neighbor with FS`
- `Use stub routers to limit query propagation`
- `'show ip eigrp topology active' shows query originator`
- `Stub routers immediately reply for all queries`
- `Query scoping: use stub configuration at distribution layer`
- `Leak-map on stub only allows selective route leaking`

### EIGRP Offset-List Metric Manipulation Error (Severity: MEDIUM)

Configure EIGRP offset-list incorrectly, increasing metric for routes unintentionally or filtering routes unexpectedly

**Diagnostic Symptoms:**
- Specific routes have unexpectedly higher metric
- Offset-list adding metric to unintended routes
- Route selection changes unexpectedly
- Access list in offset-list matching wrong prefixes

**Troubleshooting Commands & Remediation:**
- `Offset-list adds to composite metric (not just delay/bandwidth)`
- `Use 'offset-list <acl> {in|out} <offset> [interface]'`
- `Check ACL entries match intended prefixes only`
- `Offset applied on both incoming and outgoing updates`
- `High offset values can prevent routes from being selected`
- `Use 'show ip eigrp topology <prefix>' to verify metric changes`

### EIGRP Interface Bandwidth/Delay Misconfiguration (Severity: MEDIUM)

Configure incorrect interface bandwidth or delay values, causing suboptimal EIGRP metric calculation

**Diagnostic Symptoms:**
- EIGRP prefers suboptimal path
- High-bandwidth link not preferred over low-bandwidth link
- Traffic engineering not working as expected
- EIGRP composite metric reflects incorrect values

**Troubleshooting Commands & Remediation:**
- `EIGRP metric = bandwidth + delay (default K1=1, K3=1)`
- `Bandwidth: 10^7 / min_bandwidth * 256`
- `Delay: sum(delays) / 10 * 256`
- `Use 'bandwidth <kbps>' and 'delay <tens-of-microseconds>'`
- `Check 'show interface <intf>' for configured bandwidth`
- `Delay is more reliable for metric tuning (affects one direction)`

### EIGRP Variance for Unequal Cost Load Balancing (Severity: MEDIUM)

Configure EIGRP variance incorrectly, preventing or misapplying unequal cost load balancing

**Diagnostic Symptoms:**
- Unequal cost paths not used for load balancing
- Variance set but no additional paths installed in routing table
- Load balancing across paths with excessive metric difference
- Traffic distribution not proportional to metrics

**Troubleshooting Commands & Remediation:**
- `Variance <multiplier>: install routes with metric <= best*multiplier`
- `Feasible successor condition must still be met`
- `Check 'show ip eigrp topology <prefix>' for FS candidates`
- `Use 'traffic-share balanced' or 'traffic-share min across-interfaces'`
- `Default variance is 1 (equal-cost load balancing only)`
- `Variance does not affect which path is primary`

### EIGRP Maximum Paths Limitation (Severity: MEDIUM)

Configure EIGRP maximum-paths too low, preventing optimal use of multiple equal-cost paths

**Diagnostic Symptoms:**
- Only one path installed despite multiple equal-cost paths
- Load balancing not using all available paths
- Suboptimal bandwidth utilization
- 'maximum-paths' or 'maximum-paths eigrp' limit reached

**Troubleshooting Commands & Remediation:**
- `Check 'show ip route <prefix>' for number of paths`
- `Default maximum-paths depends on platform (4, 6, 8, 16)`
- `Use 'maximum-paths <number>' for IP routing table`
- `Cisco: 'maximum-paths <num>' or 'maximum-paths eigrp <num>'`
- `More paths provide better load distribution`
- `FS condition must be met for each additional path`

### EIGRP Route Summarization Error (Severity: HIGH)

Configure EIGRP summary route incorrectly, causing black holes or missing specific routes

**Diagnostic Symptoms:**
- Traffic black holes for subnets within summary
- Summary route not advertised to neighbors
- Specific routes suppressed when not intended
- Metric of summary route incorrect

**Troubleshooting Commands & Remediation:**
- `Use 'ip summary-address eigrp <as> <network> <mask>'`
- `EIGRP creates a null0 route for the summary`
- `Summary suppresses more specific routes to neighbors`
- `If all specifics are down, traffic black-holes to null0`
- `Advertise default: 'ip summary-address eigrp <as> 0.0.0.0 0.0.0.0'`
- `Check 'show ip eigrp topology' for summary entries`

### EIGRP Distribute-List Blocking Route Exchange (Severity: HIGH)

Configure distribute-list under EIGRP that inadvertently filters legitimate routes in or out

**Diagnostic Symptoms:**
- Specific routes not received from or sent to EIGRP neighbors
- Partial routing table missing expected prefixes
- Distribute-list ACL/prefix-list matching wrong prefixes
- Implicit deny at end of access-list blocking some routes

**Troubleshooting Commands & Remediation:**
- `Use 'distribute-list <acl> in' or 'distribute-list <acl> out'`
- `ACLs have implicit deny any at the end`
- `Prefix-list more flexible than ACL for distribute-list`
- `Check 'show ip eigrp topology' for missing entries`
- `Use 'distribute-list prefix <name> in/out' for prefix-list`
- `Verify distribute-list applied to correct interface or protocol`

### EIGRP Route-Map Filtering Error (Severity: HIGH)

Configure route-map filtering under EIGRP redistribution or neighbor, causing routes to be filtered or modified incorrectly

**Diagnostic Symptoms:**
- Routes filtered or modified unexpectedly by route-map
- Route-map match conditions not matching intended routes
- Redistributed routes missing specified metric values
- Route-map sequence order causing unintended matches

**Troubleshooting Commands & Remediation:**
- `Route-maps have implicit deny (no match = denied)`
- `Check 'show route-map <name>' for match counters`
- `Route-map sequence number order: lower = higher priority`
- `Verify 'match ip address' ACL/prefix-list references`
- `Use 'set metric <bandwidth> <delay> <reliability> <load> <mtu>'`
- `Tag routes with 'set tag <value>' for policy tracking`

### EIGRP Default Route Distribution Error (Severity: HIGH)

Configure EIGRP default route incorrectly, preventing default route propagation or creating routing loops

**Diagnostic Symptoms:**
- Default route missing from EIGRP domain
- No gateway of last resort in routing table
- Default route not advertised by border router
- Traffic to external networks black-holed

**Troubleshooting Commands & Remediation:**
- `Use 'ip default-network <network>' for EIGRP default`
- `EIGRP propagates default via the default-network concept`
- `Alternative: 'redistribute static' with static default route`
- `Use 'ip route 0.0.0.0 0.0.0.0 <next-hop>' on border router`
- `Check 'show ip route' for 'Gateway of last resort'`
- `Verify border router is reachable from other EIGRP routers`

### EIGRP Route Redistribution Error (Severity: HIGH)

Configure redistribution from other protocols into EIGRP with incorrect metric or missing parameters

**Diagnostic Symptoms:**
- Redistributed routes not appearing in EIGRP topology
- Routes redistributed with incorrect metric
- Redistribution creating routing loops or suboptimal paths
- Missing 'subnets' or metric specification in redistribution

**Troubleshooting Commands & Remediation:**
- `EIGRP requires explicit metric for redistributed routes`
- `Use 'redistribute <protocol> metric <bw> <delay> <rel> <load> <mtu>'`
- `Or set 'default-metric <bw> <delay> <rel> <load> <mtu>'`
- `Use route-map to filter redistributed routes`
- `Check administrative distance of redistributed routes`
- `Verify 'show ip eigrp topology' for redistributed entries`

### EIGRP Stub Router Misconfiguration (Severity: HIGH)

Configure EIGRP stub router incorrectly (wrong stub type or leak-map), causing incomplete routing or query issues

**Diagnostic Symptoms:**
- Stub router not receiving complete routing table
- Stub connected/static/summary routes not advertised
- Leak-map not releasing specific routes to stub
- Stub router not responding to queries (assumed disconnected)

**Troubleshooting Commands & Remediation:**
- `Use 'eigrp stub [connected|static|summary|receive-only|leak-map]'`
- `Stub types: connected, static, summary, redistributed`
- `'receive-only' - stub only receives, never advertises`
- `Queries not sent to stub routers (they reply immediately)`
- `Check 'show ip eigrp neighbor detail' for stub status`
- `Leak-map allows selective route leaking beyond stub type`

### EIGRP Leak-Map Misconfiguration (Severity: MEDIUM)

Configure EIGRP leak-map incorrectly on stub router, preventing intended routes from being advertised or leaking unintended routes

**Diagnostic Symptoms:**
- Leak-map not releasing specific routes from stub
- Unintended routes leaked from stub router
- Stub type combined with leak-map not working as expected
- Specific routes missing from stub router neighbor

**Troubleshooting Commands & Remediation:**
- `Leak-map allows stub to advertise additional routes`
- `Use 'eigrp stub leak-map <name>' under AF or router config`
- `Leak-map uses route-map to match prefixes to leak`
- `Check 'show ip eigrp neighbor detail' for leak-map status`
- `Leak-map only works with stub configured`
- `Careful: leak-map can defeat query-scoping purpose of stub`

### EIGRP Receive-Only Stub Blocking Route Advertisement (Severity: HIGH)

Configure EIGRP stub as receive-only but router needs to advertise connected routes or local networks

**Diagnostic Symptoms:**
- Stub router cannot advertise any routes to hub
- Connected networks behind stub not reachable from hub
- Receive-only stub silently drops all outgoing updates
- Routes from stub router missing in EIGRP domain

**Troubleshooting Commands & Remediation:**
- `Receive-only stub: cannot advertise any routes`
- `Use 'eigrp stub connected' instead to advertise connected routes`
- `'receive-only' is useful for pure leaf routers`
- `Check 'show ip eigrp neighbor detail' for stub type`
- `Change stub type if router needs to advertise local networks`
- `Common in hub-and-spoke where spoke has no downstream routers`

### EIGRP Named Mode Configuration Error (Severity: HIGH)

Configure EIGRP in named mode with incorrect address-family or AF-interface parameters, preventing proper operation

**Diagnostic Symptoms:**
- EIGRP named mode not functioning as expected
- Address-family configuration mismatch
- Named mode commands not recognized
- Transition from classic to named mode causes issues

**Troubleshooting Commands & Remediation:**
- `Named mode: 'router eigrp <name>' with address-family ipv4`
- `Named mode supports IPv4 and IPv6 in same process`
- `Use 'address-family ipv4 autonomous-system <as>'`
- `AF-interface mode: 'af-interface <intf>' for interface config`
- `Named mode has different configuration hierarchy`
- `Check 'show ip eigrp [vrf <name>] interfaces' for status`

### EIGRP Address-Family Interface Configuration Error (Severity: MEDIUM)

Configure EIGRP AF-interface parameters incorrectly, causing per-interface EIGRP settings to not apply

**Diagnostic Symptoms:**
- AF-interface settings not taking effect on interface
- Interface-specific EIGRP parameters not applied
- Named mode interface configuration hierarchy confusion
- Shutdown under AF-interface blocking EIGRP on interface

**Troubleshooting Commands & Remediation:**
- `AF-interface: 'af-interface <intf>' under address-family`
- `Use 'af-interface default' for default interface settings`
- `Parameters set in AF-interface affect that interface only`
- `Use 'shutdown' under AF-interface to disable EIGRP on that intf`
- `AF-interface overrides interface-level EIGRP config`
- `Named mode: EIGRP parameters moved to AF-interface`

### EIGRP TTL Threshold / GTSM Misconfiguration (Severity: HIGH)

Configure EIGRP TTL threshold (Generalized TTL Security Mechanism) preventing legitimate neighbors from forming adjacency

**Diagnostic Symptoms:**
- EIGRP neighbor fails to form with TTL threshold configured
- Neighbor not directly connected (more than 1 hop away)
- EIGRP packets dropped due to TTL check
- Adjacency only works when TTL threshold removed

**Troubleshooting Commands & Remediation:**
- `GTSM: 'ip ttl-threshold eigrp <as> <ttl-value>'`
- `Default EIGRP TTL is 1 (directly connected only)`
- `Set TTL to 255 or appropriate value for multi-hop`
- `Check 'show ip eigrp neighbor' for adjacency status`
- `GTSM protects against off-link EIGRP attacks`
- `Not supported in all EIGRP implementations`

### EIGRP Key-Chain Rollover / Key Management Issue (Severity: MEDIUM)

Configure EIGRP key-chain with overlapping key times or incorrect key management, causing authentication failures

**Diagnostic Symptoms:**
- EIGRP authentication fails during key rollover
- Key valid-time windows not aligned between neighbors
- New key activated but neighbor still using old key
- Brief authentication failures during key transition

**Troubleshooting Commands & Remediation:**
- `Key-chain supports multiple keys with send/accept lifetimes`
- `Ensure send-lifetime and accept-lifetime overlap between peers`
- `Use 'accept-lifetime' to accept old key during transition`
- `Use 'send-lifetime' to start new key after old key expires`
- `Key-ID higher = preferred for sending (Cisco)`
- `Verify clock synchronization (NTP) for time-based keys`

### EIGRPv6 Process Configuration Error (Severity: HIGH)

Configure EIGRP for IPv6 (EIGRPv6) incorrectly with wrong process ID or router-id, preventing IPv6 route exchange

**Diagnostic Symptoms:**
- EIGRPv6 process not starting
- No EIGRPv6 neighbor adjacency
- IPv6 routes not exchanged
- EIGRPv6 requires explicit router-id

**Troubleshooting Commands & Remediation:**
- `EIGRPv6: 'ipv6 router eigrp <as>'`
- `EIGRPv6 requires explicit 'eigrp router-id <ipv4>'`
- `Named mode: 'address-family ipv6' under router eigrp`
- `Enable on interface: 'ipv6 eigrp <as>'`
- `Check 'show ipv6 eigrp neighbors' for adjacency`
- `EIGRPv6 does not require global IPv6 on interface`

### EIGRPv6 Interface Not Enabled (Severity: HIGH)

Configure IPv6 on interface but fail to enable EIGRPv6, preventing IPv6 neighbor formation and route exchange

**Diagnostic Symptoms:**
- EIGRPv6 not running on interface with IPv6 enabled
- No EIGRPv6 hellos sent on the interface
- IPv6 routes missing from EIGRP domain
- Interface not listed in EIGRPv6 interfaces

**Troubleshooting Commands & Remediation:**
- `Use 'ipv6 eigrp <as>' under interface to enable`
- `Check 'show ipv6 eigrp interfaces' for enabled interfaces`
- `EIGRPv6 requires 'ipv6 unicast-routing' globally`
- `Verify link-local address present on interface`
- `Named mode: 'af-interface <intf>' then 'no shutdown'`
- `Passive interface affects EIGRPv6 same as EIGRPv4`

### EIGRPv6 Named Mode Address-Family Not Activated (Severity: HIGH)

Configure EIGRPv6 in named mode but address-family IPv6 not no-shutdown

**Diagnostic Symptoms:**
- EIGRPv6 process not starting in named mode
- Address-family IPv6 shows administratively down
- EIGRPv6 neighbors not forming
- Named mode requires explicit AF no shutdown

### EIGRPv6 Route Redistribution / External Route Issue (Severity: HIGH)

Configure redistribution into EIGRPv6 with missing metric or route-map

**Diagnostic Symptoms:**
- Redistributed IPv6 routes not appearing in EIGRPv6 topology
- Missing metric for redistributed routes
- Redistribution route-map not matching expected IPv6 prefixes
- Static IPv6 routes not redistributed

