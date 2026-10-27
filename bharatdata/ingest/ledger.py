import json, os, sys, uuid, datetime
M = "index/manifest.json"
F = ["path","url","fetched_utc","http_status","bytes","sha256","run_id","phase","parser"]
RUN = str(uuid.uuid4())

def _load(): return json.load(open(M)) if os.path.exists(M) else []
def _save(r): os.makedirs("index", exist_ok=True); json.dump(r, open(M,"w"), indent=2)

def append(path, url, http_status, sha, *, phase="", parser=""):
    r = _load()
    r.append({"path":path,"url":url,"fetched_utc":datetime.datetime.utcnow().isoformat()+"Z",
              "http_status":http_status,"bytes":os.path.getsize(path) if os.path.exists(path) else 0,
              "sha256":sha,"run_id":RUN,"phase":phase,"parser":parser})
    _save(r)

def skip_if_unchanged(path, sha):
    return any(x["path"]==path and x["sha256"]==sha for x in _load())

def lookup(path):
    return [x for x in _load() if x["path"]==path]

def validate():
    for r in _load():
        for f in F: assert f in r
        assert len(r["sha256"]) == 64
    return True

record = append

if __name__ == "__main__" and "--validate" in sys.argv:
    validate(); print("manifest OK")
