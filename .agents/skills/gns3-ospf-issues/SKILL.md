---
name: "OSPF Issues Injection"
description: "OSPF protocol related network faults for troubleshooting practice"
category: "computer-networking"
---

# OSPF Issues Injection

OSPF protocol related network faults for troubleshooting practice

## Supported Protocols
- ospf
- ospfv2
- ospfv3

## Fault Injection Scenarios & Troubleshooting Procedures

### OSPF Area Mismatch (Severity: HIGH)

Configure interfaces in different OSPF areas than their neighbors

**Diagnostic Symptoms:**
- OSPF neighbor adjacency fails
- Routes not exchanged between areas
- OSPF stuck in INIT or DOWN state
- Area border router issues

**Troubleshooting Commands & Remediation:**
- `Check OSPF neighbor status with 'show ip ospf neighbor'`
- `Verify OSPF area configuration on interfaces`
- `Check OSPF database with 'show ip ospf database'`
- `Look for 'mismatched area' error messages`
- `Ensure all interfaces in a segment are in same area (unless using virtual links)`

### OSPF Authentication Mismatch (Severity: HIGH)

Configure OSPF authentication on one side but not the other, or use different keys or auth types

**Diagnostic Symptoms:**
- OSPF neighbor adjacency fails
- Authentication mismatch errors in logs
- OSPF stuck in DOWN or ATTEMPT state

**Troubleshooting Commands & Remediation:**
- `Check OSPF interface configuration for authentication`
- `Verify authentication type (null, clear text, MD5, SHA)`
- `Check key strings match exactly`
- `Look for 'authentication failure' messages`
- `Ensure key IDs match for MD5/SHA authentication`
- `For OSPFv3, verify IPsec authentication settings`

### OSPF Hello/Dead Timer Mismatch (Severity: HIGH)

Configure mismatched OSPF hello or dead interval timers

**Diagnostic Symptoms:**
- OSPF neighbor adjacency fails to form
- Neighbors stuck in INIT state
- Adjacency flaps intermittently

**Troubleshooting Commands & Remediation:**
- `Check OSPF interface timers with 'show ip ospf interface detail'`
- `Hello and dead timers must match on both sides`
- `Default hello is 10s, dead is 40s on broadcast`
- `Default hello is 30s, dead is 120s on point-to-point`
- `Dead interval should be 4x hello interval`

### OSPF Passive Interface Blocking Neighbors (Severity: HIGH)

Configure passive-interface on an interface where OSPF neighbor needs to form

**Diagnostic Symptoms:**
- OSPF neighbor adjacency doesn't form on specific interface
- No OSPF hellos sent on the interface
- Routes missing only on one segment
- Other interfaces form adjacencies normally

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface' for passive status`
- `Verify interface is not listed as passive`
- `Check OSPF configuration for 'passive-interface default'`
- `Use 'no passive-interface <intf>' to allow adjacency`
- `Check 'show run | section router ospf' for passive statements`

### OSPF Network Type Mismatch (Severity: HIGH)

Configure different network types (broadcast, point-to-point, non-broadcast) on connected interfaces

**Diagnostic Symptoms:**
- OSPF neighbor adjacency fails
- Neighbors stuck in 2-WAY state on broadcast networks
- DR/BDR election issues
- Routes not exchanged properly

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface' for network type`
- `Ensure both sides use same network type`
- `Broadcast networks typically use DR/BDR model`
- `Point-to-point networks don't elect DR/BDR`
- `Mismatched network types prevent proper adjacency`

### OSPF MTU Mismatch (Severity: HIGH)

Configure interface MTU larger on one side, causing DBD exchange to fail and neighbors stuck in EXSTART state

**Diagnostic Symptoms:**
- OSPF neighbors stuck in EXSTART state
- Database exchange fails repeatedly
- Adjacency never reaches FULL state
- MTU mismatch error messages in logs

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf neighbor' - neighbors stuck in EXSTART`
- `Verify interface MTU with 'show interface'`
- `MTU must match on both sides for DBD exchange`
- `Use 'ip ospf mtu-ignore' as workaround (not recommended)`
- `Common issue with VLAN interfaces and trunking`

### OSPF Router ID Conflict (Severity: CRITICAL)

Configure duplicate OSPF router IDs on different routers in the same area

