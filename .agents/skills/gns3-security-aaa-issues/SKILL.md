---
name: "802.1X/AAA Issues Injection"
description: "802.1X network access control and AAA (RADIUS, TACACS+) related network faults"
category: "computer-networking"
---

# 802.1X/AAA Issues Injection

802.1X network access control and AAA (RADIUS, TACACS+) related network faults

## Supported Protocols
- 802.1x
- aaa
- radius
- tacacs+
- mab

## Fault Injection Scenarios & Troubleshooting Procedures

### 802.1X Not Enabled on Required Port (Severity: HIGH)

802.1X not enabled on ports that require network access control

**Diagnostic Symptoms:**
- Unauthenticated devices allowed on the network
- Port open without 802.1X authentication
- No 802.1X authentication on access port
- Security policy bypassed

**Troubleshooting Commands & Remediation:**
- `Check 802.1X with 'show dot1x all' or 'show dot1x interface <intf>'`
- `Enable: 'dot1x system-auth-control' globally`
- `Per port: 'authentication port-control auto'`
- `Port states: force-authorized (open), force-unauthorized (closed), auto (802.1X)`
- `Check 'show authentication sessions' for session status`
- `Multi-auth/host mode: 'authentication host-mode multi-host'`

### 802.1X RADIUS Server Misconfiguration (Severity: HIGH)

Configure 802.1X with unreachable or misconfigured RADIUS server

**Diagnostic Symptoms:**
- 802.1X authentication fails (timeout)
- RADIUS server not responding
- Wrong shared secret on switch or server
- RADIUS server reachability issues

**Troubleshooting Commands & Remediation:**
- `Check RADIUS with 'show radius server'`
- `Verify 'radius-server host <ip> key <secret>'`
- `Test: 'test aaa group radius <user> <pass>'`
- `Check RADIUS ports: UDP 1812 (auth), 1813 (acct)`
- `Old standard: UDP 1645 (auth), 1646 (acct)`
- `Check 'debug radius' for detailed exchange`

### 802.1X Port Control Mode Wrong (Severity: HIGH)

Configure wrong 802.1X port control state on the switchport

**Diagnostic Symptoms:**
- Port always open (force-authorized) bypassing authentication
- Port always blocked (force-unauthorized) blocking all devices
- Port in auto mode but supplicant not responding
- Devices not passing authentication

**Troubleshooting Commands & Remediation:**
- `Check port control with 'show authentication interface <intf>'`
- `force-authorized: port open (no auth), default for most ports`
- `force-unauthorized: port blocked (ignores auth attempts)`
- `auto: 802.1X authentication required`
- `Use 'authentication port-control auto' for 802.1X enabled ports`
- `Use 'authentication event fail action next-method' for fallback`

### 802.1X MAC Authentication Bypass (MAB) Misconfiguration (Severity: MEDIUM)

Configure MAB incorrectly or not as fallback for non-802.1X devices

**Diagnostic Symptoms:**
- Non-802.1X devices (printers, phones) cannot authenticate
- MAB not attempted as fallback after 802.1X timeout
- MAB configured before 802.1X in method list (wrong order)
- Device stuck unable to access network

**Troubleshooting Commands & Remediation:**
- `MAB uses device MAC address as username/password to RADIUS`
- `Order: 'authentication order dot1x mab' (try 802.1X first)`
- `Or: 'authentication order mab dot1x' (MAB first for non-802.1X devices)`
- `Check 'show authentication interface <intf>' for method order`
- `RADIUS server must have MAC addresses configured as users`
- `MAC format: xxxx.xxxx.xxxx (no hyphens, lowercase)`

### AAA New Model Not Enabled (Severity: HIGH)

Configure AAA commands without enabling 'aaa new-model'

**Diagnostic Symptoms:**
- AAA commands not recognized or not taking effect
- Authentication methods not working
- Login authentication failing
- aaa commands rejected by CLI

**Troubleshooting Commands & Remediation:**
- `Enable: 'aaa new-model' globally (required for all AAA)`
- `Without new-model, AAA commands are not available`
- `Enabling new-model changes default login authentication`
- `Default after new-model: local authentication for all logins`
- `Create login method: 'aaa authentication login default group radius local'`
- `Be careful enabling new-model remotely (can lock you out)`

### AAA Authorization Method Misconfiguration (Severity: HIGH)

Configure AAA authorization incorrectly blocking commands or access

**Diagnostic Symptoms:**
- Commands executed by privileged users blocked
- Authorization failures in logs
- User authenticated but cannot execute commands
- TACACS+ command authorization rejecting valid commands

**Troubleshooting Commands & Remediation:**
- `AAA authorization types: exec, network, commands <level>, config-commands`
- `Check with 'show aaa sessions' for authorization status`
- `TACACS+ authorizes each command individually`
- `RADIUS authorizes via AV pairs (service-type, priv-lvl)`
- `Use 'authorization exec default group tacacs+' for shell access`
- `Use 'authorization commands 15 default group tacacs+' for enable mode`

