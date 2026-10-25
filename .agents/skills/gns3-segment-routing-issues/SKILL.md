---
name: "Segment Routing Issues Injection"
description: "Segment Routing (SR-MPLS) related network faults for troubleshooting practice"
category: "computer-networking"
---

# Segment Routing Issues Injection

Segment Routing (SR-MPLS) related network faults for troubleshooting practice

## Supported Protocols
- segment-routing
- mpls
- isis
- ospf
- sr-te
- ldp

## Fault Injection Scenarios & Troubleshooting Procedures

### SRGB (Segment Routing Global Block) Mismatch (Severity: HIGH)

Configure different SRGB ranges on routers in the same SR domain

**Diagnostic Symptoms:**
- SID (Segment ID) conflict across SR domain
- MPLS label allocation unexpected
- SR-TE policy path computation failure
- Label forwarding incorrect

**Troubleshooting Commands & Remediation:**
- `Check SRGB with 'show segment-routing mpls' or 'show isis segment-routing'`
- `Use 'segment-routing mpls srgb <start> <end>' to configure`
- `All routers in the same SR domain should have consistent SRGB`
- `Default SRGB is 16000-23999 on most platforms`
- `SRGB must be large enough for all prefix-SIDs in the network`
- `Check for overlapping SRGB between different domains`

### Prefix-SID Not Assigned or Missing (Severity: HIGH)

Prefix-SID (label) not configured for a loopback interface in the SR domain

**Diagnostic Symptoms:**
- No SR label allocated for the loopback prefix
- SR-TE paths cannot use this node as endpoint
- MPLS forwarding table missing label for this prefix
- SR policy headend cannot compute path

**Troubleshooting Commands & Remediation:**
- `Check prefix-SID with 'show isis prefix-sid' or 'show segment-routing mpls prefix-sid-map'`
- `Configure 'prefix-sid <index>' under IS-IS or OSPF interface`
- `SID index is combined with SRGB to create the MPLS label`
- `Verify the loopback prefix is advertised in IGP with the SID`
- `Each loopback prefix should have a unique SID index`
- `Duplicate SIDs cause label conflicts`

### Adjacency-SID Misconfiguration (Severity: LOW)

Adjacency-SID not generated or incorrect due to IGP interface configuration

**Diagnostic Symptoms:**
- Adjacency-SID not allocated for specific neighbors
- SR-TE strict paths cannot use this adjacency
- Adjacency segment missing in SR database
- Label stack for strict path incomplete

**Troubleshooting Commands & Remediation:**
- `Check adjacency-SID with 'show isis adjacency-sid' or 'show segment-routing mpls adjacency'`
- `Adjacency-SID is automatically allocated per neighbor`
- `Adjacency-SID is local (unique per router, not domain-wide)`
- `Check IS-IS/OSPF interface is running IGP with SR extension`
- `Adjacency-SID persists across IGP restarts`
- `Only one adjacency-SID is allocated per adjacency (IPv4 or IPv6)`

### SR-TE Policy Candidate-Path Misconfiguration (Severity: HIGH)

Configure SR-TE policy candidate-path with wrong preference or segment-list

**Diagnostic Symptoms:**
- SR-TE policy not active or not selected
- Candidate-path preference conflict
- Segment-list does not reach destination
- Traffic-engineering policy not steering traffic

**Troubleshooting Commands & Remediation:**
- `Check SR-TE policy with 'show segment-routing traffic-eng policy'`
- `Candidate-path with higher preference wins`
- `Use 'candidate-path preference <value>' to set priority`
- `Verify segment-list: 'show segment-routing mpls segment-list <name>'`
- `Color and endpoint must match for policy selection`
- `Check 'show segment-routing traffic-eng forwarding' for active path`

### SR Traffic Steering Misconfiguration (Severity: HIGH)

Traffic not steered into SR-TE policy via color or route-policy

**Diagnostic Symptoms:**
- Traffic not following the intended SR-TE path
- BGP routes not colored with the expected color community
- Steering route-policy not matching or applied
- Default routing table used instead of SR-TE

**Troubleshooting Commands & Remediation:**
- `SR traffic steering uses color community on BGP routes`
- `Color community format: color:<color-value>`
- `BGP route-policy must set color on specific routes`
- `SR-TE policy with matching color+endpoint attracts traffic`
- `Check 'show bgp <prefix>' for color community`
- `Steering via autoroute or static route per policy`

### SR TI-LFA (Topology-Independent LFA) Failure (Severity: HIGH)

Configure SR TI-LFA backup path not being computed due to missing adjacency-SID or constraints

**Diagnostic Symptoms:**
- TI-LFA backup path not computed for a prefix
- Post-convergence path blackhole under failure
- Fast-reroute not active for specific prefixes
- Protection coverage incomplete

**Troubleshooting Commands & Remediation:**
- `Check TI-LFA with 'show isis fast-reroute ti-lfa' or 'show ip ospf fast-reroute ti-lfa'`
- `TI-LFA requires adjacency-SIDs for backup path construction`
- `Use 'fast-reroute per-prefix ti-lfa' under IGP`
- `Check 'show isis fast-reroute protected-prefixes' for coverage`
- `TI-LFA works with SR and LDP both`
- `All intermediate routers need SR enabled for TI-LFA`

