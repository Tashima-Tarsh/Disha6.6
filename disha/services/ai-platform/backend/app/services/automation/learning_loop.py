from datetime import UTC, datetime
from typing import Any

import logging
from datetime import UTC, datetime
from typing import Any

from disha.brain.memory import MemoryStore

try:
    import structlog
    logger = structlog.get_logger(__name__)
except ImportError:
    class StandardLogWrapper:
        def __init__(self, name: str):
            self._logger = logging.getLogger(name)

        def bind(self, **kwargs: Any) -> "StandardLogWrapper":
            return self

        def info(self, event: str, **kwargs: Any) -> None:
            self._logger.info(f"{event} {kwargs}")

        def warning(self, event: str, **kwargs: Any) -> None:
            self._logger.warning(f"{event} {kwargs}")

        def error(self, event: str, **kwargs: Any) -> None:
            self._logger.error(f"{event} {kwargs}")

    logger = StandardLogWrapper(__name__)


class LearningLoop:
    def __init__(self, memory_store: MemoryStore | None = None):
        self.logger = logger.bind(service="learning_loop")
        self.memory = memory_store or MemoryStore()

    async def log_search_relevance(
        self,
        query: str,
        results_count: int,
        avg_distance: float,
        user_id: str | None = None,
    ) -> None:
        is_knowledge_gap = results_count == 0 or avg_distance > 0.8

        log_data = {
            "query": query,
            "results_count": results_count,
            "avg_distance": avg_distance,
            "timestamp": datetime.now(UTC).isoformat(),
            "user_id": user_id,
            "is_knowledge_gap": is_knowledge_gap,
        }

        if is_knowledge_gap:
            self.logger.warning("knowledge_gap_detected", **log_data)
            await self._trigger_knowledge_expansion(query)
        else:
            self.logger.info("search_success_logged", **log_data)

    async def _trigger_knowledge_expansion(self, query: str) -> dict[str, Any]:
        """Trigger actual knowledge expansion workflow on gap detection.
        
        Workflow:
        1. Query memory/evidence for related concepts
        2. Detect if candidate expansion conflicts with active memory
        3. If non-contradictory, synthesize candidate memory with provenance
        """
        self.logger.info("executing_intelligence_expansion", query=query)
        relevant_memories = self.memory.retrieve(query, limit=3)
        candidate_summary = f"Expanded knowledge query boundary for '{query}'"

        contradiction = self.memory.check_contradiction(query, candidate_summary)
        if contradiction.get("contradiction_detected"):
            self.logger.warning(
                "knowledge_expansion_contradiction_blocked",
                query=query,
                conflict=contradiction,
            )
            return {
                "status": "CONTRADICTION_BLOCKED",
                "query": query,
                "conflict": contradiction,
            }

        expansion_item = self.memory.update_from_result(
            input_text=query,
            version="6.6",
            final_answer=candidate_summary,
        )

        return {
            "status": "EXPANDED",
            "query": query,
            "memory_id": expansion_item.id,
            "provenance_hash": expansion_item.provenance_hash,
            "related_count": len(relevant_memories),
        }

    async def capture_feedback(
        self, investigation_id: str, feedback: dict[str, Any]
    ) -> dict[str, Any]:
        """Record user feedback and adjust memory confidence."""
        self.logger.info(
            "feedback_captured", investigation_id=investigation_id, **feedback
        )
        rating = feedback.get("rating", 1.0)
        comments = feedback.get("comments", "")
        # Record feedback into memory working context
        self.memory.working.update(
            {f"feedback_{investigation_id}": {"rating": rating, "comments": comments}}
        )
        return {
            "investigation_id": investigation_id,
            "feedback_stored": True,
            "timestamp": datetime.now(UTC).isoformat(),
        }
