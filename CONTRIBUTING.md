# Contributing to disha6.6

DISHA is an evidence-first governance and intelligence project. Contributions should strengthen public-interest accountability, not add spectacle.

Before contributing, read [ARCHITECTURE.md](ARCHITECTURE.md), the repository's canonical architecture document, and [Getting Started](docs/wiki/Getting-Started.md).

## Product Boundary

disha6.6 has two layers:

| Layer | Path | Rule |
| --- | --- | --- |
| Governed Intelligence Core | `web/`, `web/lib/unified/` | Active production spine |
| Sovereign Cognitive Extensions | `disha/` | Research only unless promoted through Layer 1 |

Do not wire `disha/` research code directly into production output. Promotion requires a Layer 1 contract, policy rule, evidence logging, tests, and documentation.

## Contribution Standard

Every meaningful product change must preserve:

```text
contract -> policy -> evidence -> test
```

Do not add claims, statistics, legal conclusions, government references, incident names, or data-source assertions unless the repository contains a verifiable source path. If verification is incomplete, mark the claim as `[VERIFY REQUIRED]`.

## What Belongs

- Stronger contracts for `DishaSignal`, lenses, policy decisions, evidence events, and source records.
- Tests for policy-gate behavior, evidence-chain integrity, source provenance, and controlled-data boundaries.
- Public documentation that is precise, restrained, and useful to researchers, journalists, policymakers, and developers.
- Connectors that register source provenance without copying private, controlled, or unlawful data into the repo.
- Security hardening, logging, migration tooling, deployment checks, and observability.

## What Does Not Belong

- Offensive cyber capability.
- Unverified intelligence claims.
- Scraped private or controlled records.
- Model output promoted as fact.
- Decorative dashboards that do not improve evidence review.
- Generic AI branding, exaggerated marketing, or unsupported authority claims.
- New architecture documents that compete with root `ARCHITECTURE.md`.

## Documentation Rules

- Root `ARCHITECTURE.md` is authoritative.
- `docs/public/` contains only material intended for GitHub Pages publication.
- `docs/internal/` contains maintainer notes, release checklists, baselines, and internal planning.
- `docs/archive/` contains historical or outdated material only.

If a document conflicts with current architecture, archive it instead of editing it into a second source of truth.

## Development Workflow

Create a focused branch:

```bash
git checkout -b codex/evidence-ledger-migration
```

Run product-spine checks:

```bash
npm --prefix web run type-check:full
npm --prefix web test
npm --prefix web run build
```

For repository-wide verification:

```bash
npm run verify
```

Docker defaults to the product spine:

```bash
docker compose up --build web
```

Research extensions require the full profile:

```bash
docker compose --profile full up --build
```

## Pull Request Checklist

- The change is scoped and does not rewrite unrelated legacy or research surfaces.
- Public claims are sourced or marked `[VERIFY REQUIRED]`.
- Any new data source includes license/status, retrieval path, and provenance notes.
- Any new API route has authentication, rate limiting, validation, and error handling.
- Any model or agent path remains policy-gated and evidence-logged.
- Tests cover the new behavior.
- No secrets, local databases, private evidence, or credentials are committed.

## Review Principle

Review should be strict because DISHA's credibility depends on restraint. A smaller verified feature is better than a larger unverifiable one.