**Diagnostic Symptoms:**
- OSPF adjacency instability
- LSA origination conflicts
- Routing loops or black holes
- Repeated OSPF process restarts
- LSA database corruption warnings

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf' for router ID`
- `Ensure all routers have unique router IDs`
- `Use 'router-id <x.x.x.x>' command to set manually`
- `Router ID is typically the highest loopback or interface IP`
- `Duplicate router IDs cause severe routing problems`

### OSPF Subnet Mask Mismatch on Broadcast Networks (Severity: HIGH)

Configure interfaces in same subnet but with different subnet masks, preventing adjacency on broadcast networks

**Diagnostic Symptoms:**
- OSPF neighbor adjacency fails on broadcast segment
- Neighbors not discovered despite Layer 2 connectivity
- OSPF hellos sent but not received

**Troubleshooting Commands & Remediation:**
- `Check interface IP configuration with 'show ip interface brief'`
- `Verify subnet masks match on all routers in same segment`
- `OSPF on broadcast networks requires exact subnet match`
- `Point-to-point links more forgiving with subnet mismatches`
- `Ensure IP addresses and masks are correct`

### OSPFv3 Instance ID Mismatch (Severity: HIGH)

Configure different OSPFv3 instance IDs on interfaces in the same segment

**Diagnostic Symptoms:**
- OSPFv3 neighbor adjacency fails
- Multiple OSPFv3 instances on same link not forming
- IPv6 routes not exchanged

**Troubleshooting Commands & Remediation:**
- `Check 'show ipv6 ospf interface' for instance ID`
- `Instance ID must match on both sides (default is 0)`
- `Use 'ipv6 ospf <process-id> instance <instance-id>' command`
- `Different instance IDs are treated as separate OSPF processes`
- `Verify instance ID configuration on all interfaces`

### OSPFv3 Missing Link-Local Address (Severity: CRITICAL)

Remove or misconfigure link-local address on OSPFv3 interface, preventing neighbor formation

**Diagnostic Symptoms:**
- OSPFv3 adjacency fails to form
- OSPFv3 process not running on interface
- IPv6 routing not functioning
- Link-local address required error messages

**Troubleshooting Commands & Remediation:**
- `Check 'show ipv6 interface' for link-local address (FE80::/10)`
- `OSPFv3 requires link-local address for neighbor communication`
- `Link-local auto-generated but can be manually configured`
- `Verify 'ipv6 enable' is configured on interface`
- `Link-local address must be in same subnet (FE80::/10)`

### OSPF LSA Filtering Configuration Error (Severity: HIGH)

Configure incorrect LSA filtering preventing legitimate routes from being advertised

**Diagnostic Symptoms:**
- Specific routes missing from OSPF database
- Partial routing table in an area
- Filtered routes affect network reachability
- Asymmetric routing behavior

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf database' for missing LSAs`
- `Look for 'distribute-list' or 'filter-list' commands`
- `LSA filtering typically done on ABRs or ASBRs`
- `Verify area ranges and summary LSA filtering`
- `Check 'ip ospf database-filter all out' on interfaces`

### OSPF External Route Redistribution Missing (Severity: MEDIUM)

Fail to redistribute external routes (static, connected, BGP) into OSPF or configure incorrect redistribute parameters

**Diagnostic Symptoms:**
- External routes not appearing in OSPF domain
- Type 5 or Type 7 LSAs missing from database
- ASBR not generating external LSAs
- Connectivity to external networks lost

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf database external' for Type 5 LSAs`
- `Verify 'redistribute' command under OSPF process`
- `Check route maps and distribute lists`
- `Ensure external routes exist in routing table`
- `Verify 'subnets' keyword for OSPFv2 redistribution`
- `Check OSPFv3 external LSA types (E-routes)`

### OSPF Default Originate Not Configured (Severity: HIGH)

Fail to configure 'default-information originate' on ASBR, causing default route to be missing from OSPF domain

**Diagnostic Symptoms:**
- No default route (0.0.0.0/0) in OSPF domain
- Internet connectivity lost for internal routers
- Only static default on edge router, not propagated
- Routers can't reach unknown networks

**Troubleshooting Commands & Remediation:**
- `Check 'show ip route ospf' for default route`
- `Configure 'default-information originate' on ASBR`
- `Use 'always' keyword to advertise even without default route`
- `Verify default route exists in ASBR's routing table`
- `Check for 'default-information originate' in OSPF config`

### OSPF Route Summarization Configuration Error (Severity: MEDIUM)

Configure incorrect route summarization on ABR causing suboptimal routing or black holes

