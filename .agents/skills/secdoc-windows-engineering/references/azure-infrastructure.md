# Azure Infrastructure for the Windows Engineer

Azure scoped deliberately to what a Windows engineer runs there: governance scaffolding, Windows VMs, virtual networking at working depth, storage for the file-server conversation, AD in the cloud era, Arc, backup, and cost honesty. Broader cloud architecture composes with the networking and security skills.

## Contents
- [Governance scaffolding](#governance-scaffolding)
- [Windows VMs done properly](#windows-vms-done-properly)
- [Virtual networking at working depth](#virtual-networking-at-working-depth)
- [Azure Files and the file-server migration](#azure-files-and-the-file-server-migration)
- [Running AD in the cloud era](#running-ad-in-the-cloud-era)
- [Azure Arc at orientation](#azure-arc-at-orientation)
- [Backup and site recovery](#backup-and-site-recovery)
- [Cost honesty](#cost-honesty)

## Governance Scaffolding

- **Tenant versus subscription versus management group** — the one clear page: the *tenant* is the Entra directory (identity); *subscriptions* are billing-and-resource containers trusting that tenant; *management groups* organize subscriptions so policy and RBAC can be assigned once above them. Resources live in resource groups inside subscriptions. Identity is tenant-scoped; the meter is subscription-scoped.
- **RBAC versus Entra roles — the confusion worth naming**: Entra roles (Global Admin, User Admin...) govern the *directory*; Azure RBAC roles (Owner, Contributor, Reader, and the specific ones you should actually use) govern *resources*, assigned at management-group/subscription/resource-group/resource scope and inherited downward. A Global Admin has no resource access by default — the elevate-access toggle that grants it is a break-glass move that gets logged and reversed, not a convenience. Assign RBAC to groups at the narrowest sensible scope; Owner assignments at subscription scope are the domain-admins-everywhere of the cloud.
- Azure Policy is the guardrail layer (deny public IPs here, require tags, enforce disk encryption) — the GPO analog for resources, and the same pilot-then-broad staging discipline applies.

## Windows VMs Done Properly

- **Images**: Marketplace images for standard builds; Azure Compute Gallery for the org's generalized golden images (sysprep rules from platform-install-internals.md apply unchanged). Prefer building configuration in post-deploy code over fattening images.
- **Sizes as categories**, not SKU trivia (SKU lineups are perishable): general-purpose (D-family) for most Windows workloads, memory-optimized (E) for the databases, burstable (B) for the dev boxes and the small always-on utility VMs, compute-optimized (F) when CPU-bound. Right-size after observing; the default pick oversizes.
- **Disks**: OS disk plus data disks; Premium SSD as the production floor for anything that matters (the SLA math and tier lineup are verify-current); host caching read-only for data disks, *none* for database log disks and — the rule that matters below — for the AD database disk on a DC.
- **Update management**: Azure Update Manager brings the patch-ring discipline from platform-install-internals.md to VMs (and, via Arc, to on-prem machines) — schedules, maintenance windows, compliance reporting. The ring logic doesn't change because the meter runs.
- **Domain controllers in Azure — the placement and DNS rules**: DCs go on static private IPs; the *VNet's* DNS server settings point at the DC IPs (so member VMs resolve the domain — the load-bearing-wall rule from active-directory.md, cloud edition); the AD database/SYSVOL disk uses a data disk with caching set to None; and availability comes from spreading DCs across availability zones. Never deallocate a DC casually — a stopped-deallocated VM can pick up a new dynamic IP unless static, and a DC offline past tombstone lifetime is a rebuild (active-directory.md). Azure VMs get time from the host by default; DCs keep the domain time hierarchy deliberate rather than accidental.

## Virtual Networking at Working Depth

Composes with network-engineering (mechanics) and networking-architecture (design); this is the Windows engineer's working set.

- **VNets and subnets**: a VNet is a private address space in a region, carved into subnets. Plan address space like on-prem — non-overlapping with every network it will ever peer or VPN to, because renumbering later is the same misery it always was.
- **NSGs as the host-adjacent firewall**: stateful allow/deny rules applied at subnet and/or NIC scope, evaluated by priority. The Windows-engineer reading: NSGs are the network's contribution and Windows Defender Firewall is the host's — an RDP rule open in the NSG *and* the host firewall is what "RDP works" requires, and diagnosing which layer blocks is half of Azure connectivity troubleshooting (Network Watcher's IP flow verify answers it). Default posture: no inbound from internet; management access via Bastion or VPN, never a public IP with 3389 open — see hardening-security.md for why that VM is already compromised.
- **Private endpoints at orientation**: a NIC in your VNet that *is* the PaaS service (storage account, Azure Files) — traffic stays private, and the DNS story (private DNS zones resolving the service name to the private IP) is where private endpoint deployments succeed or fail.
- **Hybrid connectivity as categories**: site-to-site VPN (encrypted over internet, the entry point), ExpressRoute (private circuit, the enterprise answer), point-to-site (individual machines), VNet peering (VNet-to-VNet). Which one, and hub-spoke design around them: networking-architecture's territory.

## Azure Files and the File-Server Migration

Azure Files serves SMB shares from a storage account — the file-server-migration conversation in product form. **Identity-based access is the point**: the share can authenticate against on-prem AD (the storage account gets a computer-account-like identity in the domain), Entra Domain Services, or Entra Kerberos for Entra-joined clients (capability details verify-current) — so NTFS-style permissions keep working and the migration is robocopy plus a DFS namespace cutover rather than a re-permissioning project. Share-level access is RBAC; file/folder-level is the NTFS ACLs you brought. **Azure File Sync** turns remaining on-prem file servers into caches of the cloud share (cloud tiering) — the transition tool for branch offices. The honest costs: latency for chatty workloads from far regions, per-transaction billing on standard tiers that surprises people, and the identity configuration being the entire difficulty of the product.

## Running AD in the Cloud Era

The decision table it is:

| | DCs in Azure VMs | Entra Domain Services | Entra-only |
|---|---|---|---|
| What it is | Your real AD, extended into Azure | Microsoft-managed AD-compatible domain, synced from Entra | No domain at all; Entra + Intune |
| You control | Everything (schema, GPO, trusts, FSMO) | Limited: a GPO subset, no schema, no domain admin, no trust flexibility (verify current limits) | Cloud policy surface |
| Fits | Hybrid estates, apps needing real AD/Kerberos/LDAP against your directory | Lift-and-shift apps needing domain join/LDAP where you refuse to run DCs | New or fully modernized estates |
| The bill | You patch, back up, and secure DCs forever (the always-on VM line below) | Service fee; less control is the cost as much as the price | Legacy-app remediation is the real project |

The recommendation pattern: Entra-only is the destination question every estate should be asked, DCs-in-VMs is the present tense for most hybrid shops, and Entra Domain Services is a niche answered honestly — it is not "your AD, managed," and the control gaps decide more evaluations than the price.

## Azure Arc at Orientation

Arc projects on-prem and other-cloud servers into Azure as resources: Azure Policy and Machine Configuration reach them, Update Manager patches them, Defender for Cloud watches them, and RBAC governs who touches them. For the Windows engineer with a hybrid estate it is the management-plane unification play — one policy/patch/compliance surface across the datacenter and the cloud. Agent-based; per-server pricing for some capabilities (verify current); the on-ramp is one PowerShell onboarding script.

## Backup and Site Recovery

Categories, with the discipline attached:

- **Azure Backup**: Recovery Services vault, policy-driven VM backup (and agent-based file/system-state backup reaching on-prem, plus workload-aware SQL/SAP options). Soft delete and immutability options are the ransomware-era settings to turn on deliberately.
- **Azure Site Recovery**: replication for DR — failover of VMs (or on-prem machines) to another region, with recovery plans ordering the boot sequence.
- The line that outranks both product names: **restore-testing is the actual backup.** A vault full of recovery points nobody has restored from is a hope, not a control. Test restores on a calendar; test the DC restore against the rules in active-directory.md (and prefer building new DCs to restoring old ones wherever the directory survives elsewhere).

## Cost Honesty

The meter runs on **compute, storage, and egress** — and the always-on DC VM is a budget line someone must own by name. The recurring findings: VMs sized by fear and never right-sized; non-production running nights and weekends (auto-shutdown exists; use it); premium disks under workloads that never read them hard; egress charges discovered at invoice time (data *into* Azure is free, data *out* is not — a consideration for backup architectures and hybrid file access); and orphaned disks/IPs surviving their VMs. Reserved instances and hybrid-benefit licensing change the math materially for steady-state Windows VMs — current discount structures verify-at-use-time. The governance fix is structural, not heroic: budgets with alerts per subscription, tags that name an owner, and a monthly review that treats the invoice as an engineering artifact.
