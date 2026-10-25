# Dependencies and supply chain

Most of the code in a project is code nobody on the team wrote. The imported attack surface is real, and the honest version of a dependency finding says *what it could determine and what it couldn't* — a CVE in a manifest is not automatically a reachable vulnerability.

## Contents
- Known-vulnerability matching against manifests and lockfiles
- Transitive dependency reality
- Reachability honesty
- Upgrade paths: patch, pin, replace
- Typosquatting and hallucinated packages
- Install-script and build-time execution risk
- License flags at orientation depth
- Lockfile hygiene as a finding class

## Known-vulnerability matching

Match declared dependencies and their pinned versions against known-CVE / advisory data (verify against current sources at use time — OSV, GitHub Advisory, ecosystem advisories; the data is only useful fresh). Per-ecosystem file formats:
- **JavaScript/TypeScript** — `package.json` (declared ranges) + `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` (resolved versions). The lockfile is the source of truth for what actually installs.
- **Python** — `requirements.txt`, `Pipfile`/`Pipfile.lock`, `poetry.lock`, `pyproject.toml`. Pinned vs ranged matters.
- **Java** — `pom.xml` (Maven), `build.gradle` / `gradle.lockfile`.
- **.NET** — `.csproj` `PackageReference`, `packages.lock.json`.
- **Go** — `go.mod` / `go.sum`. **Rust** — `Cargo.toml` / `Cargo.lock`.
- **Containers** — base image tags/digests in the Dockerfile (see `config-iac-analysis.md`).

Report each match with the package, the resolved version, the advisory ID (CVE/GHSA), and the fixed version.

## Transitive dependency reality

The vulnerable package is usually not one the team chose — it's three levels down, pulled by something they did choose. Read the lockfile, not just the manifest: the manifest shows intent, the lockfile shows what installs. A finding that names only the top-level dependency when the CVE is in a transitive one sends the developer looking in the wrong file; name the dependency path (`app → framework → vulnerable-lib`) so they know whether they can bump it directly or must wait on the intermediary.

## Reachability honesty

**A CVE in an unused code path is a different finding from a CVE in a called function — and the skill says which one it can determine.** Static reachability from provided source is sometimes determinable (the vulnerable function is never imported/called anywhere in scope) and often not (dynamic dispatch, framework-invoked code, or the calling code isn't in scope). Be explicit:
- *Determinable-unreachable:* "CVE-X is in `libfoo.parse_legacy()`, which grep shows is never called in the provided source — lower priority, but still upgrade, since a future call reaches it." 
- *Determinable-reachable:* "the vulnerable function is called at `handler.py:88` on request data — this one is live, prioritize."
- *Undeterminable:* "reachability can't be established from the provided scope — treat as potentially reachable pending a call-graph check." 

Reachability changes priority, not whether it's a finding. Don't silently upgrade an unreachable CVE to critical, and don't silently drop it.

## Upgrade paths: patch, pin, replace

For each vulnerable dependency, give the actual path forward:
- **Patch** — a fixed version exists in a compatible range: bump to it, note any breaking-change risk.
- **Pin** — no fixed version, or the fix is major-version: pin away from the vulnerable version, apply a documented workaround, or constrain the transitive dep (npm `overrides`, Python constraints, Gradle resolution strategy) when the intermediary hasn't updated.
- **Replace** — the package is abandoned (no fix coming) or the vuln is architectural: name a maintained alternative. Abandonment is itself a supply-chain risk worth flagging.

## Typosquatting and hallucinated packages

A live entry vector, and increasingly common with AI-generated code. For each non-standard-library import, check:
- **Does the package exist** on the canonical registry, and **is it the canonical one** — not a look-alike (`python-jwt` vs `pyjwt`, `crossenv` vs `cross-env`, `djangorestframework` vs a squatted variant)? Character swaps, added/dropped hyphens, and namespace confusion are the squatter's tools.
- **When was it published?** A "popular library" package first published last week, or a version that jumped in downloads suddenly, is a red flag — legitimate libraries have history.
- **Does the name match the ecosystem's real library?** AI-generated code invents plausible package names (`requests-oauth-helper`, `aws-sdk-utils`) that don't exist — until an attacker registers them (slopsquatting). Every import in generated or unfamiliar code is verified to be a real, canonical package before anything it does is trusted. An import of a non-existent package is a finding on its own: it will either fail, or worse, resolve to whatever someone registered.

## Install-script and build-time execution risk

Dependencies run code at install and build time, before any of your code executes:
- **npm** `preinstall`/`postinstall` scripts, **Python** `setup.py` arbitrary code at install, **Ruby** native gem extensions, **Cargo** `build.rs`. A malicious or compromised package owns the build machine and CI at install, not at runtime.
- Flag packages with install scripts in a supply-chain-sensitive context; recommend `--ignore-scripts` where feasible plus explicit vetting, and pinned digests so a compromised republish of the same version can't slip in.

## License flags at orientation depth

Flag, don't lawyer. Note copyleft (GPL/AGPL) or unusual/missing licenses on dependencies as a *point for legal to review*, especially AGPL in a distributed/SaaS context. State that license compatibility is a legal determination, not a security finding — this is a hand-off, not a conclusion.

## Lockfile hygiene as a finding class

- **No lockfile** — builds are non-reproducible; the same manifest installs different transitive versions over time, so a vetted build and a shipped build can differ. Finding: commit a lockfile.
- **Lockfile out of sync with manifest** — the manifest was edited without regenerating the lock; installs may resolve unexpectedly.
- **Unpinned or floating versions** (`latest`, `*`, broad `^`ranges on security-sensitive deps) — a compromised or malicious new release is pulled automatically. Finding: pin, and where the ecosystem supports it, pin by integrity hash/digest so a republished version with the same number can't substitute.
