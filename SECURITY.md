# disha6.6 Security Policy

disha6.6 is an evidence-first governance and intelligence project. Security reports should be handled privately, carefully, and without publishing exploit details in public issues.

## Supported Version

| Version | Supported | Notes |
| --- | --- | --- |
| 6.6.x | Yes | Current product spine |
| Older versions | No | Archived or legacy surfaces |

## Reporting A Vulnerability

Do not open a public issue for security vulnerabilities.

Use GitHub Security Advisories on the current repository:

```text
https://github.com/Tashima-Tarsh/Disha6.6/security/advisories
```

If private reporting is unavailable, contact the maintainers through a private channel listed on the repository profile; never put exploit details in a public issue.

Please include:

- affected commit or version,
- affected component,
- reproduction steps,
- impact,
- suggested fix if known,
- whether any secret, credential, private data, or controlled material may be involved.

## Scope

In scope:

- authentication and authorization bypasses,
- evidence ledger integrity issues,
- policy-gate bypasses,
- source-admission bypasses,
- unsafe handling of secrets or private data,
- injection, SSRF, path traversal, or rate-limit weaknesses in active `web/` runtime code.

Out of scope:

- requests for offensive capability,
- reports based on leaked or exfiltrated third-party material,
- social engineering,
- denial-of-service tests without prior written permission,
- issues only affecting archived `legacy/` code unless they are reachable from the active product runtime.

## Security Principles

- No offensive cyber capability.
- No leaked, credential, token, private-key, hacked, or exfiltrated material is ingested as an operational source.
- Controlled-data connectors deny by default.
- Model output is advisory and cannot bypass policy.
- Evidence and policy decisions must be logged for high-impact flows.
