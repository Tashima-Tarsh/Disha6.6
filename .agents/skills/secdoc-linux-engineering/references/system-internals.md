# System Internals — What Is Actually Happening

Durable territory, mostly. The boot chain, signals, inodes, and virtual memory change on decade timescales. The perishable edges are marked: default filesystem per distro, systemd feature availability by version, cgroup details.

## Contents

1. The boot chain and where it fails
2. systemd at depth
3. The kernel interface
4. Processes and signals, precisely
5. Memory
6. Filesystems from the inside

---

## 1. The boot chain and where it fails

Four stages. Each one announces its failures in a different place, which is why "it won't boot" is not a symptom — *where it stopped* is the symptom.

**Firmware → bootloader → kernel → init.**

**Firmware (UEFI, or BIOS on old iron).** Initializes hardware, finds a boot target. UEFI reads the EFI System Partition (ESP, FAT-formatted, mounted at `/boot/efi`) and launches an entry from NVRAM (`efibootmgr -v` to list). Failure signature: no bootloader appears at all — vendor logo to black screen, or "no bootable device." The problem is boot order, a dead ESP, or a wiped NVRAM entry. Fix territory: `efibootmgr`, reinstalling the bootloader from live media.

```
# efibootmgr -v
BootCurrent: 0001
BootOrder: 0001,0000
Boot0001* debian  HD(1,GPT,6c2f...)/File(\EFI\debian\shimx64.efi)
```

**Bootloader (GRUB2 almost everywhere on Linux; systemd-boot on some UEFI setups).** Loads the kernel and initramfs, passes the kernel command line. Failure signature: `grub>` or `grub rescue>` prompt, or a menu that hangs. The problem is a missing config, a moved `/boot`, or a filesystem GRUB can't read. Config is generated, not edited: edit `/etc/default/grub`, then `update-grub` [Debian-family] / `grub2-mkconfig -o /boot/grub2/grub.cfg` [RHEL-family].

**Kernel + initramfs.** The kernel decompresses, mounts the initramfs (a minimal userspace with the drivers needed to find the real root), then pivots to the real root filesystem. Failure signature: kernel messages scroll and stop, or a kernel panic — the classic is `VFS: Unable to mount root fs on unknown-block(0,0)`, which means the initramfs lacks the driver for your disk controller or the `root=` parameter points at nothing. Rebuild territory: `update-initramfs -u` [Debian-family] / `dracut -f` [RHEL-family]. A dropped `(initramfs)` prompt means the initramfs got that far and is telling you what it couldn't find — read it, don't reboot past it.

**Init (systemd, PID 1).** Mounts the rest of the filesystems, starts services, reaches a target. Failure signature: boot proceeds and then hangs on "A start job is running for..." or drops to emergency mode. This is fstab territory (a mount that no longer exists — see administration.md) or a failed critical unit. Emergency mode gives you a root shell and a journal: `journalctl -xb` is the first command every time.

Kernel command-line keys worth knowing for recovery, appended at the GRUB edit screen (`e`): `systemd.unit=rescue.target` (root shell, minimal services), `systemd.unit=emergency.target` (more minimal still), `init=/bin/bash` (bypass init entirely — for lost root passwords; remount rw with `mount -o remount,rw /` before touching anything).

**Unix honesty:** BSD boots through its own loader into `init` and the `rc` script system — no systemd, no initramfs in the Linux sense. Solaris boots into SMF. The four-stage shape holds; the components differ.

---

## 2. systemd at depth

systemd is PID 1, a dependency-resolving job scheduler, and a logging system. Teach it as what it is, not as a controversy.

**Units.** Everything systemd manages is a unit: `.service`, `.socket`, `.timer`, `.mount`, `.target`, `.path`, and more. Files live in three places with a precedence order that answers "why is my edit ignored":

- `/usr/lib/systemd/system/` — vendor-shipped, package-owned, do not edit
- `/etc/systemd/system/` — admin-owned, wins over vendor
- `/run/systemd/system/` — runtime, generated

```
$ systemctl cat nginx.service        # shows the file AND any drop-ins, with paths
$ systemctl status nginx.service
● nginx.service - A high performance web server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Thu 2026-08-13 06:12:01 CDT; 3h ago
```

`enabled` and `active` are independent facts: enabled = starts at boot (a symlink in a `.wants/` directory), active = running now. `systemctl enable --now` does both.

**Targets** are synchronization points, the successors of runlevels: `multi-user.target` (the old runlevel 3), `graphical.target` (5), `rescue.target` (1). `systemctl get-default` / `set-default` control the boot target.

