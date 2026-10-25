# Cloud & Hybrid Infrastructure Security Architecture

## Scope

This domain covers the security architecture of cloud and hybrid estates: shared responsibility, landing zones and account structure, infrastructure-as-code security, cloud security tooling categories, workload identity, hybrid trust boundaries, multi-cloud, and container/Kubernetes security. Boundary with neighbors: cloud *network* connectivity and transit design compose with the networking-architecture skill; identity federation mechanics live in `domain-iam.md`; workload endpoint agents in `domain-endpoint.md`; pipeline security in `domain-appsec.md`. This file owns the cloud-native trust and control architecture the others plug into.

## Architecture patterns

**Shared responsibility — the domain's first honest conversation.** Every cloud review starts by drawing the actual responsibility line for the services in play, because a large fraction of cloud findings are misunderstandings of it ("the provider handles backups/encryption/logging" where it doesn't — see `architecture-best-practices.md`). The line moves per service model: IaaS leaves the customer the OS upward; managed PaaS/serverless shifts patching down to the provider but leaves configuration, identity, and data squarely with the customer — and *configuration of the customer's portion* is where cloud breaches overwhelmingly happen. Deliverable discipline: a responsibility matrix per service category, not a generic slide, verified against the provider's current documentation.

**Landing-zone architecture.** The landing zone is the estate's constitution: get it right early because retrofitting is an org-wide migration.
- **Account/subscription segmentation** as the coarse blast-radius control: separate accounts (AWS) / subscriptions (Azure) / projects (GCP) per environment and per workload sensitivity tier, grouped under an organization hierarchy (OUs / management groups / folders). An account boundary is the strongest isolation primitive the provider gives you — stronger than any in-account network control — so use it as the primary segmentation move.
- **Organization policy** enforced from the top: service control policies / Azure Policy / org policy constraints that make entire classes of misconfiguration impossible (no public object storage, no regions outside the approved list, no disabling of audit logging, mandatory encryption). Preventive guardrails at the org layer beat detective findings every time.
- **Centralized guardrails**: a security/audit account holding org-wide logs (control-plane audit trails, flow logs) with write-once retention the workload teams cannot alter; centralized identity (federated from the IdP — no per-account local users); break-glass procedures documented and tested; a defined path for new accounts to be born *inside* the guardrails (account vending) rather than adopted later.