**Diagnostic Symptoms:**
- Suboptimal routing paths
- Traffic black holes to summarized subnets
- Route flapping when subnets within summary go down
- Specific routes missing from routing table

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf border-routers' for ABR information`
- `Verify 'area range' configuration on ABRs`
- `Ensure summary address includes all component subnets`
- `Check for overlapping summary addresses`
- `Use 'area X range <network> <mask> not-advertise' carefully`
- `Verify summary LSA (Type 3) in OSPF database`

### OSPF LSA Flooding Blocked (Severity: HIGH)

Configure interface to block LSA flooding, preventing OSPF database synchronization

**Diagnostic Symptoms:**
- OSPF database not synchronized across areas
- Routes missing in some routers
- Inconsistent routing tables
- LSAs not reaching all routers

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf database' for inconsistencies`
- `Look for 'database-filter all out' on interfaces`
- `Verify flooding is enabled on all interfaces`
- `Check for ACLs blocking OSPF multicast (224.0.0.5/6)`
- `Ensure OSPF network type allows proper flooding`
- `Verify interface is not in passive mode incorrectly`

### OSPF Virtual Link Misconfiguration (Severity: HIGH)

Configure OSPF virtual link incorrectly or fail to configure when needed to connect disconnected areas

**Diagnostic Symptoms:**
- Disconnected area cannot reach backbone (Area 0)
- Virtual link not establishing
- Area 0 must be contiguous for proper OSPF operation
- Inter-area routes missing

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf virtual-links' for virtual link status`
- `Virtual link must transit through non-backbone area`
- `Configure 'area <transit-area-id> virtual-link <router-id>'`
- `Both ends must configure virtual link with each other's Router ID`
- `Virtual link requires full OSPF adjacency over transit area`
- `Verify Router IDs are correct and reachable`

### OSPF Stub Area Configuration Error (Severity: HIGH)

Configure stub area incorrectly or fail to configure all routers in area as stub, causing routing failures

**Diagnostic Symptoms:**
- Type 5 external LSAs blocked in stub area
- No external routes in stub area routers
- Adjacency fails if stub configuration mismatch
- Default summary route missing from stub area

**Troubleshooting Commands & Remediation:**
- `All routers in stub area must have 'area X stub' configured`
- `Stub areas block Type 5 LSAs but allow Type 3 summary LSAs`
- `ABR automatically generates default route into stub area`
- `Use 'area X stub no-summary' for totally stubby area`
- `Virtual links cannot traverse stub areas`
- `Check 'show ip ospf' for stub area status`

### OSPF NSSA Area Configuration Error (Severity: HIGH)

Configure NSSA (Not-So-Stubby Area) incorrectly, causing external route translation or propagation issues

**Diagnostic Symptoms:**
- Type 7 LSAs not translated to Type 5 at ABR
- External routes not propagated beyond NSSA
- NSSA external routes (N1/N2) missing
- P-bit not set correctly for LSA translation

**Troubleshooting Commands & Remediation:**
- `All routers in NSSA must have 'area X nssa' configured`
- `NSSA allows Type 7 LSAs which ABR translates to Type 5`
- `Use 'area X nssa no-redistribution' to prevent external injection`
- `Use 'area X nssa no-summary' for totally stubby NSSA`
- `Check 'show ip ospf database nssa-external' for Type 7 LSAs`
- `Verify ABR is configured to translate Type 7 to Type 5`

### OSPF Area Border Router Missing (Severity: HIGH)

Fail to configure ABR functionality, causing routes from one area to not reach another area

**Diagnostic Symptoms:**
- Routes not exchanged between areas
- Inter-area communication fails
- Summary LSAs (Type 3) missing from OSPF database
- Routers in different areas cannot communicate

**Troubleshooting Commands & Remediation:**
- `ABR must have interfaces in multiple areas including Area 0`
- `Check 'show ip ospf border-routers' for ABR information`
- `Ensure at least one interface is in Area 0 (backbone)`
- `ABR generates Type 3 summary LSAs between areas`
- `Verify OSPF is enabled on interfaces in each area`
- `Check for 'area X range' summarization on ABR`

### OSPF Cross-Area Route Unreachable (Severity: MEDIUM)

Configure inter-area path incorrectly or ABR fails to propagate summary LSAs, causing cross-area connectivity failures

