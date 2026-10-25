---
name: "DHCP Issues Injection"
description: "DHCP server, DHCP relay, DHCPv6, prefix delegation related network faults for troubleshooting practice"
category: "computer-networking"
---

# DHCP Issues Injection

DHCP server, DHCP relay, DHCPv6, prefix delegation related network faults for troubleshooting practice

## Supported Protocols
- dhcp
- dhcpv6
- dhcp-relay
- dhcp-server

## Fault Injection Scenarios & Troubleshooting Procedures

### DHCP Address Pool Exhausted (Severity: HIGH)

Configure DHCP pool too small for number of clients causing new clients unable to obtain addresses

**Diagnostic Symptoms:**
- New DHCP clients fail to obtain IP address
- DHCP server logs 'address pool exhausted'
- Manual static IP works but DHCP does not
- Some hosts get IP while new ones cannot

**Troubleshooting Commands & Remediation:**
- `Check DHCP pool usage with 'show ip dhcp binding'`
- `Verify 'network <prefix> <mask>' address range`
- `Use 'ip dhcp excluded-address' to check reserved range`
- `Default lease time is 1 day (reduces churn)`
- `Increase pool size or reduce lease time`
- `Check 'show ip dhcp pool <name>' for utilization statistics`

### DHCP Pool Subnet / Default Gateway Mismatch (Severity: HIGH)

Configure DHCP pool with wrong subnet or default-router not matching client VLAN

**Diagnostic Symptoms:**
- DHCP clients receive IP addresses but cannot reach default gateway
- Default gateway IP different from client subnet
- Hosts get IP but have no network connectivity
- Ping to default gateway fails despite DHCP success

**Troubleshooting Commands & Remediation:**
- `Check 'default-router <ip>' in DHCP pool matches client subnet`
- `Verify 'network <network> <mask>' covers client subnet`
- `Client gets address from DHCP but routing fails if gw wrong`
- `Use 'show ip dhcp pool' to verify pool configuration`
- `DHCP options: 3 (default-router), 6 (dns-server)`
- `Ping the default gateway from a client to verify`

### DHCP Static / Manual Binding Misconfiguration (Severity: MEDIUM)

Configure DHCP static binding (reservation) with wrong MAC address or IP

**Diagnostic Symptoms:**
- Specific host does not get the reserved IP address
- IP assigned to different device than expected
- MAC mismatch between DHCP binding and client
- Duplicate IP due to reservation overlapping with pool

### DHCP Relay / UDP 67/68 Forwarding Failure (Severity: CRITICAL)

Configure DHCP relay (ip helper-address) but DHCP discover/offer not forwarded

**Diagnostic Symptoms:**
- DHCP clients in relay VLAN cannot get IP address
- DHCP discover never reaches the server
- DHCP server responds but reply not forwarded back
- Only directly connected VLAN clients get IP

### DHCP Relay giaddr / Source Subnet Identification Error (Severity: HIGH)

Configure DHCP relay but giaddr (gateway address) not set correctly causing server fails to assign correct subnet

**Diagnostic Symptoms:**
- DHCP clients receive IP from wrong subnet pool
- Server cannot determine which pool to allocate from
- Relay giaddr missing or set to wrong IP
- Client gets IP that does not match its VLAN

### DHCP Unicast Reply / Server Unreachable for Unicast (Severity: HIGH)

Configure DHCP relay but server cannot reach client via unicast for ACK/NAK

**Diagnostic Symptoms:**
- DHCP DISCOVER/OFFER works but ACK fails
- Client gets to SELECTING state but never gets ACK
- DHCP relay forwards discovery but reply fails
- Intermittent DHCP success

### DHCP Option / Additional Parameters Missing (Severity: MEDIUM)

Configure DHCP pool without essential options causing client operation issues

**Diagnostic Symptoms:**
- DHCP clients get IP but cannot resolve hostnames (no DNS)
- DHCP clients cannot reach outside network (no domain-list)
- PXE/network boot clients fail (no next-server/option 66)
- IP phones cannot find call manager (option 150)

### DHCP Lease Time / Renewal Misconfiguration (Severity: LOW)

Configure DHCP lease time too short causing excessive renewal traffic or too long causing address depletion

**Diagnostic Symptoms:**
- Frequent DHCP renewal requests filling server logs
- DHCP server high CPU due to lease renewals
- Address pool depletion due to long lease times
- Clients fail to renew before lease expiry

### DHCPv6 Stateless / Stateful Mode Misconfiguration (Severity: HIGH)

Configure DHCPv6 with wrong mode (stateless vs stateful) for client needs

**Diagnostic Symptoms:**
- DHCPv6 clients do not receive IPv6 addresses
- Clients get other-config but no managed address
- IPv6 SLAAC works but DHCPv6 assigned address missing
- Stateless DHCPv6 providing addresses incorrectly

### DHCPv6 Prefix Delegation / Prefix Pool Misconfiguration (Severity: HIGH)

Configure DHCPv6 prefix delegation (PD) but CE does not receive delegated prefix

**Diagnostic Symptoms:**
- CPE router does not receive IPv6 prefix via DHCPv6 PD
- DHCPv6 IA-PD option missing from server response
- CE router cannot assign global IPv6 addresses downstream
- DHCPv6 prefix pool exhausted

### DHCPv6 Rapid Commit / Two-Way Exchange Failure (Severity: MEDIUM)

Configure DHCPv6 rapid commit on server but client does not support two-way exchange

**Diagnostic Symptoms:**
- DHCPv6 rapid commit not used despite configuration
- Client falls back to four-way exchange (SOLICIT-ADVERTISE-REQUEST-REPLY)
- Rapid commit option missing from server reply
- Longer DHCPv6 exchange time than expected

