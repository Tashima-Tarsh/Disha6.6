import re, sys
from live._base import session, cache_get, cache_put, solve_captcha

DOMAIN = "sarathi"
BASE = "https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do"

def lookup(dl_no, dob):
    key = f"{dl_no}|{dob}"
    c = cache_get(DOMAIN, key)
    if c: return c
    s = session("sarathi")
    try:
        r = s.get(BASE, timeout=30)
        html = r.text
        vs = re.search(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', html)
        cap = s.get("https://sarathi.parivahan.gov.in/sarathiservice/captcha.jpg", timeout=30)
        sol = solve_captcha(cap.content)
        data = {
            "javax.faces.ViewState": vs.group(1) if vs else "",
            "dlNumber": dl_no,
            "dob": dob,
            "captcha": sol,
        }
        r2 = s.post(BASE, data=data, timeout=30)
        out = {"html": r2.text, "_source": BASE, "captcha": sol}
        cache_put(DOMAIN, key, out)
        return out
    except Exception as e:
        return {"ok": False, "error": str(e)}

def canary():
    r = lookup("DL0420110012345", "01-01-1990")
    ok = isinstance(r, dict) and ("html" in r or "error" in r)
    print("sarathi canary:", "OK" if ok else r)
    return ok

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
