# Administration — The Daily Craft at Expert Depth

Family-tagged throughout; package names, default versions, and repo mechanics are the perishable layer — verify at use time. The shapes (auth stack, LVM lifecycle, unit-file discipline, 3-2-1) are durable.

## Contents

1. Users, groups, and PAM
2. Package management across families
3. Storage lifecycle
4. Service management as operational practice
5. Scheduled work: cron and timers
6. Backup engineering
7. Logging administration
8. Hosting layers: VMs and containers
9. Configuration management as a category

---

## 1. Users, groups, and PAM

The files: `/etc/passwd` (world-readable account data — the `x` marks "password elsewhere"), `/etc/shadow` (hashes, aging, root-readable), `/etc/group`. Don't hand-edit; the tools lock properly: `useradd`/`usermod`/`userdel`, or `adduser` [Debian-family] for the interactive wrapper. `vipw`/`vigr` if you must edit directly.

```
$ sudo useradd -m -s /bin/bash -G wheel svc-deploy     # [RHEL-family: wheel]
$ sudo useradd -m -s /bin/bash -G sudo svc-deploy      # [Debian-family: sudo]
$ id svc-deploy
uid=1002(svc-deploy) gid=1002(svc-deploy) groups=1002(svc-deploy),10(wheel)
```

Group membership is read at login — a freshly added group appears in new sessions, not existing ones (`newgrp` for the impatient). Service accounts get `--system` (low UID, no aging) and a nologin shell (`-s /usr/sbin/nologin`).

