---
name: "SNMP/Syslog/Logging Issues Injection"
description: "SNMP, Syslog, logging and monitoring related network faults for troubleshooting practice"
category: "computer-networking"
---

# SNMP/Syslog/Logging Issues Injection

SNMP, Syslog, logging and monitoring related network faults for troubleshooting practice

## Supported Protocols
- snmp
- syslog
- logging
- netconf
- restconf

## Fault Injection Scenarios & Troubleshooting Procedures

### SNMP Community String / Access Mismatch (Severity: HIGH)

Configure SNMP with incorrect community string or access permissions

**Diagnostic Symptoms:**
- NMS cannot poll device via SNMP
- SNMP community string rejected by device
- Read-only access when read-write needed
- SNMP access list blocking NMS IP

**Troubleshooting Commands & Remediation:**
- `Check 'show snmp community' for configured communities`
- `Use 'snmp-server community <string> [ro|rw] [acl]'`
- `Community string is case-sensitive`
- `Default: no SNMP communities configured`
- `ACL on community restricts which NMS can poll`
- `Check NMS configuration: community must match device`

### SNMP Trap / Inform Configuration Failure (Severity: HIGH)

Configure SNMP traps/informs but NMS not receiving notifications

**Diagnostic Symptoms:**
- SNMP traps not received by NMS
- Inform requests timing out
- Trap destination misconfigured
- SNMP trap source interface wrong

**Troubleshooting Commands & Remediation:**
- `Check SNMP trap config: 'show snmp'`
- `Use 'snmp-server host <ip> [version <v>] <community>'`
- `Use 'snmp-server enable traps <type>' for specific traps`
- `Verify NMS IP reachable from trap source interface`
- `Use 'snmp-server source-interface traps <intf>' for consistent source`
- `Check firewall: SNMP traps use UDP 162`

### SNMPv3 Authentication / Encryption Mismatch (Severity: HIGH)

Configure SNMPv3 with mismatched auth/priv parameters between device and NMS

**Diagnostic Symptoms:**
- SNMPv3 polling fails despite configuration
- Authentication failure between NMS and device
- Privacy (encryption) mismatches
- Engine ID mismatch for SNMPv3 users

### Syslog Server Unreachable / Logging Misconfiguration (Severity: LOW)

Configure syslog server but log messages not received

**Diagnostic Symptoms:**
- Syslog messages not reaching server
- Logging rate-limit suppressing messages
- Syslog server IP unreachable
- Source interface for syslog incorrect

### Syslog Rate-Limit / Suppression Misconfiguration (Severity: LOW)

Configure syslog rate-limit too aggressively causing critical messages suppressed

**Diagnostic Symptoms:**
- Important log messages not sent to server
- Rate-limit drops for specific message types
- Syslog 'rate-limit exceeded' messages
- Message sequence number gaps in log analysis

### Logging Buffer Size / History Misconfiguration (Severity: LOW)

Configure logging buffer too small causing log entries overwritten

**Diagnostic Symptoms:**
- Old log entries overwritten in buffer
- Cannot see configuration changes in logs
- Log buffer size too small for normal operation
- Log history missing troubleshooting data

### SNMP ifIndex / Interface Index Persistence Issue (Severity: LOW)

Configure SNMP but interface ifIndex changes after reload causing monitoring gaps

**Diagnostic Symptoms:**
- NMS interface counters inconsistent after reload
- ifIndex changes causing interface history gaps
- SNMP interface mapping wrong after reboot
- Monitoring tool showing wrong interface for known IP

### SNMP ACL / Community Access-List Misconfiguration (Severity: HIGH)

Configure SNMP community with access-list blocking legitimate NMS or allowing unauthorized hosts

**Diagnostic Symptoms:**
- NMS cannot poll device but community string is correct
- Access-list on SNMP community too restrictive
- SNMP server ACL ignoring NMS IP
- No SNMP access despite correct credentials

### SNMP VACM / View-Based Access Control Misconfiguration (Severity: HIGH)

Configure SNMPv3 VACM restricting access to specific MIB trees incorrectly

**Diagnostic Symptoms:**
- SNMPv3 user cannot poll specific OID trees
- VACM view too restrictive blocking legitimate polling
- Read-only access prevents writing but needed
- SNMPv3 user gets noSuchObject for valid OIDs

### Syslog Facility / Level / Origin-ID Misconfiguration (Severity: LOW)

Configure syslog with wrong facility code causing server-side filtering issues

**Diagnostic Symptoms:**
- Syslog messages filtered at server by facility code
- Wrong facility (e.g., local0 vs local7) causing misrouting
- Origin-ID missing making it hard to identify source
- Syslog server cannot distinguish messages from different devices

### SNMP Engine ID / Discovery Conflict (Severity: MEDIUM)

Configure SNMPv3 engine ID incorrectly causing authentication failures

**Diagnostic Symptoms:**
- SNMPv3 user authentication fails on first poll
- Engine ID change invalidates existing SNMPv3 users
- Multiple devices share same engine ID (rare issue)
- SNMPv3 discovery returns unexpected engine ID

