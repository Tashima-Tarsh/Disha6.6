---
name: "LISP Issues Injection"
description: "LISP (Locator/ID Separation Protocol) related network faults for troubleshooting practice"
category: "computer-networking"
---

# LISP Issues Injection

LISP (Locator/ID Separation Protocol) related network faults for troubleshooting practice

## Supported Protocols
- lisp
- lisp-mr
- lisp-ms
- lisp-etr
- lisp-itr

## Fault Injection Scenarios & Troubleshooting Procedures

### LISP Map-Server / Map-Resolver Unreachable (Severity: CRITICAL)

Configure LISP with incorrect Map-Server/Map-Resolver address preventing EID registration

**Diagnostic Symptoms:**
- ETR cannot register EID prefixes with Map-Server
- Map-Resolver not responding to Map-Requests from ITR
- LISP mapping database empty on Map-Server
- EID-to-RLOC mapping not available for remote sites

**Troubleshooting Commands & Remediation:**
- `Check LISP configuration with 'show lisp session'`
- `Verify 'lisp map-server <ip>' points to correct MS IP`
- `Verify 'lisp map-resolver <ip>' points to correct MR IP`
- `Ensure TCP 4342 (LISP control) reachable between ETR and MS`
- `Check MS/MR reachability: 'ping <ms-ip>' from ETR`
- `MS/MR must have routes back to all LISP sites`

### LISP EID Prefix Not Registered with Map-Server (Severity: CRITICAL)

Configure EID prefix but registration to Map-Server fails or is rejected

**Diagnostic Symptoms:**
- EID prefix not appearing in Map-Server database
- Remote ITR cannot resolve EID-to-RLOC mapping
- LISP traffic blackholed to site
- Site connectivity completely broken

**Troubleshooting Commands & Remediation:**
- `Check EID registration: 'show lisp eid-table <id> map-cache'`
- `Check MS database: 'show lisp database' on Map-Server`
- `Verify 'eid-prefix <prefix>' under LISP site configuration`
- `MS must have the site configured: 'site <name>' 'eid-prefix <prefix>'`
- `Check 'show lisp server summary' for registered EIDs`
- `Authentication key must match between ETR and MS`

### LISP Map-Server Authentication Key Mismatch (Severity: HIGH)

Configure LISP with mismatched authentication key between ETR and Map-Server

**Diagnostic Symptoms:**
- ETR registration rejected by Map-Server
- Authentication errors in LISP logs
- EID-to-RLOC mapping not created in MS database
- LISP mapping lookup fails for the site

**Troubleshooting Commands & Remediation:**
- `Check 'show lisp server detail' for site registration errors`
- `Verify 'authentication-key <key>' under site configuration on MS`
- `Verify 'key <key>' under ETR site configuration`
- `Key must match exactly on both sides (case-sensitive)`
- `Default key: none (no authentication if not configured)`
- `Key change requires re-registration`

### LISP ITR Not Performing Map-Request (Severity: HIGH)

Configure LISP ITR but Map-Request not sent for EID destinations

**Diagnostic Symptoms:**
- ITR not encapsulating traffic to remote EIDs
- Map-Cache empty for destination prefixes
- Traffic sent natively (not LISP-encapsulated)
- LISP traffic not reaching remote site

**Troubleshooting Commands & Remediation:**
- `Check 'show lisp map-cache' for cached mappings`
- `Verify 'itr' and 'itr enable' are configured on the router`
- `ITR triggers Map-Request when EID traffic matches`
- `Check 'show lisp stats' for Map-Request counters`
- `Default: ITR sends Map-Request to configured Map-Resolver`
- `Negative map-cache entry = ITR tried but no mapping received`

### LISP RLOC (Locator) Unreachable (Severity: HIGH)

Configure LISP RLOC address but RLOC interface is down or unreachable

**Diagnostic Symptoms:**
- LISP EID traffic not forwarded
- RLOC interface down or not reachable from remote sites
- LISP encapsulation fails - no valid RLOC
- Map-Server shows RLOC as unreachable

**Troubleshooting Commands & Remediation:**
- `Check 'show lisp interface' for RLOC status`
- `Verify 'lisp rloc <interface>' points to a loopback or physical`
- `RLOC must be reachable from other LISP sites via underlay`
- `Check 'show ip route <rloc-ip>' for underlay reachability`
- `Multiple RLOCs provide redundancy: 'lisp rloc <intf1> <intf2>'`
- `RLOC reachability test: ping from remote RLOC`

### LISP RLOC Probing / Locator Reachability Failure (Severity: HIGH)

Configure RLOC probing but probe fails causing RLOC marked as down

