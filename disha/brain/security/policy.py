from __future__ import annotations

import re
from pathlib import Path

from ..config import settings
from ..models.schemas import DecisionAction, RiskLevel, UserCommand

HIGH_RISK_PATTERNS = [
    r"rm\s+-rf",
    r"format\s+disk",
    r"delete\s+all",
    r"shutdown",
    r"disable\s+security",
    r"reveal\s+secret",
]

MEDIUM_RISK_PATTERNS = [
    r"write\s+file",
    r"modify\s+config",
    r"run\s+command",
]

ALLOWED_MODULE_ACTIONS: dict[str, set[str]] = {
    "strategy": {"overview"},
    "integrations": {"list", "describe"},
}


class SecurityPolicy:
    def __init__(self, workspace_root: str | None = None) -> None:
        self.workspace_root = Path(
            workspace_root or settings.allowed_workspace
        ).resolve()

    def classify_command(
        self, command: UserCommand
    ) -> tuple[RiskLevel, DecisionAction, list[str]]:
        text = command.text.lower()
        reasons: list[str] = []

        for pattern in HIGH_RISK_PATTERNS:
            if re.search(pattern, text):
                reasons.append(f"Matched high-risk pattern: {pattern}")
                return RiskLevel.high, DecisionAction.block, reasons

        for pattern in MEDIUM_RISK_PATTERNS:
            if re.search(pattern, text):
                reasons.append(f"Matched medium-risk pattern: {pattern}")
                if command.confirmed:
                    return RiskLevel.medium, DecisionAction.allow, reasons
                return RiskLevel.medium, DecisionAction.ask, reasons

        return RiskLevel.low, DecisionAction.allow, ["Read-only or low-risk request"]

    def ensure_workspace_path(self, raw_path: str) -> Path:
        """
        Constitutional path containment.
        Uses proper relative resolution — never string prefix matching.
        """
        candidate = (self.workspace_root / raw_path).resolve()
        try:
            candidate.relative_to(self.workspace_root)
        except ValueError:
            raise PermissionError("Path escapes allowed workspace root") from None
        return candidate

    def authorize_module_action(
        self, module: str, action: str
    ) -> tuple[DecisionAction, list[str]]:
        allowed = ALLOWED_MODULE_ACTIONS.get(module, set())
        if action in allowed:
            return DecisionAction.allow, ["Allowed module action"]
        return DecisionAction.block, [f"Module action not allowed: {module}.{action}"]
