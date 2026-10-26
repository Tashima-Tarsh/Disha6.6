from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..brain.anomaly import AnomalyDetector
from ..brain.decision import DecisionEngine
from ..brain.executor import Executor
from ..brain.intelligence import IntelligenceBrain
from ..brain.memory import MemoryBrain
from ..brain.planner import Planner
from ..brain.reasoning import ReasoningBrain
from ..brain.risk_engine import RiskEngine
from ..database.store import SQLiteStore
from ..governed import GovernedRuntimeRegistry
from ..governed.base import GovernedAnalysisInput
from ..graph import DishaAgenticGraph, DishaGraphResult, GraphInput
from ..models.schemas import (
    CommandResponse,
    DecisionAction,
    HealthResponse,
    MemoryItem,
    RiskLevel,
    TelemetryEvent,
    UserCommand,
)
from ..modules.integrations_adapter import describe_integration, list_integrations
from ..modules.models import (
    IntegrationDescribeResponse,
    IntegrationsListResponse,
    ModulesHealthResponse,
    StrategyOverviewResponse,
)
from ..modules.registry import collect_external_modules_health
from ..modules.strategy_adapter import strategy_overview
from ..monitoring.service import MonitoringService
from ..security.auth import require_api_token
from ..security.policy import SecurityPolicy


class AppContext:
    def __init__(self) -> None:
        self.store = SQLiteStore()
        self.policy = SecurityPolicy()
        self.reasoning = ReasoningBrain()
        self.planner = Planner()
        self.intelligence = IntelligenceBrain()
        self.memory = MemoryBrain(self.store)
        self.executor = Executor(self.store, self.policy)
        self.anomaly = AnomalyDetector()
        self.risk_engine = RiskEngine()
        self.decision_engine = DecisionEngine()
        self.graph = DishaAgenticGraph()
        self.governed_runtime = GovernedRuntimeRegistry(self.store)
        self.monitoring: MonitoringService | None = None

    def module_health(self) -> dict[str, str]:
        modules = {
            "database": "ok" if self.store else "degraded",
            "security_policy": "ok" if self.policy else "degraded",
            "reasoning_brain": "ok" if self.reasoning else "degraded",
            "planner": "ok" if self.planner else "degraded",
            "intelligence_brain": "ok" if self.intelligence else "degraded",
            "memory_brain": "ok" if self.memory else "degraded",
            "executor": "ok" if self.executor else "degraded",
            "anomaly_detector": "ok" if self.anomaly else "degraded",
            "risk_engine": "ok" if self.risk_engine else "degraded",
            "decision_engine": "ok" if self.decision_engine else "degraded",
            "agentic_graph": "ok" if self.graph else "degraded",
            "governed_runtime": "ok" if self.governed_runtime else "degraded",
            "monitoring": "ok" if self.monitoring else "degraded",
        }
        return modules


context = AppContext()
router = APIRouter(prefix="/api/v1")


def get_context() -> AppContext:
    return context




class GovernedResearchContext(BaseModel):
    selectedLenses: list[str] = Field(default_factory=list, max_length=20)
    evidenceEventIds: list[str] = Field(default_factory=list, max_length=200)
    sensitivity: str = "public"


class GovernedResearchConstraints(BaseModel):
    noExternalActions: bool = True
    noStateMutation: bool = True
    requireSourceHashes: bool = True
    maxRuntimeMs: int = Field(default=2500, ge=100, le=5000)


class GovernedResearchRequest(BaseModel):
    contractVersion: str
    requestId: str
    missionId: str
    component: str
    mode: str
    rawText: str = Field(max_length=20000)
    context: GovernedResearchContext
    constraints: GovernedResearchConstraints


class WebAuditEventIn(BaseModel):
    requestId: str
    userId: str | None = None
    action: str
    resource: str | None = None
    outcome: str
    metadata: dict = Field(default_factory=dict)


class CacheValueOut(BaseModel):
    contentType: str
    bodyText: str
    createdAt: int


