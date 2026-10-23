"""SQLite-based identity graph store. Zero external deps (stdlib sqlite3).
Load any breach/gov CSV via automap column detection; one key -> full graph.
"""
import csv, json, os, sqlite3, re
from pathlib import Path

DB_PATH = os.environ.get("OSINT_GRAPH_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "osint_graph.sqlite"))


def connect():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_schema(conn):
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


# ---------- column auto-detection ----------
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
    "aadhaar": lambda d: bool(re.fullmatch(r"\d{12}", d)) and _verhoeff(d),
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


def _verhoeff(num):
    D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
         [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
         [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
         [9,8,7,6,5,4,3,2,1,0]]
    P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
         [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
         [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]
    c = 0
    for i, ch in enumerate(reversed(num)):
        c = D[c][P[i % 8][int(ch)]]
    return c == 0


def norm(kind, raw):
    fn = {
        "phone": norm_phone, "aadhaar": norm_aadhaar, "pan": norm_pan,
        "epic": norm_epic, "vehicle": norm_vehicle, "dl": norm_dl,
        "email": norm_email, "name": norm_name, "pincode": norm_pincode,
    }.get(kind)
    return fn(raw) if fn else raw.strip().lower()


def norm_phone(v):
    d = re.sub(r"\D", "", v)
    if d.startswith("+91"): d = d[3:]
    elif d.startswith("91") and len(d) == 12: d = d[2:]
    elif d.startswith("0") and len(d) == 11: d = d[1:]
    return d if re.fullmatch(r"[6-9]\d{9}", d) else None


def norm_aadhaar(v):
    d = re.sub(r"\D", "", v)
    return d if re.fullmatch(r"\d{12}", d) and _verhoeff(d) else None


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


def norm_dl(v):
    v = re.sub(r"[^A-Za-z0-9]", "", v).upper()
    return v if re.fullmatch(r"[A-Z]{2}\d{13}", v) else None


def norm_email(v): return v.strip().lower()


def norm_name(v):
    v = re.sub(r"[^A-Za-z\s]", " ", v).lower()
    return re.sub(r"\s+", " ", v).strip()


def norm_pincode(v):
    d = re.sub(r"\D", "", v)
    return d if re.fullmatch(r"\d{6}", d) else None


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


# ---------- loader ----------
def upsert_identifier(cur, kind, value, source, raw=None, conf=0.6):
    cur.execute("""INSERT INTO identifier (kind, value, raw, source, confidence)
                   VALUES (?,?,?,?,?)
                   ON CONFLICT(kind, value, source) DO UPDATE SET last_seen=datetime('now')
                   RETURNING id""", (kind, value, raw, source, conf))
    row = cur.fetchone()
    return row[0] if row else None


def find_identifier(cur, kind, value, source):
    cur.execute("SELECT id FROM identifier WHERE kind=? AND value=? AND source=?", (kind, value, source))
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
                iid = upsert_identifier(cur=None if False else conn.cursor(), kind=kind, value=val, source=source,
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


# ---------- resolve ----------
def resolve(conn, kind, value, max_depth=2):
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

    # facts
    cur.execute(f"""SELECT i.kind, i.value, f.key, f.value, f.source
                    FROM fact f JOIN identifier i ON i.id=f.identifier_id
                    WHERE f.identifier_id IN ({placeholders})""", list(visited))
    facts = [dict(r) for r in cur.fetchall()]

    # breach hits
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
