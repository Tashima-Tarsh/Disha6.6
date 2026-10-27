"""Run unified health checks across all BharatData live adapters and upstream services."""

from __future__ import annotations
import sys
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import argparse
import datetime
import json
import os
from pathlib import Path

from live import aadhaar, cowin, echallan, eci, ewaybill, gst, nsso, sarathi, vahan

HEALTH_FILE = "index/health.json"


def run_all_checks() -> dict:
    """Execute health checks across all adapters and compile health summary."""
    results = {}
    results["cowin"]          = cowin.check_health()
    results["eci"]            = eci.check_health()
    results["vahan"]          = vahan.check_health()
    results["sarathi"]        = sarathi.check_health()
    results["echallan"]       = echallan.check_health()
    results["aadhaar_offline"]= aadhaar.check_health()
    results["gst"]            = gst.check_health()
    results["ewaybill"]       = ewaybill.check_health()
    results["nsso"]           = nsso.check_health()

    unhealthy = [k for k, v in results.items() if v.get("status") not in ("HEALTHY", "DEGRADED")]
    overall_status = "DEGRADED" if unhealthy else "OPERATIONAL"

    summary = {
        "updated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "status": overall_status,
        "services": results,
    }

    health_path = Path(HEALTH_FILE)
    health_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = health_path.with_suffix(".json.tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, sort_keys=True)
    os.replace(tmp_path, health_path)

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="BharatData Upstream Health Checker")
    parser.add_argument("--json", action="store_true", help="Print json output only")
    args = parser.parse_args()

    summary = run_all_checks()

    if args.json:
        print(json.dumps(summary, indent=2))
        return

    print("==================================================")
    print(f"BharatData Upstream Health: [{summary['status']}]")
    print(f"Updated: {summary['updated_utc']}")
    print("--------------------------------------------------")
    for svc, details in summary["services"].items():
        status   = details.get("status", "UNKNOWN")
        latency  = details.get("latency_ms", 0)
        endpoint = details.get("endpoint", "")
        print(f"  {svc.upper():<20} : {status:<10} ({latency}ms) -> {endpoint}")
    print("==================================================")


if __name__ == "__main__":
    main()
