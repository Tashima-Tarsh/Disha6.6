import sys
from live._base import session, cache_get, cache_put, try_chain

DOMAIN = "nsso"

# National Single Sign-On (NSSO) gateway endpoints
CHAINS = [
    "https://sso.gov.in/",
    "https://www.india.gov.in/api/sso/",
]
AUTH_BASE  = "https://sso.gov.in/as/authorization.oauth2"
TOKEN_BASE = "https://sso.gov.in/as/token.oauth2"
USER_BASE  = "https://sso.gov.in/idp/userinfo.openid"

def probe() -> dict:
    """Probe NSSO gateway availability (no credentials required)."""
    key = "probe"
    c = cache_get(DOMAIN, key)
    if c: return c

    def hit(base):
        r = session("nsso").get(base, timeout=15, allow_redirects=True)
        if r.status_code not in (200, 302, 401): return None
        return {"status_code": r.status_code, "_source": base, "reachable": True}

    out = try_chain(CHAINS, hit)
    if isinstance(out, dict) and out.get("ok") is not False:
        cache_put(DOMAIN, key, out)
    return out

def userinfo(access_token: str) -> dict:
    """Fetch authenticated user profile from NSSO using a bearer token."""
    key = f"userinfo:{access_token[:16]}"
    c = cache_get(DOMAIN, key)
    if c: return c
    try:
        r = session("nsso").get(
            USER_BASE,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        j = r.json() if r.ok else {"ok": False, "status_code": r.status_code}
        j["_source"] = USER_BASE
        cache_put(DOMAIN, key, j)
        return j
    except Exception as e:
        return {"ok": False, "error": str(e)}

def build_auth_url(client_id: str, redirect_uri: str,
                   scope: str = "openid profile email",
                   state: str = "bharatdata") -> str:
    """Construct OAuth2 authorization URL for redirect-based SSO login."""
    from urllib.parse import urlencode
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": state,
    }
    return f"{AUTH_BASE}?{urlencode(params)}"

def check_health() -> dict:
    import time; start = time.time()
    try:
        r = session("nsso").get(CHAINS[0], timeout=10, allow_redirects=True)
        status = "HEALTHY" if r.status_code in (200, 302, 401) else "DEGRADED"
    except Exception as e:
        return {"status": "UNREACHABLE", "error": str(e), "endpoint": CHAINS[0],
                "latency_ms": int((time.time() - start) * 1000)}
    return {"status": status, "endpoint": CHAINS[0],
            "latency_ms": int((time.time() - start) * 1000)}

def canary():
    r = probe()
    ok = isinstance(r, dict) and r.get("reachable") or ("error" in (r or {}))
    print("nsso canary:", "OK" if ok else r)
    return bool(ok)

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
