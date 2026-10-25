---
name: "IS-IS Issues Injection"
description: "IS-IS routing protocol related network faults for troubleshooting practice"
category: "computer-networking"
---

# IS-IS Issues Injection

IS-IS routing protocol related network faults for troubleshooting practice

## Supported Protocols
- isis

## Fault Injection Scenarios & Troubleshooting Procedures

### IS-IS Area Address Mismatch (Severity: HIGH)

Configure different IS-IS area addresses on neighboring routers

**Diagnostic Symptoms:**
- IS-IS adjacency fails to form
- Level 1 adjacency cannot form across different areas
- Level 2 adjacency works but Level 1 does not
- Routes not exchanged between areas

**Troubleshooting Commands & Remediation:**
- `Check IS-IS adjacency with 'show isis neighbors'`
- `Verify NET (Network Entity Title) addresses`
- `Level 1 adjacencies require matching area ID`
- `Level 2 adjacencies work across different areas`
- `NET format: XX.XXXX.XXXX.XXXX.XX (area.system-id.sel)`
- `Use 'show clns is-neighbors' for CLNS neighbor info`

### IS-IS Circuit Level Mismatch (Severity: HIGH)

Configure different IS-IS circuit types (Level 1 vs Level 2) on connected interfaces

**Diagnostic Symptoms:**
- IS-IS adjacency not forming on expected level
- Level 1-only router cannot form L2 adjacency
- L1/L2 router only forms L1 adjacency with L1 neighbor
- Routes missing due to level mismatch

**Troubleshooting Commands & Remediation:**
- `Check IS-IS level with 'show isis interface'`
- `Use 'isis circuit-type level-1' or 'level-2' or 'level-1-2'`
- `Level-1-2 is the default on most platforms`
- `Level 1 routers only know about their area`
- `Level 2 routers know about inter-area topology`
- `Level 2 backbone must be contiguous`

### IS-IS Network Type Mismatch (Severity: HIGH)

Configure wrong IS-IS network type (broadcast vs point-to-point)

**Diagnostic Symptoms:**
- IS-IS adjacency issues on point-to-point links
- DIS election occurring on P2P link
- LSP flooding inefficiency
- IS-IS hello packet size mismatch

**Troubleshooting Commands & Remediation:**
- `Check IS-IS network type with 'show isis interface'`
- `Use 'isis network point-to-point' on P2P links`
- `Broadcast requires DIS election, P2P does not`
- `P2P adjacency uses three-way handshake`
- `P2P avoids DIS election overhead`
- `Broadcast type uses 10s hello, P2P uses 3.3s hello (default)`

### IS-IS DIS Election Manipulation (Severity: MEDIUM)

Set wrong IS-IS priority to influence DIS election on broadcast links

**Diagnostic Symptoms:**
- Unexpected router elected as DIS
- Suboptimal LSP flooding topology
- DIS election not as designed
- LSP database synchronization delays

**Troubleshooting Commands & Remediation:**
- `Check DIS with 'show isis database' or 'show isis interface'`
- `Higher DIS priority wins (default 64)`
- `Priority 0 can still become DIS (unlike OSPF DR)`
- `DIS generates pseudonode LSPs`
- `DIS election is preemptive (unlike OSPF)`
- `Use 'isis priority <0-127>' to influence election`

### IS-IS Hello Timer Mismatch (Severity: MEDIUM)

Configure non-standard IS-IS hello timers causing slow convergence or adjacency flapping

**Diagnostic Symptoms:**
- Slow IS-IS convergence after link failure
- IS-IS adjacency flapping
- Hello timer mismatch on different circuits
- Hold time mismatches causing adjacency teardown

**Troubleshooting Commands & Remediation:**
- `Check IS-IS timers with 'show isis interface detail'`
- `Hello timer default: L1=10s broadcast, 3.3s P2P`
- `Use 'isis hello-interval <seconds>' per interface`
- `Hold multiplier default is 3 (3x hello interval)`
- `BFD integration recommended for sub-second convergence`
- `Use 'isis hello-multiplier <value>' to adjust hold time`

