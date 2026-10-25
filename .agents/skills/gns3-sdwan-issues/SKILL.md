---
name: "SD-WAN Issues Injection"
description: "SD-WAN fabric, OMP, TLOC, vSmart/vEdge configuration related network faults"
category: "computer-networking"
---

# SD-WAN Issues Injection

SD-WAN fabric, OMP, TLOC, vSmart/vEdge configuration related network faults

## Supported Protocols
- sdwan
- omp
- tloc
- vmanage
- vsmart
- vedge

## Fault Injection Scenarios & Troubleshooting Procedures

### vManage / vSmart Control Connection Failure (Severity: CRITICAL)

Configure SD-WAN but vEdge/cEdge cannot establish control connection to vManage or vSmart

**Diagnostic Symptoms:**
- vEdge shows 'control-down' status
- vManage lists device as unreachable
- DTLS/TLS connection to vSmart fails
- Device not visible in vManage inventory

**Troubleshooting Commands & Remediation:**
- `Check control connection: 'show control-connections' on vEdge`
- `vSmart IP must be reachable from vEdge transport interface`
- `DTLS uses UDP 12346, TLS uses TCP 443`
- `Authentication: 'organization-name' must match on all controllers`
- `Certificate validation: verify root CA certificate`
- `Verify firewall permits DTLS/TLS between vEdge and controllers`

### OMP (Overlay Management Protocol) Session Failure (Severity: CRITICAL)

Configure OMP but session between vEdge and vSmart not established

**Diagnostic Symptoms:**
- OMP session shows 'down'
- No routes exchanged via OMP
- Site prefixes not advertised to fabric
- Remote site routes missing from routing table

**Troubleshooting Commands & Remediation:**
- `Check 'show omp peers' for OMP session status`
- `OMP runs over DTLS between vEdge and vSmart`
- `Ensure DTLS control connection is up first`
- `OMP peering initiated automatically by vSmart`
- `Check 'show omp sessions' for session state`
- `Reconnect: 'request control-connect' on vEdge`

### OMP Route Advertisement / Withdrawal Issue (Severity: HIGH)

Configure OMP route policies incorrectly causing routes not to be advertised or accepted

**Diagnostic Symptoms:**
- Site routes not advertised via OMP
- Remote prefixes not received at site
- OMP route filtering blocking legitimate routes
- Some sites have partial routing information

### TLOC (Transport Locator) Unreachable (Severity: CRITICAL)

Configure SD-WAN TLOC but BFD session between TLOCs not established

**Diagnostic Symptoms:**
- Remote TLOC shown as 'down'
- BFD sessions between vEdges not established
- IPsec tunnels between sites not formed
- Site-to-site connectivity broken

### SD-WAN Color / Transport Type Mismatch (Severity: HIGH)

Configure different TLOC colors on transport interfaces causing hub-spoke tunnel failure

**Diagnostic Symptoms:**
- vEdge-to-vEdge IPsec tunnel not forming
- TLOC color mismatch between hub and spoke
- Spoke cannot establish tunnel to hub with different color
- Transport preference configured but not working

### SD-WAN BFD / Hello Timer Misconfiguration (Severity: MEDIUM)

Configure SD-WAN BFD timers too aggressively causing false failure detection

**Diagnostic Symptoms:**
- BFD sessions flapping between vEdges
- False positive link failure detection
- BFD hello timer too short for link latency
- App-route policy switching paths unnecessarily

### SD-WAN App-Route Policy / Traffic Steering Misconfiguration (Severity: HIGH)

Configure App-Route policy but traffic not directed to intended transport

**Diagnostic Symptoms:**
- Application traffic not using designated transport
- App-route policy match counters showing no hits
- Traffic load-balanced across unexpected transports
- Application SLA not met due to wrong path selection

### SD-WAN Data Policy / Centralized Policy Misconfiguration (Severity: HIGH)

Configure vSmart centralized data policy but not applied to correct site-list or VPN-list

**Diagnostic Symptoms:**
- Centralized data policy not taking effect
- Site-list or VPN-list not matching expected sites
- Policy direction (inbound/outbound) incorrect
- Traffic not matching policy match criteria

### SD-WAN VPN / Service VPN Configuration Error (Severity: HIGH)

Configure SD-WAN service VPN with incorrect interface or route leaking between VPNs

**Diagnostic Symptoms:**
- Service VPN (vpn 1-511) not forwarding traffic
- VPN interface not configured or attached to wrong VPN
- Route leaking between service VPNs not working
- Traffic in one VPN cannot reach another VPN

### SD-WAN Site-ID / System-IP Duplicate (Severity: CRITICAL)

Configure duplicate system-IP or site-ID across SD-WAN fabric causing route confusion

**Diagnostic Symptoms:**
- Duplicate System-IP detected in fabric
- vSmart sees multiple vEdges with same System-IP
- OMP routes from one site interfering with another
- Site-ID mismatch causing TLOC affinity issues

### SD-WAN vSmart Policy / Centralized Policy Not Applied (Severity: HIGH)

Configure vSmart centralized policy but vEdges not receiving or applying it

**Diagnostic Symptoms:**
- vEdge shows no policy received from vSmart
- Policy configured on vSmart but no effect in network
- Centralized policy not pushed to specific vEdge
- Policy mismatch between vSmart and vEdge versions

### SD-WAN Secure Fabric / Control/Data Plane Authentication (Severity: HIGH)

Configure SD-WAN control and data plane authentication with incorrect parameters

**Diagnostic Symptoms:**
- vEdge cannot join fabric - control authentication failure
- IPsec tunnel between vEdges not forming (data auth fail)
- Organization name mismatch
- Certificate validation fails for vEdge

