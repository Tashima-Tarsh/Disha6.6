---
name: "Infrastructure Security Issues Injection"
description: "Control Plane Policing, uRPF, management plane security related network faults"
category: "computer-networking"
---

# Infrastructure Security Issues Injection

Control Plane Policing, uRPF, management plane security related network faults

## Supported Protocols
- copp
- urpf
- control-plane
- management-plane
- security

## Fault Injection Scenarios & Troubleshooting Procedures

### CoPP (Control Plane Policing) Not Configured (Severity: HIGH)

Control Plane Policing not configured leaving the control plane unprotected against DoS

**Diagnostic Symptoms:**
- High CPU on route processor under normal traffic
- Control plane vulnerable to DoS attacks
- Routing protocol packets compete with management traffic
- No rate limiting on packets destined to control plane

**Troubleshooting Commands & Remediation:**
- `Check 'show control-plane' for CoPP policy`
- `Configure: 'control-plane' then 'service-policy input <policy-map>'`
- `CoPP classifies: routing protocol vs management vs unknown`
- `Typical classes: ospf, bgp, ssh, snmp, icmp, unknown`
- `Without CoPP: all control plane traffic gets same priority`
- `Use 'show policy-map control-plane' for CoPP statistics`

### CoPP Too Restrictive Blocking Legitimate Traffic (Severity: HIGH)

Configure CoPP with rate-limiter that drops legitimate routing protocol or management packets

**Diagnostic Symptoms:**
- OSPF/BGP/EIGRP neighbor flapping
- SSH sessions timeout or rejected
- ICMP unreachable not generated
- CoPP drop counters incrementing for routing protocols

**Troubleshooting Commands & Remediation:**
- `Check 'show policy-map control-plane class <class>' for drops`
- `CoPP classes: match protocol (ospf, bgp, ssh, snmp, telnet)`
- `If routing protocol class is dropping: increase rate`
- `Default CoPP rate may be too low for busy routers`
- `Use 'show policy-map control-plane class <name>' to see conform/exceed`
- `Adjust rates: 'police <rate> <burst>' in policy-map`

### CoPP Missing Critical Protocol Class (Severity: HIGH)

Configure CoPP but missing class for essential routing or management protocol

**Diagnostic Symptoms:**
- CoPP policy does not classify specific routing protocol
- BGP packets dropped (no specific class)
- ICMP traffic not rate-limited but supposed to be
- Some protocols go through default class (not properly handled)

### uRPF (Unicast RPF) Not Configured (Severity: HIGH)

Configure interfaces without uRPF allowing IP spoofed traffic to enter the network

**Diagnostic Symptoms:**
- IP spoofing possible from connected subnet
- Source address validation not enforced on edge
- DDoS reflection/amplification traffic can enter
- No anti-spoofing protection on customer-facing interfaces

### uRPF Strict Mode Blocking Legitimate Asymmetric Traffic (Severity: HIGH)

Configure uRPF strict mode causing drops for asymmetric routed traffic

**Diagnostic Symptoms:**
- Legitimate packets dropped due to uRPF strict check
- Asymmetric routing causing uRPF failures
- Traffic from valid source dropped on return path
- uRPF drops incrementing for known-good sources

### Management Plane / VTY Access-List Not Configured (Severity: HIGH)

Configure VTY lines without access-class allowing unauthorized management access

**Diagnostic Symptoms:**
- Management access allowed from any source IP
- VTY lines not protected by access-class
- Unauthorized IPs can SSH/telnet to router
- Management plane exposure to network

### Management Plane CoPP / Rate-Limit Missing (Severity: MEDIUM)

Configure CoPP without management traffic class causing SSH/SNMP susceptible to DoS

**Diagnostic Symptoms:**
- SSH sessions drop during high CPU
- Management plane traffic competes with routing protocols
- CoPP has no dedicated class for SSH/SNMP/NTP
- Management access lost during network incidents

### Management VRF / Dedicated Mgmt Interface Misconfiguration (Severity: MEDIUM)

Configure management VRF or dedicated management interface incorrectly

**Diagnostic Symptoms:**
- Management traffic using production routing table
- Management VRF not separating management from production
- Route-leaking between mgmt VRF and production VRFs
- Management interface not configured in correct VRF

### CoPP Class-Map / Protocol Matching Not Working (Severity: HIGH)

Configure CoPP class-map with match protocol but protocol not classified correctly

**Diagnostic Symptoms:**
- CoPP class-map match count shows no hits
- Protocol packets classified into default class
- NBAR protocol matching not working for CoPP
- Routing protocol BGP/OSPF packets bypass CoPP classes

### uRPF Allow-List / Bogon Filter Misconfiguration (Severity: HIGH)

Configure uRPF allow-list incorrectly permitting spoofed traffic or blocking legitimate sources

**Diagnostic Symptoms:**
- Spoofed traffic passes uRPF due to allow-list
- uRPF allow-list blocking legitimate customer prefixes
- Allow-list too permissive allowing bogon source addresses
- uRPF strict + allow-list interaction unexpected

### CoPP for ICMP Unreachable / Trap Rate-Limit Issue (Severity: MEDIUM)

Configure CoPP without ICMP class causing excessive ICMP unreachable generation or suppression

**Diagnostic Symptoms:**
- ICMP unreachable not generated during high traffic
- Traceroute fails in transit because TTL-expired not sent
- CoPP ICMP class rate limiting too aggressively
- Router not generating fragmentation-needed packets

### Control Plane Protection (CPPr) / Sub-Interface Misconfiguration (Severity: HIGH)

Configure CPPr (Cisco Control Plane Protection) with wrong sub-interface classification

**Diagnostic Symptoms:**
- CPPr host sub-interface blocking legitimate traffic to router
- CPPr transit sub-interface misclassified as host
- CPPr cef-exception traffic not matching expected class
- Control plane protection bypassed due to incorrect classification

