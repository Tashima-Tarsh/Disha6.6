---
name: "IPv6 Routing Issues Injection"
description: "IPv6 routing protocols (OSPFv3, RIPng, EIGRPv6) and IPv6 transition related faults"
category: "computer-networking"
---

# IPv6 Routing Issues Injection

IPv6 routing protocols (OSPFv3, RIPng, EIGRPv6) and IPv6 transition related faults

## Supported Protocols
- ipv6
- ospfv3
- ripng
- eigrp
- tunnel
- 6to4
- isatap
- nat64

## Fault Injection Scenarios & Troubleshooting Procedures

### IPv6 Not Enabled on Interface (Severity: HIGH)

IPv6 not configured on interface where IPv6 routing is expected

**Diagnostic Symptoms:**
- IPv6 routing protocol not forming adjacency
- No IPv6 connectivity through the interface
- IPv6 link-local address not generated
- IPv6 routing protocol requires IPv6 on interface

**Troubleshooting Commands & Remediation:**
- `Check IPv6 with 'show ipv6 interface brief'`
- `Enable IPv6 on interface: 'ipv6 enable' (link-local only)`
- `Or assign global unicast: 'ipv6 address <prefix>/<len>'`
- `IPv6 must be enabled for any routing protocol to work`
- `Link-local address is automatically generated when IPv6 enabled`
- `EUI-64 or manual global address configuration`

### IPv6 Unicast Routing Not Enabled (Severity: HIGH)

Global IPv6 unicast routing not enabled on the router

**Diagnostic Symptoms:**
- IPv6 routing protocols not starting
- Router does not forward IPv6 packets
- 'ipv6 unicast-routing' not configured
- IPv6 forwarding disabled

**Troubleshooting Commands & Remediation:**
- `Use 'ipv6 unicast-routing' globally to enable IPv6 routing`
- `Without this, router acts as IPv6 host, not router`
- `Check with 'show ipv6 route' - may be empty without routing`
- `Also needed for IPv6 routing protocols (OSPFv3, EIGRPv6, RIPng)`
- `Required for IPv6 packet forwarding between interfaces`
- `Platforms may have this enabled by default`

### OSPFv3 Router-ID Not Configured (Severity: HIGH)

OSPFv3 requires router-id but not configured on IPv6-only router

**Diagnostic Symptoms:**
- OSPFv3 process fails to start
- OSPFv3 can't determine router-id
- No IPv4 address to derive router-id
- OSPFv3 neighbors not forming

**Troubleshooting Commands & Remediation:**
- `OSPFv3 requires a router-id (32-bit, IPv4 format)`
- `Use 'router-id <A.B.C.D>' under ospfv3 process`
- `IPv6-only routers must have explicit router-id`
- `Router-id is an IPv4 format even in OSPFv3`
- `Check 'show ipv6 ospf' for router-id status`
- `Duplicate router-ids prevent adjacency formation`

### OSPFv3 Area / Instance ID Mismatch (Severity: HIGH)

Configure different OSPFv3 areas or instance IDs on neighboring interfaces

**Diagnostic Symptoms:**
- OSPFv3 neighbor adjacency not forming
- Instance ID mismatch prevents OSPFv3 peering
- Area ID mismatch on neighbor interfaces
- OSPFv3 stuck in INIT state

**Troubleshooting Commands & Remediation:**
- `Check OSPFv3 instance with 'show ipv6 ospf interface'`
- `Instance IDs must match on both sides (default 0)`
- `Multiple OSPFv3 instances can run on same link`
- `Use 'ipv6 ospf <process> area <area> [instance <id>]'`
- `Area must match on both sides of the link`
- `Different instances isolate OSPFv3 per process`

### OSPFv3 Authentication/IPsec Misconfiguration (Severity: HIGH)

Configure wrong OSPFv3 authentication (IPsec AH/ESP) parameters

**Diagnostic Symptoms:**
- OSPFv3 adjacency fails due to authentication
- IPsec SA not established for OSPFv3
- Authentication errors in OSPFv3 logs
- OSPFv3 packets rejected

**Troubleshooting Commands & Remediation:**
- `OSPFv3 uses IPsec for authentication (not MD5 like OSPFv2)`
- `Use 'ipv6 ospf authentication ipsec spi <hex>'`
- `AH provides authentication, ESP provides auth + encryption`
- `SPI and key must match on both sides`
- `Check IPsec SA: 'show ipv6 ospf interface'`
- `Use 'crypto isakmp key' for manual IPsec configuration`

