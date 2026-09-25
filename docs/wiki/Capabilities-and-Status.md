# Capabilities and status

This page describes the repository implementation, not a certification of a live deployment. Check the linked workflow runs for current CI and use the authenticated readiness endpoint to inspect a particular running environment.

| Area | Repository evidence | Status in code | Deployment dependency |
| --- | --- | --- | --- |
| Web product | `web/app/` and `web/tests/` | Active | Configured host and auth |
| Governed mission and policy | `web/lib/unified/`, `/api/v1/mission` | Implemented | Admitted sources for substantive results |
| Evidence and persistence | `web/lib/unified/evidence-ledger.ts`, SQL migrations | Implemented | Durable PostgreSQL |
| Passive OSINT | Adapter bus, registry and search route | Implemented with source-specific limits | Network, provider availability and policy |
| Geospatial | MapLibre components and PostGIS migrations | Implemented, data dependent | Imported/admitted authoritative data |
| Watches and scheduled work | SQL tables, worker script, internal tick routes | Implemented | Database, worker token, live process |
| Python Brain | `disha/brain/`, Python test workflow | Separate bounded service | Built image and configuration |
| External integrations | Registries and governed adapters | Optional or research | Service deployment, lawful access, policy admission |
| Production database transition | Compose PostgreSQL definition | Repository path prepared | Host, data migration, backup and live cutover |

## Near-term hardening derived from repository state

- Verify a real PostgreSQL deployment with persistent volume, off-host backups and restore drill.
- Exercise the production OIDC flow and worker/Brain service credentials against the actual environment.
- Import authoritative geospatial datasets and validate source licenses, provenance and coverage before publishing overlays.
- Document the status of each upstream connector from an environment health report; keep catalog-only entries distinct from configured services.
- Add end-to-end tests for deployed auth, migration ordering and key analyst workflows where their environment can be provisioned.

These are gaps and recommended next checks, not promised releases. Archived and research modules must pass the core's contract, policy, evidence and tests before becoming supported product paths.
