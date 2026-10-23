# Frontend ↔ backend

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart LR
 UI[web/app/osint/page.tsx] -->|HTTP| Scan[web/app/api/osint/scan]
 UI -->|HTTP| Resolve[web/app/api/osint/resolve]
 UI -->|HTTP| Load[web/app/api/osint/data/load]
 UI -->|HTTP| Vyuha[web/app/api/osint/vyuh/activate]
 Scan -->|POST /scan| Backend[backend/app.py]
 Resolve -->|POST /api/v1/resolve| Backend
 Load -->|POST /api/v1/data/load| Backend
 Vyuha -->|POST /api/v1/vyuh/activate| Backend
```

Authorization in these inspected proxy handlers is not visible; global middleware was not traced.
