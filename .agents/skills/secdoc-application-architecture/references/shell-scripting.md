# Bash and PowerShell — Engineering, Not Incantation

Verify at use time: current PowerShell version and its cross-platform/LTS status, and the Bash version floor on target systems (macOS ships an ancient Bash for licensing reasons; "Bash" on a fleet may mean 3.2 through 5.x). Date such claims.

## Contents
- Bash safety discipline
- Bash: arrays, word-splitting, portability
- PowerShell's actual model
- PowerShell error handling and remoting
- Which shell when
- The promotion rule

---

## Bash safety discipline

**Quoting is the number-one defect class.** Every unquoted variable expansion is a word-splitting and glob-expansion site: `rm $file` on `file="my report.txt"` removes `my` and `report.txt`; on `file="*"` it removes everything. The rule admits almost no exceptions: quote every expansion — `"$var"`, `"$(cmd)"`, `"$@"` (which expands to correctly-separated arguments; `$*` and unquoted `$@` do not). The exceptions are deliberate and commented, or they're bugs.

**`set -euo pipefail` and its caveats** — use it, and know what it doesn't do:
- `set -e` exits on command failure — but not in `if` conditions, `&&`/`||` chains, or command substitutions in some positions; a function called in a condition runs with `-e` effectively off inside it. It's a tripwire, not a guarantee.
- `set -u` errors on unset variables — the cheap typo catcher. Use `${var:-default}` for genuinely-optional values.
- `set -o pipefail` makes a pipeline's status the last *failure*, not the last command — without it, `curl … | grep x` succeeds when curl fails.
- Add `trap cleanup EXIT` for temp files and locks; the trap runs on `-e` exits too.

**ShellCheck is non-negotiable.** In CI, on every script, warnings treated as defects. It catches the quoting class, the `-e` edge cases, and the useless-use-of patterns mechanically; a shell script not under ShellCheck is a shell script whose bugs are being found in production instead.

## Bash: arrays, word-splitting, portability

- Arrays are how you hold lists safely: `files=("a b.txt" "c.txt"); cp "${files[@]}" dest/` preserves elements with spaces. Building command lines in a string variable and expanding it unquoted is the anti-pattern arrays exist to kill. `"${#arr[@]}"` for count, `"${arr[@]:1}"` for slicing.
- Word-splitting happens on unquoted expansion using `IFS` — which is why `for f in $(ls)` is broken (splits on spaces in names, globs the results). Iterate with globs (`for f in *.txt`) or `while IFS= read -r line` for line input; `-r` stops backslash mangling.
- Associative arrays (`declare -A`) need Bash 4+ — one of several features (also `${var,,}`, `readarray`) that make "which Bash" a portability question. If the target is POSIX `sh` (Alpine's ash, dash as `/bin/sh` on Debian-family), bashisms break: no arrays, no `[[`, no process substitution. Decide the target honestly — `#!/usr/bin/env bash` and require Bash 4+, or write POSIX and let ShellCheck's `--shell=sh` hold you to it. The worst position is the accidental middle.

## PowerShell's actual model

The pipeline carries **objects, not text** — this is the design difference that everything else follows from. `Get-Process | Where-Object WorkingSet -gt 100MB | Sort-Object CPU` passes structured objects; no awk, no cut, no fragile column parsing. The corollary: don't convert to strings mid-pipeline and start parsing — that's writing Bash in PowerShell. `Select-Object` to shape, `Where-Object` to filter, `ForEach-Object` to transform, and everything stays queryable.

- **Cmdlet naming (Verb-Noun) is discoverability infrastructure:** `Get-Verb` lists approved verbs; `Get-Command -Noun *Service*` finds everything acting on services; `Get-Help` and `Get-Member` mean the shell documents itself. Follow the convention in your own functions (and use `[CmdletBinding()]` + `param()` for real parameter handling, validation attributes, and `-WhatIf` support via `SupportsShouldProcess` — free dry-run capability for destructive operations).
- Comparison operators are `-eq -ne -gt -like -match` (not `==`), and `$null` comparisons belong on the left (`$null -eq $x`) because `$x -eq $null` on a collection filters instead of testing.

## PowerShell error handling and remoting

- Two error classes: **terminating** (exceptions — caught by `try/catch`) and **non-terminating** (written to the error stream, execution continues — *not* caught by `try/catch` by default). The bridge is `-ErrorAction Stop` per call, or `$ErrorActionPreference = 'Stop'` at script scope — which is the right default for scripts-as-engineering, converting silent error-and-continue into handleable failure. `catch` specific exception types where you handle specific failures; `finally` for cleanup. Check `$LASTEXITCODE` after native executables — their failures aren't PowerShell errors at all.
- **Remoting basics:** `Invoke-Command -ComputerName x -ScriptBlock {…}` runs remotely and returns deserialized objects (property bags — methods don't survive the wire; know that when the returned object "lost" its methods). `-Session` reuses connections for repeated calls; fan-out to many machines is the headline feature. Transport is WinRM on Windows, SSH-based remoting cross-platform — configuration and hardening of either composes with cybersecurity-architecture.
- Cross-platform PowerShell (7.x lineage) runs on Linux/macOS and is a different install from Windows PowerShell 5.1 (which is frozen); module compatibility between them and current 7.x support status: verify at use time.

## Which shell is the right tool

- **Bash:** glue between Unix tools, container entrypoints, CI steps on Linux runners, anywhere POSIX-ish portability to minimal images matters. Its strength is that it's already there.
- **PowerShell:** anything touching Windows administration (AD, Exchange, registry, services), anywhere the object pipeline replaces brittle text parsing, cross-platform teams standardizing one automation language, structured-data work (native JSON/CSV handling beats jq-and-hope).
- Either way, the same engineering standards apply: version control, review, linting (ShellCheck / PSScriptAnalyzer), and idempotency for anything run more than once.

## The promotion rule — when a script has become a program

Every operations team has the story: the fifty-line cron script that grew into load-bearing infrastructure nobody wants to touch. The honest promotion criteria — when a script crosses these, it belongs in Python (usually) or a compiled language:

- **It has real data structures** — you're simulating nested structures in Bash arrays-of-strings, or the PowerShell object graph has become an application model.
- **It needs real error recovery** — retries with state, partial-failure handling, transactions — not just "stop on error."
- **It needs tests** — the moment correctness matters enough to test, bats/Pester exist but you're fighting the tool; a language with a real test ecosystem pays for itself.
- **It exceeds roughly 100–200 lines or a second maintainer** — the thresholds are soft, but past them, shell's write-only tendencies compound.
- **It parses anything non-trivial** — JSON/XML/YAML surgery in shell (even with jq) is a program wearing a script's clothes.
- **It's load-bearing** — on-call gets paged when it fails. Pageable code deserves logging, metrics, and dependency management shell can't give it.

The migration is usually cheap precisely because the script already *is* the spec — and Python's subprocess handling keeps the parts that genuinely were shell-shaped.