### RIPng Not Enabled on Interface (Severity: HIGH)

RIPng configured globally but not enabled on the interface

**Diagnostic Symptoms:**
- RIPng not advertising IPv6 routes
- No RIPng updates sent on interface
- RIPng prefix list empty
- IPv6 routes not propagated via RIPng

**Troubleshooting Commands & Remediation:**
- `Check RIPng with 'show ipv6 rip'`
- `Enable on interface: 'ipv6 rip <process> enable'`
- `RIPng uses multicast FF02::9`
- `RIPng split-horizon applies by default`
- `RIPng administrative distance is 120`
- `Use 'show ipv6 rip database' for RIPng routes`

### EIGRPv6 Named Mode Not Activated (Severity: HIGH)

EIGRPv6 configured but not 'no shutdown' (named mode requirement)

**Diagnostic Symptoms:**
- EIGRP for IPv6 not forming adjacency
- EIGRPv6 process administratively down
- Named mode EIGRP requires 'no shutdown'
- EIGRPv6 routes not exchanged

**Troubleshooting Commands & Remediation:**
- `Named EIGRP: 'address-family ipv6' under 'router eigrp <name>'`
- `EIGRP named mode requires 'no shutdown' in address-family`
- `Check with 'show ip eigrp neighbors' for IPv6 AF`
- `EIGRPv6 uses FF02::A for multicast hellos`
- `Router-id required in EIGRPv6 (IPv4 format)`
- `Use 'show eigrp address-family ipv6' for status`

### IPv6 Tunnel (6to4 / ISATAP / GRE) Misconfiguration (Severity: HIGH)

Configure IPv6 transition tunnel with incorrect endpoint or mode

**Diagnostic Symptoms:**
- IPv6 tunnel not coming up
- Tunnel endpoint unreachable
- 6to4 relay not working
- IPv6 over IPv4 tunnel failure

**Troubleshooting Commands & Remediation:**
- `Check tunnel with 'show ipv6 tunnel' or 'show interface tunnel'`
- `6to4: uses 2002::/16 prefix derived from IPv4 address`
- `ISATAP: uses link-local ISATAP addresses for intra-site`
- `GRE tunnel: 'tunnel mode gre ipv6' for IPv6 over GRE`
- `Verify tunnel source and destination reachability`
- `MTU issues common with IPv6 tunnels (reduced MTU)`

### NAT64 / DNS64 Misconfiguration (Severity: HIGH)

Configure NAT64 with incorrect prefix or translation rules

**Diagnostic Symptoms:**
- IPv6-only hosts cannot reach IPv4-only destinations
- NAT64 prefix not matching DNS64 synthesized AAAA records
- Translation not working for specific protocols
- NAT64 stateful vs stateless confusion

**Troubleshooting Commands & Remediation:**
- `NAT64 prefix: 64:ff9b::/96 (well-known) or custom /32,/40,/48,/56,/64`
- `Stateful NAT64: maintains sessions, uses shared IPv4 pool`
- `Stateless NAT64: 1:1 mapping (bi-directional)`
- `DNS64 synthesizes AAAA from A records using NAT64 prefix`
- `Check 'show nat64 translations' for translation entries`
- `Verify DNS64 prefix matches NAT64 prefix`

### IPv6 Neighbor Discovery / RA Guard Misconfiguration (Severity: HIGH)

Configure IPv6 ND Router Advertisement incorrectly causing SLAAC or Neighbor Discovery failures

**Diagnostic Symptoms:**
- Hosts not receiving IPv6 RA for SLAAC
- Duplicate IPv6 address due to DAD failure
- Router not advertising IPv6 prefix
- IPv6 ND proxy not working as expected

**Troubleshooting Commands & Remediation:**
- `Check RA with 'show ipv6 interface <intf>' for ND info`
- `RA interval: 'ipv6 nd ra-interval <seconds>'`
- `Default RA: every 200s (max), route lifetime 1800s`
- `Managed flag: 'ipv6 nd managed-config-flag' (DHCPv6)`
- `Other flag: 'ipv6 nd other-config-flag' (DHCPv6 stateless)`
- `RA guard on switches: 'ipv6 nd raguard' on untrusted ports`

