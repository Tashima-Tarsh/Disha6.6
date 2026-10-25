# MITRE ATT&CK — Usage Guide

Canonical source: https://attack.mitre.org (verify current version there; ATT&CK releases twice yearly, typically April and October, and each release deprecates, merges, or revises techniques — a technique ID cited from memory may no longer exist or may have moved to a sub-technique).

## Structure you are working with

Three matrices: **Enterprise** (includes Cloud, Network, Containers, and platform-specific views), **Mobile**, and **ICS**. Pick the matrix that matches the system under analysis; a SCADA review mapped against Enterprise tactics is a category error.

Hierarchy: **Tactics** (the adversary's why — e.g., TA0001 Initial Access) → **Techniques** (the how — T1078 Valid Accounts) → **Sub-techniques** (the specific how — T1078.004 Cloud Accounts). Always map to the most specific level the evidence supports. Mapping to a bare technique when a sub-technique fits signals shallow analysis; mapping to a sub-technique the evidence doesn't support signals overconfidence.

Linked objects worth using: **Mitigations** (M-series, e.g., M1032 Multi-factor Authentication), **Detections/Data Sources** (DS-series), **Groups** (G-series) and **Software** (S-series) for threat-actor relevance, and **Campaigns**. D3FEND (https://d3fend.mitre.org) provides the defensive countermeasure knowledge graph that complements ATT&CK mitigations.

## Applying ATT&CK in architecture work

**Threat modeling a design.** Walk the architecture through the tactic sequence: for each tactic, ask which techniques are viable given this specific design, and record why viable techniques are viable (exposed attack surface, missing control, trust assumption). The output is not "all 200 techniques apply" — it is a defensible shortlist with per-technique rationale. Ten well-argued techniques beat an exhaustive matrix nobody reads.

**Prioritizing by threat actor.** When the user's sector implies specific adversaries (financial services → FIN groups, e.g.), filter through Groups/Campaigns to weight techniques those actors actually use. This converts generic hardening into threat-informed defense and gives leadership a narrative ("we prioritized these controls because they break the tradecraft of groups targeting our sector").

**Control-gap analysis.** Map existing controls to Mitigations, then invert: which relevant techniques have no mapped mitigation in this environment? Those are the gaps. Cross-reference NIST SP 800-53 controls via published ATT&CK-to-800-53 mappings (the Center for Threat-Informed Defense maintains these at https://center-for-threat-informed-defense.github.io/mappings-explorer/) rather than inventing crosswalks ad hoc.

**Detection coverage.** For SOC-facing work, map techniques to Data Sources and ask whether the telemetry exists at all before discussing detection logic. Missing telemetry is an architecture finding, not a SIEM tuning task.

## Pitfalls

- **Bingo-card syndrome.** Coverage heatmaps showing "we cover 60% of ATT&CK" are close to meaningless — techniques are not equiprobable, not equally impactful, and "coverage" conflates prevention, detection, and logging. Report coverage against the *relevant* technique shortlist, and separate prevent/detect/respond.
- **Static mappings.** A mapping done against v14 is not current. Date-stamp and version-stamp every mapping deliverable.
- **ATT&CK as a compliance list.** ATT&CK describes observed adversary behavior; absence of a technique from the matrix is not evidence a vector doesn't exist. Novel and environment-specific threats still require first-principles thinking (pair with STRIDE-style analysis for design-level threats ATT&CK doesn't enumerate, e.g., business-logic abuse).
