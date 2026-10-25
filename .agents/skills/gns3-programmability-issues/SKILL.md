---
name: "Network Programmability Issues Injection"
description: "NETCONF, RESTCONF, YANG, gNMI, model-driven telemetry related network faults"
category: "computer-networking"
---

# Network Programmability Issues Injection

NETCONF, RESTCONF, YANG, gNMI, model-driven telemetry related network faults

## Supported Protocols
- netconf
- restconf
- yang
- gnmi
- telemetry
- automation

## Fault Injection Scenarios & Troubleshooting Procedures

### NETCONF Session Not Establishing (Severity: HIGH)

Configure NETCONF but SSH-based NETCONF session between client and device fails

**Diagnostic Symptoms:**
- NETCONF client cannot connect to device
- SSH to port 830 refused or timeout
- NETCONF capabilities not exchanged
- Hello message not received from server

**Troubleshooting Commands & Remediation:**
- `NETCONF uses TCP 830 over SSH`
- `Enable: 'netconf-yang' on IOS-XE, 'netconf ssh' on NX-OS`
- `Check 'show netconf-yang sessions' for active sessions`
- `Verify SSH server is enabled on the device`
- `Check AAA authorization for NETCONF users`
- `VTY access-class must allow NETCONF client IP`

### NETCONF Capability / YANG Module Mismatch (Severity: HIGH)

Configure NETCONF client and server with incompatible capabilities or missing YANG modules

**Diagnostic Symptoms:**
- Client cannot execute NETCONF operations
- YANG module not supported by device
- Capability exchange incomplete
- NETCONF <get> operation returns empty

### NETCONF Datastore Lock / Configuration Conflict (Severity: LOW)

Configure multiple NETCONF sessions attempting to lock datastore simultaneously

**Diagnostic Symptoms:**
- NETCONF <lock> operation fails
- Another session holds the datastore lock
- Configuration commit fails due to lock contention
- Candidate datastore cannot be modified

### RESTCONF API / HTTP Method Misconfiguration (Severity: HIGH)

Configure RESTCONF but HTTP methods (GET/PUT/POST/DELETE) not working correctly

**Diagnostic Symptoms:**
- RESTCONF GET returns 404 or 400
- PATCH/PUT fails to modify configuration
- Authentication to RESTCONF API rejected
- RESTCONF HTTPS endpoint not reachable

### Model-Driven Telemetry Subscription Failure (Severity: LOW)

Configure MDT subscription but collector not receiving telemetry data

**Diagnostic Symptoms:**
- Telemetry collector not receiving data
- Subscription shows 'connected' but no data
- Dial-out mode telemetry not reaching collector
- Telemetry stream starts then stops

### gNMI (gRPC Network Management Interface) Session Failure (Severity: LOW)

Configure gNMI but gRPC session between client and device not established

**Diagnostic Symptoms:**
- gNMI client cannot connect to device
- gRPC channel not established
- gNMI CapabilityRequest fails
- TLS certificate validation error

### YANG Data Model / JSON/XML Encoding Validation Error (Severity: HIGH)

Configure NETCONF/RESTCONF with incorrect YANG data format causing operation failure

**Diagnostic Symptoms:**
- NETCONF <edit-config> fails with data validation error
- RESTCONF PUT returns 400 (invalid data)
- YANG leaf constraints violation
- XML/JSON encoding does not match YANG model

### NETCONF Subtree / XPath Filter Misconfiguration (Severity: LOW)

Configure NETCONF <get> or <get-config> with incorrect filter returning too much or too little data

**Diagnostic Symptoms:**
- NETCONF filter returns empty data
- Filter returns entire configuration instead of subset
- XPath expression not supported by device
- Subtree filter structure incorrect

### NETCONF Commit / Confirmed-Commit Failure (Severity: HIGH)

Configure NETCONF confirmed-commit but rollback not working as expected

**Diagnostic Symptoms:**
- NETCONF confirmed-commit rollback not triggered on timeout
- Commit fails due to validation errors
- Confirmed-commit timer expires but changes remain
- Multi-session commit coordination failure

### RESTCONF YANG-PATCH / Partial Update Failure (Severity: HIGH)

Configure RESTCONF PATCH operation but partial update not applied correctly

**Diagnostic Symptoms:**
- RESTCONF PATCH returns 200 but configuration not updated
- YANG-PATCH edit list incorrectly ordered
- Partial update breaking configuration consistency
- RESTCONF PUT overwrites entire configuration when PATCH expected

### gNMI Subscribe / On-Change Telemetry Issue (Severity: LOW)

Configure gNMI subscription with on-change mode but updates not triggered when value changes

**Diagnostic Symptoms:**
- gNMI on-change subscription not sending updates
- Stream of values never sent (sample mode)
- On-change target not reporting changes for specific paths
- gNMI subscription reconnection causing duplicate data