**Diagnostic Symptoms:**
- Routes in one area not reachable from another area
- Type 3 summary LSAs missing from OSPF database
- Asymmetric routing between areas
- Traffic follows suboptimal path or black holes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf database summary' for Type 3 LSAs`
- `Verify ABR is properly configured and functional`
- `Ensure all areas connect to Area 0 directly or via virtual links`
- `Check for 'area X range' filtering specific networks`
- `Verify routing table on ABR contains routes from all areas`
- `Check for route filtering preventing LSA generation`

### OSPF Broadcast Network Configured as Point-to-Point (Severity: MEDIUM)

Configure OSPF network type as point-to-point on broadcast segment with multiple routers, causing DR/BDR election failure

**Diagnostic Symptoms:**
- Multiple adjacencies formed instead of DR/BDR model
- Suboptimal routing on broadcast segment
- Excessive LSA flooding on segment
- Potential routing loops or confusion

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface' for network type`
- `Broadcast networks (Ethernet) should use default network type`
- `Point-to-point type only for actual point-to-point links`
- `DR/BDR election only occurs on broadcast/NBMA network types`
- `Use 'ip ospf network broadcast' to correct`
- `Multiple routers on same subnet need DR/BDR model`

### OSPF NBMA Neighbor Not Configured (Severity: HIGH)

Fail to configure OSPF neighbor statements on NBMA network (Frame Relay, ATM), preventing neighbor formation

**Diagnostic Symptoms:**
- OSPF neighbors not forming on NBMA network
- No DR/BDR election on NBMA segment
- OSPF hellos not reaching all neighbors
- Partial mesh connectivity issues

**Troubleshooting Commands & Remediation:**
- `NBMA networks require manual neighbor configuration`
- `Use 'neighbor <ip-address>' command for OSPF neighbors`
- `Ensure OSPF network type is set to non-broadcast`
- `Configure priority and poll interval as needed`
- `Consider using point-to-multipoint as alternative`
- `Check 'show ip ospf neighbor' for missing adjacencies`

### OSPF DR/BDR Election Issues (Severity: MEDIUM)

Configure OSPF priorities incorrectly or manipulate DR/BDR election causing suboptimal DR/BDR placement

**Diagnostic Symptoms:**
- Suboptimal router elected as DR/BDR
- Low-performance router overwhelmed with DR duties
- Router with OSPF priority 0 becomes ineligible
- Frequent DR/BDR changes causing instability

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf neighbor' for DR/BDR status`
- `Highest router ID (not priority) becomes DR if priority ties`
- `Use 'ip ospf priority <0-255>' to influence election`
- `Priority 0 means router cannot become DR/BDR`
- `DR/BDR election is non-preemptive`
- `Highest priority router should be DR for stability`

### OSPF Priority Misconfiguration (Severity: HIGH)

Set OSPF interface priority to 0 on all routers, preventing any DR/BDR election

**Diagnostic Symptoms:**
- No DR or BDR elected on broadcast segment
- OSPF neighbors stuck in 2-WAY state
- Routes not exchanged on multi-access segment
- Network partition in broadcast domain

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface detail' for interface priority`
- `Priority 0 means router ineligible for DR/BDR`
- `At least two routers must have priority > 0 for election`
- `Default priority is 1 on most interfaces`
- `Use 'ip ospf priority <1-255>' to restore eligibility`
- `Higher priority value preferred for DR/BDR`

### OSPF LSA Storm (Flooding) (Severity: CRITICAL)

Trigger excessive LSA generation and flooding due to flapping links or unstable network, overwhelming OSPF process

**Diagnostic Symptoms:**
- Excessive OSPF LSA flooding and retransmission
- High CPU utilization on OSPF routers
- OSPF database constantly changing
- SPF calculations running continuously
- Network-wide OSPF instability

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf traffic' for LSA counts`
- `Look for flapping interfaces or unstable links`
- `Implement OSPF throttling and timers`
- `Use 'ip ospf retransmit-interval' and 'transmit-delay'`
- `Check for LSA origination rate limiting`
- `Identify source of LSA churn with 'show ip ospf database'`

### OSPF SPF Throttling Issues (Severity: MEDIUM)

Configure incorrect SPF throttling parameters causing excessive SPF calculations or slow convergence

**Diagnostic Symptoms:**
- Excessive SPF calculations consuming CPU
- Slow OSPF convergence after topology changes
- SPF scheduled but not running or running too frequently
- Routing instability after LSA changes

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf' for SPF statistics`
- `Review SPF timers: 'timers throttle spf <spf-start> <spf-hold> <spf-max-wait>'`
- `Default: SPF delay 5s, hold time 10s, max wait 5s`
- `Tune for balance between convergence speed and stability`
- `Frequent SPF indicates network instability or LSA storms`
- `Check for LSA generation rate with 'show ip ospf database'`

