---
name: "IPsec/DMVPN/VPN Issues Injection"
description: "IPsec, IKE, DMVPN and GRE tunnel related network faults for troubleshooting practice"
category: "computer-networking"
---

# IPsec/DMVPN/VPN Issues Injection

IPsec, IKE, DMVPN and GRE tunnel related network faults for troubleshooting practice

## Supported Protocols
- ipsec
- ike
- vpn
- dmvpn
- nhrp
- gre
- tunnel

## Fault Injection Scenarios & Troubleshooting Procedures

### IKE Phase 1 Parameter Mismatch (Severity: HIGH)

Configure IKE phase 1 parameters that don't match between peers

**Diagnostic Symptoms:**
- IKE phase 1 negotiation fails
- IPsec tunnel not established
- No SA created (show crypto isakmp sa empty)
- ISAKMP aggressive/main mode mismatch

**Troubleshooting Commands & Remediation:**
- `Check IKE SA with 'show crypto isakmp sa'`
- `Verify IKE policy: encryption, hash, DH group, auth, lifetime`
- `All phase 1 parameters must match exactly on both peers`
- `Pre-shared key must match on both sides`
- `Main mode (default): identity protected, 6 messages`
- `Aggressive mode: faster but less secure, 3 messages`

### IKE Phase 2 / IPsec SA Mismatch (Severity: HIGH)

Configure IPsec transform sets with incompatible parameters

**Diagnostic Symptoms:**
- IKE phase 1 succeeds (MM_ACTIVE) but phase 2 fails
- No IPsec SA created
- QM_IDLE not reached
- Transform set mismatch between peers

**Troubleshooting Commands & Remediation:**
- `Check IPsec SA with 'show crypto ipsec sa'`
- `Verify transform set: esp-aes, esp-sha-hmac, etc.`
- `PFS (Perfect Forward Secrecy) group must match if configured`
- `Lifetime must match (seconds or kilobytes)`
- `Use 'show crypto ipsec transform-set' for settings`
- `Crypto map or profile must reference correct transform set`

### IPsec Crypto ACL / Interesting Traffic Mismatch (Severity: HIGH)

Configure crypto ACL that does not match actual traffic to be encrypted

**Diagnostic Symptoms:**
- IKE/IPsec SA established but traffic not encrypted
- Traffic bypassing the VPN tunnel
- Crypto ACL too broad or too narrow
- Mirror image ACL not matching

**Troubleshooting Commands & Remediation:**
- `Check crypto ACL with 'show access-lists <acl>'`
- `Crypto ACL must match the traffic to encrypt (permit)`
- `Crypto ACL on each side should be mirror images`
- `ACL defines 'interesting traffic' that triggers IPsec`
- `Check 'show crypto ipsec sa' for packets encrypt/decrypt`
- `Use 'show crypto engine connections active' for packet counts`

### IPsec NAT Traversal (NAT-T) Issues (Severity: HIGH)

Configure IPsec NAT-T when a NAT device exists between peers

**Diagnostic Symptoms:**
- IPsec tunnel fails when NAT device is between peers
- ESP packets dropped by NAT
- NAT-T not negotiated
- IPsec over NAT fails on port 4500

**Troubleshooting Commands & Remediation:**
- `NAT-T encapsulates ESP in UDP 4500`
- `Check 'show crypto isakmp sa' for NAT-T status`
- `Crypto map: use 'set nat-transparency udp-encapsulation'`
- `NAT device must allow UDP 500 and 4500`
- `NAT-T auto-detected when NAT device found between peers`
- `Use 'isakmp nat keepalive' to maintain NAT mapping`

### DMVPN NHRP Configuration Error (Severity: HIGH)

Configure NHRP (Next Hop Resolution Protocol) incorrectly in DMVPN

**Diagnostic Symptoms:**
- Spoke cannot register with hub via NHRP
- Spoke-to-spoke tunnel not forming
- NHRP resolution request failing
- DMVPN phase 2/3 shortcut not working

**Troubleshooting Commands & Remediation:**
- `Check NHRP with 'show ip nhrp'`
- `NHRP network ID must match on all DMVPN nodes`
- `Hub: 'ip nhrp multicast dynamic' for spoke registration`
- `Spoke: 'ip nhrp nhs <hub-tunnel-ip>' to register`
- `NHRP authentication string must match`
- `Check 'show dmvpn' for DMVPN tunnel status`

### DMVPN Phase Misconfiguration (Severity: HIGH)

Configure wrong DMVPN phase (1/2/3) features causing routing or spoke-spoke issues

**Diagnostic Symptoms:**
- Spoke-to-spoke tunnels not forming (phase 2/3 expected)
- Traffic through hub when direct path should exist
- Phase 3 redirect not working
- Routing protocol not supporting spoke-spoke

