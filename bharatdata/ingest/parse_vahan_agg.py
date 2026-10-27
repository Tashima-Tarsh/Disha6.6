"""Parse Vahan vehicle registration aggregates."""

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


def parse_vahan(
    input_path: str,
    output_dir: str = "data/vahan/parsed",
    db_path: Optional[str] = "index/bharatdata.db",
) -> str:
    """Parse raw Vahan aggregates into state categories and RTO records."""
    src = Path(input_path)
    if not src.exists():
        raise FileNotFoundError(f"Vahan input file not found: {input_path}")

    data = read_json(src)
    out_file = Path(output_dir) / f"{src.stem}_parsed.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    state_code = data.get("state_code", "UNKNOWN")
    state_name = data.get("state_name", "UNKNOWN")
    year = int(data.get("year", 2024))
    month = int(data.get("month", 1))

    categories = []
    for item in data.get("categories", []):
        categories.append({
            "state_code": state_code,
            "state_name": state_name,
            "year": year,
            "month": month,
            "vehicle_category": item.get("category", "OTHER"),
            "fuel_type": item.get("fuel", "PETROL"),
            "total_registered": int(item.get("count", 0)),
        })

    rtos = []
    reporting_date = f"{year}-{month:02d}-01"
    for rto in data.get("rtos", []):
        rtos.append({
            "rto_code": rto.get("rto_code", "UNKNOWN"),
            "rto_name": rto.get("rto_name", "UNKNOWN"),
            "state_code": state_code,
            "vehicle_category": "ALL",
            "total_count": int(rto.get("total", 0)),
            "reporting_date": reporting_date,
        })

    result = {
        "source_file": str(src),
        "state_code": state_code,
        "state_name": state_name,
        "year": year,
        "month": month,
        "categories": categories,
        "rtos": rtos,
    }
    write_json(out_file, result)

    if db_path and Path(db_path).exists():
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        for cat in categories:
            cur.execute(
                """
                INSERT INTO vahan_state_aggregates 
                (state_code, state_name, year, month, vehicle_category, fuel_type, total_registered)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cat["state_code"],
                    cat["state_name"],
                    cat["year"],
                    cat["month"],
                    cat["vehicle_category"],
                    cat["fuel_type"],
                    cat["total_registered"],
                ),
            )
        for r in rtos:
            cur.execute(
                """
                INSERT INTO vahan_rto_metrics
                (rto_code, rto_name, state_code, vehicle_category, total_count, reporting_date)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    r["rto_code"],
                    r["rto_name"],
                    r["state_code"],
                    r["vehicle_category"],
                    r["total_count"],
                    r["reporting_date"],
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
        run_id=f"parse-vahan-{uuid.uuid4().hex[:8]}",
        phase="parse_normalized",
        parser="parse_vahan_agg",
    )
    return str(out_file)


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse Vahan registration datasets")
    parser.add_argument("--input", required=True, help="Path to raw Vahan JSON file")
    parser.add_argument("--output-dir", default="data/vahan/parsed", help="Parsed output directory")
    parser.add_argument("--db", default="index/bharatdata.db", help="Path to SQLite database")
    args = parser.parse_args()

    parsed = parse_vahan(args.input, args.output_dir, args.db)
    print(f"Parsed Vahan output written to {parsed}")


if __name__ == "__main__":
    main()
