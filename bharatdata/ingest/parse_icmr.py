"""Parse ICMR laboratory network and surveillance data."""

from __future__ import annotations
import sys
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


import argparse
import json
import sqlite3
import uuid
from pathlib import Path
from typing import Optional

from ingest.common import read_json, sha256, write_json
from ingest.ledger import record


def parse_icmr(
    input_path: str,
    output_dir: str = "data/icmr/parsed",
    db_path: Optional[str] = "index/bharatdata.db",
) -> str:
    """Parse raw ICMR payload into normalized lab and surveillance rows."""
    src = Path(input_path)
    if not src.exists():
        raise FileNotFoundError(f"ICMR input file not found: {input_path}")

    data = read_json(src)
    out_file = Path(output_dir) / f"{src.stem}_parsed.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    state = data.get("state", "UNKNOWN")
    report_date = data.get("report_date", "2024-01-01")
    surv = data.get("surveillance", {})

    surveillance_row = {
        "report_date": report_date,
        "state": state,
        "total_samples_tested": int(surv.get("total_samples_tested", 0)),
        "positive_samples": int(surv.get("positive_samples", 0)),
        "test_positivity_rate": float(surv.get("positivity_rate", 0.0)),
    }

    labs = []
    for lab in data.get("labs", []):
        labs.append({
            "lab_id": lab.get("lab_id", f"LAB-{uuid.uuid4().hex[:6]}"),
            "lab_name": lab.get("lab_name", "UNKNOWN"),
            "state": state,
            "district": lab.get("district", "UNKNOWN"),
            "lab_type": lab.get("lab_type", "GOVERNMENT"),
            "is_accredited": 1 if lab.get("is_accredited", True) else 0,
            "pincode": lab.get("pincode", ""),
        })

    result = {
        "source_file": str(src),
        "surveillance": surveillance_row,
        "labs": labs,
    }
    write_json(out_file, result)

    if db_path and Path(db_path).exists():
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO icmr_surveillance_aggregates
            (report_date, state, total_samples_tested, positive_samples, test_positivity_rate)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                surveillance_row["report_date"],
                surveillance_row["state"],
                surveillance_row["total_samples_tested"],
                surveillance_row["positive_samples"],
                surveillance_row["test_positivity_rate"],
            ),
        )
        for l in labs:
            cur.execute(
                """
                INSERT OR REPLACE INTO icmr_lab_network
                (lab_id, lab_name, state, district, lab_type, is_accredited, pincode)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    l["lab_id"],
                    l["lab_name"],
                    l["state"],
                    l["district"],
                    l["lab_type"],
                    l["is_accredited"],
                    l["pincode"],
                ),
            )
        con.commit()
        con.close()

    out_hash = sha256(out_file)
    record(
        path=str(out_file),
        url=f"file://{src.as_posix()}",
        http_status=200,
        size_bytes=out_file.stat().st_size,
        sha256=out_hash,
        run_id=f"parse-icmr-{uuid.uuid4().hex[:8]}",
        phase="parse_normalized",
        parser="parse_icmr",
    )
    return str(out_file)


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse ICMR surveillance datasets")
    parser.add_argument("--input", required=True, help="Path to raw ICMR JSON file")
    parser.add_argument("--output-dir", default="data/icmr/parsed", help="Parsed output directory")
    parser.add_argument("--db", default="index/bharatdata.db", help="Path to SQLite database")
    args = parser.parse_args()

    parsed = parse_icmr(args.input, args.output_dir, args.db)
    print(f"Parsed ICMR output written to {parsed}")


if __name__ == "__main__":
    main()