### OSPF Route Limit Exceeded (Severity: HIGH)

OSPF router exceeds maximum route capacity, causing routes to be missing or OSPF process to fail

**Diagnostic Symptoms:**
- Routes missing from routing table despite being in OSPF database
- OSPF process crashes or restarts
- Memory exhaustion on router
- Route installation failures in logs

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf' for route counts and limits`
- `Verify router memory and TCAM capacity`
- `Implement route summarization to reduce route count`
- `Use 'max-metric router-lsa' to temporarily stop routing`
- `Filter unnecessary routes with distribute-lists`
- `Consider upgrading hardware or redistributing load`

### OSPF Interface Bandwidth Limitation (Severity: MEDIUM)

Configure OSPF reference bandwidth incorrectly, causing improper cost calculation and suboptimal routing

**Diagnostic Symptoms:**
- Traffic follows suboptimal path
- High-speed links not preferred over low-speed links
- OSPF cost calculation incorrect
- Unequal load balancing not working

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface' for OSPF cost and bandwidth`
- `OSPF cost = reference-bandwidth / interface-bandwidth`
- `Default reference bandwidth is 100 Mbps`
- `Use 'auto-cost reference-bandwidth <Mbps>' to adjust`
- `For 10G+ networks, set reference to 10000 or higher`
- `Manual cost with 'ip ospf cost <value>' overrides calculation`

### OSPF Not Enabled on Interface (Severity: HIGH)

Interface configured with IP address but OSPF not enabled, preventing neighbor formation and route advertisement

**Diagnostic Symptoms:**
- OSPF not running on interface despite IP configuration
- Interface not listed in 'show ip ospf interface'
- No OSPF hellos sent on interface
- Network not advertised to OSPF neighbors

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface' - interface missing from list`
- `For OSPFv2: Ensure 'network <network> wildmask area <area>' includes interface`
- `Or use 'ip ospf <process-id> area <area>' under interface`
- `For OSPFv3: Use 'ipv6 ospf <process-id> area <area>' under interface`
- `Verify interface is not in passive mode unintentionally`
- `Check interface is 'up/up' with 'show ip interface brief'`

### OSPF Network Command Configuration Error (Severity: HIGH)

Configure incorrect network statement or wildcard mask, causing interfaces to not join OSPF process

**Diagnostic Symptoms:**
- Interfaces not included in OSPF process
- Network statement doesn't match interface IP
- Wrong wildcard mask in network command
- OSPF not running on expected interfaces

**Troubleshooting Commands & Remediation:**
- `Check 'show running-config | section router ospf' for network statements`
- `Network command: 'network <IP> <wildcard> area <area>'`
- `Wildcard mask is inverse of subnet mask (0.0.0.255 for /24)`
- `Use 'network 0.0.0.0 255.255.255.255 area <area>' to match all`
- `More specific network statements take precedence`
- `Verify interface IP is within network statement range`

### OSPF Redistribution Configuration Error (Severity: MEDIUM)

Configure incorrect redistribution (wrong protocol, missing route-map, missing subnets keyword), causing external routes to not appear

**Diagnostic Symptoms:**
- Redistributed routes not appearing in OSPF domain
- External routes not generated by ASBR
- Route filtering not working as expected
- Missing 'subnets' keyword for OSPFv2

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf database external' for Type 5 LSAs`
- `OSPFv2 requires 'subnets' keyword to redistribute subnet routes`
- `Verify 'redistribute <protocol> metric <value> metric-type <type>'`
- `Use route-map to filter or modify redistributed routes`
- `Ensure redistributed routes exist in routing table`
- `Check for 'redistribute' configuration under OSPF process`

### OSPF Interface Cost Misconfiguration (Severity: MEDIUM)

Configure incorrect OSPF interface cost, causing suboptimal routing or unequal load balancing issues

**Diagnostic Symptoms:**
- Traffic follows suboptimal path
- High-cost path preferred over low-cost path
- Unequal load balancing not working
- Manual cost overrides automatic calculation

**Troubleshooting Commands & Remediation:**
- `Check 'show ip ospf interface' for interface cost`
- `Lower cost = preferred path in OSPF`
- `Default cost calculated from interface bandwidth`
- `Manual cost set with 'ip ospf cost <value>' command`
- `For equal-cost load balancing, ensure costs match`
- `Remove manual cost to use auto-cost based on bandwidth`

