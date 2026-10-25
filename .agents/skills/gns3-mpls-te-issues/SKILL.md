---
name: "MPLS-TE/RSVP-TE Issues Injection"
description: "MPLS traffic engineering and RSVP-TE related network faults"
category: "computer-networking"
---

# MPLS-TE/RSVP-TE Issues Injection

MPLS traffic engineering and RSVP-TE related network faults

## Supported Protocols
- mpls-te
- rsvp
- mpls

## Fault Injection Scenarios & Troubleshooting Procedures

### MPLS-TE Tunnel Not Coming Up (Severity: HIGH)

MPLS-TE tunnel stuck in down state due to missing resources or misconfiguration

**Diagnostic Symptoms:**
- TE tunnel shows down/down
- RSVP session not established
- Path computation fails
- Tunnel bandwidth not reserved

**Troubleshooting Commands & Remediation:**
- `Check TE tunnel with 'show mpls traffic-eng tunnels'`
- `Verify RSVP is enabled on all interfaces along the path`
- `Check 'show ip rsvp neighbor' for RSVP adjacency`
- `Verify 'ip rsvp bandwidth' is configured on interfaces`
- `Check 'show mpls traffic-eng topology' for link info`
- `Tunnel destination must be reachable via TE topology`

### RSVP Bandwidth Reservation Insufficient (Severity: HIGH)

Configure RSVP bandwidth pool too small for the TE tunnel request

**Diagnostic Symptoms:**
- TE tunnel path computation fails due to insufficient bandwidth
- RSVP reservation rejected on intermediate link
- Tunnel cannot come up with configured bandwidth
- Admission control failure at midpoint LSR

**Troubleshooting Commands & Remediation:**
- `Check RSVP bandwidth with 'show ip rsvp interface'`
- `Use 'ip rsvp bandwidth <interface-bw> [sub-pool]' to reserve`
- `Verify 'ip rsvp bandwidth' is consistent across path`
- `Global pool vs sub-pool (for fast-reroute protection)`
- `Check 'show mpls traffic-eng topology' for link BW utilization`
- `Reduce tunnel bandwidth request or increase RSVP pool`

### TE Tunnel Reoptimization Failure (Severity: LOW)

TE tunnel not reoptimizing to better path when network changes

**Diagnostic Symptoms:**
- TE tunnel stays on suboptimal path
- Tunnel not reoptimized after better path appears
- Reoptimization timer too long
- Optimal path not selected even when available

**Troubleshooting Commands & Remediation:**
- `Trigger reoptimization with 'mpls traffic-eng reoptimize'`
- `Check reoptimize timer with 'show mpls traffic-eng'`
- `Use 'tunnel mpls traffic-eng reoptimize <seconds>' for timer`
- `Reoptimization happens every 3600s (1 hour) by default`
- `Link attributes change triggers reoptimization`
- `Use 'autoroute announce' for IGP TE integration`

### TE Tunnel Affinity / Attribute-List Mismatch (Severity: LOW)

Configure TE tunnel affinity that excludes valid links in the network

**Diagnostic Symptoms:**
- TE tunnel path excludes available links
- Affinity constraint too restrictive
- Attribute-list mismatch between link and tunnel
- Tunnel path computation fails despite available bandwidth

**Troubleshooting Commands & Remediation:**
- `Check TE link attributes with 'show mpls traffic-eng link-management'`
- `Configure tunnel affinity: 'tunnel mpls traffic-eng affinity <mask> <value>'`
- `Link attributes: 'attribute-flags <hex>' on interface`
- `Affinity mask filters links: bitwise AND with link attributes`
- `Use 'show mpls traffic-eng topology' to verify link attributes`
- `Default: no affinity (accepts all links)`

### TE Autoroute / Forwarding Adjacency Misconfiguration (Severity: HIGH)

TE tunnel not used for IGP routing due to missing autoroute or forwarding adjacency

**Diagnostic Symptoms:**
- IGP not routing traffic through TE tunnel
- TE tunnel up but not used for transit traffic
- Autoroute not announcing tunnel into IGP
- Forwarding adjacency not established

**Troubleshooting Commands & Remediation:**
- `Use 'tunnel mpls traffic-eng autoroute announce' for IGP steering`
- `IGP sees the TE tunnel as a directly connected link`
- `Autoroute metric: 'autoroute metric <absolute|relative>'`
- `Forwarding adjacency: advertises the TE tunnel as an IGP link`
- `Forwarding adjacency requires 'tunnel mpls traffic-eng forwarding-adjacency'`
- `Check IGP database for TE tunnel advertisement`

### TE Fast-Reroute (FRR) Link/Node Protection Failure (Severity: HIGH)

Configure TE FRR backup tunnel but protection not working or backup path fails

**Diagnostic Symptoms:**
- TE tunnel not protected by FRR
- Backup tunnel not bound to protected tunnel
- Link failure causes TE tunnel down (no protection)
- FRR protection bandwidth insufficient