### DHCPv6 Prefix Delegation / IA-PD Configuration Error (Severity: HIGH)

Configure DHCPv6 prefix delegation but CE router not receiving delegated prefix

**Diagnostic Symptoms:**
- CE router does not receive IPv6 prefix via DHCPv6-PD
- DHCPv6 IA-PD request fails
- CE downstream network has no global IPv6 prefix
- Prefix delegation timeout

**Troubleshooting Commands & Remediation:**
- `DHCPv6-PD: CE requests prefix via IA-PD option`
- `Check 'show ipv6 dhcp interface' on CE`
- `PE/Server must have prefix pool for delegation`
- `Use 'ipv6 dhcp pool <name>' with 'prefix-delegation pool <pool>'`
- `Verify 'ipv6 dhcp client pd <name>' on CE`
- `Check one-to-one map: CE IA-ID matches PE configuration`

### IPv6 MLD / Multicast Listener Discovery Misconfiguration (Severity: LOW)

Configure IPv6 MLD incorrectly causing multicast group membership issues

**Diagnostic Symptoms:**
- IPv6 hosts cannot join multicast groups
- MLD queries not sent by router
- MLD snooping not working on layer 2
- IPv6 multicast not delivered to receivers

**Troubleshooting Commands & Remediation:**
- `MLD is IPv6 equivalent of IGMP`
- `Check 'show ipv6 mld groups' for group membership`
- `MLDv2 supports (S,G) source-specific joins like IGMPv3`
- `MLD snooping: 'ipv6 mld snooping' on switches`
- `MLD querier: 'ipv6 mld querier' on VLAN`
- `Default MLD query interval: 125s`

### IPv6 FHRP / VRRPv3 / HSRPv6 Gateway Redundancy Issue (Severity: HIGH)

Configure VRRPv3 or HSRP for IPv6 incorrectly causing default gateway failure

**Diagnostic Symptoms:**
- IPv6 default gateway not redundant
- VRRPv3/HSRP for IPv6 not establishing
- IPv6 hosts cannot reach external networks
- Dual-stack hosts lose IPv6 connectivity on failover

**Troubleshooting Commands & Remediation:**
- `VRRPv3 supports IPv6: 'vrrp <group> address-family ipv6'`
- `HSRP for IPv6: 'standby <group> ipv6 <link-local>'`
- `Check 'show vrrp ipv6' or 'show standby ipv6' for status`
- `IPv6 ND RA uses virtual MAC for seamless failover`
- `All routers in group must have matching configuration`
- `Link-local address override for virtual gateway`

### IPv6 PIM / Multicast Routing Misconfiguration (Severity: HIGH)

Configure IPv6 PIM sparse mode incorrectly causing IPv6 multicast forwarding failure

**Diagnostic Symptoms:**
- IPv6 multicast traffic not forwarded
- IPv6 PIM neighbors not established
- RP discovery for IPv6 groups failing
- IPv6 multicast (S,G) entries not created

**Troubleshooting Commands & Remediation:**
- `IPv6 PIM: 'ipv6 pim [sparse-mode|dense-mode|sparse-dense-mode]'`
- `IPv6 RP: 'ipv6 pim rp-address <ip> [group-list <acl>]'`
- `BSR for IPv6: 'ipv6 pim bsr-candidate <intf>'`
- `Check 'show ipv6 pim neighbor' for PIM adjacencies`
- `Check 'show ipv6 mroute' for multicast routing table`
- `IPv6 PIM uses embedded RP (RFC 3956) for RP discovery`

### OSPFv3 Route Redistribution / External Route Issue (Severity: HIGH)

Configure OSPFv3 redistribution from other IPv6 sources but external routes not propagated

**Diagnostic Symptoms:**
- OSPFv3 external routes (Type 7) missing from database
- Redistributed IPv6 routes not appearing in OSPFv3
- OSPFv3 default route not advertised
- Redistribution route map not filtering correctly

**Troubleshooting Commands & Remediation:**
- `OSPFv3 redistribution: 'redistribute <protocol> route-map <name>' under ospfv3`
- `Check 'show ipv6 ospf database external' for Type 5/7 LSAs`
- `OSPFv3: external routes, metric type E1/E2`
- `Default route: 'default-information originate' under ospfv3`
- `Verify redistributed route exists in IPv6 routing table`
- `Use route-map with match ipv6 address prefix-list`