### OSPF Loopback Interface Advertisement (Severity: MEDIUM)

Configure loopback interface as host route (/32) instead of actual subnet, causing routing issues

**Diagnostic Symptoms:**
- Loopback advertised as /32 host route
- Routes to loopback subnet not working
- OSPF advertises loopback as host regardless of subnet mask
- Unexpected /32 routes in routing table

**Troubleshooting Commands & Remediation:**
- `OSPF advertises loopback as /32 by default`
- `Use 'ip ospf network point-to-point' to advertise actual subnet`
- `Check 'show ip ospf interface loopback<id>' for network type`
- `Loopback networks commonly used for Router ID or management`
- `/32 advertisement is normal behavior, not necessarily an error`
- `Change to point-to-point only if subnet advertisement needed`

### OSPF Process ID Mismatch (Severity: HIGH)

Configure different OSPF process IDs on interfaces that should be in same OSPF domain

**Diagnostic Symptoms:**
- OSPF neighbors not forming across interfaces
- Separate OSPF processes on same router
- Routes not exchanged between OSPF processes
- Multiple OSPF databases on same router

**Troubleshooting Commands & Remediation:**
- `OSPF process ID is locally significant, doesn't need to match`
- `But all interfaces in same area should use same process`
- `Check 'show ip ospf' for process ID and interfaces`
- `Multiple processes require redistribution to exchange routes`
- `Single process recommended unless multi-vendor isolation needed`
- `Process ID is just a local identifier (1-65535)`

### OSPF Virtual Link Authentication Mismatch (Severity: HIGH)

Configure authentication on a virtual link that does not match the transit area's authentication

**Diagnostic Symptoms:**
- OSPF virtual link fails to establish
- Virtual link neighbor stuck in DOWN state
- Authentication works on physical interfaces but fails on virtual link
- Disconnected area cannot reach backbone

**Troubleshooting Commands & Remediation:**
- `Virtual link inherits transit area's authentication settings`
- `If transit area uses MD5 auth: virtual link must also use MD5`
- `Check 'show ip ospf virtual-links' for virtual link state`
- `Virtual link authentication in 'area <id> virtual-link <rid> authentication'`
- `Key and auth type must match on both ends of the virtual link`
- `Different from interface auth: virtual link auth is per-area`

### OSPF Virtual Link Transit Area Not Reachable (Severity: HIGH)

Configure virtual link but the transit area has no working path between the two endpoints

**Diagnostic Symptoms:**
- Virtual link stays down
- Virtual link endpoint router-id not reachable via transit area
- Transit area routing incomplete
- Area 0 disconnection despite virtual link configured

**Troubleshooting Commands & Remediation:**
- `Virtual link requires the two endpoint Router-IDs to be reachable within transit area`
- `Check 'show ip ospf border-routers' for ABR reachability`
- `Transit area must have full connectivity between the two ABRs`
- `Use 'show ip route <peer-router-id>' from each ABR`
- `If transit area is a stub area: virtual links NOT allowed`
- `Verify: 'area <id> virtual-link <rid>' on both ABRs with matching Router-ID`

### OSPF Distribute-List In / Route Suppression Misconfiguration (Severity: HIGH)

Configure distribute-list in on OSPF that filters legitimate intra-area or inter-area routes

**Diagnostic Symptoms:**
- OSPF routes not installed in routing table despite being in database
- Distribute-list in blocking specific routes
- Intra-area routes missing on specific routers
- Access control filtering too broad

**Troubleshooting Commands & Remediation:**
- `Distribute-list in: 'distribute-list <acl> in [<intf>]'`
- `OSPF installs routes from LSDB to RIB, distribute-list blocks installation`
- `Route still in LSDB ('show ip ospf database') but not in RIB ('show ip route')`
- `ACL permit/deny controls which prefixes get installed`
- `Implicit deny at end of ACL blocks all unpermitted prefixes`
- `Check 'show ip ospf distribute-list' for active filters`

### OSPF Filter-List on ABR / Area Prefix Suppression (Severity: HIGH)

Configure filter-list on ABR blocking Type 3 summary LSAs for specific prefixes between areas

**Diagnostic Symptoms:**
- Specific prefixes not crossing area boundary
- ABR not generating Type 3 summary LSAs for filtered prefixes
- Inter-area routes missing in non-backbone areas
- Filter-list ACL matching wrong prefixes

