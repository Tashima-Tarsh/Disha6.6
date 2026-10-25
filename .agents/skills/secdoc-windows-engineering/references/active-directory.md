# Active Directory

The domain at expert depth — the file this skill earns its keep on. Read it for forest/domain/OU design, FSMO, replication, DNS-for-AD, Group Policy, Kerberos and NTLM, identity lifecycle, and AD care.

## Contents
- [Forest and domain design](#forest-and-domain-design)
- [FSMO roles](#fsmo-roles)
- [Replication](#replication)
- [DNS as AD's load-bearing wall](#dns-as-ads-load-bearing-wall)
- [Group Policy at depth](#group-policy-at-depth)
- [Kerberos and NTLM](#kerberos-and-ntlm)
- [Identity lifecycle](#identity-lifecycle)
- [AD care: backup, restore, recycle bin, decommissioning](#ad-care)

## Forest and Domain Design

- **The forest is the security boundary**, not the domain. Domain isolation within a forest is administrative convenience; a compromised child domain can reach the forest. Design consequence: one forest unless a hard security or political boundary demands two, and then a trust between forests — not extra domains — is the tool.
- **When one domain**: almost always. Multiple domains in one forest bought replication scoping in the dial-up era; today they buy operational cost. The defensible reasons left: distinct password/security policy regimes predating fine-grained password policies, merger realities, and regulatory isolation that legal — not IT — has demanded.
- **Trusts**: intra-forest trusts are automatic and transitive; the ones you design are forest trusts (two forests, with selective authentication as the least-privilege option) and external/shortcut trusts for the edge cases. Every trust is an attack path as well as an access path; the trust you cannot explain is the one the assessor writes up. SID filtering stays on unless a migration temporarily requires otherwise, and "temporarily" gets a calendar date.
- **OU design is for delegation and GPO, not org-chart vanity.** OUs exist to (a) scope Group Policy and (b) delegate administration. A structure that mirrors the HR org chart and serves neither purpose is decoration that someone must now maintain through every reorg. The pattern that survives contact with reality: a top split by object type and management model (Workstations, Servers, Users, Service Accounts, Admin/Tier objects), subdivided only where a distinct GPO set or a distinct delegation actually exists. Security groups — not OUs — answer "who can access what"; OUs answer "who manages this and what policy lands on it."

## FSMO Roles

Five single-master roles, because some operations cannot tolerate multi-master conflict. What actually breaks when each is down:

| Role | Scope | What breaks when it's down |
|---|---|---|
| Schema Master | Forest | Schema changes fail. Nothing else. Days of downtime are invisible. |
| Domain Naming Master | Forest | Adding/removing domains fails. Also invisible day-to-day. |
| RID Master | Domain | DCs can't get new RID pools — new object creation eventually fails, on each DC's own schedule. Slow-burn failure. |
| PDC Emulator | Domain | The one you feel: authoritative time source for the domain (Kerberos cares — see clock skew below), immediate password-change convergence and lockout processing, default target for legacy tools and GPO editing. Hours matter here. |
| Infrastructure Master | Domain | Cross-domain reference cleanup stales — irrelevant in a single-domain forest or when every DC is a GC. The role everyone memorizes and almost no one is hurt by. |

- Query: `netdom query fsmo` or `Get-ADForest` / `Get-ADDomain`. Console: the roles are scattered across AD Users and Computers, AD Domains and Trusts, and the Schema snap-in — which is itself the argument for PowerShell.
- **Transfer versus seizure — the ceremony**: a transfer is a graceful handoff between two live DCs (`Move-ADDirectoryServerOperationMasterRole`), done for maintenance and migrations, reversible, boring. A seizure (`-Force`) is for a role holder that is dead and not coming back. State the rule every time: **after a seizure, the old holder never returns to the network without being rebuilt** (or at minimum forcibly demoted and metadata-cleaned while offline). Two DCs each believing they hold a single-master role is a corruption engine, and RID master duplication specifically can mint duplicate SIDs.

```powershell
# Transfer (both DCs up) — reversible, no drama
Move-ADDirectoryServerOperationMasterRole -Identity DC02 -OperationMasterRole PDCEmulator

# Seizure (old holder is gone for good) — the -Force is a commitment, not an option flag
Move-ADDirectoryServerOperationMasterRole -Identity DC02 -OperationMasterRole RIDMaster -Force
```

## Replication

- **Sites and subnets** teach AD the network's shape: a site is a set of well-connected subnets; clients find "their" DC via site-aware DNS answers, and replication compresses and schedules across site links. An unmapped subnet means clients authenticate across the WAN and logons crawl — check `nltest /dsgetsite` when a branch office complains.
- **The KCC** builds the replication topology automatically (intra-site: ring plus shortcuts, notification-driven and fast; inter-site: per site-link schedule and cost). Hand-crafted connection objects are almost always a legacy smell.
- **USNs at orientation**: each DC numbers its own changes with an update sequence number; partners track high-watermarks per partner and per-attribute versions resolve conflicts (last writer wins, with the timestamp and originating DC as tiebreakers). That's enough model to read replication errors correctly — deeper internals rarely pay rent.
- **Health verbs**: `repadmin /replsummary` (fleet overview), `repadmin /showrepl` (one DC's partners and failures), `dcdiag` (the broad exam), `repadmin /syncall /AdeP` (push, when you must). Lingering objects and tombstone-expiry quarantine are what happens when a DC is offline longer than the tombstone lifetime — the fix is metadata cleanup and rebuild, not a forced sync.

## DNS as AD's Load-Bearing Wall

The standing diagnosis rule: **half of "AD is broken" is DNS.** Domain-joined machines find DCs by querying SRV records — `_ldap._tcp.dc._msdcs.<domain>`, `_kerberos._tcp.<domain>`, and the site-scoped variants underneath `_msdcs` — which DCs register dynamically via their Netlogon service. No SRV records, no domain: joins fail, logons fall back to cached credentials, GPO stops flowing, replication partners can't be found.

- **A DC's DNS client configuration is the most consequential setting in the room.** DCs point at another DC first and themselves second (loopback last, if at all, per long-standing guidance); a DC pointing at the ISP's resolver, or only at itself during promotion of the second DC, produces the island problems that fill forums. Domain members point only at internal DNS — never a public resolver "as backup," because a backup resolver that can't answer SRV queries isn't a backup, it's an intermittent outage.
- AD-integrated zones store DNS in the directory itself and replicate with it — secure dynamic updates only, and the `_msdcs` zone health is checked with `dcdiag /test:dns`.
- Protocol depth — recursion, forwarding design, split-horizon reasoning — composes from network-engineering; this file owns the Windows role and its AD consequences.

## Group Policy at Depth

### Processing order, for the tenth confused engineer

Policies apply **L-S-D-OU**: Local, Site, Domain, OU (parent to child). Later wins — so the OU closest to the object wins conflicts by default. Then the modifiers, in the order they confuse people:

1. **Enforced** (on a link): that GPO's settings win over anything below and punch through inheritance blocking. Use sparingly; an estate full of Enforced links is precedence spaghetti.
2. **Block Inheritance** (on an OU): stops policies from above — except Enforced ones. A blocked OU is a special-snowflake OU; it had better have a documented reason.
3. **Security filtering**: the GPO applies only to principals with both Read and Apply Group Policy on it. The classic self-inflicted wound: replacing Authenticated Users and forgetting that machine accounts need Read for the machine-side settings to process at all.
4. **WMI filtering**: a query gate ("only laptops," "only Server 2022+"). Powerful, slow-ish, and invisible to the admin who didn't know it was there — which is why gpresult lists filter results.
5. **Loopback processing** (Replace/Merge): user settings determined by the *computer's* location — the kiosk/RDS-host/lab pattern. Explained the way it finally lands: normally the user's OU decides user policy; loopback says "in this room, the room decides."

**gpresult and RSOP are the proof tools.** `gpresult /h report.html` on the affected machine (as the affected user, or `/scope computer`) answers "isn't applying" with evidence: applied GPOs, denied GPOs and *why* (filtering, disabled link, access denied), and the winning setting's source. The Group Policy Operational log (`Microsoft-Windows-GroupPolicy/Operational`) picks up where gpresult stops. See troubleshooting-performance.md for the full ladder.

### Hygiene

- **Naming** that encodes scope and purpose: `WKS-Security-BitLocker`, `USR-Office-Drives`. A GPO named "New Policy (2)" linked at the domain root is a confession.
- **One-purpose policies**: small, single-topic GPOs cost a few milliseconds more at logon and repay it every time someone must answer "what happens if I unlink this?"
- **Versioned backups**: `Backup-GPO -All -Path ...` on a schedule, and before every edit of a broad policy. The GPMC has no undo.
- **Preferences versus policies**: policies enforce (registry "policy" keys, reverted when the GPO leaves); preferences configure defaults the user may change and *tattoo* unless "remove when no longer applied" is set. Drive maps and shortcuts are preferences work; security settings are policy work. Confusing the two produces the setting that mysteriously persists after the GPO is gone.
- **Pilot-OU staging is the safety rule** (see SKILL.md): new or changed policy links to a pilot OU with representative machines/users first, soaks, then moves broad. The Windows analog of one-host-before-all-hosts.

## Kerberos and NTLM

### The ticket exchange in plain terms

1. **AS exchange**: the client proves knowledge of the user's key (a timestamp encrypted with it — this is where clock skew kills) and receives a TGT, encrypted to the KDC's own krbtgt key.
2. **TGS exchange**: the client presents the TGT and asks for a service ticket to a specific SPN; the KDC returns a ticket encrypted to *that service account's* key.
3. **AP exchange**: the client presents the service ticket to the service, which decrypts it with its own key — no DC on the wire at access time. The PAC inside carries group membership.

Consequences worth teaching: SPN registration is why "Kerberos doesn't work but NTLM does" so often means a missing or duplicate SPN (`setspn -L`, `setspn -Q`); tickets are cached (`klist`) and group changes ride the next ticket, which is why "log off and back on" fixes membership problems; and the service account's password strength is exactly the ticket's resistance to offline cracking — the kerberoasting link, treated defensively in hardening-security.md.

**Clock skew**: Kerberos rejects authenticators outside the permitted skew (five minutes by default). The failure wears an authentication costume — logon errors, `KRB_AP_ERR_SKEW` — and the fix is time hierarchy, not account settings: PDC Emulator syncs to a reliable external source; everything else syncs domain hierarchy (`w32tm /query /source`, `w32tm /resync`). Ties to the author's time-integrity material: a domain without a deliberate time design has an authentication outage on layaway.

### Delegation's flavors, risk-ordered (worst first)

1. **Unconstrained delegation**: the service caches users' TGTs — a compromised host holding a domain admin's TGT is game over. Legacy; find it (`Get-ADComputer -Filter {TrustedForDelegation -eq $true}`) and eliminate it.
2. **Constrained delegation (KCD)**: limited to listed SPNs; protocol transition ("any protocol") re-widens the risk.
3. **Resource-based constrained delegation (RBCD)**: the *resource* decides who may delegate to it — the modern default, and also an attack surface when write access to the attribute is loose.

### NTLM's staged retirement

NTLM survives on IP-address access (no SPN), workgroup auth, and old applications. Microsoft has announced staged deprecation of NTLM with Kerberos successors (IAKerb, local KDC) in progress — the exact milestones are **verify-current, dated in the answer**. Treat removal as a migration project, not a switch: audit first (NTLM auditing GPOs, Event IDs 8001–8004 in the NTLM operational logs), fix the sources, restrict later (see hardening-security.md).

## Identity Lifecycle

- **Joiner-mover-leaver in AD terms**: joiner — account from a template/automation with group membership by role, never by copy-the-last-guy; mover — group changes with a re-logon note (ticket caching, above), OU move if delegation/policy changes; leaver — disable immediately, move to a Disabled OU with a dated description, delete on a retention schedule. Disabling does not kill existing Kerberos tickets or open sessions; forcing the point means resetting the password too and, where it matters, clearing sessions.
- **Service accounts**: the password-never-changes account is the finding that writes itself. The answer is the **gMSA** — AD manages and rotates the password, the host(s) retrieve it, nobody knows it. Requires the KDS root key once per forest (`Add-KdsRootKey`), then `New-ADServiceAccount` with `PrincipalsAllowedToRetrieveManagedPassword`. Where software can't use a gMSA, the fallback discipline: long random password, rotation calendar, no interactive logon rights, and an SPN inventory.

## AD Care

- **Backup**: system-state backup of at least two DCs per domain (Windows Server Backup or the org's tool, on a schedule someone verifies). Snapshots of DC VMs are not backups and pre-VM-GenerationID hypervisors made them USN-rollback grenades; on modern hypervisors GenerationID makes snapshots survivable, not good practice.
- **Restore flavors — stakes before steps, every time**:
  - **Non-authoritative** (the normal one): restore the DC, let replication overwrite it with current directory state. For "the DC died," this — or better, a clean new DC plus metadata cleanup — is the answer.
  - **Authoritative**: restore, then mark specific objects/subtrees authoritative (`ntdsutil` restore stage) so they replicate *outward*, resurrecting deleted data everywhere. This rewrites history for those objects across the domain. It is for "someone deleted the OU and the Recycle Bin can't help," and it is preceded by a written statement of exactly which objects and why.
- **The Recycle Bin**: enable it (forest-wide, one-way: `Enable-ADOptionalFeature 'Recycle Bin Feature' ...`) before you need it. Restores objects with attributes and memberships intact via `Restore-ADObject` or the AD Administrative Center — the difference between a five-minute fix and an authoritative-restore evening.
- **Tombstone lifetime** bounds how long deletions are remembered and therefore how long a DC or backup can be offline/old and still be safe to use. Check the actual value (`msDS-DeletionTime` era defaults vary by forest vintage) rather than assuming 180 days.
- **DC decommissioning done clean**: transfer FSMO roles off, demote (`Uninstall-ADDSDomainController`), verify DNS records and sites are cleaned, and only then power off. A DC that "went away" without demotion needs metadata cleanup (`ntdsutil` or, on any modern console, deleting the DC object in AD Users and Computers/Sites and Services, which performs cleanup) — leftover metadata is future replication errors on a delay timer.
