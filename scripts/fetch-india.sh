#!/usr/bin/env bash
# fetch-india.sh — download free GitHub repos with breach/index/OSINT data
set -euo pipefail
mkdir -p data/india data/dumps && cd data/india

REPOS=(
  notdls/known-breaches
  ClarkBXu/Data_Breach_Report
  atharvdeshmukh18/github.com-cipherguard-breachradar
  opensource-jeff/breach-hog
  Hidden-Layer-Media/self-hosted-database-info-leak-checker
  in-rolls/electoral_rolls
  sharik19/India-Electoral-Rolls
  Vonter/india-vehicle-stats
)
for r in "${REPOS[@]}"; do
  n=$(basename "$r")
  if [ -d "$n" ]; then echo "skip $n"; else
    echo "clone $r"; git clone --depth 1 "https://github.com/$r.git" "$n" 2>/dev/null || echo "  FAILED $r"
  fi
done

# scrape indianbreaches archive index
python3 - <<'PY' 2>/dev/null || true
import re, json, urllib.request
url = "https://indianbreaches.com/archive"
req = urllib.request.Request(url, headers={"User-Agent": "osint-one/1.0"})
try:
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    slugs = list(dict.fromkeys(re.findall(r'/breach/([a-z0-9\-]+)', html)))
    with open("indianbreaches_index.jsonl","w") as f:
        for s in slugs: f.write(json.dumps({"slug": s}) + "\n")
    print(f"scraped {len(slugs)} breach records")
except Exception as e:
    print("scrape skipped:", e)
PY

# free wordlists / breach samples (small, genuinely free)
cd ../dumps
[ -f rockyou.txt ] || { echo "downloading rockyou.txt"; curl -sL --fail --retry 3 -o rockyou.txt "https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt" 2>/dev/null || echo "  rockyou failed"; }
echo "india data ready -> $(pwd)/../india  and  $(pwd)"
