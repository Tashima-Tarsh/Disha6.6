---
name: "NAT/PAT Issues Injection"
description: "Network Address Translation (NAT, PAT) related network faults for troubleshooting practice"
category: "computer-networking"
---

# NAT/PAT Issues Injection

Network Address Translation (NAT, PAT) related network faults for troubleshooting practice

## Supported Protocols
- nat
- pat

## Fault Injection Scenarios & Troubleshooting Procedures

### NAT Inside/Outside Interface Misconfiguration (Severity: HIGH)

Configure NAT interfaces with wrong inside/outside designation

**Diagnostic Symptoms:**
- NAT translation not occurring
- Traffic not translated despite correct ACL
- Packets translated on wrong interface
- One-way connectivity (outside hosts can't reach inside)

**Troubleshooting Commands & Remediation:**
- `Check NAT interfaces with 'show ip nat statistics'`
- `Verify 'ip nat inside' on internal-facing interfaces`
- `Verify 'ip nat outside' on external-facing interfaces`
- `Inside/outside must be correctly assigned per traffic flow`
- `Traffic must enter inside interface and exit outside interface for source NAT`
- `Destination NAT reverses the direction requirement`

### NAT ACL Missing or Incorrect (Severity: HIGH)

Configure NAT with missing or incorrect ACL not matching the traffic to be translated

**Diagnostic Symptoms:**
- Expected traffic not translated
- Too many or too few translations created
- Internal addresses not matching any NAT rule
- Some subnets translated while others are not

**Troubleshooting Commands & Remediation:**
- `Check NAT translations with 'show ip nat translations'`
- `Verify ACL used by NAT with 'show access-lists'`
- `Check 'ip nat inside source list <acl> <pool|interface>'`
- `ACL must permit the source addresses to be translated`
- `Use 'show ip nat statistics' for hits/misses`
- `NAT ACLs typically permit RFC1918 private addresses`

### NAT Pool Address Exhaustion (Severity: HIGH)

Configure too-small NAT pool that runs out of addresses for translations

**Diagnostic Symptoms:**
- Translation failures when pool exhausted
- New connections failing to establish
- Existing connections working but new ones dropped
- NAT pool exhausted messages in logs

**Troubleshooting Commands & Remediation:**
- `Check NAT pool usage with 'show ip nat statistics'`
- `Pool exhausted = all addresses currently in use`
- `Use 'ip nat pool <name> <start> <end> netmask <mask>'`
- `Increase pool size or use PAT (overload) for more translations`
- `PAT maps many inside addresses to one outside address`
- `Check timeout of existing translations for quick recovery`

### NAT PAT Port Exhaustion (Severity: HIGH)

Configure PAT with too few ports available, exhausting the port range

**Diagnostic Symptoms:**
- PAT translations failing to create
- Ports exhausted despite only one outside IP
- New TCP/UDP connections failing intermittently
- Many concurrent connections from internal hosts

**Troubleshooting Commands & Remediation:**
- `Check PAT statistics with 'show ip nat statistics'`
- `PAT uses unique source ports (0-65535) per outside IP`
- `Default PAT port range varies by platform`
- `Configure multiple outside IPs for more port capacity`
- `Use 'ip nat pool <name> <start> <end> netmask <mask>' with overload`
- `Check 'show ip nat translations verbose' for port allocation`

### Wrong Static NAT Mapping (Severity: HIGH)

Configure static NAT with wrong inside/outside IP mapping

**Diagnostic Symptoms:**
- Incorrect internal host reached from outside
- Static NAT mapping to wrong destination
- Port forwarding to wrong internal server
- Multiple static NAT entries conflicting

**Troubleshooting Commands & Remediation:**
- `Check static NAT with 'show ip nat translations'`
- `Verify 'ip nat inside source static <inside> <outside>'`
- `Check for overlapping static NAT entries`
- `Ensure inside global IP is not used elsewhere`
- `Use 'show running-config | include ip nat inside source static'`
- `Static NAT creates one-to-one permanent mapping`

### NAT Hairpinning / NAT Reflection Missing (Severity: HIGH)

Configure NAT but internal hosts cannot reach internal servers using the public (external) IP

**Diagnostic Symptoms:**
- Internal users cannot access internal servers via public IP
- Internal access using private IP works but public IP fails
- NAT translation not occurring for internal-to-internal traffic
- Hairpin traffic loop or drop

**Troubleshooting Commands & Remediation:**
- `NAT hairpinning enables traffic from inside to inside via public IP`
- `Check 'ip nat inside source static' configuration for hairpinning`
- `Some platforms require explicit 'ip nat enable' on inside interface`
- `NAT flow: inside->outside->back to inside (loops back)`
- `Use 'ip nat outside source static' for bidirectional mapping`
- `Alternative: split DNS (internal vs external resolution)`

### NAT Order of Operations / Route-Map Conflict (Severity: HIGH)

Configure NAT with route-map where NAT and routing order of operations causes unexpected translation

**Diagnostic Symptoms:**
- NAT not translating as expected despite correct configuration
- Translation occurs at unexpected stage of routing
- Route-map match conditions not matching intended traffic
- NAT interacting with PBR or ACL in unexpected order

**Troubleshooting Commands & Remediation:**
- `Cisco NAT order: 1. PBR 2. NAT inside-to-outside 3. routing 4. NAT outside-to-inside`
- `Check 'ip nat inside source list <acl> ...' for match conditions`
- `Route-map in NAT: 'ip nat inside source route-map <name> <pool>'`
- `NAT with PBR: PBR occurs before binding, NAT after routing lookup`
- `Debug: 'debug ip nat detailed' for translation decisions`
- `Verify ACL/route-map matches before translation occurs`

### NAT Overlapping Subnets (VPN / Merged Networks) (Severity: HIGH)

Configure NAT for overlapping private IP space between two networks connected via VPN or merger

**Diagnostic Symptoms:**
- IP address conflicts between merged/connected networks
- Both networks use RFC1918 space with same subnets
- Traffic to duplicate IPs goes to wrong location
- NAT translation cannot resolve overlap

**Troubleshooting Commands & Remediation:**
- `Use 'ip nat inside source static' to translate overlapping addresses`
- `NAT must be applied at the VPN boundary for one side`
- `Consider VRF-lite with route leaking as alternative`
- `Two-way NAT (twice NAT) translates both source and destination`
- `Check 'ip nat outside source static' for destination translation`
- `Plan readdressing as long-term solution for merged networks`

### NAT Protocol ALG / Application Level Gateway Issue (Severity: MEDIUM)

Configure NAT but ALG (e.g., FTP, SIP, DNS) translation fails causing application-specific failures

**Diagnostic Symptoms:**
- FTP data channel not working through NAT
- SIP/RTP voice traffic one-way audio
- DNS responses with embedded IP not translated
- ICMP errors not correctly NAT-translated

**Troubleshooting Commands & Remediation:**
- `NAT ALG rewrites IP addresses in application payloads`
- `FTP active mode requires ALG for PORT command rewriting`
- `SIP ALG rewrites SDP IP addresses in session description`
- `Use 'ip nat service <protocol>' to control NAT ALG behavior`
- `Disable ALG for specific protocols if causing issues`
- `Some ALG interactions with IPsec can cause security issues`

### NAT-T / IPsec NAT Traversal Issue (Severity: HIGH)

Configure NAT for IPsec traffic but NAT-T (UDP 4500) not working or misconfigured

**Diagnostic Symptoms:**
- IPsec tunnel cannot traverse NAT device
- ESP packets dropped by NAT
- NAT-T UDP encapsulation not working
- NAT device not capable of handling IPsec pass-through

**Troubleshooting Commands & Remediation:**
- `IPsec NAT-T encapsulates ESP in UDP 4500`
- `NAT must support IPsec pass-through / NAT-T`
- `Check 'show crypto ipsec sa' for NAT-T statistics`
- `NAT changes source port for ESP, may break IPsec SA`
- `Use 'crypto isakmp nat-traversal <seconds>' on VPN peer`
- `Verify NAT device does not fragment UDP 4500 packets`

### NAT DNS Mapping / DNS Doctoring Issue (Severity: MEDIUM)

Configure NAT but DNS response with internal IP not translated back to public IP

**Diagnostic Symptoms:**
- Internal users get private IP from DNS for public server
- DNS A record returns translated IP but NAT not reversing
- Internal users cannot connect to server via hostname
- DNS doctoring not converting private IP back to public

**Troubleshooting Commands & Remediation:**
- `DNS doctoring: NAT rewrites DNS responses with private IPs`
- `'ip nat inside source static tcp <inside> <outside> <port>'`
- `Use 'ip nat service dns' to enable DNS ALG`
- `DNS response payload rewritten from public to private IP`
- `Split DNS more reliable for complex scenarios`
- `Check NAT ALG for DNS on the firewall/router`

### NAT Translation Timeout / Session Expiration (Severity: LOW)

Configure NAT translation timeout too short causing premature session drops

**Diagnostic Symptoms:**
- Long-lived connections dropping unexpectedly
- NAT entries timing out before session completes
- Large file transfers or database connections interrupted
- NAT timeout causing application-level failures

**Troubleshooting Commands & Remediation:**
- `Check 'show ip nat translations verbose' for timeout values`
- `Default timeout: TCP 86400s, UDP 300s, ICMP 60s`
- `Use 'ip nat translation timeout <seconds>' for global timeout`
- `Per-protocol: 'ip nat translation tcp-timeout <seconds>'`
- `Long timeout = more NAT entries in table`
- `Short timeout = port reuse quicker, but sessions may drop`

### NAT VRF-Aware / NAT Within VRF Configuration Error (Severity: HIGH)

Configure NAT within a VRF context incorrectly, causing translation failure for VPN/MPLS traffic

**Diagnostic Symptoms:**
- NAT not translating traffic within VRF
- NAT in VRF not finding correct routing table
- VRF routes not used for NAT lookup
- Translation fails for MPLS VPN customer traffic

**Troubleshooting Commands & Remediation:**
- `Use 'ip nat inside source list <acl> pool <name> vrf <vrf>'`
- `NAT in VRF requires VRF context in NAT configuration`
- `Check 'show ip nat statistics vrf <vrf>' for VRF-specific stats`
- `NAT pool address must be reachable within the VRF`
- `Interface inside/outside within same VRF`
- `Common in MPLS VPN internet access deployments`

### NAT64 / IPv6-to-IPv4 Translation Misconfiguration (Severity: HIGH)

Configure NAT64 for IPv6-only clients to reach IPv4 servers but translation fails

**Diagnostic Symptoms:**
- IPv6-only hosts cannot reach IPv4-only servers
- NAT64 prefix not configured or routed
- DNS64 not resolving A records to AAAA
- NAT64 translation state not created

**Troubleshooting Commands & Remediation:**
- `NAT64: translates IPv6 traffic to IPv4 (and reverse)`
- `Configure NAT64 prefix (e.g., 64:ff9b::/96)`
- `Use 'nat64 prefix stateful <ipv6-prefix>'`
- `DNS64 synthesizes AAAA records from A records`
- `Stateful NAT64 maintains translation state table`
- `Check 'show nat64 translations' for active entries`

