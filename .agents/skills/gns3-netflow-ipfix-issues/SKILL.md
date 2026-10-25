---
name: "NetFlow/IPFIX/sFlow Issues Injection"
description: "NetFlow, IPFIX, sFlow export and collector related network faults"
category: "computer-networking"
---

# NetFlow/IPFIX/sFlow Issues Injection

NetFlow, IPFIX, sFlow export and collector related network faults

## Supported Protocols
- netflow
- ipfix
- sflow

## Fault Injection Scenarios & Troubleshooting Procedures

### NetFlow Export Collector Unreachable (Severity: HIGH)

Configure NetFlow export to wrong or unreachable collector IP/port

**Diagnostic Symptoms:**
- NetFlow data not received at collector
- Export UDP packets sent to wrong destination
- Export port (default 2055) blocked or wrong
- Flow export failures in logs

**Troubleshooting Commands & Remediation:**
- `Check NetFlow export with 'show ip flow export' (Cisco) or 'display netflow export' (Huawei)`
- `Verify 'ip flow-export destination <ip> <port>'`
- `Default NetFlow port: 2055 (v5/v9), IPFIX: 4739`
- `Use 'nslookup <host>' if collector is DNS name`
- `Check route: 'show ip route <collector-ip>'`
- `Verify firewall allows UDP to collector port`

### NetFlow Export Version Misconfiguration (Severity: LOW)

Configure NetFlow export version that collector does not support

**Diagnostic Symptoms:**
- NetFlow version mismatch between exporter and collector
- Collector discarding flow records
- Unsupported template or record format
- v5 vs v9 vs IPFIX incompatibility

**Troubleshooting Commands & Remediation:**
- `Check NetFlow version with 'show ip flow export'`
- `NetFlow v5: fixed format, no templates, IPv4 only`
- `NetFlow v9: template-based, supports IPv4/IPv6/MPLS`
- `IPFIX (v10): IETF standard, based on v9 template`
- `Use 'ip flow-export version <5|9|10>' to set`
- `v9/IPFIX for MPLS and advanced features`

### NetFlow Sampler / Sampling Rate Misconfiguration (Severity: LOW)

Configure NetFlow sampling rate too high or too low affecting accuracy

**Diagnostic Symptoms:**
- Flow data not representative of actual traffic
- Sampling rate too high (over-sampling, high CPU)
- Sampling rate too low (under-sampling, inaccurate)
- Flow collector shows incorrect traffic volume

**Troubleshooting Commands & Remediation:**
- `Check sampling with 'show flow-sampler' or 'show ip flow export'`
- `Configure sampler: 'sampler <name> mode random 1 out-of <rate>'`
- `Default: no sampling (full flow capture)`
- `Typical rates: 1:100 (high-volume), 1:1000 (very high-volume)`
- `Higher sampling = more accurate but more CPU`
- `sFlow uses fixed sampling, NetFlow v9 can use sampler`

### NetFlow with NBAR Application Recognition Issues (Severity: LOW)

NetFlow using NBAR for application classification not matching expected traffic

**Diagnostic Symptoms:**
- NetFlow showing 'unknown' or wrong application
- Encrypted traffic not identified by NBAR
- NBAR misclassifying specific protocols
- Application statistics inaccurate

**Troubleshooting Commands & Remediation:**
- `NBAR (Network-Based Application Recognition) classifies traffic`
- `Check 'show ip nbar protocol-discovery' for classification stats`
- `NBAR uses PDLM (Packet Description Language Module)`
- `Update PDLM: 'ip nbar pdlm <url>' for latest protocol support`
- `NetFlow v9/IPFIX exports app ID with flow record`
- `Encrypted traffic: NBAR cannot inspect encrypted payload`

### NetFlow Active/Inactive Timer Misconfiguration (Severity: LOW)

Configure NetFlow timeout values causing premature or delayed flow export

**Diagnostic Symptoms:**
- Long-lived flows exported too many times (active timeout short)
- Short flows not exported (inactive timeout too long)
- Flow table overflows (both timeouts too long)
- Duplicate flow records due to frequent active timeouts

**Troubleshooting Commands & Remediation:**
- `Check flow timers with 'show ip flow export' or 'show ip cache flow'`
- `Active timeout: 'ip flow-export timeout active <minutes>' (default 30)`
- `Inactive timeout: 'ip flow-export timeout inactive <seconds>' (default 15)`
- `Active: same flow exported periodically (for long-lived flows)`
- `Inactive: flow exported after idle period`
- `Adjust: active for HTTP vs database connections differently`

### NetFlow Flow Table Overflow (Severity: HIGH)

NetFlow cache table overflows due to insufficient memory or excessive flows

**Diagnostic Symptoms:**
- NetFlow cache table full
- New flows not created (dropped)
- Flow table utilization at 100%
- Packet loss for new flows under DoS traffic

**Troubleshooting Commands & Remediation:**
- `Check flow cache with 'show ip cache flow'`
- `Maximum entries: platform dependent`
- `Use 'ip flow-cache entries <count>' to increase`
- `Aggressive timeout for short-lived flows (DDoS)`
- `Increase memory if platform supports`
- `Enable flow sampling to reduce table entries`

### sFlow Agent / Collector Misconfiguration (Severity: HIGH)

Configure sFlow with wrong agent IP or collector settings

