# Secrets detection

A committed secret is a published secret. The finding is not "a credential appears in the code" — it's "this credential must be rotated now, and here is why history-scrubbing alone won't save you." Treat every found secret as live (see the defensive-purpose statement in SKILL.md); never test it for validity — using it is the breach.

## Contents
- Secret classes and their shapes
- Detection layers: pattern, entropy, context
- Where secrets actually hide
- Triage: assume live, identify the provider
- Remediation order: rotate → purge → prevent
- Prevention architecture

## Secret classes and their shapes

Recognizable shapes route rotation to the right provider and cut false positives.
- **Cloud credentials.** AWS access key IDs (`AKIA`/`ASIA` + 16 chars) with a 40-char secret; GCP service-account JSON (`"private_key": "-----BEGIN PRIVATE KEY-----"`, `"type": "service_account"`); Azure connection strings and client secrets.
- **API keys and tokens.** Provider-prefixed keys (Stripe `sk_live_`, GitHub `ghp_`/`github_pat_`, Slack `xoxb`/`xoxp`, OpenAI `sk-`, SendGrid `SG.`), bearer tokens, OAuth client secrets.
- **Passwords.** In connection strings, config values, `Authorization: Basic` blobs (base64 of `user:pass`), default creds left in code.
- **Private keys and certificates.** `-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----`, `.pem`/`.key`/`.pfx`/`.p12` contents, SSH keys.
- **Connection strings.** `postgres://user:pass@host/db`, `mongodb+srv://...`, JDBC URLs with embedded passwords, Redis URLs with auth.
- **Webhook URLs with embedded tokens.** Slack/Discord/Teams incoming webhooks — the URL *is* the credential.
- **Session and signing secrets.** JWT signing keys, Flask/Rails/Express `SECRET_KEY`/`secret_key_base`/cookie secrets, HMAC keys. A leaked signing secret means an attacker forges valid sessions — often higher impact than a single API key.

## Detection layers

Three layers, and the third is what separates a finding from noise.
- **Pattern.** Provider prefixes and structural formats (above). High precision for keys with distinctive prefixes; the first pass.
- **Entropy.** High-Shannon-entropy strings catch keys without recognizable prefixes. Higher recall, lower precision — flags UUIDs, hashes, base64 assets, minified blobs. Entropy proposes; context disposes.
- **Context.** The variable name, file, and surroundings decide whether a high-entropy string is a secret or a fixture. `api_key = "AKIA..."` in `settings.py` is a finding; the same-shaped string in `test_fixtures.py` named `EXAMPLE_KEY` next to a comment "fake key for tests" is likely noise — *likely*, because "we put a real key in a test once" is a real breach class. Context is why a scanner alone produces a report developers stop reading: without it, every fixture is a P1.

## Where secrets actually hide

Beyond the obvious source line:
- **Config files** — `.env`, `application.yml`, `appsettings.json`, `config.php`, Kubernetes ConfigMaps/Secrets (base64 is encoding, not encryption — decode and inspect).
- **Environment files committed "temporarily."** `.env` in the tree is the single most common finding. The `.gitignore` was added *after* the first commit.
- **CI variables echoed into logs.** A pipeline that `echo`es an env var, or runs with `set -x`, spills secrets into build logs that outlive the run.
- **Comments.** `// TODO remove before commit — password is hunter2`. Grep comments too.
- **Notebooks.** `.ipynb` output cells cache printed secrets and API responses; the JSON holds them even when the code cell looks clean.
- **Test data and fixtures.** Real credentials used "just to get the test passing."
- **Client-side bundles.** Anything shipped to the browser or a mobile app is public; an API key in a JS bundle or mobile binary is disclosed by design. Server-side secrets never belong here.
- **Git history.** The critical one: a secret removed in a later commit is still in history, still cloneable, still published. `git log -p`, `git rev-list --all` reach it. A finding that only checks the working tree misses this entirely — say whether history was in scope.

## Triage: assume live, identify the provider

- **Assume live.** Report for immediate rotation regardless of whether it "looks used." Do not validate it against the provider — that's the attack.
- **Identify the key type to route rotation.** Naming the provider (this is a Stripe live secret key / an AWS IAM key / a GCP service account) tells the owner exactly which console to rotate in and what blast radius to assume. A finding that says "a secret" is less actionable than one that says "an AWS access key — rotate in IAM, audit CloudTrail for use since the commit date."
- **Set severity by blast radius, not by string.** A live cloud root key differs from a rate-limited read-only third-party token. Both get rotated; they don't both stop the release.

## Remediation order: rotate → purge → prevent

The order is the finding's most important content, because teams reliably do it backward — they scrub history first, feel safe, and leave a live credential the attacker already copied.
1. **Rotate first.** Invalidate the exposed secret at the provider and issue a new one. Until this is done, nothing else matters — the secret is compromised the moment it hit a shared repo.
2. **Then purge history.** Rewrite history to remove it (`git filter-repo`, BFG) and force-push, *understanding this is cleanup, not containment* — anyone who cloned already has it, which is why rotation comes first. Rotate-then-purge, never purge-then-hope.
3. **Then prevent.** Add the control that stops the next one (below).

## Prevention architecture

Compose with the vaulting content in **cybersecurity-architecture** `domain-appsec.md` for the program-level design; at the code level:
- **Vault references over literals.** Code reads secrets from a secrets manager (Vault, AWS Secrets Manager, cloud KMS) or injected environment at runtime, never from a committed literal. The repo holds a *reference*, not the value.
- **Pre-commit hooks.** A secrets scanner (gitleaks, trufflehog, detect-secrets) as a pre-commit hook stops the commit before it happens — the cheapest possible catch.
- **CI scanning gates.** A pipeline stage that fails the build on a detected secret, as backstop for the developer who skipped the hook. Ensure the scanner itself doesn't log what it finds.
