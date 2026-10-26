from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class EpisodicMemoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    input_text: str
    version: str
    final_answer: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    status: str = "ACTIVE"  # ACTIVE, INVALIDATED, SUPERSEDED
    confidence: float = 1.0
    provenance_hash: str = ""

    def model_post_init(self, __context: Any) -> None:
        if not self.provenance_hash:
            data = f"{self.input_text}:{self.version}:{self.final_answer}:{self.timestamp}"
            self.provenance_hash = hashlib.sha256(data.encode("utf-8")).hexdigest()[:24]


class EpisodicMemory:
    def __init__(self) -> None:
        self.items: list[EpisodicMemoryItem] = []

    def add(self, item: EpisodicMemoryItem) -> None:
        self.items.append(item)

    def retrieve(self, query: str, limit: int = 5) -> list[EpisodicMemoryItem]:
        query_terms = set(query.lower().split())
        scored: list[tuple[float, EpisodicMemoryItem]] = []
        for item in self.items:
            if item.status != "ACTIVE":
                continue
            text = (item.input_text + " " + item.final_answer).lower()
            item_terms = set(text.split())
            overlap = len(query_terms.intersection(item_terms))
            if overlap > 0:
                score = overlap / max(len(query_terms), 1)
                scored.append((score, item))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:limit]]

    def invalidate(self, item_id: str) -> bool:
        for item in self.items:
            if item.id == item_id:
                item.status = "INVALIDATED"
                return True
        return False
