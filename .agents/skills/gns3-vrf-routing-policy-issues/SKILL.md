---
name: "VRF/Routing Policy Issues Injection"
description: "VRF/VRF-lite and routing policy related network faults for troubleshooting practice"
category: "computer-networking"
---

# VRF/Routing Policy Issues Injection

VRF/VRF-lite and routing policy related network faults for troubleshooting practice

## Supported Protocols
- vrf
- mpls-vpn
- routing-policy
- route-map

## Fault Injection Scenarios & Troubleshooting Procedures

### VRF Route Target Import/Export Mismatch (Severity: HIGH)

Configure incorrect route-target import or export on VRF

**Diagnostic Symptoms:**
- VRF routes not imported from MP-BGP
- Routes not exported from VRF to MP-BGP
- CE routes not propagated to remote PEs
- Incomplete VRF routing table

**Troubleshooting Commands & Remediation:**
- `Check VRF RT with 'show ip vrf detail <name>'`
- `Verify 'route-target import <RT>' and 'export <RT>'`
- `Check 'show ip bgp vpnv4 vrf <name>' for VRF routes`
- `RT must match between import on one side and export on the other`
- `Use 'show ip bgp vpnv4 all <prefix>' to verify RT attributes`
- `Verify send-community extended is enabled on BGP peers`

### VRF Route Distinguisher Duplicate (Severity: MEDIUM)

Configure duplicate route distinguisher for different VRFs across PEs

**Diagnostic Symptoms:**
- Route conflicts between different VRFs
- Duplicate RD causes route hiding
- Wrong VRF routes imported on remote PE
- Routing table corruption

**Troubleshooting Commands & Remediation:**
- `Check VRF RD with 'show ip vrf detail <name>'`
- `Each VRF on each PE should have a unique RD`
- `RD format: <AS>:<value> or <IP>:<value>`
- `Duplicate RDs across different VRFs can cause issues`
- `Auto-derived RD from VPN ID may conflict`
- `Use manually assigned unique RD per VRF per PE`

### VRF Forwarding Interface Misconfiguration (Severity: HIGH)

Configure VRF forwarding on wrong interface or missing VRF on interface

**Diagnostic Symptoms:**
- Interface not in the correct VRF
- IP address removed when VRF assigned
- CE connection in wrong VRF
- Traffic routing to wrong VRF

**Troubleshooting Commands & Remediation:**
- `Check VRF interface with 'show ip vrf interfaces <name>'`
- `Use 'ip vrf forwarding <name>' on interface`
- `Assigning VRF removes IP address (must re-add)`
- `Verify interface IP is within VRF's correct subnet`
- `Check 'show ip route vrf <name>' for VRF routing table`
- `CE-facing interfaces must be in the correct VRF`

### VRF Route Leak Misconfiguration (Severity: HIGH)

Configure incorrect VRF route leaking between VRFs or between global and VRF

**Diagnostic Symptoms:**
- Routes leaking between wrong VRFs
- VRF routes not appearing in global routing table
- Global routes not imported into VRF
- Cross-VRF reachability issues

**Troubleshooting Commands & Remediation:**
- `Use route-leaking between VRFs with VRF-lite`
- `Configure 'ip route vrf <src> <prefix> <nh> global' for leaking`
- `Use route-replicate between VRFs on some platforms`
- `BGP-based VRF route leaking using RT import/export`
- `Check 'show ip route vrf <name>' for leaked routes`
- `Verify route-maps filter leaked routes correctly`

### Prefix-List Match Criteria Error (Severity: HIGH)

Configure prefix-list with incorrect prefix length range or wrong network

**Diagnostic Symptoms:**
- Prefix-list filtering too broad or too narrow
- Expected prefixes not matched
- Unexpected prefixes matched
- Route filtering not working as intended

**Troubleshooting Commands & Remediation:**
- `Check prefix-list with 'show ip prefix-list <name>'`
- `Format: 'ip prefix-list <name> seq <n> permit|deny <prefix>/<len> [ge <min>] [le <max>]'`
- `Without ge/le: exact prefix length match`
- `ge = greater-than-or-equal, le = less-than-or-equal`
- `Use 'show ip prefix-list <name> summary' for overview`
- `Test with 'show ip prefix-list <name> <prefix>/<len>'`

### Route-Map Conditional Logic Error (Severity: HIGH)

Configure route-map with incorrect permit/deny logic or missing conditions

**Diagnostic Symptoms:**
- Route-map not matching expected routes
- Routes permitted when they should be denied
- Routes denied when they should be permitted
- Multiple match conditions not working as AND/OR

**Troubleshooting Commands & Remediation:**
- `Check route-map with 'show route-map <name>'`
- `Permit allows or sets attributes; deny prevents further matching`
- `Multiple match commands in same sequence = AND`
- `Multiple sequence entries = OR`
- `Implicit deny at end of route-map (like ACL)`
- `Use 'set community' or 'set metric' in permit entries`

### Set AS Path in Route-Map Error (Severity: LOW)

Configure set as-path prepend in route-map incorrectly

**Diagnostic Symptoms:**
- AS path prepend not working as expected
- Wrong AS number prepended
- AS path prepend preventing route acceptance
- BGP best path selection not affected as intended

