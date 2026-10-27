import sys
from live._base import session, cache_get, cache_put, solve_captcha

DOMAIN = "eci"
BASE = "https://electoralsearch.eci.gov.in/api/electoralsearch/v1"

def _states():
    r = session("eci").get(f"{BASE}/state", timeout=30)
    return r.json()

def lookup(name=None, epic=None, state=None, district=None, ac=None, dob=None):
    key = f"{name}|{epic}|{state}|{district}|{ac}|{dob}"
    c = cache_get(DOMAIN, key)
    if c: return c
    s = session("eci")
    try:
        cap = s.get(f"{BASE}/captcha", timeout=30)
        cap_id = cap.json().get("captchaId") or cap.json().get("id")
        import base64
        img = base64.b64decode(cap.json().get("captcha", "").split(",")[-1])
        sol = solve_captcha(img)
        payload = {"captcha": sol, "captchaId": cap_id}
        if epic: payload["epicNumber"] = epic
        if name: payload["name"] = name
        if state: payload["state"] = state
        if district: payload["district"] = district
        if ac: payload["ac"] = ac
        if dob: payload["dob"] = dob
        r = s.post(f"{BASE}/elector_search", json=payload, timeout=30)
        j = r.json(); j["_source"] = f"{BASE}/elector_search"
        cache_put(DOMAIN, key, j)
        return j
    except Exception as e:
        return {"ok": False, "error": str(e)}

def canary():
    try:
        st = _states()
        ok = isinstance(st, list) and len(st) > 0
        print("eci canary:", "OK" if ok else st)
        return ok
    except Exception as e:
        print("eci canary FAIL:", e); return False

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