**Troubleshooting Commands & Remediation:**
- `DMVPN Phase 1: spoke-spoke through hub only`
- `DMVPN Phase 2: spoke-spoke with NHRP, no route summarization`
- `DMVPN Phase 3: spoke-spoke with NHRP redirect, supports summarization`
- `Check 'show dmvpn' for tunnel status and spoke peers`
- `Phase 3 uses 'ip nhrp redirect' on hub and 'ip nhrp shortcut' on spokes`
- `Phase 2 requires no route summarization on hub`

### GRE Tunnel Keepalive Misconfiguration (Severity: LOW)

Configure GRE keepalive without proper routing causing tunnel flapping

**Diagnostic Symptoms:**
- GRE tunnel flapping up and down
- Keepalive failure despite reachable endpoint
- GRE keepalive not supported on both ends
- Tunnel destination unreachable for keepalives

**Troubleshooting Commands & Remediation:**
- `GRE keepalives: 'keepalive <seconds> <retries>' on tunnel interface`
- `Keepalive requires routing through the tunnel (recursive)`
- `Use static route to tunnel destination via physical interface`
- `Some platforms do not support GRE keepalives`
- `Alternative: IP SLA tracking of the remote endpoint`
- `Keepalive interval default is 10 seconds`

### GRE/IPsec Tunnel MTU/Path MTU Issue (Severity: HIGH)

Configure GRE or IPsec tunnel with incorrect MTU causing fragmentation

**Diagnostic Symptoms:**
- Large packets dropped through tunnel
- PMTUD not working on tunnel interface
- TCP connections stall (MSS issues)
- Fragmentation on tunnel causing performance loss

**Troubleshooting Commands & Remediation:**
- `GRE overhead: 24 bytes (4 bytes GRE + 20 bytes IP)`
- `IPsec overhead: varies (50-60+ bytes depending on auth/encrypt)`
- `GRE+IPsec: 24 + ~50 = ~74 bytes overhead`
- `Set tunnel MTU: 'ip mtu <size>' on tunnel interface`
- `Set TCP-MSS: 'ip tcp adjust-mss <size>' on tunnel`
- `Typical MSS for GRE: 1436, for GRE+IPsec: ~1386`

### IPsec DPD (Dead Peer Detection) Misconfiguration (Severity: LOW)

Configure IPsec DPD timeout too short or too long causing peer flapping or slow failover

**Diagnostic Symptoms:**
- IPsec peer declared dead incorrectly
- IKE keepalive failures causing tunnel reset
- DPD retry count exceeded falsely
- Slow failover because DPD interval too long

**Troubleshooting Commands & Remediation:**
- `DPD (Dead Peer Detection): 'crypto isakmp keepalive <seconds> <retries>'`
- `DPD retry interval: time between DPD R-U-THERE messages`
- `Retry count: number of failed DPD before peer declared dead`
- `Too short: false positives declaring peer dead`
- `Too long: slow failover (tunnel stays up after peer failure)`
- `Check 'show crypto isakmp sa' for DPD status`

### IPsec Certificate-Based Authentication Failure (Severity: HIGH)

Configure IPsec PKI/certificate authentication but certificate validation fails

**Diagnostic Symptoms:**
- IKE phase 1 fails with certificate errors
- Certificate not trusted by peer
- Certificate chain incomplete
- CRL/OCSP validation failure

**Troubleshooting Commands & Remediation:**
- `Check certificate: 'show crypto pki certificates'`
- `Verify CA certificate is installed on both peers`
- `Certificate must not be expired or revoked`
- `CRL: 'crypto pki crl request <ca-name>'`
- `OCSP: 'crypto pki certificate map <name>' for validation`
- `Use 'debug crypto pki' for certificate validation debugging`

### IPsec VRF-Aware / MPLS VPN IPsec Misconfiguration (Severity: HIGH)

Configure IPsec tunnel within VRF context but VRFs not configured correctly

**Diagnostic Symptoms:**
- IPsec tunnel not forming within VRF
- IKE not VRF-aware (traffic from wrong routing table)
- Crypto maps referencing VRF not working
- Protected traffic within VRF cannot trigger IPsec

**Troubleshooting Commands & Remediation:**
- `VRF-aware IPsec: 'crypto keyring <name> vrf <vrf>'`
- `ISAKMP profile: 'match identity address <acl> vrf <vrf>'`
- `IPsec profile references ISAKMP profile with VRF`
- `Tunnel interface: 'tunnel vrf <vrf>'`
- `GRE tunnel: use IPsec to protect GRE within VRF`
- `Common in MPLS VPN internet access with encryption`

### IKEv2 Parameter / Interoperability Issue (Severity: HIGH)

Configure IKEv2 IPsec with parameters not compatible with IKEv1-only peer

**Diagnostic Symptoms:**
- IKE negotiation fails on proposed versions
- IKEv2 configured but peer only supports IKEv1
- IKEv2 proposals not matching (encryption/integrity/PRF/DH)
- Authentication method mismatch in IKEv2

