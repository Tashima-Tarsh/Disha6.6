# @disha/api

Thin Constitutional HTTP API.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + adapter list (open) |
| POST | `/v1/missions` | Create mission |
| POST | `/v1/missions/:id/activate` | Activate mission |
| POST | `/v1/missions/:id/run` | Run adapters (writes evidence) |
| GET | `/v1/reviews` | List pending human reviews |
| POST | `/v1/reviews/:id` | Submit human decision |
| GET | `/v1/integrity` | Verify hash chain |
| GET | `/v1/adapters` | List registered adapters |

All routes except `/health` require `Authorization: Bearer $DISHA_API_KEY`.

## Run

```bash
export DISHA_API_KEY="$(openssl rand -hex 32)"
npm start --workspace @disha/api
```
