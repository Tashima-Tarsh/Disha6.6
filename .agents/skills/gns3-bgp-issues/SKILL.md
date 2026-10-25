---
name: "BGP Issues Injection"
description: "BGP protocol related network faults for troubleshooting practice"
category: "computer-networking"
---

# BGP Issues Injection

BGP protocol related network faults for troubleshooting practice

## Supported Protocols
- bgp
- ebgp
- ibgp

## Fault Injection Scenarios & Troubleshooting Procedures

### BGP Peer Configuration Error (Severity: HIGH)

Configure BGP with wrong peer IP, AS number mismatch, or wrong password

**Diagnostic Symptoms:**
- BGP peer session not established
- BGP stuck in ACTIVE or IDLE state
- No routes received from peer
- AS number mismatch errors

**Troubleshooting Commands & Remediation:**
- `Check BGP summary with 'show ip bgp summary'`
- `Verify peer IP address is correct`
- `Ensure remote AS number matches neighbor's actual AS`
- `Check TCP connectivity to peer (port 179)`
- `Look for 'bad peer AS' or 'connection refused' errors`
- `Verify BGP passwords match if authentication used`

### BGP Next Hop Unreachable (Severity: HIGH)

BGP routes with next-hop addresses that are not reachable via IGP or static routes

**Diagnostic Symptoms:**
- BGP routes in table but not installed in RIB
- Routes show as 'not best path' or 'invalid'
- Packet forwarding fails despite routes present

**Troubleshooting Commands & Remediation:**
- `Check BGP table for 'next hop not reachable' status`
- `Verify IGP has route to BGP next hop`
- `Consider using 'next-hop-self' on route reflector`
- `Check next-hop processing in BGP updates`
- `Ensure IGP redistribution or next-hop-self configured`

### BGP Route Reflector Misconfiguration (Severity: HIGH)

Configure route reflector with incorrect client or cluster-id settings causing routing issues

**Diagnostic Symptoms:**
- iBGP routes not reflected to other route reflector clients
- Routing information missing within iBGP cluster
- Route looping within iBGP due to incorrect cluster-id
- Suboptimal routing within AS

**Troubleshooting Commands & Remediation:**
- `Check route reflector status with 'show ip bgp neighbor <ip>'`
- `Verify neighbor is configured as route-reflector-client`
- `Check cluster-id if multiple route reflectors in same cluster`
- `Route reflector does not modify next-hop by default`
- `Use 'next-hop-self' if needed for route reflector`
- `Ensure iBGP full mesh is not required with route reflection`
- `Redundant route reflectors should share same cluster-id`

### BGP Update Source Misconfiguration (Severity: HIGH)

Configure BGP session with wrong update-source interface causing TCP connection failures

**Diagnostic Symptoms:**
- BGP TCP connection fails to establish
- BGP stuck in ACTIVE or IDLE state
- Neighbor IP not reachable from wrong source interface
- Session flaps when interface goes down

**Troubleshooting Commands & Remediation:**
- `Check BGP neighbor update-source with 'show run | section bgp'`
- `Verify source interface IP matches neighbor's expected peer IP`
- `Use 'ping <neighbor-ip> source <intf>' to test connectivity`
- `iBGP typically uses loopback interface as update-source`
- `Ensure source interface is always up (use loopback)`
- `Check routing to neighbor from the configured source`

### BGP TTL Security Check Mismatch (Severity: HIGH)

Configure BGP TTL security check on one side but not the other

**Diagnostic Symptoms:**
- eBGP peer session fails to establish
- BGP stuck in IDLE state
- TCP connection issues between peers
- Session works when directly connected but not over multiple hops

**Troubleshooting Commands & Remediation:**
- `Check BGP neighbor TTL security with 'show ip bgp neighbor'`
- `Verify 'ebgp-multihop' is configured if peers are not directly connected`
- `TTL security expects incoming TTL of 255 by default`
- `'ttl-security hops <count>' sets minimum expected TTL`
- `TTL security and ebgp-multihop are mutually exclusive`
- `Default eBGP TTL is 1 (directly connected only)`

### BGP Hold Timer Mismatch (Severity: MEDIUM)

Configure different BGP hold timers on peers, causing session to reset to lower value or repeatedly flap

**Diagnostic Symptoms:**
- BGP session establishes but resets periodically
- Hold time expires prematurely on one side
- BGP session flapping with keepalive failures
- 'Hold timer expired' error messages

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor' for negotiated hold timer`
- `BGP negotiates to the lower of the two hold timers`
- `Default hold timer is 180 seconds (3 minutes)`
- `Use 'timers bgp <keepalive> <hold>' to adjust`
- `Keepalive timer should be 1/3 of hold timer (default: 60s)`
- `Holding time of 0 means no keepalives sent`

### BGP TCP MSS / Path MTU Issue (Severity: MEDIUM)

Configure BGP over a network path with PMTUD issues or TCP MSS clamping problems, causing session to stall or fail

**Diagnostic Symptoms:**
- BGP session establishes but fails to exchange UPDATE messages
- TCP connection appears established but no routes received
- BGP UPDATE messages never complete
- Larger UPDATE messages consistently fail

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor' for TCP connection state`
- `Verify path MTU between peers with ping don't-fragment`
- `Common with GRE tunnels, IPsec, or MPLS transport`
- `Configure 'ip tcp mss' or adjust MTU on interfaces`
- `TCP MSS = interface MTU - 40 (IP+TCP headers)`
- `Check for fragmentation issues in transit network`

### BGP Passive Mode Misconfiguration (Severity: HIGH)

Configure BGP peer in passive mode on both sides, preventing TCP connection initiation

**Diagnostic Symptoms:**
- BGP session never establishes
- Both sides waiting for incoming connection
- BGP stuck in IDLE or ACTIVE state
- No TCP connection attempt on port 179

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor' for connection state`
- `Passive mode means router does not initiate TCP connection`
- `At least one side must not be passive to establish session`
- `Use 'neighbor <ip> passive' command`
- `Default is active mode (both sides initiate)`
- `Passive mode useful for single-sided configuration`

### BGP Session Flapping (Severity: HIGH)

Create conditions causing BGP session to repeatedly go up and down due to interface flapping, route changes, or configuration changes

