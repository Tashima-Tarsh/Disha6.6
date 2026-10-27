from fastapi import FastAPI, Query
import sqlite3, json
from ingest import ledger

app = FastAPI()
DB = "index/bharat.db"

def q(sql, p=()):
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    rows = [dict(r) for r in c.execute(sql, p).fetchall()]
    c.close()
    return rows

@app.get("/any")
def any_key(key: str):
    out = []
    for tbl, col in [("aadhaar","uid"),("aadhaar","vid"),("eci","epic_number"),
                     ("vahan","reg_no"),("cowin","beneficiary_id")]:
        out += q(f"SELECT *, '{tbl}' AS _domain FROM {tbl} WHERE {col}=?", (key,))
    for tbl, col in [("aadhaar","name"),("eci","elector_name"),
                     ("vahan","owner_name"),("cowin","name")]:
        out += q(f"SELECT *, '{tbl}' AS _domain FROM {tbl} WHERE {col}=?", (key,))
    return out

@app.get("/manifest")
def manifest(path: str):
    return ledger.lookup(path)

