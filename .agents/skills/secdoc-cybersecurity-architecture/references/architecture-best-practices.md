# Security Architecture — Principles, Patterns, and Review Method

This file covers the practice layer that frameworks assume but don't teach: how to reason about a design and structure a review. It pairs with the framework references — principles here, citations there.

## Principles that do the work

Apply these as analysis questions against any design, not as slideware:

- **Least privilege & need-to-know** — for every identity (human, service, workload), what's the minimum it needs, and what does it actually have? The delta is the finding. Include standing privileged access (the answer to which should trend toward zero via JIT elevation).
- **Defense in depth** — assume each control fails; what catches it? A design whose security story depends on any single control (the WAF, the VPN, the EDR) has a finding at that point. Depth means *independent* layers — three controls that all depend on the same IdP are one layer.
- **Zero trust** (SP 800-207 as the reference model) — no implicit trust from network location; per-request/per-session access decisions via an explicit policy engine; continuous evaluation. In review terms: find every place the design says "internal, therefore trusted" and challenge it.
- **Fail secure, and know when you can't** — default-deny on failure for security decisions; but availability-critical paths (safety systems, payment authorization fallbacks) need an explicit, documented fail-open decision with compensating detection, not an accidental one.
- **Separation of duties & segmentation** — both people (dev vs. prod, requestor vs. approver) and systems (blast-radius containment; segmentation that's actually enforced and tested, not diagram-only).
- **Minimize attack surface & data** — every exposed interface, retained dataset, and installed component is standing risk. The cheapest control is not having the thing (see PCI scoping in `compliance.md` — the pattern generalizes).
- **Secure defaults, paved roads** — architectures that make the secure path the easy path (golden images, templates, centrally managed auth libraries) outperform architectures that rely on developer diligence. If a review finds the same flaw in five services, the finding is the missing paved road, not five service teams.
- **Assume breach** — the design must answer: how do we detect, contain, and recover when the perimeter control fails? Detection and response capability is an architecture property (telemetry existence, log integrity, containment seams), not just an operations function.
- **Kerckhoffs's principle, generalized** — no security through obscurity as a *primary* control. Obscurity as friction on top of real controls is fine; as the control, it's a finding.

## Reference models and where they help

- **SABSA** — business-attribute-driven layered architecture (contextual → conceptual → logical → physical → component). Its lasting value: forcing traceability from business requirement to control, so every control answers "why does this exist?"
- **TOGAF / enterprise architecture integration** — security architecture that lives outside the EA process gets bolted on late; embed security views into the standard architecture deliverables.
- **CIS Critical Security Controls & Benchmarks** — prioritized, implementation-flavored; useful as the "do these first" layer under 800-53's completeness, and Benchmarks as the hardening baseline for specific platforms.
- **OWASP** (ASVS for application requirements, SAMM for program maturity, Top 10s as awareness tools — not as a security standard).
- **Cloud**: CSA Cloud Controls Matrix, provider well-architected security pillars, and the shared-responsibility line — a large fraction of cloud findings are responsibility-model misunderstandings ("the provider handles backups/encryption/logging" where it doesn't). Verify the actual division for the services in play.
- **SP 800-218 SSDF** for secure development lifecycle; **SLSA** / supply-chain levels for build integrity where software supply chain is in scope.

## Architecture review method

1. **Inputs**: current-state diagram (demand data flows, not just network topology), data classification, identity inventory (human + non-human), external dependencies, and the threat model if one exists. If data flows aren't documented, drawing them *is* the first deliverable — most findings fall out of that exercise.
2. **Trace the crown jewels**: for the top 2–3 critical assets/flows, walk every path to them (network, identity, API, supply chain, backup/restore, admin plane). The admin plane and backup path are the classically under-reviewed routes.
3. **Challenge trust assumptions**: enumerate every implicit trust (network locality, upstream validation, vendor assurances, "internal users") and test each against the principles above and the ATT&CK techniques it would enable (`mitre-attack.md`).
4. **Map controls to threats, find the orphans**: threats with no control (gaps) and controls tied to no threat (cost/complexity candidates — complexity is itself an attack surface).
5. **Deliver in layers**: executive summary (business risk, top 3 actions), findings register (each: description, evidence, framework anchors — technique ID / control ID / requirement, risk rating with rationale, recommendation, effort), and the residual-risk statement (`SKILL.md` workflow step 5).

## Recommendation quality bar

Every recommendation should name: the specific change, the control/requirement it satisfies (with ID), the threat it addresses (with ID where applicable), a feasible implementation direction for *this* environment, and what it costs in complexity or operations. "Implement network segmentation" fails this bar; "segment the payment services into a dedicated zone with default-deny policy at [enforcement point], satisfying PCI DSS Req. 1.3.x and cutting the CDE scope to N systems; requires re-homing the two legacy interfaces first" passes it.
