---
name: "DNS Issues Injection"
description: "DNS resolution, forwarding, recursion, DNSSEC related network faults for troubleshooting practice"
category: "computer-networking"
---

# DNS Issues Injection

DNS resolution, forwarding, recursion, DNSSEC related network faults for troubleshooting practice

## Supported Protocols
- dns
- dns-forward
- dns-resolver

## Fault Injection Scenarios & Troubleshooting Procedures

### DNS Name-Server / Resolver Misconfiguration (Severity: HIGH)

Configure wrong DNS server IP on host or router causing resolution failures

**Diagnostic Symptoms:**
- DNS resolution fails for all domains
- nslookup/dig timeout
- Wrong DNS server IP configured
- Able to access some sites by IP but not by name

**Troubleshooting Commands & Remediation:**
- `Check DNS server with 'show running-config | include name-server'`
- `Use 'ip name-server <ip>' to configure DNS resolver`
- `Test: 'nslookup <domain>' from router or host`
- `Verify DNS server reachability: 'ping <dns-ip>'`
- `Check UDP 53 reachable between client and DNS server`
- `Multiple name-servers should be configured for redundancy`

### DNS Recursion / Recursive Query Failure (Severity: HIGH)

Configure DNS recursion disabled on server causing queries from clients to fail

**Diagnostic Symptoms:**
- DNS server resolution fails for external domains
- Recursive queries return SERVFAIL or timeout
- Local DNS records resolve but external domains do not
- Direct queries to authoritative servers work but recursive fails

### DNS Forwarding / Conditional Forward Target Wrong (Severity: HIGH)

Configure DNS forwarder with incorrect target address causing resolution failure for specific domains

**Diagnostic Symptoms:**
- DNS resolution fails for external domains but internal works
- Conditional forward target IP unreachable
- Forward zone not matching expected domain
- DNS forwarder timeout for specific domain queries

### DNS Query Timeout / Retry Misconfiguration (Severity: MEDIUM)

Configure DNS timeout too low causing premature query failure

**Diagnostic Symptoms:**
- DNS queries fail but eventually succeed on retry
- Slow DNS resolution causing application delays
- Timeout too short for high-latency links
- First query fails, retry succeeds

### DNS Zone Transfer / Authoritative Zone Misconfiguration (Severity: HIGH)

Configure DNS zone with incorrect type or zone transfer ACL allowing unauthorized transfers

**Diagnostic Symptoms:**
- DNS zone file missing expected records
- Zone transfer (AXFR) fails between primary and secondary
- Secondary DNS server has stale zone data
- Unauthorized zone transfer possible (security risk)

### DNS SERVFAIL / Resolution Error Response (Severity: HIGH)

Configure scenario causing DNS server to return SERVFAIL for valid queries

**Diagnostic Symptoms:**
- DNS returns SERVFAIL (rcode 2) for specific queries
- Some domains fail to resolve while others work
- Authoritative servers unreachable for certain zones
- DNSSEC validation failure causing SERVFAIL

### Split-DNS / Internal-External View Mismatch (Severity: HIGH)

Configure split-DNS views incorrectly returning wrong IP for same domain based on source

**Diagnostic Symptoms:**
- Internal users get public IP when should get private IP
- External users get private IP when should get public IP
- Split-DNS views not matching expected client sources
- NAT hairpin issues due to wrong DNS response

### DNS Cache Poisoning / Invalid Entry Scenario (Severity: HIGH)

Configure insecure DNS resulting in cached incorrect DNS entries

**Diagnostic Symptoms:**
- DNS returns incorrect IP for specific domain
- Multiple clients resolve domain to wrong address
- Cache entry persists after source data corrected
- DNS source port randomization disabled

### DNS NXDOMAIN / Non-Existent Domain Handling (Severity: MEDIUM)

Configure DNS negative caching or NXDOMAIN responses cached too long

**Diagnostic Symptoms:**
- Newly created domain not resolving
- NXDOMAIN response cached despite domain now valid
- Typo'ed domain returns cached error for too long
- Negative cache TTL too high

