---
name: "UDLD/CDP/LLDP Issues Injection"
description: "UDLD (Unidirectional Link Detection), CDP and LLDP related network faults"
category: "computer-networking"
---

# UDLD/CDP/LLDP Issues Injection

UDLD (Unidirectional Link Detection), CDP and LLDP related network faults

## Supported Protocols
- udld
- cdp
- lldp

## Fault Injection Scenarios & Troubleshooting Procedures

### UDLD Disabled on Fiber Links (Severity: HIGH)

Disable UDLD on fiber links where unidirectional links are possible

**Diagnostic Symptoms:**
- Unidirectional link undetected (STP loop risk)
- Fiber RX failure not detected by the switch
- Traffic flows one direction, STP not blocking
- Silent frame loss on fiber link

**Troubleshooting Commands & Remediation:**
- `Check UDLD status with 'show udld <intf>'`
- `Use 'udld enable' globally or 'udld port' per interface`
- `Normal mode: detects unidirectional links, warns`
- `Aggressive mode: err-disables port on unidirectional detection`
- `Fiber links should use aggressive UDLD`
- `UDLD is layer 2, works with STP to protect against loops`

### UDLD Aggressive Mode Misconfiguration (Severity: MEDIUM)

Configure UDLD aggressive mode on ports where it causes false err-disable

**Diagnostic Symptoms:**
- Port err-disabled due to UDLD aggressive
- False positive unidirectional link detection
- Link flapping due to UDLD neighbor lost
- Port recovery needed after UDLD event

**Troubleshooting Commands & Remediation:**
- `Check UDLD aggressive with 'show udld <intf>'`
- `Aggressive mode err-disables on single direction failure`
- `Use on fiber only, not on copper/short links`
- `Use 'udld port aggressive' on fiber interfaces`
- `Recovery: 'udld reset' or errdisable recovery`
- `Aggressive: 8 retries of UDLD probes before err-disable`

### CDP Disabled Causing Neighbor Discovery Failure (Severity: LOW)

Disable CDP on interfaces where it is needed for device discovery

**Diagnostic Symptoms:**
- No CDP neighbor information available
- 'show cdp neighbors' shows no entries
- VoIP phones not receiving CDP QoS/power info
- Network topology discovery tool failure

**Troubleshooting Commands & Remediation:**
- `Check CDP with 'show cdp interface'`
- `Use 'cdp run' globally to enable CDP`
- `Use 'cdp enable' per interface`
- `CDP is enabled by default on Cisco devices`
- `CDP sends advertisements to 01:00:0c:cc:cc:cc`
- `CDP delay: 'cdp timer <seconds>', holdtime: 'cdp holdtime <seconds>'`

### CDP Version / Information Mismatch (Severity: LOW)

CDP v1/v2 mismatch or CDP not compatible across devices

**Diagnostic Symptoms:**
- CDP neighbor missing despite enabling
- CDP v1/v2 incompatibility
- Non-Cisco devices not supported
- Device capabilities not advertised correctly

**Troubleshooting Commands & Remediation:**
- `Check CDP version with 'show cdp'`
- `Use 'cdp version-2' for CDPv2 (supports more TLVs)`
- `CDP is Cisco proprietary (use LLDP for multi-vendor)`
- `CDPv2 supports native VLAN, duplex, power negotiation`
- `CDPv1 is basic - device ID, port ID, platform`
- `Non-Cisco devices typically do not support CDP`

### LLDP Disabled Causing Multi-Vendor Discovery Failure (Severity: LOW)

Disable LLDP on interfaces where it is needed for multi-vendor discovery

**Diagnostic Symptoms:**
- No LLDP neighbor information available
- Neighbors from other vendors not discovered
- 'show lldp neighbors' shows no entries
- Network management tools missing topology data

**Troubleshooting Commands & Remediation:**
- `Check LLDP with 'show lldp'`
- `Use 'lldp run' globally to enable`
- `Use 'lldp transmit' and 'lldp receive' per interface`
- `IEEE 802.1AB standard, multi-vendor support`
- `LLDP sends to 01:80:c2:00:00:0e or 01:80:c2:00:00:03`
- `Use 'lldp timer <seconds>' and 'lldp hold-multiplier <value>'`

### LLDP TLV Filtering Misconfiguration (Severity: LOW)

Configure LLDP TLV filtering blocking important device information

**Diagnostic Symptoms:**
- Missing device capabilities in LLDP
- LLDP-MED power negotiation not working
- Incomplete device information from LLDP
- VoIP phones not receiving correct VLAN info

