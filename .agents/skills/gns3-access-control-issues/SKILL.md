---
name: "Access Control Issues Injection"
description: "Access control lists (ACL) and security-related network faults for troubleshooting practice"
category: "computer-networking"
---

# Access Control Issues Injection

Access control lists (ACL) and security-related network faults for troubleshooting practice

## Supported Protocols
- ipv4
- ipv6
- tcp
- udp
- acl

## Fault Injection Scenarios & Troubleshooting Procedures

### Blocking ACL (Severity: MEDIUM)

Apply an ACL that blocks legitimate traffic

**Diagnostic Symptoms:**
- Specific services unreachable
- Traffic blocked unexpectedly
- Partial network outage
- Application connectivity failures

**Troubleshooting Commands & Remediation:**
- `Check applied ACLs with 'show access-lists' (Cisco) or 'display acl all' (Huawei)`
- `Verify ACL is applied in correct direction (in/out)`
- `Check ACL order and hit counts`
- `Test with 'permit ip any any' to verify ACL is the issue`
- `Review ACL rules for implicit denies`

### Implicit Deny Not Considered (Severity: MEDIUM)

ACL without explicit permit at the end, traffic blocked by implicit deny

**Diagnostic Symptoms:**
- Traffic not matching any ACL entry is dropped
- Unexplained connectivity issues
- Works for some traffic, fails for others

**Troubleshooting Commands & Remediation:**
- `Remember every ACL has implicit deny at the end`
- `Check if 'permit ip any any' is missing`
- `Review ACL hit counts to see what's matching`
- `Verify last line of ACL`

### ACL Applied in Wrong Direction (Severity: MEDIUM)

Apply ACL in wrong direction (inbound vs outbound)

**Diagnostic Symptoms:**
- Traffic blocked in one direction only
- Asymmetric connectivity
- Works one way but not the other

**Troubleshooting Commands & Remediation:**
- `Check ACL direction with 'show ip interface'`
- `Inbound ACL: applied to traffic entering interface`
- `Outbound ACL: applied to traffic leaving interface`
- `Verify direction matches intent`

### ACL Overlap or Conflict (Severity: HIGH)

Multiple ACLs with overlapping or conflicting rules

**Diagnostic Symptoms:**
- Traffic blocked unexpectedly
- Unintended traffic permitted
- ACL rule precedence issues
- Security policy not enforced as expected

**Troubleshooting Commands & Remediation:**
- `Check all ACLs applied to the interface`
- `ACLs are processed in order, first match wins`
- `More specific rules should come before general rules`
- `Check for 'remark' comments explaining ACL purpose`
- `Use 'show access-lists <acl-name>' to see rule order`
- `Test each ACL separately to identify conflicts`

### Zone-Based Firewall Policy Missing (Severity: HIGH)

Configure zone-based firewall but forget to allow traffic between zones

**Diagnostic Symptoms:**
- Traffic dropped between zones
- Inter-zone communication blocked
- Zone-pair policy not configured
- Traffic allowed locally but dropped at zone boundary

**Troubleshooting Commands & Remediation:**
- `Check zones with 'show zone' or 'show zone-pair security'`
- `Verify zone-pair policies exist for traffic direction`
- `Ensure zones are assigned to interfaces`
- `Check 'inspect' or 'pass' action in zone-pair policy`
- `Review policy match statistics`
- `Default inter-zone policy is deny (deny-all)`

### ACL Sequence Number / Rule Order Misconfiguration (Severity: HIGH)

Configure ACL entries in wrong order causing more specific rules to be bypassed by broader rules

**Diagnostic Symptoms:**
- Traffic matching wrong rule in ACL
- Specific permit/deny entry never matched (hit count zero)
- Broader rule before specific rule blocking intended traffic
- ACL first-match-wins behavior causing confusion

**Troubleshooting Commands & Remediation:**
- `ACLs process sequentially: first match = action taken`
- `Place more specific rules before general rules`
- `Check hit counts: 'show access-lists <name>'`
- `Use sequence numbers to insert rules at specific positions`
- `No-match traffic hits implicit deny at end`
- `Re-ordering ACL may require removing and re-applying`

### Extended ACL Protocol / Port Matching Error (Severity: MEDIUM)

Configure extended ACL with wrong protocol (TCP/UDP) or source/destination port causing incorrect filtering

**Diagnostic Symptoms:**
- Extended ACL allowing or blocking wrong type of traffic
- TCP traffic permitted but UDP blocked (or vice versa)
- Port numbers reversed (source vs destination)
- ACL 'eq' vs 'gt' vs 'lt' range comparison wrong

