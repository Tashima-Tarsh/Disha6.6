import sys
from live._base import session, cache_get, cache_put, try_chain

DOMAIN = "cowin"
CHAINS = [
    "https://api.cowin.gov.in/api/v2/appointment/sessions/public/calendarByPin",
    "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin",
    "https://apisetu.gov.in/cowin/api/v2/appointment/sessions/public/calendarByPin",
]

def lookup(pincode, date):
    key = f"{pincode}|{date}"
    c = cache_get(DOMAIN, key)
    if c: return c
    def hit(base):
        r = session("cowin").get(base, params={"pincode": pincode, "date": date}, timeout=30)
        if r.status_code != 200: return None
        j = r.json()
        j["_source"] = base
        return j
    out = try_chain(CHAINS, hit)
    if out.get("ok") is not False: cache_put(DOMAIN, key, out)
    return out

def canary():
    r = lookup("411001", "01-06-2021")
    ok = isinstance(r, dict) and ("centers" in r or "sessions" in r)
    print("cowin canary:", "OK" if ok else r)
    return ok

def check_health():
    ok = canary()
    return {"status": "HEALTHY" if ok else "DEGRADED", "endpoint": CHAINS[0], "canary": ok}

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