class GraphUpsertIn(BaseModel):
    userId: str
    text: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    modules = context.module_health()
    status = "ok" if all(value == "ok" for value in modules.values()) else "degraded"
    return HealthResponse(
        status=status,
        version="1.0.0",
        websocket_path="/ws/alerts",
        modules=modules,
    )




@router.get(
    "/governed/health",
    dependencies=[Depends(require_api_token)],
)
async def governed_health(app: AppContext = Depends(get_context)) -> dict:
    return {
        "contractVersion": "disha.research-runtime.v1",
        "status": "ok",
        "components": app.governed_runtime.components,
        "message": "Independent read-only DISHA Brain, Cognitive Engine, and Memory Graph analyzers are available.",
    }


@router.post(
    "/governed/analyze",
    dependencies=[Depends(require_api_token)],
)
async def governed_analyze(
    payload: GovernedResearchRequest, app: AppContext = Depends(get_context)
) -> dict:
    if payload.contractVersion != "disha.research-runtime.v1":
        raise HTTPException(status_code=400, detail="unsupported_contract_version")
    if payload.mode != "read_only" or not payload.constraints.noExternalActions or not payload.constraints.noStateMutation:
        raise HTTPException(status_code=400, detail="governed_runtime_requires_read_only_constraints")
    if payload.component not in app.governed_runtime.components:
        raise HTTPException(status_code=400, detail="unsupported_component")

    import hashlib
    source_material = [payload.rawText, *payload.context.evidenceEventIds]
    source_hashes = [hashlib.sha256(item.encode("utf-8")).hexdigest() for item in source_material if item][:50]
    analysis_input = GovernedAnalysisInput(
        request_id=payload.requestId,
        mission_id=payload.missionId,
        raw_text=payload.rawText,
        selected_lenses=payload.context.selectedLenses,
        evidence_event_ids=payload.context.evidenceEventIds,
        sensitivity=payload.context.sensitivity,
        source_hashes=source_hashes,
    )
    try:
        analysis = app.governed_runtime.analyze(payload.component, analysis_input)
    except KeyError:
        raise HTTPException(status_code=400, detail="unsupported_component") from None

    return {
        "contractVersion": "disha.research-runtime.v1",
        "component": payload.component,
        "status": "ok",
        "summary": analysis["summary"],
        "observations": analysis["observations"],
        "sourceHashes": source_hashes,
        "limitations": analysis["limitations"],
    }


@router.post(
    "/graph/invoke",
    response_model=DishaGraphResult,
    dependencies=[Depends(require_api_token)],
)
async def invoke_graph(
    payload: GraphInput, app: AppContext = Depends(get_context)
) -> DishaGraphResult:
    return app.graph.invoke(payload)


@router.post(
    "/internal/audit",
    dependencies=[Depends(require_api_token)],
)
async def internal_audit(
    event: WebAuditEventIn, app: AppContext = Depends(get_context)
) -> dict[str, str]:
    app.store.add_web_audit_event(event.model_dump())
    return {"status": "stored"}


@router.get(
    "/internal/cache/{cache_key}",
    dependencies=[Depends(require_api_token)],
)
async def internal_cache_get(
    cache_key: str, app: AppContext = Depends(get_context)
) -> CacheValueOut:
    row = app.store.get_ai_cache(cache_key)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return CacheValueOut(
        contentType=str(row["content_type"]),
        bodyText=str(row["body_text"]),
        createdAt=int(row["created_at"]),
    )


@router.put(
    "/internal/cache/{cache_key}",
    dependencies=[Depends(require_api_token)],
)
async def internal_cache_put(
    cache_key: str, value: CacheValueOut, app: AppContext = Depends(get_context)
) -> dict[str, str]:
    app.store.set_ai_cache(
        cache_key=cache_key,
        content_type=value.contentType,
        body_text=value.bodyText,
        created_at=value.createdAt,
    )
    return {"status": "stored"}


