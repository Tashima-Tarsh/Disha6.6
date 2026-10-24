# Implementation Roadmap — Constitutional Path to World Uniqueness

---

## Phase 0 — Foundation (Now)

**Objective**: Stop the bleeding and lock the principles.

- [x] Land CONSTITUTION.md
- [x] Land rearchitecture blueprint and supporting specs
- [ ] Authenticate OSINT backend + restrict CORS
- [ ] Path sandbox on data loading
- [ ] Force auth on OSINT proxies
- [ ] MCP fail-closed + session isolation
- [ ] Fix Brain path containment
- [ ] Publicly and in code declare all cognitive/Vyuha output as advisory

**Exit Criteria**: No critical unauthenticated surfaces remain. Constitution is the highest document.

---

## Phase 1 — Spine (4–6 weeks)

**Objective**: Make evidence and policy the rigid backbone.

- Create `packages/contracts` with VerificationState, EvidenceEvent, Adapter interfaces
- Implement Evidence Ledger v3 (hash-chained)
- Implement minimal Adapter Bus
- Migrate first 5–8 high-quality public adapters behind the Bus
- Ensure every adapter result and policy decision emits EvidenceEvents
- Truthful readiness endpoint

**Exit Criteria**: End-to-end flow from adapter → evidence → policy → review is working and reconstructible.

---

## Phase 2 — Product Core (4–6 weeks)

**Objective**: Deliver the unique user experience.

- Durable Mission / Case lifecycle
- Human Review Console
- Evidence Explorer (timeline + hash chain view)
- Policy Console
- Basic geospatial + graph views tied to evidence

**Exit Criteria**: An analyst can run a mission and produce a fully provenance-backed report.

---

## Phase 3 — Premium Polish (3–4 weeks)

**Objective**: Make the experience feel world-class.

- High-density, calm Mission Workbench UX
- Motion and information design worthy of a premium product
- Report export with full evidence package
- Observability that does not leak sensitive payloads

**Exit Criteria**: The product feels distinctly more trustworthy and professional than any competitor.

---

## Phase 4 — Controlled Expansion & Assurance

- Add new adapters only after legal + quality + evidence review
- Multi-tenant isolation (if required)
- Optional cryptographic signing of evidence chains
- Proven backup and restore (Disaster Recovery)
- External audit readiness

---

## Governing Rule for All Phases

If a change increases capability but decreases reconstructibility or weakens a trust boundary, it is rejected.