### IS-IS Authentication Mismatch (Severity: HIGH)

Configure IS-IS authentication on one side but not the other, or use different keys

**Diagnostic Symptoms:**
- IS-IS adjacency fails when authentication enabled
- Authentication errors in IS-IS logs
- LSPs/SNPs rejected due to auth failure
- Neighbor state stuck in INIT

**Troubleshooting Commands & Remediation:**
- `IS-IS authenticates: HELLO, LSP, SNP (CSNP, PSNP) PDUs`
- `Use 'isis authentication mode text|md5' per circuit`
- `Use 'area-password' or 'domain-password' for area/domain`
- `Auth key-chain: 'isis authentication key-chain <name>'`
- `Verify key IDs and key strings match across neighbors`
- `Enable 'isis authentication send-only' for gradual migration`

### IS-IS Metric Manipulation (Severity: MEDIUM)

Set incorrect IS-IS metric (narrow vs wide) causing suboptimal routing

**Diagnostic Symptoms:**
- Suboptimal IS-IS path selection
- Narrow-style metric wrapping (max 63)
- Inconsistent metric style between areas
- Routes with unexpected metrics

**Troubleshooting Commands & Remediation:**
- `Check metric style with 'show isis database'`
- `Narrow metric: 1-63 default, max path 1023`
- `Wide metric: 1-16777215, supports TE`
- `Use 'metric-style wide' under router isis`
- `All routers in the domain must use consistent metric style`
- `Transition: 'metric-style transition' during migration`

### IS-IS P2P Three-Way Handshake Failure (Severity: HIGH)

Configure point-to-point IS-IS adjacency but three-way handshake fails due to mismatched parameters or unidirectional connectivity

**Diagnostic Symptoms:**
- IS-IS adjacency stuck in INIT state on P2P link
- Adjacency flapping on point-to-point interface
- Only one side sees adjacency as up
- LSPs not exchanged despite hello seen

**Troubleshooting Commands & Remediation:**
- `P2P uses IS-IS three-way handshake (RFC 5303)`
- `Check 'show isis neighbors' for adjacency state`
- `Adjacency requires both TLV 240 (three-way handshake)`
- `Verify bi-directional Layer 2 connectivity`
- `Check interface MTU - IS-IS sensitive to MTU mismatch`
- `Use 'debug isis adj-packets' for adjacency failures`

### IS-IS MTU Mismatch / LSP Fragmentation (Severity: HIGH)

Configure interface MTU too small for IS-IS LSPs, causing adjacency failure or LSP flooding issues

**Diagnostic Symptoms:**
- IS-IS adjacency fails to form on low MTU links
- LSPs larger than interface MTU not flooded
- Partial link-state database on some routers
- IS-IS database out of sync across network

**Troubleshooting Commands & Remediation:**
- `IS-IS encodes routing info directly into LSPs (no IP encapsulation)`
- `Minimum MTU for IS-IS is 1492 bytes (default LSP MTU)`
- `Check 'show isis interface' for LSP MTU`
- `Use 'isis lsp-mtu <bytes>' to reduce LSP size on constrained links`
- `LSP fragmentation occurs when LSP > interface MTU`
- `Smaller LSP MTU means more LSP fragments for large databases`

### IS-IS Passive Interface Blocking Adjacency (Severity: HIGH)

Configure passive-interface under IS-IS, preventing neighbor adjacency on intended interface

**Diagnostic Symptoms:**
- IS-IS not running on specific interface
- No IIHs (IS-IS Hellos) sent on the interface
- Adjacency not forming on passive interface
- Interface not listed in IS-IS interface list

