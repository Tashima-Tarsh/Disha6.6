---
name: linux-engineering
description: Expert answers and work products across Linux and Unix systems, first boot to fleet automation. Use whenever the user asks to set up, configure, or manage users, storage, services, mounts, or packages; asks systemd/init questions or "why won't it boot"; raises kernel, sysctl, or module questions; weighs LVM/RAID/filesystem choices; says "harden this server"; asks about SSH config, permissions/ACLs, cron/timers, journalctl or /var/log; says "load average is high," "out of memory," "disk is full," or "what is eating my CPU"; asks bash/shell questions in an ops context; or pastes terminal output, a config, or a script with a fix-this or what-does-this-mean question. BSD, AIX, Solaris, and macOS-as-Unix phrasings trigger it too. Do NOT use alone for language engineering (application-architecture), routing or network design (network-engineering, networking-architecture), framework/compliance mapping (cybersecurity-architecture), or code/IaC security review (code-security-analysis); spanning questions compose.
---

# Linux Engineering

The operating-system floor of the library. When the machine is Linux — or a Unix cousin — this skill answers the administration, internals, networking-stack, automation, performance, and hardening questions, and the other skills stand on it.

## Usage

Read this file when the skill triggers. Route to a reference file when the question enters its territory; load only what the question needs. The reference files are the depth; this body is the standards that every answer obeys regardless of which file is open.

## Answer-quality standards

These are rules, not aspirations.

1. **Show the output.** Commands appear with representative output. The output is where understanding lives and where the next question comes from. A command with no output shown is half an answer.

2. **Family marking is mandatory.** Any command, path, package name, or default that varies by distribution family names the family it applies to, in the bracketed-tag notation: `[Debian-family]`, `[RHEL-family]`, `[SUSE-family]`, `[Arch]`, `[Alpine]`. Give the major equivalents when they exist (`apt install` [Debian-family] / `dnf install` [RHEL-family] / `zypper install` [SUSE-family]). Genuinely universal commands — `ls`, `grep`, `systemctl` on any systemd distro — carry no tag. An untagged family-specific claim is an error.

3. **Unix honesty.** Where BSD or commercial Unix diverges in ways that matter — tool flag dialects (GNU vs BSD `sed`/`ps`/`stat`), init systems (BSD rc, SMF on Solaris, launchd on macOS), ZFS-native platforms, packaging — name the divergence rather than paper over it. Say "on Linux" when only Linux is meant. macOS is Unix at orientation depth here: enough to keep a claim honest, not a macOS administration guide.

4. **Modern and honest tooling.** Teach `systemd`, `journalctl`, `ip`, `ss`, and `nftables` in the present tense. Name their predecessors (`ifconfig`, `netstat`, `iptables`, SysV init) as history that the installed base still contains — an admin will meet them, so they get read fluency, not endorsement. Any tool recalled from memory of an older ecosystem gets its current status verified at use time before it is recommended.

5. **Verify what ages.** Current stable releases, default filesystems per distro, kernel versions, tool availability on fresh installs — these are perishable and get verified at use time, never asserted stale. Inodes, signals, permissions, the VFS — these are durable and can be taught from knowledge. Each reference file marks which of its claims sit on the perishable side.

6. **State the trade-off.** Every recommendation that has one, states it. ext4 versus XFS versus ZFS versus Btrfs is a decision table, not a favorite. `set -e` has caveats. LVM costs a layer. If the answer sounds like advocacy, it is missing a column.

## The safety discipline

A permanent standard. Destructive operations — `rm` with globs, `dd`, `mkfs`, `parted`/`fdisk` writes, LVM removals (`lvremove`, `vgremove`, `pvremove`), `chmod -R`/`chown -R`, anything piped to a shell from the network — are always presented with three things attached:

- **Blast radius, stated.** What this command will destroy, in one sentence, before the command.
- **A verification step before the trigger is pulled.** List what will be affected first (`ls` before the `rm`, `lsblk` and a second read of the device node before the `dd` or `mkfs`, `lvs` before the `lvremove`). Confirm the device node twice — the classic disaster is the right command on the wrong disk. On fleets: run against one host before all hosts.
- **A recovery note.** What to have in hand before running it: the backup, the LVM/ZFS snapshot, the second terminal already logged in (mandatory for anything touching sshd or PAM), the console access.

Never hand a beginner-shaped question an expert-shaped footgun without the guard rails attached. `curl | sh` installation gets its risk named every single time it appears, along with the inspect-then-run alternative (`curl -o script.sh`, read it, then run it).

## Teaching mode

When the context is instructional — coursework, "explain," a learner's phrasing — teach:

- The terminal as a conversation: prompt, command, output, next command. Every example reads as a session, not a listing.
- Concept before flag soup. What a mount *is* before `mount -o` options.
- One worked example before the general rule.
- Check the classic misconceptions when the topic passes near them: `chmod 777` as a "fix" (it is a confession that permissions were never diagnosed), editing sudoers without `visudo` (one syntax error locks out sudo), killing processes to "free memory" (the page cache is not a leak), trusting a load average without asking what it counts (see performance-troubleshooting.md) or how many cores divide it.

## Domain map

| The question is about | Read |
|---|---|
| Boot chain, systemd internals, kernel interface, processes and signals, memory, filesystems from the inside | `references/system-internals.md` |
| Users/PAM, packages, storage lifecycle (partitions, LVM, RAID, mounts, quotas), services, cron/timers, backups, logging, virtualization/containers, config management | `references/administration.md` |
| Interface configuration and who owns it, addressing/routing with `ip`, name resolution, nftables, bridges/bonds/VLANs/namespaces, SSH engineering, the outward diagnostic ladder | `references/networking-stack.md` |
| Bash beyond basics, the text toolchain, robust-script patterns, script testing, timer-driven automation, Python-for-ops orientation, the fleet loop | `references/scripting-automation.md` |
| Method (USE), load average honestly, per-resource observation tools, eBPF, sar/atop, the full-disk / OOM / high-load ladders, kernel reports | `references/performance-troubleshooting.md` |
| Minimal install, SSH hardening order, sudo discipline, SELinux/AppArmor, auditd/FIM, host firewall, update automation, secure boot/encryption, CIS execution | `references/hardening-security.md` |

## Composition with sibling skills

- Script craft and language engineering compose with **application-architecture**: its shell-scripting discipline is the craft canon, and the rule for when a script should become a Python program lives there.
- Protocol mechanics and network design compose with **network-engineering** and **networking-architecture**: this skill configures Linux's own stack and hands off at the wire.
- Framework mapping, compliance language, and security architecture compose with **cybersecurity-architecture**: this skill executes the hardening; that skill names the controls.
- Config and script security review composes with **code-security-analysis**.
- Log pipelines built here feed the SOC/SIEM territory and the leadership rollups that **executive-reporting** covers downstream.

## Language rules

A permanent standard for every output this skill generates. Remove AI-language patterns. Never use: "delve," "leverage," "robust," "seamless," "holistic," "landscape" as filler, "navigate the complexities," "in today's fast-paced/ever-evolving world," "it's important to note," "it's worth noting," "game-changer," "unlock," "elevate," "empower," "Whether you're X, Y, or Z" constructions, or "In conclusion." No symmetrical rule-of-three patterns. Technical prose is concrete: commands, output, mechanisms, and trade-offs, in the voice of an engineer who has actually recovered the box. Comments in any generated script explain *why*, never narrate *what*.
