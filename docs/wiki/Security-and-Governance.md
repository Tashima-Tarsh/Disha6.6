# Security and governance

The default research posture is passive and public. The product distinguishes source metadata from permitted execution: listing a tool, source, or upstream repository does not authorize an active scan, identity enumeration, use of leaked data, or private-account access.

## Control points

| Point | Implementation boundary |
| --- | --- |
| Authentication | `web/lib/server/`, login and OIDC routes |
| Authorization | Principal and action checks in `withContext`; mission access checks on evidence routes |
| Validation | Zod schemas in HTTP handlers and typed unified contracts |
| Policy | `web/lib/unified/policy-gate.ts` and governed adapters |
| Evidence | Event ledger, mission summaries, provenance and export paths |
| Persistence | PostgreSQL migrations, guarded rollback, row-level security on selected tables |
| Automated checks | Product CI, migration rehearsal, CodeQL and dependency audit |

Production needs separately provisioned OIDC, secrets, network protection, backups, retention policy and operational review. Model outputs are advisory. An output without sufficient source provenance should be marked for verification rather than promoted into an asserted finding.

## Changes and escalation

Follow [CONTRIBUTING.md](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/CONTRIBUTING.md) and the canonical [architecture rules](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/ARCHITECTURE.md). A runtime feature needs a typed contract, policy path, evidence behavior, tests and documentation. Report vulnerabilities privately through the [repository security policy](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/SECURITY.md); do not post exploit details in a public issue.

The repository is public but its root package is `UNLICENSED`; see [LICENSE](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/LICENSE) for the actual reuse position.