**Troubleshooting Commands & Remediation:**
- `Check FRR with 'show mpls traffic-eng fast-reroute'`
- `Configure backup tunnel with 'interface tunnel <id> ip unnumbered <loopback>'`
- `Backup tunnel must be 'tunnel mpls traffic-eng backup'`
- `Use 'mpls traffic-eng backup-path tunnel <id>' on protected interface`
- `Link protection: backup bypasses the failed link`
- `Node protection: backup bypasses the failed adjacent node`

### RSVP Authentication / Hello Mismatch (Severity: HIGH)

Configure RSVP authentication or hello parameters inconsistently

**Diagnostic Symptoms:**
- RSVP hello adjacency not established
- RSVP authentication failure
- TE tunnel path setup fails
- RSVP neighbor status unknown or down

**Troubleshooting Commands & Remediation:**
- `Check RSVP hello with 'show ip rsvp hello'`
- `RSVP hello detects neighbor failures`
- `Enable with 'ip rsvp hello' on interfaces`
- `RSVP authentication: 'ip rsvp authentication type md5 key <key>'`
- `Authentication key must match between peers`
- `Check 'show ip rsvp neighbor detail' for hello status`

### TE Path Option / Explicit Path Configuration Error (Severity: HIGH)

Configure explicit path option for TE tunnel with wrong hops or path order

**Diagnostic Symptoms:**
- TE tunnel path option configured but not used
- Explicit path has unusable or unreachable hops
- Path option preference not selected correctly
- Strict vs loose hop ordering issue

**Troubleshooting Commands & Remediation:**
- `Check path option with 'show mpls traffic-eng tunnels'`
- `Configure explicit path: 'ip explicit-path name <name> enable'`
- `Explicit path hops: 'next-address [loose|strict] <ip>'`
- `Strict: directly connected next-hop required`
- `Loose: can route through intermediate hops`
- `Path option: 'tunnel mpls traffic-eng path-option <num> explicit name <name>'`

### TE Loose Hop / ERO Expansion Failure (Severity: HIGH)

Configure TE tunnel with loose hops but ERO expansion (route computation for loose hops) fails

**Diagnostic Symptoms:**
- TE tunnel path computation fails for loose hop
- CSPF cannot compute path to loose hop destination
- ERO expansion incomplete
- Tunnel remains down despite topology

**Troubleshooting Commands & Remediation:**
- `Loose hop: TE does not specify every hop (only key waypoints)`
- `CSPF expands loose hops into full path (ERO)`
- `Check TE topology: 'show mpls traffic-eng topology'`
- `Requires full TE topology database for path computation`
- `Verify IGP has complete link-state information`
- `Loose hop = 'next-address loose <ip>' in explicit path`

### TE Inter-Area / Inter-AS Tunnel Misconfiguration (Severity: HIGH)

Configure TE tunnel across IGP areas or AS boundaries but path computation fails

**Diagnostic Symptoms:**
- TE tunnel cannot be established across areas
- ABR/ASBR not propagating TE information
- Inter-area TE topology incomplete
- Path computation fails at area boundary

**Troubleshooting Commands & Remediation:**
- `Inter-area TE: ABR propagates summarized TE info`
- `Check 'show mpls traffic-eng topology area <id>'`
- `Inter-area TE requires loose hop at ABR`
- `ABR must support TE and re-optimize paths`
- `Inter-AS TE: requires Inter-AS TE links`
- `Use loose hops at boundary nodes for multi-area paths`

### TE PCE (Path Computation Element) Communication Failure (Severity: HIGH)

Configure TE PCE/PCEP but headend cannot communicate with PCE for path computation

**Diagnostic Symptoms:**
- Tunnel path computation request to PCE fails
- PCEP session not established between PCC and PCE
- PCE returns no path for tunnel
- Fallback to local CSPF not working

**Troubleshooting Commands & Remediation:**
- `PCEP uses TCP 4189 for path computation`
- `Check PCEP: 'show mpls traffic-eng pce peer'`
- `Configure PCC: 'pce peer <ip>' and 'pce path-option <num> pce group <group>'`
- `PCE must have full TE topology of the network`
- `Use 'pce profile <name>' for session parameters`
- `Dead timer mismatch causes PCEP session flap`

### TE Hierarchical LSP / LSP Nesting Error (Severity: HIGH)

Configure TE tunnel as a forwarding adjacency for another TE tunnel but nesting fails

**Diagnostic Symptoms:**
- Outer TE tunnel cannot carry inner TE tunnel
- LSP nesting not working as expected
- Forwarding adjacency tunnel acts as link but not discovered
- Hierarchical LSP path computation fails

**Troubleshooting Commands & Remediation:**
- `Hierarchical LSP: one TE tunnel inside another TE tunnel`
- `Outer tunnel: forwarding adjacency advertised into IGP`
- `Inner tunnel: uses outer tunnel as a link in path computation`
- `Check 'show mpls traffic-eng forwarding-adjacency'`
- `Outer tunnel must have autoroute or forwarding adjacency`
- `Bandwidth scaling: inner tunnel inherits outer's available BW`