**Diagnostic Symptoms:**
- BGP session goes up and down repeatedly
- Routes constantly withdrawn and readvertised
- Network-wide route instability
- High CPU usage due to route processing

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor' for session uptime and reset counts`
- `Look for 'BGP notification sent/received' in logs`
- `Check interface stability with 'show interface'`
- `Verify update-source interface is stable (use loopback)`
- `Implement route dampening to suppress flapping prefixes`
- `Check for error messages indicating reset cause`

### BGP Network Advertisement Missing (Severity: HIGH)

Fail to configure 'network' statement under BGP for routes that should be advertised, causing networks to not be announced to peers

**Diagnostic Symptoms:**
- Specific networks not advertised to BGP peers
- Routes present in routing table but not in BGP
- Missing prefixes in BGP table
- Remote peers cannot reach the missing networks

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp' for missing prefixes`
- `Verify 'network <network> mask <mask>' under BGP configuration`
- `Network statement requires exact route match in routing table`
- `Use 'show ip route <network>' to verify route exists`
- `For connected routes, ensure they exist before network statement`
- `Use 'network <network> mask <mask>' format for classless networks`

### BGP Prefix List / Distribute List Filtering Routes (Severity: HIGH)

Configure prefix-list or distribute-list that inadvertently blocks legitimate prefixes from being advertised or received

**Diagnostic Symptoms:**
- Specific routes not sent to or received from neighbor
- Partial routing table received from peer
- Some prefixes missing from BGP table
- Implicit deny at end of prefix-list blocking unexpected prefixes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor <ip> prefix-list' for filters`
- `Verify 'neighbor <ip> prefix-list <name> (in|out)' commands`
- `Check 'distribute-list' under BGP configuration`
- `Prefix-lists have implicit deny at the end`
- `Use 'show ip prefix-list <name>' to verify entries`
- `Add 'permit any' at end for testing purposes (not recommended in production)`

### BGP Route-Map Filtering Error (Severity: HIGH)

Configure route-map with incorrect match or set conditions, causing routes to be filtered or modified incorrectly

**Diagnostic Symptoms:**
- Routes filtered unexpectedly or modified with wrong attributes
- Route-map conditions not matching as intended
- Routes not matching any permit statement
- Set actions not applied to matched routes

**Troubleshooting Commands & Remediation:**
- `Check 'show route-map <name>' for match counts`
- `Verify sequence numbers order (lower = higher priority)`
- `Use 'show ip bgp route <prefix>' to check applied policies`
- `Route-maps have implicit deny if no match`
- `Check for 'match ip address' referencing wrong ACL/prefix-list`
- `Verify 'set' commands in each sequence produce expected results`

### BGP Route Aggregation / Summarization Issue (Severity: MEDIUM)

Configure BGP aggregation incorrectly, causing black holes or missing more specific routes

**Diagnostic Symptoms:**
- Aggregate route advertised but more specific routes missing
- Traffic black holes for subnets within aggregate
- Summary route not generated despite component routes
- Atoms (suppressed routes) not visible to peers

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp summary' for aggregate routes`
- `Use 'aggregate-address <network> <mask> summary-only' to suppress specifics`
- `Use 'aggregate-address <network> <mask> as-set' to maintain AS path info`
- `Use 'aggregate-address <network> <mask> attribute-map' to set attributes`
- `Verify component routes exist before aggregate is generated`
- `Use 'show ip bgp <prefix>' to see if route is suppressed`

### BGP Conditional Advertisement Failure (Severity: HIGH)

Configure BGP conditional advertisement with incorrect exist-map or non-exist-map, causing prefixes to not be advertised when expected

**Diagnostic Symptoms:**
- Backup prefixes not advertised when primary fails
- Conditional prefixes never advertised
- Primary/backup failover not working
- Prefixes advertised even when condition says they shouldn't

**Troubleshooting Commands & Remediation:**
- `Check 'neighbor <ip> advertise-map <name> exist-map <name>' configuration`
- `Verify exist-map routes are present in routing table`
- `Non-exist-map triggers advertisement when route disappears`
- `Use 'show ip bgp neighbor <ip>' to check advertise status`
- `Ensure advertise-map prefixes exist in BGP table`
- `Check prefix-lists and route-maps referenced in conditional config`

### BGP MED Misconfiguration (Severity: MEDIUM)

Configure incorrect BGP Multi-Exit Discriminator (MED) values, causing suboptimal inbound traffic flow

**Diagnostic Symptoms:**
- Inbound traffic enters through non-optimal ingress point
- Uneven traffic distribution across multiple peering points
- Traffic engineering not working as intended
- MED comparison not happening (different AS)

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for MED value`
- `MED is a hint to remote AS about preferred entry point`
- `Lower MED value is preferred`
- `MED is compared only when paths come from same neighboring AS`
- `Use 'bgp always-compare-med' to compare MED from different ASes`
- `Set MED with 'set metric <value>' in route-map`

### BGP Local Preference Misconfiguration (Severity: HIGH)

Configure incorrect local preference values, causing suboptimal outbound traffic path selection

**Diagnostic Symptoms:**
- Outbound traffic exits through non-optimal edge router
- Unexpected path selection for external destinations
- Local preference changes not propagating across iBGP
- Lower local preference path preferred over higher

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for local preference`
- `Higher local preference is preferred for outbound traffic`
- `Default local preference is 100`
- `Set with 'bgp default local-preference <value>' under BGP process`
- `Override with 'set local-preference <value>' in inbound route-map`
- `Local preference is exchanged within AS only (not sent to eBGP)`

### BGP AS Path Prepending Not Working (Severity: MEDIUM)

Configure AS path prepending incorrectly, failing to influence outbound path selection from remote AS

**Diagnostic Symptoms:**
- AS path prepending not affecting inbound traffic path
- Remote AS still prefers path despite longer AS path
- Incorrect AS prepended (private AS leaked)
- AS path prepending not present in BGP updates

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for prepended AS numbers`
- `Use 'set as-path prepend <asn>' in outbound route-map`
- `Prepend router's own AS (or neighbor AS if configured)`
- `AS path prepending is least preferred path selection`
- `Other attributes (MED, local pref) can override longer AS path`
- `Check for 'remove-private-as' stripping prepended private AS`

### BGP Weight Misconfiguration (Cisco) (Severity: MEDIUM)

Configure incorrect BGP weight values, causing unexpected path selection for specific routes