**Troubleshooting Commands & Remediation:**
- `Filter-list: 'area <id> filter-list prefix <name> in|out' on ABR`
- `Out = prefixes filtered before being advertised into the area`
- `In = prefixes filtered when received from the area`
- `Type 3 LSAs are suppressed entirely (not in LSDB either)`
- `Check 'show ip ospf database summary' for missing Type 3 LSAs`
- `Different from distribute-list: filter-list prevents LSA generation, not RIB install`

### OSPF Interface LSA Filter / Outbound LSA Suppression (Severity: HIGH)

Configure ip ospf database-filter on interface blocking all outbound LSAs

**Diagnostic Symptoms:**
- OSPF neighbor adjacency up but no LSAs received
- Database not synchronized across the link
- One side has complete database, other has empty database
- Routes not advertised across specific interface only

**Troubleshooting Commands & Remediation:**
- `'ip ospf database-filter all out' blocks all outgoing LSAs on an interface`
- `Neighbor adjacency stays up (Hellos still exchanged)`
- `LSDB never synchronizes: missing Type 1, 2, 3, 4, 5 LSAs`
- `Check 'show ip ospf interface <intf>' for database-filter status`
- `Router can receive LSAs but never sends any`
- `Common misconfiguration when trying to optimize LSA flooding`

### OSPF Default-Information Originate Always / Conditional Issue (Severity: HIGH)

Configure default-information originate without 'always' keyword when no default in routing table

**Diagnostic Symptoms:**
- Default route not advertised by ASBR
- Default-information originate configured but OSPF default missing
- No default route in routing table on ASBR itself
- Other routers have no 0.0.0.0/0 in OSPF

**Troubleshooting Commands & Remediation:**
- `'default-information originate' requires a default route in routing table`
- `Without 'always': OSPF does not generate default if no 0.0.0.0/0 exists`
- `With 'always': OSPF always advertises default (even without one in RIB)`
- `Check 'show ip route' for 0.0.0.0/0 on the ASBR`
- `Use 'default-information originate always' for forced advertisement`
- `Set metric and metric-type: 'default-information originate always metric <n> metric-type 1|2'`

### OSPF Default Route Metric / Type Mismatch (Severity: MEDIUM)

Configure OSPF default route with incorrect metric type (E1 vs E2) or metric value

**Diagnostic Symptoms:**
- Default route received but path selection suboptimal
- E1 vs E2 confusion causing routing asymmetry
- Default route metric too high (unreachable) or too low
- Multiple default routes not selecting best path

**Troubleshooting Commands & Remediation:**
- `Metric-type E1 (external + internal cost), E2 (external cost only)`
- `In 'show ip route': 'E1' or 'E2' after OSPF code`
- `E2 default: routers closest to ASBR get same cost as far routers`
- `E1 default: cost accumulates as distance from ASBR increases`
- `Use 'default-information originate metric-type 1|2'`
- `Default metric: 'metric <value>' (default 10 for external routes)`

### OSPF Key-Chain Authentication Rollover Failure (Severity: HIGH)

Configure OSPF MD5/SHA authentication with key-chain but key rollover causes adjacency flap

**Diagnostic Symptoms:**
- OSPF adjacency flapping during key rollover
- Authentication failure with new or old key
- Key send-time mismatch between neighbors
- Brief OSPF outage during rolling key update

**Troubleshooting Commands & Remediation:**
- `Key-chain: multiple keys with send-lifetime/accept-lifetime`
- `Both ends must have overlapping accept periods for old and new keys`
- `Send-lifetime: when router starts sending with new key`
- `Accept-lifetime: when router accepts old key (should overlap with peer's send)`
- `Higher key-ID preferred for sending`
- `Use 'debug ip ospf packet' to see auth key-ID during rollover`

### OSPF Null Authentication / Authentication Migration Issue (Severity: MEDIUM)

Configure 'ip ospf authentication null' on an interface that needs authentication

**Diagnostic Symptoms:**
- OSPF adjacency fails due to authentication type mismatch
- One side uses null auth, other uses MD5
- Authentication migration from null to MD5 incomplete
- Temporary adjacency loss during auth transition

