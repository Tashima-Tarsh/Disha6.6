# DISHA 6.6 — Sovereign OSINT & Cyber Surveillance Platform

> **One key → everything.** Enter any identifier (mobile, vehicle, Aadhaar, EPIC, PAN, name, email, username, password, domain, IP) and get all linked details from live free APIs and local breach dumps. Zero API cost. Zero payment. Self-hosted.

## Core Concept

DISHA 6.6 is a sovereign intelligence operating system. Type **any single identifier** into the Universal Scan and the platform:

1. **Resolves the identifier** to its type (phone / vehicle / Aadhaar / PAN / EPIC / email / username / domain / IP).
2. **Fans out** to every live keyless collector (breach, accounts, IP, infra, India, live surveillance).
3. **Optionally resolves against your local breach dumps** loaded into the SQLite identity graph — one key → full linked identity graph + breach hits.
4. **Streams results live** to the UI, grouped by category, with unmasked data flagged.

## Quickstart

### Option A: Python backend only (no Node.js required)
```bash
git clone https://github.com/Tashima-Tarsh/Disha6.6.git
cd Disha6.6
pip install -r backend/requirements.txt
python3 backend/app.py
# open http://localhost:8000
```

### Option B: Full Next.js + Python stack
```bash
cd web && npm install && npm run dev   # Next.js on :3000
# separate terminal:
cd .. && python3 backend/app.py       # FastAPI on :8000
# open http://localhost:3000/osint
```

### Option C: Docker
```bash
docker compose up -d --build
# open http://localhost:8000
```

---

## What one key resolves to

| Input | Returns |
|-------|---------|
| **Mobile** `+919876543210` | Indian carrier/circle, linked name/EPIC/vehicle/address from local graph, breach hits |
| **Vehicle** `MH12AB1234` | State, RTO, valid RC format, linked owner/phone/EPIC from graph |
| **Aadhaar** `123456789012` | Verhoeff checksum validation, linked identifiers from graph |
| **PAN** `ABCDE1234F` | Format validation, linked identifiers from graph |
| **EPIC** `ABC1234567` | Voter ID format validation, linked identifiers from graph |
| **Email** `you@example.com` | XposedOrNot breach metadata, Gravatar, account sweep (GitHub, Reddit, Telegram, etc.) |
| **Password** | HIBP pwned-password check (times seen / clean) |
| **Domain** `example.com` | crt.sh certificates, Wayback availability |
| **IP** `1.2.3.4` | ipapi.co + ipinfo.io geolocation + org |
| **Username** | Sherlock/Maigret/Holehe account sweep (if installed) |

---

## Getting REAL unmasked data (local breach dumps)

Free public APIs tell you **if** an email/phone appeared in a breach — they do **not** hand over raw plaintext PII without payment. For complete unmasked records:

1. **Download breach dumps** (free from Kaggle / HuggingFace / BreachForums mirrors — multi-GB each).
2. **Drop CSVs into `data/india/`**.
3. **Load into the graph:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/data/load \
     -H "Content-Type: application/json" \
     -d '{"directory":"data/india"}'
   ```
4. **Search:** Enter any phone/vehicle/name/Aadhaar/EPIC → full linked graph + breach hits, unmasked.

The system ships with a pre-downloaded `known-breaches` index and Indian electoral-roll / vehicle-stats repos under `data/india/`.

---

## Vyuh Formations (defensive formation matrix)

Activate from the UI → **Vyuh Formations**:

| Formation | Purpose |
|-----------|---------|
| **Chakra Vyuha** | Perimeter cyber defense — flights, quakes, satellites, certs |
| **Padma Vyuha** | Deep entity resolution — Sherlock, Maigret, Holehe, PhoneInfoga |
| **Garuda Vyuha** | Airborne & signals recon — flights, satellites, GDELT |
| **Suryavyuha** | Macro pattern recognition — graph, breach corpus, XposedOrNot |
| **Nakshatra Mandala** | Satellite & celestial — satellites, certs |
| **Sarvatobhadra** | Omnidirectional node defense — GDELT, Wayback |
| **NYAYA Audit** | BSA 2023 §61/63/65B evidence verification — breach corpus, graph |
| **SETU-VARUNA** | Maritime & port resiliency — flights, GDELT |

---

## Offensive cyber tools (built-in)

- **Subdomain enumeration** via crt.sh
- **DNS resolution** (A records)
- **HTTP header inspection**
- **Common port scan** (21,22,23,25,53,80,110,135,139,143,443,445,993,995,1433,3306,3389,5432,5900,6379,8080,8443,27017)

---

## Architecture

```
Browser (Next.js 16 + 3D HUD UI)
         │
         ▼
   /api/osint/*  (Next.js API routes)
         │
         ▼
   FastAPI backend (:8000)
   ├── 32 OSINT collectors (breach, accounts, phone, India, live, infra, offensive)
   ├── SQLite identity graph (auto column-detection CSV loader, BFS resolver)
   ├── Vyuh formations engine
   └── DISHA 6.6 core integration (evidence, policy, graph)
```

- **Frontend:** Next.js 16, TypeScript, Tailwind, 3D HUD cyber theme.
- **Backend:** Python FastAPI, zero external runtime deps beyond stdlib + fastapi/uvicorn.
- **Graph:** SQLite (WAL mode) — no Postgres required on Windows/local dev.
- **Cost:** $0/month. All collectors use free public endpoints.

---

## Security (fixed)

- **No hardcoded JWT secret** — `DISHA_JWT_SECRET` is required; no fallback.
- **No hardcoded dev password** — `DISHA_DEV_PASSWORD` required for dev-jwt mode; auth falls back to `password` mode if unset.
- **No secrets in git** — all configuration via `.env` / environment variables.
- **CORS** configurable; credentials only from same-origin.

---

## Repo layout

```
Disha6.6/
├── backend/app.py              # FastAPI: all collectors, graph, Vyuh, offensive tools
├── backend/requirements.txt
├── frontend/                   # (placeholder)
├── data/
│   ├── india_breaches.json     # Annotated Indian breach corpus reference
│   └── india/                  # Downloaded GitHub breach/index + gov CSVs
├── web/
│   ├── app/osint/page.tsx      # Premium 3D OSINT surveillance page
│   ├── app/api/osint/*         # Next.js API routes → FastAPI backend
│   └── components/shell/DishaShellNav.tsx  # OSINT nav link
├── scripts/fetch-india.sh      # Download GitHub breach/index repos
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Limitations (stated plainly)

- **Free APIs** do not return raw plaintext PII for arbitrary emails without payment. Raw dumps must be downloaded and loaded locally.
- **Vehicle → owner** via Vahan is captcha-gated; this system parses RC format/state only.
- **Graph merging is probabilistic** — two "Rahul Sharma" are not one person unless a shared key links them.
- **Coverage = what you load.** Load your own CSVs for complete results.

---

## License

MIT. Sovereign, self-hosted, zero-cost intelligence.
