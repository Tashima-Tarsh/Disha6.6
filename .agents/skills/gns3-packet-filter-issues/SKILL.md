---
name: "Packet Filter Issues Injection"
description: "Network layer packet filtering faults for simulating real-world network conditions like latency, packet loss, and corruption"
category: "computer-networking"
---

# Packet Filter Issues Injection

Network layer packet filtering faults for simulating real-world network conditions like latency, packet loss, and corruption

## Supported Protocols
- packet_filter
- network_layer
- link_layer
- performance

## Fault Injection Scenarios & Troubleshooting Procedures

### High Network Latency (Severity: MEDIUM)

Inject 100ms latency with 10ms jitter to simulate WAN or cross-region network conditions

**Diagnostic Symptoms:**
- Applications respond slowly
- Voice/Video quality degradation (jitter, delay)
- TCP throughput reduced due to increased RTT
- Interactive sessions feel sluggish
- Network tests show high round-trip times

**Troubleshooting Commands & Remediation:**
- `Use ping to measure RTT: normal should be <10ms, now ~100ms`
- `Check traceroute for which hop shows increased delay`
- `Use 'show interface' for interface statistics (if available)`
- `Test application response times before and after`
- `This simulates WAN/satellite/cross-region network conditions`

### Extreme Network Latency (Severity: HIGH)

Inject 500ms latency with 100ms jitter to simulate severely degraded network conditions

**Diagnostic Symptoms:**
- Applications timeout or become unusable
- Real-time applications (voice, video) completely fail
- TCP connections may time out during establishment
- File transfers extremely slow or fail
- User experience is severely impacted

**Troubleshooting Commands & Remediation:**
- `Check application timeout values (may need adjustment)`
- `Use 'ping -t' to see consistent high delay`
- `Monitor TCP retransmissions with 'show interface counters'`
- `This simulates very poor network (international, congested links)`
- `Consider TCP window scaling effects on high-latency networks`

### Light Packet Loss (5%) (Severity: MEDIUM)

Inject 5% packet loss to simulate unstable wireless or congested network conditions

**Diagnostic Symptoms:**
- Intermittent connectivity issues
- Some packets dropped, causing retransmissions
- Real-time protocols show occasional glitches
- Applications may retry operations automatically
- Network appears mostly functional but unreliable

**Troubleshooting Commands & Remediation:**
- `Use 'ping -c 100' and note packet loss percentage`
- `Check for TCP retransmissions: 'show tcp statistics'`
- `Monitor application logs for timeout/retry messages`
- `This simulates wireless networks, weak signals, or congestion`
- `5% loss is enough to impact TCP performance significantly`

### Heavy Packet Loss (15%) (Severity: HIGH)

Inject 15% packet loss to simulate severely degraded network conditions

**Diagnostic Symptoms:**
- Severe connectivity problems
- Many applications fail or timeout
- TCP throughput severely degraded
- Real-time protocols unusable
- High retransmission rates observed

**Troubleshooting Commands & Remediation:**
- `Packet loss >10% causes significant TCP performance issues`
- `Check 'show interface' for error counters and drops`
- `Monitor TCP congestion window behavior`
- `This simulates very poor quality links (congestion, interference)`
- `Consider UDP vs TCP behavior under loss (UDP has no recovery)`

### Packet Corruption (Severity: HIGH)

Inject 3% packet corruption to simulate transmission errors or interference

**Diagnostic Symptoms:**
- Applications receive corrupted data
- TCP checksum failures trigger retransmissions
- Application errors due to data corruption
- Some operations fail with data integrity errors
- Network appears functional but data is unreliable

**Troubleshooting Commands & Remediation:**
- `Check interface CRC/error counters: 'show interface'`
- `Monitor for TCP checksum errors`
- `Applications may report data validation failures`
- `This simulates bad cables, EMI, or hardware issues`
- `Corruption is more serious than loss (data arrives but wrong)`

### Intermittent Connectivity (Severity: MEDIUM)

Drop every 10th packet to simulate periodic link flapping or unstable connections

**Diagnostic Symptoms:**
- Network appears up but some operations fail randomly
- Periodic timeouts or connection drops
- Applications show inconsistent behavior
- Some pings succeed, others fail
- User experience is unpredictable

**Troubleshooting Commands & Remediation:**
- `Use continuous ping: 'ping -t' to see pattern`
- `Look for periodic failures (every 10th packet here)`
- `This simulates loose cables, intermittent hardware, or interference`
- `More challenging to diagnose than complete failures`
- `Check physical layer (cables, connectors) for intermittent issues`

### Complete Link Failure (Severity: CRITICAL)

Drop all packets to simulate complete network outage or cable disconnection

**Diagnostic Symptoms:**
- No connectivity across the link
- All pings fail with 100% packet loss
- Routing protocols lose adjacency
- Applications show 'network unreachable'
- Interface may show 'up' but no traffic passes

**Troubleshooting Commands & Remediation:**
- `This simulates cable unplugged, device powered off, or link down`
- `Check physical layer: cables, SFP modules, power`
- `Verify interface status on both ends`
- `Look for interface errors in logs`
- `Use 'show ip route' to see routing impact`

### Degraded Network (Mild) (Severity: MEDIUM)

Combined 100ms delay, 10ms jitter, and 5% packet loss for realistic poor network conditions

