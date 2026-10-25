---
name: "Multicast/Anycast Issues Injection"
description: "PIM, IGMP, MSDP multicast routing and anycast related network faults"
category: "computer-networking"
---

# Multicast/Anycast Issues Injection

PIM, IGMP, MSDP multicast routing and anycast related network faults

## Supported Protocols
- pim
- igmp
- msdp
- multicast

## Fault Injection Scenarios & Troubleshooting Procedures

### PIM Mode Mismatch (Sparse vs Dense) (Severity: HIGH)

Configure different PIM modes on connected interfaces

**Diagnostic Symptoms:**
- PIM neighbors not forming
- Multicast traffic not forwarded
- PIM DR election issues
- PIM mode mismatch between routers

**Troubleshooting Commands & Remediation:**
- `Check PIM mode with 'show ip pim interface'`
- `Modes: dense (flood + prune), sparse (RP-based join), sparse-dense`
- `Sparse mode requires RP (static, auto-RP, BSR)`
- `Dense mode floods then prunes (inefficient for most WAN)`
- `Use 'ip pim sparse-mode' on all multicast interfaces`
- `Check 'show ip pim neighbor' for adjacency`

### PIM RP (Rendezvous Point) Misconfiguration (Severity: HIGH)

Configure wrong RP address or no RP for multicast groups

**Diagnostic Symptoms:**
- Sparse mode groups not receiving multicast
- RP not reachable from multicast routers
- PIM register process failing
- Multicast receivers cannot join groups via RP

**Troubleshooting Commands & Remediation:**
- `Check RP with 'show ip pim rp mapping'`
- `Use 'ip pim rp-address <ip> [group-list <acl>]' for static RP`
- `Auto-RP: 'ip pim send-rp-announce' and 'ip pim send-rp-discovery'`
- `BSR: 'ip pim bsr-candidate' and 'ip pim rp-candidate'`
- `Verify RP reachable: 'ping <rp-ip>'`
- `Check 'show ip pim rp-hash <group>' for RP selection`

### PIM DR Election Misconfiguration (Severity: MEDIUM)

Set wrong PIM DR priority causing incorrect DR election on multi-access networks

**Diagnostic Symptoms:**
- Wrong router elected as PIM DR on broadcast segment
- Only DR sends registers to RP (source traffic)
- Multicast source traffic not forwarded
- DR forwarder not as designed

**Troubleshooting Commands & Remediation:**
- `Check PIM DR with 'show ip pim interface'`
- `DR is elected by highest priority, then highest IP`
- `Use 'ip pim dr-priority <0-4294967295>' on interface`
- `Higher priority wins DR election`
- `DR is responsible for sending PIM registers to RP`
- `DR has special role for IGMPv1/v2 on shared segment`

### IGMP Snooping Misconfiguration (Severity: MEDIUM)

Configure IGMP snooping incorrectly causing multicast traffic to be flooded or dropped

**Diagnostic Symptoms:**
- Multicast traffic flooded to all ports
- Multicast traffic dropped to receivers
- IGMP snooping database incorrect
- High CPU due to unknown multicast

**Troubleshooting Commands & Remediation:**
- `Check IGMP snooping with 'show ip igmp snooping'`
- `Verify 'ip igmp snooping' is enabled on VLAN`
- `Check 'show ip igmp snooping groups' for group membership`
- `Snooping only works with IGMPv2/v3`
- `Use 'ip igmp snooping querier' to enable switch as querier`
- `Check for 'ip igmp snooping vlan <vlan>' configuration`

### PIM Auto-RP Mapping Agent / Candidate RP Issue (Severity: HIGH)

Configure PIM Auto-RP but mapping agent not discovering candidate RPs or RP-SAs not flooded correctly

**Diagnostic Symptoms:**
- Auto-RP mapping agent not learning about candidate RPs
- RP-SAs (RP Discovery messages) not reaching all PIM routers
- Multicast groups not associated with RP
- PIM routers cannot find RP for group range

**Troubleshooting Commands & Remediation:**
- `Auto-RP: candidate RPs announce via 224.0.1.39`
- `Mapping agent listens on 224.0.1.39 and announces via 224.0.1.40`
- `Check 'show ip pim rp mapping' for Auto-RP entries`
- `All routers capable of routing Auto-RP multicast groups`
- `Use 'ip pim autorp listener' on interfaces not running PIM`
- `Ensure mapping agent reaches candidate RPs`

### PIM BSR (Bootstrap Router) Election / RP-Set Issue (Severity: HIGH)