**Diagnostic Symptoms:**
- sFlow datagrams not received at collector
- Wrong source IP in sFlow packets
- sFlow polling interval wrong or not working
- Collector cannot identify switch source

**Troubleshooting Commands & Remediation:**
- `Check sFlow with 'show sflow' (Cisco) or 'display sflow' (Huawei)`
- `Agent IP: 'sflow agent-ip <ip>' or 'sflow source-interface <intf>'`
- `Collector: 'sflow collector <ip> [port <port>]'`
- `Default sFlow port: 6343 (UDP)`
- `Polling interval: 'sflow polling-interval <seconds>'`
- `sFlow is packet-sampled, not flow-based (different from NetFlow)`

### NetFlow ACL / Filter Misconfiguration (Severity: LOW)

Configure NetFlow with capture ACL that matches too broadly or too narrowly

**Diagnostic Symptoms:**
- NetFlow only capturing a subset of intended traffic
- ACL filtering out valid traffic flows
- Flow statistics incomplete
- Wrong traffic being monitored

**Troubleshooting Commands & Remediation:**
- `NetFlow ACL filter: 'ip flow-capture <acl>' on interface`
- `Only traffic matching the forwarded DSCP or ACL is considered`
- `Check ACL hits: 'show access-lists <acl>'`
- `Without ACL: all traffic is analyzed by default`
- `Use 'match ip address <acl>' for selective capture`
- `Verify ACL permits the intended source/destination IPs`

### NetFlow v9/IPFIX Template Refresh Rate Issue (Severity: LOW)

Configure NetFlow v9/IPFIX template refresh rate too slow causing collector data loss

**Diagnostic Symptoms:**
- Collector loses ability to decode flow records
- Template timeout on collector
- Flow data showing as unknown template ID
- Template refresh not reaching collector

**Troubleshooting Commands & Remediation:**
- `NetFlow v9/IPFIX use templates to describe flow format`
- `Templates sent periodically: 'ip flow-export template refresh-rate <count>'`
- `Default: 20 packets, timeout 1800s (30 min)`
- `Template rate too slow: collector times out, discards data`
- `Template rate too fast: extra bandwidth for templates`
- `IPFIX: 'ip flow-export template options refresh-rate <count>'`
- `Verify template on collector: check template ID in received packets`

### NetFlow Top Talkers / Aggregation Misconfiguration (Severity: LOW)

Configure NetFlow top talkers or aggregation cache but statistics not populated

**Diagnostic Symptoms:**
- NetFlow top talkers show no data or incomplete data
- Aggregation cache not generating expected reports
- Predefined aggregation scheme not matching requirements
- Top talkers statistics timing out

**Troubleshooting Commands & Remediation:**
- `Show top talkers: 'show ip flow top-talkers'`
- `Configure: 'ip flow-top-talkers sort-by bytes|packets'`
- `Top talkers match: 'match source-ip|destination-ip|protocol'`
- `Aggregation: 'ip flow-aggregat-cache <name>'`
- `Aggregation schemes: AS, prefix, protocol-port, source-prefix, dest-prefix`
- `Export aggregation: 'export destination <ip> <port>'`

### IPFIX Enterprise / Vendor-Specific IE Misconfiguration (Severity: LOW)

Configure IPFIX with enterprise Information Elements (IEs) not recognized by collector

**Diagnostic Symptoms:**
- IPFIX enterprise fields not decoded by collector
- Vendor-specific data fields missing from collector
- Enterprise element not matching collector expectations
- Private enterprise numbers not configured

**Troubleshooting Commands & Remediation:**
- `IPFIX enterprise IEs use PEN (Private Enterprise Number)`
- `Check collector supports the specific vendor's IPFIX extensions`
- `Cisco IOS-XE supports IPFIX enterprise IEs for AVC`
- `Common PENs: Cisco (9), Juniper (2636), Huawei (2011)`
- `Verify template includes the enterprise IE definitions`
- `Use 'show flow-exporter <name>' to verify IPFIX version`

### sFlow Counter Polling / Interface Statistics Issue (Severity: LOW)

Configure sFlow counter polling interval too long or too short

**Diagnostic Symptoms:**
- Interface counters updated too infrequently
- sFlow counter data misleading
- Counter poll interval too short causing excessive traffic
- Traffic graphs showing flat lines due to lack of counter data

**Troubleshooting Commands & Remediation:**
- `sFlow counter polling: 'sflow sampling <direction> <rate>'`
- `Use 'sflow counter-interval <seconds>' to set polling frequency`
- `Default: varies by vendor (typically 10-30s)`
- `Short interval = more accurate but more CPU/bandwidth`
- `Long interval = less accurate but lighter overhead`
- `Check 'show sflow' for current polling interval`

### NetFlow Mediation / Flow Aggregation Export Issue (Severity: HIGH)

Configure NetFlow mediation device (flow aggregator) but flows not forwarded properly

**Diagnostic Symptoms:**
- NetFlow mediation not receiving flow data from exporters
- Aggregated flows not reaching final collector
- Mediation device not processing flow records
- Flow format mismatch between exporter and mediation

**Troubleshooting Commands & Remediation:**
- `NetFlow mediation: aggregates flows from multiple exporters`
- `Collector receives aggregated (not raw) flow data`
- `Mediation changes export format (e.g., v5 to v9)`
- `Mediation may add or remove fields in flow records`
- `Provide correct collector destination on mediation`
- `Verify exporter sends to mediator IP, not directly to collector`