**Diagnostic Symptoms:**
- Unexpected path selected for specific routes
- Weight override causing other path selection attributes ignored
- Traffic forwarding mismatch between routers
- Weight changes not affecting route selection as expected

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for weight value`
- `Weight is Cisco-proprietary, highest weight is preferred`
- `Default weight is 0 (locally generated routes: 32768)`
- `Set weight per neighbor: 'neighbor <ip> weight <value>'`
- `Override with 'set weight <value>' in inbound route-map`
- `Weight is local to the router, not advertised to peers`

### BGP Multipath / Load Balancing Configuration Error (Severity: MEDIUM)

Configure BGP multipath incorrectly, preventing equal-cost load balancing across multiple paths

**Diagnostic Symptoms:**
- Multiple BGP paths available but not used for load balancing
- Only one path installed in routing table
- Uneven traffic distribution
- Multipath not working despite multiple equal paths

**Troubleshooting Commands & Remediation:**
- `Check 'maximum-paths <number>' under BGP configuration`
- `For eBGP: paths must have same AS path length (usually)`
- `For iBGP: paths must have same IGP metric to next-hop`
- `Use 'maximum-paths ibgp <number>' for iBGP multipath`
- `Use 'bgp bestpath as-path multipath-relax' for different AS paths`
- `Verify all path selection attributes are equal for multipath`

### BGP Route Reflector Cluster-ID Conflict (Severity: HIGH)

Configure multiple route reflectors with different cluster-IDs in same cluster, causing route looping and suboptimal routing

**Diagnostic Symptoms:**
- Route looping within iBGP cluster
- Redundant route reflectors not working together
- Routes reflected back to clients incorrectly
- ORF (Originator ID) causing route rejection

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp' for cluster-list attribute`
- `Redundant route reflectors in same cluster must share cluster-id`
- `Use 'bgp cluster-id <id>' to set cluster-id`
- `Cluster-id prevents route looping between reflectors`
- `Multiple clusters in same AS should have unique cluster-ids`
- `Check 'show ip bgp neighbor' for route-reflector-client status`

### BGP Confederation Misconfiguration (Severity: CRITICAL)

Configure BGP confederation with incorrect AS numbers or peer mappings, breaking inter-sub-AS routing

**Diagnostic Symptoms:**
- Inter-sub-AS BGP sessions not establishing
- Confederation AS numbers not matching
- Routes not propagating between sub-ASes
- Next-hop issues across confederation boundaries

**Troubleshooting Commands & Remediation:**
- `Check 'bgp confederation identifier <asn>' for parent AS`
- `Verify 'bgp confederation peers <asns>' lists all sub-ASes`
- `Confederation AS numbers are local to the parent AS`
- `eBGP-like behavior within confederation (LP preserved)`
- `Next-hop-self not automatic in confederation peers`
- `Confederation routes treated as internal (not eBGP) for path selection`

### iBGP Full Mesh Missing (Without Route Reflection) (Severity: HIGH)

Fail to establish iBGP sessions between all routers in AS without route reflection, causing incomplete route propagation

**Diagnostic Symptoms:**
- BGP routes from one iBGP router not reaching another
- Routes learned from iBGP peer not advertised to other iBGP peers
- Partial routing information within AS
- iBGP split-horizon rule blocking route propagation

**Troubleshooting Commands & Remediation:**
- `iBGP requires full mesh (all routers peer with each other)`
- `iBGP learned routes are NOT advertised to other iBGP peers by default`
- `Use route reflectors or confederation to avoid full mesh`
- `Check 'show ip bgp summary' for missing iBGP sessions`
- `N*(N-1)/2 sessions required for full mesh`
- `Alternative: configure route reflector or confederation`

### BGP Route Dampening Misconfiguration (Severity: MEDIUM)

Configure BGP route dampening with overly aggressive parameters, causing stable routes to be suppressed

**Diagnostic Symptoms:**
- Stable routes suppressed (history state)
- Routes not advertised despite being stable
- Slow convergence after flap dampening
- Routes remain in 'dampened' state indefinitely

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp dampened-paths' for suppressed routes`
- `Verify dampening parameters: 'bgp dampening <half-life> <reuse> <suppress> <max-suppress>'`
- `Default half-life: 15 minutes`
- `Default suppress threshold: 2000`
- `Default reuse threshold: 750`
- `Use 'show ip bgp flap-statistics' to see flap history`

### BGP Next-Hop-Self Not Configured for iBGP (Severity: HIGH)

Fail to configure next-hop-self on route reflector or iBGP peers, causing next-hop unreachable for iBGP learned routes

**Diagnostic Symptoms:**
- Routes in BGP table but not usable (next-hop unreachable)
- iBGP routes showing 'next hop not reachable'
- Routes not installed in routing table
- Forwarding fails for iBGP learned prefixes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for next-hop status`
- `Use 'neighbor <ip> next-hop-self' to force router's own IP as next-hop`
- `Common when eBGP next-hop is not reachable via IGP`
- `Route reflector does not modify next-hop by default`
- `Check if eBGP next-hop is reachable in IGP before configuring`
- `Alternatively, redistribute eBGP next-hop routes into IGP`

### eBGP Multihop Configuration Missing (Severity: HIGH)

Fail to configure ebgp-multihop when eBGP peers are not directly connected, preventing session establishment

**Diagnostic Symptoms:**
- eBGP session fails over non-directly connected links
- BGP stuck in IDLE state
- TTL of 1 not sufficient to reach peer
- Session works only over directly connected interface

**Troubleshooting Commands & Remediation:**
- `Default eBGP TTL is 1 (directly connected only)`
- `Use 'neighbor <ip> ebgp-multihop <hop-count>' to increase TTL`
- `Must also configure 'neighbor <ip> update-source <intf>'`
- `Set hop-count to at least actual number of hops`
- `Use ping with increasing TTL (traceroute) to verify path`
- `TTL security and ebgp-multihop are mutually exclusive`

### BGP Allowas-In Misconfiguration (Severity: MEDIUM)

Configure allowas-in incorrectly, causing AS path loop prevention to block legitimate routes or allowing loops

**Diagnostic Symptoms:**
- BGP rejects prefixes with own AS in AS path
- Legitimate routes (from same AS) not accepted
- AS path loop prevention blocking intended routes
- Need to accept prefixes containing own AS

**Troubleshooting Commands & Remediation:**
- `By default, BGP rejects updates containing own AS in AS_PATH`
- `Use 'neighbor <ip> allowas-in <count>' to accept n occurrences of own AS`
- `Use 'neighbor <ip> allowas-in 1' to accept one occurrence`
- `Common in MPLS L3VPN or multi-homed scenarios`
- `Alternative: use 'neighbor <ip> disable-connected-check'`
- `Warning: allowas-in can create routing loops if misused`