Configure PIM BSR but BSR election fails or RP-set not distributed across domain

**Diagnostic Symptoms:**
- BSR not elected or multiple BSRs conflicting
- RP-set not received by all PIM routers
- Hash algorithm selecting wrong RP for groups
- Bootstrap messages not flooding in domain

**Troubleshooting Commands & Remediation:**
- `BSR candidate: 'ip pim bsr-candidate <intf> <hash-mask-len>'`
- `RP candidate: 'ip pim rp-candidate <intf>'`
- `BSR with highest priority becomes active BSR`
- `Check 'show ip pim bsr-router' for BSR status`
- `Check 'show ip pim rp-hash' for RP selection by group`
- `BSR messages hop-by-hop using TTL 255`

### PIM Register Process Failure (Severity: HIGH)

Configure PIM register process between source DR and RP but encapsulation or decapsulation fails

**Diagnostic Symptoms:**
- Multicast source traffic not reaching RP
- PIM register packets not sent by source DR
- Register decapsulation failed at RP
- Source tree (SPT) switchover not occurring

**Troubleshooting Commands & Remediation:**
- `DR encapsulates native multicast in PIM register (unicast to RP)`
- `Check 'show ip pim interface' for DR role on source segment`
- `Check 'show ip pim rp mapping' for group-to-RP mapping`
- `Register checksum errors at RP`
- `RP sends register-stop to DR after SPT established`
- `Register decapsulation requires route to source`

### PIM SSM (Source-Specific Multicast) Configuration Error (Severity: HIGH)

Configure PIM SSM (232.0.0.0/8) incorrectly or IGMPv3 not supported for SSM channel subscription

**Diagnostic Symptoms:**
- SSM groups (232/8) not forwarding traffic
- IGMPv3 report not processed for (S,G) join
- SSM range incorrectly defined
- Receivers can't subscribe to specific sources

**Troubleshooting Commands & Remediation:**
- `SSM uses (S,G) model, no RP needed for 232.0.0.0/8`
- `Use 'ip pim ssm [default|range <acl>]' to configure SSM range`
- `SSM requires IGMPv3 on receiver-facing interfaces`
- `Check 'show ip igmp interface' for IGMP version`
- `SSM: directly joined via IGMPv3 membership reports`
- `No RP, no register process = simpler than ASM`

### PIM Assert / Forwarder Election Failure (Severity: HIGH)

Configure PIM on multi-access network but assert process fails causing duplicate or lost multicast traffic

**Diagnostic Symptoms:**
- Duplicate multicast traffic on LAN segment
- PIM assert messages not exchanged
- Assert winner/loser not correctly determined
- Wrong forwarder elected on broadcast segment

**Troubleshooting Commands & Remediation:**
- `Assert: determines which router forwards on a shared LAN`
- `Assert winner = best route to source (lowest metric wins)`
- `Check show ip mroute <group> for assert state`
- `Assert loser stops forwarding, only winner forwards`
- `Assert metric = IGP metric to source`
- `Duplicate traffic = assert process not working`

### IGMP Version Mismatch / Compatibility Issue (Severity: MEDIUM)

Configure different IGMP versions on host-facing interfaces causing membership reports to be ignored

**Diagnostic Symptoms:**
- Hosts cannot join multicast groups
- IGMP membership reports ignored by router
- IGMPv1/v2 backward compatibility issues
- Multicast traffic not delivered to hosts

**Troubleshooting Commands & Remediation:**
- `Check 'show ip igmp interface' for IGMP version`
- `Default IGMP version v2 (RFC 2236) or v3 (RFC 3376)`
- `IGMPv1: leave without leave-group message`
- `IGMPv2: includes leave-group and group-specific query`
- `IGMPv3: includes source-specific (S,G) membership`
- `Use 'ip igmp version <1|2|3>' to set per-interface`

### MSDP Peer Session Failure (Severity: HIGH)

Configure MSDP (Multicast Source Discovery Protocol) peer between PIM domains but session not established

**Diagnostic Symptoms:**
- Inter-domain sources not discovered
- MSDP peer session not establishing
- SA (Source-Active) messages not exchanged
- Remote RP cannot inform receivers of sources in other domain

**Troubleshooting Commands & Remediation:**
- `MSDP peers connect via TCP (port 639)`
- `Check 'show ip msdp peer <ip>' for session state`
- `MSDP peer requires reachable IP between RPs`
- `Use 'ip msdp peer <rp-ip> connect-source <intf>'`
- `MSDP peering requires RPF check on SA messages`
- `Check mesh-group configuration for SA flooding`

