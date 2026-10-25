# Scripting & Automation — Admin Depth

This file composes with application-architecture's shell-scripting discipline: the craft canon (style, structure, when-to-promote) lives there and is not restated here. This file is the *operations* layer — the bash features, text tools, and patterns that turn shell into reliable automation. Durable territory almost throughout; the perishable edge is tool availability (bats, shellcheck packaging) — verify on the target before assuming.

Comments in every generated script explain *why*, never narrate *what* — a permanent rule from SKILL.md.

## Contents

1. Bash beyond the basics
2. The text toolchain at fluency
3. Robust-script patterns
4. Script testing
5. Scheduling automation properly
6. Python for operations, at orientation
7. The fleet argument

---

## 1. Bash beyond the basics

These are **bash** features — mark scripts `#!/usr/bin/env bash`, not `sh`. POSIX `sh` (and dash, which `/bin/sh` is on Debian-family) has none of the arrays and little of the expansion below; BSD ships bash as an add-on, not the default shell.

**Arrays and associative arrays.** The end of "string with spaces as a poor man's list":

```bash
hosts=(web01 web02 "db 01")          # element with a space survives
for h in "${hosts[@]}"; do echo "→ $h"; done   # "${arr[@]}" quoted: one word per element

declare -A owner=( [web01]=alice [db01]=bob )
echo "${owner[web01]}"; echo "${!owner[@]}"    # value; all keys
```

`"${arr[@]}"` with the quotes is the whole trick — unquoted, spaces re-split and the array was pointless.

**Parameter expansion — the tool that replaces sed half the time.** No subprocess, no quoting fight:

```bash
f=/data/logs/app.2026-08-13.log
echo "${f##*/}"        # app.2026-08-13.log   — basename (strip longest */ from front)
echo "${f%/*}"         # /data/logs           — dirname
echo "${f%.log}.gz"    # …2026-08-13.gz       — swap extension
echo "${f/2026/2025}"  # substitution
: "${TIMEOUT:=30}"     # default-assign: use env if set, else 30
echo "${#f}"           # length
```

`${var:?msg}` (die if unset) belongs in every script that takes required environment.

**Traps for cleanup.** The difference between a script and a script that doesn't litter:

```bash
tmpdir=$(mktemp -d) || exit 1
trap 'rm -rf "$tmpdir"' EXIT           # runs on normal exit, error exit, and SIGTERM/SIGINT via EXIT
```

Single quotes on the trap string — expansion happens when the trap *fires*, which is what you want. `trap 'echo "failed at line $LINENO" >&2' ERR` is the poor man's stack trace.

**Subshell vs command grouping.** `( … )` runs in a child — variable changes and `cd` vanish with it (useful: `(cd /tmp && tar xf …)` without losing your place). `{ …; }` runs in the current shell — changes persist; note the required spaces and trailing `;`. The classic trap: `cat file | while read -r line; do count=$((count+1)); done` — the pipe put the loop in a subshell, and `count` evaporates. Fix with redirection: `while read -r line; do …; done < file`.

**Process substitution.** A pipeline pretending to be a file — for tools that want filenames, and for feeding loops without the subshell problem:

```bash
diff <(ssh web01 'sha256sum -c manifest') <(ssh web02 'sha256sum -c manifest')
while read -r u; do …; done < <(getent passwd | awk -F: '$3>=1000{print $1}')
```

**getopts** for flag parsing (POSIX-portable, handles `-ab` clustering):

```bash
dry_run=false
while getopts ":nv:" opt; do
  case $opt in
    n) dry_run=true ;;
    v) volume=$OPTARG ;;
    \?) echo "usage: $0 [-n] [-v vol]" >&2; exit 2 ;;
  esac
done
shift $((OPTIND-1))
```

---

## 2. The text toolchain at fluency

The Unix idea: small tools composed by pipes, each doing one transformation. GNU/BSD flag dialects diverge (`sed -i` needs an argument on BSD/macOS; `stat`, `date -d` differ) — say which you're writing.