### AAA Accounting Not Configured (Severity: LOW)

AAA accounting not sending logs for security or billing

**Diagnostic Symptoms:**
- No command logging for audit trail
- Accounting records not sent to AAA server
- No start/stop records for user sessions
- Billing or compliance logs missing

**Troubleshooting Commands & Remediation:**
- `Accounting types: exec, commands, network, connection, system`
- `'accounting exec default start-stop group <method>'`
- `'accounting commands 15 default start-stop group <method>'`
- `Start-stop sends both start and stop records`
- `Stop-only only sends stop record`
- `Check AAA server for received accounting packets`

### 802.1X RADIUS VLAN Assign / Restricted VLAN Issue (Severity: HIGH)

Configure RADIUS VLAN assignment but VLAN not applied or restricted VLAN blocking unauthorized devices

**Diagnostic Symptoms:**
- RADIUS-returned VLAN not applied to the port
- Guest VLAN not isolating unauthenticated devices
- Restricted VLAN not blocking unauthorized access
- VLAN override not working via RADIUS attribute

**Troubleshooting Commands & Remediation:**
- `RADIUS attribute [64] Tunnel-Type=VLAN, [65] Tunnel-Medium-Type=802, [81] Tunnel-Private-Group-ID=VLAN-ID`
- `Check 'show authentication interface <intf>' for authorized VLAN`
- `Configure 'vlan assignment authorized' for dynamic VLAN`
- `Guest VLAN: 'authentication event no-response action authorize vlan <id>'`
- `Restricted VLAN: 'authentication event fail action authorize vlan <id>'`
- `RADIUS-returned VLAN must exist on the switch`

### 802.1X RADIUS Server Failure / Critical Auth (Severity: HIGH)

Configure 802.1X but RADIUS server fails and critical authentication behavior wrong

**Diagnostic Symptoms:**
- All 802.1X authentication fails when RADIUS unreachable
- Critical VLAN not enabled when RADIUS down
- Ports stay unauthorized when AAA server fails
- Network access completely lost during RADIUS outage

**Troubleshooting Commands & Remediation:**
- `Critical auth: 'authentication critical' for RADIUS failure scenarios`
- `Critical VLAN: 'authentication event server dead action authorize vlan <id>'`
- `Recovery VLAN: re-authenticate when server recovers`
- `Fallback to local: create local accounts on switch`
- `Multiple RADIUS servers for redundancy`
- `Check 'show authentication sessions' for critical auth status`

### 802.1X Host Mode / Multi-Domain Multi-Host Misconfig (Severity: LOW)

Configure 802.1X host mode incorrectly allowing too many or too few devices

**Diagnostic Symptoms:**
- More devices than expected on single-authenticated port
- Second device fails authentication
- IP phone PC port not authenticating PC separately
- Hub behind 802.1X port causing multiple hosts

**Troubleshooting Commands & Remediation:**
- `Host modes: single-host, multi-host, multi-domain, multi-auth`
- `Single-host: one device only (default)`
- `Multi-domain: one voice + one data device`
- `Multi-auth: authenticate each device individually`
- `Multi-host: first successful auth opens for all`
- `Check 'show authentication interface <intf>' for host mode`

### TACACS+ Command Authorization / Privilege Level Issue (Severity: HIGH)

Configure TACACS+ command authorization but privilege levels not matching user roles

**Diagnostic Symptoms:**
- User cannot execute permitted commands
- Unauthorized commands permitted
- Privilege level 15 users restricted by TACACS+
- Command set not matching role/group assignment

**Troubleshooting Commands & Remediation:**
- `TACACS+ authorizes each CLI command individually`
- `Privilege levels: 0-15 (15=enable, 1=user, 0=logout)`
- `Check 'show privilege' for current level`
- `Use 'aaa authorization commands <level> default group tacacs+'`
- `TACACS+ server sends permit/deny per command`
- `Check 'debug aaa authorization' for command-level decisions`

### 802.1X Dynamic / Inline Power / Policy Push Failure (Severity: HIGH)

Configure 802.1X with RADIUS policy push for ACL/VLAN but policy not applied

**Diagnostic Symptoms:**
- RADIUS-returned ACL not applied to port
- RADIUS-returned QoS policy not functioning
- Dynamic VLAN assignment via RADIUS not working
- Per-user ACL not filtering as expected

**Troubleshooting Commands & Remediation:**
- `RADIUS can push: VLAN, ACL, QoS, session-timeout, idle-timeout`
- `Check 'show authentication interface <intf> detail' for pushed policies`
- `Common attributes: Cisco-AV-Pair for ACL/QoS`
- `Format: 'ip:inacl#1=permit ip any any' or 'ipv6:inacl#1=permit ipv6 any any'`
- `Dynamic ACL applied after authentication only`
- `Check 'show ip access-lists dynamic' for active dynamic ACLs`