**Diagnostic Symptoms:**
- RLOC incorrectly marked as down due to probe failure
- LISP traffic fails over to backup RLOC unexpectedly
- RLOC probe interval too short causing false negatives
- RLOC flapping between up/down states

**Troubleshooting Commands & Remediation:**
- `Check 'show lisp rloc-probe' for probing status`
- `RLOC probe: ETR sends probe to Map-Server to verify locator reachability`
- `Probe passed: RLOC considered reachable by Map-Server`
- `Probe failed: Map-Server marks RLOC as down`
- `Configure probe frequency: 'lisp rloc-probe interval <seconds>'`
- `Default interval: 30 seconds`

### LISP Multi-Homing / Multiple RLOC Priority Issue (Severity: HIGH)

Configure LISP multi-homing with multiple RLOCs but priority/weight misconfigured

**Diagnostic Symptoms:**
- Traffic enters site through non-optimal RLOC
- RLOC priority/weight not influencing traffic path
- Backup path never used when primary fails
- Uneven load distribution across RLOCs

**Troubleshooting Commands & Remediation:**
- `Check RLOC priorities: 'show lisp session'`
- `Priority 1-255 (lower = more preferred)`
- `Weight 0-100 (distributes load among same-priority RLOCs)`
- `Configure: 'locator-set <name> <intf> priority <p> weight <w>'`
- `Priority affects which RLOC is primary for incoming traffic`
- `Weight affects how traffic is split among equal-priority RLOCs`

### LISP Proxy Tunnel Router (PxTR) / Proxy ETR Failure (Severity: HIGH)

Configure LISP PxTR or PETR but non-LISP sites cannot reach LISP sites

**Diagnostic Symptoms:**
- Non-LISP sites cannot reach LISP site EID prefixes
- PxTR not replying to Map-Requests from ITRs
- PETR not encapsulating traffic to LISP sites
- Non-LISP to LISP communication broken

**Troubleshooting Commands & Remediation:**
- `PxTR: acts as both proxy-ITR and proxy-ETR`
- `PETR: proxy-ETR only (not proxy-ITR)`
- `Check 'show lisp proxy-etr' for PETR status`
- `Check 'show lisp proxy-itr' for PITR status`
- `PxTR must have route to non-LISP destinations`
- `PETR needed when LISP site has no native connectivity to non-LISP`

### LISP PITR Map-Request Handling Failure (Severity: HIGH)

Configure LISP PITR but incoming Map-Requests not processed correctly

**Diagnostic Symptoms:**
- PITR receives Map-Requests but does not respond
- Non-LISP hosts cannot initiate traffic to LISP destinations
- PITR not advertising aggregate EID prefixes in BGP
- Map-Resolver forwarding Map-Request to wrong PITR

### LISP UDP Encapsulation / MTU Issue (Severity: HIGH)

Configure LISP encapsulation but UDP overhead causes MTU/fragmentation issues

**Diagnostic Symptoms:**
- Large packets dropped across LISP fabric
- LISP encapsulation adds overhead exceeding path MTU
- DF bit packets fragmented or dropped
- TCP connections stall across LISP interface

**Troubleshooting Commands & Remediation:**
- `LISP encapsulation adds: 8 bytes UDP + 20 bytes IP = 28 bytes overhead`
- `LISP data: outer UDP (4341) + outer IP + inner packet`
- `Set interface MTU to account for LISP overhead`
- `TCP MSS adjustment: 'ip tcp adjust-mss <size>' on LISP interface`
- `Use path-mtu-discovery across LISP network`
- `Check 'show lisp stats' for encapsulation errors`

### LISP Instance-ID / Virtual Network Mismatch (Severity: HIGH)

Configure LISP Instance-ID (IID) incorrectly causing L2/L3 network separation issues

**Diagnostic Symptoms:**
- EID traffic in wrong virtual network
- Instance-ID mismatch between sites
- LISP map-cache not matching expected IID
- Tenant traffic mixing across virtual networks

### LISP VM Mobility / Host Move Registration Failure (Severity: HIGH)

Configure LISP VM mobility but host move not detected or mapping not updated

**Diagnostic Symptoms:**
- VM moves to new location but traffic still sent to old RLOC
- Map-Server mapping not updated after host move
- Stale map-cache on remote ITRs
- Traffic blackholed for moved host

**Troubleshooting Commands & Remediation:**
- `VM mobility: new ETR detects host and re-registers`
- `Map-Server records new mapping with higher TTL`
- `Check 'show lisp eid-table <iid> dynamic-eid' for learned EIDs`
- `Map-Versioning ensures ITRs have latest mapping`
- `Use 'dynamic-eid <name>' for mobile hosts`
- `Negative map-cache entry causes ITR to re-query`

