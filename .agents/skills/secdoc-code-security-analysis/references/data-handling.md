# Data handling and leakage

The finding class that belongs to no scanner category and shows up everywhere: "the password is hashed at rest but written in cleartext to the log on failed login." The data is protected in the place everyone looks and exposed in the place nobody does. This layer is found by following sensitive values to every place they *go*, not just where they're *stored*.

Compose with **cybersecurity-architecture** `domain-data-crypto.md` for classification and encryption architecture, and its `compliance.md` GDPR coverage for the regulatory framing of what counts as sensitive.

## Contents
- Sensitive data into logs, errors, traces
- Analytics and crash reporters
- Sensitive data in URLs and query strings
- Unredacted debug output
- Client-side storage
- Over-broad serialization
- Retention patterns for the compliance conversation

## Sensitive data into logs, errors, and stack traces — CWE-532, CWE-209

- **Looks like:** `log.info("login attempt: " + user + " / " + password)`, logging a whole request/response object that contains auth headers or a body with PII, an exception handler that logs the full object including secrets, tokens logged for "debugging."
- **Confirm:** follow secrets and PII into every logging call. The failed-login path is the classic — the success path is careful, the error path logs everything to help debug.
- **Fix:** never log credentials, tokens, full card/SSN, or session identifiers. Log a user *identifier*, not the password; log that authentication failed, not the submitted secret. Use a logging filter/redactor that strips known sensitive fields, and structure logs so sensitive fields are omitted by construction rather than blocklisted after the fact. *Why:* logs are widely readable, long-retained, shipped to third-party aggregators, and outside the app's access controls — they're a soft target holding hard secrets.
- **Stack traces to the client — CWE-209:** an exposed trace reveals framework versions, file paths, and query structure. Return a generic error plus a correlation ID; keep the detail server-side (ties to app-config findings in `config-iac-analysis.md`).

## Analytics and crash reporters

Third-party SDKs (analytics, crash reporting, session replay) capture more than intended: form fields including passwords and card numbers, full URLs with tokens, screen contents in session replay. *Fix:* configure field redaction and URL scrubbing in the SDK; exclude sensitive views from session replay; treat any data leaving to a third party as a disclosure to review.

## Sensitive data in URLs and query strings — CWE-598

- **Looks like:** a session token, password-reset token, API key, or PII in a query string — `/reset?token=...`, `/api?apikey=...`.
- **Why exploitable:** URLs land in server access logs, proxy logs, browser history, and the `Referer` header sent to third-party sites loaded on the page. A token in a URL leaks by every one of those channels.
- **Fix:** sensitive values go in the request body or a header, never the URL; reset tokens are single-use and short-lived; set `Referrer-Policy` to limit referer leakage.

## Unredacted debug output

`print`/`console.log`/`Debug.WriteLine` of sensitive objects left in shipped code; a `/debug` endpoint dumping state; verbose mode that prints config including secrets. *Fix:* remove debug output of sensitive data before ship; gate any debug endpoint behind auth and disable in production.

## Client-side storage — CWE-922

- **Looks like:** tokens or PII in `localStorage`/`sessionStorage` (readable by any XSS), secrets in a mobile app's shared preferences/plist, sensitive data cached unencrypted.
- **Why:** `localStorage` is JavaScript-accessible, so any XSS exfiltrates it; a lost/rooted device exposes unencrypted app storage.
- **Fix:** session tokens in `HttpOnly`, `Secure`, `SameSite` cookies rather than `localStorage`; on mobile, use the platform keystore/keychain for secrets; don't cache sensitive data client-side without encryption and a clear-on-logout.

## Over-broad serialization — CWE-213

- **Looks like:** returning a database model directly as JSON so internal fields ride along — `password_hash`, `is_admin`, internal flags, other users' data via an over-eager join, soft-deleted rows. ORMs serializing the whole entity by default are the usual cause.
- **Confirm:** compare what the serializer emits against what the endpoint's consumer actually needs. Extra fields are the finding.
- **Fix:** explicit response DTOs / serializers with an allowlist of fields — the response shape is defined positively, not "the model minus what I remembered to hide." *Why:* a denylist forgets the field added next sprint; an allowlist can't leak a field it doesn't name.

## Retention patterns for the compliance conversation

Flag for the compliance/privacy discussion (this skill flags; the determination is legal/DPO territory, composing with `domain-data-crypto.md` and GDPR coverage):
- PII collected or stored with no evident retention limit or deletion path.
- Sensitive data replicated into logs/analytics/backups where a deletion request wouldn't reach it (right-to-erasure friction).
- PII in non-production environments (prod data copied to staging/test) without masking.
- Absence of field-level encryption or tokenization on high-sensitivity data (payment, health, government ID) where the data model suggests it's warranted.

These are flags that feed a privacy review, not conclusions — say so, and route the determination to the people who own it.