**Troubleshooting Commands & Remediation:**
- `OSPF auth types: 0 (null), 1 (simple password), 2 (MD5 cryptographic)`
- `'ip ospf authentication null' disables auth on that interface`
- `Auth type mismatch: both sides must agree on same auth type`
- `Migration: 'ip ospf authentication message-digest' on both sides`
- `Use 'ip ospf message-digest-key <id> md5 <key>' for MD5`
- `During transition: both sides should have matching key first`

### OSPF Area-Level vs Interface-Level Authentication Conflict (Severity: HIGH)

Configure OSPF authentication at area level but override at interface level inconsistently

**Diagnostic Symptoms:**
- Some interfaces in the same area have different auth settings
- Area authentication enabled but specific interface not matching
- OSPF adjacency works on some links but not others in same area
- Inconsistent authentication across area causing partial connectivity

**Troubleshooting Commands & Remediation:**
- `Area auth: 'area <id> authentication [message-digest]'`
- `Interface auth: 'ip ospf authentication [message-digest|null]'`
- `Interface setting overrides area setting`
- `If area auth enabled but interface uses null auth: adjacency fails`
- `Check 'show ip ospf interface <intf>' for effective auth mode`
- `All interfaces in the same area should use consistent auth`

### OSPF Totally Stubby Area / Type 3 Summary Missing (Severity: HIGH)

Configure totally stubby area but default summary route not generated by ABR

**Diagnostic Symptoms:**
- Totally stubby area routers have no default route
- ABR not injecting Type 3 default summary into totally stubby area
- Area routers cannot reach destinations outside the area
- No inter-area routes (as expected) but also no default

**Troubleshooting Commands & Remediation:**
- `Totally stubby: 'area <id> stub no-summary' on ABR only`
- `Blocks all Type 3/4/5 LSAs into the area (including inter-area routes)`
- `ABR automatically injects Type 3 default (0.0.0.0/0)`
- `If no default: check 'area <id> stub' (without no-summary) on ABR`
- `Non-ABRs in area still use 'area <id> stub' (without no-summary)`
- `Check 'show ip ospf database summary' for default Type 3 LSA`

### OSPF NSSA Type-7 to Type-5 Translation Failure (Severity: HIGH)

Configure NSSA ABR but Type-7 LSAs not translated to Type-5 for other areas

**Diagnostic Symptoms:**
- External routes from NSSA area not reaching other areas
- Type-7 LSAs present in NSSA but missing as Type-5 in backbone
- Translation flag not set on NSSA ABR
- P-bit incorrectly set or cleared

**Troubleshooting Commands & Remediation:**
- `NSSA Type-7 LSAs carry external routes within the NSSA`
- `Only the ABR with highest Router-ID translates Type-7 to Type-5`
- `Translation election: 'show ip ospf' for 'NSSA Translator' status`
- `P-bit (propagate bit) determines which Type-7 to translate`
- `If P-bit not set: LSA stays within NSSA, not advertised to other areas`
- `Use 'area <id> nssa translate type7 suppress-fa' for forwarding address`

### OSPF NSSA Default Route / No-Redistribution Flag Issue (Severity: HIGH)

Configure NSSA area with no-redistribution flag preventing Type-7 default route generation

**Diagnostic Symptoms:**
- NSSA routers have no default route
- NSSA area with no-redistribution not getting default
- ABR not injecting Type-7 default into NSSA
- External connectivity from NSSA broken

**Troubleshooting Commands & Remediation:**
- `'area <id> nssa [no-redistribution] [default-information-originate]'`
- `no-redistribution: prevents redistributed routes from entering NSSA`
- `default-information-originate: generates Type-7 default into NSSA`
- `Without 'default-information-originate': no default injected`
- `With 'no-redistribution': redistributed routes blocked but default still injected if configured`
- `Check 'show ip ospf database nssa-external' for Type-7 default`

### OSPF Area Default-Cost / Summary Path Cost Misconfiguration (Severity: MEDIUM)

Configure area default-cost on ABR with incorrect metric for stub/NSSA default route

**Diagnostic Symptoms:**
- Default route cost into stub/NSSA area too high or too low
- Multiple ABRs inject default with same cost (no load balancing)
- Suboptimal exit path from the area
- Traffic always exits through same ABR regardless of cost

**Troubleshooting Commands & Remediation:**
- `'area <id> default-cost <cost>' sets the metric of the default route into the area`
- `Default cost: 1 by default`
- `Higher cost = less preferred exit from the area`
- `Set different costs on different ABRs for primary/backup exit`
- `Only applies to stub/NSSA/totally-stubby areas`
- `Check 'show ip ospf database summary' for default route cost`