**Troubleshooting Commands & Remediation:**
- `Check 'show isis interface' - passive interfaces not listed`
- `Use 'passive-interface default' then 'no passive-interface <intf>'`
- `Passive interface still advertises connected subnet`
- `Verify 'show running-config | section router isis'`
- `BFD integration cannot work on passive interfaces`
- `Useful for loopbacks but not for links with IS-IS neighbors`

### IS-IS Adjacency Filtering / ACL Blocking Hellos (Severity: HIGH)

Configure ACL filtering IS-IS Hellos on interface, preventing adjacency establishment

**Diagnostic Symptoms:**
- IS-IS adjacency cannot form on filtered interface
- No IIHs received or sent
- Access list blocking CLNS (protocol 0xFE) or Layer 2 multicast
- IS-IS not running on interface despite IS-IS configuration

**Troubleshooting Commands & Remediation:**
- `IS-IS runs directly over Layer 2 (not IP)`
- `IS-IS uses multicast MAC 0180.C200.0014/0015 (L1/L2)`
- `Check ACL for 'deny 0xFE' (CLNS) or 'deny isis'`
- `Verify interface ACL does not block IS-IS`
- `IS-IS fails if ACL blocks CLNS regardless of IP reachability`
- `Check 'show isis interface' for IS-IS operational status`

### IS-IS Overload Bit Set (Severity: MEDIUM)

Set IS-IS overload bit on router, causing other routers to not use it for transit traffic despite having reachability

**Diagnostic Symptoms:**
- Router not used for transit traffic despite having routes
- Overload bit set in LSP - other routers avoid transit
- Router still reachable but traffic bypasses it
- Intended for BGP-free core or maintenance but misapplied

**Troubleshooting Commands & Remediation:**
- `Check 'show isis database <router>' for overload (OL) flag`
- `Set with 'set-overload-bit' under router isis`
- `Overload bit signals: do not use me for transit`
- `Common during BGP convergence or router boot`
- `Use 'set-overload-bit on-startup <seconds>' for planned maintenance`
- `Attached bit (ATT) different from overload bit (OL)`

### IS-IS LSP Corruption / Database Mismatch (Severity: HIGH)

Configure conditions causing LSP corruption or database inconsistency between IS-IS neighbors

**Diagnostic Symptoms:**
- IS-IS database out of sync between routers
- LSP checksum errors in logs
- Rejected LSPs due to corruption
- Route flapping with LSP re-synchronization

**Troubleshooting Commands & Remediation:**
- `Check 'show isis database' for sequence numbers and checksums`
- `LSP corruption causes CSNP/PSNP requests for retransmission`
- `Verify interface MTU consistent across the network`
- `Check for flapping links causing LSP regeneration`
- `Use 'show isis database detail' for LSP contents`
- `Clear database with 'clear isis *' only in maintenance window`

### IS-IS LSP Lifetime / Refresh Issue (Severity: MEDIUM)

Configure IS-IS LSP Max-Age or refresh interval incorrectly, causing LSPs to expire prematurely or never expire

**Diagnostic Symptoms:**
- LSPs expiring before being refreshed
- Routes disappearing intermittently
- LSP zero-age removal from database
- High LSP regeneration rate

**Troubleshooting Commands & Remediation:**
- `Default LSP Max-Age is 1200 seconds (20 minutes)`
- `LSP refresh every 900 seconds (15 minutes) by default`
- `Check 'show isis database <lspid>' for remaining lifetime`
- `Use 'lsp-refresh-interval <seconds>' to adjust refresh rate`
- `Use 'max-lsp-lifetime <seconds>' to adjust maximum age`
- `Refresh must complete before max-lifetime expires`

### IS-IS LSP Flooding Blocked (Severity: HIGH)

Configure interface or network conditions blocking IS-IS LSP flooding, causing database inconsistency

**Diagnostic Symptoms:**
- IS-IS database not synchronized across network
- Some routers missing LSPs present on other routers
- CSNP/PSNP mismatches between neighbors
- Incomplete routing table on some routers

