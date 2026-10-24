# Constitutional API Reference

Base URL: `http://localhost:8787` (default)

Authentication: `Authorization: Bearer <DISHA_API_KEY>`

## Create Mission

```http
POST /v1/missions
{
  "title": "Investigate example.com",
  "description": "Public infrastructure check",
  "activate": true,
  "actor": { "type": "human", "id": "analyst-1" }
}
```

## Run Adapters

```http
POST /v1/missions/:id/run
{
  "adapterIds": ["dns-lookup", "crtsh", "wayback"],
  "input": { "domain": "example.com" },
  "actor": { "type": "human", "id": "analyst-1" }
}
```

Every successful adapter result becomes one or more EvidenceEvents and is attached to the mission. Non-VERIFIED items are automatically enqueued for human review.

## Human Review

```http
GET /v1/reviews?missionId=...

POST /v1/reviews/:reviewItemId
{
  "decision": "elevate_verified",
  "notes": "Confirmed against two independent sources",
  "actor": { "type": "human", "id": "analyst-1" }
}
```

Allowed decisions: `elevate_verified` | `reject` | `request_more` | `keep`

**Only `elevate_verified` produces a VERIFIED finding.**

## Integrity

```http
GET /v1/integrity?missionId=...
```

Returns `{ "valid": true }` or `{ "valid": false, "brokenAt": "..." }`.
