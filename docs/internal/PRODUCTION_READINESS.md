# Production Readiness

This document records the production posture of the current DISHA Brain MVP. It is intentionally factual: it lists what is verified in this repository, what must be configured at deployment time, and what should not be claimed without additional evidence.

## Current Verified State

- The PR branch `codex/evidence-first-disha-spine` passed the GitHub checks for Brain tests, TypeScript tests, TypeScript lint, Ruff lint and formatting, mypy, Bandit, secret scanning, dependency audit, SBOM generation, and CodeQL.
- The Brain graph test suite covers 23 checks across lazy import behavior, evidence classification, six-version routing, No-First-Use policy, human approval, Vyuha selection, audit hash-chain behavior, memory updates, geospatial validation, HSE signals, national audit signals, and end-to-end graph invocation.
- `disha/brain` can be imported as a core graph package without requiring FastAPI.
- The FastAPI app import is covered by the Brain workflow after installing `disha/brain/requirements.txt`.
- The Docker runtime writes Brain state to `/data/disha_brain.db`, a writable container data path.

## Deployment Requirements

- Copy `.env.example` to `.env` and replace every `<...>` placeholder with a real deployment secret or endpoint.
- Set `DISHA_BRAIN_API_TOKEN` for every environment that exposes protected Brain APIs.
- Keep production CORS origins explicit. Do not use wildcard browser origins for deployed control planes.
- Mount durable storage for the Brain SQLite path, or replace `SQLiteStore` with a managed store before using multi-instance deployments.

## Runtime Boundaries

- DISHA Brain is defensive and evidence-first. It blocks offensive, retaliatory, destructive, unauthorized, and self-propagating actions through No-First-Use policy.
- Ambiguous actions require human approval.
- Unsupported public claims must remain marked as `[VERIFY REQUIRED]` until source material is added to the repository or verified through a production connector.
- References to thenitishkr.in and the DISHA Intelligence books remain `[VERIFY REQUIRED]` in this repository until source material or bibliographic metadata is added.

## Local Verification Commands

```bash
python -m pytest tests/test_disha_brain_graph.py -q
python -m ruff check disha/brain tests
python -m ruff format disha/brain tests --check
python -m bandit -q -r disha/brain
python -c "from disha.brain.app import app; assert app.title"
```

## Release Gate

Before calling a branch production-ready:

1. All GitHub checks must pass on the exact commit being released.
2. `.env` must be supplied by the deployer and must not be committed.
3. External data claims must be backed by repository material, audited connectors, or marked `[VERIFY REQUIRED]`.
4. Any legacy module promoted into the production path must pass security review and receive focused tests.
5. Operators must know whether the deployment is single-instance SQLite or managed multi-instance storage.

## Known Limits

- This MVP does not claim government approval, legal certification, or independent third-party audit.
- The repository contains legacy and experimental modules outside the Brain spine; they are not all production surfaces.
- Expert-reviewed datasets for HSE, geospatial resilience, governance audit, and public-sector scoring are still required before domain outputs should be treated as authoritative.
