---
name: "Wireless/CAPWAP Issues Injection"
description: "Wireless LAN, CAPWAP AP-WLC and roaming related network faults"
category: "computer-networking"
---

# Wireless/CAPWAP Issues Injection

Wireless LAN, CAPWAP AP-WLC and roaming related network faults

## Supported Protocols
- capwap
- wireless
- wlan
- roaming
- 802.1x
- radius

## Fault Injection Scenarios & Troubleshooting Procedures

### CAPWAP AP Discovery / Join Failure (Severity: HIGH)

Access Point cannot discover or join the Wireless LAN Controller

**Diagnostic Symptoms:**
- AP stuck in discovery state
- AP cannot find WLC
- CAPWAP join request rejected
- AP LED blinking continuously

**Troubleshooting Commands & Remediation:**
- `Check CAPWAP state: 'show capwap state' on AP (if accessible)`
- `Discovery: DHCP option 43, DNS (CISCO-CAPWAP-CONTROLLER), broadcast`
- `Verify WLC IP is reachable from AP subnet`
- `Check 'show ap join stats' on WLC for join failures`
- `AP certificate validation: check WLC time/date`
- `Firewall must allow UDP 5246 (control) and 5247 (data)`

### CAPWAP UDP Port Blocking / DTLS Failure (Severity: HIGH)

CAPWAP UDP ports blocked by firewall or DTLS encryption mismatch

**Diagnostic Symptoms:**
- AP cannot communicate with WLC
- CAPWAP control channel down (UDP 5246)
- CAPWAP data channel down (UDP 5247)
- DTLS handshake failure between AP and WLC

**Troubleshooting Commands & Remediation:**
- `CAPWAP control: UDP 5246 (from AP to WLC)`
- `CAPWAP data: UDP 5247 (encrypted user traffic)`
- `DTLS enabled by default on AP-manager interface`
- `Disable DTLS for testing: 'no capwap ap dtls' or 'config ap dtls disable'`
- `Check firewall rules permit UDP 5246 and 5247`
- `NAT traversal: AP behind NAT may need CAPWAP NAT config`

### WLAN SSID / Radio Policy Misconfiguration (Severity: HIGH)

Configure WLAN with wrong SSID, security or radio policy

**Diagnostic Symptoms:**
- SSID not broadcast on the radio
- Clients cannot see or connect to the SSID
- Security policy mismatch (WPA2 vs WPA3)
- WLAN disabled or LAN status down

**Troubleshooting Commands & Remediation:**
- `Check WLAN with 'show wlan summary' (Cisco WLC) or 'show wlan' (autonomous AP)`
- `Verify WLAN is enabled: 'config wlan enable <id>'`
- `Check radio band: 2.4GHz, 5GHz, or both`
- `SSID broadcast disabled: 'no broadcast-ssid' under WLAN`
- `Radio policy: 'config wlan radio-policy <id> <band>'`
- `Verify client association: 'show client summary'`

### WLC AP License / AP Count Limit Exceeded (Severity: HIGH)

Wireless Controller AP count license exceeded causing APs rejected

**Diagnostic Symptoms:**
- AP cannot join due to license limit
- AP license count exceeded
- WLC rejecting new AP joins
- AP stuck in 'license failed' state

**Troubleshooting Commands & Remediation:**
- `Check AP licenses with 'show license summary' or 'show ap license'`
- `Cisco 9800: 'show wireless license summary'`
- `AP count license: limits number of APs per WLC`
- `Evaluation license: 60-day trial (up to certain AP count)`
- `Install permanent license: 'license install <url>'`
- `AireOS: 'show ap count' vs 'show license capacity'`

### Wireless Roaming (Layer 2/3) Misconfiguration (Severity: HIGH)

Configure inter-controller roaming with wrong mobility parameters

**Diagnostic Symptoms:**
- Wireless client disconnects when roaming between APs
- Layer 3 roaming failure (IP connectivity lost)
- Inter-controller roaming not working
- Client stuck on original AP after signal degrades

**Troubleshooting Commands & Remediation:**
- `Layer 2 roaming: same VLAN/subnet between APs (fast)`
- `Layer 3 roaming: different subnet, needs mobility tunnel`
- `Inter-controller roaming: mobility peers must be configured`
- `Check 'show mobility summary' for peer status`
- `Roaming anchor: configures anchor WLC for client IP`
- `Mobility tunnel: UDP 16666 between WLCs`

### Wireless Security / 802.1X RADIUS Authentication Failure (Severity: HIGH)

Wireless client authentication failing due to RADIUS server or EAP misconfiguration

**Diagnostic Symptoms:**
- Wireless clients cannot authenticate
- RADIUS server not responding to WLC
- EAP timeout during client association
- Authentication rejected despite valid credentials

**Troubleshooting Commands & Remediation:**
- `Check RADIUS servers on WLC: 'show radius summary'`
- `WLAN security: 'config wlan security 802.1x <id>'`
- `EAP types: PEAP, EAP-TLS, EAP-FAST`
- `Check RADIUS reachability: ping from WLC to RADIUS server`
- `RADIUS ports: UDP 1812 (auth), 1813 (acct)`
- `Shared secret must match between WLC and RADIUS`