@router.post(
    "/internal/memory-graph/upsert",
    dependencies=[Depends(require_api_token)],
)
async def internal_graph_upsert(
    payload: GraphUpsertIn, app: AppContext = Depends(get_context)
) -> dict[str, str]:
    # Use same extraction logic as web (keep it simple and privacy-first).
    # Minimal extraction: treat input as a user message delta and extract a few "entities".
    entities = []
    for token in payload.text.replace("\n", " ").split(" "):
        t = token.strip()
        if len(t) < 3:
            continue
        if t.startswith("http://") or t.startswith("https://"):
            entities.append(t[:120])
        if any(
            t.endswith(ext)
            for ext in (".ts", ".tsx", ".js", ".py", ".md", ".json", ".yml", ".yaml")
        ):
            entities.append(t[:120])
        if t[:1].isupper() and t[1:].isalnum():
            entities.append(t[:64])
        if len(entities) >= 40:
            break

    user_node = {
        "id": f"user:{payload.userId}",
        "label": payload.userId,
        "kind": "user",
        "weight": 1.0,
    }
    nodes = [user_node]
    edges = []
    for e in entities:
        nodes.append({"id": f"entity:{e}", "label": e, "kind": "entity", "weight": 1.0})
        edges.append(
            {
                "from": user_node["id"],
                "to": f"entity:{e}",
                "kind": "mentions",
                "weight": 1.0,
            }
        )

    app.store.upsert_graph(payload.userId, nodes=nodes, edges=edges)
    return {"status": "stored"}


@router.get(
    "/internal/memory-graph",
    dependencies=[Depends(require_api_token)],
)
async def internal_graph_get(
    userId: str, limit: int = 200, app: AppContext = Depends(get_context)
) -> dict:
    return app.store.get_graph(userId, limit=limit)


@router.get(
    "/modules/health",
    response_model=ModulesHealthResponse,
    dependencies=[Depends(require_api_token)],
)
async def modules_health() -> ModulesHealthResponse:
    modules = await collect_external_modules_health()
    status = "ok" if all(m.status == "ok" for m in modules) else "degraded"
    return ModulesHealthResponse(status=status, modules=modules)


@router.get(
    "/strategy/overview",
    response_model=StrategyOverviewResponse,
    dependencies=[Depends(require_api_token)],
)
async def strategy_overview_route(
    app: AppContext = Depends(get_context),
) -> StrategyOverviewResponse:
    decision, reasons = app.policy.authorize_module_action("strategy", "overview")
    if decision is not DecisionAction.allow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="; ".join(reasons)
        )

    request_id = str(uuid.uuid4())
    result = strategy_overview()
    app.store.add_event(
        event_type="module_action",
        source="brain",
        payload={
            "request_id": request_id,
            "module": "strategy",
            "action": "overview",
            "status": "ok",
        },
    )
    return result


@router.get(
    "/integrations",
    response_model=IntegrationsListResponse,
    dependencies=[Depends(require_api_token)],
)
async def integrations_list_route(
    app: AppContext = Depends(get_context),
) -> IntegrationsListResponse:
    decision, reasons = app.policy.authorize_module_action("integrations", "list")
    if decision is not DecisionAction.allow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="; ".join(reasons)
        )

    request_id = str(uuid.uuid4())
    result = list_integrations()
    app.store.add_event(
        event_type="module_action",
        source="brain",
        payload={
            "request_id": request_id,
            "module": "integrations",
            "action": "list",
            "status": "ok",
            "count": result.total,
        },
    )
    return result


@router.get(
    "/integrations/{name}",
    response_model=IntegrationDescribeResponse,
    dependencies=[Depends(require_api_token)],
)
async def integrations_describe_route(
    name: str, app: AppContext = Depends(get_context)
) -> IntegrationDescribeResponse:
    decision, reasons = app.policy.authorize_module_action("integrations", "describe")
    if decision is not DecisionAction.allow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="; ".join(reasons)
        )

    request_id = str(uuid.uuid4())
    result = describe_integration(name=name)
    app.store.add_event(
        event_type="module_action",
        source="brain",
        payload={
            "request_id": request_id,
            "module": "integrations",
            "action": "describe",
            "status": "ok" if result.readme else "degraded",
            "name": name,
        },
    )
    return result


