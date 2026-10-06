#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .gitmodules ]; then
  echo "ERROR: .gitmodules is missing." >&2
  exit 1
fi

MODE="${1:---init}"
JOBS="${DISHA_SUBMODULE_JOBS:-4}"

sync_config() {
  git submodule sync
}

init_all() {
  sync_config
  git submodule update --init --jobs "$JOBS"
}

check_all() {
  init_all
  failed=0
  while read -r key path; do
    name="${key#submodule.}"
    name="${name%.path}"
    expected_url="$(git config -f .gitmodules --get "submodule.${name}.url")"
    origin_url="$(git -C "$path" remote get-url origin 2>/dev/null || true)"
    pinned_sha="$(git ls-tree HEAD "$path" | awk '{print $3}')"
    actual_sha="$(git -C "$path" rev-parse HEAD 2>/dev/null || true)"

    if [ "$origin_url" != "$expected_url" ]; then
      echo "MISMATCH URL  $path"
      echo "  expected: $expected_url"
      echo "  actual:   $origin_url"
      failed=1
    fi

    if [ "$actual_sha" != "$pinned_sha" ]; then
      echo "MISMATCH SHA  $path"
      echo "  pinned: $pinned_sha"
      echo "  actual: $actual_sha"
      failed=1
    else
      echo "OK  $path  $actual_sha"
    fi
  done < <(git config -f .gitmodules --get-regexp '^submodule\..*\.path$')

  if [ "$failed" -ne 0 ]; then
    exit 1
  fi
}

update_remote() {
  init_all
  git submodule update --remote --merge --jobs "$JOBS"
  echo
  echo "Upstream working trees updated. Review and commit changed gitlinks in DISHA:"
  git status --short
}

case "$MODE" in
  --init) init_all ;;
  --check) check_all ;;
  --remote) update_remote ;;
  *)
    echo "Usage: $0 [--init|--check|--remote]" >&2
    exit 2
    ;;
esac
