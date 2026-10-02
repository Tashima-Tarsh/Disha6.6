# DISHA 6.6: production and password setup

Target public URL: **https://disha6.6.thenitishkr.in/login**.

The Cloudflare Worker is transport. It requires a separate HTTPS Node 22 origin running the actual Next.js application. PostgreSQL 16 with pgvector/PostGIS, Redis, migrations, and the worker service are required. Cloudflare DNS or a login page alone does not provide those services. This setup does not use Render.

## Deploy the application

Use a Linux server with Docker Compose and a TLS ingress. Choose a distinct origin hostname that resolves to that server. Do not use the public DISHA hostname as its own origin.

1. Review and merge the remediation pull request after GitHub checks pass. Run the **disha6.6 Product Release** workflow. It verifies the web app, Python runtime, and database migrations before publishing images. Select that commit SHA as `DISHA_IMAGE_TAG`; avoid moving `latest` tags in a controlled deployment.
2. On the server, check out that exact commit. Generate configuration there, not in chat:

   ```sh
   node web/scripts/configure-production.mjs --origin https://YOUR-ORIGIN-HOST
   ```

   The command writes `web/.env.production.local` with mode `0600`, cryptographically random service secrets and password authentication enabled. It refuses to overwrite existing secrets. Keep this file private and backed up securely. Set `DISHA_IMAGE_TAG` in that file to the released commit SHA. For an existing database, preserve its existing database credentials and JWT/service secrets; do not regenerate the configuration.

3. Start the stack from the repository root:

   ```sh
   docker compose --env-file web/.env.production.local -f docker-compose.prod.yml up -d
   docker compose --env-file web/.env.production.local -f docker-compose.prod.yml ps
   ```

   `web-migrate` applies migrations before the application starts. A failed migration blocks startup. Configure the server's TLS ingress to send the origin hostname to `127.0.0.1:3000`. Keep Postgres and Redis private. The web container runs as a non-root user and its file workspace uses a dedicated volume.

4. Check `https://YOUR-ORIGIN-HOST/api/v1/health`. It must return HTTP 200 with `status: "ok"`. An unavailable service returns 503. The optional embeddings service downloads its configured model on first startup, so allow enough startup time and disk space. For an existing deployment, make a database backup before applying the new migration.

## Set your account password

Run this on the server once the application and migrations are ready. Replace the email with **your actual email**:

```sh
docker compose --env-file web/.env.production.local -f docker-compose.prod.yml exec web node scripts/manage-account.mjs create --email YOUR_EMAIL --role admin
```

Enter a unique password/passphrase with 15–256 characters twice at the hidden terminal prompt. The password is not shown, passed in command arguments, sent to chat, or committed. The database stores a salted scrypt hash. Production has no shared default password and ignores `DISHA_DEV_PASSWORD`.

The account is private provisioning, not public registration. Additional accounts use `--role analyst`, `--role viewer`, or `--role operator`. Roles come from the database, never from a login field.

After sign-in, open **Account** to change your password or sign out. Changing a password revokes all sessions. For a forgotten password, a server operator can run:

```sh
docker compose --env-file web/.env.production.local -f docker-compose.prod.yml exec web node scripts/manage-account.mjs reset --email YOUR_EMAIL
```

To revoke an account, use `disable` instead of `reset`. Reset re-enables a disabled account and preserves its role. Five incorrect attempts lock an account for 15 minutes; distributed request limits also apply. There is no pretend email/SMS recovery service.

## Connect the existing public domain

In the GitHub repository's **production** environment, configure:

| Setting | Type | Value |
| --- | --- | --- |
| `DISHA_ORIGIN_URL` | Variable | The HTTPS origin hostname, no path |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Account owning `thenitishkr.in` |
| `CLOUDFLARE_API_TOKEN` | Secret | Scoped permission to deploy this Worker and its zone route |

Run **disha6.6 Cloudflare Edge Deploy** on `main`. It verifies the code and migrations, checks origin readiness, then deploys the transport with the configured origin. It is an explicit deployment workflow; pushing a branch does not switch the live site. The existing route remains `disha6.6.thenitishkr.in/*`. Keep TLS certificate validation enabled.

Run **disha6.6 Custom Domain Smoke**, then open **https://disha6.6.thenitishkr.in/login** and sign in with your provisioned email/password. The smoke check verifies login HTML, JavaScript delivery, database/Redis readiness and unauthenticated API rejection. It intentionally does not send your password anywhere. Confirm Account → sign out → sign in and a real source query before admitting users.

`DISHA_TRUST_PROXY=false` is the safe default. Enable it only when the ingress replaces forwarded client-IP headers and blocks direct bypass. Otherwise clients can forge IP-based rate-limit keys. With the default, requests share conservative per-route limits.

## Real sources and optional services

Registered adapters execute actual public APIs. Catalog entries are discovery references, not proof of a connected integration. Queries show errors/timeouts and actual retrieved records. A source outage never creates replacement evidence. Use the mission workflow for durable preservation; ad hoc source exports are observations. Continuous watches require the `dynamic-worker` service to remain healthy.

Set provider keys and approved configuration for credentialed sources in your private environment. The product can query public sources without a generative model. To enable model inference, configure `DISHA_MODEL_PROVIDER` and the corresponding provider key/model or routing JSON. Verify that model access with the provider; no API access is invented. The default is `disabled`.

No geographic records are synthesized. Import approved data using the existing `geo:import` workflow and its provenance requirements. An empty map means no admitted dataset. PostGIS/pgvector migration rehearsal runs in CI; missing extensions are a startup problem, not a reason to return fake data.

Managed OIDC remains supported as an alternative: set `DISHA_AUTH_MODE=oidc`, issuer/client credentials, an authorization endpoint, allowed emails and optional admin emails. The callback is `/api/auth/oidc/callback`. Only configured providers appear on the login screen. Password mode does not require OIDC configuration.

## Operations and rollback

Back up PostgreSQL, the brain data volume, and admitted files. Verify restoring backups before accepting irreplaceable evidence. Monitor the health endpoint, worker logs, structured error/audit logs, and storage growth. Restrict database privileges and ingress at the hosting boundary; this repository does not configure your cloud firewall for you.

For rollback, redeploy the previous immutable application image after checking schema compatibility. Do not run `db:rollback` on production as a routine rollback: the password migration rollback deletes credential records. Its explicit destructive acknowledgement is intended for disposable rehearsal databases. Historical evidence is not rewritten to conceal mismatches; legacy omitted lens fields are reconstructed only when both existing digests prove the original payload.

## What still requires the owner’s environment

The actual origin server/TLS configuration, PostgreSQL/Redis availability, GitHub/Cloudflare deployment credentials, initial private password entry, external API credentials and admitted datasets cannot be supplied by a source-code change. Do not declare the domain upgraded until the release, migration, domain smoke and authenticated operator checks pass on that deployment.