### BGP AS Path Loop / AS Number Leak (Severity: CRITICAL)

Misconfigure route leaking between ASes causing AS path prepend loops or private AS numbers visible to internet

**Diagnostic Symptoms:**
- Prefixes with own AS in path not accepted
- Private AS numbers (64512-65535) visible to internet peers
- AS path growing unboundedly
- Route flapping due to AS path loop detection

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for AS path contents`
- `Use 'remove-private-as' on eBGP outbound to strip private ASes`
- `ACLs or prefix-lists should filter private AS ranges (RFC 6996)`
- `Ensure no route redistribution creates AS path loops`
- `Use as-set with aggregate-address to avoid path hiding`
- `BGP loop prevention: router rejects routes with own AS in path`

### BGP Maximum Prefix Limit Exceeded (Severity: HIGH)

Configure BGP max-prefix limit too low, causing session to be torn down when legitimate prefixes exceed limit

**Diagnostic Symptoms:**
- BGP session goes down unexpectedly
- Message: 'maximum prefix limit exceeded'
- BGP session in IDLE state (not trying to re-establish)
- All routes from peer lost after session reset

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor <ip>' for prefix counts`
- `Default max-prefix limit: none (unless configured)`
- `Use 'neighbor <ip> maximum-prefix <max> <threshold>'`
- `When limit exceeded: session teardown, optional restart timer`
- `Use 'restart <minutes>' to auto-reestablish after limit exceeded`
- `Consider warning-only option to avoid session teardown`

### BGP MD5 / TTL Security Password Mismatch (Severity: HIGH)

Configure BGP MD5 authentication with mismatched passwords between peers, preventing TCP connection establishment

**Diagnostic Symptoms:**
- BGP session fails to establish
- BGP stuck in IDLE or ACTIVE state
- TCP connection fails (MD5 signature mismatch)
- No BGP updates exchanged

**Troubleshooting Commands & Remediation:**
- `Check 'neighbor <ip> password <password>' configuration`
- `BGP uses TCP MD5 signature option (RFC 2385)`
- `Passwords must match exactly on both peers`
- `Password change requires session reset`
- `Specific to Cisco: 'neighbor <ip> password' command`
- `Check for special characters in password string`

### BGP Inbound Route Limit via Prefix Filter (Severity: HIGH)

Configure excessively restrictive inbound prefix filtering causing routing table incompleteness

**Diagnostic Symptoms:**
- Only partial internet routing table received
- Specific destination networks unreachable
- Blocked prefixes logs showing rejections
- ACL or prefix-list logging showing denied entries

**Troubleshooting Commands & Remediation:**
- `Check inbound filters: 'show ip bgp neighbor <ip> prefix-list'`
- `Verify 'neighbor <ip> prefix-list <name> in' configuration`
- `Log denied entries with 'log' keyword in prefix-list`
- `Ensure required prefixes are permitted`
- `Check AS_PATH filters (regex) that may be too restrictive`
- `Use 'show ip bgp neighbor <ip> routes' to see received routes`

### BGP Graceful Restart Capability Mismatch (Severity: MEDIUM)

Configure BGP graceful restart with incompatible parameters or failure to preserve forwarding state during restart

**Diagnostic Symptoms:**
- Forwarding stops during BGP peer restart
- Graceful restart helper not preserving routes
- Stale routes immediately deleted on session failure
- BGP NSF (Non-Stop Forwarding) not working

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor' for graceful restart capability`
- `Both peers must advertise graceful restart capability`
- `Restart time and stale path timer must be compatible`
- `Use 'bgp graceful-restart' to enable`
- `Verify forwarding plane preserves stale routes during restart`
- `End-of-RIB marker required for convergence signaling`

### BGP Community / Extended Community Stripped (Severity: MEDIUM)

Configure outbound route-map that unintentionally strips BGP communities, preventing propagation of routing policy markers

**Diagnostic Symptoms:**
- Communities not present in received BGP updates
- Community-based policies not working on peer router
- BGP communities set on one side but missing on other
- Extended communities (RT, SoO) missing

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for community attributes`
- `By default, communities are NOT sent to eBGP peers`
- `Use 'neighbor <ip> send-community' and 'send-community extended'`
- `Outbound route-maps may strip communities if not explicitly permitted`
- `'set communities none' clears all communities`
- `Use 'set community <value> additive' to preserve existing communities`
- `Verify 'ip bgp-community new-format' for dotted format display`

### BGP Site-of-Origin (SoO) Misconfiguration (Severity: HIGH)

Configure incorrect BGP Site-of-Origin extended community, causing route acceptance issues in MPLS VPN or multi-homed scenarios

**Diagnostic Symptoms:**
- BGP routes re-advertised back to originating site
- Sub-optimal routing in multi-homed site
- Route looping between CE and PE
- SoO mismatch preventing legitimate route acceptance

**Troubleshooting Commands & Remediation:**
- `SoO prevents routing loops in multi-homed sites`
- `Use 'neighbor <ip> soo <ext-community>' command`
- `SoO attached to all routes received from that neighbor`
- `Check 'show ip bgp <prefix>' for SoO extended community`
- `All CEs in same site should have same SoO value`
- `Routes with matching SoO are rejected to prevent loops`

### BGP Origin Attribute Misconfiguration (Severity: LOW)

Configure BGP origin attribute incorrectly (IGP, EGP, incomplete), affecting path selection

**Diagnostic Symptoms:**
- BGP paths not selected as expected
- Origin code 'incomplete' affecting path preference
- Redistributed routes showing '?' origin
- Origin attribute manipulation not working

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for origin code (i, e, ?)`
- `Origin preference order: IGP (i) > EGP (e) > incomplete (?)`
- `Network-advertised routes get origin IGP`
- `Redistributed routes get origin 'incomplete' (?)`
- `Use 'set origin igp|egp|incomplete' in route-map`
- `Origin is compared before MED in path selection`

### BGP Peer Group Misconfiguration (Severity: MEDIUM)

Configure BGP peer group with incorrect template or override, causing inconsistent peer policies

**Diagnostic Symptoms:**
- Peers in same group have different behavior
- Peer group template overrides not taking effect
- Individual neighbor configuration conflicts with peer-group
- Inconsistent route advertisements within peer group

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp peer-group <group>' for configuration`
- `Individual neighbor configuration overrides peer-group settings`
- `Some commands cannot be applied to peer-group directly`
- `Use 'inherit peer-session <name>' and 'inherit peer-policy <name>'`
- `Session templates: update-source, remote-as, password`
- `Policy templates: route-map, prefix-list, filter-list`

