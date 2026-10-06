#!/usr/bin/env python3
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

DOMAIN_RE = re.compile(r"^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$")
MODULES = [
    "certificate_transparency",
    "hackertarget",
    "threatminer",
]
RECON_ROOT = Path("/opt/osint/recon-ng")
MARKET_ROOT = Path("/opt/osint/recon-ng-marketplace/modules/recon/domains-hosts")


def main() -> int:
    target = (sys.argv[1] if len(sys.argv) > 1 else "").strip().lower()
    if not DOMAIN_RE.fullmatch(target):
        print(json.dumps({"error": "invalid_domain"}))
        return 2

    hosts = {}
    errors = []
    with tempfile.TemporaryDirectory(prefix="disha-recon-") as temp:
        home = Path(temp)
        module_root = home / ".recon-ng" / "modules" / "recon" / "domains-hosts"
        module_root.mkdir(parents=True, exist_ok=True)
        for name in MODULES:
            source = MARKET_ROOT / f"{name}.py"
            if not source.exists():
                errors.append(f"missing_module:{name}")
                continue
            shutil.copy2(source, module_root / source.name)

        env = os.environ.copy()
        env["HOME"] = str(home)
        env["PYTHONDONTWRITEBYTECODE"] = "1"

        for name in MODULES:
            if not (module_root / f"{name}.py").exists():
                continue
            command = [
                sys.executable,
                str(RECON_ROOT / "recon-cli"),
                "-w",
                "disha",
                "-m",
                f"recon/domains-hosts/{name}",
                "-o",
                f"SOURCE={target}",
                "-x",
                "--no-version",
                "--no-analytics",
                "--no-marketplace",
            ]
            try:
                completed = subprocess.run(
                    command,
                    cwd=RECON_ROOT,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=35,
                    check=False,
                )
                if completed.returncode != 0:
                    errors.append(f"{name}:exit_{completed.returncode}")
            except subprocess.TimeoutExpired:
                errors.append(f"{name}:timeout")

        database = home / ".recon-ng" / "workspaces" / "disha" / "data.db"
        if database.exists():
            with sqlite3.connect(database) as conn:
                for row in conn.execute(
                    "SELECT host, ip_address, module FROM hosts WHERE host IS NOT NULL ORDER BY host LIMIT 1000"
                ):
                    host, ip_address, module = row
                    key = str(host).lower()
                    hosts[key] = {
                        "host": str(host),
                        "ipAddress": str(ip_address) if ip_address else None,
                        "module": str(module) if module else None,
                    }

    result = {
        "domain": target,
        "modules": MODULES,
        "hosts": list(hosts.values()),
        "errors": errors[:20],
    }
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
