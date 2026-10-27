import sys
from live._base import session, cache_get, cache_put

DOMAIN = "echallan"
BASE = "https://echallan.parivahan.gov.in/index/accused-challan"

def lookup(challan_no=None, vehicle_no=None, dl_no=None):
    key = f"{challan_no}|{vehicle_no}|{dl_no}"
    c = cache_get(DOMAIN, key)
    if c: return c
    s = session("echallan")
    try:
        payload = {}
        if challan_no: payload["challanNo"] = challan_no
        if vehicle_no: payload["vehicleNo"] = vehicle_no
        if dl_no:      payload["dlNo"] = dl_no
        r = s.post(BASE, json=payload, timeout=30,
                   headers={"Content-Type": "application/json",
                            "Accept": "application/json"})
        j = r.json() if r.headers.get("Content-Type","").startswith("application/json") else {"html": r.text}
        j["_source"] = BASE
        cache_put(DOMAIN, key, j)
        return j
    except Exception as e:
        return {"ok": False, "error": str(e)}

def check_health() -> dict:
    import time; start = time.time()
    try:
        r = session("echallan").get("https://echallan.parivahan.gov.in", timeout=10, allow_redirects=True)
        status = "HEALTHY" if r.status_code < 500 else "DEGRADED"
    except Exception as e:
        return {"status": "UNREACHABLE", "error": str(e), "endpoint": BASE,
                "latency_ms": int((time.time() - start) * 1000)}
    return {"status": status, "endpoint": BASE,
            "latency_ms": int((time.time() - start) * 1000)}

def canary():
    r = lookup(vehicle_no="MH12AB1234")
    ok = isinstance(r, dict) and ("_source" in r)
    print("echallan canary:", "OK" if ok else r)
    return ok

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