### BGP Administrative Distance Affecting Route Selection (Severity: HIGH)

Configure BGP administrative distance incorrectly, causing BGP routes to be less preferred than IGP or other routing sources

**Diagnostic Symptoms:**
- BGP routes not installed in routing table despite being in BGP table
- IGP routes preferred over BGP routes for same prefix
- Unexpected route source winning
- show ip route shows non-BGP route source winning

**Troubleshooting Commands & Remediation:**
- `Default AD: eBGP 20, iBGP 200, OSPF 110, IS-IS 115, Static 1`
- `Check 'show ip route <prefix>' for route source and AD`
- `Use 'distance bgp <ext> <int> <local>' to adjust BGP AD`
- `iBGP default AD 200 means OSPF routes always preferred`
- `Lower AD value = more trusted route source`
- `Adjust per neighbor: 'neighbor <ip> distance <value>'`

### eBGP vs iBGP Path Selection Conflict (Severity: MEDIUM)

Configure both eBGP and iBGP paths for same prefix, where eBGP path should be preferred but iBGP path wins due to attribute manipulation

**Diagnostic Symptoms:**
- iBGP path preferred over eBGP path for same destination
- Traffic engineering not working as expected
- Unexpected path selection with eBGP and iBGP paths

**Troubleshooting Commands & Remediation:**
- `eBGP path (AD 20) preferred over iBGP (AD 200) by default`
- `But local-preference evaluated before eBGP/iBGP preference`
- `Higher local-preference on iBGP path overrides eBGP`
- `Check 'show ip bgp <prefix>' for path selection comparison`
- `eBGP vs iBGP is step 7 of BGP path selection`
- `Use weight or local-preference to control without changing AD`

### BGP IGP Metric to Next-Hop Affecting Path Selection (Severity: MEDIUM)

Configure iBGP paths with different IGP metrics to next-hop, causing suboptimal BGP path selection

**Diagnostic Symptoms:**
- iBGP path with longer IGP path to next-hop preferred
- Suboptimal BGP route selection within AS
- Uneven traffic distribution across iBGP paths

**Troubleshooting Commands & Remediation:**
- `IGP metric to next-hop is step 8 of BGP path selection`
- `Check 'show ip bgp <prefix>' for path comparison`
- `Lower IGP metric to next-hop is preferred`
- `Check IGP metric with 'show ip route <next-hop>'`
- `Adjust IGP metric or use BGP attributes to override`
- `Common in networks with unequal IGP path costs to route reflectors`

### BGP Oldest Path Not Preserved After Reset (Severity: MEDIUM)

Reset BGP session or clear BGP table, losing oldest path preference and potentially causing suboptimal path selection

**Diagnostic Symptoms:**
- Path selection changes after BGP session reset
- Previously non-preferred path becomes preferred
- Traffic shifts after maintenance window
- Path flapping due to preferred path aging

**Troubleshooting Commands & Remediation:**
- `Step 10: prefer older eBGP path for stability`
- `Use 'clear ip bgp <prefix>' carefully - resets path age`
- `BGP session restart resets path age`
- `Use graceful restart to preserve forwarding state`
- `bgp update-delay helps with post-restart stability`
- `Older path preferred to minimize route flapping`

### BGP Router ID Affecting Path Selection (Severity: LOW)

Configure BGP with Router ID making suboptimal paths preferred due to lower Router ID tie-breaking

**Diagnostic Symptoms:**
- Unexpected path selected when all other attributes equal
- Router with lower Router ID preferred over better-performing path
- Asymmetric routing due to Router ID comparison

**Troubleshooting Commands & Remediation:**
- `Router ID is step 11 of BGP path selection`
- `Lower Router ID is preferred`
- `Router ID selected: highest loopback > highest physical IP`
- `Use 'bgp router-id <id>' to set manually`
- `Router ID change requires BGP session restart`
- `Different Router IDs on same router can cause issues`

### BGP Lowest Neighbor Address Path Selection (Severity: LOW)

Configure equal BGP paths where lowest neighbor IP address determines final path selection, causing suboptimal traffic pattern

**Diagnostic Symptoms:**
- Final tie-breaking selects path based on neighbor IP
- Neighbor IP address determines preferred path
- Unpredictable path selection in equal-cost scenarios
- Router with lower loopback IP consistently preferred

**Troubleshooting Commands & Remediation:**
- `Lowest neighbor IP is the final tie-breaker (step 13)`
- `All earlier steps (1-12) must be equal for this to apply`
- `Use weight, local-pref, MED, or AS-path to avoid tie-breaking`
- `Check 'show ip bgp <prefix>' for full path comparison`
- `Hard to debug - all attributes appear equal`
- `Explicitly set path attributes to break the tie`

### BGP/IGP Synchronization Issue (Legacy) (Severity: HIGH)

Enable BGP/IGP synchronization on an iBGP router, preventing BGP routes from being used until learned via IGP

**Diagnostic Symptoms:**
- BGP routes in BGP table but not in routing table
- Routes not installed until IGP learns the same prefix
- Connectivity issues across transit AS
- Routing black holes for BGP advertised prefixes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp template' for synchronization status`
- `Synchronization is disabled by default in modern IOS`
- `When enabled: BGP route not installed unless IGP has route`
- `Use 'no synchronization' to disable`
- `Originally designed for non-full-mesh iBGP scenarios`
- `Rare in modern networks but may be encountered in legacy configs`

### BGP Redistributing IGP Routes Incorrectly (Severity: CRITICAL)

Configure redistribution of IGP routes (OSPF, IS-IS) into BGP, causing route table pollution or routing loops

**Diagnostic Symptoms:**
- Internal IGP routes leaked to external BGP peers
- Internet routers receiving internal network routes
- Routing loops caused by IGP route redistribution
- BGP table growing with unnecessary internal routes

**Troubleshooting Commands & Remediation:**
- `DO NOT redistribute IGP into BGP unless explicitly required`
- `Use 'network' statements instead to advertise specific prefixes`
- `If redistribution required: use route-maps to filter specific routes`
- `Check with 'show ip bgp' for redistributed IGP routes`
- `Common mistake: 'redistribute ospf <pid>' under BGP without filters`
- `Use 'default-information originate' instead for default route`

### BGP Backdoor Route Configuration (Severity: MEDIUM)