**Troubleshooting Commands & Remediation:**
- `IS-IS flooding: LSPs sent on all interfaces except received interface`
- `Check 'show isis interface' for flooding status`
- `Verify interface not configured for mesh-group incorrectly`
- `Mesh groups limit flooding scope - may be too restrictive`
- `Check 'show isis database' for sequence number consistency`
- `CSNP sent every 10s on broadcast (DIS), PSNP for ack on P2P`

### IS-IS LSP Generation Throttling Issue (Severity: MEDIUM)

Configure LSP generation throttling incorrectly, slowing convergence or overwhelming routers with LSP updates

**Diagnostic Symptoms:**
- Slow IS-IS convergence after network change
- LSP generation delayed beyond expected time
- Multiple LSPs generated rapidly for single event
- Excessive LSP generation causing CPU spikes

**Troubleshooting Commands & Remediation:**
- `Use 'lsp-gen-interval [level-1|level-2] <max-wait> [init-wait] [second-wait]'`
- `Default: max-wait 5000ms, init-wait 50ms, second-wait 5000ms`
- `Too aggressive: LSP generation can flood network`
- `Too conservative: slow convergence`
- `Check 'show isis traffic' for LSP counters`
- `Balance between convergence speed and stability`

### IS-IS Route Redistribution Error (Severity: HIGH)

Configure redistribution from other protocols into IS-IS incorrectly, causing missing routes or routing loops

**Diagnostic Symptoms:**
- Redistributed routes not appearing in IS-IS LSPs
- Broken connectivity to external networks via IS-IS
- Metric of redistributed routes incorrect
- Redistribution creating suboptimal routing

**Troubleshooting Commands & Remediation:**
- `Use 'redistribute <protocol> [metric <value>] [metric-type {external|internal}]'`
- `IS-IS default metric for redistributed routes is 0 (narrow) or tunable`
- `Use route-map for selective redistribution`
- `Set metric-type: internal (IP metric = IS-IS metric) or external (fixed default)`
- `Verify 'show isis database detail' for redistributed routes`
- `Check for redistribution loops: route from IS-IS redistributed back into IS-IS`

### IS-IS Default Route Propagation Issue (Severity: HIGH)

Configure default route in IS-IS but propagation fails due to attached bit rules or redistribution issues

**Diagnostic Symptoms:**
- Default route not present in Level 1 area
- L1 routers have no default route to L2 backbone
- Attached (ATT) bit not set on L1/L2 routers
- Static default not advertised via IS-IS

**Troubleshooting Commands & Remediation:**
- `L1/L2 router automatically sets ATT bit in L1 LSP`
- `L1 routers install default route pointing to closest L1/L2 router`
- `ATT bit: 0 means no default route generated`
- `To advertise default: L1/L2 router must have L2 route to 0.0.0.0`
- `External default: 'redistribute static' with static default route`
- `Check 'show isis database' for ATT bit in L1 LSP`

### IS-IS Route Summarization Error (Severity: MEDIUM)

Configure IS-IS route summarization incorrectly on L1/L2 routers, causing black holes or missing routes

**Diagnostic Symptoms:**
- Summary route missing from L2 database
- Traffic black holes for subnets within summary
- More specific routes leaking unnecessarily to L2
- Summary metric calculation incorrect

**Troubleshooting Commands & Remediation:**
- `Summarize on L1/L2 routers towards L2 backbone`
- `Use 'summary-address <network> [mask] [level-1|level-2]'`
- `Summary suppresses more specific routes across levels`
- `Metric of summary route derived from component routes`
- `Verify all component routes exist before summary generation`
- `Use 'summary-address ... tag <value>' for policy routing`

### IS-IS L1/L2 Route Leaking Error (Severity: HIGH)

Configure IS-IS route leaking between levels incorrectly, preventing inter-area routing or leaking too many routes

