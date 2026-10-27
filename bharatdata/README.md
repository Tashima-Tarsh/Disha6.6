# BharatData 🇮🇳

Unified Open Data Ingestion, Verification, and Query Platform for Indian Public Registries.

BharatData orchestrates reproducible, byte-preserving ingestion, schema normalization, cryptographic ledger indexing, and live status verification across Indian public data sources:
- **ECI (Election Commission of India / Dataverse)**: Lok Sabha and Assembly election candidate, constituency, and result histories.
- **CoWIN**: Public aggregate vaccination metrics, doses administered, district coverage, and vaccine distributions.
- **Vahan & Sarathi**: Vehicle registration aggregates, fuel classification, permit stats, and licensing status.
- **eChallan**: Public traffic violation and penalty tracking.
- **Aadhaar**: Cryptographic verification of offline e-KYC XML packages and secure QR code decompressed payloads (with zero plaintext UID storage guarantee).
- **ICMR**: Testing centers, public health research statistics, and diagnostic lab networks.

---

## Architecture Overview

```
bharatdata/
├── data/                 # Raw downloads, parsed normalized records, metadata
│   ├── aadhaar/
│   ├── eci/
│   ├── vahan/
│   ├── cowin/
│   ├── icmr/
│   └── bulk/
├── index/                # Cryptographic provenance ledger & operational health
│   ├── manifest.json     # Content-addressed ledger (SHA256, run_id, url)
│   └── health.json       # Live probe status, uptime, latency
├── ingest/               # Resumable, rate-limited ingestion & parsing pipelines
├── live/                 # Live source probing & verification adapters
├── schema/               # Relational SQL schemas, analytical views, join keys
├── search/               # Fast SQLite FTS / relational search CLI and API server
└── tests/                # Invariant checks, ledger validation, unit test suite
```

---

## Key Invariants & Safety

1. **Aadhaar Privacy Guarantee**: Never store 12-digit plain Aadhaar numbers. Parsers only extract masked identifiers (e.g. `XXXX-XXXX-1234`) and cryptographic signatures/hashes.
2. **Byte-Preserving Ingestion**: All downloaded datasets are recorded with their SHA-256 hashes in `index/manifest.json`. Re-fetching identical blobs is skipped via content-addressing.
3. **Adaptive Rate Limiting**: Per-host token buckets ensure compliance with upstream terms of service and avoid throttling.

---

## Quickstart

### 1. Installation
```bash
cd bharatdata
pip install -r requirements.txt
```

### 2. Initialize Database Schema
```bash
make init-db
# Or manually run SQLite migration:
python -c "import sqlite3, glob; con = sqlite3.connect('index/bharatdata.db'); [con.executescript(open(f, encoding='utf-8').read()) for f in sorted(glob.glob('schema/*.sql'))]; con.close()"
```

### 3. Run Ingestion Pipelines
```bash
# Ingest ECI election datasets
python -m ingest.fetch_eci_dataverse --state "DL" --year 2024
python -m ingest.parse_eci_dataverse --input data/eci/raw/sample.csv

# Ingest CoWIN aggregate metrics
python -m ingest.fetch_cowin --state-id 9
python -m ingest.parse_cowin --input data/cowin/raw/cowin_summary.json

# Parse Aadhaar XML / QR payloads offline
python -m ingest.parse_aadhaar_xml --input data/aadhaar/raw/sample_kyc.xml
python -m ingest.parse_aadhaar_qr --input data/aadhaar/raw/qr_data.bin
```

### 4. Search and Query
```bash
# CLI Search
python -m search.cli --dataset eci --query "New Delhi"
python -m search.cli --dataset vahan --query "DL-01"

# Start Local API Server
python -m search.server --port 8000
# Visit http://localhost:8000/docs for Swagger UI
```

### 5. Run Live Health Checks
```bash
python -m live.healthcheck
```

### 6. Run Test Suite
```bash
pytest tests -v
```