**Dependencies and ordering are separate axes** — the misconception that produces mysterious races. `Wants=`/`Requires=` say *whether* B starts when A does (Wants: B failing doesn't stop A; Requires: it does). `After=`/`Before=` say *in what order*. `Requires=` without `After=` starts both simultaneously — you almost always want the pair. `WantedBy=multi-user.target` in `[Install]` is what `systemctl enable` acts on.

**The journal.** Binary, indexed, structured logging for everything systemd starts, including stdout/stderr of services — the reason daemons no longer need to manage their own log files.

```
$ journalctl -u nginx -b            # this unit, this boot
$ journalctl -p err -b              # errors and worse, this boot
$ journalctl -f                     # follow
$ journalctl --since "1 hour ago"
$ journalctl -b -1                  # previous boot — only if persistence is on
```

Persistence: many distros default the journal to `/run` (volatile, gone at reboot). `mkdir /var/lib/systemd/journal` — actually `/var/log/journal` — flips it to persistent. See administration.md for the persistence and size-limit configuration; the point here is that "no logs from before the crash" usually means nobody made the journal persistent.

**Generators**, at orientation: small programs run early that translate other configuration into units — the fstab generator is why every fstab line becomes a `.mount` unit, and why fstab errors surface as systemd failures.

**Honest note on init diversity:** systemd is the Linux default nearly everywhere that matters, but not the world. Alpine runs OpenRC [Alpine]. BSD runs its `rc` system. Older enterprise Unix carries SysV ghosts — `/etc/init.d/` scripts, `chkconfig`, `service` — and AIX and Solaris have their own (SRC, SMF). Read fluency in `service nginx restart` and `/etc/init.d/` is still required; writing new SysV scripts is not.

---

## 3. The kernel interface

The kernel is configurable and observable at runtime through three surfaces.

**Modules.** Drivers and features loaded on demand.

```
$ lsmod | head -3
Module                  Size  Used by
kvm_intel             487424  0
kvm                  1404928  1 kvm_intel
$ modinfo kvm_intel | grep -E '^(filename|description)'
$ sudo modprobe -r kvm_intel      # unload (refuses if in use)
```

Persistent loading: a file in `/etc/modules-load.d/`. Persistent blacklisting: `blacklist <name>` in `/etc/modprobe.d/` — note that blacklisting stops auto-load by alias, not explicit loads; `install <name> /bin/false` is the hard block (hardening-security.md uses this for unused filesystems and protocols).

**sysctl.** Runtime kernel tunables, backed by `/proc/sys/`.

```
$ sysctl vm.swappiness
vm.swappiness = 60
$ sudo sysctl -w vm.swappiness=10          # until reboot
```

Persistent: a file in `/etc/sysctl.d/` (e.g. `99-local.conf`), applied with `sysctl --system`. The tunable name maps to the path: `vm.swappiness` ↔ `/proc/sys/vm/swappiness`.

**/proc and /sys — the machine's own documentation.** `/proc` is per-process state (`/proc/<pid>/status`, `/proc/<pid>/fd/`, `/proc/<pid>/environ`) plus system state (`/proc/meminfo`, `/proc/cpuinfo`, `/proc/loadavg`). `/sys` is the device and driver model (`/sys/block/sda/queue/scheduler`, `/sys/class/net/`). When a tool's output is ambiguous, the file it read is not — `cat` the source. These are not files on disk; they are kernel data structures wearing filenames.

---

## 4. Processes and signals, precisely

**fork/exec.** Every process except PID 1 is created by `fork()` — a duplicate of the parent — usually followed by `exec()`, which replaces the duplicate's program image. This two-step is why a child inherits environment, open file descriptors, and working directory: it *was* the parent for a moment. It is also why `cd` must be a shell builtin — an external `cd` would change its own (child's) directory and exit.