**Diagnostic Symptoms:**
- L1 routers lack specific routes to other areas (only default)
- L2 database too large due to unnecessary L1 specifics
- Up/down bit preventing route re-advertisement
- Suboptimal routing between areas

**Troubleshooting Commands & Remediation:**
- `L1 routers only know their area + default route by default`
- `Use 'advertise' under L2 route policy to leak specific prefixes`
- `Up/down bit set on leaked routes prevents re-leaking`
- `Use route-map to control which routes are leaked`
- `Check 'show isis database <lspid>' for up/down bit`
- `Route leaking increases L1 routing table size`

### IS-IS Wide Metric Transition Misconfiguration (Severity: HIGH)

Configure IS-IS metric style transition incorrectly, causing inconsistent metrics and suboptimal routing

**Diagnostic Symptoms:**
- Some routers use narrow metric, others use wide
- Metric mismatch causing route suppression
- 'show isis database' shows both old and new style
- Routes with unexpected metric values

**Troubleshooting Commands & Remediation:**
- `Use 'metric-style transition' for gradual migration`
- `Transition mode generates both narrow and wide TLV metrics`
- `All routers in domain should eventually use 'metric-style wide'`
- `Narrow max metric: 63 per link, 1023 total path`
- `Wide max metric: 16777215 per link, supports TE`
- `Check 'show isis database' for TLV types (128/130 narrow, 135/140 wide)`

### IS-IS TE Metric Misconfiguration (Severity: MEDIUM)

Configure IS-IS TE metric (administrative weight) incorrectly, causing suboptimal MPLS-TE path calculation

**Diagnostic Symptoms:**
- MPLS-TE tunnels using suboptimal paths
- TE metric conflicting with IS-IS metric
- TE calculated path not matching expected path
- TE metric not propagated in IS-IS LSPs

**Troubleshooting Commands & Remediation:**
- `TE metric is separate from IS-IS default metric`
- `Use 'isis metric <value> level-1|level-2 te' for TE metric`
- `TE metric carried in TLV 134 (wide metric only)`
- `MPLS-TE CSPF uses TE metric instead of default metric`
- `Check 'show isis interface detail' for TE metric`
- `Default TE metric = standard IS-IS metric if not configured`

### IS-IS Equal-Cost Load Balancing Issue (Severity: MEDIUM)

Configure IS-IS with multiple equal-cost paths but load balancing not working or maximum-paths limit reached

**Diagnostic Symptoms:**
- Only one path installed despite multiple equal-cost IS-IS paths
- Load balancing not distributing traffic across all paths
- IS-IS path count limit preventing utilization of available paths
- Uneven traffic distribution across equal-cost links

**Troubleshooting Commands & Remediation:**
- `Check 'show ip route <prefix>' for number of IS-IS paths`
- `Default maximum-paths varies by platform (4, 6, 8, 16)`
- `Use 'maximum-paths <number>' to increase path count`
- `All equal-cost paths must have identical metric`
- `Check 'show ip protocols' for IS-IS maximum paths`
- `Verify CEF per-packet or per-destination load balancing`

### IS-IS BFD Integration Failure (Severity: MEDIUM)

Configure BFD for IS-IS but integration fails, leaving sub-second failure detection not operational

**Diagnostic Symptoms:**
- IS-IS convergence still slow after link failure
- BFD session not established for IS-IS neighbor
- BFD down not triggering IS-IS adjacency teardown
- Sub-second detection not working as expected

**Troubleshooting Commands & Remediation:**
- `Use 'isis bfd' under interface for BFD integration`
- `Check 'show bfd neighbors' for BFD session status`
- `BFD interval determines detection speed (default: 150ms x 3)`
- `Both sides must have BFD configured and compatible timers`
- `IS-IS must have BFD enabled before BFD session starts`
- `BFD failure triggers immediate IS-IS adjacency reset`

### IS-IS Attached Bit Not Set on L1/L2 Router (Severity: CRITICAL)

