# The Networking Stack — Linux's Own Network Machinery

This file configures Linux's stack and hands off at the wire: protocol internals (OSPF/BGP mechanics, switching, firewall appliances) belong to network-engineering; WAN/SASE/segmentation strategy to networking-architecture. Perishable edges: which distro defaults to which config stack, netplan/NM versions. Durable: `ip` semantics, resolution order, the diagnostic ladder.

## Contents

1. Who owns this interface? — the configuration-stack reality
2. Addressing, routing, and policy routing with `ip`
3. Name resolution on a modern system
4. nftables as the present tense
5. Linux networking constructs
6. SSH engineering at depth
7. The diagnostic ladder, from the machine outward

---

## 1. Who owns this interface?

Linux grew four coexisting configuration stacks, and **the first diagnostic question on any misbehaving interface is: who owns this one?** — because editing a file the owning daemon ignores is the most common dead-end in Linux networking.

| Stack | Native config | Typical default on |
|---|---|---|
| systemd-networkd | `/etc/systemd/network/*.network` | servers/minimal installs; Ubuntu Server via netplan rendering [Ubuntu] |
| NetworkManager | `nmcli`/`nmtui`, keyfiles in `/etc/NetworkManager/system-connections/` | RHEL-family (server and desktop) [RHEL-family]; most desktops |
| ifupdown | `/etc/network/interfaces` | Debian proper, traditionally [Debian-family] |
| netplan | `/etc/netplan/*.yaml` — a *renderer* that generates networkd or NM config | Ubuntu [Ubuntu] |

Defaults drift by release — verify at use time. Establishing ownership:

```
$ networkctl list                      # networkd's view; "unmanaged" = not networkd's
$ nmcli device status                  # NM's view; "unmanaged" = not NM's
$ systemctl is-active systemd-networkd NetworkManager
```

Two managers active and both claiming an interface produces the classic symptom: settings that revert seconds after you apply them. Pick one owner per interface; netplan's `renderer:` key is how Ubuntu expresses the choice.

