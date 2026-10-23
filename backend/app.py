#!/usr/bin/env python3
"""
DISHA 6.6 — OSINT-ONE Cyber Surveillance Backend
FastAPI microservice with all OSINT collectors, SQLite identity graph,
Vyuh defensive formations, offensive cyber tools, and live surveillance.
Zero API key required. Runs standalone or proxied by Next.js.
"""
import asyncio, json, os, sys, hashlib, shutil, subprocess, time, re, csv
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import FastAPI
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = HERE
sys.path.insert(0, HERE)
sys.path.insert(0, REPO)

PORT = int(os.environ.get("PORT", 8000))
UA = {"User-Agent": "DISHA-6.6/OSINT-ONE/2.0 (+https://localhost)"}
T = 25
POOL = ThreadPoolExecutor(max_workers=16)
FETCH_POOL = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fetch")

REGISTRY: List[dict] = []

app = FastAPI(title="DISHA 6.6 OSINT-ONE Cyber Surveillance")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def collector(name, inputs, category, unmasked=False):
    def deco(fn):
        REGISTRY.append(dict(name=name, inputs=inputs, category=category, fn=fn, unmasked=unmasked))
        return fn
    return deco


# ======================== FETCH HELPERS ========================
def _get(url, headers=None):
    h = dict(UA); h.update(headers or {})
    def _do():
        with urlopen(Request(url, headers=h), timeout=T) as r:
            return r.read().decode("utf-8", "replace"), r.status
    try:
        fut = FETCH_POOL.submit(_do)
        return fut.result(timeout=T)
    except HTTPError as e:
        return (e.read().decode("utf-8", "replace") if e.fp else ""), e.code
    except URLError as e:
        return f"ERR {e.reason}", 0
    except Exception as e:
        return f"ERR {e}", 0


def _json(url):
    b, _ = _get(url)
    try: return json.loads(b)
    except Exception: return {"_raw": b}


def _exists(url):
    return _get(url)[1] == 200


def run_tool(cmd, timeout=300):
    if not shutil.which(cmd[0]):
        return None
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return ((p.stdout or "") + (p.stderr or "")).strip()[:20000] or "(no output)"
    except Exception as e:
        return f"ERR {e}"


def safe(c, v):
    try:
        return c["fn"](v)
    except Exception as e:
        return f"ERR {e}"


def plan(v):
    provided = {k for k, val in v.items() if val}
    return [c for c in REGISTRY if set(c["inputs"]) & provided]