**IaC security.** If the infrastructure is code, the security review point moves into the pipeline:
- **Policy-as-code** (OPA/Rego, provider policy engines, or the scanner category's rulesets) evaluated pre-merge and pre-apply — the same rules the CSPM checks at runtime, enforced before deployment so findings never ship.
- **Drift** as a first-class signal: divergence between declared state and actual state means either an unauthorized change or an emergency fix that bypassed the pipeline — both are findings; continuous drift detection with reconciliation policy (revert vs. import) is part of the design.
- **Pipeline enforcement points**: plan-time policy check, apply-time approval for privileged changes, and pipeline credentials that are themselves short-lived workload identities (below) rather than a static cloud admin key sitting in CI variables — the pipeline is the estate's most privileged identity and gets attacked as one.

**CSPM/CWPP/CNAPP — the category map, with what each actually detects.**
- **CSPM** (posture management): control-plane misconfiguration — public buckets, open security groups, missing encryption, IAM policy problems. Reads APIs; sees no workload internals.
- **CWPP** (workload protection): inside the workload — vulnerabilities, runtime behavior, malware on VMs/containers. Agent or agentless snapshot-based; sees no org-policy context.
- **CIEM** (entitlement management): the permissions graph — unused privileges, escalation paths, effective access. The cloud's least-privilege delta finder.
- **CNAPP**: the vendors' bundling of the above plus IaC scanning into one platform. The consolidation is real but uneven — evaluate against the specific detections needed, not the acronym. Whatever the tooling, the output only matters if findings route to owners with SLAs; a CSPM nobody triages is a dashboard of accepted risk.

**Workload identity — the managed-identity pattern versus long-lived keys.** Static access keys in config files are the cloud's default credential-theft vector. The pattern to architect toward: platform-issued, automatically rotated workload identities (instance/pod/function identity, workload identity federation for cross-cloud and CI) with permissions scoped per workload, and *no long-lived secrets at all* where the platform supports it. Residual static keys get inventory, rotation, and an owner — and a migration deadline. Cross-reference `domain-iam.md` (non-human identity) for the governance side.

**Hybrid trust boundaries.** The recurring hybrid failure is extending the on-prem trust model into cloud: the flat "internal = trusted" assumption rides the VPN/ExpressRoute/Direct Connect link into the VPC, and the domain trust follows it. Where the on-prem model must *not* extend: treat the interconnect as a policed boundary with explicit policy, not an extension cord; keep cloud identity able to survive on-prem identity compromise (protect the federation/sync tier — a compromised on-prem directory pivoting to cloud tenant admin is a well-worn incident pattern); and apply the SP 800-207 discipline — per-session, policy-based access decisions rather than network-location trust — at exactly this seam (`nist-sp.md`, zero trust). Legacy-to-cloud dependencies (cloud workloads authenticating against on-prem directories, on-prem backup of cloud data) each get drawn as data flows and challenged.

**Multi-cloud honesty.** Multi-cloud is usually a fact (acquisition, SaaS gravity, team preference) rather than a strategy. The cost of abstraction layers is real: portability frameworks and lowest-common-denominator tooling forfeit each provider's native controls (org policy, managed identity, native detection) — often a net security loss dressed as risk reduction. The defensible pattern: per-cloud native guardrails implemented to a common *policy* standard (one control objective, N native implementations), a normalization layer only for cross-cloud visibility (findings, inventory, identity), and honesty that active-active portability of regulated workloads is an expensive niche requirement, not a default.

**Container/Kubernetes security at working depth.** Four control points carry the architecture:
- **Admission control** — policy enforcement at the API server (validating admission: no privileged pods, no root, required resource limits, approved registries only) via the policy engine of choice; this is where cluster policy becomes real.
- **Image provenance** — trusted registry, build-time scanning, image signing and verification at admission, and base-image lifecycle management; ties into the supply-chain architecture in `domain-appsec.md` (SBOM, SLSA).
- **Runtime policy** — network policies default-deny between namespaces, runtime detection (syscall/behavioral), and workload identity for pod-to-service auth instead of mounted static secrets.
- **Cluster platform** — control-plane hardening per CIS Kubernetes Benchmark, RBAC scoped tightly (cluster-admin is the new domain admin), secrets encryption at rest, and audit logging shipped off-cluster. SP 800-190 remains the reference publication for container security (verify currency).

## Control mapping

- **SP 800-53 Rev. 5**: AC-2/AC-3/AC-6 (cloud IAM), CM-2/CM-3/CM-6 (IaC as configuration management), AU-2/AU-12 (control-plane audit), SC-7 (boundary — applied per-VPC/VNet and at the hybrid seam), SC-12/SC-13 (key management — with `domain-data-crypto.md`), SR family for provider and image supply chain, CA-7 (continuous monitoring — the CSPM's control home).
- **CSF 2.0**: Identify (ID.AM cloud asset inventory — harder and more important than on-prem), Protect (PR.AA, PR.PS platform security), Detect (DE.CM over control-plane telemetry).
- **ATT&CK**: Enterprise Cloud matrix techniques — T1078.004 (Cloud Accounts), the T1526/discovery cluster, T1552 (Unsecured Credentials) for the static-key problem; map per `mitre-attack.md`.
- **Compliance hooks**: shared-responsibility documentation feeds every regime's scoping; PCI DSS in cloud requires the responsibility matrix per requirement (the SSC's cloud guidance); SOC 2 system description must state the subservice organization (the provider) and carve-out method; CMMC CUI-in-cloud drives FedRAMP-authorized service selection; GDPR Art. 28 makes the provider a processor and Chapter V governs region/transfer choices — see `compliance.md`.

## Decision criteria

- **Cloud-first startup**: one provider, native guardrails, org policy from day one, no long-lived keys, CSPM early (misconfiguration is the whole threat model at this stage).
- **Enterprise migrating**: landing zone before workloads — an account structure retrofit mid-migration is the most expensive redo in cloud; hybrid identity tier protected as crown jewels; interconnect treated as a boundary from the first day.
- **Regulated workloads**: account-level isolation for the regulated scope (the cloud version of the PCI/CUI enclave pattern — see `compliance.md`), provider services chosen from the compliance-authorized catalog, region and transfer constraints designed in.
- **Multi-cloud reality**: common policy standard, native implementation, unified findings — and a written statement of which provider is primary for which workload class, so "multi-cloud" doesn't mean "no standards anywhere."

## Assessment questions

- Show me the responsibility matrix for the top three service categories in use. Who verified it against provider documentation, and when?
- How does a new account/subscription get created, and can one exist outside the org hierarchy and its guardrails?
- What prevents a public storage bucket — a detective finding after the fact, or a preventive org policy? List the classes of misconfiguration that are *impossible* here.
- How many long-lived cloud access keys exist, what do the oldest five have access to, and who owns their retirement?
- If the on-prem directory were compromised this afternoon, what stops the attacker from reaching cloud tenant admin?
- What percentage of infrastructure changes go through the IaC pipeline versus the console, and what happens to console drift?
- For Kubernetes: what does admission control actually block today — show a rejected deployment from the last month.
- Where does control-plane audit logging go, who can modify or delete it, and how long is it searchable?
