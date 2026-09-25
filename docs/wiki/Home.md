# disha6.6 Wiki

**disha6.6** is a governed intelligence workspace that makes source observations, policy decisions, and evidence events reviewable together. This wiki documents the code in the [Disha6.6 repository](https://github.com/Tashima-Tarsh/Disha6.6) at the version alongside these pages. The [root architecture document](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/ARCHITECTURE.md) remains the design authority when a historical document disagrees.

## Start here

| Reader | Recommended page |
| --- | --- |
| New contributor | [Getting Started](Getting-Started) |
| Architect or reviewer | [Architecture](Architecture) |
| API developer | [API and Data](API-and-Data) |
| Operator | [Operations](Operations) |
| Security reviewer | [Security and Governance](Security-and-Governance) |
| Evaluator | [Capabilities and Status](Capabilities-and-Status) |
| Maintainer preparing images | [Screenshots](Screenshots) |
| Wiki maintainer | [Publishing](Publishing) |

## The system in one paragraph

A Next.js application accepts authenticated missions and routes work through typed source adapters, an explicit policy gate, and an evidence ledger. PostgreSQL stores durable missions, observations, review records, watches, and geospatial data. Redis and a worker support scheduled work; Python Brain and embeddings are optional bounded services in the production Compose topology. An integration listed in the registry is a documented possibility, not proof of a configured service or permission to execute it.

**Source → observation → policy → evidence → review → decision.**

## Reading code and documentation

- [README](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/README.md): concise product overview and setup.
- [ARCHITECTURE.md](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/ARCHITECTURE.md): canonical architecture decisions and runtime boundaries.
- [`web/`](https://github.com/Tashima-Tarsh/Disha6.6/tree/main/web/): default user-facing product and API.
- [`web/database/`](https://github.com/Tashima-Tarsh/Disha6.6/tree/main/web/database/): SQL migrations and rollback files.
- [`disha/brain/`](https://github.com/Tashima-Tarsh/Disha6.6/tree/main/disha/brain/): bounded Python service.
- [`docs/archive/`](https://github.com/Tashima-Tarsh/Disha6.6/tree/main/docs/archive/): historical documents; do not infer live deployment from them.

The GitHub Wiki is a separate Git repository. These `docs/wiki/` files are reviewable source pages; publication to the Wiki tab is a separate operation.
