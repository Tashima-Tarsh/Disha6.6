# Performance & Troubleshooting — The Discipline of Finding Out

Method is durable; the tool inventory has a perishable edge (eBPF tool availability is kernel- and distro-dependent — always verify on the target). The ladders at the end are the field guides; the sections before them are why the ladders work.

## Contents

1. Method before tools
2. Load average, told honestly
3. The observation toolkit, by resource
4. The eBPF era, at orientation
5. sar and atop — the after-the-fact question
6. The diagnostic ladders: full disk, out of memory, high load
7. Reading the kernel's own reports

---

## 1. Method before tools

**USE — utilization, saturation, errors — as the walk.** For each resource (CPU, memory, disk I/O, network, and don't forget file descriptors and swap), ask three questions in order: how busy is it (utilization), is work queuing behind it (saturation — the earlier and better signal), and is it throwing errors? Walking every resource through three questions beats opening ten tools hoping one looks alarming — it converts "the server is slow" into a bounded checklist, and it finds the resource *nobody suspected* because the complaint pointed elsewhere.

**Hypothesis-driven debugging.** Observation → hypothesis → the single measurement that would falsify it → repeat. The alternative — changing settings until the symptom moves — destroys the evidence and teaches nothing. Corollary: **change one thing at a time**, and write down what you changed; the 3 a.m. fix you can't reconstruct is tomorrow's mystery regression.

**Reproduce before fixing.** A problem you can trigger on demand is a problem you can verify fixed; a problem that "went away" is a problem scheduled to return during the demo. When reproduction is impossible (it was 4 a.m., it lasted 90 seconds), the game becomes history — section 5 — and post-mortem artifacts: the journal, the OOM report, PSI.

---

## 2. Load average, told honestly

```
$ uptime
 10:02:11 up 41 days,  3:17,  2 users,  load average: 8.12, 7.90, 6.44
```

Three exponentially-damped averages (1, 5, 15 min) of the count of runnable **plus — on Linux specifically — uninterruptible (`D`-state) tasks**, which are almost always waiting on I/O. That inclusion is the honesty most explanations skip, and it changes the diagnosis: **a high Linux load average is not necessarily CPU demand.** A box at load 8 can have idle CPUs and a dying disk — eight processes stuck in `D` on storage that isn't answering. (BSD and classic Unix count only runnable tasks; the same number means a different thing there.)

And 4.0 means nothing without core count: load 4 on 4 cores is full; on 32 cores it's a Tuesday. Divide by `nproc` before reacting, then look at the *trend* across the three numbers (1-min above 15-min: building; below: draining).

The disambiguation move, always the same: **load says "how many are waiting"; the next question is "waiting for what?"** — `vmstat`'s `r` (run queue — CPU) vs `b` (blocked — I/O) columns, or `ps -eo state,pid,comm | grep '^D'` to name the D-state processes directly. The high-load ladder in section 6 operationalizes this.

---

## 3. The observation toolkit, by resource

**CPU.** `top`/`htop` for the live view — and read the header, not just the process list: `%Cpu` line's `us` (user work), `sy` (kernel — high `sy` means syscall-heavy or a driver problem), `wa` (I/O wait — CPU idle *because* of disk), `st` (steal — your VM's host is oversubscribed; the fix is not on this machine). Per-process over time: `pidstat 1` (which process, sampled honestly rather than top's instantaneous flicker). When "what is eating my CPU" needs to become "which *function*": `perf top` at orientation — live kernel+user profiling; `perf record -g` / `perf report` for the offline flame-graph-shaped answer.

**Memory.** `free -h` read correctly — `available` is the answer, `buff/cache` is working RAM, not waste (system-internals.md carries the full argument; check that misconception every time it surfaces). `vmstat 1` for the motion picture: `si`/`so` (swap in/out — sustained nonzero `so` is real memory pressure, unlike mere swap *usage*, which can be old idle pages), plus the `r`/`b` columns doing double duty for the load question. The OOM post-mortem lives in the journal:

```
$ journalctl -k -b | grep -iE 'out of memory|oom-killer'
```

— and per-process, `/proc/<pid>/status` (`VmRSS`, actual resident size) outranks top's SHR/VIRT confusion.

**Disk.** `iostat -xz 1` is the workhorse — `%util` (utilization; near 100 sustained = saturated device, though NVMe parallelism blurs it), `await` (average I/O latency including queue time — *the* user-experience number; single-digit ms on SSD, spiking to hundreds = queuing or a sick device), `aqu-sz` (the queue itself). `iotop` names which process is doing it [package: iotop or iotop-c; verify installed].

**df versus du, and the deleted-but-open classic.** `df` asks the filesystem how much is allocated; `du` sums the *named* files. When `df` says full and `du` can't find it, the space belongs to deleted-but-open files — a process holds an inode whose last name was removed (system-internals.md: names are not files), classically a log that got `rm`'d instead of truncated while the daemon kept writing:

```
$ sudo lsof +L1 | head -3
COMMAND  PID USER  FD  TYPE DEVICE  SIZE/OFF NLINK    NODE NAME
java    3001 app   4w  REG  253,0 9663676416     0  393232 /var/log/app/out.log (deleted)
```

Recovery without a restart: truncate through procfs — `: > /proc/3001/fd/4`. The lesson attached: rotate by truncation (`copytruncate`) or signal the daemon; never bare-`rm` an active log.

**Network.** `ss` for socket state — `ss -s` (summary), `ss -tn state established` (who's connected), `Recv-Q` piling up on a listener = the application isn't accepting fast enough. The stack's own counters: `nstat` (or `/proc/net/snmp` and `netstat -s` history) — retransmits, listen-queue overflows (`TcpExtListenDrops` climbing = backlog too small or app too slow) — the numbers that turn "the network feels slow" into a named mechanism. `tcpdump` at working depth for ground truth, and the interface counters (`ip -s link` — errors/drops) for the layer-1-adjacent question. The outward ladder is networking-stack.md's; this file owns the host-side counters.

---

## 4. The eBPF era, at orientation

Where deep observation went: eBPF runs sandboxed programs inside the kernel, which means questions the classic tools sample or miss can be answered exactly and cheaply — per-event, in production. The entry points:

- **bcc tools** — a shipped collection of ready-made observers [package: bpfcc-tools, Debian-family / bcc-tools, RHEL-family]: `execsnoop` (every process exec — what is *actually* running?), `opensnoop` (every file open), `biolatency` (disk latency as a histogram, not an average — averages hide the bimodal truth), `tcplife` (connection lifetimes and volumes).
- **bpftrace** — the one-liner language over the same machinery: `bpftrace -e 'tracepoint:syscalls:sys_enter_openat { @[comm] = count(); }'` — who is opening files, counted, live.

**The version-and-kernel-dependency flag, every time:** capability tracks kernel version, tools track distro packaging, and enterprise kernels backport unevenly — verify `bpftrace --version` and that a given tool exists on the target before building a diagnosis plan around it. Old-stable boxes may top out at `perf` and the classics; that's a fact to state, not to paper over.

---

## 5. sar and atop — the after-the-fact question

"What was the box doing at 03:40?" is unanswerable by live tools. Two recorders answer it:

- **sar** (sysstat) — the classic: cron-driven sampling into `/var/log/sysstat/` [Debian-family — enable in `/etc/default/sysstat`] / `/var/log/sa/` [RHEL-family]. `sar -q -s 03:30 -e 04:00` (load), `-r` (memory), `-d` (disk), `-n DEV` (net); `-f safile` for prior days. System-wide only — it tells you *the disk* was saturated at 03:40, not by whom.
- **atop** — the per-process recorder: its daemon logs process-level history, so `atop -r /var/log/atop/atop_20260813 -b 03:30` replays *which process* held the disk. Heavier; the complement, not the replacement.

Not installed by default on most distros — which means the time to install a recorder is before the incident. A box that matters runs one; PSI (section 7) covers part of the gap where neither is present.

---

## 6. The diagnostic ladders

Written as ladders: run the rung, read the output, the output picks the next rung.

**Full disk.**
1. `df -h` — which filesystem, how full. (100% on `/` with services failing to write: also check small dedicated mounts like `/var/log`.)
2. `df -i` — inodes. Space free but inodes exhausted (mail spools, session files, node_modules farms) fails with the same ENOSPC; the fix is deleting *files*, not big files.
3. `du -xh --max-depth=1 / | sort -h` — walk down the tree by size (`-x`: stay on this filesystem — don't count the other mounts).
4. `du` total ≪ `df` used → deleted-but-open: `lsof +L1`, truncate via `/proc/<pid>/fd/N` (section 3).
5. The usual suspects by name: the journal (`journalctl --disk-usage`, cap it — administration.md), unrotated logs, package caches (`apt clean` [Debian-family] / `dnf clean all` [RHEL-family]), old kernels, core dumps (`coredumpctl`), forgotten LVM snapshots eating their reserve (`lvs` — snapshot allocation climbing toward 100%).
6. *Before deleting anything wholesale:* the safety discipline applies — list what a glob matches before `rm` runs it, and prefer truncation for live logs.

**Out of memory.**
1. Something died? `journalctl -k -b | grep -i oom` — the killer logs its victim, the scores, and the memory map. That report is the post-mortem; read it before theorizing.
2. Live pressure or false alarm? `free -h` — read `available`, not `free`. Then `vmstat 1` — sustained `so` (swap-out) is genuine pressure; mere swap usage is not.
3. Who holds it? `ps -eo rss,pid,user,comm --sort=-rss | head`; growth over time (`pidstat -r 60` or two samples an hour apart) separates a leak from a big-but-stable footprint.
4. Kernel side? `slabtop` — a huge slab (dentry explosions, conntrack tables) is memory no process owns.
5. Decide like an engineer: leak → fix or schedule the restart *and* file the bug; legitimately sized workload → more RAM or fewer tenants; wrong victim chosen → `OOMScoreAdjust=` protects the service that matters, `MemoryMax=` fences the one that doesn't (administration.md's unit patterns). Adding swap treats the symptom and buys latency — say so when recommending it.

**High load.**
1. `uptime`; divide by `nproc`; check the trend (section 2). Under ~1×cores and complaint-free: done — load was the wrong metric.
2. CPU or I/O? `vmstat 1` — `r` ≫ cores with low `wa` = CPU-bound; `b` > 0 with high `wa` = I/O-bound. This one read splits the tree.
3. **CPU branch:** `pidstat 1` or `top` (press `1` — per-core view; one core pinned at 100% while others idle = a single-threaded bottleneck no hardware will fix). High `sy` → syscall storm: `perf top` or `execsnoop` (a fork-bomb-shaped load — thousands of short-lived processes — is invisible to top and obvious to execsnoop). High `st` on a VM → the host's problem; escalate with the number in hand.
4. **I/O branch:** `iostat -xz 1` — which device, `%util`/`await` say saturated-or-sick; `iotop`/`biolatency` name the process and the latency shape; `ps -eo state,pid,comm | awk '$1=="D"'` names who's stuck. NFS in the mix → `nfsiostat`, and a hung server explains everything (`D`-state, unkillable — system-internals.md).
5. Neither branch loaded but load high anyway → count the `D`-staters again (a dead NFS mount parks dozens there at zero CPU and zero disk), and check PSI (next section) for which resource is actually stalling tasks.

---

## 7. Reading the kernel's own reports

**dmesg / `journalctl -k`.** The ring buffer is where hardware and kernel subsystems confess: I/O errors and resets (`blk_update_request: I/O error`, `ata2.00: exception` — the disk ladder's step zero when errors are the cause), NIC link flaps, filesystem remount-read-only events (ext4's response to errors — the "why did everything become read-only" answer), OOM reports, and segfault one-liners. `journalctl -k -p err -b` is the triage cut. Timestamps: `dmesg -T` for human time, with the caveat that it's reconstructed and drifts after suspend.

**Oops and panic, at orientation.** An *oops* is the kernel catching one of its own faults — a stack trace in the log, the offending process killed, the machine limping on with a now-`tainted` kernel (treat post-oops uptime as borrowed). A *panic* is the full stop. Reading depth for an admin: the first lines (what fault, in which function), the `Tainted:` flags (proprietary module? out-of-tree? — where the bug report goes changes), and the module list. Repeated oopses in one driver name your suspect; capture-and-report (kdump exists; orientation) beats amateur kernel forensics.

**Pressure stall information — the modern signal.** `/proc/pressure/{cpu,memory,io}` answers the question load average garbles: *what percentage of the time were tasks stalled waiting for this resource?*

```
$ cat /proc/pressure/io
some avg10=12.40 avg60=8.11 avg300=3.02 total=8419287361
full avg10=2.10 avg60=1.33 avg300=0.41 total=1042118825
```

`some` = at least one task stalled; `full` = *all* non-idle tasks stalled (the machine going nowhere). Per-resource, so it names the bottleneck directly — `io some avg10=12` says "I/O is the constraint, 12% of the last 10 seconds" while load average was busy averaging three causes into one number. Requires kernel ≥ 4.20 with PSI enabled (mainstream distros: yes; verify on enterprise kernels). systemd surfaces per-service pressure via cgroups — the fleet-grade version of the same signal.
