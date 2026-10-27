#!/usr/bin/env python3
import argparse, json, sqlite3, sys, os
from ingest import ledger

DB = "index/bharat.db"

def _q(sql, params=()):
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    rows = [dict(r) for r in c.execute(sql, params).fetchall()]
    c.close()
    return rows

def _prov(row):
    path = row.get("_source") or ""
    return ledger.lookup(path) if path else []

def _emit(rows):
    for r in rows:
        r["_provenance"] = _prov(r)
        print(json.dumps(r, ensure_ascii=False))

def cmd_search(a):
    d = a.domain
    if d == "eci":
        if a.epic: _emit(_q("SELECT * FROM eci WHERE epic_number=?", (a.epic,)))
        elif a.name: _emit(_q("SELECT * FROM eci WHERE elector_name=?", (a.name,)))
        elif a.pincode: _emit(_q("SELECT * FROM eci WHERE address LIKE ?", (f"%{a.pincode}%",)))
        else: _emit(_q("SELECT * FROM eci"))
    elif d == "vahan":
        if a.reg: _emit(_q("SELECT * FROM vahan WHERE reg_no=?", (a.reg,)))
        elif a.name: _emit(_q("SELECT * FROM vahan WHERE owner_name=?", (a.name,)))
        else: _emit(_q("SELECT * FROM vahan"))
    elif d == "aadhaar":
        if a.uid: _emit(_q("SELECT * FROM aadhaar WHERE uid=?", (a.uid,)))
        elif a.vid: _emit(_q("SELECT * FROM aadhaar WHERE vid=?", (a.vid,)))
        elif a.name: _emit(_q("SELECT * FROM aadhaar WHERE name=?", (a.name,)))
        else: _emit(_q("SELECT * FROM aadhaar"))
    elif d == "cowin":
        if a.pincode: _emit(_q("SELECT * FROM cowin WHERE pincode=?", (a.pincode,)))
        elif a.name: _emit(_q("SELECT * FROM cowin WHERE name=?", (a.name,)))
        else: _emit(_q("SELECT * FROM cowin"))

def cmd_any(a):
    """Give ANY identifier, get EVERYTHING across all domains."""
    key = a.key
    out = []
    for tbl, col in [("aadhaar","uid"),("aadhaar","vid"),("eci","epic_number"),
                     ("vahan","reg_no"),("cowin","beneficiary_id")]:
        out += _q(f"SELECT *, '{tbl}' AS _domain FROM {tbl} WHERE {col}=?", (key,))
    for tbl, col in [("aadhaar","name"),("eci","elector_name"),
                     ("vahan","owner_name"),("cowin","name")]:
        out += _q(f"SELECT *, '{tbl}' AS _domain FROM {tbl} WHERE {col}=?", (key,))
    if not out: print("no rows"); return
    _emit(out)

def cmd_stats(a):
    view = f"v_{a.domain}_by_{a.group_by}"
    for r in _q(f"SELECT * FROM {view}"):
        print(f"{r[list(r)[0]]}\t{r['n']}")

def cmd_manifest(a):
    for r in ledger.lookup(a.path): print(json.dumps(r))

def cmd_join(a):
    _emit(_q("SELECT * FROM v_person_join WHERE uid=?", (a.aadhaar,)))

def main():
    p = argparse.ArgumentParser(prog="bharat")
    s = p.add_subparsers(dest="cmd", required=True)

    ps = s.add_parser("search")
    ps.add_argument("--domain", required=True)
    ps.add_argument("--name"); ps.add_argument("--epic"); ps.add_argument("--reg")
    ps.add_argument("--uid"); ps.add_argument("--vid"); ps.add_argument("--pincode")
    ps.add_argument("--district"); ps.add_argument("--live", action="store_true")
    ps.set_defaults(fn=cmd_search)

    pa = s.add_parser("any"); pa.add_argument("key"); pa.set_defaults(fn=cmd_any)

    pst = s.add_parser("stats")
    pst.add_argument("--domain", required=True); pst.add_argument("--group-by", required=True)
    pst.set_defaults(fn=cmd_stats)

    pm = s.add_parser("manifest"); pm.add_argument("--path", required=True)
    pm.set_defaults(fn=cmd_manifest)

    pj = s.add_parser("join"); pj.add_argument("--aadhaar", required=True)
    pj.set_defaults(fn=cmd_join)

    a = p.parse_args(); a.fn(a)

if __name__ == "__main__":
    main()
