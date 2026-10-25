---
name: "BFD Issues Injection"
description: "BFD (Bidirectional Forwarding Detection) session, timer, and protocol integration related faults"
category: "computer-networking"
---

# BFD Issues Injection

BFD (Bidirectional Forwarding Detection) session, timer, and protocol integration related faults

## Supported Protocols
- bfd
- ospf
- bgp
- isis
- eigrp
- pim
- hsrp
- vrrp

## Fault Injection Scenarios & Troubleshooting Procedures

### BFD Not Configured on Interface (Severity: LOW)

Disable BFD on the required interface preventing fast failure detection

**Diagnostic Symptoms:**
- Routing protocol convergence still slow (seconds, not milliseconds)
- No BFD session for the neighbor
- BFD required by routing policy but not active
- Link failure detection stuck at routing protocol hello timers

**Troubleshooting Commands & Remediation:**
- `Check BFD neighbors with 'show bfd neighbors'`
- `Enable BFD: 'bfd interval <ms> min_rx <ms> multiplier <count>' under interface`
- `Default BFD interval varies by platform (typically 150-1000ms)`
- `BFD must be enabled on BOTH sides of the link`
- `BFD session created after routing protocol neighbor is established`
- `Use 'show bfd neighbors details' for BFD session state`

### BFD Interval / Multiplier Negotiation Issue (Severity: LOW)

Configure mismatched BFD timers causing session rejection or asymmetric failure detection

**Diagnostic Symptoms:**
- BFD session fails to establish due to timer mismatch
- Negotiated interval larger than expected
- One side expecting faster detection than the other
- BFD session up but detection time asymmetric

**Troubleshooting Commands & Remediation:**
- `BFD timers: desired-tx-interval, required-min-rx-interval, detection-multiplier`
- `Negotiated transmit interval = MAX(peer desired-tx, local required-min-rx)`
- `Negotiated detection time = interval * multiplier`
- `Check 'show bfd neighbors details' for negotiated values`
- `Use 'bfd interval <ms> min_rx <ms> multiplier <count>' per platform limits`
- `Platform minimum interval varies: 50ms (hardware), 200ms (software)`

### BFD Authentication / MD5 SHA Key Mismatch (Severity: LOW)

Configure BFD authentication on one side but mismatched key on the other

**Diagnostic Symptoms:**
- BFD session fails to establish with authentication enabled
- Authentication failure counters incrementing
- BFD stuck in 'Down' or 'Init' state
- Routing protocol neighbor up but no BFD session

**Troubleshooting Commands & Remediation:**
- `BFD auth: 'bfd authentication md5|sha-1|sha-256 keychain <name>'`
- `Key-chain must exist with matching key ID and key string`
- `Both sides must have same authentication type and key`
- `Check 'show bfd neighbors details' for auth status`
- `Check 'show key chain' for key configuration`
- `Disable auth on one side for testing: 'no bfd authentication'`

### BFD Client Not Registered with BFD Process (Severity: LOW)

Configure routing protocol with BFD but BFD client registration missing

**Diagnostic Symptoms:**
- Routing protocol neighbor up but no BFD session
- BFD clients show none registered
- BFD session not created for the routing protocol neighbor
- Protocol fall-over BFD not configured

**Troubleshooting Commands & Remediation:**
- `BFD requires each protocol to register as a client`
- `Use 'bfd all-interfaces' under OSPF process`
- `Use 'neighbor <ip> fall-over bfd' for BGP`
- `Use 'isis bfd' under IS-IS interface`
- `Check 'show bfd client' for registered BFD clients`
- `No client registration = BFD knows about the neighbor but won't create session`

### BFD Echo Mode Failure (Severity: MEDIUM)

Configure BFD echo mode but echo packets not processed correctly

**Diagnostic Symptoms:**
- BFD echo session not established
- Echo mode disabled despite configuration
- Echo packets sent but not received back
- BFD falls back to async mode only

### OSPF BFD Integration Not Working (Severity: LOW)

Configure OSPF with BFD but OSPF does not respond to BFD down event

**Diagnostic Symptoms:**
- BFD session goes down but OSPF neighbor stays up
- OSPF not fast-failing despite BFD session loss
- OSPF and BFD session exist independently
- BFD down notification not received by OSPF

### BGP BFD Integration / Fall-Over Not Configured (Severity: LOW)

Configure BGP with BFD but BGP fall-over BFD missing causing slow BGP convergence

**Diagnostic Symptoms:**
- BFD session down but BGP neighbor stays established
- BGP does not respond to BFD failure event
- BGP session stays up after link failure
- Slow BGP convergence despite BFD enabled

### IS-IS BFD Integration Failure (Severity: LOW)

Configure IS-IS with BFD but adjacency per-interface BFD missing

**Diagnostic Symptoms:**
- IS-IS adjacency stays up after BFD session failure
- BFD session exists but IS-IS not receiving BFD down events
- IS-IS and BFD not synchronized
- IS-IS convergence slow despite BFD

### BFD Session Hardware / Platform Limit Exceeded (Severity: MEDIUM)

Configure BFD on too many neighbors exceeding platform session limit

**Diagnostic Symptoms:**
- BFD session not created despite configuration
- BFD session limit reached on the platform
- New BFD sessions rejected
- Existing sessions work but new neighbor BFD fails

### BFD for Static Route / Track Integration (Severity: HIGH)

Configure BFD for static route tracking but static route not removed on BFD failure

**Diagnostic Symptoms:**
- Static route remains in routing table after BFD down
- BFD session down but static route still active
- Traffic continues to use failed link via static route
- BFD-tracked static route not removing on failure

