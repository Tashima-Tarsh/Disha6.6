import re, sys
from live._base import session, cache_get, cache_put, solve_captcha

DOMAIN = "vahan"
BASE = "https://vahan.parivahan.gov.in/nrservices/faces/user/searchstatus.xhtml"

def lookup(reg_no):
    key = reg_no
    c = cache_get(DOMAIN, key)
    if c: return c
    s = session("vahan")
    try:
        r = s.get(BASE, timeout=30)
        html = r.text
        vs = re.search(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', html)
        cap = re.search(r'id="(.*?captcha.*?)"', html, re.I)
        # captcha image
        cap_img = s.get("https://vahan.parivahan.gov.in/nrservices/captcha.jpg", timeout=30)
        sol = solve_captcha(cap_img.content)
        data = {
            "javax.faces.ViewState": vs.group(1) if vs else "",
            "searchstatus:regNo": reg_no,
            "searchstatus:captcha": sol,
        }
        r2 = s.post(BASE, data=data, timeout=30)
        out = {"html": r2.text, "_source": BASE, "captcha": sol}
        cache_put(DOMAIN, key, out)
        return out
    except Exception as e:
        return {"ok": False, "error": str(e)}

def canary():
    r = lookup("MH12AB1234")
    ok = isinstance(r, dict) and "html" in r
    print("vahan canary:", "OK" if ok else r)
    return ok

if __name__ == "__main__" and "--canary" in sys.argv:
    sys.exit(0 if canary() else 1)