### MSDP SA Cache / Source Active Flooding Issue (Severity: HIGH)

Configure MSDP but SA cache not populated or SA messages not forwarded correctly between peers

**Diagnostic Symptoms:**
- MSDP SA messages not received or propagated
- Remote sources missing from RP SA cache
- SA request timeout without response
- Inter-domain multicast source discovery fails

**Troubleshooting Commands & Remediation:**
- `Check 'show ip msdp sa-cache' for cached sources`
- `SA TTL: default 60 minutes, adjustable`
- `SA message rate limiting: 'ip msdp sa-limit <acl>'`
- `Mesh-group: SA not forwarded to peers in same group`
- `SA originate-count: 'show ip msdp count' for origin statistics`
- `RPF check: SA msg forwarded only if arrived from correct peer`

### Multicast RPF (Reverse Path Forwarding) Check Failure (Severity: HIGH)

Configure unicast routing path different from multicast source path causing RPF check failure

**Diagnostic Symptoms:**
- Multicast traffic received but not forwarded
- RPF check failing for source address
- Asymmetric routing causing multicast loss
- 'show ip mroute' shows RPF failure

**Troubleshooting Commands & Remediation:**
- `RPF check: interface receiving multicast must be optimal route to source`
- `Check 'show ip rpf <source-ip>' for best unicast route`
- `Asymmetric routing: use PIM, MBGP, or null routes for RPF`
- `Use 'ip multicast rpf <source>' for RPF override`
- `MPLS VPN: VRF RPF check uses VRF routing table`
- `RPF failure is the most common multicast forwarding issue`

### PIM BFD Integration Failure (Severity: MEDIUM)

Configure PIM with BFD for fast failure detection but BFD session not established or not integrated

**Diagnostic Symptoms:**
- PIM convergence still slow after link failure
- BFD session not established for PIM neighbor
- PIM not responding to BFD down events
- Sub-second detection not working

**Troubleshooting Commands & Remediation:**
- `Use 'ip pim bfd' under interface for BFD integration`
- `BFD provides sub-second detection (< 1s vs 3.3s PIM hello)`
- `Check 'show bfd neighbors' for BFD session status`
- `PIM neighbor removed immediately on BFD failure`
- `Requires BFD configured on both PIM neighbors`
- `BFD interval default: 150ms x 3 multiplier`

### Multicast Boundary / Scope Filtering Misconfiguration (Severity: MEDIUM)

Configure multicast boundary too restrictively blocking legitimate multicast traffic or scope leakage

**Diagnostic Symptoms:**
- Legitimate multicast groups blocked at boundary
- Administrative scope leaking across regions
- Multicast boundary ACL matching wrong groups
- Inter-domain multicast blocked incorrectly

**Troubleshooting Commands & Remediation:**
- `Multicast boundary: 'ip multicast boundary <acl>'`
- `Check ACL entries for denied group ranges`
- `Administrative scoping: 239.0.0.0/8 (local scope)`
- `Use 'ip multicast boundary scope <scope>' for admin scoping`
- `Boundary filters both incoming and outgoing multicast`
- `Common for isolating PIM domains`

### PIM SPT Switchover Threshold Issue (Severity: MEDIUM)

Configure PIM SPT (Shortest Path Tree) switchover threshold incorrectly, causing suboptimal multicast forwarding

**Diagnostic Symptoms:**
- Multicast traffic always via RP (never switches to SPT)
- SPT threshold set too high or disabled
- Router never switches from RPT to SPT
- Suboptimal multicast path via RP vs directly sourced

**Troubleshooting Commands & Remediation:**
- `SPT switchover: receiver moves from shared tree (RPT) to source tree (SPT)`
- `Default threshold: 0 kbps (immediate switch to SPT)`
- `Use 'ip pim spt-threshold <kbps>' to adjust`
- `Default: switch immediately for all sources (Cisco)`
- `Higher threshold keeps traffic on RP tree longer`
- `Check 'show ip mroute <group> count' for SPT status`

### IGMP Proxy / Standby Misconfiguration (Severity: MEDIUM)

Configure IGMP proxy or IGMP standalone mode incorrectly, preventing upstream multicast subscription

**Diagnostic Symptoms:**
- IGMP queries not forwarded upstream
- Membership reports not proxied to upstream
- CE router not joining multicast groups on behalf of hosts
- IGMP proxy not aggregating membership

