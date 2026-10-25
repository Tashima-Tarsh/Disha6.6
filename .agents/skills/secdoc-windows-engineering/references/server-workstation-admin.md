# Server and Workstation Administration

The daily craft. Read this for server roles, storage, PowerShell-for-administration, workstation management, scheduled tasks, and the management-tooling map.

## Contents
- [Server roles at working depth](#server-roles-at-working-depth)
- [Storage on Windows](#storage-on-windows)
- [PowerShell for administration](#powershell-for-administration)
- [Workstation management](#workstation-management)
- [Scheduled tasks done properly](#scheduled-tasks-done-properly)
- [The management-tooling map](#the-management-tooling-map)

## Server Roles at Working Depth

### File services

- **Shares and the two permission layers**: share permissions gate the network doorway; NTFS permissions gate the files. Effective access over the network is the *more restrictive* of the two. The pattern that ends the arguments: share = Authenticated Users (or a broad group) with Change/Full, and all real access control in NTFS via groups — one layer to reason about instead of two. The proof tool when someone disputes access: the **Effective Access** tab (file Properties > Security > Advanced), or `icacls` for the raw ACL.
- NTFS discipline: permissions to groups, never to users; inheritance left intact except at deliberate, documented breakpoints; Deny ACEs as a last resort because a Deny beats every Allow and is invisible until it bites. `icacls` for audit and scripted fixes; the AGDLP grouping pattern (accounts → global groups → domain-local groups → permissions) still earns its keep at scale.
- **Access-based enumeration** (per share) hides what the user can't open — cheap tidiness and mild information-disclosure control.
- **DFS**: Namespaces give `\\domain\share` paths that survive server migrations — worth deploying before the migration that makes you wish you had. Replication (DFS-R) is multi-master file sync with last-writer-wins; it is not a backup, not a lock manager, and shared spreadsheets edited on both ends of a WAN will teach that lesson via conflict folders.

### DNS and DHCP roles

Configured here; protocol depth composes from network-engineering rather than being restated.

- **DNS role**: for AD-integrated zones, scavenging (aging must be enabled on the zone *and* refresh intervals sized to twice the lease time, or scavenging silently does nothing — the most common configured-but-inert setting in Windows DNS), forwarders vs root hints as the egress design, and the DC-DNS rules in active-directory.md.
- **DHCP role**: scopes with exclusion ranges for statics-that-should-be-reservations, reservations for printers and infrastructure, split-scope or DHCP failover (hot-standby vs load-balance) for availability — failover is the modern answer; split-scope is the legacy pattern still found in the wild. Server must be **authorized in AD** before it serves — the anti-rogue mechanism. Lease time is a design dial: short for guest/volatile networks, longer for stable office subnets.

### Print services

The honest pain, named: printing is drivers, and drivers run in a spooler that has hosted more than its share of CVEs (the PrintNightmare era changed defaults around driver installation rights — treat current spooler hardening guidance as verify-at-use-time). Working posture: Type 4/universal drivers where possible, spooler disabled on servers that don't print (DCs above all), deployment via GPO/Intune rather than manual installs, and a plan for the cloud print service the tenant licenses when the on-prem print server's retirement conversation starts.

### IIS at orientation

Sites, application pools (isolation and identity — app pool identities are the modern low-privilege default; a domain service account only when the app must reach the network as itself, ideally a gMSA), bindings with SNI for TLS, and configuration in `applicationHost.config` manageable via `IISAdministration` PowerShell. Deep web-tier architecture belongs to application-architecture.

### Hyper-V at working depth

- **Virtual switches**: External (bound to a NIC), Internal (host+VMs), Private (VMs only). The production pattern is an External switch on a NIC team / SET, with management traffic separated from VM traffic.
- Generation 2 VMs (UEFI, Secure Boot, larger disks) are the default; Gen 1 exists for legacy OSes. Dynamic memory for general workloads; fixed for the workloads whose vendors say so (databases, DCs by some guidance vintages — check current).
- **Checkpoints and the production caveat**: standard checkpoints capture disk+memory and are lab tools. Production checkpoints use VSS inside the guest — app-consistent — and are still not backups. The caveat stated every time: a checkpoint chain left running is a performance and disk-space debt, and merging a long chain on a full volume is a bad afternoon. Checkpoint before the change, delete after the verify.
- **Live migration** moves running VMs between hosts (with clustering, or standalone with shared-nothing migration); constrained by processor compatibility settings and network bandwidth. Kerberos-constrained-delegation or credential prompts for the management path — the delegation content in active-directory.md applies.

### Failover clustering and Storage Spaces, at orientation with decision honesty

Clustering gives role availability (Hyper-V VMs, file server, SQL) over shared or replicated storage, with quorum (node majority plus witness — always configure a witness) deciding split-brain. Cluster-aware updating patches nodes in sequence. Storage Spaces pools disks; Storage Spaces Direct (S2D, Datacenter edition) builds hyperconverged storage from local disks. The decision honesty: a two-node cluster doubles the hardware and adds a failure domain of its own (the cluster) — it pays off when downtime genuinely costs more than the complexity, and a small shop with good backups and a spare host often gets more real availability from simplicity. Azure alternatives (see azure-infrastructure.md) have moved many of these workloads off-prem entirely.

## Storage on Windows

**NTFS versus ReFS as a decision table:**

| | NTFS | ReFS |
|---|---|---|
| Default for | OS volumes, general file shares, anything needing full feature set | Storage Spaces (Direct) volumes, Hyper-V storage, backup targets |
| Integrity | Journaling | Checksums + online repair with mirrored/parity Spaces |
| Killer features | EFS, compression, quotas (mature), bootable, dedup support | Block cloning (fast VHDX ops/backup), scale, corruption resilience |
| Honest gaps | Bit-rot detection absent | Feature gaps vs NTFS narrow over time — verify current before assuming a gap still exists |

Volumes: GPT everywhere modern; `diskmgmt.msc` for one-off work, `Get-Disk`/`New-Partition`/`Format-Volume` for anything repeated. **Data deduplication** (an NTFS role feature) earns real ratios on file shares, VDI, and backup volumes; it post-processes, so sizing is for pre-dedup peak. Anything destructive here — `Clear-Disk`, repartitioning, `Format-Volume` — carries the safety discipline: name the disk by serial/friendly name, confirm with `Get-Disk` output, and state what is unrecoverable.

## PowerShell for Administration

Language craft — idioms, module authorship, error-handling doctrine — composes sideways from application-architecture's shell-scripting canon; this section owns the *administration* patterns.

### Remoting as the fleet tool

WinRM-based remoting is how one console manages a thousand machines. In a domain it authenticates via Kerberos with no credential handling to get wrong; enable fleet-wide via GPO (WinRM service + firewall rule) rather than machine-by-machine `Enable-PSRemoting`.

```powershell
# Interactive, one box
Enter-PSSession -ComputerName SRV01

# Fan-out: the same block on many machines, results tagged by origin
Invoke-Command -ComputerName (Get-Content .\servers.txt) -ScriptBlock {
    Get-Service -Name Spooler | Select-Object Status, StartType
} | Sort-Object PSComputerName

# Persistent sessions when several rounds of work go to the same set
$s = New-PSSession -ComputerName SRV01, SRV02
Invoke-Command -Session $s { ... }
```

The second hop (remoted session reaching a third machine) fails by design; the answers are CredSSP (broad, riskier), resource-based constrained delegation, or restructuring the task. **JEA** (Just Enough Administration) is the constrained-endpoint pattern — helpdesk gets exactly the cmdlets delegated, nothing else — and belongs in any tiered-admin design.

### The admin patterns

```powershell
# Bulk user operations: CSV in, accounts out — the joiner pattern
Import-Csv .\newhires.csv | ForEach-Object {
    New-ADUser -Name "$($_.First) $($_.Last)" -SamAccountName $_.Sam `
        -Path 'OU=Users,OU=Corp,DC=contoso,DC=com' `
        -AccountPassword (ConvertTo-SecureString $_.TempPw -AsPlainText -Force) `
        -Enabled $true -ChangePasswordAtLogon $true
}

# Reporting one-liners — the questions auditors actually ask
Get-ADUser -Filter {Enabled -eq $true -and PasswordNeverExpires -eq $true} |
    Select-Object SamAccountName, DistinguishedName
Get-ADComputer -Filter * -Properties LastLogonDate |
    Where-Object LastLogonDate -lt (Get-Date).AddDays(-90)
```

The standing rule from SKILL.md applies here with teeth: anything done twice gets done in PowerShell, and the script gets a name, a comment explaining why, and a home in version control.

### Configuration as code, at orientation

DSC defined the declare-the-state model (MOF-based v1/v2 on Windows PowerShell; class-based DSC v3 cross-platform); Microsoft's investment has moved toward **Machine Configuration** (Azure Policy guest configuration, reaching on-prem via Arc) and Intune for clients. Which vehicle is current for a given estate: verify-at-use-time. The durable idea outlives every vehicle: desired state declared and continuously corrected beats imperative scripts run once and drifted from.

## Workstation Management

- **Profiles and their failure modes**: a profile is NTUSER.DAT plus the profile folders. The temp-profile logon (Event ID 1511/1515, User Profile Service) means the hive wouldn't load — corrupt hive or a `.bak` ProfileList registry entry; the fix is the ProfileList SID entry, not deleting the folder and hoping. Roaming profiles are legacy pain (whole-hive copy at logon/logoff); their replacement in RDS/VDI land is profile containerization (FSLogix), and for physical fleets, not roaming anything at all.
- **Folder redirection versus modern known-folder move**: GPO folder redirection points Documents/Desktop at a file server — mature, on-prem, and a slow-logon suspect when misconfigured. The modern counterpart moves known folders to OneDrive — per-user sync rather than server dependency, and the enabler for treating workstations as disposable. Mixed estates run both during the transition; the design sin is running both *on the same folders*.
- **Local admin rights are the hill to defend.** Standard user for daily work, elevation by exception with an expiry, LAPS for the local admin password that remains (hardening-security.md). Every ransomware retro finds this hill undefended.

## Scheduled Tasks Done Properly

Service accounts, not domain admins — the scheduled task running as a domain admin with a stored password is a privilege-escalation gift. The ladder of goodness: run as a gMSA (`schtasks`/`Register-ScheduledTask` with the gMSA and no password — the task-scheduler-native way requires `-LogonType Password` semantics via principal objects; test on the target OS build), else a dedicated low-privilege service account with deny-interactive-logon, else SYSTEM for purely local work. `Get-ScheduledTask`/`Get-ScheduledTaskInfo` for audit; the TaskScheduler Operational log for "did it actually run."

## The Management-Tooling Map

| Tool | When it earns its place |
|---|---|
| MMC snap-ins (dsa.msc, gpmc.msc, dnsmgmt.msc, ...) | The precise console path for one-off work; still the deepest UI for AD and GPO |
| **RSAT** | The snap-ins and AD/GPO PowerShell modules installed on an admin workstation — manage from the PAW, never by RDPing to DCs |
| **Windows Admin Center** | Browser-based server management, best-in-class for Server Core, Hyper-V, and cluster day-to-day; not a GPO or deep-AD tool |
| **PowerShell + remoting** | Everything done twice, everything at fleet scale, everything that needs to be in version control |
| Intune / Entra admin centers | The cloud management plane (entra-hybrid-identity.md) |

The pattern underneath the table: admin tools run on hardened admin workstations against remote targets; interactive logons to servers are the exception with a reason, not the workflow.