**grep** — selection. `-E` (extended regexes, drop the backslash tax), `-o` (print only the match — half of extraction jobs), `-v`, `-c`, `-r`, `-F` (fixed strings — faster, and safe when the pattern is data).

**cut / sort / uniq / join** — the column tools. `cut -d: -f1,7`, `sort -t: -k3 -n` (numeric on a field — forget `-n` and 10 sorts before 9), `sort -h` for `du` output, `uniq -c` **only after sort**, `join` for the two-file merge nobody remembers exists.

**xargs** — argument building. The rule that prevents the classic filename disaster: `find … -print0 | xargs -0 …` — NUL delimiters, because filenames may contain newlines. `-P8` turns any pipeline into a parallel one; `-I{}` for placement.

**sed** — stream editing where expansion can't reach: `-n` + `p` for extraction (`sed -n '/^\[Unit\]/,/^$/p' unit.file`), in-place with the portability note above, and the honesty that beyond substitution and ranges, the next tool is better.

**awk, given its due — it is a language.** Pattern → action over records and fields, with variables, associative arrays, and functions. The idiom that makes it indispensable — aggregate without a database:

```
$ ss -tn state established | awk 'NR>1 {split($5,a,":"); c[a[1]]++} END {for (ip in c) print c[ip], ip}' | sort -rn | head -3
41 203.0.113.7
12 198.51.100.22
 3 192.0.2.44
```

Field surgery (`$3=""`), `-F` for delimiters, `NR`/`NF`, `printf` for reports. When an awk program grows past a screen, that's application-architecture's promotion rule knocking.

**Composition** is the actual skill — each stage one transformation, testable by truncating the pipeline at any `|` and looking at the intermediate output.

---

## 3. Robust-script patterns

**`set -euo pipefail` — with its caveats stated,** because reciting it without them produces mystery exits:

- `-e` exits on failure — but *not* in `if`/`while`/`&&`/`||` contexts, and a function's internal failures are masked when the call is a condition. It's a tripwire, not error handling; still handle the errors that matter explicitly (`cmd || die "cmd failed"`).
- `-u` makes unset variables fatal — the typo-catcher; use `${var:-}` where empty is legitimate.
- `pipefail` makes a pipeline's status its first failure, not its last stage — but a downstream `head` closing the pipe early can turn it into false alarms (SIGPIPE).

`set -x` (or `bash -x script`) for tracing; `PS4='+${BASH_SOURCE}:${LINENO}: '` makes the trace cite line numbers.