**PAM at working depth — the auth stack an admin actually debugs.** Every auth-touching program (login, sshd, sudo, su) runs its request through a stack of modules configured in `/etc/pam.d/<service>`. Four facilities: `auth` (are you who you claim), `account` (are you allowed right now — expiry, time restrictions), `password` (credential changes), `session` (setup/teardown — this is where `pam_limits` and home-dir creation hook in). Control flags: `required` (must pass, but the stack keeps running so failures aren't distinguishable), `requisite` (must pass, fail fast), `sufficient` (passing ends the stack successfully), `optional`.

Debugging posture: when "my password is right but login fails," the answer is in the stack, and the stack logs. `journalctl -t sshd -t login`, or `/var/log/auth.log` [Debian-family] / `/var/log/secure` [RHEL-family]. Common culprits: `pam_faillock`/`pam_tally2` lockouts after failed attempts (`faillock --user doc` to inspect, `--reset` to clear), account expiry (`chage -l doc`), and a broken edit to the stack itself.

Editing PAM safely follows the same rule as sshd: **keep a root session open in a second terminal until you have proven you can still log in.** A broken PAM stack locks everyone out, console included.

Distros ship stack-management tools — `authselect` [RHEL-family], `pam-auth-update` [Debian-family] — prefer them over hand edits where they cover the change.

---

## 2. Package management across families

| | [Debian-family] | [RHEL-family] | [SUSE-family] | [Arch] | [Alpine] |
|---|---|---|---|---|---|
| Tool | `apt` (dpkg beneath) | `dnf` (rpm beneath) | `zypper` (rpm) | `pacman` | `apk` |
| Install | `apt install nginx` | `dnf install nginx` | `zypper in nginx` | `pacman -S nginx` | `apk add nginx` |
| Which package owns this file | `dpkg -S /path` | `rpm -qf /path` | `rpm -qf /path` | `pacman -Qo /path` | `apk info -W /path` |
| Security updates only | `unattended-upgrades` scoping | `dnf upgrade --security` | `zypper patch` | (rolling — n/a) | `apk upgrade` |

**Unix honesty:** FreeBSD splits `pkg` (binaries) from ports (source); Solaris has IPS; AIX has `installp`/RPM hybrids; macOS has no native CLI package manager — Homebrew is third-party convention.

**Repository trust.** A repo entry is a statement of trust: you are authorizing that source to run code as root on every update. Repos are GPG-signed; the verification chain is only as good as how the key arrived. The modern [Debian-family] form pins the key to the repo (`signed-by=/usr/share/keyrings/...` in a `.sources` file) rather than trusting a key globally (`apt-key` is deprecated — say so when it appears in old guides). Third-party repos and PPAs widen the trust surface; each one is a decision, not a reflex. The same argument applies with more force to `curl | sh` installers — see the safety discipline in SKILL.md.

**Pinning and holds.** `apt-mark hold pkg` [Debian-family], `dnf versionlock` [RHEL-family, plugin], `zypper al` [SUSE-family] — for the kernel you can't reboot into yet or the package a vendor certifies at one version. Every hold is technical debt with a security interest rate; keep a list and revisit it.

**Update cadence is security hygiene.** The gap between patch release and patch applied is the attacker's window, and most compromised Linux servers fall to known, patched vulnerabilities. The defensible baseline: security updates automated (hardening-security.md has the mechanics), full updates on a scheduled cadence with reboot honesty — a new kernel does nothing until you boot into it (`needrestart` [Debian-family] and `dnf needs-restarting -r` [RHEL-family] tell you what is still running old code).

---

## 3. Storage lifecycle

**Partitioning, GPT-first.** GPT unless you have a specific legacy reason (MBR's 2TiB and 4-primary limits are the history). `parted` and `fdisk` both speak GPT now.

*Safety ritual, every time:* identify the device with `lsblk -f` (shows filesystems — a formatted disk is a disk in use), read the device node aloud, read it again. `/dev/sdb` and `/dev/sda` are one keystroke and one career apart. Serial number check when stakes are high: `lsblk -o NAME,SIZE,SERIAL,MODEL`.

```
$ lsblk -f /dev/sdb
NAME FSTYPE LABEL UUID FSAVAIL FSUSE% MOUNTPOINTS
sdb                                                    ← blank: safe to proceed
$ sudo parted /dev/sdb -- mklabel gpt mkpart primary 1MiB 100%
```

**LVM as the default flexibility layer.** PV → VG → LV. The price is one layer of indirection; the purchase is online growth, device migration (`pvmove` — evacuate a dying disk live), and snapshots. Default to it on servers.

```
$ sudo pvcreate /dev/sdb1
$ sudo vgcreate data /dev/sdb1
$ sudo lvcreate -L 50G -n srv data
$ sudo mkfs.xfs /dev/data/srv
$ sudo lvextend -L +20G --resizefs /dev/data/srv     # online grow, fs included
```

Growth is online for ext4 and XFS. **Shrink is not symmetric:** ext4 shrinks offline; XFS does not shrink at all — a reason to leave free extents in the VG rather than allocating everything on day one.

*Snapshot discipline:* an LVM snapshot is CoW against reserved space — when the reserved space fills, **the snapshot dies** (invalidated), so size it for the write rate during its lifetime and treat it as short-lived: a pre-upgrade safety net or a consistent backup source, not an archive. `lvremove` of the wrong LV is unrecoverable — `lvs` first, confirm the name, know where the backup is.

**Software RAID (mdadm) with rebuild-time honesty.** RAID is availability, not backup — it replicates your mistakes at disk speed. Levels in working terms: RAID1 mirror (small, simple), RAID5 (one-disk parity — and the honesty: with today's disk sizes, rebuild takes many hours to days of full-stress reads across every surviving member, which is exactly when a second, correlated-age disk likes to fail; treat RAID5 on large disks as a calculated risk), RAID6 (two-disk parity, the answer to that math), RAID10 (fast rebuilds, half capacity). `cat /proc/mdstat` is the health check; `mdadm --detail /dev/md0` the full story; a monthly `checkarray` scrub catches latent bad sectors *before* a rebuild depends on reading them.

**Mounts, fstab, and the systemd reality.** Every fstab line becomes a generated systemd `.mount` unit (system-internals.md, generators). Consequence one: a missing device referenced in fstab without `nofail` **hangs boot for 90 seconds and drops to emergency mode** — the most common self-inflicted unbootable box. Consequence two: options like `x-systemd.automount` (mount on first access) and `x-systemd.device-timeout=10s` exist. Mount by UUID or label, never by `/dev/sdX` (enumeration order is not stable):

```
UUID=0a3f...  /srv   xfs   defaults,nofail,x-systemd.device-timeout=10s  0 0
```

After editing: `sudo mount -a` **and** `sudo findmnt --verify` before any reboot — fstab is tested at boot, which is the worst possible test environment. `systemctl daemon-reload` if systemd already generated units from the old file.

**Quotas.** Filesystem-level: ext4 (`usrquota,grpquota` mount options, `quotacheck`, `edquota`, `repquota -a`) and XFS (quotas native and better — `uquota` mount option, managed with `xfs_quota`; project quotas can cap a directory tree, which ext4 cannot). ZFS does it per-dataset (`zfs set quota=`), which is cleaner than either.

---

## 4. Service management as operational practice

**Unit files written properly.** A service unit that meets the operational bar:

```ini
[Unit]
Description=Report API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=report-api
ExecStart=/opt/report-api/bin/serve --config /etc/report-api.toml
Restart=on-failure
RestartSec=5
MemoryMax=2G
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/report-api

[Install]
WantedBy=multi-user.target
```

The parts that earn their lines: a dedicated user (never root without a reason you can defend), `Restart=on-failure` with a `RestartSec` backoff (immortal crash-loops help nobody — `StartLimitBurst`/`StartLimitIntervalSec` cap them), resource limits via cgroups (`MemoryMax`, `CPUQuota` — at orientation: systemd fronts cgroup v2, and these directives are how an admin uses cgroups without touching them directly), and the sandboxing lines (`ProtectSystem`, `NoNewPrivileges`, `PrivateTmp`) which cost one line each and remove whole vulnerability classes — `systemd-analyze security <unit>` scores what's left exposed.

**Drop-ins over edits.** Never edit vendor files in `/usr/lib/systemd/system/` — updates overwrite them. `systemctl edit nginx` creates `/etc/systemd/system/nginx.service.d/override.conf` holding only your delta; `systemctl edit --full` for a whole-file override; `systemctl cat` always shows the assembled truth; `systemctl revert` undoes it. `daemon-reload` after any on-disk change.

The debugging loop: `systemctl status` (state + last log lines) → `journalctl -u name -b` (the story) → `systemd-analyze verify unit` (syntax) → `systemctl show name -p Property` (effective config).

---

## 5. Scheduled work: cron and timers

Cron and systemd timers are a pair, not a fight; know both, prefer timers for anything that matters.

**Cron:** `crontab -e` (per-user), `/etc/cron.d/` (system, with a user field). The perennials: cron's environment is nearly empty (set `PATH` in the crontab or use absolute paths — "works in my shell, fails in cron" is almost always PATH or a missing variable), output is mailed or lost (redirect it), and `%` is special in crontab lines.

**Timer advantages, stated:** logs land in the journal under the service's name (`journalctl -u backup.service`); `Persistent=true` runs a missed job at next boot (cron silently skips — anacron was the workaround); `RandomizedDelaySec` de-thunders fleets; the job is a real service with dependencies (`After=network-online.target`), resource limits, and sandboxing; `systemctl list-timers` shows the schedule *and* last/next run in one view; and you can trigger the service manually to test, which cron never made easy. scripting-automation.md carries the worked pair.

---

## 6. Backup engineering

**Strategy before tools.** The questions that precede any tool choice: what is the RPO (how much data can you lose) and RTO (how long can restore take)? What are you protecting against — disk death, ransomware, the fat-fingered `rm`, the datacenter fire? Each threat invalidates different backup designs: RAID survives none of the last three; an attached USB disk survives neither ransomware nor fire.

**The 3-2-1 shape:** three copies, two media types, one off-site — and in the ransomware era, the off-site copy should be *offline or immutable* (object-lock, pull-based backups the production host cannot reach and delete).

**Restore-testing is the actual backup.** An untested backup is a hope with a cron job. Schedule restores: quarterly file-level restore drills at minimum, and a timed full-system restore before you need the number under pressure. The restore test is also the only honest check that you're backing up the *right things* — data, configs (`/etc`), and the recipe to rebuild the rest.

**Tool categories** (representative names — verify current status before recommending):

- *rsync discipline:* `rsync -aHAX --delete` to a target, ideally with `--link-dest` rotation for cheap history. Simple, inspectable, universal; no dedup, no encryption of its own.
- *Deduplicating archivers:* Borg, restic — encrypted, deduplicated, append-capable repositories; the sane default for server file backups.
- *Snapshot-based:* LVM snapshot → back up the frozen view (consistency for databases via their own dump/hot-backup tools first); ZFS/Btrfs `send/receive` for replication that is both fast and verifiable.
- *Image/bare-metal:* dd-class images, Clonezilla, or rebuild-from-config-management — which reframes bare-metal backup as "data + /etc + the automation," usually the better answer.

Databases get their own consistency story (dumps, WAL archiving, hot-backup tools) — a filesystem copy of a running database is a corruption lottery.

---

## 7. Logging administration

**Journal persistence and limits.** Make the journal survive reboots and cap it:

```
$ sudo mkdir -p /var/log/journal && sudo systemd-tmpfiles --create --prefix /var/log/journal
# /etc/systemd/journald.conf.d/size.conf
[Journal]
Storage=persistent
SystemMaxUse=2G
$ sudo systemctl restart systemd-journald && journalctl --disk-usage
```

**rsyslog and forwarding — the SIEM pipeline.** Local logs on a compromised host are the attacker's to edit; centralized logs are the record that survives, which is why forwarding is both an ops convenience and a security control. journald forwards to rsyslog on most distros (or `systemd-journal-remote`/`-upload` for journal-native transport). rsyslog forwarding, done right, is TCP with TLS and queueing — UDP 514 drops silently under load:

```
# /etc/rsyslog.d/60-forward.conf — @@ = TCP; single @ = UDP
*.* action(type="omfwd" target="siem.example.net" port="6514" protocol="tcp"
           StreamDriver="gtls" StreamDriverMode="1"
           queue.type="LinkedList" queue.filename="fwd" action.resumeRetryCount="-1")
```

Downstream of this pipe is SOC territory — parsing, correlation, detection — which composes upward (see SKILL.md). The admin's obligations end at: complete sources (auth, sudo, auditd, application logs), reliable transport, accurate time (`chronyd`/NTP — unsynced clocks make correlation fiction), and local rotation (`logrotate` for the non-journal files that still land in `/var/log`).

---

## 8. Hosting layers: VMs and containers

**KVM/libvirt at working depth.** KVM is the kernel's hypervisor; QEMU the device model; libvirt the management layer. `virsh` is the daily interface:

```
$ virsh list --all
 Id   Name        State
 3    lab-web01   running
 -    lab-db01    shut off
$ virsh start lab-db01 && virsh console lab-db01
```

Working vocabulary: domain XML (`virsh dumpxml`/`edit`), storage pools and volumes, virtio drivers (paravirtual disk/net — the difference between decent and terrible guest I/O), snapshots (`virsh snapshot-create-as` — external snapshots for running guests, and the same discipline as LVM: short-lived, not archives), and bridged vs NAT networking (networking-stack.md owns the bridge mechanics).

**Containers as an admin concern.** A container is namespaces (isolation of view: PID, mount, net, user) plus cgroups (resource limits) plus an image — not a VM; the kernel is shared, which is both the efficiency and the security boundary to respect. The admin's slice: runtimes (Docker, Podman — Podman's daemonless, rootless model and systemd integration [`podman generate systemd` / Quadlet units] make it the better fit where systemd is already the supervisor), image hygiene (pinned tags or digests, minimal bases, a registry you trust — the repository-trust argument again in new clothes), volumes vs bind mounts for state, and journal-visible logging. Orchestration (Kubernetes) is deferred to orientation: know that it exists to schedule containers across a fleet, and that it is its own discipline with its own library territory.

---

## 9. Configuration management as a category

The idea that matters is **idempotence**: describe the desired state; the tool converges the machine to it; running twice changes nothing the second time. This is the line between "a script that installs things" (imperative, breaks on rerun) and configuration management (declarative, safe to enforce on a schedule — which also makes it drift detection).

Representative tools (category members, not endorsements — verify current standing): Ansible (agentless, SSH-borne, YAML; the common on-ramp), Puppet/Chef (agent-based, server-centric), Salt (both modes). Terraform-class tools are *provisioning* (creating the machines), a sibling category.

**When a fleet earns it:** the honest threshold is not a host count but a sentence — when you can no longer state with confidence that any two "identical" servers are identical, or when rebuilding a host from documentation would take a day of archaeology. Two hand-run hosts are fine; the tenth snowflake is not. The migration path from the SSH loop that precedes it is drawn in scripting-automation.md.