**Diagnostic Symptoms:**
- Noticeably slow application response
- Some operations timeout or retry
- Voice/video quality degraded but usable
- File transfers slow but complete
- User experience is poor but functional

**Troubleshooting Commands & Remediation:**
- `This simulates congested WAN or long-distance links`
- `Check multiple metrics: latency, loss, jitter`
- `Applications may need timeout adjustments`
- `Consider QoS mechanisms to prioritize critical traffic`
- `Realistic scenario for branch office networks`

### Severely Degraded Network (Severity: CRITICAL)

Combined 200ms delay, 50ms jitter, 15% packet loss, and 3% corruption for worst-case conditions

**Diagnostic Symptoms:**
- Applications mostly unusable or completely fail
- High timeout and error rates
- Real-time applications completely broken
- Data integrity issues due to corruption
- Network appears barely functional

**Troubleshooting Commands & Remediation:**
- `This simulates extremely poor quality connections`
- `Multiple failure modes complicate troubleshooting`
- `Check each symptom separately to isolate issues`
- `Applications may not be designed for such conditions`
- `Consider this as a stress test or edge case scenario`

### SSH Service Blocked (Severity: MEDIUM)

Block TCP port 22 (SSH) to simulate firewall rule or access control issue

**Diagnostic Symptoms:**
- Cannot establish SSH connections to devices
- Port 22 shows as filtered or unreachable
- Other services (HTTP, HTTPS) work normally
- Console access still works
- Network appears functional except SSH

**Troubleshooting Commands & Remediation:**
- `This simulates ACL, firewall, or security policy blocking SSH`
- `Test with 'telnet <host> 22' to confirm port 22 filtering`
- `Check for access control lists or firewall rules`
- `Verify if other management protocols are affected (Telnet, HTTPS)`
- `Consider out-of-band access methods`

### Routing Protocol Traffic Blocked (Severity: HIGH)

Block OSPF (protocol 89) and BGP (port 179) to simulate routing protocol connectivity failure

**Diagnostic Symptoms:**
- Routing protocol neighbor relationships fail to establish
- Routes not exchanged between routers
- Network shows partial or no connectivity
- Direct connected routes work but not learned routes
- Routing tables incomplete or missing entries

**Troubleshooting Commands & Remediation:**
- `Check routing process status: 'show ip ospf neighbor' or 'show ip bgp summary'`
- `Verify basic IP connectivity (should work for directly connected networks)`
- `This simulates firewall blocking routing protocol ports`
- `Check for access rules affecting protocol ports (TCP 179, protocol 89)`
- `Routing protocols require bidirectional communication`

### DNS Service Blocked (Severity: MEDIUM)

Block UDP port 53 (DNS) to simulate DNS resolution failure

**Diagnostic Symptoms:**
- Domain name resolution fails
- Applications cannot resolve hostnames
- Direct IP addresses work but names don't
- nslookup or dig commands timeout
- Web browsing fails (unless using IP addresses)

**Troubleshooting Commands & Remediation:**
- `Test DNS: 'nslookup', 'dig', or 'host' commands`
- `Try connecting directly to IP addresses (should work)`
- `This simulates DNS server down or firewall blocking port 53`
- `Check if alternative DNS servers are configured`
- `Consider DNS caching and fallback mechanisms`

### WAN Link Simulation (Severity: MEDIUM)

Simulate WAN conditions with 150ms latency, 20ms jitter, and 2% packet loss

**Diagnostic Symptoms:**
- Noticeable delay in all communications
- Applications tuned for LAN perform poorly over WAN
- Some protocols timeout (need adjustment)
- Throughput reduced due to latency and loss
- Real-time applications (VoIP, video) show quality issues

**Troubleshooting Commands & Remediation:**
- `This simulates typical cross-region or international WAN links`
- `Consider TCP window scaling and optimization techniques`
- `Applications may need timeout adjustments for WAN conditions`
- `QoS prioritization becomes more important over WAN`
- `Test application performance before and after optimization`

### Wireless Network Simulation (Severity: MEDIUM)

Simulate wireless conditions with 80ms latency, 30ms jitter, and 8% packet loss

**Diagnostic Symptoms:**
- Variable performance (sometimes good, sometimes poor)
- Higher latency than wired networks
- Noticeable jitter affecting real-time applications
- Occasional packet bursts causing issues
- Performance degrades with distance/interference

**Troubleshooting Commands & Remediation:**
- `This simulates typical WiFi or wireless WAN conditions`
- `Wireless has higher latency and more jitter than wired`
- `Packet loss patterns are more variable on wireless`
- `Consider wireless-specific optimizations (roaming, band steering)`
- `Test mobile applications or wireless-dependent services`

### Network Congestion Simulation (Severity: HIGH)

Simulate congested network with 25% packet loss and 200ms delay

**Diagnostic Symptoms:**
- Severe performance degradation
- High packet loss causing many retransmissions
- Applications timeout or fail
- Network appears overloaded or saturated
- Some protocols may fail completely

**Troubleshooting Commands & Remediation:**
- `This simulates heavily congested links or bandwidth exhaustion`
- `Check for bandwidth-intensive applications or broadcasts`
- `Consider QoS mechanisms to prioritize critical traffic`
- `Monitor interface utilization and queue depths`
- `Test application behavior under stress conditions`