Configure L1/L2 IS-IS router but attached (ATT) bit not set in L1 LSP, preventing L1 routers from installing default route

**Diagnostic Symptoms:**
- L1 routers have no default route to L2 backbone
- L1 routers cannot reach destinations outside their area
- ATT bit missing from L1/L2 router's L1 LSP
- Inter-area connectivity broken for L1-only routers

**Troubleshooting Commands & Remediation:**
- `ATT bit automatically set if router has L2 adjacencies and L1 configured`
- `Check 'show isis database' for ATT bit (look for 'ATT' flag)`
- `L1/L2 router must have at least one L2 adjacency to set ATT bit`
- `If L2 adjacency lost, ATT bit cleared automatically`
- `Manual override: 'attached-bit advertise [never|receive]'`
- `L2 adjacency failure = no ATT bit = no default for L1`

### IS-IS LSP Fragmentation / Fragment Threshold Issue (Severity: MEDIUM)

Configure IS-IS with large routing database causing LSP fragmentation, or fragment threshold incorrectly set

**Diagnostic Symptoms:**
- IS-IS LSP split into many fragments
- Fragment sequence numbers exceeding threshold
- LSP database large due to excessive fragmentation
- Performance impact from many LSP fragments

**Troubleshooting Commands & Remediation:**
- `LSP MTU limits single LSP size (default 1492 bytes)`
- `Each additional 1492 bytes = one more LSP fragment`
- `Check 'show isis database' for number of fragments per LSP ID`
- `Use 'lsp-mtu <bytes>' to increase LSP size (reduces fragments)`
- `LSP ID format: Router-ID.Fragment-ID (e.g. 0000.0000.0001.00-00)`
- `Maximum fragments: platform-dependent (typically 256)`

### IS-IS Circuit Level Shutdown Misconfiguration (Severity: HIGH)

Configure IS-IS circuit level shutdown on interface, disabling Level 1 or Level 2 operation incorrectly

**Diagnostic Symptoms:**
- IS-IS not forming adjacency at expected level
- L1 adjacency works but L2 does not (or vice versa)
- Circuit shutdown accidentally blocking all IS-IS on interface
- Adjacency missing at one level only

**Troubleshooting Commands & Remediation:**
- `Use 'isis circuit-type level-1|level-2|level-1-2'`
- `Level-1-2 is default on most platforms (enables both levels)`
- `Shutdown circuit-level blocks only that level`
- `Check 'show isis interface' for circuit type status`
- `If circuit-type level-1, L2 adjacency will not form`
- `Useful for controlling which circuits carry L2 backbone`

### IS-IS for IPv6 (IPv6 AF) Configuration Error (Severity: HIGH)

Configure IS-IS for IPv6 routing incorrectly, preventing IPv6 route exchange over IS-IS

**Diagnostic Symptoms:**
- IPv6 routes not exchanged via IS-IS
- IS-IS IPv6 address family not active
- IPv6 TLVs missing from LSPs
- IPv6 reachability not working across IS-IS domain

**Troubleshooting Commands & Remediation:**
- `Enable IPv6: 'ipv6 router isis' and 'ipv6 isis' under interface`
- `IS-IS uses IPv6 TLVs: IPv6 Interface Address (232), IPv6 Reachability (236)`
- `Requires wide metrics globally (metric-style wide)`
- `Check 'show isis database detail' for IPv6 TLVs`
- `Multi-topology IPv6: separate SPF for IPv4 and IPv6`
- `Single-topology IPv6: same SPF, same metric, both must be consistent`

### IS-IS Multi-Topology (MT) Routing Misconfiguration (Severity: HIGH)

Configure IS-IS multi-topology incorrectly, causing IPv4/IPv6 topology inconsistency or MT-ID mismatch

**Diagnostic Symptoms:**
- Multi-topology IPv6 adjacencies failing
- MT-ID mismatch preventing adjacency
- IPv6 routing table empty despite IPv6 enabled
- Topology IDs not matching between neighbors

