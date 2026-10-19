# DISHA6.6 and PentAGI review, 2026-10-15

## Scope and Evidence

Target: `D:\Disha6.6`, branch `feat/openosint-integration`. Local HEAD and fetched `origin/main` are `b395620c70c7bf4b71cf75907df1f2087fbcd3bd`. The worktree contains extensive staged, unstaged, deleted, and untracked work; this report is a review of recent history, incoming changes, and installation-relevant code, not an exhaustive certification of every vendored repository. Existing changes have not been reset or merged.

DISHA6.6 review includes the ten latest local commit summaries, the six open pull requests #159-164, the fetched OpenOSINT integration branch, and current authentication/model/investigation/Docker changes. Dependency pull requests were inspected as diffs; they were not installed or tested as alternate dependency matrices.

PentAGI review includes the ten latest upstream commits through `843dfeb4bfc809c09d1bc5022e567c602d8fc9dd`, all 17 open pull request descriptions/file changes, and closer source inspection of the installation, provider, authentication, user-permission and archive-handling paths. Upstream PR test claims are maintainer/contributor reports, not tests reproduced locally. No open upstream PR was merged into the installed image.

## Findings

1. **[P1, fixed in this installation change] Chat authentication bypass.** The pending `web/app/api/chat/route.ts` caught every error from `requireRequestContext`, then supplied an `operator` principal with admin and analyst roles. Missing authentication, rejected origins/CSRF, and rate limits could all fall through to inference. The catch-and-admin fallback has been removed. Regression tests cover 401, 403, and 429 rejections and forwarding the authenticated caller.

2. **[P1, unresolved in existing DISHA6.6 tags] Model identities are misleading.** `ollama show qwen2.5:7b` and `ollama show deepseek-r1:8b` both report Qwen2 architecture with 494.03M parameters. The local model list also shows identical digests for many differently branded tags. Tag names and catalogue capability flags therefore cannot substantiate genuine DeepSeek, Llama, Gemma, or larger-Qwen installation claims. PentAGI is configured to use a separately downloaded genuine `qwen2.5:3b`; existing aliases are preserved.

3. **[P2, unresolved] Investigation map uses fabricated coordinates and sensor status.** `web/app/investigate/investigation-client.tsx:341` defines hard-coded sensors as admitted/reachable, places Indian targets in Mumbai and other targets in Washington, and creates source coordinates using trigonometric functions of source-name length. The name-based camera presets do not prove location. These markers must be removed or explicitly separated from evidence before the view is used to support factual location claims.

4. **[P2, unresolved] Gateway confidence and capability tests overstate their evidence.** `web/lib/unified/model-gateway.ts:785` assigns `confidence: 0.95` to every response. Its benchmark initializes reasoning, structured output, and tool-calling results from catalogue flags, then checks only a tiny chat request. This proves neither answer accuracy nor those other capabilities. A 2.5-second probe can also report a cold CPU model as unavailable. PentAGI verification must use actual model metadata and a real tool/embedding probe.

5. **[P1, upstream unresolved] PentAGI user updates/deletes do not require the caller to hold the target user's full privileges.** In the pinned source, `backend/pkg/server/services/users.go:682` scopes an editor to arbitrary users when `users.edit` is present; it does not perform the target-role subset check used on user creation. Open [PR #442](https://github.com/vxcontrol/pentagi/pull/442) proposes that check for update and delete. This installation uses one local administrator; do not delegate limited user-editor roles until this fix is reviewed and incorporated.

