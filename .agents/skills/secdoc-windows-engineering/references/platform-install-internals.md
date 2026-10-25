# Platform, Installation, and Internals

The platform under the administration. Read this for Windows architecture questions, edition and servicing decisions, deployment and imaging, boot and recovery, and update servicing.

## Contents
- [Windows architecture at working depth](#windows-architecture-at-working-depth)
- [Editions and servicing](#editions-and-servicing)
- [Installation and deployment](#installation-and-deployment)
- [Boot and recovery](#boot-and-recovery)
- [Update servicing as a discipline](#update-servicing-as-a-discipline)

## Windows Architecture at Working Depth

### The registry as the configuration store

The registry is where Windows keeps nearly all persistent configuration — the counterpart to /etc plus every daemon's private config, in one hierarchical database. The hives that matter daily:

| Hive | Backing | What lives there |
|---|---|---|
| HKLM\SYSTEM | %SystemRoot%\System32\config\SYSTEM | Services, drivers, boot config (ControlSet) |
| HKLM\SOFTWARE | ...\config\SOFTWARE | Installed software, Windows policies, most GPO-written machine settings |
| HKLM\SAM | ...\config\SAM | Local account database (locked; readable only by SYSTEM) |
| HKLM\SECURITY | ...\config\SECURITY | LSA secrets, cached credentials |
| HKCU | %UserProfile%\NTUSER.DAT | Per-user settings; loaded at logon |
| HKU | All loaded user hives | HKCU is a view into the current user's branch here |

CurrentControlSet is a symlink to ControlSet001 (or whichever set booted last successfully) — this is the mechanism behind last-known-good, and why service/driver fixes sometimes mean editing a numbered control set offline.

**Edit ceremony, every time**: export the key first (`reg export` or right-click > Export), state what the edit does, and note that most registry changes need a service restart or reboot to take effect — the registry is a store, not a live control channel. GPO-managed keys will be rewritten at the next policy refresh; hand-editing a policy-managed key is a lesson, not a fix.

```powershell
# Export before touching — the recovery step comes first, not after
reg export "HKLM\SOFTWARE\Contoso\App" C:\Backups\contoso-app-$(Get-Date -Format yyyyMMdd).reg
```

### Services and their accounts

A service is a background process managed by the Service Control Manager, defined under HKLM\SYSTEM\CurrentControlSet\Services. What matters administratively:

- **Account choice is a security decision.** LocalSystem is close to root-equivalent on the box; NetworkService and LocalService are constrained and present machine credentials on the network (or none). A domain user account as a service account means a password someone must rotate — the answer to that problem is a gMSA (see active-directory.md).
- Console path: `services.msc`. Shell: `Get-Service`, `Set-Service`, and for the account/binary-path details services.msc hides, `Get-CimInstance Win32_Service`.
- Recovery actions (restart on failure) are configured per-service and forgotten per-service; a fleet standard belongs in configuration management, not in someone's memory.

### WMI/CIM as the query surface

WMI (and its standards-based successor surface, CIM) is how you ask Windows structured questions — hardware, OS state, installed software, running processes — locally or remotely. Use the CIM cmdlets (`Get-CimInstance`), not the deprecated WMI cmdlets (`Get-WmiObject`, removed in PowerShell 7+):

```powershell
# CIM over WinRM — the modern remote-query path; DCOM fallback exists but firewalls hate it
Get-CimInstance -ClassName Win32_OperatingSystem -ComputerName SRV01 |
    Select-Object CSName, Caption, LastBootUpTime
```

WMI is also a persistence surface attackers use (event subscriptions); Autoruns shows them (see troubleshooting-performance.md).

### Event log architecture

Security, System, and Application are only the beginning. The modern event log is channels fed by providers — hundreds of them under Applications and Services Logs, including the ones that answer real questions: `Microsoft-Windows-GroupPolicy/Operational`, `Microsoft-Windows-Kernel-Boot`, `Directory Service`, `DNS Server`, `Microsoft-Windows-TaskScheduler/Operational`.

- Console: Event Viewer (`eventvwr.msc`). Shell: `Get-WinEvent` — the only event cmdlet worth learning; `Get-EventLog` only reads the classic logs and is gone from PowerShell 7+.
- Security log writes are controlled by audit policy (see hardening-security.md); an empty Security log usually means nobody configured auditing, not that nothing happened.
- Log size and retention are per-channel settings with fleet-wide consequences: a Security log that wraps in four hours is a detection gap wearing a disk-savings costume.

## Editions and Servicing

**Perishable layer — verify at use time.** Edition lineups, servicing channel names, and end-of-support dates change; check Microsoft's lifecycle documentation and date the answer.

Durable structure:

- **Client**: Home (no domain join, no GPO — disqualifying for managed environments), Pro (domain/Entra join, BitLocker, Hyper-V client), Enterprise/Education (the security features baselines assume — Credential Guard management, AppLocker historically, advanced Defender features). The workgroup/small-shop answer is often Pro; the baseline-driven enterprise answer is usually Enterprise licensing via subscription.
- **Server**: Standard vs Datacenter is mostly a virtualization-rights and software-defined-storage question (Storage Spaces Direct, unlimited VM licensing are Datacenter territory). Verify current licensing terms rather than reciting them.
- **Server Core vs Desktop Experience**, argued honestly: Core has a smaller attack and patch surface and is the right default for infrastructure roles (DC, DNS, DHCP, Hyper-V, file server) managed remotely via PowerShell, RSAT, and Windows Admin Center. The honest cost: some third-party agents and a few roles still assume a desktop, and a team that has never managed Core will pay a learning tax during incidents. Core is the destination; whether it is this team's next step depends on their remote-management maturity, not on the feature table.
- **Servicing channels and lifecycles**: client and server both split into a general-availability channel (feature updates on a cadence) and long-term servicing (LTSC) for devices that must not change. LTSC on ordinary office workstations is a support-lifecycle trap dressed as stability. All channel names, cadences, and dates: verify-current, dated in the answer.

## Installation and Deployment

### Unattended installs and imaging

- **Answer files** (`unattend.xml` / `autounattend.xml`) drive Windows Setup without prompts — partitioning, edition, locale, local accounts, first-logon commands. Built by hand or with Windows System Image Manager against the matching-version install image.
- **Sysprep** is the generalization step that makes an installed image cloneable: it strips machine-specific identity (including the machine SID) and resets activation. The rule with no exceptions in a domain: never clone a machine that has not been sysprepped/generalized — duplicate identity produces failures that surface weeks later as "random" trust and authentication problems.
- Image servicing: DISM mounts and modifies offline images (drivers, packages, features). `dism /online` does the same to the running OS and is also the repair tool (`/RestoreHealth`).
- Classic on-prem deployment (WDS + MDT) still exists in real estates; treat its current support status as verify-at-use-time and answer legacy questions with migration honesty: keep it running if it works, but new investment goes to Autopilot/Intune for clients and to template-plus-automation patterns for servers.

### Modern client deployment: Autopilot at working depth

Autopilot inverts imaging: the device ships with OEM Windows, the hardware hash is registered to the tenant, and first boot enrolls the device into Entra ID and Intune, which then applies profiles, apps, and policy. What that means operationally:

- The "image" becomes a set of Intune configuration profiles and app assignments — versionable, testable, and per-group, which is the point.
- Deployment profiles decide the experience (user-driven vs pre-provisioned) and the join type (Entra joined vs hybrid joined — a decision with consequences; see entra-hybrid-identity.md).
- The failure modes are identity and network failure modes: the device must reach the enrollment endpoints, and hybrid join adds a dependency on line-of-sight to a DC that pure Entra join does not have.

### Server deployment patterns

Servers are deployed, not imaged like fleets of laptops: a golden-image or template approach (in Hyper-V/Azure: a generalized image or marketplace image) plus post-deploy configuration in PowerShell/DSC-successor tooling. The design rule: the template stays thin; configuration lives in code that can be re-run, because the template you fattened in 2023 is the drift you will be diagnosing in 2026.

## Boot and Recovery

The chain, UEFI-era: firmware → Windows Boot Manager (`bootmgfw.efi`, on the EFI System Partition) → BCD store consulted → `winload.efi` → kernel (`ntoskrnl.exe`) + boot-critical drivers → session start. Secure Boot signs the early links; BitLocker seals integrity of the rest (see hardening-security.md).

- **BCD** (Boot Configuration Data) replaced boot.ini permanently. `bcdedit /enum` to read; `bcdedit /export` before any edit — the registry export rule applies to the boot store doubly. Most boot-entry repair is `bcdboot C:\Windows` rebuilding the files and store rather than hand-editing entries.
- **WinRE** is the recovery OS on its own partition — Startup Repair, System Restore, command prompt, and the path into safe mode. Reach it via Shift+Restart, three failed boots, or `reagentc`.
- **Safe mode and last-known-good, the modern reality**: last-known-good (the ControlSet rollback) is a legacy-boot-era feature; on current systems the equivalent moves are safe mode (minimal driver/service set — if it boots there, the problem is in what safe mode didn't load), driver rollback, and uninstalling the most recent quality update from WinRE. Fast startup means "shutdown" is often hibernation of the kernel session; when boot state is suspect, a true restart (or `shutdown /r`) is the honest reboot.

## Update Servicing as a Discipline

- **The stack**: Windows Update (the client engine) pulls from Microsoft's service or from a management channel. Quality updates are cumulative — this month's patch contains the prior months — which simplifies compliance math and raises the stakes of a bad month.
- **WSUS**: deprecated by Microsoft — announced as no longer under feature development, with the push toward cloud update management (Windows Update for Business / Autopatch / Intune-driven policies). Its exact status and any end-of-servicing dates: verify-at-use-time, dated in the answer. Real estates still run it; the honest posture is "plan the exit, don't panic the fleet."
- **The managed-update categories**, durable regardless of product names: a policy layer that defers/schedules updates per ring, a reporting layer that proves compliance, and an orchestration layer for servers with dependencies (cluster-aware updating for clusters).
- **Patch-ring design** is the discipline: a pilot ring that actually resembles production (not just IT's own machines), a broad ring on a short deferral, and a critical-infrastructure ring with change-window discipline. The ring you skip to save time is the outage you buy at fleet scale. Servers get the same ring logic plus maintenance windows and a documented reboot plan — an unpatched server estate and an auto-rebooting DC pair at 2 a.m. are both failures, just of opposite disciplines.