Configure BGP backdoor route incorrectly, causing IGP route to not be preferred over eBGP learned route

**Diagnostic Symptoms:**
- eBGP learned route preferred over IGP route to same prefix
- Traffic goes through external path instead of internal backdoor
- Suboptimal routing for dual-homed network
- Backdoor network not reachable via internal path

**Troubleshooting Commands & Remediation:**
- `Use 'network <prefix> backdoor' to prefer IGP over eBGP`
- `Backdoor sets AD to 200 (same as iBGP) for that prefix`
- `Alternative: adjust distance using 'distance bgp'`
- `Check 'show ip route <prefix>' for route source and AD`
- `Use 'show ip bgp <prefix>' to verify backdoor configuration`
- `Backdoor routes do not get advertised to BGP peers`

### BGP Dynamic Neighbor (Listen Range) Misconfiguration (Severity: HIGH)

Configure BGP dynamic neighbor listen range too broad or too narrow, causing peering failures or unexpected peers

**Diagnostic Symptoms:**
- Expected BGP peers not establishing with dynamic range
- Unexpected BGP peers connecting to router
- Dynamic peer template not applied correctly
- BGP session flapping with dynamic neighbors

**Troubleshooting Commands & Remediation:**
- `Use 'bgp listen range <network/len> peer-group <group>'`
- `Dynamic peers use peer-group template for configuration`
- `Verify peer-group template has all required settings`
- `Check 'show ip bgp summary' for dynamic peers (marked with 'D')`
- `Limit listen range to specific subnet to prevent unauthorized peers`
- `Dynamic BGP common in data center leaf-spine fabrics`

### BGP Soft Reset / Route Refresh Failure (Severity: MEDIUM)

Configure BGP without route refresh capability or inbound soft-reconfiguration, requiring hard reset to apply policy changes

**Diagnostic Symptoms:**
- BGP policy changes require session hard reset to take effect
- 'clear ip bgp * soft' not updating routes
- Route refresh capability not negotiated with peer
- Old routes remain after policy change

**Troubleshooting Commands & Remediation:**
- `Route refresh capability negotiated in BGP OPEN message`
- `Use 'neighbor <ip> soft-reconfiguration inbound' to store routes`
- `Soft-reconfiguration stores all received routes for re-processing`
- `Resource-intensive: doubles BGP memory usage`
- `Prefer route refresh (RFC 2918) when supported`
- `Use 'clear ip bgp <ip> soft in' to re-process without reset`

### BGP Notification Message Causing Session Reset (Severity: HIGH)

Trigger BGP notification messages (error conditions) that cause session to reset with various error codes

**Diagnostic Symptoms:**
- BGP session resets with notification message
- Error subcode indicating specific issue
- Session flapping with particular error pattern
- BGP logs showing notification codes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp neighbor' for last notification`
- `Notification error codes: 1=Message Header, 2=OPEN, 3=UPDATE, 4=Hold Timer Expired`
- `UPDATE error (code 3) common with attribute issues`
- `OPEN error (code 2) common with capability mismatch`
- `Use 'debug ip bgp updates' carefully in maintenance window`
- `Common causes: malformed attribute, invalid next-hop, AS loop`

### BGP Large Community Misconfiguration (Severity: MEDIUM)

Configure BGP large community (RFC 8092) incorrectly or fail to propagate, causing routing policy failures

**Diagnostic Symptoms:**
- Large communities not present in received BGP updates
- Large community-based policies not working
- 'send-community large' not configured
- Large community matches failing in route-maps

**Troubleshooting Commands & Remediation:**
- `Large community format: <ASN>:<value1>:<value2>`
- `Use 'neighbor <ip> send-community large' to propagate`
- `Can combine: 'send-community std|ext|large|all'`
- `Match with 'match community-list <name> large'`
- `Set with 'set comm-list <name> delete' or 'set large-community <value>'`
- `Check 'show ip bgp <prefix>' for large community attribute`

### BGP Outbound Route Filtering (ORF) Failure (Severity: MEDIUM)

Configure BGP ORF (prefix-based outbound filtering) inconsistently, causing route filtering to not work

**Diagnostic Symptoms:**
- ORF capability not negotiated between peers
- Prefix filters not applied even though ORF configured
- Unwanted prefixes still received after ORF configuration
- ORF entry mismatch between peers

**Troubleshooting Commands & Remediation:**
- `ORF allows receiver to send prefix filters to sender`
- `Use 'neighbor <ip> capability orf prefix-list <name>'`
- `Both peers must support ORF capability`
- `Check 'show ip bgp neighbor <ip>' for ORF capability`
- `ORF receive: router receives filters from peer`
- `ORF send: router sends filters to peer`

### BGP Add-Path Capability Mismatch (Severity: MEDIUM)

Configure BGP Add-Path (additional paths) incorrectly, preventing multiple paths from being advertised

**Diagnostic Symptoms:**
- Only best path sent to BGP peer despite Add-Path configured
- Backup paths not available on receiving router
- Add-Path capability not negotiated in OPEN
- Fast convergence (PIC) not working as expected

**Troubleshooting Commands & Remediation:**
- `Add-Path allows advertising multiple paths for same prefix`
- `Use 'neighbor <ip> advertise additional-paths all'`
- `Use 'neighbor <ip> additional-paths receive' to accept`
- `Check 'show ip bgp neighbor <ip>' for Add-Path capability`
- `Both peers must support Add-Path for negotiation`
- `Maximum-paths affects Add-Path behavior`

### BGP DMZ Link Bandwidth Unequal Load Balancing (Severity: MEDIUM)

Configure BGP DMZ link bandwidth for unequal-cost load balancing but with incorrect values causing uneven traffic distribution

**Diagnostic Symptoms:**
- Unequal traffic distribution across eBGP links
- DMZ bandwidth not affecting load sharing
- BGP multipath not utilizing link capacities proportionally
- Higher bandwidth link not carrying proportionally more traffic

**Troubleshooting Commands & Remediation:**
- `DMZ Link Bandwidth is a Cisco proprietary attribute`
- `Configured with 'neighbor <ip> dmzlink-bw' and route-map`
- `Used for unequal-cost load balancing across eBGP multipath`
- `Check 'show ip bgp <prefix>' for DMZ bandwidth value`
- `Both sides must support DMZ link bandwidth`
- `Requires 'maximum-paths' and 'bgp bestpath as-path multipath-relax'`

### BGP RPKI / ROA Validation Rejecting Valid Routes (Severity: HIGH)