### SR-MPLS and LDP Interoperability Issue (Severity: LOW)

Configure SR-MPLS and LDP on same router but label mapping mismatched

**Diagnostic Symptoms:**
- Some routers use SR while others use LDP
- Label allocation conflict on migration routers
- Mapping server not advertising prefix-SIDs for LDP-to-SR
- Label edge node cannot swap between SR and LDP

**Troubleshooting Commands & Remediation:**
- `SR-to-LDP interworking: mapping server advertises SIDs for LDP prefixes`
- `Use 'segment-routing mapping-server' for prefix-SID mapping`
- `Check 'show mpls forwarding-table' for label consistency`
- `Migration: enable SR, keep LDP, then disable LDP`
- `IGP LDP sync still needed during migration`
- `Both SR and LDP can coexist on the same router`

### SR Anycast-SID / Redundancy SID Conflict (Severity: HIGH)

Configure SR anycast-SID for multi-homed prefix but SID index or routing causing suboptimal forwarding

**Diagnostic Symptoms:**
- ECMP not working correctly for anycast prefix
- Anycast SID index conflict between redundant routers
- Traffic not load balancing across anycast nodes
- Suboptimal anycast forwarding path

**Troubleshooting Commands & Remediation:**
- `Anycast-SID: same SID index on multiple routers for the same prefix`
- `Traffic forwarded via ECMP to the closest anycast node`
- `Check anycast SID: 'show isis prefix-sid <prefix>'`
- `Both routers must use the same SID index`
- `Anycast prefix advertised from both routers with same SID`
- `Use for multi-homed services and seamless redundancy`

### OSPF Segment Routing (OSPF-SR) Extension Issue (Severity: HIGH)

Configure OSPF with SR extension incorrectly causing prefix-SID not generated in OSPF LSAs

**Diagnostic Symptoms:**
- OSPF SR prefix-SIDs not generated
- OSPF opaque LSA (Type 9/10) not carrying SR info
- Other routers not learning prefix-SID via OSPF
- SR not operational in OSPF areas

**Troubleshooting Commands & Remediation:**
- `OSPF SR: uses Opaque LSA Type 10 (area) or Type 9 (link)`
- `Check 'show ip ospf database opaque-area' for SR info`
- `Use 'segment-routing mpls' under router ospf`
- `Prefix-SID: 'prefix-sid <index>' under network command`
- `OSPF SRB: 'segment-routing global-block <start> <end>'`
- `Requires 'capability opaque' on all OSPF routers`

### Adjacency-SID Protection / FRR Backup Failure (Severity: HIGH)

Configure SR adjacency-SID protection (FRR) but backup path not available

**Diagnostic Symptoms:**
- Adjacency-SID lost when link fails
- No backup path for adjacency-SID protected prefix
- Adjacency-SID forwarding interrupted on link failure
- FRR not protecting adjacency-SID path

**Troubleshooting Commands & Remediation:**
- `Adjacency-SID protection: 'adjacency-sid protect' under IGP`
- `TI-LFA or IP-FRR provides backup paths`
- `Check 'show isis adjacency-sid <intf>' for backup info`
- `FRR protection requires precomputed backup path`
- `Backup path uses alternate interface or node`
- `Verify 'fast-reroute per-prefix' is enabled for protection`

### SR Inter-Layer / ODN / On-Demand Next-Hop Config Error (Severity: HIGH)

Configure SR on-demand next-hop (ODN) but auto-path not instantiated for BGP destinations

**Diagnostic Symptoms:**
- ODN not creating SR path for BGP destinations
- BGP route with color not triggering SR policy creation
- ODN policy not matching BGP prefix
- SR path to BGP next-hop not available

**Troubleshooting Commands & Remediation:**
- `ODN: BGP color community triggers SR policy creation`
- `Use 'segment-routing traffic-eng on-demand color <value>'`
- `BGP: set color community on routes needing SR transport`
- `Check 'show segment-routing traffic-eng policy' for ODN policies`
- `ODN policy = color + endpoint (destination prefix)`
- `Requires BGP-LS or IGP topology for path computation`

### SR Liveness / BFD for SR Policy Failure (Severity: LOW)

Configure BFD for SR-TE policy but BFD session not established

**Diagnostic Symptoms:**
- BFD for SR policy not established
- SR policy not protected by BFD fast detection
- BFD session flapping for SR path
- Slow failover despite BFD configuration

**Troubleshooting Commands & Remediation:**
- `BFD for SR: 'bfd segment-routing traffic-eng'`
- `BFD session tracks SR policy liveness`
- `Check 'show bfd segment-routing traffic-eng' for session state`
- `BFD provides sub-50ms failure detection`
- `Alternative: SR policy candidate-path validation`
- `If BFD down: policy marked invalid, switch to backup candidate`