**Logging from scripts.** Write to stderr (stdout is the script's *product*; keeping them separate is what makes the script composable), timestamp, and under systemd let the journal do the collection:

```bash
log() { printf '%s %s\n' "$(date -Is)" "$*" >&2; }
# or straight to syslog/journal, tagged and filterable:
logger -t nightly-report "run complete rc=$rc"
```

**Lockfiles — one instance at a time.** The pattern that survives crashes (no stale-pidfile dance) is `flock` on a descriptor; the lock dies with the process:

```bash
exec 9>/run/lock/nightly-report.lock
flock -n 9 || { log "another run in progress; exiting"; exit 0; }
```

**Idempotence** — administration.md's argument, applied to scripts: check state, then converge; never assume a starting point. `mkdir -p`, `ln -sfn`, "create if absent" guards, and writes that are atomic: build the file as a temp sibling, `mv` into place — `mv` within a filesystem is atomic (system-internals.md, inodes), so readers see the old file or the new one, never a half-written one.

**Dry-run flags as a design habit.** Every script that changes things grows `-n` on day one, and every mutating action routes through one gate:

```bash
run() { if $dry_run; then log "DRY-RUN: $*"; else "$@"; fi; }
run rsync -a --delete "$src/" "$dst/"
```

The gate pattern means dry-run coverage can't drift out of sync with the real actions — and it doubles as the audit log of what the script did. This is the safety discipline from SKILL.md wearing automation clothes: the `--delete` above is a destructive operation, so the first run is `-n`, the output is read, and the backup exists before the second run.

---

## 4. Script testing

**ShellCheck is non-negotiable.** It catches the real bug classes — unquoted expansions, `$?` misuse, subshell variable loss, useless `cat` — statically, before the 2 a.m. run does it dynamically. In the editor, in CI, and on any script this skill emits. Directive comments (`# shellcheck disable=SC2086` with a reason) are the escape hatch, and the reason is mandatory — an undocumented disable is a bug report to your future self.

**bats** (Bash Automated Testing System), at orientation — enough to know the shape and where it pays:

```bash
@test "rotates and compresses yesterday's log" {
  run ./rotate.sh -n /tmp/fixture
  [ "$status" -eq 0 ]
  [[ "$output" == *"DRY-RUN"* ]]
}
```

Where it pays: scripts with parseable output and meaningful exit codes (which section 3's patterns produce anyway), fixtures over live systems, and the dry-run gate making mutations assertable without side effects. A nightly job that a fleet depends on has earned tests; a five-line wrapper has not — judgment, stated as such.

---

## 5. Scheduling automation properly

administration.md carries the cron-vs-timer comparison; this is the worked pair for a job with an ordering requirement — timers win precisely when *ordering matters*, because the job is a real unit with real dependencies:

```ini
# /etc/systemd/system/nightly-report.service
[Unit]
Description=Nightly report build
After=network-online.target postgresql.service
Wants=network-online.target
[Service]
Type=oneshot
User=report
ExecStart=/usr/local/bin/nightly-report.sh
```

```ini
# /etc/systemd/system/nightly-report.timer
[Unit]
Description=Run nightly report at 02:15
[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=10m
[Install]
WantedBy=timers.target
```

```
$ sudo systemctl daemon-reload && sudo systemctl enable --now nightly-report.timer
$ systemctl list-timers nightly-report.timer
NEXT                        LEFT     LAST  PASSED  UNIT                  ACTIVATES
Fri 2026-08-14 02:15:00 CDT 10h left -     -       nightly-report.timer  nightly-report.service
$ sudo systemctl start nightly-report.service      # test the job NOW, same env as the timer
```

That last line is the killer feature cron never had: the scheduled job and the hand-run test are the same unit, same environment, same journal. `OnCalendar` syntax is checked with `systemd-analyze calendar 'Mon..Fri 02:15'`.

---

## 6. Python for operations, at orientation

Where shell stops being the right tool — structured data (JSON/YAML), real error handling, arithmetic beyond integers, anything needing data structures richer than an associative array — Python is the operations lingua franca. Orientation depth: the standard library carries most ops work (`subprocess.run(..., check=True, capture_output=True)`, `pathlib`, `json`, `argparse`, `logging`), and `jq` is the shell-side bridge for JSON before a script earns the rewrite. **The promotion rule — when a script *should* become a Python program — lives in application-architecture by pointer; this file only notes that pipeline-shaped work with flat text stays shell, and state-shaped work with structured data doesn't.**

---

## 7. The fleet argument

The loop over SSH is where fleet automation honestly starts, and it deserves to be written well rather than pretended away:

```bash
mapfile -t hosts < hosts.txt
for h in "${hosts[@]}"; do
  ssh -o BatchMode=yes -o ConnectTimeout=5 "$h" 'uname -r' \
    | sed "s/^/$h: /" || log "FAILED: $h"
done
```

`BatchMode=yes` (fail instead of hanging on a password prompt), a timeout, per-host labeling, and failure capture — plus SSH multiplexing from networking-stack.md to make it fast, and `xargs -P` for parallelism when order doesn't matter. **The one-host-first rule from SKILL.md's safety discipline is doubled at fleet scale: one host, verify, then a canary slice, then all — never straight to all.**

Its limits, stated: no idempotence (the loop reruns everything), no drift model (it pushes commands, not desired state), failure handling is per-run bookkeeping, and the script encodes *how* rather than *what*. Those four limits are precisely the feature list of configuration management — administration.md section 9 names the threshold ("when you can no longer state that two identical servers are identical") and the categories. The loop is the right tool for read-only sweeps, one-off emergencies, and fleets of five; the tenth divergent snowflake is the sign you've crossed the line.