Configure BGP RPKI Origin Validation with incorrect ROA data, causing legitimate prefixes to be treated as invalid and rejected

**Diagnostic Symptoms:**
- BGP routes showing 'invalid' origin AS validation status
- Legitimate prefixes dropped due to ROV
- RPKI validation not matching actual prefix ownership
- ROA not found for valid prefixes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp <prefix>' for ROV status (valid/notfound/invalid)`
- `Use 'bgp rpki server tcp <ip> port <port>' for RPKI-RTR`
- `ROA announces: <prefix/maxlen> <origin-AS>`
- `Validation states: valid (0), not found (1), invalid (2)`
- `Use 'bgp bestpath prefix-validate disable' to disable and test`
- `Invalid routes dropped by default when ROV configured`

### BGP TCP-AO Authentication Misconfiguration (Severity: HIGH)

Configure BGP with TCP-AO (TCP Authentication Option) but with mismatched keys or algorithms, preventing session establishment

**Diagnostic Symptoms:**
- BGP session fails to establish
- TCP connection rejected due to authentication failure
- BGP stuck in IDLE state
- TCP-AO key mismatch errors in logs

**Troubleshooting Commands & Remediation:**
- `TCP-AO (RFC 5925) replaces MD5 TCP authentication`
- `Use 'key chain <name> tcp' for TCP-AO configuration`
- `Use 'tcp-ao-udp-encrypt' and 'mac-secure' algorithms`
- `Different key IDs or algorithms prevent session establishment`
- `Check key send-id and accept-id must match on both sides`
- `Use 'neighbor <ip> tcp-ao key-chain <name>' to apply`
- `Pre-rollover: ensure old key works during key transition`

### BGP Session Limit / Peer Limit Exceeded (Severity: HIGH)

Configure BGP with session limits or platform limitations preventing new peer sessions from being established

**Diagnostic Symptoms:**
- New BGP peers cannot establish sessions
- 'maximum peer limit reached' error messages
- Existing peers work but new peers fail
- Memory allocation failures for BGP process

**Troubleshooting Commands & Remediation:**
- `Check 'show ip bgp summary' for total peer count`
- `Platforms have hardware/software limits on BGP peers`
- `Use 'neighbor <ip> shutdown' to free peer slots`
- `Consider peer groups to reduce resource usage`
- `Check 'show process memory' for BGP process memory`
- `Redistribute peers across multiple BGP processes if supported`

### BGP Maintenance Mode / Graceful Shutdown (Severity: HIGH)

Configure BGP maintenance or graceful shutdown incorrectly, causing traffic loss during planned maintenance

**Diagnostic Symptoms:**
- Traffic loss during BGP maintenance window
- Graceful shutdown not diverting traffic as expected
- Local preference community not honored by upstream
- BGP session hard reset causing route withdrawal

**Troubleshooting Commands & Remediation:**
- `Use graceful shutdown (RFC 8326) to signal maintenance`
- `Set community: well-known GRACEFUL_SHUTDOWN (65535:0)`
- `Set local-preference to 0 for outbound traffic diversion`
- `Prepend AS path to make path less attractive for inbound`
- `Use 'neighbor <ip> shutdown' only after traffic diverted`
- `Coordinate maintenance window with upstream peers`
- `Use route-map to apply prepend and low local-pref before shutdown`

### BGP Max-MED / MED Recovery Issue (Severity: HIGH)

Configure BGP max-med on startup but MED fails to recover after convergence, causing suboptimal inbound routing

**Diagnostic Symptoms:**
- BGP paths still showing max-med value after convergence
- Inbound traffic not recovering after reboot
- MED remains at maximum value indefinitely
- Suboptimal inbound traffic after planned maintenance

**Troubleshooting Commands & Remediation:**
- `'bgp max-med on-startup <seconds>' sends max-med after boot`
- `After timer expires, router sends normal MED values`
- `Check 'show ip bgp <prefix>' for MED value`
- `If MED stuck: 'clear ip bgp <neighbor>' to force update`
- `Use 'bgp bestpath med missing-as-worst' to handle missing MED`
- `Available in: 'bgp max-med on-startup <sec> <med-value>'`

### BGP Configuration Drift / Template Inheritance Issue (Severity: MEDIUM)

Configure BGP peer with session-template or peer-group but individual overrides cause unexpected configuration drift

**Diagnostic Symptoms:**
- Individual neighbor configuration differs from peer-group template
- Unexpected neighbor behavior despite common template
- Configuration audit shows template/neighbor mismatch
- Some neighbors in group have different policies

**Troubleshooting Commands & Remediation:**
- `Individual neighbor configuration overrides peer-group settings`
- `Use 'show ip bgp peer-group <name>' for inherited config`
- `Use 'show run | inc neighbor' to see individual settings`
- `Use 'inherit peer-session/policy' templates consistently`
- `Session templates handle: remote-as, update-source, password`
- `Policy templates handle: route-map, prefix-list, filter-list`

### BGP Update Delay After Restart (Severity: MEDIUM)

Configure BGP update delay or read-only mode incorrectly, causing slow convergence after BGP process restart

**Diagnostic Symptoms:**
- BGP sessions established but no routes exchanged
- Slow BGP convergence after reboot
- Routes appear only after significant delay
- BGP read-only mode active preventing updates

**Troubleshooting Commands & Remediation:**
- `Use 'bgp update-delay <seconds>' to set convergence wait time`
- `During update-delay, BGP establishes sessions but does not send updates`
- `After delay expires, BGP sends all routes at once`
- `Default delay varies by platform (typically 120s)`
- `Too short: routes advertised before all sessions established`
- `Too long: slow convergence after reboot`
- `BGP open-policy timer also affects when routes are processed`

### BGP Confederation AS Number Confusion (Severity: HIGH)

Configure BGP confederation with overlapping or conflicting sub-AS numbers, causing peering failures and route propagation issues

**Diagnostic Symptoms:**
- Confederation sub-AS peering fails to establish
- AS path inside confederation shows conflicting AS numbers
- Routes not propagating correctly across confederation
- Local preference not preserved across confederation boundary

**Troubleshooting Commands & Remediation:**
- `Confederation sub-AS numbers must be unique within confederation`
- `Use private AS range (64512-65535) for sub-AS numbers`
- `'show ip bgp' shows confederation AS in brackets [AS-set]`
- `Local preference preserved across sub-AS boundaries`
- `Next-hop-self not automatic for confederation peers`
- `Check 'bgp confederation peers' lists all sub-AS numbers`