@router.post(
    "/command",
    response_model=CommandResponse,
    dependencies=[Depends(require_api_token)],
)
async def process_command(
    command: UserCommand, app: AppContext = Depends(get_context)
) -> CommandResponse:
    request_id = str(uuid.uuid4())
    risk_level, decision, reasons = app.policy.classify_command(command)

    memory_rows = app.memory.recall(command.user_id)
    plan = app.planner.refine(app.reasoning.create_plan(command, memory_rows))
    explanation = app.intelligence.explain(plan, len(memory_rows))

    results = []
    if decision is DecisionAction.allow:
        results = app.executor.execute(plan)
        app.memory.remember(
            user_id=command.user_id,
            kind="interaction",
            content=command.text,
            metadata={"request_id": request_id, "intent": plan.intent},
        )
    elif decision is DecisionAction.ask:
        explanation = f"{explanation} Confirmation required before execution."
    else:
        explanation = f"{explanation} Request blocked by security policy."

    app.store.add_event(
        event_type="command",
        source=command.device_id,
        payload={
            "request_id": request_id,
            "text": command.text,
            "risk": risk_level.value,
            "decision": decision.value,
            "reasons": reasons,
        },
    )
    app.store.add_risk_log(
        user_id=command.user_id,
        device_id=command.device_id,
        risk_level=risk_level.value,
        score=1.0
        if risk_level is RiskLevel.high
        else 0.5
        if risk_level is RiskLevel.medium
        else 0.1,
        action=decision.value,
        reasons=reasons,
    )

    return CommandResponse(
        request_id=request_id,
        plan=plan,
        risk=risk_level,
        decision=decision,
        explanation=explanation,
        results=results,
    )


@router.get("/memory", dependencies=[Depends(require_api_token)])
async def list_memory(
    user_id: str = "local-user", app: AppContext = Depends(get_context)
) -> list[dict]:
    return app.memory.recall(user_id=user_id, limit=20)


@router.post("/memory", dependencies=[Depends(require_api_token)])
async def add_memory(
    item: MemoryItem, app: AppContext = Depends(get_context)
) -> dict[str, str]:
    app.memory.remember(item.user_id, item.kind, item.content, item.metadata)
    return {"status": "stored"}


@router.post("/telemetry", dependencies=[Depends(require_api_token)])
async def ingest_telemetry(
    event: TelemetryEvent, app: AppContext = Depends(get_context)
) -> dict[str, object]:
    app.store.add_telemetry(event)
    recent = app.store.recent_telemetry(device_id=event.device_id)
    anomaly = app.anomaly.assess(event, recent[:-1])
    assessment = app.risk_engine.assess(event, anomaly)
    action, summary = app.decision_engine.decide(assessment)

    event_id = str(
        app.store.add_event(
            event_type="telemetry",
            source=event.device_id,
            payload={
                "telemetry": event.model_dump(),
                "anomaly": anomaly.model_dump(),
                "assessment": assessment.model_dump(),
            },
        )
    )
    app.store.add_risk_log(
        user_id=event.user_id,
        device_id=event.device_id,
        risk_level=assessment.level.value,
        score=assessment.score,
        action=action.value,
        reasons=assessment.reasons,
    )
    if app.monitoring and assessment.level is not RiskLevel.low:
        await app.monitoring.emit_alert(event_id, event, assessment)

    return {
        "status": "accepted",
        "event_id": event_id,
        "anomaly": anomaly.model_dump(),
        "risk": assessment.model_dump(),
        "decision": action.value,
        "summary": summary,
    }


@router.get("/events", dependencies=[Depends(require_api_token)])
async def latest_events(app: AppContext = Depends(get_context)) -> list[dict]:
    return app.store.recent_telemetry(device_id="desktop", limit=20)
