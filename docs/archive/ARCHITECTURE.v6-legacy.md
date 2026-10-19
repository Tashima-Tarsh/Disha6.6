# Architecture

DISHA is organized around a production spine and several legacy or experimental surfaces.

## Production Spine

```mermaid
flowchart TD
    Sources[Operator, sensors, geospatial data, open data, RTI, audit reports, documents, telemetry]
    Sources --> Graph[disha/brain/graph]
    Graph --> Evidence[disha/brain/evidence]
    Graph --> Versions[disha/brain/versions]
    Graph --> Yudh[disha/brain/yudh]
    Graph --> Vyuha[disha/brain/vyuha]
    Graph --> Policy[disha/brain/policy]
    Graph --> Audit[disha/brain/audit]
    Graph --> Memory[disha/brain/memory]
    Web[web/ Next.js API surface] --> Brain[disha/brain FastAPI backend]
    Brain --> Graph
```

## Repository Map

- `disha/brain/`: central reasoning, graph, policy, evidence, memory, audit, monitoring, database, and FastAPI surfaces.
- `web/`: hardened Next.js API surface for auth, audit, agent workflows, files, export, and sharing.
- `src/`: TypeScript CLI/runtime hardening modules and MCP entrypoint.
- `tests/`: focused tests for the graph spine.
- `legacy/`, `disha/services/`, `disha/ai/`, and integrations: useful but not automatically production-trusted.

## Result Contract

Every graph result returns version, evidence class, source list, confidence level, risk score, reasoning summary, Yudh assessment, Vyuha recommendation, NFU policy status, human approval requirement, final recommendation, and audit event.

## Safety Boundary

No-First-Use is enforced before recommendation finalization. DISHA may recommend defensive monitoring, containment, evidence preservation, alerting, reporting, and recovery. It may not recommend retaliation, unauthorized access, malware, DDoS, brute forcing, exploitation, or third-party attack.

## Evidence Persistence Boundary

The active TypeScript product spine writes evidence events through `web/lib/unified/evidence-ledger.ts`.

Production mode requires PostgreSQL through `DATABASE_URL`. The database table `evidence_events` stores one ordered hash chain per mission:

```text
mission_id + chain_index + payload_hash + previous_hash -> event_hash
```

This makes DISHA restart-safe and gives auditors a deterministic way to detect missing, reordered, or modified events. The memory ledger is retained only for tests and explicit local development.

## Integration Direction

The graph is currently callable as Python code. The next production step is to expose a narrow FastAPI endpoint that accepts `GraphInput`, authenticates the caller, writes audit records to persistent storage, and returns `DishaGraphResult`.

