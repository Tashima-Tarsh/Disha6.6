---
name: "BGP FlowSpec/RTBH Issues Injection"
description: "BGP FlowSpec, RTBH and DDoS mitigation related network faults"
category: "computer-networking"
---

# BGP FlowSpec/RTBH Issues Injection

BGP FlowSpec, RTBH and DDoS mitigation related network faults

## Supported Protocols
- bgp
- flowspec
- rtbh

## Fault Injection Scenarios & Troubleshooting Procedures

### BGP FlowSpec Address-Family Not Activated (Severity: LOW)

FlowSpec address-family not activated under BGP causing FlowSpec routes not exchanged

**Diagnostic Symptoms:**
- FlowSpec routes not exchanged between peers
- FlowSpec action not applied to traffic
- BGP session up but no FlowSpec NLRIs exchanged
- Flowspec show commands return no data

**Troubleshooting Commands & Remediation:**
- `Check BGP FlowSpec with 'show bgp ipv4 flowspec summary'`
- `Activate: 'address-family ipv4 flowspec' under BGP`
- `Also needs 'neighbor <ip> activate' under the AF`
- `Send-community extended must be enabled (for extended community actions)`
- `Check 'show bgp ipv4 flowspec' for received rules`
- `IPv6: 'address-family ipv6 flowspec'`

### BGP FlowSpec Action Community Misconfiguration (Severity: LOW)

Configure FlowSpec action extended community (drop/rate-limit/redirect) incorrectly

**Diagnostic Symptoms:**
- FlowSpec rule received but action not applied
- Wrong action applied to traffic (drop vs rate-limit)
- Rate-limit bandwidth value incorrect
- Redirect action pointing to wrong VRF

**Troubleshooting Commands & Remediation:**
- `FlowSpec actions via extended community`
- `Action: 'traffic-rate:0:0' = drop, 'traffic-rate:0:<rate>' = rate-limit in Bps`
- `Redirect: 'redirect-vrf:<vrf-id>' or 'redirect-nexthop:<ip>'`
- `Check 'show bgp ipv4 flowspec <prefix>' for action details`
- `Traffic-rate of 0 drops all matching traffic (blackhole)`
- `Use 'show flowspec' or 'show platform hardware flowspec' for hardware programming`

### BGP FlowSpec Match Rule Too Broad or Too Narrow (Severity: HIGH)

Configure FlowSpec match criteria that is too broad (affects legitimate traffic) or too narrow

**Diagnostic Symptoms:**
- Legitimate traffic dropped by too-broad FlowSpec rule
- Attack traffic not matched by too-narrow rule
- FlowSpec matching unexpected packets
- Collateral damage from DDoS mitigation

**Troubleshooting Commands & Remediation:**
- `FlowSpec match fields: src/dst IP prefix, src/dst port, protocol, ICMP type/code, TCP flags, packet length`
- `Match criteria AND-ed (all must match)`
- `Use exact prefix length for targeted drops`
- `Use port range (gt/lt/eq) for specific applications`
- `TCP flags filter: SYN, ACK, FIN, RST, URG, PSH`
- `Check 'show bgp ipv4 flowspec <prefix>' for match fields`

### RTBH (Remotely Triggered Black Hole) Community Misconfiguration (Severity: HIGH)

Configure RTBH community on trigger router but not matched on edge routers

**Diagnostic Symptoms:**
- RTBH route not installed on edge routers
- Blackhole community not recognized on edge
- Traffic not dropped as expected
- BGP route received but forwarding not affected

**Troubleshooting Commands & Remediation:**
- `RTBH uses static route to null0 with a specific community`
- `Trigger router injects route with community (e.g., 100:666)`
- `Edge router: 'ip community-list <name> permit <community>'`
- `Edge router: 'route-map <name> permit 10 match community <list>' + 'set ip next-hop <null0>'`
- `Check 'show ip bgp <prefix>' on edge for community value`
- `Null0 route must be installed: 'show ip route <prefix>'`

### RTBH Next-Hop / Static Route to Null0 Missing (Severity: HIGH)

RTBH trigger router missing static route to null0 for black hole next-hop

**Diagnostic Symptoms:**
- RTBH route installed but not forwarded to null0
- Prefix routed normally despite RTBH configuration
- No 'ip route <trigger-ip> 255.255.255.255 null0' configured
- Blackhole discard route missing

**Troubleshooting Commands & Remediation:**
- `RTBH requires 'ip route <ip> <mask> null0 <tag> <community>' on trigger`
- `The static route to null0 creates the BGP blackhole entry`
- `Use a specific tag (e.g., 666) for route-map matching`
- `Route-map on edge must set the next-hop to null0`
- `Check 'show ip bgp <prefix>' on edge for next-hop`
- `Verify 'show ip route <prefix>' on edge for null0 next-hop`

### BGP FlowSpec Validation / Origination Issue (Severity: MEDIUM)

FlowSpec route not originated or rejected due to validation failure

**Diagnostic Symptoms:**
- FlowSpec rule not propagated beyond direct peers
- Validation check failure (RFC 5575)
- FlowSpec rule stuck at first hop
- Origination not matching route reachability checks

**Troubleshooting Commands & Remediation:**
- `FlowSpec validation (RFC 5575): dest prefix must match a BGP route`
- `Disable validation with 'bgp flowspec validation disable' for testing`
- `Default: validation is enabled (recommended)`
- `FlowSpec origination via 'local-policy' or route-policy`
- `Check 'show bgp ipv4 flowspec <prefix>' for validation status`
- `On RR: no need for validation (pass-through)`

### BGP FlowSpec Send-Community Missing (Severity: LOW)

Configure FlowSpec without send-community extended, preventing action community propagation