**Sessions and process groups.** Every process belongs to a process group (job control's unit — `Ctrl-C` signals the whole foreground group), and groups belong to a session, usually anchored to a terminal. This is why a daemon detaches from its session, and why `nohup`/`setsid`/systemd exist: a process still in your terminal's session dies with the terminal (SIGHUP).

**Signals.** Asynchronous notifications. The ones that matter operationally:

| Signal | Number | Default | Catchable? | Meaning |
|---|---|---|---|---|
| SIGTERM | 15 | terminate | yes | polite shutdown request — send this first |
| SIGKILL | 9 | kill | **no** | kernel removes the process; no cleanup runs |
| SIGHUP | 1 | terminate | yes | terminal gone; daemons repurpose it as "reload config" |
| SIGINT | 2 | terminate | yes | Ctrl-C |
| SIGSTOP/SIGCONT | 19/18 | stop/continue | no/– | pause and resume |

**What SIGKILL cannot do:** it cannot kill a process in uninterruptible sleep (state `D` in `ps` — usually stuck on I/O, often NFS or a dying disk). The kernel will not deliver any signal until the I/O completes or fails. A `D`-state process that never returns is a kernel or storage problem, not a `kill -9` problem, and it still counts toward load average (see performance-troubleshooting.md).

**Zombies, without folklore.** A zombie (`Z` state, `<defunct>`) is a process that has already exited; only its exit-status entry remains in the process table, waiting for the parent to call `wait()`. It consumes no CPU, no memory beyond the table slot. You cannot kill it — it is already dead. The fix is the *parent*: a parent that never reaps is the bug. Kill or fix the parent and PID 1 inherits and reaps the zombies. A handful of zombies is cosmetic; thousands is a broken parent exhausting the PID space.

The teaching misconception to check here: killing processes to "free memory" — covered in the memory section, because the memory people want back is usually cache.

---

## 5. Memory

**Virtual memory in working terms.** Every process sees a private address space; the kernel maps pages of it to physical RAM, to swap, or to nothing yet (allocated but untouched). Linux overcommits by default — it promises more memory than exists, betting processes won't touch it all. Usually right; when wrong, the OOM killer settles the debt.

**The page cache, and why "free" memory isn't.** The kernel spends otherwise-idle RAM caching file contents. This is the correct behavior and the single most misread number in Linux:

```
$ free -h
               total        used        free      shared  buff/cache   available
Mem:            31Gi        4.2Gi       1.1Gi       310Mi        26Gi        26Gi
```

`free` is RAM doing nothing. `buff/cache` is RAM doing useful work that will be handed back the instant a process needs it. **`available` is the number that answers "how much memory do I have"** — the kernel's estimate of what can be allocated without swapping. A box showing 1.1Gi free and 26Gi available is healthy, not full. Dropping caches (`echo 3 > /proc/sys/vm/drop_caches`) is a benchmarking tool, not a fix — the cache was the performance.

**The OOM killer's logic.** When a real allocation cannot be satisfied, the kernel kills the process with the highest `oom_score` — roughly, the biggest memory consumer, adjusted by `oom_score_adj` (-1000 exempts; systemd sets this for critical services, and you can via `OOMScoreAdjust=` in a unit). It logs its reasoning to the kernel ring buffer and the journal. The post-mortem lives there:

```
$ journalctl -k -b | grep -i -A2 'out of memory'
kernel: Out of memory: Killed process 4172 (java) total-vm:18234400kB, anon-rss:15013228kB ...
```

If a process vanished without a trace, check this before blaming the process. Swap's real modern role is not "extra RAM" — it is giving the kernel somewhere to put genuinely idle anonymous pages so the page cache can hold the hot data.

---

## 6. Filesystems from the inside

**VFS.** The virtual filesystem layer is why `open()`, `read()`, and `ls` work identically on ext4, XFS, NFS, and `/proc`: every filesystem implements the same interface underneath. Mounting grafts one filesystem's tree onto a directory of another.

**Inodes, and why filenames are not files.** A file *is* an inode: a numbered structure holding the metadata (owner, mode, timestamps, size) and the pointers to data blocks — everything except the name. Names live in directories, which are just tables mapping names to inode numbers. Consequences that stop being mysterious once this lands:

- A hard link is a second name for the same inode (`ln`); the file exists until the link count hits zero *and* no process holds it open.
- Deleting an open file frees the name, not the space — the classic full-disk-that-`du`-can't-find, resolved in performance-troubleshooting.md.
- `mv` within a filesystem renames (instant, atomic); across filesystems it copies and deletes.
- A filesystem can be out of inodes while out of space it is not: `df -i`.

```
$ ls -li notes.txt
1835023 -rw-r--r-- 2 doc doc 4096 Aug 13 09:11 notes.txt
        ^ inode      ^ link count: this inode has two names somewhere
```

**Journaling.** ext4 and XFS journal *metadata* by default: operations are written to a log before being applied, so a crash mid-operation replays or discards cleanly instead of leaving the structure inconsistent. This protects the filesystem, not your data's contents — an application that needs its writes durable still calls `fsync()`. ZFS and Btrfs take the copy-on-write route instead: never overwrite live data, so consistency is structural, and snapshots and checksums fall out nearly free.

**The decision table.** Defaults per distro are perishable — verify at use time — but the trade-offs are durable:

| | ext4 | XFS | ZFS | Btrfs |
|---|---|---|---|---|
| Genuine strength | Boring reliability; decades of tooling; `fsck` that works; shrinkable | Large files, parallel I/O, huge filesystems; RHEL-family default | End-to-end checksums, snapshots, send/receive, built-in RAID, ARC cache — a storage platform, not just a filesystem | ZFS-like features in-tree; snapshots; transparent compression; openSUSE default with snapper |
| Cost / honest weakness | Fewest features; no checksumming of data | Cannot shrink; sparse on snapshots (pair with LVM) | RAM-hungry; admin model is its own discipline | RAID 5/6 modes have a damaged history — verify current status before trusting parity RAID; performance varies by workload |
| Reach for it when | You have no exotic requirement — the strongest default | Big data volumes, RHEL-family, media/DB files | Data integrity is the requirement; storage server; you will use snapshots and replication | You want CoW features with in-tree convenience and accept the sharper edges |

**The ZFS licensing-and-platform note:** ZFS is CDDL-licensed, which keeps it out of the mainline Linux kernel; it ships as an out-of-tree module (OpenZFS), with Ubuntu carrying it most natively [Ubuntu]. On FreeBSD and illumos/Solaris, ZFS is *the* native filesystem, first-class and default — a genuine reason those platforms hold storage roles. Kernel-upgrade coupling on Linux (module must match kernel) is the operational cost to state.
