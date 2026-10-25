# Config and IaC analysis

Configuration is code, and misconfigured infrastructure is attack surface. Each item below gives the **misconfiguration**, **why it's exploitable**, and the **corrected stanza** — a finding here is only useful if the developer can paste the fix.

## Contents
- Dockerfiles
- Kubernetes manifests
- Terraform and cloud IaC
- CI/CD pipeline definitions
- Application config

## Dockerfiles

- **Running as root.** No `USER` directive — the container process is root, so a container escape or app compromise starts with root in the container. *Fix:* create and switch to a non-root user: `RUN adduser -D app && chown -R app /app` then `USER app`.
- **Secrets baked into layers.** `ENV API_KEY=...`, `COPY .env`, or a secret passed via `ARG` — every layer is extractable with `docker history` / `docker save`, so the secret ships in the image even if a later layer deletes it. *Fix:* inject secrets at runtime (env from an orchestrator secret, mounted file, or BuildKit `--mount=type=secret` which doesn't persist in layers), never `ENV`/`ARG`/`COPY` for secrets.
- **Unpinned base images.** `FROM node:latest` or a floating tag — the image rebuilds to a different, unreviewed base over time. *Fix:* pin by digest: `FROM node:20.11.1-slim@sha256:...`. A tag is mutable; a digest is not.
- **`ADD` from a URL.** `ADD https://... /` fetches remote content at build over an unauthenticated channel and auto-extracts archives. *Fix:* `COPY` local files; if remote fetch is required, `RUN curl` with a checksum verification step.
- **Over-broad build context / no `.dockerignore`.** `COPY . .` with no `.dockerignore` pulls `.git`, `.env`, and local secrets into the image. *Fix:* a `.dockerignore` that excludes `.git`, env files, and credentials.

## Kubernetes manifests

- **Privileged / over-permissioned pods.** `securityContext.privileged: true`, `allowPrivilegeEscalation: true`, added `CAP_SYS_ADMIN`, `hostPID`/`hostNetwork`. A compromise of a privileged pod is effectively node compromise. *Fix:* `privileged: false`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `runAsNonRoot: true`, drop `ALL` capabilities and add back only what's needed.
- **Missing resource limits.** No `resources.limits` — one workload can exhaust node CPU/memory, a denial-of-service (self-inflicted or attacker-triggered). *Fix:* set `requests` and `limits` for cpu and memory.
- **hostPath mounts.** Mounting host directories into a container bridges the container/host boundary; `/var/run/docker.sock` or `/` is escape-to-host. *Fix:* remove hostPath; use proper volume types; never mount the container runtime socket into a workload.
- **Secrets as environment variables.** Secrets in `env` are visible in the pod spec, `kubectl describe`, and often leak into logs and crash dumps. *Fix:* mount secrets as files (`volumeMounts` from a `Secret`), and back with an external secrets store where possible; note that native K8s Secrets are base64, not encrypted at rest unless etcd encryption is on.
- **No NetworkPolicy.** Default Kubernetes networking is flat — every pod can reach every pod, so one compromised workload has lateral reach to all others. *Fix:* default-deny NetworkPolicy plus explicit allows for required flows.

## Terraform and cloud IaC

- **Public storage.** S3 bucket with public ACL / no public-access block, a GCS/Azure blob open to `allUsers`. Public data buckets are a top breach source. *Fix:* `block_public_acls = true` (all four public-access-block settings), explicit private ACL, bucket policy scoped to named principals.
- **Open security groups.** Ingress `0.0.0.0/0` on SSH/RDP/database ports exposes management and data planes to the internet. *Fix:* scope CIDRs to known ranges or a bastion/VPN; never `0.0.0.0/0` on 22/3389/database ports.
- **Wildcard IAM.** `"Action": "*"` on `"Resource": "*"`, or `iam:PassRole` with `*` — a compromised principal can do anything / escalate. *Fix:* least-privilege — enumerate the specific actions and resource ARNs; treat `*` on either field as a finding needing justification.
- **Unencrypted state.** Terraform state holds secrets in plaintext (resource attributes, generated passwords). Local or unencrypted remote state discloses them. *Fix:* encrypted remote backend with access control and state locking; keep secrets out of state where possible.
- **Hardcoded credentials in variables.** `default = "AKIA..."` in a `variable` block, a password literal in `.tfvars` committed to the repo. *Fix:* inject via environment or a secrets manager data source; never a literal default; keep `.tfvars` with secrets out of version control.

## CI/CD pipeline definitions

The pipeline runs privileged and touches secrets — it's a high-value target, and PR-triggered pipelines take untrusted input.
- **Injection via untrusted PR input.** Interpolating `${{ github.event.pull_request.title }}`, a branch name, or an issue body directly into a `run:` shell step lets an attacker put shell metacharacters in a PR title and execute on the runner. *Fix:* pass untrusted values through environment variables and reference them quoted (`"$TITLE"`), never string-interpolate them into the script body.
- **Overprivileged tokens.** A default read-write `GITHUB_TOKEN` or a broad PAT available to every job, including on `pull_request_target` where untrusted code runs with secrets. *Fix:* minimum `permissions:` per job; avoid `pull_request_target` with checkout of PR head; scope and short-live tokens.
- **Secret exposure in logs.** `echo $SECRET`, `set -x` with secrets in the environment, or a step that prints its env. *Fix:* never echo secrets; rely on the platform's masking but don't trust it as the only control; audit debug steps.
- **Unpinned actions/plugins.** `uses: some/action@v3` (a mutable tag) or `@main` — the action's owner (or someone who compromises it) can change what runs under your secrets. *Fix:* pin third-party actions by full commit SHA.

## Application config

- **Debug mode in production.** `DEBUG = True` (Django exposes source, settings, and an interactive traceback), verbose framework error pages, source maps served in prod. *Fix:* debug off in production; generic error pages; strip source maps from public bundles.
- **Permissive CORS.** `Access-Control-Allow-Origin: *` combined with `Allow-Credentials: true` (the browser blocks that combination, but the intent — and the misconfigured reflected-origin version that *does* work — exposes authenticated endpoints cross-origin). *Fix:* an explicit origin allowlist; never reflect the request origin unchecked; don't pair `*` with credentials.
- **Verbose error handling.** Stack traces, SQL errors, or internal paths returned to the client hand an attacker a map of the internals. *Fix:* log details server-side, return a generic error and a correlation ID to the client (see `data-handling.md`).