**Troubleshooting Commands & Remediation:**
- `Check LLDP local info with 'show lldp local'`
- `LLDP-MED TLVs: power, location, network policy`
- `VoIP uses LLDP-MED for voice VLAN and power`
- `Some switches allow TLV filtering for security`
- `Disable TLV filtering: 'no lldp tlv-select'`
- `Check 'show lldp neighbors detail' for received TLVs`

### UDLD Mode/Feature Mismatch Between Peers (Severity: HIGH)

Configure UDLD on one side but not the other causing err-disable

**Diagnostic Symptoms:**
- UDLD enabled port err-disabled when peer does not support UDLD
- One side sends UDLD probes but peer does not respond
- Link up but UDLD discovers no neighbor
- Port flaps after UDLD neighbor timeout

**Troubleshooting Commands & Remediation:**
- `UDLD does NOT require peer to support UDLD`
- `If peer no UDLD: port stays up, UDLD logs 'unknown' neighbor`
- `Aggressive mode + no UDLD peer = err-disable`
- `Check 'show udld <intf>' for neighbor UDLD support`
- `Normal mode OK without peer UDLD`
- `Aggressive mode REQUIRES peer UDLD to avoid err-disable`

### UDLD Port / Global Reset After Err-Disable (Severity: MEDIUM)

Configure UDLD err-disabled port but recovery method not working

**Diagnostic Symptoms:**
- Port remains err-disabled after UDLD aggressive detection
- udld reset command not clearing err-disable state
- Port not recovering after UDLD condition cleared
- Manual recovery required for UDLD-errdisabled ports

**Troubleshooting Commands & Remediation:**
- `UDLD aggressive err-disable: 'udld reset' recovers ALL ports`
- `Or manual: 'shutdown' then 'no shutdown' on the port`
- `Auto-recovery: 'errdisable recovery cause udld'`
- `Recovery timer: 'errdisable recovery interval <seconds>'`
- `Check 'show errdisable recovery' for UDLD recovery status`
- `Do NOT use 'udld reset' if multiple unrelated UDLD events`

### CDP VoIP / Power Negotiation Failure (Severity: HIGH)

Configure CDP misconfig preventing IP phone power negotiation or voice VLAN assignment

**Diagnostic Symptoms:**
- IP phone not receiving power via PoE
- Phone unable to negotiate higher PoE power class
- Voice VLAN not assigned via CDP
- Phone powers but no traffic on voice VLAN

**Troubleshooting Commands & Remediation:**
- `Cisco IP phones use CDP for PoE power negotiation`
- `CDP advertises available power and request power`
- `Check 'show cdp interface <intf>' for CDP status`
- `Phone needs CDP for: voice VLAN, CoS trust, inline power`
- `Power negotiation: CDP carries power requirements`
- `If CDP disabled: phone gets basic power only, no voice VLAN`

### CDP/LLDP Interworking / VoIP Dual Discovery Issue (Severity: LOW)

Configure CDP and LLDP simultaneously with conflicting device discovery information

**Diagnostic Symptoms:**
- IP phone receiving conflicting config from CDP and LLDP-MED
- Voice VLAN assignment conflict between CDP and LLDP
- Power negotiation mismatch between CDP and LLDP
- Multi-vendor phone not receiving expected config

**Troubleshooting Commands & Remediation:**
- `Most IP phones support both CDP and LLDP-MED`
- `CDP preferred by Cisco phones, LLDP-MED by multi-vendor`
- `Both can run simultaneously: 'lldp run' + 'cdp run'`
- `Check LLDP-MED: 'show lldp neighbors detail' for MED info`
- `Phone typically uses CDP if both received`
- `For multi-vendor phones: disable CDP on phone port, use LLDP only`

### LLDP-MED / Network Policy TLV Misconfiguration (Severity: MEDIUM)

Configure LLDP-MED network policy TLVs incorrectly causing VoIP service assignment failures

**Diagnostic Symptoms:**
- LLDP-MED voice VLAN not advertised correctly
- Phone not receiving VLAN assignment via LLDP-MED
- LLDP-MED network policy TLV missing
- Multi-vendor phone cannot determine voice VLAN

**Troubleshooting Commands & Remediation:**
- `LLDP-MED TLV: network policy carries voice VLAN info`
- `Configure 'switchport voice vlan <vlan>' triggers LLDP-MED`
- `Check 'show lldp neighbors detail' for MED TLVs`
- `LLDP-MED capabilities: LLDP-MED devices, locations, PoE`
- `LLDP-MED class: endpoint class I/II/III`
- `Without LLDP-MED: phone must use CDP or manual VLAN config`

