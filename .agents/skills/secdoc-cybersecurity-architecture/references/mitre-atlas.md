# MITRE ATLAS — AI/ML System Threat Modeling

Canonical source: https://atlas.mitre.org. ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems) is the ATT&CK-style knowledge base for attacks against AI-enabled systems. It evolves faster than ATT&CK because the field does — verify current technique IDs before citing; do not rely on memorized AML.T-numbers.

## Structure

ATLAS mirrors ATT&CK's shape: tactics → techniques (IDs prefixed **AML.T**), with case studies (**AML.CS**) documenting real-world incidents and mitigations (**AML.M**). Some tactics are inherited from ATT&CK Enterprise (an AI system is still a system — initial access and exfiltration work the usual ways); the ATLAS-specific value is in the ML-native tactics and techniques: ML model access, ML attack staging, and techniques covering poisoning, evasion, extraction, and inference attacks, plus LLM-era additions (prompt injection, jailbreaking, LLM plugin/tool compromise, RAG data poisoning).

## The threat surface, organized by lifecycle

Map threats to where they enter the ML lifecycle — this is the framing that produces actionable architecture findings:

- **Data / training time**: training-data poisoning, label flipping, supply-chain compromise of datasets and pretrained/foundation models (a poisoned base model from a public hub is a supply-chain finding, not an ML curiosity).
- **Model / build time**: backdoored models, compromised ML frameworks and pipelines (treat the ML pipeline with the same rigor as a CI/CD pipeline — because it is one).
- **Inference / runtime**: evasion (adversarial examples), model extraction via query access, membership inference and training-data reconstruction (a privacy and regulatory finding, not just a technical one), prompt injection — both direct and indirect via retrieved content, tool output, or documents.
- **Application layer**: excessive agency in LLM tool use, insecure output handling (LLM output flowing into interpreters, SQL, or shells), RAG store poisoning, system-prompt leakage.

## Applying ATLAS in architecture work

**Scope decision first.** If the system merely *calls* a third-party model API, the threat model is dominated by application-layer and data-flow concerns (prompt injection paths, output handling, data sent to the provider). If the org *trains or fine-tunes*, the full lifecycle applies. State which posture you are analyzing.

**Pair ATLAS with ATT&CK, not instead of it.** AI systems fail through boring paths too — stolen credentials to the model registry (T1078) beat adversarial examples in most real incidents. Produce one combined threat model with both ID namespaces.

**Trust-boundary analysis for LLM apps.** The recurring architectural error is treating model output as trusted. Draw the boundary explicitly: anything a model emits after processing untrusted input is untrusted, and every consumer of that output (tool calls, code execution, downstream prompts) is an injection sink. Most LLM findings fall out of drawing this diagram honestly.

**Complementary sources to cite alongside ATLAS**: NIST AI 100-2 (Adversarial Machine Learning taxonomy) for terminology auditors increasingly expect; NIST AI RMF (AI 100-1) for governance framing; OWASP Top 10 for LLM Applications for application-layer coverage. Use ATLAS as the spine and these as reinforcement — verify current editions of each.

## Pitfalls

- Scoring AI findings with CVSS mechanically. Model extraction or poisoning often has no clean CVSS mapping; describe impact in business terms and use CVSS only where the finding is a conventional vulnerability in the serving stack.
- Recommending "adversarial robustness" abstractly. Name the control: input validation and content filtering at defined points, query rate/anomaly limits against extraction, provenance and signing for models and datasets, human approval gates on high-consequence agent actions, output encoding before execution sinks.
- Ignoring the governance layer. For regulated users, tie AI findings back to the control frameworks they already answer to (SP 800-53 SA/SI/RA families; SOC 2 if the AI feature is in scope of the system description) so the findings land in an existing remediation process instead of a novelty bucket.