**Troubleshooting Commands & Remediation:**
- `IGMP proxy: router acts as host to upstream for all downstream members`
- `Check 'show ip igmp proxy' for proxy interface status`
- `Proxy aggregates all downstream subscriptions`
- `Use 'ip igmp proxy-service' for downstream interfaces`
- `Use 'ip igmp helper-address <upstream-ip>' for forwarding`
- `Common in MPLS VPN multicast or customer edge designs`

### Multicast Administrative Scoping / TTL Threshold Issue (Severity: MEDIUM)

Configure multicast administrative scope boundaries incorrectly limiting multicast reach or leaking scope

**Diagnostic Symptoms:**
- Multicast traffic not crossing configured scope boundary
- Scope leaking into other regions
- TTL threshold dropping legitimate traffic
- Administrative scope conflicts between regions

**Troubleshooting Commands & Remediation:**
- `Admin scope ranges: 239.0.0.0/8 (RFC 2365)`
- `Use 'ip multicast boundary <acl>' for per-interface scoping`
- `TTL threshold: 'ip multicast ttl-threshold <ttl>'`
- `Local scope: 239.255.0.0/16 (site-local)`
- `Organization scope: 239.192.0.0/14 (private)`
- `Check 'show ip igmp boundary' for active boundaries`

### PIM-DM Initial Flood / Prune Overhead Issue (Severity: MEDIUM)

Configure PIM Dense Mode where initial flood-and-prune causes unnecessary traffic on all links

**Diagnostic Symptoms:**
- PIM-DM floods multicast to all PIM neighbors initially
- Prune messages sent but traffic already consumed bandwidth
- Flood-and-prune inefficient for sparse receivers
- Unnecessary multicast traffic on links with no receivers

### PIM-DM Graft / Source Activation After Prune Issue (Severity: MEDIUM)

Configure PIM-DM graft to re-activate pruned source but graft-ack not received

**Diagnostic Symptoms:**
- New receiver cannot get multicast traffic after prune
- Graft message sent but no response
- Graft-ack not received from upstream neighbor
- Pruned branch stays pruned despite new receivers

### PIM-DM State-Refresh / Originator TLV Issue (Severity: MEDIUM)

Configure PIM-DM state-refresh but periodic refresh not reaching all routers

**Diagnostic Symptoms:**
- PIM-DM prune state timed out before refresh
- State-Refresh messages not propagated downstream
- Flood-prune cycle repeats periodically
- Unnecessary re-flood on stable pruned branches

### PIM Anycast-RP / RP Redundancy Failure (Severity: HIGH)

Configure PIM Anycast-RP but RP set not synchronized between RP routers

**Diagnostic Symptoms:**
- PIM register from source DR goes to wrong RP
- Anycast-RP using same IP but sources registered to only one RP
- MSDP SA not shared between RPs
- RP redundancy not working (standby RP has no source info)

### PIM Embedded RP / IPv6 Multicast RP Discovery Issue (Severity: HIGH)

Configure PIM with embedded RP (RFC 3956) but group-to-RP mapping fails

**Diagnostic Symptoms:**
- IPv6 multicast groups using embedded RP not working
- Embedded RP address extraction failed
- Group prefix does not encode valid RP address
- PIM-SM for IPv6 cannot discover RP

### PIM Sparse-Dense Mode / Hybrid Operation Issue (Severity: MEDIUM)

Configure PIM sparse-dense mode on an interface but group behavior unexpected

**Diagnostic Symptoms:**
- Some groups treated as dense when sparse intended
- RP unreachable groups defaulting to dense mode
- Sparse-dense mode causing inconsistent forwarding
- Groups with RP fall back to dense operation unexpectedly

### PIM Bidir (Bidirectional) / Designated Forwarder Election Issue (Severity: HIGH)

Configure PIM Bidirectional mode but DF election fails for RP-group

**Diagnostic Symptoms:**
- Bidir-PIM not forwarding traffic towards RP
- DF election stalled for specific interfaces
- Multiple forwarders elected causing duplicate traffic
- Bidir-PIM group traffic not reaching all receivers

### Multicast VRF / MVPN VRF Multicast Routing Issue (Severity: HIGH)

Configure multicast routing within a VRF but RPF or forwarding fails

**Diagnostic Symptoms:**
- Multicast traffic not forwarded within VRF
- VRF RPF check failing for multicast source
- PIM neighbors not established in VRF context
- Multicast state not created in VRF