**Troubleshooting Commands & Remediation:**
- `Check ACL direction: extended ACLs can distinguish TCP from UDP`
- `Verify source and destination port placement (TCP flags matter)`
- `Use 'established' keyword for TCP return traffic`
- `'eq =80' matches port 80; 'gt 1024' matches ports > 1024`
- `'range <start> <end>' for port ranges`
- `Check 'show access-lists <name>' for matching entries`

### Time-Based ACL / Time Range Configuration Error (Severity: LOW)

Configure time-based ACL with incorrect time range causing rules to be active when they shouldn't

**Diagnostic Symptoms:**
- Time-based ACL active outside intended hours
- ACL not enabled during expected time window
- Time range not matching configured schedule
- Clock/calendar not synchronized for time-based rules

**Troubleshooting Commands & Remediation:**
- `Use 'time-range <name>' to define time windows`
- `'periodic' for recurring schedule (weekdays, weekend)`
- `'absolute' for one-time window (start/end date+time)`
- `Apply ACL entry: 'permit/deny <proto> <src> <dst> time-range <name>'`
- `Ensure router clock is synchronized via NTP`
- `Check 'show time-range <name>' for active status`

### Reflexive ACL / Session Filtering Misconfiguration (Severity: HIGH)

Configure reflexive ACL causing return traffic to be blocked due to incorrect session state management

**Diagnostic Symptoms:**
- Traffic can initiate session but return traffic blocked
- Reflexive ACL entries not created for outbound traffic
- Session ACL timeout too short for application
- Reflexive ACL not compatible with certain applications

**Troubleshooting Commands & Remediation:**
- `Reflexive ACL: auto-creates permit entry for return traffic`
- `Use 'evaluate <name>' and 'reflect <name>' for reflexive ACL`
- `Reflexive entries are temporary (removed after idle timeout)`
- `TCP timeout default: 300 seconds`
- `Not suitable for applications with dynamic ports (FTP, SIP)`
- `Consider stateful firewall (ZB FW) instead of reflexive ACL`

### ACL Logging / Log-Update Misconfiguration (Severity: LOW)

Configure ACL logging causing excessive log generation or missing important drops

**Diagnostic Symptoms:**
- Excessive ACL log messages filling syslog
- High CPU from ACL logging for matched traffic
- Important drops not logged
- Log entries rate-limited making debugging incomplete

**Troubleshooting Commands & Remediation:**
- `Add 'log' keyword to ACL entries for logging matches`
- `Log is rate-limited (default: first match, then every 60s)`
- `Use 'log-input' to include input interface in log`
- `Excessive logging can cause high CPU on control plane`
- `Use 'show logging' for ACL log entries`
- `Consider logging only deny entries, not permits`

### VLAN ACL (VACL) / VLAN-Wide Filtering Issue (Severity: HIGH)

Configure VLAN ACL (VACL) incorrectly causing intra-VLAN traffic blocking or misrouting

**Diagnostic Symptoms:**
- Traffic within same VLAN being dropped
- VACL blocking legitimate inter-host traffic
- VACL capture/redirect not working
- VACL and port ACL interaction causing unexpected drops

**Troubleshooting Commands & Remediation:**
- `VACL applies to ALL traffic within a VLAN (transit too)`
- `Configure 'vlan access-map <name>' and 'vlan filter <name> vlan-list <list>'`
- `VACL default is permit (unlike port ACL)`
- `VACL + PACL (Port ACL): PACL takes precedence over VACL`
- `Check 'show vlan access-map <name>' for map entries`
- `VACL can forward, drop, or redirect traffic`

### IPv6 ACL / ICMPv6 Filtering Misconfiguration (Severity: HIGH)

Configure IPv6 ACL without proper ICMPv6 handling, blocking essential IPv6 neighbor discovery

**Diagnostic Symptoms:**
- IPv6 neighbor discovery blocked by ACL
- Router advertisements / solicitations dropped
- IPv6 devices cannot discover each other
- SLAAC and DAD (Duplicate Address Detection) failing

**Troubleshooting Commands & Remediation:**
- `ICMPv6 types: ND (133-137), DAD uses MLD (130-132)`
- `Essential ICMPv6 types for IPv6 operation: 133-137`
- `Use 'permit icmp any any nd-na' and 'permit icmp any any nd-ns'`
- `MLD queries/reports/replies (130-132) must be permitted`
- `IPv6 ACL: 'ipv6 access-list <name>' for IPv6 traffic`
- `Check 'show ipv6 interface <intf>' for ND status`