**Diagnostic Symptoms:**
- FlowSpec routes exchanged but without action communities
- Actions (traffic-rate, redirect) not present in received rules
- FlowSpec rules received but no traffic effect
- Send-community not configured for FlowSpec address family

**Troubleshooting Commands & Remediation:**
- `FlowSpec actions are carried in extended communities`
- `Use 'neighbor <ip> send-community extended' under flowspec AF`
- `Without extended community, actions are not signaled`
- `Check 'show bgp ipv4 flowspec <prefix>' for communities`
- `Standard send-community is NOT sufficient for FlowSpec`
- `Use 'neighbor <ip> send-community' with no specific type`

### BGP FlowSpec Route Policy / Origination via Policy (Severity: LOW)

Configure FlowSpec route origination via local policy but policy not correctly applied

**Diagnostic Symptoms:**
- FlowSpec rules not originated despite local policy configured
- Local policy not generating FlowSpec NLRIs
- Route-policy for FlowSpec not attached
- FlowSpec origination from static configuration fails

**Troubleshooting Commands & Remediation:**
- `FlowSpec rules can be originated via local policy: 'bgp flowspec local-policy'`
- `Use route-policy to define match and action for FlowSpec`
- `Check 'show bgp ipv4 flowspec local-policy' for config`
- `Origination also via explicit commands or SDN controller`
- `For manual: configure 'ip bgp flow-spec <name>' and 'set' actions`
- `Verify 'bgp flowspec local-policy' references a valid route-policy`

### BGP FlowSpec Hardware Offload / TCAM Programming (Severity: LOW)

Configure BGP FlowSpec but rules not programmed in hardware forwarding

**Diagnostic Symptoms:**
- FlowSpec rules received but traffic not affected
- Software forwarding handling FlowSpec but hardware not
- TCAM entry not programmed for FlowSpec rule
- Platform FlowSpec hardware limitation

**Troubleshooting Commands & Remediation:**
- `Not all platforms support FlowSpec in hardware`
- `Check 'show platform flowspec' for hardware programming`
- `FlowSpec hardware limitations: max rules, match field support`
- `Complex rules (multiple match fields) may not fit hardware`
- `Falling back to software forwarding for FlowSpec`
- `Reduce rule complexity for hardware support`

### BGP IPv6 FlowSpec Validation / Inter-AS Deployment (Severity: LOW)

Configure IPv6 FlowSpec across AS boundaries but validation check prevents propagation

**Diagnostic Symptoms:**
- IPv6 FlowSpec rules not accepted from eBGP peer
- Validation failure for FlowSpec rules from neighbor AS
- FlowSpec rules stuck, not installed
- Inter-AS DDoS mitigation not working

**Troubleshooting Commands & Remediation:**
- `FlowSpec validation: destination must be reachable via BGP`
- `For eBGP: disable validation 'neighbor <ip> flowspec validation disable'`
- `Or: 'bgp flowspec validation disable' globally`
- `IPv6 inter-AS requires validation adjustment`
- `Route Reflector passes FlowSpec without validation`
- `Check 'show bgp ipv6 flowspec <prefix>' for validation status`

### BGP FlowSpec Rate-Limit / Traffic-Rate Action Failure (Severity: LOW)

Configure FlowSpec traffic-rate action but rate limiting not applied correctly

**Diagnostic Symptoms:**
- FlowSpec traffic-rate action not limiting traffic
- Rate limiter value not matching configured rate
- Traffic exceeds configured rate-limit
- Policer not installed on forwarding plane

**Troubleshooting Commands & Remediation:**
- `traffic-rate:0:0 = drop all, traffic-rate:0:<rate> = limit in bytes/sec`
- `Check 'show bgp ipv4 flowspec <prefix>' for action details`
- `Verify rate value is in bytes-per-second (not bits)`
- `Platform may not support all rate values in hardware`
- `Rate-limit granularity: some platforms round to nearest rate`
- `Use multiple rules for complex rate-limiting scenarios`

### BGP FlowSpec Redirect-to-Next-Hop / Redirect VRF Issue (Severity: LOW)

Configure FlowSpec redirect action but traffic not redirected to next-hop or VRF

**Diagnostic Symptoms:**
- FlowSpec redirect action not taking effect
- Traffic not redirected to next-hop IP
- Redirect VRF target not found
- Redirected traffic blackholed at destination VRF

**Troubleshooting Commands & Remediation:**
- `Redirect next-hop: 'redirect-next-hop:<ip>' extended community`
- `Redirect VRF: 'redirect-vrf:<vrf-id>' or 'redirect:RT=<rt>'`
- `For VRF redirect: RT must match target VRF's import RT`
- `Check redirect target is reachable from the router`
- `Redirect to next-hop: traffic forwarded to specified IP`
- `Verify target VRF has correct routing for redirected traffic`

### BGP FlowSpec Service Provider / Customer Inter-AS Issue (Severity: LOW)

Configure BGP FlowSpec between customer and provider AS but validation policies block rules

**Diagnostic Symptoms:**
- Customer FlowSpec rules not accepted by provider
- Inter-AS FlowSpec validation failure
- Provider rejects FlowSpec from customer due to policy
- DDoS mitigation through provider not working

**Troubleshooting Commands & Remediation:**
- `Service provider typically accepts FlowSpec from customers`
- `Provider uses 'bgp flowspec validation disable' for customer peers`
- `Or accepts with specific policies: 'neighbor <ip> flowspec'`
- `Customer originates FlowSpec rules for DDoS targets`
- `Provider propagates rules to edge routers for enforcement`
- `Check 'show bgp ipv4 flowspec <prefix>' for validation status`

