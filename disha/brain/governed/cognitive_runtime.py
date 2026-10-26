from __future__ import annotations

import re
from typing import Any

from .base import GovernedAnalysisInput

_NEGATION = re.compile(r"\b(no|not|never|none|without|denied|false|did not|is not)\b", re.I)
_UNCERTAINTY = re.compile(r"\b(may|might|could|possibly|likely|unlikely|reportedly|allegedly|unclear|unknown)\b", re.I)
_CAUSAL = re.compile(r"\b(because|caused by|due to|therefore|resulted in|led to|driven by)\b", re.I)
_NUMBER = re.compile(r"(?<!\w)(?:₹|\$)?\d+(?:\.\d+)?(?:\s?%|\s?(?:million|billion|crore|lakh))?", re.I)


class CognitiveEngineAnalyzer:
    component = "cognitive-engine"

    def analyze(self, payload: GovernedAnalysisInput) -> dict[str, Any]:
        sentences = _sentences(payload.raw_text)
        hypotheses = [s for s in sentences if _CAUSAL.search(s) or _UNCERTAINTY.search(s)]
        factual_candidates = [s for s in sentences if _NUMBER.search(s) or len(s.split()) >= 6]
        uncertain = [s for s in sentences if _UNCERTAINTY.search(s)]
        positive = [s for s in sentences if not _NEGATION.search(s)]
        negative = [s for s in sentences if _NEGATION.search(s)]

        observations: list[dict[str, Any]] = []
        if hypotheses:
            observations.append({
                "title": "Candidate hypotheses",
                "description": " | ".join(hypotheses[:4]),
                "confidence": 0.58,
                "sourceHashes": payload.source_hashes[:20],
            })
        if uncertain:
            observations.append({
                "title": "Uncertainty markers",
                "description": f"{len(uncertain)} statement(s) contain explicit uncertainty language; preserve them as hypotheses rather than facts.",
                "confidence": 0.9,
                "sourceHashes": payload.source_hashes[:20],
            })
        if positive and negative:
            observations.append({
                "title": "Potential competing propositions",
                "description": "The supplied text contains both affirmative and negative propositions; semantic contradiction analysis is required before consolidation.",
                "confidence": 0.72,
                "sourceHashes": payload.source_hashes[:20],
            })
        if not observations:
            observations.append({
                "title": "Cognitive decomposition",
                "description": f"Identified {len(factual_candidates)} proposition candidate(s) requiring evidence-backed validation.",
                "confidence": 0.55,
                "sourceHashes": payload.source_hashes[:20],
            })

        return {
            "summary": (
                f"Cognitive engine decomposed {len(sentences)} sentence(s), "
                f"{len(hypotheses)} hypothesis candidate(s), and {len(uncertain)} explicit uncertainty marker(s)."
            ),
            "observations": observations[:12],
            "limitations": [
                "This deterministic cognitive pass identifies propositions and uncertainty; it does not promote them to facts.",
                "Claim truth remains dependent on independently sourced evidence and contradiction analysis.",
            ],
        }


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", text.strip()) if part.strip()][:100]
