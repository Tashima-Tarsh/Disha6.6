from __future__ import annotations

import re
from collections import Counter
from typing import Any

from ..database.store import SQLiteStore
from .base import GovernedAnalysisInput

_TOKEN = re.compile(r"\b[A-Z][A-Za-z0-9&._-]{2,}(?:\s+[A-Z][A-Za-z0-9&._-]{2,}){0,3}\b")
_URL = re.compile(r"https?://[^\s)\]>]+", re.I)


class MemoryGraphAnalyzer:
    component = "memory-graph"

    def __init__(self, store: SQLiteStore) -> None:
        self.store = store

    def analyze(self, payload: GovernedAnalysisInput) -> dict[str, Any]:
        entities = [m.group(0).strip() for m in _TOKEN.finditer(payload.raw_text)]
        urls = [m.group(0) for m in _URL.finditer(payload.raw_text)]
        counts = Counter(entities)
        # Read-only mission-scoped lookup. No graph or memory writes are performed.
        existing = self.store.get_graph(payload.mission_id, limit=100)
        existing_labels = [str(node.get("label", "")) for node in existing.get("nodes", [])]
        overlap = sorted({name for name in entities if name in existing_labels})

        observations = [
            {
                "title": "Memory graph projection",
                "description": (
                    f"Projected {len(counts)} distinct entity-like mention(s), {len(urls)} URL(s), "
                    f"and {len(payload.evidence_event_ids)} supplied evidence reference(s)."
                ),
                "confidence": 0.7,
                "sourceHashes": payload.source_hashes[:20],
            }
        ]
        if counts:
            observations.append({
                "title": "High-salience mentions",
                "description": ", ".join(name for name, _ in counts.most_common(8)),
                "confidence": 0.62,
                "sourceHashes": payload.source_hashes[:20],
            })
        if overlap:
            observations.append({
                "title": "Existing mission-memory overlap",
                "description": ", ".join(overlap[:8]),
                "confidence": 0.8,
                "sourceHashes": payload.source_hashes[:20],
            })
        return {
            "summary": "Memory Graph produced a read-only entity/evidence projection for retrieval and linkage.",
            "observations": observations[:12],
            "limitations": [
                "No memory node or edge is written by this governed analyzer.",
                "Entity-like mentions are retrieval candidates, not resolved identities; the web entity-resolution engine remains authoritative.",
            ],
        }