**Troubleshooting Commands & Remediation:**
- `IKEv2: 'crypto ikev2 proposal <name>' and 'crypto ikev2 policy <name>'`
- `Check 'show crypto ikev2 proposal' and 'show crypto ikev2 policy'`
- `IKEv2 separates proposals (encryption/integrity/PRF/DH)`
- `IKEv2 supports both PSK and certificate auth in same config`
- `Fallback to IKEv1: 'crypto isakmp' (for backwards compatibility)`
- `IKEv2 SA: 'show crypto ikev2 sa' for session status`

### IPsec Fragmentation / DF Bit Handling Issue (Severity: HIGH)

Configure IPsec with incorrect DF bit policy or fragmentation causing packet drops

**Diagnostic Symptoms:**
- Large packets not passing through IPsec tunnel
- DF bit set preventing IPsec fragmentation
- IPsec pre-fragmentation not configured
- PMTUD failure through IPsec tunnel

**Troubleshooting Commands & Remediation:**
- `IPsec fragmentation occurs before encryption (pre-frag)`
- `DF bit policy: clear-df-bit, set-df-bit, copy-df-bit (crypto map)`
- `Use 'crypto ipsec df-bit clear-df-bit' to allow fragmentation`
- `Set tunnel MTU to account for IPsec overhead`
- `TCP MSS clamp on VPN endpoints: 'ip tcp adjust-mss <size>'`
- `Check 'show crypto ipsec sa' for fragmentation stats`

### DMVPN NHRP Authentication / Split-Horizon Issue (Severity: HIGH)

Configure DMVPN with NHRP authentication key mismatch or routing over NBMA issues

**Diagnostic Symptoms:**
- Spoke cannot register with hub (NHRP auth failure)
- DMVPN spoke-to-spoke traffic through hub (no shortcut)
- Routing protocol over DMVPN failing
- NHRP resolution requests not answered

**Troubleshooting Commands & Remediation:**
- `NHRP authentication: 'ip nhrp authentication <string>'`
- `Authentication string must match on all DMVPN nodes`
- `EIGRP over DMVPN: disable split-horizon on hub`
- `OSPF over DMVPN: need point-to-multipoint network type`
- `BGP over DMVPN: full mesh (iBGP) or separate AS (eBGP)`
- `Check 'show dmvpn' for tunnel status and NHRP peer info`

### IPsec over GRE / GRE over IPsec Encapsulation Error (Severity: HIGH)

Configure IPsec over GRE or GRE over IPsec with incorrect encapsulation order causing MTU/encryption issues

**Diagnostic Symptoms:**
- IPsec+GRE tunnel not encrypting expected traffic
- GRE and IPsec encapsulation order causing double overhead
- IPsec encrypting GRE header when only payload needed
- MTU severely reduced due to double encapsulation

**Troubleshooting Commands & Remediation:**
- `GRE over IPsec: GRE tunnel interface protected by crypto map`
- `IPsec over GRE: crypto applied before GRE (encap, transport, encap)`
- `Typical: GRE over IPsec (GRE encapsulated within IPsec)`
- `Double overhead: GRE 24 + IPsec ~50 = ~74 bytes`
- `TCP-MSS adjustment critical: typically 1360 or lower`
- `Check 'show crypto ipsec sa' for protocol of encrypted packets`

### DMVPN Phase 2 Spoke-to-Spoke Tunnel Not Forming (Severity: HIGH)

Configure DMVPN Phase 2 but NHRP shortcut not creating direct spoke-to-spoke tunnel

**Diagnostic Symptoms:**
- Traffic between spokes always goes through hub
- NHRP resolution completes but IPsec not triggered
- Spoke-to-spoke tunnel not established
- DMVPN Phase 2 shortcut not working

### DMVPN Phase 3 NHRP Redirect / Shortcut Failure (Severity: HIGH)

Configure DMVPN Phase 3 with NHRP redirect but shortcut not triggered

**Diagnostic Symptoms:**
- Traffic between spokes does not use direct path
- NHRP redirect not sent by hub
- Spoke not sending NHRP resolution request after redirect
- Phase 3 summarization breaking spoke-spoke paths

### DMVPNv6 / DMVPN over IPv6 Transport (Severity: HIGH)

Configure DMVPN with IPv6 transport (GRE over IPv6) but spoke registration fails

**Diagnostic Symptoms:**
- Spoke NHRP registration fails over IPv6 transport
- DMVPN tunnel using IPv6 NBMA addresses but not forming
- IPv6 multicast forwarding (FF02::/16) not working
- GRE IPv6 tunnel mode not configured

### DMVPN Spoke-to-Spoke IPsec Protection Profile Mismatch (Severity: HIGH)

Configure different IPsec profiles on hub and spokes preventing spoke-spoke tunnel

**Diagnostic Symptoms:**
- Spoke-to-hub IPsec works but spoke-to-spoke fails
- Spokes use different transform sets or IKE profiles
- IPsec SA not negotiated between spokes
- DMVPN direct tunnel formed but no encryption