**Troubleshooting Commands & Remediation:**
- `MT uses MT-ID: IPv4 unicast=0, IPv6 unicast=2, IPv4 multicast=3, etc.`
- `MT-IPv6 uses separate SPF from IPv4`
- `Use 'address-family ipv6' with multi-topology under router isis`
- `Check 'show isis interface' for enabled multi-topologies`
- `MT requires all routers in area to support same topologies`
- `MT allows IPv6 even if IPv4 topology has issues`

### IS-IS Segment Routing Global Block (SRGB) Misconfiguration (Severity: CRITICAL)

Configure IS-IS SRGB (Segment Routing Global Block) inconsistently across domain, causing SID conflicts

**Diagnostic Symptoms:**
- Prefix-SID conflicts in IS-IS domain
- SRGB range overlapping between routers
- SID allocation failures
- MPLS label conflict for SR prefix-SIDs

**Troubleshooting Commands & Remediation:**
- `SRGB range must be consistent across all routers in domain`
- `Default SRGB: 16000-23999 (8000 labels)`
- `Check 'show isis database' for prefix-SID sub-TLV`
- `Use 'prefix-sid map <address> <index>' for explicit SID`
- `Each prefix requires unique SID index within SRGB`
- `SRGB mismatch causes label forwarding errors`

### IS-IS Key-Chain Rollover / HMAC-SHA Authentication (Severity: MEDIUM)

Configure IS-IS key-chain authentication incorrectly during key rollover, causing authentication failures

**Diagnostic Symptoms:**
- IS-IS adjacency drops during key rollover
- Authentication failures with new key
- Key chain send/accept times misaligned
- HMAC-SHA key mismatch between peers

**Troubleshooting Commands & Remediation:**
- `Use 'isis authentication mode hmac-sha-256 <key-chain>'`
- `Key-chain send-lifetime and accept-lifetime must overlap between peers`
- `Different key IDs for old/new keys during transition`
- `Higher key-ID preferred for sending (Cisco)`
- `Ensure all routers synchronize time via NTP`
- `Use 'send-only' during transition to avoid adjacency loss`

### IS-IS CSNP/PSNP Authentication Mismatch (Severity: HIGH)

Configure IS-IS SNP (Sequence Number PDU) authentication but CSNP/PSNP filtering prevents reliable database exchange

**Diagnostic Symptoms:**
- LSP database out of sync despite adjacency up
- CSNP/PSNP rejected due to authentication failure
- LSPs requested via PSNP but never received
- Database synchronization incomplete

**Troubleshooting Commands & Remediation:**
- `IS-IS can authenticate: IIH, LSP, and SNP PDUs separately`
- `Use 'isis authentication mode md5' for all PDU types`
- `Or: 'isis authentication mode md5 hello|lsp|snp' per PDU type`
- `CSNP/PSNP auth failures prevent database synchronization`
- `Check auth settings with 'show isis interface detail'`
- `Ensure SNP auth matches on all routers in the network`

### IS-IS LSP Rate Limiting / Max-LSP Issues (Severity: MEDIUM)

Configure IS-IS LSP rate limiting too restrictively or generate LSPs too fast, causing LSP drops

**Diagnostic Symptoms:**
- LSPs not flooded at expected rate
- IS-IS convergence slower than expected
- LSP ignore/drop due to rate limiting
- Excessive LSP retransmission requests

**Troubleshooting Commands & Remediation:**
- `Use 'lsp-gen-interval l1/l2 <max-wait>' to tune generation`
- `Use 'lsp-pacing-interval <milliseconds>' for LSP spacing`
- `Default: LSP pacing interval 33ms (30 LSPs/sec)`
- `Too conservative: slow flooding after convergence event`
- `Too aggressive: may cause CPU spikes on receiving routers`
- `Check 'show isis traffic' for LSP counters and drops`

