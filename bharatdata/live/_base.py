import hashlib, json, os, time, base64
import requests

CACHE_TTL = 86400
SESSIONS = {}

def session(host):
    if host not in SESSIONS:
        s = requests.Session()
        s.headers.update({
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/122.0 Safari/537.36",
            "Accept": "application/json, text/html, */*",
        })
        SESSIONS[host] = s
    return SESSIONS[host]

def cache_path(domain, key):
    h = hashlib.sha256(key.encode()).hexdigest()
    return f"data/{domain}/live-cache/{h}.json"

def cache_get(domain, key):
    p = cache_path(domain, key)
    if os.path.exists(p) and time.time() - os.path.getmtime(p) < CACHE_TTL:
        return json.load(open(p))
    return None

def cache_put(domain, key, val):
    p = cache_path(domain, key)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(val, open(p, "w"))

def solve_captcha(png_bytes):
    try:
        import ddddocr
        return ddddocr.DdddOcr(show_ad=False).classification(png_bytes)
    except Exception:
        p = "data/_captcha.png"
        os.makedirs("data", exist_ok=True)
        open(p, "wb").write(png_bytes)
        print(f"[captcha saved] {p}")
        return input("captcha> ").strip()

def try_chain(urls, fn):
    last = None
    for u in urls:
        try:
            r = fn(u)
            if r is not None:
                return r
        except Exception as e:
            last = e
    return {"ok": False, "error": str(last)}