A static server interface under networkd, as the working example:

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0
[Network]
Address=192.0.2.10/24
Gateway=192.0.2.1
DNS=192.0.2.53
```
`networkctl reload` applies it. The NM equivalent: `nmcli con mod eth0 ipv4.addresses 192.0.2.10/24 ipv4.gateway 192.0.2.1 ipv4.dns 192.0.2.53 ipv4.method manual && nmcli con up eth0`.

---

## 2. Addressing, routing, and policy routing with `ip`

`ip` (iproute2) is the present tense; `ifconfig`, `route`, and `netstat` are read-only history — name them as such when they appear in old docs, and note the BSD divergence: on FreeBSD and macOS, `ifconfig` *is* current.

```
$ ip -br addr                          # the daily view
lo       UNKNOWN  127.0.0.1/8 ::1/128
eth0     UP       192.0.2.10/24 fe80::1/64
$ ip route
default via 192.0.2.1 dev eth0 proto static
192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.10
$ ip route get 8.8.8.8               # "which path would this packet take" — ends arguments
8.8.8.8 via 192.0.2.1 dev eth0 src 192.0.2.10
```

Runtime changes (`ip addr add`, `ip route add`) do not survive reboot — persistence lives in the owning stack from section 1. Forwarding between interfaces requires `sysctl net.ipv4.ip_forward=1` (and the v6 twin) — the make-it-a-router switch.

**Policy routing:** the main table answers "where is the destination"; policy routing adds "…and who is asking." Multiple tables selected by rules (`ip rule`) keyed on source, mark, or interface. The canonical use is a dual-homed host answering out the interface traffic arrived on:

```
$ echo "100 isp2" | sudo tee -a /etc/iproute2/rt_tables
$ sudo ip route add default via 198.51.100.1 dev eth1 table isp2
$ sudo ip rule add from 198.51.100.10/32 table isp2
```

Routing *protocol* territory — FRR, OSPF/BGP on a Linux box — is the handoff line: this skill gets the host to the wire; network-engineering owns what the protocols do on it.

---

## 3. Name resolution on a modern system

Resolution is a stack, and "DNS is broken" is usually a misreading of which layer answered.

**nsswitch first.** `/etc/nsswitch.conf`'s `hosts:` line orders the sources — typically `files` (`/etc/hosts`) before `dns` (or `resolve` for systemd-resolved). This is why a stale `/etc/hosts` entry overrides correct DNS, and why `ping` and `dig` can disagree: **`dig`/`host` query DNS servers directly and skip nsswitch entirely; `getent hosts <name>` asks the same stack applications use** — make `getent` the diagnostic default.

**systemd-resolved, the stub and the symlink.** Where resolved runs (Ubuntu, Fedora, others — verify per distro), it listens on `127.0.0.53` and manages per-interface DNS. `/etc/resolv.conf` is a symlink, and *which* symlink matters: `stub-resolv.conf` (points at 127.0.0.53 — resolved is in the path, split-DNS works) vs `resolv.conf` under `/run/systemd/resolve/` (real upstreams, bypassing the stub). An overwritten or wrong symlink is a top-five resolution bug. Inspection:

```
$ resolvectl status                    # per-link servers and domains
$ resolvectl query internal.corp      # what resolved itself would answer
$ ls -l /etc/resolv.conf              # which regime is this box under?
```

Without resolved, `/etc/resolv.conf` is a real file — written by dhclient or NM unless told otherwise. On BSD it is simply a file; no stub daemon by default.

---

## 4. nftables as the present tense

nftables replaced iptables as the kernel's packet-filtering frontend; `iptables` still works nearly everywhere as a translation shim (`iptables-nft`) over the same kernel machinery — read fluency required for the installed base, new work in nft. Distro frontends (`firewalld` [RHEL-family], `ufw` [Debian/Ubuntu]) sit on top; hardening-security.md owns the stance and the frontend choice — this file owns the mechanics.

Unlike iptables, nftables ships **no built-in chains** — you create tables and chains and attach them to hooks with a policy. A minimal default-deny inbound host policy:

```
# /etc/nftables.conf
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    ct state invalid drop
    iif lo accept
    tcp dport 22 accept comment "ssh"
    icmp type echo-request accept
    icmpv6 type { echo-request, nd-neighbor-solicit, nd-neighbor-advert, nd-router-advert } accept
  }
  chain forward { type filter hook forward priority 0; policy drop; }
}
```

`inet` covers v4+v6 in one table — and the icmpv6 lines are load-bearing: dropping neighbor discovery breaks IPv6 entirely, the classic self-inflicted "v6 stopped working after I added a firewall."

```
$ sudo nft -c -f /etc/nftables.conf    # -c: syntax-check without loading
$ sudo nft -f /etc/nftables.conf && sudo systemctl enable nftables
$ sudo nft list ruleset
```

*Safety note for remote work:* a firewall change over SSH can be a self-lockout. Established-state accept before policy drop protects the current session, but the belt-and-suspenders move is a scheduled revert (`echo 'nft flush ruleset' | sudo at now + 5 minutes`, cancel it once you confirm) or console access in reserve.

Translation for the installed base: `iptables-translate -A INPUT -p tcp --dport 443 -j ACCEPT` emits the nft equivalent — the migration tool and the Rosetta stone in one.

---

## 5. Linux networking constructs

The kernel's own network devices — the substrate under VMs and containers.

**Bridges** — a software switch. The libvirt/VM classic: enslave the physical NIC to `br0`, give the bridge the IP, attach guests to it. Under networkd: a `.netdev` (`Kind=bridge`) plus a `.network` binding `eth0` to `Bridge=br0`; the IP moves to the bridge's `.network` — the misstep is leaving the address on the enslaved NIC.

**Bonds** — link aggregation. Modes that matter: `active-backup` (failover, no switch cooperation needed — the safe default) and `802.3ad`/LACP (aggregation, requires switch config — the switch side is network-engineering's). `cat /proc/net/bonding/bond0` is the health check.

**VLANs** — 802.1Q tagging on a Linux interface: a `.netdev` with `Kind=vlan`, `Id=30`, or `ip link add link eth0 name eth0.30 type vlan id 30`. The host tags; what the switch port must be configured to carry is, again, the handoff.

**veth and namespaces — the container substrate.** A network namespace is a private copy of the whole stack (interfaces, routes, firewall); a veth pair is a virtual cable with an end in each. This *is* container networking with the branding removed, and building it once by hand is the best demystifier:

```
$ sudo ip netns add lab
$ sudo ip link add veth0 type veth peer name veth1
$ sudo ip link set veth1 netns lab
$ sudo ip -n lab addr add 10.10.0.2/24 dev veth1 && sudo ip -n lab link set veth1 up
$ sudo ip netns exec lab ping -c1 10.10.0.1     # once veth0 side is addressed and up
```

`ip netns exec lab <tool>` runs any diagnostic *inside* a namespace — which is also how you debug a container's networking from the host.

---

## 6. SSH engineering at depth

**Server hardening order — sequence matters because everyone locks themselves out once.** The rule: prove the new door opens before locking the old one, with a root session held open in a second terminal throughout.

1. Create your key pair (`ssh-keygen -t ed25519`) and install it: `ssh-copy-id user@host`.
2. **Prove key login works in a new session.** Not the old session — a new one.
3. Only then edit `/etc/ssh/sshd_config` (or a drop-in in `/etc/ssh/sshd_config.d/` — same drop-in discipline as systemd):
   ```
   PasswordAuthentication no
   KbdInteractiveAuthentication no
   PermitRootLogin no
   AllowGroups ssh-users
   ```
4. `sshd -t` (syntax check — a broken config that sshd won't load is the other lockout), then `systemctl reload sshd`.
5. Prove login again in a third session before closing the safety session.

`AllowGroups` turns SSH access into group management. Port-moving and fail2ban are noise reduction, not security — fine, but never in place of the above.

**Keys and certificates.** Ed25519 as the modern default. Per-device keys, passphrase-protected, over one key everywhere. At fleet scale, key sprawl breaks down — `authorized_keys` on N hosts is unauditable — and **SSH certificates** are the grown-up answer: a CA signs short-lived user certs; hosts trust the CA (`TrustedUserCAKeys`); host certs kill TOFU prompts in the other direction. Orientation depth: know the shape (`ssh-keygen -s ca_key -I identity -n principal -V +8h user_key.pub`) and that this is what "SSO for SSH" products implement.

**Agent forwarding's risk, named:** `ssh -A` puts your agent's socket on the remote host — root there can use (not copy, but use) your keys against any target while you're connected. On hosts you don't fully trust, that is a lateral-movement gift. **`ProxyJump` (`ssh -J bastion inner`) replaces most legitimate uses** — the connection tunnels *through* the bastion end-to-end, no agent exposure. Config form:

```
# ~/.ssh/config
Host inner
  HostName inner.corp
  ProxyJump bastion.corp