### WLC Redundancy / SSO Failover Misconfiguration (Severity: HIGH)

Configure WLC high availability (SSO / N+1) incorrectly causing AP disconnection during failover

**Diagnostic Symptoms:**
- APs disconnected during WLC failover
- SSO not synchronizing between active/standby WLCs
- N+1 redundancy priority not determining AP-WLC assignment
- Client sessions lost on WLC switchover

**Troubleshooting Commands & Remediation:**
- `SSO: active/standby WLC pair with stateful failover`
- `Check 'show redundancy' for SSO status`
- `N+1: APs configured with primary/secondary/tertiary WLC`
- `AP failover priority: 'ap primary-base <wlc>'`
- `Client sessions preserved only in SSO mode`
- `Mobility tunnel: UDP 16666 for state sync`

### WLAN QoS / RRM Radio Resource Management Issue (Severity: LOW)

Configure WLAN QoS or RRM (EDCA, WMM, DCA) incorrectly causing poor wireless performance

**Diagnostic Symptoms:**
- WMM not enabled causing QoS for voice/video not working
- EDCA parameters causing excessive delay
- DCA (Dynamic Channel Assignment) not optimizing channels
- RRM not adjusting power or channels to RF environment

**Troubleshooting Commands & Remediation:**
- `WMM must be enabled for QoS on WLAN (Wi-Fi Multimedia)`
- `Check WMM: 'config wlan wmm <id> enable'`
- `EDCA: access categories (voice, video, best-effort, background)`
- `DCA: automatic channel selection based on interference`
- `RRM: 'config advanced 802.11b/a channel' for auto-tuning`
- `Check 'show advanced 802.11a channel' for DCA status`

### WLAN Band Select / Client Band Steering Issue (Severity: LOW)

Configure band select / band steering incorrectly preventing clients from connecting to 5GHz

**Diagnostic Symptoms:**
- Dual-band clients stuck on 2.4GHz when 5GHz available
- Band select not steering clients to 5GHz
- 2.4GHz congestion despite 5GHz capacity available
- Client connectivity issues after band steering enabled

**Troubleshooting Commands & Remediation:**
- `Band select: probe responses on 2.4GHz delayed to encourage 5GHz`
- `Configure: 'config wlan band-select <id> allow'`
- `Check 'show wlan <id>' for band-select status`
- `Client must support dual-band (2.4GHz + 5GHz)`
- `5GHz provides more channels and less interference`
- `Client RSSI threshold for 5GHz determines steering success`

### WLAN Client Limit / Association Denial (Severity: MEDIUM)

Configure WLAN max client limit too low or AP client limit reached

**Diagnostic Symptoms:**
- Wireless clients cannot associate after reaching limit
- Max client limit on AP or WLAN exceeded
- Association request rejected
- New clients cannot connect despite signal strength

**Troubleshooting Commands & Remediation:**
- `Check 'show ap <name> client' for current client count`
- `Per-AP client limit: 'config ap max-clients <id>'`
- `Per-WLAN client limit: 'config wlan max-clients <id>'`
- `Default: no limit or platform-dependent maximum`
- `High density: consider reducing per-AP client limit`
- `Check 'show client summary' for total associations`

### WLAN RF Channel / Power Level Misconfiguration (Severity: HIGH)

Configure wireless channel or transmit power incorrectly causing interference or coverage holes

**Diagnostic Symptoms:**
- Adjacent APs on same channel causing co-channel interference
- Overlapping channels on same AP (2.4GHz: 1,6,11 violation)
- Transmit power too high (causing client-PAP asymmetry)
- Coverage holes due to low transmit power

**Troubleshooting Commands & Remediation:**
- `2.4GHz: use non-overlapping channels 1, 6, 11`
- `5GHz: 24 non-overlapping channels available`
- `Check 'show ap <name> rf-channel' for assigned channel`
- `Tx power: higher dBm = more range, more interference`
- `RRM auto-power: 'config advanced 802.11a tx-power'`
- `Client SNR: minimum 20dB for reliable connectivity`

### Wireless Radio Channel / Power Misconfiguration (Severity: LOW)

Configure AP radio channel that is DFS-restricted or power that causes interference

**Diagnostic Symptoms:**
- AP radio not transmitting on configured channel
- DFS channel wait time (radar detection)
- Excessive co-channel interference
- AP power too high (overlap) or too low (coverage hole)

**Troubleshooting Commands & Remediation:**
- `Check RF with 'show ap radio summary' or 'show ap auto-rf'`
- `DFS channels: radar detection triggers channel change (1-10 min wait)`
- `RRM (Radio Resource Management) auto-selects channels`
- `Manual channel: 'config <interface> channel <channel>'`
- `TX power: adjust based on cell coverage requirement`
- `Check 'show ap environment' for interference levels`

