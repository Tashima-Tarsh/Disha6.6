# Troubleshooting and Performance

The discipline of finding out, Windows edition. The event log outranks the guess; the tool that proves the hypothesis is named before the fix is proposed. Read this for diagnostic sessions, pasted evidence (event excerpts, gpresult, error codes), and performance questions.

## Contents
- [Event-log fluency as the first move](#event-log-fluency-as-the-first-move)
- [Sysinternals and the performance toolset](#sysinternals-and-the-performance-toolset)
- [The diagnostic ladders](#the-diagnostic-ladders)
- [Performance truth-telling](#performance-truth-telling)
- [The Windows classics](#the-windows-classics)

## Event-Log Fluency as the First Move

- **Filtering by ID and provider** in Event Viewer (Filter Current Log — IDs comma-separated, ranges with hyphens) is the beginner move; **custom views** persist the filters worth keeping (the account-management series, the GPO Operational errors, the disk warnings) so the next incident starts from a view, not a scroll.
- **At scale, the shell**: `Get-WinEvent -FilterHashtable` is the workhorse — server-side filtering, so it is fast where `Where-Object` after the fact is not:

```powershell
# Failed logons in the last 24h, summarized by target account — the spray-check
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddDays(-1)} |
    ForEach-Object { $_.Properties[5].Value } | Group-Object | Sort-Object Count -Descending

# Same question across the DC fleet — remoting turns one answer into the answer
Invoke-Command -ComputerName $dcs -ScriptBlock { Get-WinEvent -FilterHashtable @{...} }
```

`wevtutil` covers what the cmdlets don't (channel config, export/clear: `wevtutil epl Security backup.evtx`). XPath/XML queries handle the filters the hashtable can't express (by inner data fields). And the orientation rule from platform-install-internals.md: the answer is often in an Applications and Services Logs channel — GroupPolicy/Operational, TaskScheduler/Operational, Directory Service, DNS Server — not in the big three.

## Sysinternals and the Performance Toolset

The fluency every Windows engineer owes themselves:

- **Process Explorer**: what Task Manager wishes it were — process tree with parents, DLLs and handles per process (the find-handle search answers "what has this file locked"), signature verification, and the who-is-this-process question answered on the spot.
- **ProcMon** with its **filter discipline**: ProcMon captures everything, so the skill is subtraction — filter to the process, exclude the SUCCESS noise when hunting failures, look for ACCESS DENIED, NAME NOT FOUND, and the registry key the app reads right before misbehaving. The boot-logging mode catches what happens before you could start capturing. An unfiltered ProcMon trace is evidence the way the ocean is a water sample.
- **Autoruns** for the what-starts-here question: every autostart location — run keys, services, tasks, WMI subscriptions, shell extensions — with signature status and VirusTotal integration. The persistence-hunting tool and the why-is-boot-slow tool in one.
- **TCPView** (or `Get-NetTCPConnection` with `-OwningProcess` for the scripted version): which process owns which connection/listener.
- **Resource Monitor** for live triage one level below Task Manager (per-process disk I/O and the disk-queue view; the wait-chain analysis for hung processes).
- **PerfMon with data collector sets for the after-the-fact question**: the intermittent problem is caught by the collector running before it happens — a scheduled collector set (counters: % Processor Time, disk avg. queue and sec/transfer, Memory Available MBytes and committed bytes, network) logging to a binary file, so "the server was slow last Tuesday at 3 a.m." becomes a chart instead of an apology.

## The Diagnostic Ladders

Written as ladders — climb in order, prove each rung before the next.

### Slow logon (the classic order: profile, GPO count, DNS, mapped drives)

1. **Measure first**: the GroupPolicy/Operational log timestamps every processing phase; Windows Performance Recorder/Analyzer boot-trace for the deep case. Know *which* phase is slow before touching anything.
2. **Profile**: temp-profile events (1511/1515)? Roaming profile bloat measured in GB? FSLogix container on a slow or contended share? Profile problems dwarf everything else when present.
3. **GPO count and content**: gpresult — how many GPOs, and which processing entries in the Operational log take the seconds? The offenders by reputation: per-logon drive-mapping scripts, WMI filters evaluated slowly, legacy folder redirection re-checking, printer connections timing out.
4. **DNS**: slow or misordered resolvers delay DC location before anything else can even start; `nltest /dsgetdc:<domain>` timing and the site check (`nltest /dsgetsite` — an unmapped subnet sends logons across the WAN, active-directory.md).
5. **Mapped drives and legacy scripts**: reconnection attempts to dead servers wait out their timeouts one by one. Replace logon-script mappings with GPP drive maps (or cloud drive access) and delete the tombstones.

### Cannot authenticate (time, DNS, secure channel, lockout)

1. **Time skew**: `w32tm /stripchart /computer:<dc>` — outside five minutes, stop, fix time hierarchy (the PDCe rule, active-directory.md), retest. The costume rule below.
2. **DNS**: can the client find a DC at all — `nltest /dsgetdc:<domain>`, `Resolve-DnsName -Type SRV _ldap._tcp.dc._msdcs.<domain>`? Wrong resolvers on the NIC is the answer more often than any AD problem.
3. **Secure channel**: `Test-ComputerSecureChannel` — if false, `-Repair` (or `Reset-ComputerMachinePassword`), and note the classic cause: a machine account disabled/deleted by cleanup scripts, or a machine restored from an old snapshot with a stale machine password.
4. **Lockout source**: 4740 on the PDC Emulator names the caller computer; 4771/4625 on DCs trace the pattern. The usual suspects: a stale credential in a service, task, drive mapping, or a phone's mail profile — the credential the user forgot exists.

### GPO not applying (scope, filtering, replication, gpresult as proof)

1. **Scope**: is the object in the OU the GPO links to, is the link enabled, is the GPO's relevant half (user/computer) enabled?
2. **Security filtering**: is the user/computer in the filtered group — and does the group still include the Read the machine account needs (the Authenticated-Users-removed classic, active-directory.md)? WMI filter evaluating true?
3. **Precedence**: does a later-winning GPO override the setting — enforced link, blocked inheritance, loopback in play?
4. **Replication**: are SYSVOL and the directory consistent across DCs — `gpotool`-era checks now done via `Get-GPO` version comparison and `repadmin`; a GPO edited on one DC and read from another mid-replication "isn't applying" for exactly one replication interval.
5. **Proof**: `gpresult /h` on the affected machine as the affected user — the applied and denied lists with reasons close the case. `gpupdate /force` and a re-test is the last rung, not the first.

### Replication failing (dcdiag, repadmin, DNS again)

1. `dcdiag /v` on the suspect DC — the broad exam names the failing test.
2. `repadmin /showrepl` — which partners, which naming contexts, what error: 8524 ("DNS lookup failure" — go to rung 3), 1722 ("RPC server unavailable" — network path/firewall/service), 8453 (permissions), lingering-object errors (tombstone territory, active-directory.md).
3. **DNS again**: the DC locator records (`dcdiag /test:dns`), the DC's own resolver settings, stale A/SRV records for a decommissioned partner.
4. Time and secure channel between DCs — the same first rungs as user auth, DC edition.
5. Escalation honesty: a DC broken past tombstone lifetime or with USN rollback symptoms (Event ID 2095) is a metadata-cleanup-and-rebuild, not a repair.

### Blue screen, at orientation

The dump exists (`C:\Windows\Minidump`, or the full/kernel dump per system settings — verify a pagefile large enough to catch it); **WinDbg is the tool** (`!analyze -v` reads the dump and names the failing module); **the driver is usually the answer** — the bugcheck code narrows it (DRIVER_IRQL_NOT_LESS_OR_EQUAL and friends point at drivers; memory-corruption codes earn a MemTest pass; storage codes earn SMART/controller checks). The reliability signal around it: was there a driver/firmware/update change in the window (Reliability Monitor draws the timeline)? Recurring identical bugchecks are a driver/firmware ticket; varied bugchecks on one machine are a hardware conversation.

## Performance Truth-Telling

- **What Task Manager hides that PerfMon shows**: disk *latency* (sec/transfer) and queue depth rather than a percent; per-process I/O attribution; the counter history that turns "it feels slow" into a trend line. Task Manager's CPU percent also normalizes across boost clocks and parked cores in ways that mislead on modern hardware — PerfMon's Processor Information counters are the honest set.
- **Memory working sets without folklore**: high memory *use* is the OS doing its job — free RAM is wasted RAM; standby-list memory is cache, reclaimable instantly. The honest pressure signals: **Available MBytes** trending low *plus* hard fault rate climbing *plus* committed bytes approaching the commit limit. A big working set on SQL Server is design, not a leak; a private-bytes line that only ever climbs across weeks is the leak.
- CPU: sustained high with a short queue is throughput; a long processor queue with modest percent is contention or interrupt/DPC trouble (the DPC/interrupt counters and `xperf`-class tracing name the driver).
- Disk: sec/transfer beyond low single-digit milliseconds on what claims to be SSD is the finding; on VMs, the host/storage fabric is a suspect the guest counters can only gesture at — take the question to the hypervisor layer with the guest evidence in hand.

## The Windows Classics

Named as classics, because recognizing them is most of the speed:

- **DNS misconfiguration wearing an AD-outage costume.** "AD is down" — but AD is fine and nobody can *find* it: wrong resolvers on clients or the DC itself, missing SRV records, a public DNS server listed "as backup." The standing rule from active-directory.md: half of "AD is broken" is DNS. First question in any AD incident: what does `nltest /dsgetdc` say, and what resolvers is the machine actually using (`ipconfig /all`)?
- **Time skew wearing an authentication costume.** Kerberos failures, "cannot contact domain," intermittent auth after a VM restore or a CMOS battery death — check `w32tm /stripchart` before checking anything about accounts.
- **The disabled-computer-account secure-channel failure.** The trust relationship error after someone's cleanup script disabled "stale" computer accounts that were laptops on leave, or after a VM rolled back past a machine-password change. `Test-ComputerSecureChannel -Repair` fixes the machine; fixing the cleanup script's staleness criteria fixes the recurrence.
