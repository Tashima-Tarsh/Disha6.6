from __future__ import annotations

import os
import tempfile
import pytest

from disha.brain.memory import MemoryStore


def test_memory_lifecycle_and_restart_persistence() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        storage_file = os.path.join(tmpdir, "test_memory.json")

        # 1. Initialize MemoryStore and create legitimate memory
        store1 = MemoryStore(persistence_file=storage_file)
        item = store1.update_from_result(
            input_text="critical energy grid cyber breach",
            version="6.6",
            final_answer="containment firewall rule applied",
        )

        assert item.status == "ACTIVE"
        assert item.provenance_hash is not None

        # 2. Retrieve in current session
        retrieved1 = store1.retrieve("energy grid")
        assert len(retrieved1) >= 1
        assert retrieved1[0]["final_answer"] == "containment firewall rule applied"

        # 3. Simulate process restart by instantiating new MemoryStore from same storage
        del store1
        store2 = MemoryStore(persistence_file=storage_file)

        # 4. Verify memory persisted across restart
        retrieved2 = store2.retrieve("energy grid")
        assert len(retrieved2) >= 1
        assert retrieved2[0]["id"] == item.id
        assert retrieved2[0]["final_answer"] == "containment firewall rule applied"

        # 5. Check contradiction detection
        conflict_check = store2.check_contradiction(
            input_text="critical energy grid cyber breach",
            candidate_answer="no breach occurred, system healthy",
        )
        assert conflict_check["contradiction_detected"] is True
        assert conflict_check["conflict_with_id"] == item.id

        # 6. Invalidate memory
        invalidated = store2.invalidate(item.id)
        assert invalidated is True

        # 7. Verify invalidated memory is excluded from active retrieval
        retrieved_after_inv = store2.retrieve("energy grid")
        assert len(retrieved_after_inv) == 0

        # 8. Verify invalidation persists across restart
        del store2
        store3 = MemoryStore(persistence_file=storage_file)
        retrieved_after_restart = store3.retrieve("energy grid")
        assert len(retrieved_after_restart) == 0

