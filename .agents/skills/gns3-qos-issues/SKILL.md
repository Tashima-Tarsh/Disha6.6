---
name: "QoS Issues Injection"
description: "QoS classification, marking, queuing, policing and shaping related network faults"
category: "computer-networking"
---

# QoS Issues Injection

QoS classification, marking, queuing, policing and shaping related network faults

## Supported Protocols
- qos

## Fault Injection Scenarios & Troubleshooting Procedures

### QoS Class-Map Match Criteria Error (Severity: LOW)

Configure class-map with incorrect match criteria causing wrong traffic classification

**Diagnostic Symptoms:**
- Wrong traffic classified into QoS class
- Expected traffic not matching the class
- Match-all vs match-any logic confusion
- Multiple match criteria not working as designed

**Troubleshooting Commands & Remediation:**
- `Check class-map with 'show class-map <name>'`
- `Match-all: all conditions must match (AND)`
- `Match-any: any condition match sufficient (OR)`
- `Verify match statements: dscp, precedence, access-group, protocol`
- `Match protocol requires NBAR configuration`
- `Use 'show policy-map interface <intf>' for class statistics`

### QoS Policy Not Attached to Interface (Severity: HIGH)

Configure policy-map but not attached to the interface or attached in wrong direction

**Diagnostic Symptoms:**
- QoS policy not taking effect
- Traffic not classified/queued as expected
- No policy statistics available
- QoS not applied in the correct direction

**Troubleshooting Commands & Remediation:**
- `Check 'show policy-map interface <intf>' for attachments`
- `Use 'service-policy input <name>' for inbound`
- `Use 'service-policy output <name>' for outbound`
- `Verify interface supports service-policy`
- `Check interface is correct (sub-interface vs main interface)`
- `Direction: input classifies before routing, output after routing`

### QoS Bandwidth Allocation Exceeded (Severity: HIGH)

Configure QoS bandwidth allocation that exceeds interface capacity or violates scheduling

**Diagnostic Symptoms:**
- QoS policy rejected due to bandwidth over-allocation
- Interface bandwidth percentage exceeds 100%
- Shape/police rate exceeds interface speed
- Remaining bandwidth not distributed correctly

**Troubleshooting Commands & Remediation:**
- `Check policy-map bandwidth sum with 'show policy-map <name>'`
- `Bandwidth sum in a policy cannot exceed interface bandwidth`
- `Use 'bandwidth remaining percent' for unused bandwidth`
- `Bandwidth command guarantees minimum, not maximum`
- `Shape: 'shape average <bps>' for traffic shaping`
- `Police: 'police <bps>' for traffic policing`

### QoS Queuing Strategy Misconfiguration (Severity: HIGH)

Configure incorrect queuing strategy (FIFO, WFQ, CBWFQ, LLQ) causing priority issues

**Diagnostic Symptoms:**
- Priority traffic not getting priority queuing
- LLQ starvation of other queues
- Excessive jitter for real-time traffic
- Queue congestion not managed correctly

**Troubleshooting Commands & Remediation:**
- `Check queuing with 'show policy-map interface <intf>'`
- `LLQ (priority) queue: strict priority, can starve others`
- `Use 'priority <kbps>' for real-time traffic (voice/video)`
- `Use 'police <rate>' under priority to prevent starvation`
- `CBWFQ: 'bandwidth <kbps>' for guaranteed bandwidth`
- `Check queue depth and drops with 'show policy-map interface'`

### QoS Marking/Remarking Not Working (Severity: LOW)

Configure QoS marking but CoS/DSCP/IP precedence not being set correctly

**Diagnostic Symptoms:**
- Traffic not marked with expected DSCP or CoS
- QoS markings stripped by intermediate devices
- Untrusted DSCP values from incoming traffic
- Layer 2 CoS not matching Layer 3 DSCP

**Troubleshooting Commands & Remediation:**
- `Use 'set dscp <value>' or 'set ip precedence <value>' in policy`
- `Trust boundary: 'mls qos trust cos' / 'mls qos trust dscp'`
- `Check CoS-to-DSCP and DSCP-to-CoS mappings`
- `Use 'show mls qos interface <intf>' for trust state`
- `Campus switches: trust at access edge, remark at distribution`
- `Use 'show policy-map interface <intf> class <class>' for marking stats`

### QoS Policing / Shaping Misconfiguration (Severity: MEDIUM)

Configure policing or shaping with incorrect rate or burst parameters

**Diagnostic Symptoms:**
- Traffic dropped below configured rate
- TCP global synchronization due to tail drop
- Burst too small causing premature drops
- Shape/police rate mismatch with interface speed

