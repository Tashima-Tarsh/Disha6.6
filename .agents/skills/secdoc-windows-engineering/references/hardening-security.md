# Hardening and Security

Windows hardening mechanics. This file executes; control language, framework mapping, and technique-ID crosswalks compose upward with cybersecurity-architecture. The staging discipline from SKILL.md — pilot OU, report-only, compare-before-apply — restates where every control lands because that is where outages are prevented.

## Contents
- [Security baselines as the starting floor](#security-baselines-as-the-starting-floor)
- [Credential protection: the Windows-specific heart](#credential-protection-the-windows-specific-heart)
- [Protocol hardening](#protocol-hardening)
- [Audit policy engineered toward detection](#audit-policy-engineered-toward-detection)
- [BitLocker](#bitlocker)
- [RDP hardening](#rdp-hardening)
- [Defender stack as categories](#defender-stack-as-categories)

## Security Baselines as the Starting Floor

- **Microsoft security baselines** (shipped in the Security Compliance Toolkit as GPO backups, and as Intune security baseline profiles) and **CIS Benchmarks** are the floor, not the ceiling — hundreds of settings encoding the vendor's and the community's judgment. Applied via GPO on domain estates, via Intune profiles on cloud-managed ones.
- **Compare-before-apply is the discipline**: diff the baseline against current effective settings (Policy Analyzer from the toolkit does exactly this) and read the delta before linking anything. The baseline setting that breaks the line-of-business app is findable in the diff and unfindable in the outage.
- Staging: baseline GPO linked to a **pilot OU** with representative machines, soak time measured in real business days (the monthly job that breaks doesn't break in a two-hour test), then broaden. Version the GPO backup before and after (`Backup-GPO`).
- **Drift-checking** makes a baseline a control instead of an event: re-run Policy Analyzer on a schedule, or let Intune/Machine Configuration report compliance continuously. A baseline applied once in 2024 is a historical document.

## Credential Protection: The Windows-Specific Heart

### LAPS

The local Administrator password, unique per machine, rotated automatically, stored in AD (or Entra) with read access delegated narrowly — killing the one-password-for-every-workstation lateral-movement highway. Current **Windows LAPS** is built into the OS (the legacy LAPS MSI is the predecessor; verify deprecation status when a legacy deployment appears), configured by policy (GPO or Intune), storing to AD and/or Entra with encryption options the legacy tool lacked.

```powershell
# Read a machine's managed password — the delegated-admin retrieval path
Get-LapsADPassword -Identity WKS042 -AsPlainText
```

The design decisions that matter: who can read passwords (delegate per-OU, audit the reads — password retrieval is itself an auditable event), rotation-after-use enabled so a used password expires, and the account LAPS manages being a *renamed or dedicated* local admin with the built-in Administrator handled deliberately.

### Credential Guard and LSA protection

Two different locks on the same door, worth distinguishing precisely: **LSA protection (RunAsPPL)** makes LSASS a protected process — unsigned code can't open it, which blocks the commodity credential dumpers. **Credential Guard** goes further: virtualization-based security moves the secrets (NTLM hashes, Kerberos TGTs) into an isolated environment the OS kernel itself can't read, so even kernel-level compromise doesn't yield them. Enabled by default on current, hardware-capable Windows 11 Enterprise builds (verify the default's exact scope at answer time); the compatibility casualties to check before broad enablement are the old-world credential users — unconstrained delegation scenarios, some legacy SSO and NTLMv1-dependent tooling.

### The tiering model and PAWs

Admin tiering assigns credentials to zones by what they control — Tier 0 (identity itself: DCs, Entra Connect servers — which are Tier 0 assets precisely because they hold hash-sync credentials — PKI, backup systems that can restore Tier 0), Tier 1 (servers/apps), Tier 2 (workstations) — with the one rule that does the work: **credentials never log on downward into a less-trusted tier's machines**, because credentials land where they log on and are harvested where they land. A domain admin typing its password on a workstation has moved Tier 0 into Tier 2.

The **PAW** (privileged access workstation) is the rule made physical: a hardened, restricted machine that is the *only* place Tier 0 credentials are used — no mail, no browsing, allow-listed outbound. Enforcement is authentication policies/silos or at minimum logon-rights GPOs (deny-interactive-logon for admin accounts on lower tiers), plus separate named admin accounts per tier per human. Ties to the author's endpoint-domain material: the PAW is endpoint architecture serving identity architecture.

### Kerberoasting and the credential-theft surface, described defensively

What makes an account roastable: any *user* account with an SPN — because any authenticated user can request a service ticket to it, and that ticket is encrypted with the account's password-derived key, crackable offline at leisure. No offensive tooling here; the defensive equation is complete without it:

- **gMSAs** wherever software permits: 240-character machine-rotated passwords end the offline-cracking conversation (active-directory.md).
- Where a legacy service account must persist: **long random password (25+ characters), rotation on a calendar, AES-only** (disable RC4 for the account — `msDS-SupportedEncryptionTypes`), no privileged group memberships, deny-interactive-logon.
- Inventory the surface: `Get-ADUser -Filter {ServicePrincipalName -like '*'} -Properties ServicePrincipalName` — every result is either justified or a finding.
- Detection side: TGS requests (Event ID 4769) with RC4 encryption against user-account SPNs are the classic signal — the audit-policy section feeds this to the SIEM.

Technique-ID mapping for all of the above composes upward with cybersecurity-architecture; this file states mechanics and mitigations.

## Protocol Hardening

- **SMB**: SMBv1 is a corpse — removed/disabled by default on current Windows for years; when a scan finds it enabled, the finding is the *dependency* keeping it alive (that one multifunction printer, that 2003-era appliance), and the project is killing the dependency. SMB **signing** defeats relay of SMB sessions — required by default in current Windows 11/Server editions (verify scope of the default at answer time); on older estates, enable via policy with a performance note that mattered in 2008 and mostly doesn't now. SMB encryption per-share or per-server where data sensitivity warrants.
- **NTLM restriction is a project, not a setting** — audit-first staging: enable NTLM auditing (the "Network security: Restrict NTLM" *audit* policies; Operational log events 8001–8004 identify sources), run weeks, fix the sources (IP-address connections that should be names, old apps, missing SPNs — active-directory.md), *then* restrict with exceptions lists, narrowing toward deny. NTLMv1 and LM specifically should already be dead via the LmCompatibilityLevel policy set to its ceiling. The platform's staged retirement of NTLM (verify current milestones) is the tailwind; the estate's own audit data is the map.
- **LDAP signing and channel binding**: unsigned/cleartext LDAP binds and missing channel binding enable relay to the directory itself. Audit first here too — DCs log unsigned-bind sources (Directory Service log, Event ID 2889 with the diagnostic level raised) — fix the offending apps/appliances, then enforce (require signing + channel binding) via policy. Microsoft's own enforcement-by-default timeline: verify-current.

## Audit Policy Engineered Toward Detection

Advanced Audit Policy (the granular subcategories, `auditpol /get /category:*` to read) — configured toward what detection consumes, not toward "audit everything" (which drowns the signal in noise and the disk in log). The event IDs that matter, engineered as the SIEM's diet — these are the lines the SIEM is fed, per the author's SOC material:

| Event ID(s) | What it tells the SOC |
|---|---|
| 4624 / 4625 | Logon success/failure — with logon *type* (2 interactive, 3 network, 10 RDP) carrying the analytic weight |
| 4672 | Special privileges assigned at logon — the admin-logon tripwire, especially on machines where admins shouldn't log on (tiering enforcement made visible) |
| 4720, 4722, 4724, 4728/4732/4756 | Account created / enabled / password reset by another / added to (global/local/universal) groups — the persistence and privilege-grant series; 4732 into Administrators is a page, not a log line |
| 4768 / 4769 | Kerberos TGT / service-ticket requests — authentication mapping, and 4769's encryption-type field is the kerberoasting signal above |
| 4771 | Kerberos pre-auth failure — the lockout-source and spray-pattern locator |
| 5136 / 5141 | Directory object modified / deleted — watch scope: admin groups, GPO objects, AdminSDHolder |
| 4688 | Process creation — high volume, high value; with command-line capture enabled it is the single richest endpoint telemetry the native platform offers |

Plus GPO-change visibility: Directory Service changes auditing on the Policies container, and gPLink attribute changes — an unexplained GPO edit at the domain root is an incident until proven a change ticket. Command-line capture (4688's ProcessCommandLine) and PowerShell logging (script block logging, Event ID 4104 in the PowerShell Operational log) round out the endpoint story; both carry a sensitive-data note — command lines and script blocks can contain secrets, so log access is itself access-controlled.

Sizing discipline from platform-install-internals.md applies: the Security log large enough that retention outlives detection latency, and forwarded (WEF or the SIEM agent) so the attacker clearing the local log (Event ID 1102 — itself a page) clears a copy, not the record.

## BitLocker

Full-volume encryption keyed through the TPM, with the honest scope stated: it protects data at rest against the stolen or scrapped device; it does nothing against malware on the running system. Configuration by GPO or Intune: TPM-only for the standard fleet (silent for users), TPM+PIN where the threat model includes targeted physical attack (executives, travel into hostile jurisdictions), XTS-AES-256 where policy demands the larger number.

**Recovery-key escrow is the non-negotiable**: keys backed up to AD (`Backup-BitLockerKeyProtector` / the GPO that enforces escrow-before-encrypt) or Entra ID *before* encryption begins, retrieval delegated and audited. A BitLocker deployment without verified escrow is a scheduled data-destruction program with a delay timer — the firmware update or motherboard swap that trips recovery mode will eventually find the machine whose key nobody has. Verify escrow coverage as a report (`Get-BitLockerVolume` fleet-wide vs the directory's stored keys), not an assumption.

## RDP Hardening

- **NLA required** (default on anything modern): authentication completes before a session/login screen is spun up — removing the pre-auth attack surface and the login-screen DoS.
- **No direct internet exposure — no exceptions clause survives contact with reality.** A 3389 listener on a public IP is credential-spray and exploit target number one; scan data and every IR retrospective agree. The patterns instead: VPN, **RD Gateway** (RDP tunneled in TLS/443 with AD auth and policy at the gateway), Azure Bastion for Azure VMs, or vendor ZTNA equivalents (networking-architecture's territory for the selection).
- Supporting settings: restrict *who* (Remote Desktop Users deliberate, admins via tiering rules only where their tier permits), account lockout + the 4625/4771 monitoring above, session limits, and Restricted Admin / Remote Credential Guard for admin RDP so full credentials don't land on the target — chosen per the delegation and tiering constraints in play.

## Defender Stack as Categories

Category map, EDR boundary marked; product names and SKU placements verify-current:

- **Defender Antivirus**: the built-in AV engine — cloud-delivered protection and tamper protection on; managed by GPO/Intune; runs in passive mode automatically when a third-party AV registers.
- **Attack Surface Reduction (ASR) rules**: the underrated middle layer — per-rule blocks for the classic malware entry mechanics (Office spawning child processes, script-launched executable content, LSASS credential access, and more). Each rule supports **audit mode first** — the report-only discipline again — audit fleet-wide, review the would-have-blocked events, exclude the legitimate line-of-business collisions, then enforce per rule.
- Exploit protection, controlled folder access, network protection: adjacent OS-level mitigations, same audit-first pattern where offered.
- **The EDR boundary**: Defender *for Endpoint* — behavioral detection, timelines, hunting, response actions — is a separately licensed product above the built-in stack, and its operation belongs to the SOC/detection-engineering domain (cybersecurity-architecture's secops territory). This skill's job ends at onboarding machines to it and keeping the sensor healthy; the analytics live upstairs.