**Troubleshooting Commands & Remediation:**
- `Check AS path attributes with 'show ip bgp <prefix>'`
- `Use 'set as-path prepend <AS>' in route-map`
- `Prepend your own AS number typically`
- `Some peers reject routes with certain AS prepend patterns`
- `Use 'set as-path tag' for compatibility with other protocols`
- `Verify route-map is applied in the correct direction (in/out)`

### VRF Route-Target Filter (RTF) Misconfiguration (Severity: HIGH)

Configure VRF route-target filter incorrectly causing VPN route import issues

**Diagnostic Symptoms:**
- VPN routes not imported into VRF despite matching RT
- RT filter blocking legitimate routes
- PE not importing routes from specific RT
- VRF routing table incomplete

**Troubleshooting Commands & Remediation:**
- `RT filter: PE only accepts VPN routes whose RT matches a local VRF`
- `Use 'no bgp default route-target filter' to accept all VPN routes`
- `Check with 'show ip bgp vpnv4 all' for filtered routes`
- `RT filter reduces BGP table but may block needed routes`
- `Use 'show ip bgp vpnv4 all <prefix>' to check RT attributes`
- `Verify send-community extended is configured on BGP sessions`

### VRF Backdoor Route / Route Import Conflict (Severity: HIGH)

Configure VRF with backdoor routes overlapping with VPN-learned prefixes

**Diagnostic Symptoms:**
- Backdoor static/IGP route not installed in VRF
- VPN route preferred over backdoor route
- CE-to-CE traffic not using backdoor path
- Suboptimal routing in multi-homed CE scenario

**Troubleshooting Commands & Remediation:**
- `Backdoor route: local VRF route preferred over VPN learned`
- `Use 'ip route vrf <name> <prefix> <mask> <nh>' with lower AD`
- `VPN routes have AD of 200 (iBGP learned)`
- `Check 'show ip route vrf <name>' for route preference`
- `Use distance command under BGP for per-VRF AD adjustment`
- `Alternatively: use route-map to filter unwanted VPN routes`

### BGP Community List ACL / Filter Misconfiguration (Severity: HIGH)

Configure community-list with wrong regex or matching causing route filtering errors

**Diagnostic Symptoms:**
- Community-based route filtering not working
- Community list matching wrong communities
- Route-map with community-list not matching expected routes
- Communities not present in BGP updates

**Troubleshooting Commands & Remediation:**
- `Check community list: 'show ip community-list <name>'`
- `Format: 'ip community-list <name> permit <community>'`
- `Community format: <high-16bits>:<low-16bits> (e.g., 100:200)`
- `Use regex: 'ip community-list regex <name> permit <regex>'`
- `Extended community list for VPN Route-Target`
- `Match in route-map: 'match community <list-name>'`

### Routing Policy Tag / Match Tag Mismatch (Severity: HIGH)

Configure route-tag in redistribution but match tag condition not matching correctly

**Diagnostic Symptoms:**
- Route-map match tag not matching redistributed routes
- Tag not preserved across protocol boundaries
- Route redistribution filtering based on tag not working
- Tag value unexpected or missing

**Troubleshooting Commands & Remediation:**
- `Set tag: 'set tag <value>' in route-map`
- `Match tag: 'match tag <value-list>' in route-map for filtering`
- `Tags are preserved across redistribution boundaries`
- `Check tag of route: 'show ip route <prefix>' (look for 'tag' field)`
- `Tag is 32-bit value (0-4294967295)`
- `Common use: prevent redistribution loops by tagging specific routes`

### Routing Policy Sequence Number / Continue Statement Issue (Severity: LOW)

Configure route-map with continue statement but sequence evaluation not as expected

**Diagnostic Symptoms:**
- Route-map continue statement not jumping to next sequence
- Policy evaluation order not as designed
- Continue bypassing intended matches
- Multiple set operations from different sequences overlapping

**Troubleshooting Commands & Remediation:**
- `Continue: route-map continues to next sequence after match`
- `Use 'continue <seq>' in route-map entry for multi-sequence processing`
- `Default: route-map stops after first match`
- `Continue allows multiple sequences to be evaluated`
- `Each matched sequence can set different attributes`
- `Check 'show route-map <name>' for per-sequence stats (matches/mismatches)`

### VRF Forwarding / VRF-Aware Service Misconfiguration (Severity: HIGH)

Configure VRF-aware feature (NAT, IPsec, ZBFW) but VRF not referenced correctly

**Diagnostic Symptoms:**
- NAT not translating traffic within VRF
- IPsec tunnel not establishing within VRF
- Zone-based firewall not applying to VRF traffic
- VRF-aware feature configuration missing VRF keyword

**Troubleshooting Commands & Remediation:**
- `Many features need explicit VRF keyword: 'ip nat inside source list <acl> pool <pool> vrf <name>'`
- `Check 'show ip nat statistics vrf <name>' for VRF NAT stats`
- `IPsec: 'crypto keyring <name> vrf <vrf>'`
- `Check feature documentation: not all features are VRF-aware`
- `VRF-lite: features work within VRF but may not see global routing`
- `Testing: 'ping vrf <name> <ip>' to verify VRF reachability`