6. **[P2, upstream unresolved] TAR extraction does not bound all entries.** `backend/pkg/flowfiles/files.go:375` limits regular-file count and byte totals, but not directory/skipped entries. Authenticated container-file pulls can perform unbounded directory work. Open [PR #443](https://github.com/vxcontrol/pentagi/pull/443) adds an all-entry bound. The installed image remains pinned to upstream main, so this issue is not represented as fixed.

7. **[P2, upstream dependency] The upstream scraper image is old.** Docker Hub reports `vxcontrol/scraper:latest` published on 2024-10-15. It is pinned by digest for reproducibility; pinning does not establish that its browser and OS dependencies are current. A vulnerability scan/browser replacement review remains outstanding.

## DISHA6.6 Incoming Pull Requests

| PR | Change | Review disposition |
| --- | --- | --- |
| [159](https://github.com/Tashima-Tarsh/Disha6.6/pull/159) | Production hardening, 40 files | Broad runtime/UI/security changes despite a generic PR description. Requires dedicated branch acceptance tests; not merged over the dirty local worktree. |
| [160](https://github.com/Tashima-Tarsh/Disha6.6/pull/160) | Next.js and analyzer 16.4.0 | Review with #161 so framework and lint packages stay aligned; lockfile/package changes inspected, alternate runtime untested. |
| [161](https://github.com/Tashima-Tarsh/Disha6.6/pull/161) | Node types and Next ESLint config | Coordinate with #160; no blanket upgrade during PentAGI installation. |
| [162](https://github.com/Tashima-Tarsh/Disha6.6/pull/162) | Radix Select update | Verify disabled-item behavior and keyboard focus in actual UI before merging. |
| [163](https://github.com/Tashima-Tarsh/Disha6.6/pull/163) | Framer Motion 12 to 14 | Major-version change; animation and reduced-motion browser checks remain necessary. |
| [164](https://github.com/Tashima-Tarsh/Disha6.6/pull/164) | Radix Tabs update | Verify focus/blur behavior when switching tabs; no merge performed. |

The fetched `origin/feat/openosint-mcp-integration` branch contains four commits ending at `139d6be6`, adding a token-authenticated, allowlisted OpenOSINT bridge. It is distinct from the existing local OpenOSINT implementation and was not blindly merged into it.

CI snapshot: PR #159 head `f6b5e8a6` has a failed Production CI run, [37605995898](https://github.com/Tashima-Tarsh/Disha6.6/actions/runs/37605995898), in the job named "Tests, lint, types, audit, build, worker syntax". The returned pull-request workflow lists for PRs #160-164 are empty; this is absence of returned CI evidence, not a passing result.

## PentAGI Latest Commits

| Commit | Subject reviewed |
| --- | --- |
| `843dfeb` | README/product description; remove unsupported Community Edition MCP setting claims |
| `e7f3000` | Name VXControl as developer |
| `b611fbe` | Installer stack detection, assertions, proxy and port documentation |
| `55a063e` | Bedrock configuration and installer wiring |
| `fc6f2e3` | README/configuration documentation |
| `3cfe5cb` | Preserve document content; reject blank knowledge/template text |
| `3b7c75f` | OpenTelemetry dependency/API changes |
| `01acdda` | Provider failover, custom prompt fallback, password-edit restriction, image/build fixes |
| `6f3d29c` | Port major fixes |
| `8b2deb6` | Additional provider configuration and published test report |

## PentAGI Open Pull Requests

| PR | Subject | Installation relevance |
| --- | --- | --- |
| [448](https://github.com/vxcontrol/pentagi/pull/448) | Enforce LF for Windows version-check inputs | Relevant to source builds on Windows; prebuilt image avoids CRLF rebuilding. |
| [447](https://github.com/vxcontrol/pentagi/pull/447) | Task-title fallback | Can prevent cosmetic model failures from failing task creation. |
| [445](https://github.com/vxcontrol/pentagi/pull/445) | Delete temporary OAuth cookies correctly | Open; this installation does not configure OAuth. |
| [444](https://github.com/vxcontrol/pentagi/pull/444) | Own-role primary-key scope | Fixes non-admin own-role reads returning database errors. |
| [443](https://github.com/vxcontrol/pentagi/pull/443) | Bound all TAR entries | Security/reliability finding above. |
| [442](https://github.com/vxcontrol/pentagi/pull/442) | Target-user privilege subset | Authorization finding above. |
| [441](https://github.com/vxcontrol/pentagi/pull/441) | Demultiplex Docker exec stream | File synchronization can misread framed stdout without it. |
| [440](https://github.com/vxcontrol/pentagi/pull/440) | Correct README links and environment variable name | Documentation fix. |
| [439](https://github.com/vxcontrol/pentagi/pull/439) | Queue updates during running flows | Concurrency behavior needs workflow tests before adoption. |
| [438](https://github.com/vxcontrol/pentagi/pull/438) | Sanitize and atomically persist subtask plans | Current nontransactional delete/create paths can leave partial plans on failure. |
| [435](https://github.com/vxcontrol/pentagi/pull/435) | Opper provider configuration | Optional cloud provider; unused by this local setup. |
| [433](https://github.com/vxcontrol/pentagi/pull/433) | Cheaper Inference provider configuration | Optional cloud provider; unused by this local setup. |
| [427](https://github.com/vxcontrol/pentagi/pull/427) | Configurable Google search endpoint | Optional search configuration; unused here. |
| [426](https://github.com/vxcontrol/pentagi/pull/426) | Password character counting | Based on older validation code; current main has a shared password policy. Requires rebasing/review. |
| [420](https://github.com/vxcontrol/pentagi/pull/420) | Scope restored message chains to subtask | Avoid context crossing between subtasks; remains open. |
| [396](https://github.com/vxcontrol/pentagi/pull/396) | User/role settings UI | Optional administration UI; target-role authorization issue remains relevant. |
| [395](https://github.com/vxcontrol/pentagi/pull/395) | Generic OIDC SSO | Optional authentication expansion; unused here. |

## Installation and Verification

See `docs/production/PENTAGI_INSTALLATION.md` for paths, credentials, operations, exposure, and optional stacks. The image label confirms revision `843dfeb4bfc809c09d1bc5022e567c602d8fc9dd`, matching the source lock.

- PASS: DISHA6.6 source type check.
- PASS: complete web suite, 68 passed files and 1 skipped file; 492 passed tests and 4 skipped tests.
- PASS: four focused chat-authorization regression tests.
- PASS: PentAGI Compose configuration validation.
- Pending at initial report creation: final Docker rebuild, PentAGI startup/login, local chat/tool/embedding probes, and final main-app health checks. Results are recorded below after execution.

During verification, the genuine 3B model's first function-call probe timed out after 180 seconds while its runner was still loading under high system load. Metadata verification passed (3.1B, Q4_K_M); tool calling and embeddings were not established by that attempt. The initial web image build was stopped after prolonged resource contention and retried with two Rust build threads and two Next page workers. These observations must not be presented as successful inference or build verification.

This review does not claim all OSINT tools, autonomous tasks, optional stacks, incoming branches, or authenticated DISHA6.6 workflows are fully verified.
