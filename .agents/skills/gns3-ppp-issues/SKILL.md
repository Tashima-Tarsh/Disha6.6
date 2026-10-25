---
name: "PPP/Serial Issues Injection"
description: "PPP encapsulation, CHAP/PAP authentication and serial link related network faults"
category: "computer-networking"
---

# PPP/Serial Issues Injection

PPP encapsulation, CHAP/PAP authentication and serial link related network faults

## Supported Protocols
- ppp
- chap
- pap
- serial
- hdlc
- mlppp

## Fault Injection Scenarios & Troubleshooting Procedures

### PPP Encapsulation / HDLC Mismatch (Severity: HIGH)

Configure HDLC on one side and PPP on the other causing serial link protocol down

**Diagnostic Symptoms:**
- Serial interface up/up but protocol down
- Line protocol down on serial interface
- Encapsulation mismatch between endpoints
- Keepalive sent but not acknowledged

**Troubleshooting Commands & Remediation:**
- `Check 'show interfaces serial <id>' for encapsulation type`
- `Default encapsulation on Cisco: HDLC`
- `Use 'encapsulation ppp' to switch to PPP`
- `Both sides must match encapsulation exactly`
- `HDLC <-> PPP mismatch: Layer 1 up, Layer 2 down`
- `Common when connecting Cisco (HDLC default) to non-Cisco (PPP default)`

### PPP CHAP Authentication Password Mismatch (Severity: HIGH)

Configure CHAP with mismatched passwords causing PPP authentication failure

**Diagnostic Symptoms:**
- PPP link comes up but authentication fails
- CHAP challenge/response failure
- Serial line protocol up but then drops
- Authentication failure errors in logs

### PPP CHAP Router Hostname / Username Mismatch (Severity: HIGH)

Configure CHAP but router hostname does not match the username expected by the peer

**Diagnostic Symptoms:**
- CHAP authentication fails despite correct password
- CHAP challenge uses wrong hostname
- Router hostname changed but CHAP config not updated
- One side expects username based on old hostname

### PPP PAP Authentication / Clear-Text Credentials Issue (Severity: MEDIUM)

Configure PAP authentication with incorrect username or password

**Diagnostic Symptoms:**
- PPP authentication fails with PAP
- PAP username/password mismatch
- Serial line protocol up but drops after auth
- Both sides send credentials at same time (two-way auth)

### PPP Authentication Protocol Type Mismatch (Severity: HIGH)

Configure CHAP on one side and PAP on the other causing PPP authentication failure

**Diagnostic Symptoms:**
- PPP link negotiation fails at LCP phase
- Authentication protocol option mismatch
- LCP keeps restarting authentication negotiation
- Link stays up but no IP traffic passes

### PPP IPCP / IP Address Negotiation Failure (Severity: MEDIUM)

Configure PPP IPCP with wrong IP address negotiation causing no IP on interface

**Diagnostic Symptoms:**
- Serial interface up/up but no IP address assigned
- IPCP negotiation fails
- PPP link up but cannot ping the remote end
- IP address not assigned via IPCP

### MLP (Multilink PPP) Fragment / Bundle Misconfiguration (Severity: HIGH)

Configure MLP with member links but bundle not established or fragment reorder fails

**Diagnostic Symptoms:**
- Multilink bundle not coming up
- Member links in the bundle but no traffic passes
- Packet fragmentation/reassembly mismatch
- Bundle interface down despite member links up

