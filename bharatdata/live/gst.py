import sys
from live._base import session, cache_get, cache_put, try_chain

DOMAIN = "gst"

# Public search (no key), GSP sandbox fallback
CHAINS = [
    "https://services.gst.gov.in/services/api/search/taxpayerDetails",
    "https://gsp.adaequare.com/test/commonapi/search/taxpayerDetails",  # GSP sandbox
]

def lookup(gstin: str) -> dict:
    key = gstin.upper()
    c = cache_get(DOMAIN, key)
    if c: return c

    def hit(base):
        r = session("gst").get(base, params={"gstin": gstin.upper()}, timeout=30)
        if r.status_code != 200: return None
        j = r.json()
        j["_source"] = base
        return j

    out = try_chain(CHAINS, hit)
    if isinstance(out, dict) and out.get("ok") is not False:
        cache_put(DOMAIN, key, out)
    return out

def search_by_pan(pan: str) -> dict:
    key = f"pan:{pan.upper()}"
    c = cache_get(DOMAIN, key)
    if c: return c

    def hit(base):
        # PAN-based search endpoint
        url = base.replace("taxpayerDetails", "taxpayerDetailsByPan")
        r = session("gst").get(url, params={"pan": pan.upper()}, timeout=30)
        if r.status_code != 200: return None
        j = r.json(); j["_source"] = url
        return j

    out = try_chain(CHAINS, hit)
    if isinstance(out, dict) and out.get("ok") is not False:
        cache_put(DOMAIN, key, out)
    return out

def check_health() -> dict:
    import time; start = time.time()
    try:
        r = session("gst").get(CHAINS[0], timeout=10)
        status = "HEALTHY" if r.status_code < 500 else "DEGRADED"
    except Exception as e:
        return {"status": "UNREACHABLE", "error": str(e), "endpoint": CHAINS[0],
                "latency_ms": int((time.time() - start) * 1000)}
    return {"status": status, "endpoint": CHAINS[0],
            "latency_ms": int((time.time() - start) * 1000)}

def canary():
    # Use a well-known public GSTIN (Government of India)
    r = lookup("27AADCB2230M1ZT")
    ok = isinstance(r, dict) and ("_source" in r or "error" in r)
    print("gst canary:", "OK" if ok else r)
    return ok

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
