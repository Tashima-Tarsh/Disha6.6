import hashlib, json, os, time
import requests

_B = {}

def fetch(url, dest, *, retries=5, backoff=2.0, chunk=8<<20, resume=True, headers=None) -> str:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    pos = os.path.getsize(dest) if (resume and os.path.exists(dest)) else 0
    h = {"Range": f"bytes={pos}-"} if pos else {}
    if headers: h.update(headers)
    for i in range(retries):
        try:
            with requests.get(url, headers=h, stream=True, timeout=60) as r:
                r.raise_for_status()
                with open(dest, "ab" if pos else "wb") as f:
                    for c in r.iter_content(chunk): f.write(c)
                return dest
        except Exception:
            time.sleep(backoff ** i)
    raise RuntimeError(url)

def sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for c in iter(lambda: f.read(1<<20), b""): h.update(c)
    return h.hexdigest()

def read_json(path) -> dict:
    with open(path) as f: return json.load(f)

def write_json(path, obj) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(obj, open(path, "w"), indent=2)

def rate_limit(host, rate=1.0, burst=3) -> None:
    now = time.monotonic()
    b = _B.setdefault(host, {"t": now, "n": burst})
    b["n"] = min(burst, b["n"] + (now - b["t"]) * rate); b["t"] = now
    if b["n"] < 1:
        time.sleep((1 - b["n"]) / rate); b["n"] = 0; b["t"] = time.monotonic()
    b["n"] -= 1
