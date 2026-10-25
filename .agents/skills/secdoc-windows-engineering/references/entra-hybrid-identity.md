# Entra ID and Hybrid Identity

The cloud identity plane and the bridge to it. Read this for Entra ID (formerly Azure AD) questions, hybrid identity design, Conditional Access, device identity, privileged identity, and the Intune boundary.

**Perishability warning, strongest in this file**: feature names, licensing-tier placements, portal blade names, and sync-tool capabilities all move. Mechanics below are durable; every tier claim and product status is verify-at-use-time, dated in the answer.

## Contents
- [Entra's object model versus AD's](#entras-object-model-versus-ads)
- [Hybrid identity: the load-bearing decision](#hybrid-identity-the-load-bearing-decision)
- [Device identity states](#device-identity-states)
- [Conditional Access as policy architecture](#conditional-access-as-policy-architecture)
- [Privileged identity](#privileged-identity)
- [Licensing tiers](#licensing-tiers)
- [Intune at the boundary](#intune-at-the-boundary)

## Entra's Object Model Versus AD's

Entra ID is not "AD in the cloud," and the differences are the syllabus:

| | Active Directory | Entra ID |
|---|---|---|
| Structure | Forest > domain > OU hierarchy | Flat tenant; no OUs — administrative units are the partial analog |
| Protocols | Kerberos, NTLM, LDAP | OAuth 2.0, OpenID Connect, SAML — token-based web auth |
| Policy engine | Group Policy | Conditional Access + Intune profiles |
| Query/automation | AD module, LDAP | Microsoft Graph (API and PowerShell SDK) |
| Trust model | Domain/forest trusts | Federation, B2B guest objects, cross-tenant access settings |

- Groups: security and Microsoft 365 groups, assigned or **dynamic** (rule-driven membership — the automation primitive OUs never were).
- **App registrations versus enterprise applications — the distinction that confuses everyone**: an *app registration* is the application's definition (its identity, its permission requirements) living in the tenant that owns the code; an *enterprise application* (service principal) is that app's local instance in *your* tenant — where you assign users, grant consent, and apply Conditional Access. One registration, many tenants' service principals. When someone "can't find the app" in one blade, it's usually defined in the other.
- Consent and Graph permissions (delegated versus application permissions) are where over-privileged automation hides; application permissions with admin consent are the service-account-with-domain-admin of the cloud era.

## Hybrid Identity: The Load-Bearing Decision

Two syncing tools: **Entra Connect Sync** (the full on-prem engine: filtering, writeback options, the heavyweight) and **Entra Cloud Sync** (lightweight agent, cloud-managed, multi-forest-friendly, but a shorter feature list — verify the current capability gap before choosing). Then the authentication decision:

| | Password Hash Sync (PHS) | Pass-Through Auth (PTA) | Federation (AD FS) |
|---|---|---|---|
| Where auth happens | In Entra, against a synced hash-of-the-hash | In AD, via on-prem agents Entra calls | At your AD FS farm |
| Survives on-prem outage | **Yes** — the resilience argument | No — agents down, cloud auth down | No — farm down, everything down |
| Operational bill | Lowest; no auth infrastructure | Agents (≥3) to run and monitor | An entire HA farm + certs + patching — the highest bill in identity |
| Honest reasons to pick it | Default; also enables leaked-credential detection | Policy forbids any password-derived material in cloud; want instant on-prem disable enforcement | Third-party MFA/smartcard requirements or legacy claims apps that only federation satisfies |

The recommendation pattern that survives review: **PHS as the default**, PTA when a written policy actually forbids hash sync (and note the resilience trade explicitly), federation only when a named requirement forces it — and existing AD FS estates get a migration conversation, not a defense. PHS alongside PTA/federation as a backup auth path is cheap insurance. Password writeback (self-service reset changing the AD password) is the feature that makes users stop calling the helpdesk; note its licensing tier at answer time.

## Device Identity States

| State | What it is | What it unlocks |
|---|---|---|
| **Entra registered** | Personal device, user added a work account | Conditional Access visibility, MAM; the BYOD state |
| **Entra joined** | Org device, cloud-only join, cloud sign-in | Full Intune management, Windows Hello for Business, SSO to cloud; the modern default for new estates |
| **Hybrid joined** | AD-joined machine also registered in Entra (via Connect) | GPO *and* cloud visibility; the transition state |

The design honesty: hybrid join is a bridge, not a destination — it drags a line-of-sight-to-DC dependency into every provisioning and sometimes logon path. Entra-joined devices still reach on-prem resources (Kerberos via Cloud Kerberos Trust / returned tickets — capability details verify-current), which removes the historical reason most orgs chose hybrid. New device estates: Entra joined unless a named dependency (legacy GPO-only control, on-prem-auth app that can't) says otherwise, and that dependency gets an expiry date.

## Conditional Access as Policy Architecture

Conditional Access is the tenant's policy engine: **assignments** (who — users/groups/roles; what — apps/actions; conditions — device platform, location/named networks, client app, sign-in and user risk with the licensing note below) and **access controls** (block, or grant-with-requirements: MFA, compliant device, hybrid/Entra-joined device, app protection; plus session controls like sign-in frequency).

The disciplines, non-negotiable per SKILL.md:

1. **Break-glass first**: at least one (better: two) cloud-only Global Admin accounts, excluded from *every* CA policy, phishing-resistant credentials stored offline, sign-ins alerted on. Named before the first policy is drafted.
2. **Report-only mode first**: every new policy runs report-only; sign-in logs show what it *would* have done; only after the soak does it enforce. The lockout that takes out the admins is the classic self-inflicted Entra outage, and report-only is how it doesn't happen here.
3. Policy hygiene mirrors GPO hygiene: named by intent (`CA01-Require-MFA-AllUsers-AllApps`), one purpose each, and the exclusion groups reviewed on a calendar because exclusions are where policies rot.
4. Baseline set for any tenant: require MFA for all users, block legacy authentication (verify current default-enforcement status — Microsoft has been turning legacy auth off tenant-wide in stages), require compliant or joined devices for corporate apps, and stricter controls (phishing-resistant MFA, shorter sessions) for admin roles.

**Phishing-resistant MFA on Windows is the design bar**: Windows Hello for Business (key- or certificate-based, gesture unlocks a local key, nothing replayable crosses the wire) and FIDO2 security keys. This ties to the author's standing SP 800-63 framing — phishing-resistant authenticators (AAL3-aligned) for admins first, then broadly; OTP and push approvals are the floor being raised away from, with number matching as the interim hardening for push.

## Privileged Identity

**PIM** (Privileged Identity Management) makes admin roles *eligible* rather than permanent: activation on demand, time-boxed, with optional approval, MFA-on-activation, and justification — turning standing privilege into audited, expiring privilege. **Access reviews** put recertification of roles and group memberships on a schedule with an owner. Together they are the cloud tiering model's enforcement half.

The edition-honesty note, stated wherever PIM is recommended: PIM and risk-based Conditional Access sit in the premium Entra tiers (verify current tier names and placements at answer time). For the shop that doesn't license them, the un-glamorous substitutes still work: separate admin accounts, as few Global Admins as possible (single digits; two minimum for lockout resilience), MFA enforced on all of them, and a manual quarterly review someone owns by name. "Just use PIM" is not an answer for a ten-seat office.

## Licensing Tiers

Standing pattern, not a static table: features named in this file — Conditional Access itself, risk-based conditions, PIM, access reviews, password writeback, and their kin — distribute across Entra ID Free / P1 / P2 (and governance add-ons), and the distribution changes. The rule from SKILL.md applies with full force: **verify the tier placement at answer time and date it in the answer.** A licensing claim recalled from memory is the fastest way this skill ships a wrong answer.

## Intune at the Boundary

Working depth here; full MDM depth deferred to its own territory.

- **Enrollment**: automatic for Entra-joined devices (and via GPO/Connect for hybrid), Autopilot for provisioning (platform-install-internals.md), Company Portal for BYOD.
- **Compliance policies feeding Conditional Access** is the load-bearing integration: compliance policy defines healthy (encryption on, OS minimum, Defender active, no jailbreak), the device reports, and CA's "require compliant device" turns that health signal into an access gate. Compliance without a CA policy consuming it is a report; with one, it's a control.
- **Configuration profiles are GPO's cloud-era counterpart**: settings catalog and templates deliver what ADMX-backed GPO delivered, over the internet, no domain line-of-sight — plus ADMX-imported settings for the long tail. Group Policy analytics tooling exists to inventory which GPOs have Intune equivalents; treat its findings as a starting inventory, not a migration plan.
- The staging discipline carries over intact: assignment to a pilot group before broad assignment is the pilot-OU rule wearing cloud clothes.