# ======================== IDENTIFIER NORMALIZERS ========================
_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
      [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
      [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
      [9,8,7,6,5,4,3,2,1,0]]
_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
      [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
      [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]


def verhoeff(num):
    c = 0
    for i, ch in enumerate(reversed(num)):
        c = _D[c][_P[i % 8][int(ch)]]
    return c == 0


def norm_phone(v):
    d = re.sub(r"\D", "", v)
    if d.startswith("+91"): d = d[3:]
    elif d.startswith("91") and len(d) == 12: d = d[2:]
    elif d.startswith("0") and len(d) == 11: d = d[1:]
    return d if re.fullmatch(r"[6-9]\d{9}", d) else None


def norm_aadhaar(v):
    d = re.sub(r"\D", "", v)
    return d if re.fullmatch(r"\d{12}", d) and verhoeff(d) else None


def norm_pan(v):
    v = v.upper().strip()
    return v if re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", v) else None


def norm_epic(v):
    v = v.upper().replace(" ", "").replace("-", "")
    return v if re.fullmatch(r"[A-Z]{3}\d{7}", v) else None


def norm_vehicle(v):
    n = re.sub(r"[^A-Za-z0-9]", "", v).upper()
    if re.fullmatch(r"\d{2}BH\d{4}[A-Z]{1,2}", n): return n
    m = re.fullmatch(r"([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})", n)
    return f"{m.group(1)}{int(m.group(2)):02d}{m.group(3)}{m.group(4)}" if m else None


STATE_CODES = {
    "MH": "Maharashtra", "DL": "Delhi", "KA": "Karnataka", "TN": "Tamil Nadu",
    "UP": "Uttar Pradesh", "GJ": "Gujarat", "RJ": "Rajasthan", "WB": "West Bengal",
    "KL": "Kerala", "TS": "Telangana", "AP": "Andhra Pradesh", "MP": "Madhya Pradesh",
    "HR": "Haryana", "PB": "Punjab", "BR": "Bihar", "OD": "Odisha", "JH": "Jharkhand",
    "AS": "Assam", "CH": "Chandigarh", "GA": "Goa", "UK": "Uttarakhand",
    "HP": "Himachal Pradesh", "JK": "Jammu & Kashmir", "CG": "Chhattisgarh",
}

SERIES = {
    "9820": ("Vodafone Idea", "Mumbai"), "9821": ("Vodafone Idea", "Mumbai"),
    "9833": ("Vodafone Idea", "Mumbai"), "9819": ("Airtel", "Mumbai"),
    "9870": ("Airtel", "Delhi"), "9810": ("Airtel", "Delhi"),
    "9873": ("Airtel", "Delhi"), "9953": ("Airtel", "Delhi"),
    "9845": ("Airtel", "Karnataka"), "9880": ("Airtel", "Karnataka"),
    "9840": ("Airtel", "Tamil Nadu"), "9884": ("Airtel", "Tamil Nadu"),
    "9949": ("Airtel", "Andhra Pradesh"), "9000": ("Airtel", "AP"),
    "9824": ("Vodafone Idea", "Gujarat"), "9825": ("Vodafone Idea", "Gujarat"),
    "9414": ("BSNL", "Rajasthan"), "9415": ("BSNL", "Rajasthan"),
    "7200": ("Jio", "Pan-India"), "7012": ("Jio", "Pan-India"),
    "8890": ("Jio", "Pan-India"), "9999": ("Vodafone Idea", "Pan-India"),
}


# ======================== BREACH COLLECTORS ========================
@collector("XposedOrNot breach", ["email"], "breach", unmasked=True)
def c_xon(v):
    d = _json(f"https://api.xposedornot.com/v1/breach-analytics?email={v['email']}")
    b = (d.get("ExposedBreaches") or {}).get("breaches_details") or []
    return {"count": len(b), "breaches": [
        {"breach": x.get("breach"), "date": x.get("xposed_date"),
         "records": x.get("xposed_records"), "data": x.get("xposed_data")}
        for x in b]} or d


@collector("Pwned Password (HIBP)", ["password"], "breach", unmasked=True)
def c_pwn(v):
    h = hashlib.sha1(v["password"].encode()).hexdigest().upper()
    body, _ = _get(f"https://api.pwnedpasswords.com/range/{h[:5]}")
    for line in body.splitlines():
        p = line.split(":")
        if len(p) == 2 and p[0].strip() == h[5:]:
            return {"seen": int(p[1]), "verdict": "COMPROMISED"}
    return {"seen": 0, "verdict": "clean"}


@collector("emailrep.io", ["email"], "breach")
def c_emailrep(v):
    return _json(f"https://emailrep.io/{v['email']}")


# ======================== ACCOUNT COLLECTORS ========================
@collector("Gravatar", ["email"], "accounts")
def c_grav(v):
    h = hashlib.md5(v["email"].strip().lower().encode()).hexdigest()
    return {"exists": _exists(f"https://www.gravatar.com/avatar/{h}?d=404"),
            "url": f"https://www.gravatar.com/avatar/{h}"}


@collector("GitHub", ["username"], "accounts")
def c_gh(v): return _json(f"https://api.github.com/users/{v['username']}")


@collector("GitLab", ["username"], "accounts")
def c_gl(v): return _json(f"https://gitlab.com/api/v4/users?username={v['username']}")


@collector("Reddit", ["username"], "accounts")
def c_rd(v): return _json(f"https://www.reddit.com/user/{v['username']}/about.json")


@collector("Keybase", ["username"], "accounts")
def c_kb(v): return _json(f"https://keybase.io/_/api/1.0/user/lookup.json?username={v['username']}")


@collector("HackerNews", ["username"], "accounts")
def c_hn(v): return _json(f"https://hn.algolia.com/api/v1/search?tags=author_{v['username']}&hitsPerPage=5")


@collector("npm", ["username"], "accounts")
def c_npm(v): return _json(f"https://registry.npmjs.org/-/v1/search?text=maintainer:{v['username']}&size=5")


@collector("DockerHub", ["username"], "accounts")
def c_dh(v): return _json(f"https://hub.docker.com/v2/users/{v['username']}/")


@collector("PyPI", ["username"], "accounts")
def c_pypi(v): return {"exists": _exists(f"https://pypi.org/user/{v['username']}/")}


@collector("Telegram", ["username"], "accounts")
def c_tg(v): return {"exists": _exists(f"https://t.me/{v['username']}"),
                     "url": f"https://t.me/{v['username']}"}


# ======================== SHELL TOOLS ========================
@collector("Holehe", ["email"], "accounts")
def s_holehe(v): return run_tool(["holehe", v["email"], "--no-color"])


@collector("Sherlock", ["username"], "accounts")
def s_sherlock(v): return run_tool(["sherlock", v["username"], "--print-found", "--timeout", "5"])


@collector("Maigret", ["username"], "accounts")
def s_maigret(v): return run_tool(["maigret", v["username"], "--no-color", "--top-sites", "300"])


@collector("PhoneInfoga", ["phone"], "phone")
def s_phone(v): return run_tool(["phoneinfoga", "scan", "-n", v["phone"]])


# ======================== IDENTITY ========================
@collector("Username candidates", ["name"], "identity")
def c_perms(v):
    p = [x.lower() for x in v["name"].split() if x]
    if len(p) < 2: return p
    f, l = p[0], p[-1]; fi, li = f[0], l[0]
    return sorted({f + l, f + "." + l, f + "_" + l, f + "-" + l, fi + l, f + li,
                   l + f, f + l + "1", f + l + "01", l + fi})


# ======================== INDIA ========================
@collector("India: mobile carrier+circle", ["phone"], "india")
def c_india_phone(v):
    d = norm_phone(v["phone"])
    series = SERIES.get(d[:4]) if d and len(d) >= 4 else None
    return {"normalized": d, "operator": series[0] if series else "unknown",
            "circle": series[1] if series else "unknown",
            "note": "prefix-based pre-MNP hint. Confirm via TRAI / tafcop."}


@collector("India: vehicle RC parse", ["vehicle"], "india")
def c_india_vehicle(v):
    n = norm_vehicle(v["vehicle"])
    if not n: return {"valid": False, "raw": v["vehicle"]}
    if "BH" in n[:4]:
        return {"valid": True, "series": "BH", "state": "Any (BH series)", "normalized": n}
    return {"valid": True, "state_code": n[:2], "state": STATE_CODES.get(n[:2], "?"),
            "rto": n[:4], "normalized": n,
            "upstream": "https://parivahan.gov.in/rcdlstatus/"}


@collector("India: EPIC validator", ["epic"], "india")
def c_india_epic(v):
    v2 = v["epic"].upper().replace(" ", "").replace("-", "")
    return {"valid": bool(re.fullmatch(r"[A-Z]{3}[0-9]{7}", v2)), "normalized": v2}


@collector("India: PAN validator", ["pan"], "india")
def c_india_pan(v):
    v2 = v["pan"].upper().strip()
    return {"valid": bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", v2)), "normalized": v2}


@collector("India: Aadhaar validator (Verhoeff)", ["aadhaar"], "india")
def c_india_aadhaar(v):
    d = re.sub(r"\D", "", v["aadhaar"])
    return {"valid": bool(len(d) == 12 and verhoeff(d)), "normalized": d}


@collector("India: breach corpus reference", ["name", "phone", "email"], "india", unmasked=True)
def c_india_breach(v):
    return {"breaches": load_india_breaches()}


# ======================== LIVE SURVEILLANCE ========================
@collector("Live: flights over India", ["live"], "live")
def c_flights(v):
    return _json("https://opensky-network.org/api/states/all?lamin=6.5&lomin=68&lamax=37.5&lomax=97.5")


@collector("Live: earthquakes India", ["live"], "live")
def c_quakes(v):
    d = _json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
    return [f for f in d.get("features", [])
            if 6.5 < f["geometry"]["coordinates"][1] < 37.5
            and 68 < f["geometry"]["coordinates"][0] < 97]


@collector("Live: active satellites", ["live"], "live")
def c_sat(v):
    b, _ = _get("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle")
    return b[:4000]


@collector("Live: GDELT India news", ["live", "keyword"], "live")
def c_gdelt(v):
    q = v.get("keyword") or "India"
    return _json(f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}&format=json&maxrecords=20")


# ======================== IP / INFRA ========================
@collector("IP lookup (ipapi.co)", ["ip"], "infra")
def c_ip(v): return _json(f"https://ipapi.co/{v['ip']}/json/")


@collector("IP lookup (ipinfo.io)", ["ip"], "infra")
def c_ipinfo(v): return _json(f"https://ipinfo.io/{v['ip']}/json")


@collector("crt.sh certs", ["domain"], "infra")
def c_crt(v): return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("Wayback availability", ["domain"], "infra")
def c_wb(v): return _json(f"http://archive.org/wayback/available?url={v['domain']}")


# ======================== OFFENSIVE CYBER TOOLS ========================
@collector("Subdomain enum (crt.sh)", ["domain"], "offensive")
def c_off_crt(v): return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("DNS lookup", ["domain"], "offensive")
def c_off_dns(v):
    import socket
    try:
        return {"domain": v["domain"], "a": socket.gethostbyname_ex(v["domain"])[2]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("HTTP headers", ["domain"], "offensive")
def c_off_headers(v):
    try:
        b, code = _get(f"http://{v['domain']}", headers={"User-Agent": "DISHA/2.0"})
        return {"domain": v["domain"], "status": code, "headers_sample": b[:2000]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("Port scan (common)", ["ip"], "offensive")
def c_off_ports(v):
    import socket
    ip = v["ip"]
    common = [21,22,23,25,53,80,110,135,139,143,443,445,993,995,1433,3306,3389,5432,5900,6379,8080,8443,27017]
    open_ports = []
    for port in common:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            if s.connect_ex((ip, port)) == 0:
                open_ports.append(port)
            s.close()
        except Exception:
            pass
    return {"ip": ip, "open_ports": open_ports}


# ======================== VYUH FORMATIONS ========================
VYUH_FORMATIONS = {
    "chakra_vyuha": {
        "name": "Chakra Vyuha — Perimeter Cyber Defense",
        "purpose": "Multi-tiered sensor grid with honeypot nodes and automated threat traps",
        "color": "#ef4444",
        "collectors": ["flights", "quakes", "sat", "crt"],
    },
    "padma_vyuha": {
        "name": "Padma Vyuha — Deep Entity Resolution",
        "purpose": "Concentric layers of entity deconstruction from a single seed",
        "color": "#a855f7",
        "collectors": ["sherlock", "maigret", "holehe", "phone"],
    },
    "garuda_vyuha": {
        "name": "Garuda Vyuha — Airborne & Signals Recon",
        "purpose": "ADS-B aircraft, vessel AIS, satellite orbital telemetry",
        "color": "#f59e0b",
        "collectors": ["flights", "sat", "gdelt"],
    },
    "suryavyuha": {
        "name": "Suryavyuha — Macro Pattern Recognition",
        "purpose": "Global graph topology, covert clusters, temporal anomalies",
        "color": "#fbbf24",
        "collectors": ["graph", "india_breach", "xon"],
    },
    "nakshatra_mandala": {
        "name": "Nakshatra Mandala Vyuha — Satellite & Celestial",
        "purpose": "RF ground stations, spatial coverage, orbital sensor passes",
        "color": "#3b82f6",
        "collectors": ["sat", "crt"],
    },
    "sarvatobhadra": {
        "name": "Sarvatobhadra Vyuha — Omnidirectional Node Defense",
        "purpose": "Total infrastructure immobility, cryptographic sealing",
        "color": "#10b981",
        "collectors": ["gdelt", "wayback"],
    },
    "nyaya_audit": {
        "name": "NYAYA Audit Vyuha — Legal Admissibility Verifier",
        "purpose": "BSA 2023 §61/63/65B evidence verification",
        "color": "#06b6d4",
        "collectors": ["india_breach", "graph"],
    },
    "setu_varuna": {
        "name": "SETU-VARUNA Vyuha — Maritime & Port Resiliency",
        "purpose": "Maritime registry, harbor manifests, oceanic transponder telemetry",
        "color": "#0ea5e9",
        "collectors": ["flights", "gdelt"],
    },
}

COLLECTOR_NAME_MAP = {
    "sherlock": "Sherlock", "maigret": "Maigret", "holehe": "Holehe",
    "phone": "PhoneInfoga", "flights": "Live: flights over India",
    "quakes": "Live: earthquakes India", "sat": "Live: active satellites",
    "crt": "crt.sh certs", "wayback": "Wayback availability",
    "gdelt": "Live: GDELT India news", "xon": "XposedOrNot breach",
    "india_breach": "India: breach corpus reference",
}


@app.get("/api/v1/vyuh/formations")
def vyuh_formations():
    return {"formations": VYUH_FORMATIONS}


@app.post("/api/v1/vyuh/activate")
def vyuh_activate(payload: dict):
    formation_id = payload.get("formation_id")
    inputs = payload.get("inputs", {})
    if formation_id not in VYUH_FORMATIONS:
        return JSONResponse({"error": "unknown formation"}, status_code=400)
    formation = VYUH_FORMATIONS[formation_id]
    results = {}
    for coll_name in formation["collectors"]:
        reg_name = COLLECTOR_NAME_MAP.get(coll_name)
        if reg_name is None:
            results[coll_name] = {"status": "formation_logic", "note": "graph/breach correlation server-side"}
            continue
        match = next((c for c in REGISTRY if c["name"] == reg_name), None)
        if not match:
            results[coll_name] = {"status": "not_installed"}
            continue
        results[reg_name] = safe(match, inputs)
    return {"formation": formation_id, "name": formation["name"], "purpose": formation["purpose"],
            "color": formation["color"], "results": results}


# ======================== SQLITE GRAPH ========================
DB_PATH = os.environ.get("OSINT_GRAPH_DB", os.path.join(REPO, "data", "osint_graph.sqlite"))


def sg_connect():
    import sqlite3
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def sg_init(conn):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS person (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS identifier (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER REFERENCES person(id) ON DELETE SET NULL,
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      raw TEXT,
      source TEXT,
      confidence REAL DEFAULT 0.6,
      first_seen TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now')),
      UNIQUE(kind, value, source)
    );
    CREATE INDEX IF NOT EXISTS ix_id_kind_val ON identifier(kind, value);
    CREATE INDEX IF NOT EXISTS ix_id_person ON identifier(person_id);
    CREATE TABLE IF NOT EXISTS edge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      a INTEGER REFERENCES identifier(id) ON DELETE CASCADE,
      b INTEGER REFERENCES identifier(id) ON DELETE CASCADE,
      relation TEXT NOT NULL,
      source TEXT,
      confidence REAL DEFAULT 0.6,
      UNIQUE(a, b, relation)
    );
    CREATE TABLE IF NOT EXISTS fact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER REFERENCES person(id) ON DELETE CASCADE,
      identifier_id INTEGER REFERENCES identifier(id) ON DELETE CASCADE,
      key TEXT, value TEXT, source TEXT, confidence REAL DEFAULT 0.6
    );
    CREATE TABLE IF NOT EXISTS breach_hit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier_id INTEGER REFERENCES identifier(id) ON DELETE CASCADE,
      breach_id TEXT, org TEXT, records_label TEXT, data_types TEXT, source TEXT,
      seen TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS dump_meta (
      path TEXT PRIMARY KEY, source TEXT, rows INTEGER, loaded_at TEXT DEFAULT (datetime('now'))
    );
    """)


HEADER_HINTS = {
    "name": ["name","naam","fullname","elector","owner","applicant","customer","holder","voter","candidate"],
    "phone": ["mobile","phone","contact","mob","cell","msisdn","contactno","telephone"],
    "aadhaar": ["aadhaar","aadhar","uid","uidai","uidno"],
    "pan": ["pan","panno","pancard"],
    "dob": ["dob","birth","birthdate","date_of_birth"],
    "address": ["address","addr","residence","house","street","locality","village"],
    "pincode": ["pincode","pin","postal","zip"],
    "district": ["district","dist","taluk"],
    "state": ["state","province"],
    "gender": ["gender","sex"],
    "epic": ["epic","voter","electorid","elector"],
    "vehicle": ["reg","registration","vehicle","rcno","vahan","chassis"],
    "dl": ["dl","licence","license","driving"],
    "email": ["email","mail"],
    "cif": ["cif","customerid","custid","accountno"],
    "passport": ["passport"],
}
VALIDATORS = {
    "phone": lambda d: bool(re.fullmatch(r"[6-9]\d{9}", d)),
    "aadhaar": lambda d: bool(re.fullmatch(r"\d{12}", d)) and verhoeff(d),
    "pan": lambda d: bool(re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", d.upper())),
    "epic": lambda d: bool(re.fullmatch(r"[A-Z]{3}\d{7}", d.upper())),
    "vehicle": lambda d: bool(re.fullmatch(r"\d{2}[A-Z]{1,2}\d{1,2}\d{4}", d.upper())),
    "dl": lambda d: bool(re.fullmatch(r"[A-Z]{2}\d{13}", d.upper())),
    "email": lambda d: bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", d)),
    "pincode": lambda d: bool(re.fullmatch(r"\d{6}", d)),
}
DATE_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})\b")
GENDER_RE = re.compile(r"^(m|f|male|female|other|o|transgender|tg)$", re.I)
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z .]{2,59}$")


def _hdr(col, kind):
    c = re.sub(r"[^a-z]", "", col.lower())
    return 1.0 if any(h in c for h in HEADER_HINTS.get(kind, [])) else 0.0


def _val(vals, kind):
    vals = [v for v in vals if v]
    if not vals: return 0.0
    if kind == "name": return sum(1 for v in vals if NAME_RE.match(v)) / len(vals)
    if kind == "dob": return sum(1 for v in vals if DATE_RE.search(v)) / len(vals)
    if kind == "gender": return sum(1 for v in vals if GENDER_RE.match(v)) / len(vals)
    fn = VALIDATORS.get(kind)
    if not fn: return 0.0
    hit = 0
    for v in vals:
        try:
            if fn(norm(kind, v) or v): hit += 1
        except Exception: pass
    return hit / len(vals)


def detect_columns(headers, sample_rows, threshold=0.4):
    samples = {c: [(r.get(c) or "").strip() for r in sample_rows[:400]] for c in headers}
    candidates = []
    for kind in HEADER_HINTS:
        for col in headers:
            hs, vs = _hdr(col, kind), _val(samples[col], kind)
            score = hs * 0.55 + vs * 0.45
            if score >= threshold:
                candidates.append((score, col, kind, hs, vs))
    candidates.sort(reverse=True)
    out, used_cols, used_kinds = {}, set(), set()
    for score, col, kind, hs, vs in candidates:
        if col in used_cols or kind in used_kinds: continue
        used_cols.add(col); used_kinds.add(kind)
        out[col] = {"kind": kind, "confidence": round(score, 2)}
    return out


def norm(kind, raw):
    fn = {
        "phone": norm_phone, "aadhaar": norm_aadhaar, "pan": norm_pan,
        "epic": norm_epic, "vehicle": norm_vehicle, "dl": norm_dl,
        "email": norm_email, "name": norm_name, "pincode": norm_pincode,
    }.get(kind)
    return fn(raw) if fn else raw.strip().lower()


def norm_name(v):
    v = re.sub(r"[^A-Za-z\s]", " ", v).lower()
    return re.sub(r"\s+", " ", v).strip()


def norm_pincode(v):
    d = re.sub(r"\D", "", v)
    return d if re.fullmatch(r"\d{6}", d) else None


def norm_dl(v):
    v = re.sub(r"[^A-Za-z0-9]", "", v).upper()
    return v if re.fullmatch(r"[A-Z]{2}\d{13}", v) else None


def upsert_identifier(cur, kind, value, source, raw=None, conf=0.6):
    cur.execute("""INSERT INTO identifier (kind, value, raw, source, confidence)
                   VALUES (?,?,?,?,?)
                   ON CONFLICT(kind, value, source) DO UPDATE SET last_seen=datetime('now')
                   RETURNING id""", (kind, value, raw, source, conf))
    row = cur.fetchone()
    return row[0] if row else None


def link(cur, a, b, relation, source, conf=0.6):
    if a and b and a != b:
        cur.execute("""INSERT INTO edge (a,b,relation,source,confidence)
                       VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING""", (a, b, relation, source, conf))


def load_file(conn, path, source, limit=None, dry=False, sample=400):
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        rdr = csv.DictReader(f)
        headers = rdr.fieldnames or []
        head = []
        for i, row in enumerate(rdr):
            head.append(row)
            if i >= sample: break
    mapping = detect_columns(headers, head)
    if dry:
        return {"mapping": mapping, "rows_sampled": len(head)}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        rdr = csv.DictReader(f)
        n = 0
        for row in rdr:
            prev = None
            for col, m in mapping.items():
                raw = (row.get(col) or "").strip()
                if not raw: continue
                kind = m["kind"]
                val = norm(kind, raw)
                if not val: continue
                iid = upsert_identifier(conn.cursor(), kind=kind, value=val, source=source,
                                        raw=raw, conf=min(0.95, m["confidence"] + 0.2))
                if prev: link(conn.cursor(), prev, iid, "same_person", source, m["confidence"])
                prev = iid
            n += 1
            if n % 10000 == 0:
                conn.commit()
                if limit and n >= limit: break
        conn.commit()
    return {"loaded": n, "source": source, "mapping": mapping}


def load_all(conn, directory, limit_per_file=None, dry=False):
    results = []
    if not os.path.isdir(directory): return results
    for root, dirs, files in os.walk(directory):
        for fn in sorted(files):
            if fn.lower().endswith((".csv", ".tsv")):
                p = os.path.join(root, fn)
                rel = os.path.relpath(p, directory)
                source = rel.replace(os.sep, "_").split(".")[0]
                try:
                    results.append(load_file(conn, p, source, limit=limit_per_file, dry=dry))
                except Exception as e:
                    results.append({"error": str(e), "source": source})
    return results


def sg_resolve(conn, kind, value, max_depth=2):
    value = norm(kind, value) or value
    cur = conn.cursor()
    cur.execute("SELECT id, kind, value, source FROM identifier WHERE kind=? AND value=?", (kind, value))
    seeds = cur.fetchall()
    if not seeds:
        return {"input": {"kind": kind, "value": value}, "found": False,
                "note": "not in local loaded dumps — load CSVs via /api/v1/data/load"}

    seed_ids = [s["id"] for s in seeds]
    frontier, visited, depth = set(seed_ids), set(seed_ids), 0
    while frontier and depth < max_depth:
        placeholders = ",".join("?" * len(frontier))
        cur.execute(f"SELECT a,b FROM edge WHERE a IN ({placeholders}) OR b IN ({placeholders})",
                    list(frontier) + list(frontier))
        nxt = set()
        for a, b in cur.fetchall():
            for x in (a, b):
                if x not in visited:
                    visited.add(x); nxt.add(x)
        frontier, depth = nxt, depth + 1

    placeholders = ",".join("?" * len(visited))
    cur.execute(f"SELECT id, kind, value, source, confidence, person_id FROM identifier WHERE id IN ({placeholders})",
                list(visited))
    ids = [dict(r) for r in cur.fetchall()]

    ident = {}
    for r in ids:
        ident.setdefault(r["kind"], []).append({
            "value": r["value"], "source": r["source"],
            "confidence": r["confidence"], "person": r["person_id"]})

    cur.execute(f"""SELECT i.kind, i.value, f.key, f.value, f.source
                    FROM fact f JOIN identifier i ON i.id=f.identifier_id
                    WHERE f.identifier_id IN ({placeholders})""", list(visited))
    facts = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""SELECT i.kind, i.value, b.breach_id, b.org, b.records_label, b.data_types
                    FROM breach_hit b JOIN identifier i ON i.id=b.identifier_id
                    WHERE b.identifier_id IN ({placeholders})""", list(visited))
    hits = [dict(r) for r in cur.fetchall()]

    return {
        "input": {"kind": kind, "value": value},
        "found": True,
        "identifiers": ident,
        "facts": facts,
        "breach_hits": hits,
        "graph_size": len(visited),
    }


def load_india_breaches():
    path = os.path.join(REPO, "data", "india_breaches.json")
    try:
        return json.load(open(path))["breaches"]
    except Exception:
        return []


# ======================== SCAN (SSE) ========================
class ScanInput(BaseModel):
    q: Optional[str] = None
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    vehicle: Optional[str] = None
    password: Optional[str] = None
    domain: Optional[str] = None
    ip: Optional[str] = None
    aadhaar: Optional[str] = None
    pan: Optional[str] = None
    epic: Optional[str] = None
    live: Optional[str] = None


@app.post("/scan")
async def scan(payload: ScanInput):
    v = payload.model_dump(exclude_none=True)
    async def gen():
        jobs = [(c, POOL.submit(safe, c, v)) for c in plan(v)]
        yield f"data: {json.dumps({'meta': {'queued': len(jobs)}})}\n\n"
        for c, fut in jobs:
            res = fut.result()
            yield "data: " + json.dumps({
                "name": c["name"], "category": c["category"],
                "unmasked": c["unmasked"], "result": res
            }, default=str) + "\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/tools")
def tools():
    return [{"name": c["name"], "inputs": c["inputs"], "category": c["category"]} for c in REGISTRY]


@app.get("/")
def index():
    p = os.path.join(REPO, "frontend", "index.html")
    if os.path.exists(p):
        return FileResponse(p)
    return JSONResponse({"service": "DISHA 6.6 OSINT-ONE", "status": "ok", "collectors": len(REGISTRY)})


# ======================== DATA / LOAD / RESOLVE / STATS ========================
@app.get("/api/v1/graph/stats")
def graph_stats():
    try:
        conn = sg_connect(); sg_init(conn)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM identifier"); ids = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM edge"); edges = cur.fetchone()[0]
        cur.execute("SELECT COUNT(DISTINCT source) FROM identifier"); sources = cur.fetchone()[0]
        cur.execute("SELECT kind, COUNT(*) FROM identifier GROUP BY kind ORDER BY COUNT(*) DESC LIMIT 10")
        by_kind = [{"kind": r[0], "count": r[1]} for r in cur.fetchall()]
        conn.close()
        return {"db": DB_PATH, "identifiers": ids, "edges": edges, "sources": sources, "by_kind": by_kind}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/v1/data/load")
def data_load(payload: dict):
    path = payload.get("path")
    directory = payload.get("directory")
    source = payload.get("source", "upload")
    dry = payload.get("dry", False)
    limit = payload.get("limit")
    try:
        conn = sg_connect(); sg_init(conn)
        if directory:
            result = load_all(conn, directory, limit_per_file=limit, dry=dry)
        elif path:
            if not os.path.exists(path):
                return JSONResponse({"error": "file not found"}, status_code=400)
            result = load_file(conn, path, source, limit=limit, dry=dry)
        else:
            return JSONResponse({"error": "path or directory required"}, status_code=400)
        conn.close()
        return result
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/v1/resolve")
def resolve_one(payload: dict):
    q = payload.get("q", "")
    if not q:
        return JSONResponse({"error": "q required"}, status_code=400)
    try:
        conn = sg_connect(); sg_init(conn)
        kind, value = detect_kind(q)
        out = sg_resolve(conn, kind, value)
        conn.close()
        return out
    except Exception as e:
        return {"error": str(e), "hint": "load CSVs first via /api/v1/data/load"}


def detect_kind(value):
    for kind, fn in [("phone", norm_phone), ("aadhaar", norm_aadhaar), ("pan", norm_pan),
                     ("epic", norm_epic), ("vehicle", norm_vehicle), ("email",
                     lambda x: x.strip().lower() if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", x.strip()) else None),
                     ("name", lambda x: x.strip().lower())]:
        try:
            if fn(value):
                return kind, fn(value)
        except Exception:
            pass
    return "name", value.strip().lower()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
