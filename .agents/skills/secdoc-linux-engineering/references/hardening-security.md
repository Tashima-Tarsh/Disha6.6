# Hardening & Security — Host Hardening Mechanics

This file executes; the control language composes upward. Mapping a hardening step to NIST 800-53, CIS Controls, or a compliance regime is cybersecurity-architecture's territory; reviewing a config or script for vulnerabilities is code-security-analysis's. Perishable edges: benchmark versions, tool packaging, distro crypto-policy defaults — verify at use time. The order of operations and the lockout warnings are durable.

## Contents

1. The minimal-install discipline
2. SSH hardening as the first act
3. Privilege discipline: sudo
4. Mandatory access control: SELinux and AppArmor
5. auditd and file-integrity monitoring
6. The host firewall stance
7. Update automation
8. Secure boot and disk encryption, at orientation
9. CIS-benchmark execution mechanics

---

## 1. The minimal-install discipline

Every installed package is attack surface, patch obligation, and audit noise; every running service is all three plus a listener. The argument runs one direction: start minimal and add with reasons, because removing later means discovering dependencies in production. On an inherited box, the audit is three lists:

```
$ ss -tlnp                                   # what listens — every line needs a justification
$ systemctl list-units --type=service --state=running
$ apt list --installed 2>/dev/null | wc -l   # [Debian-family]; rpm -qa | wc -l [RHEL-family]
```

The listener list is the sharp one: anything bound to `0.0.0.0` or `::` that isn't the service this box exists to run gets removed, disabled (`systemctl disable --now`), or re-bound to loopback. Kernel surface belongs to the same discipline — unused filesystems and protocols get the hard block from system-internals.md (`install dccp /bin/false` in `/etc/modprobe.d/`, and the same for sctp, and for usb-storage on servers with no business reading thumb drives). Remove compilers and dev toolchains from production hosts that don't build software; an attacker who must bring their own tools is a noisier attacker.

---

## 2. SSH hardening as the first act

First, because on most servers SSH is the *entire* remote attack surface for authentication — and because every other hardening step assumes you can still get in. The full sequence, with the prove-before-locking order and the second-terminal rule, lives in networking-stack.md §6 — it is the canonical version; do not improvise a different order. The compressed form:

1. Key installed → **new-session proof** → 2. `PasswordAuthentication no`, `PermitRootLogin no`, `AllowGroups ssh-users` in a drop-in → 3. `sshd -t` → `systemctl reload sshd` → 4. **proof again, safety session still open.**

Stated explicitly, because everyone locks themselves out once: the lockout happens either by disabling password auth before proving keys work, or by shipping a config `sshd` refuses to load — `sshd -t` catches the second, only discipline catches the first, and console/IPMI access in reserve catches you when both fail. Beyond the sequence: rate-limiting brute force at the firewall or fail2ban is hygiene, not a control; moving the port is noise reduction, not a control; and at fleet scale, SSH certificates (networking-stack.md) replace key sprawl with short-lived, auditable credentials.

---

## 3. Privilege discipline: sudo

The goal is least privilege with an audit trail, and sudo delivers both — when it isn't `ALL=(ALL) ALL` for everyone in the admin group with a shrug.

**visudo, always.** It syntax-checks before install; a bad line in a hand-edited `/etc/sudoers` disables sudo for everyone, which on a `PermitRootLogin no` box is a two-mistake lockout. Rules go in `/etc/sudoers.d/` fragments (visudo edits them too: `visudo -f /etc/sudoers.d/backup-ops`) — the drop-in discipline again.

**Granularity.** Grant commands, not shells:

```
# /etc/sudoers.d/backup-ops
%backup-ops ALL=(root) /usr/bin/systemctl restart borgbackup.service, /usr/local/bin/run-backup.sh
```

The classic hole to check when reviewing: a granted command that offers a shell escape (editors, pagers, anything with `!`) grants root regardless of the rule's intent — grant wrapper scripts (root-owned, non-writable by the group) instead of flexible binaries, and prefer `sudoedit` over granting an editor.