**Troubleshooting Commands & Remediation:**
- `Policing drops exceeding traffic (can cause TCP retransmits)`
- `Shaping buffers then transmits exceeding traffic`
- `Use 'police <rate> <burst>' with appropriate burst size`
- `Burst = rate * 1.5 / 8 (typical Cisco calculation)`
- `Shaper: 'shape average <bps> <burst>'`
- `Use 'show policy-map interface <intf>' for violate/conform actions`

### QoS Trust Boundary / CoS/DSCP Trust Misconfiguration (Severity: LOW)

Configure QoS trust boundary incorrectly allowing untrusted devices to set QoS markings

**Diagnostic Symptoms:**
- End devices setting their own QoS marking (DSCP/CoS)
- Untrusted traffic inheriting high priority markings
- QoS trust boundary not enforced at access edge
- Guest traffic marked with same priority as voice/video

**Troubleshooting Commands & Remediation:**
- `Check trust state: 'show mls qos interface <intf>'`
- `Set trust at access: 'mls qos trust cos' (Cisco switch)`
- `Default: port is untrusted (CoS=0 for all incoming)`
- `Trust boundary: set at access edge, never on user-facing ports`
- `Use 'mls qos trust device cisco-phone' for IP phone trust`
- `Auto QoS helps configure trust boundary correctly`

### QoS NBAR / Application Recognition Failure (Severity: LOW)

Configure QoS NBAR (Network Based Application Recognition) but application not correctly identified

**Diagnostic Symptoms:**
- NBAR not classifying applications correctly
- Application not in NBAR protocol pack
- Traffic not matching expected NBAR protocol
- Custom NBAR signatures not working

**Troubleshooting Commands & Remediation:**
- `Check 'show ip nbar protocol-discovery' for stats`
- `Verify NBAR protocol pack version: 'show ip nbar version'`
- `Update protocol pack: 'ip nbar protocol-pack <url>'`
- `Use 'match protocol <name>' in class-map for NBAR`
- `NBAR can match: HTTP URLs, SSL SNI, DNS, etc.`
- `NBAR2 (next-gen) supports 1400+ applications`

### QoS WRED / Congestion Avoidance Misconfiguration (Severity: LOW)

Configure WRED (Weighted Random Early Detection) incorrectly causing premature drops or no drops

**Diagnostic Symptoms:**
- WRED not preventing TCP tail drop
- Premature packet drops before queue full
- WRED thresholds too aggressive for traffic
- TCP global synchronization not prevented

**Troubleshooting Commands & Remediation:**
- `WRED: drops packets probabilistically before queue full`
- `Check 'show policy-map interface <intf>' for WRED drops`
- `WRED min-threshold, max-threshold, mark-probability`
- `Lower min-threshold: more aggressive dropping`
- `Exponential weight: influences average queue calculation`
- `WRED is per-DSCP or per-CoS, not per-flow`

### QoS CoS-to-DSCP / DSCP-to-CoS Mapping Error (Severity: LOW)

Configure CoS-to-DSCP or DSCP-to-CoS mapping inconsistently causing layer 2/3 QoS mismatch

**Diagnostic Symptoms:**
- CoS marking on switch not matching DSCP of the same packet
- QoS policy at L2 layer sees different marking than L3
- CoS-to-DSCP mapping inconsistent across switches
- Voice/Video packets treated differently after L2/L3 boundary

**Troubleshooting Commands & Remediation:**
- `Check mapping: 'show mls qos maps cos-dscp'`
- `Default CoS-to-DSCP: CoS 0->DSCP 0, CoS 5->DSCP 40`
- `Use 'mls qos map cos-dscp <dscp-list>' for custom mapping`
- `DSCP-to-CoS: 'show mls qos maps dscp-cos'`
- `IP phone marks CoS, switch should trust and map to DSCP`
- `Consistent mapping required across entire QoS domain`

### QoS Auto-QoS / Misconfiguration from Auto-Generated Policies (Severity: LOW)

Configure Auto-QoS but generated policies conflict with existing QoS or cause unexpected results

**Diagnostic Symptoms:**
- Auto-QoS generated policies not matching design intent
- Conflicting policy when modifying Auto-QoS generated config
- Auto-QoS overwriting manual QoS configuration
- Auto-QoS template not compatible with platform

**Troubleshooting Commands & Remediation:**
- `Auto-QoS: 'auto qos voip trust' or 'auto qos classify-police'`
- `Auto-QoS generates trust, class-maps, policy-maps automatically`
- `Check generated config: 'show auto qos'`
- `Modifying Auto-QoS requires understanding of generated policies`
- `Disable Auto-QoS: 'no auto qos' before manual configuration`
- `Auto-QoS is a good starting point but may need customization`