```

**Client discipline:** `~/.ssh/config` as the inventory of named hosts; `ControlMaster`/`ControlPersist` multiplexing when running tooling (the fleet loop in scripting-automation.md assumes it); `StrictHostKeyChecking accept-new` as the scripted-context compromise between TOFU prompts and blind `no`.

---

## 7. The diagnostic ladder, from the machine outward

Six rungs, walked in order — each rung's failure has a distinct signature, and skipping rungs is how "DNS issues" get blamed for unplugged cables.

**1. Link.** `ip -br link` — is the interface UP with `LOWER_UP` (carrier)? `NO-CARRIER` is a cable, switch port, or VM attachment problem. `ethtool eth0` for speed/duplex on metal.

**2. Address.** `ip -br addr` — correct address, correct prefix? A DHCP interface with only a `169.254.x.x` (v4 link-local) address is announcing that DHCP never answered.

**3. Route.** `ip route` — is there a default? `ip route get <target>` — does the box choose the path you think? Then `ping <gateway>`: gateway reachable but nothing beyond it points at the gateway or upstream — likely handoff territory.

**4. Resolution.** `getent hosts name` (the stack apps use) vs `resolvectl query name` vs `dig name @8.8.8.8` (raw DNS, bypassing everything local). Which layer disagrees locates the fault — see section 3.

**5. Port.** Is the service listening, and on the right socket? `ss -tlnp` (`-u` for UDP):
```
$ ss -tlnp
State  Recv-Q Send-Q Local Address:Port  Process
LISTEN 0      511        127.0.0.1:8080  users:(("api",pid=902,fd=6))
```
`127.0.0.1:8080` answers "works locally, refused remotely" in one line — bound to loopback. Then from the client side, `nc -vz host 8080` or `curl -v`: *connection refused* = reached the host, nothing listening (or a REJECT rule); *timeout* = never reached it or a DROP rule — that distinction alone splits the search space in half. Host firewall check: `nft list ruleset` (does a counter on the drop rule tick as you retry?).

**6. Path.** `tracepath`/`traceroute` (`-T` for TCP when ICMP is filtered), `mtr` for the over-time view. `tcpdump` at working depth is the arbiter of "did the packet arrive" — run it on the server while the client retries:
```
$ sudo tcpdump -ni eth0 'tcp port 8080'
... IP 203.0.113.5.51322 > 192.0.2.10.8080: Flags [S] ...      # SYN arrived
```
SYN arriving with no SYN-ACK leaving = local (firewall or listener). No SYN at all = the problem is upstream of this machine — hand off at the wire.