**NOPASSWD honesty.** `NOPASSWD:` means a compromised *user account* is instantly the granted privilege — no second factor of "knows the password." Automation needs it (a cron/timer job can't type); humans mostly shouldn't have it, and where convenience wins, the grant should be narrow enough that the honest sentence "anyone who steals this account can run exactly X as root" is acceptable. Logging: sudo lands in the journal/auth.log by default; `Defaults log_output` (sudoreplay) or auditd (§5) upgrade "what did they run" to "what did it do."

---

## 4. Mandatory access control: SELinux and AppArmor

DAC (permissions, ACLs) lets the owner decide; MAC enforces policy the process owner cannot waive — which is exactly what contains a compromised service. The real-world note first: **which one you meet is decided by the distro** — SELinux on the RHEL family [RHEL-family default: enforcing, targeted policy]; AppArmor on Debian, Ubuntu, and SUSE [Debian/SUSE-family]. An admin crossing families needs read fluency in both.

**SELinux, taught as contexts, booleans, and the audit log — not "just disable it."** Disabling SELinux to make an error go away trades a labeled, logged, tunable control for nothing; the error was information.

- *Contexts:* every process and file carries a label; policy says which domains may touch which types. `ls -Z`, `ps -eZ`. The most common failure is a **mislabel** — a file moved (not copied) into `/var/www/html` keeps its old label and Apache gets EACCES with perfect Unix permissions. Fix the label, not the mode: `restorecon -Rv /var/www/html`. Persistent custom paths: `semanage fcontext -a -t httpd_sys_content_t '/srv/site(/.*)?'` then `restorecon`.
- *Booleans:* policy toggles for known legitimate patterns — `getsebool -a | grep httpd`; `setsebool -P httpd_can_network_connect on` when the web app really must proxy outward. Check for an existing boolean before writing custom policy; there usually is one.
- *The audit log:* denials land in `/var/log/audit/audit.log` (`type=AVC`). The workflow: `ausearch -m avc -ts recent` → read what was denied → decide label / boolean / (rarely) custom module — `audit2allow` *drafts* policy from denials, and its output is reviewed, not piped blindly into `semodule -i`, because it will happily codify the attack you're watching. `setenforce 0` (permissive) is a *diagnostic* — denials log without blocking, proving or disproving "is it SELinux?" — and it ends the session it started in.

**AppArmor as profiles.** Path-based per-program profiles in `/etc/apparmor.d/`, each enforcing what that program may read, write, and execute. `aa-status` shows the enforced/complain split; `aa-complain`/`aa-enforce` flip a profile's mode; denials land in the journal (`journalctl | grep -i apparmor` or `DENIED` in audit). Profile development: run the target in complain mode, exercise it, `aa-logprof` to fold the observed accesses into the profile — same review obligation as audit2allow. Simpler model, path-based rather than label-based: easier to write, and correspondingly less reach — a trade-off to state, not a verdict.

---

## 5. auditd and file-integrity monitoring

**auditd at working depth.** The kernel audit subsystem records syscalls matching rules — who did what, with what privilege, to which object — the forensic record that survives an application's own logs. Rules live in `/etc/audit/rules.d/*.rules`, loaded by `augenrules`; `-e 2` at the end locks the config until reboot (an attacker with root can otherwise simply turn auditing off — with `-e 2` they can only stop *future* boots, which is itself a loud signal).

The starter set worth understanding line by line:

```
-w /etc/passwd -p wa -k identity
-w /etc/sudoers -p wa -k privilege
-w /etc/ssh/sshd_config -p wa -k sshd
-a always,exit -F arch=b64 -S execve -F euid=0 -k root-exec
```

Watches (`-w`) on identity and privilege files; the `execve` rule records every command run as root — sudo says what was *invoked*, this says what *executed*, children included. Query by key: `ausearch -k privilege -ts today`; summarize: `aureport -x --summary`. Honesty about cost: `execve` auditing on a busy build box is measurable overhead and serious log volume — scope rules to what the threat model needs, and ship the log off-host (administration.md's forwarding pipeline) because a local-only audit log is the attacker's to curate. Distro-shipped CIS/STIG rule sets exist as a starting point; verify current packaging.

**File-integrity monitoring.** AIDE as the representative tool [aide, both families]: initialize a database of hashes and attributes (`aide --init`, move the db into place), then `aide --check` diffs reality against it. The two facts that decide whether it's a control or a placebo: the **baseline database must live somewhere the monitored host can't rewrite** (read-only media, or pulled to a central host — an attacker who can edit files can edit the db that vouches for them), and the check runs on a schedule (timer unit) with output that a human or pipeline actually reads. Update the baseline after every legitimate change (patching), or the alerts drown the signal — which is why FIM pairs naturally with update automation's cadence (§7). RPM-based systems get a weak free tier via `rpm -Va` [RHEL-family]; `dpkg -V` similarly [Debian-family] — package-manager verification, useful for "what changed from the package," not a substitute for an independent baseline.

---

## 6. The host firewall stance

**Default-deny inbound** is the stance; everything else is implementation. Outbound default-deny is real hardening but a real operational cost (updates, DNS, NTP all need rules) — state the trade-off and reserve it for hosts that earn it (bastions, crown jewels). The mechanics of nftables — including the established-state rule, the ICMPv6 lines that keep v6 alive, and the anti-lockout ritual for remote changes — live in networking-stack.md §4; this section owns the stance and the frontend choice:

| Frontend | Family reality | Character |
|---|---|---|
| nftables directly | any | one readable file, no abstraction; the reference config in networking-stack.md |
| firewalld | [RHEL-family default] | zones and services over nftables; runtime vs `--permanent` is the classic gotcha — a rule that vanished on reload was never made permanent |
| ufw | [Debian/Ubuntu convention] | `ufw allow 22/tcp`, `ufw enable` — the right answer where the policy is simple enough to say in five lines |

Pick per family and complexity; don't stack two frontends on one host — the "who owns this interface" problem from networking-stack.md §1, restaged at the firewall. Whatever writes the rules, the verification is the same: `nft list ruleset` is ground truth, and a port-scan from a second host (`nmap -p-` from the outside) is the test that the *stance* holds, not just the syntax.

---

## 7. Update automation

The argument is administration.md's (the patch gap is the attacker's window); this section is the mechanics of closing it unattended:

- **[Debian-family]** `unattended-upgrades`: installed by default on Ubuntu, a package away on Debian. Scope in `/etc/apt/apt.conf.d/50unattended-upgrades` — security origin enabled at minimum; `Unattended-Upgrade::Automatic-Reboot "true"` with a reboot window (`Automatic-Reboot-Time "03:30"`) if the host may self-reboot, and honesty when it may not: kernel and libc updates without reboot are partially applied (`needrestart` tells the truth).
- **[RHEL-family]** `dnf-automatic`: `/etc/dnf/automatic.conf` — `upgrade_type = security`, `apply_updates = yes` — enabled via its own timer: `systemctl enable --now dnf-automatic.timer`.
- **[SUSE-family]** `zypper patch` driven by a timer unit, or the distro's automatic-patching tooling — verify current packaging.

Fleet honesty: unattended *security* updates on everything is a defensible default; unattended *everything* on a database server is how you discover a regression at 03:30 with no one watching. Tier it — canary hosts take updates first (the fleet rule from SKILL.md, applied to patching), staged rings after — and pair the cadence with FIM baseline refreshes (§5) so patch day doesn't read as intrusion day.

---

## 8. Secure boot and disk encryption, at orientation

**Secure Boot.** UEFI verifies the bootloader's signature; the chain continues through shim → GRUB → kernel, and on to modules — which is why an unsigned out-of-tree module (ZFS, some drivers) fails to load on a Secure Boot host until it's signed with an enrolled MOK (`mokutil`). Orientation depth: know that the chain exists, that `mokutil --sb-state` answers "is it on," that it defends the pre-OS stage (bootkits) and not the running system, and that "disable Secure Boot" as a fix deserves the same skepticism as "disable SELinux."

**Disk encryption.** LUKS2 via `cryptsetup` is the Linux standard; full-disk (everything but `/boot` or including it, setup-dependent) protects data at rest — the stolen-drive and decommissioning threat, not the running-system threat: a mounted volume is plaintext to every process with read rights. Operational facts that outrank the cryptography: **the LUKS header backup** (`cryptsetup luksHeaderBackup` — a damaged header with no backup is cryptographically thorough data loss), multiple key slots (a recovery passphrase in escrow beside the daily one), and the unattended-reboot problem on servers — TPM-sealed keys (`systemd-cryptenroll --tpm2-device=auto`) or network-bound disclosure (Clevis/Tang) are the orientation-level pointers, each with its own threat-model fine print. Encrypt at provision time; retrofitting is a migration, not a flag.

---

## 9. CIS-benchmark execution mechanics

What running a benchmark against a host actually looks like — the mechanics; mapping results to control language composes upward to cybersecurity-architecture.

**The artifact:** a CIS benchmark is a per-distro-version document of individually numbered recommendations (e.g., *5.2.x* series covering sshd settings), each with rationale, an audit command, and a remediation — Level 1 (defensible baseline, low breakage risk) vs Level 2 (defense-in-depth, higher operational cost), and *Scored/Automated* vs *Manual* items. Match the benchmark version to the OS version — auditing Debian 13 against a Debian 11 benchmark produces confident nonsense; verify current benchmark availability at use time.

**The tooling:** OpenSCAP is the common engine [openscap-scanner + a content package such as ssg (scap-security-guide), both families] — distro-shipped SCAP content includes CIS-aligned and STIG profiles:

```
$ oscap info /usr/share/xml/scap/ssg/content/ssg-debian13-ds.xml   # list available profiles
$ sudo oscap xccdf eval --profile cis_level1_server \
    --report /root/cis-report.html \
    /usr/share/xml/scap/ssg/content/ssg-debian13-ds.xml
...
Title  Ensure permissions on /etc/ssh/sshd_config are configured
Rule   xccdf_org.ssgproject.content_rule_file_permissions_sshd_config
Result pass
```

The HTML report is per-rule pass/fail with the rationale inline. CIS's own CIS-CAT tool exists behind membership; Lynis is the lighter independent auditor — category tools, verify current standing.

**Scoring honesty.** The score is *configuration conformance to a generic baseline* — not a risk score, not a security guarantee, and not a target to max. Some failures are deliberate, documented exceptions (the benchmark's assumptions don't survive contact with every workload — remote-syslog rules on the log *server* itself, for instance); a fleet chasing 100% will break things to move a number. The honest deliverables are three: the score with trend over time, the exception list *with reasons*, and the remediation queue — auto-remediation (`oscap ... remediate`, or applying the shipped Ansible/bash fixes) gets the same treatment as any fleet-wide destructive operation: read what it will change, one host first, canary ring, then out. Turning that per-rule output into 800-53/CIS-Controls mapping, POA&Ms, and assessment language is the compose-upward pointer: cybersecurity-architecture owns the framework layer; this file owns getting a truthful scan.
