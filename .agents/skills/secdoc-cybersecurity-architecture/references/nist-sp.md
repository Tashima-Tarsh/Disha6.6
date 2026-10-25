# NIST Publications — Usage Guide

Canonical source: https://csrc.nist.gov/publications. Always cite the revision ("SP 800-53 Rev. 5", "SP 800-171 Rev. 3") — recommendations differ materially across revisions, and several SPs revised recently. Verify current revision before citing anything version-sensitive.

## The map — which SP answers which question

| Question | Publication |
|---|---|
| What controls exist, and what do they require? | **SP 800-53 Rev. 5** (control catalog); **800-53A** (assessment procedures); **800-53B** (baselines: Low/Moderate/High + privacy) |
| How do we run the risk/authorization lifecycle? | **SP 800-37 Rev. 2** (RMF: Prepare → Categorize → Select → Implement → Assess → Authorize → Monitor) |
| How do we conduct a risk assessment? | **SP 800-30 Rev. 1** (threat sources → events → vulnerabilities → likelihood → impact → risk) |
| How do we categorize impact? | **FIPS 199** + **SP 800-60** (C/I/A high-water mark) |
| Protecting CUI in nonfederal systems? | **SP 800-171** (requirements; Rev. 3 realigned to 800-53 Rev. 5) + **800-171A** (assessment) — the CMMC substrate |
| Zero trust? | **SP 800-207** (architecture concepts: PDP/PEP, per-session least-privilege access decisions) |
| Identity and authentication? | **SP 800-63-4 suite** (63A proofing / IAL, 63B authentication / AAL, 63C federation / FAL) |
| Overall program framing for executives? | **CSF 2.0** (Govern, Identify, Protect, Detect, Respond, Recover) |
| Incident response? | **SP 800-61** | 
| Crypto? | **FIPS 140-3** (module validation), **SP 800-131A** (algorithm transitions), **SP 800-57** (key management) |
| Supply chain (C-SCRM)? | **SP 800-161 Rev. 1** |
| AI security? | **AI RMF (AI 100-1)**, **AI 100-2** (adversarial ML) — see `mitre-atlas.md` |

Others exist (800-92 logging, 800-115 testing, 800-190 containers, 800-218 SSDF for secure development); search CSRC when the topic is specialized rather than guessing an SP number.

## Working with SP 800-53 Rev. 5

Controls are organized in 20 families (AC, AT, AU, CA, CM, CP, IA, IR, MA, MP, PE, PL, PM, PS, PT, RA, SA, SC, SI, SR). Cite at enhancement granularity: **AC-2** (Account Management) is a different obligation from **AC-2(1)** (automated account management). When mapping an implementation to a control, quote or paraphrase the control's actual requirement language — control *titles* are misleading shorthand.

**Baseline selection and tailoring.** Start from the 800-53B baseline matching the FIPS 199 categorization, then tailor: add controls the risk assessment demands, document every removal with rationale. A tailored baseline without documented tailoring decisions will not survive assessment. For nonfederal commercial work, baselines are a starting scaffold, not a mandate — say so, and tailor to the actual risk.

**Rev. 5 specifics worth remembering**: outcome-based language (no more "the organization..."), privacy integrated throughout plus the PT family, and the SR (Supply Chain Risk Management) family — SR is where most modern architectures are thinnest, so check it deliberately.

## Working with SP 800-30 risk assessments

Keep the chain explicit in deliverables: threat source → threat event → vulnerability/predisposing condition → likelihood → impact → risk. Each risk-register entry should be traceable through that chain; "ransomware risk: high" is not an assessment. Use the 800-30 appendix scales (or the org's calibrated equivalents) and state which scale you used. Distinguish this from threat modeling: risk assessment quantifies and prioritizes at system/org level; threat modeling (ATT&CK/STRIDE) enumerates attack paths at design level. They feed each other and are not interchangeable.

## Crosswalking

NIST publishes mappings you should use instead of building your own: 800-53 ↔ CSF, 800-53 ↔ ISO 27001 Annex A, 800-171 ↔ 800-53. For ATT&CK ↔ 800-53, use the Center for Threat-Informed Defense mappings (see `mitre-attack.md`). Cite the mapping's source and date — mappings lag revisions.

## Pitfalls

- Citing 800-53 controls at family level ("implement AC controls") — meaningless. Enhancement-level or nothing.
- Treating CSF as a control catalog. CSF organizes and communicates; 800-53 specifies. CSF for the board slide, 800-53 for the engineering ticket.
- Presenting 800-207 zero trust as a product category. It is an architecture pattern (policy decision/enforcement point separation, continuous evaluation, no implicit trust by network location); map vendor claims onto the 800-207 components rather than accepting "we bought zero trust."
