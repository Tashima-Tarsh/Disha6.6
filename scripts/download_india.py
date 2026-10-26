#!/usr/bin/env python3
"""Download Indian breach/index repos from GitHub into data/india/.
Real downloads, no test data."""
import json
import os
import re
import subprocess
import urllib.request

REPO = os.path.dirname(os.path.abspath(__file__))
INDIA_DIR = os.path.join(REPO, "data", "india")
DUMPS_DIR = os.path.join(REPO, "data", "dumps")
os.makedirs(INDIA_DIR, exist_ok=True)
os.makedirs(DUMPS_DIR, exist_ok=True)

REPOS = [
    "notdls/known-breaches",
    "ClarkBXu/Data_Breach_Report",
    "atharvdeshmukh18/github.com-cipherguard-breachradar",
    "opensource-jeff/breach-hog",
    "Hidden-Layer-Media/self-hosted-database-info-leak-checker",
    "in-rolls/electoral_rolls",
    "sharik19/India-Electoral-Rolls",
    "Vonter/india-vehicle-stats",
]

def run(cmd):
    print("RUN:", " ".join(cmd))
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.stdout:
        print(p.stdout[-2000:])
    if p.returncode != 0 and p.stderr:
        print("ERR:", p.stderr[-1000:])
    return p.returncode

results = []
for r in REPOS:
    name = r.split("/")[-1]
    dest = os.path.join(INDIA_DIR, name)
    if os.path.exists(dest):
        print(f"skip {name} (exists)")
        results.append((name, "skipped"))
        continue
    rc = run(["git", "clone", "--depth", "1", f"https://github.com/{r}.git", dest])
    results.append((name, "ok" if rc == 0 else f"failed rc={rc}"))

# scrape indianbreaches archive
try:
    req = urllib.request.Request("https://indianbreaches.com/archive",
                                 headers={"User-Agent": "osint-one/1.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    slugs = list(dict.fromkeys(re.findall(r'/breach/([a-z0-9\-]+)', html)))
    with open(os.path.join(INDIA_DIR, "indianbreaches_index.jsonl"), "w") as f:
        for s in slugs:
            f.write(json.dumps({"slug": s}) + "\n")
    print(f"scraped {len(slugs)} breach records from indianbreaches.com")
    results.append(("indianbreaches_archive", f"ok {len(slugs)} records"))
except Exception as e:
    print("scrape skipped:", e)
    results.append(("indianbreaches_archive", f"skipped {e}"))

print("\n=== DOWNLOAD SUMMARY ===")
for name, status in results:
    print(f"  {name}: {status}")
print(f"\nIndia dir: {INDIA_DIR}")
print(f"Dumps dir: {DUMPS_DIR}")
