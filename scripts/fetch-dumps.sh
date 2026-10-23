#!/usr/bin/env bash
# fetch-dumps.sh — download genuinely free breach/wordlist resources
set -euo pipefail
mkdir -p data/dumps && cd data/dumps

echo "== RockYou wordlist (140 MB) =="
[ -f rockyou.txt ] || curl -sL --fail --retry 3 -o rockyou.txt.7z "https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt.7z" 2>/dev/null || true

echo "== SecLists (clone, large wordlist collection) =="
[ -d SecLists ] || git clone --depth 1 https://github.com/danielmiessler/SecLists 2>/dev/null || true

echo "done -> $(pwd)"
