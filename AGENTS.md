# DISHA Engineering Rules

## Architecture

- Primary production scope is the Next.js app in `web/` and the governed Python backend in `disha/brain/`, as defined in `ARCHITECTURE.md`. The former root CLI is archived under `legacy/root-cli-residue/` and `disha/legacy-root-src/`; it has no supported production entrypoint.
- Keep route handlers thin. Controllers validate input, call services, and return responses.
- Put web business logic in `web/services/`; server-only auth, policy, persistence, audit, rate limit, and validation live in `web/lib/server/`.
- Do not promote archived CLI or third-party source into the product without a complete dependency, policy, evidence, and test boundary.
- Put brain business logic in `disha/brain/brain/`; API controllers live in `disha/brain/api/`; security/policy in `disha/brain/security/`; persistence in `disha/brain/database/`; websocket alerts in `disha/brain/websocket/`.
- Frontend screens live in app routes, reusable UI in `components/`, feature workflows in `features/`, layout shells in `layout/`, and API access in `services/` or `lib/api`.
- Document new request flows when they cross authentication, authorization, persistence, or AI decision boundaries.

## Security

- Authenticate every non-health request and authorize every sensitive action.
- Validate all external input with typed schemas before business logic executes.
- Never trust client-supplied paths, URLs, roles, model names, or user IDs.
- Hash passwords with bcrypt, argon2, or scrypt. Never store raw secrets.
- Encrypt sensitive data with authenticated encryption. Keep keys in environment variables or a managed secret store.
- Do not store CLI credentials in plaintext in production. Plaintext fallback requires explicit local-dev opt-in.
- Emit audit logs for auth events, data changes, admin actions, and AI decisions.

## AI Safety

- Use prompt templates from a controlled module, not ad hoc strings in controllers.
- Validate AI outputs before storing, ranking, or returning them.
- Critical flows must have deterministic fallback logic and explain why fallback was used.
- Log model inputs by reference or hash when possible; avoid logging raw secrets or sensitive payloads.

## Observability

- Every request gets an `X-Request-ID`.
- Logs are structured JSON in production and include request ID, user ID where available, action, status, and duration.
- Health checks must verify process readiness without requiring authentication.
- Metrics and traces should preserve enough context to debug failures without exposing secrets.

## Delivery

- Keep changes scoped and testable.
- Run backend tests for Python changes and frontend type checks/builds for TypeScript changes.
- For this scope, run `npm run test`, `npm run type-check`, and `npm run build` under `web/`. Use `npm run type-check:full` to track legacy UI type debt.
- Container images must run as non-root users and include health checks.
- CI should run build, lint/typecheck, unit tests, dependency audit, and security scanning before deploy.
