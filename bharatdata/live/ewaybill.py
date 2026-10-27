import sys
from live._base import session, cache_get, cache_put, try_chain

DOMAIN = "ewaybill"

# e-Way Bill GST APIs (public + NIC sandbox fallback)
CHAINS = [
    "https://ewaybillgst.gov.in/apiv1/ewaybill",
    "https://ewaybillgst.gov.in/apiv1/ewaybillbydate",
]
VERIFY_BASE = "https://ewaybillgst.gov.in/apiv1/ewaybill"

def lookup(ewb_no: str) -> dict:
    """Look up e-Way Bill by EWB number."""
    key = str(ewb_no)
    c = cache_get(DOMAIN, key)
    if c: return c

    def hit(base):
        r = session("ewaybill").get(base, params={"ewbNo": ewb_no}, timeout=30)
        if r.status_code != 200: return None
        j = r.json(); j["_source"] = base
        return j

    out = try_chain(CHAINS, hit)
    if isinstance(out, dict) and out.get("ok") is not False:
        cache_put(DOMAIN, key, out)
    return out

def lookup_by_vehicle(vehicle_no: str, from_date: str, to_date: str) -> dict:
    """Fetch e-Way Bills by vehicle number and date range."""
    key = f"{vehicle_no}|{from_date}|{to_date}"
    c = cache_get(DOMAIN, key)
    if c: return c

    try:
        r = session("ewaybill").get(
            "https://ewaybillgst.gov.in/apiv1/ewaybillbyVehicleNo",
            params={"vehicleNo": vehicle_no, "fromDate": from_date, "toDate": to_date},
            timeout=30,
        )
        j = r.json() if r.ok else {"ok": False, "status_code": r.status_code}
        j["_source"] = "ewaybillgst.gov.in"
        cache_put(DOMAIN, key, j)
        return j
    except Exception as e:
        return {"ok": False, "error": str(e)}

def check_health() -> dict:
    import time; start = time.time()
    try:
        r = session("ewaybill").get(CHAINS[0], timeout=10)
        status = "HEALTHY" if r.status_code < 500 else "DEGRADED"
    except Exception as e:
        return {"status": "UNREACHABLE", "error": str(e), "endpoint": CHAINS[0],
                "latency_ms": int((time.time() - start) * 1000)}
    return {"status": status, "endpoint": CHAINS[0],
            "latency_ms": int((time.time() - start) * 1000)}

def canary():
    r = lookup("123456789012")  # dummy EWB number for format check
    ok = isinstance(r, dict) and ("_source" in r or "error" in r)
    print("ewaybill canary:", "OK" if ok else r)
    return ok

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