### BGP NLRI Filter / Prefix Advertisement Control (Severity: HIGH)

Configure BGP NLRI filter that blocks legitimate prefixes at the NLRI level

**Diagnostic Symptoms:**
- Specific prefixes not advertised despite no explicit prefix-list
- NLRI filtering blocking legitimate network advertisements
- Network statement present but BGP not generating NLRI
- Route in routing table but not in BGP table

**Troubleshooting Commands & Remediation:**
- `NLRI = the prefix + length in BGP UPDATE message`
- `BGP generates NLRI from 'network' statements or redistribution`
- `NLRI filtering happens before community or AS-path processing`
- `Wrong 'network mask <mask>' causes NLRI mismatch`
- `Check 'show ip bgp <prefix>' for NLRI generation status`

### BGP AS-Path Regular Expression / Regex Pattern Mismatch (Severity: HIGH)

Configure AS-path ACL with incorrect regex pattern matching wrong AS numbers

**Diagnostic Symptoms:**
- AS-path ACL matching unexpected routes
- Expected routes not matched by regex
- Regex pattern too broad or too narrow
- BGP route filter based on AS-path not working

**Troubleshooting Commands & Remediation:**
- `AS-path regex: 'ip as-path access-list <num> permit|deny <regex>'`
- `_ASN_ matches exact AS number (underscores = whitespace or boundary)`
- `^$ matches locally originated routes (empty AS-path)`
- `.* matches any AS path`
- `Use 'show ip bgp regexp <pattern>' to test regex against BGP table`

### BGP Policy-List / Route Policy Match Block (Severity: HIGH)

Configure BGP policy-list with inconsistent match clauses causing policy not applied

**Diagnostic Symptoms:**
- Policy-list conditions not matching intended routes
- Route-map referencing policy-list not evaluating correctly
- Multiple match clauses in policy-list not AND/OR as expected
- Prefix-set or community-set in policy-list not matching

**Troubleshooting Commands & Remediation:**
- `Policy-list: reusable match condition block, referenced by route-map`
- `Use 'bgp policy-list <name> match|set <conditions>'`
- `Conditions support: prefix-set, community-set, as-path-set`
- `Match type: match-all (AND) or match-any (OR)`
- `Route-map permit references policy-list conditions`
- `Check 'show route-map' for policy-list match statistics`

### BGP Next-Hop Tracking (NHT) Convergence Delay (Severity: HIGH)

Configure BGP NHT scan interval too slow causing delayed next-hop validation

**Diagnostic Symptoms:**
- BGP convergence slow after IGP route change
- NHT scan interval too long causing delayed next-hop validation
- BGP routes remain installed after next-hop unreachable
- NHT processing delay for BGP prefixes

**Troubleshooting Commands & Remediation:**
- `NHT: BGP monitors next-hop reachability via IGP`
- `If next-hop unreachable: BGP removes affected prefixes from RIB`
- `NHT scan interval: 'bgp nexthop trigger enable <seconds>'`
- `Default scan: every 60s (may be slow for fast convergence)`
- `Use 'bgp nexthop trigger delay <critical> <non-critical>'`
- `Check 'show ip bgp nexthop' for next-hop tracking status`

### BGP Fast External Fallover / eBGP Link Detection (Severity: HIGH)

Configure BGP fast external fallover disabled causing slow eBGP session reset on link failure

**Diagnostic Symptoms:**
- eBGP session stays up after directly connected link failure
- Slow BGP convergence on interface down event
- BGP fast external fallover disabled
- Interface down but BGP hold timers still running

**Troubleshooting Commands & Remediation:**
- `Fast external fallover: immediately resets eBGP session when interface goes down`
- `Use 'bgp fast-external-fallover' (enabled by default)`
- `If disabled: eBGP relies on hold timer (180s default) for failure detection`
- `Check 'show ip bgp' for 'Fast external fallover: enabled' status`
- `Disable only if eBGP multihop with loopback peering`

### BGP PIC (Prefix Independent Convergence) Misconfiguration (Severity: HIGH)

Configure BGP PIC for edge but backup path not pre-installed or convergence not improved

**Diagnostic Symptoms:**
- BGP convergence still slow despite PIC configured
- Backup path not pre-installed in RIB/FIB
- PIC edge not reducing failover time
- BGP PIC not working as expected

**Troubleshooting Commands & Remediation:**
- `BGP PIC: pre-installs backup path in forwarding (FIB)`
- `On failure: switch to backup immediately (no CPU recomputation)`
- `Use 'bgp additional-paths install' and 'bgp recursion host'`
- `PIC Edge: for prefixes with backup path`
- `PIC Core: for BGP-free core with labeled routes`
- `Check 'show ip bgp <prefix>' for backup path status`

### BGP 4-Octet AS Number / ASN Format Capability Mismatch (Severity: HIGH)

Configure 4-byte AS number but peer does not support or format incompatible

**Diagnostic Symptoms:**
- eBGP session not establishing with 4-byte AS number
- Peer does not support 4-byte AS capability
- AS number represented as '23456' in old format
- 4-byte AS path attribute not correctly propagated

**Troubleshooting Commands & Remediation:**
- `4-byte AS: range 1-4294967295 (RFC 6793)`
- `2-byte only peers see 4-byte AS as reserved 23456 (AS_TRANS)`
- `Check 'show ip bgp summary' for AS number format`
- `Use 'bgp asnotation dot' for dotted notation (1.0 = 65536)`
- `Capability negotiation: OPEN message includes 4-byte AS capability`
- `If peer does not support: 4-byte AS mapped to AS_TRANS in AS4_PATH`

### BGP Transport Optimization / TCP Session Tuning (Severity: MEDIUM)

Configure BGP with suboptimal TCP parameters causing session instability over long-distance links

**Diagnostic Symptoms:**
- BGP TCP session reset under load
- Slow BGP update delivery over high-latency links
- BGP TCP window size too small
- BGP session flapping due to TCP retransmission timeout

**Troubleshooting Commands & Remediation:**
- `BGP uses dynamic TCP window (scale factor)`
- `Use 'ip tcp window-size <bytes>' for send buffer`
- `Use 'ip tcp path-mtu-discovery' for optimal MSS`
- `For high-latency: increase TCP queue length`
- `BGP update delay: 'bgp update-delay <seconds>' after session up`
- `Check 'show tcp brief' for BGP TCP connection details`

