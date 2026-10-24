#!/usr/bin/env python3
"""OSINT collector registry — pure functions, no HTTP surface."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

UA = {"User-Agent": "DISHA-6.6/OSINT-ONE/2.0 (+https://localhost)"}
T = 25
POOL = ThreadPoolExecutor(max_workers=16)
FETCH_POOL = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fetch")
REGISTRY: List[dict] = []


def collector(name, inputs, category, unmasked=False):
    def deco(fn):
        REGISTRY.append(dict(name=name, inputs=inputs, category=category, fn=fn, unmasked=unmasked))
        return fn
    return deco


# ======================== FETCH HELPERS ========================
def _get(url, headers=None):
    h = dict(UA); h.update(headers or {})
    def _do():
        with urlopen(Request(url, headers=h), timeout=T) as r:
            return r.read().decode("utf-8", "replace"), r.status
    try:
        fut = FETCH_POOL.submit(_do)
        return fut.result(timeout=T)
    except HTTPError as e:
        return (e.read().decode("utf-8", "replace") if e.fp else ""), e.code
    except URLError as e:
        return f"ERR {e.reason}", 0
    except Exception as e:
        return f"ERR {e}", 0


def _json(url):
    b, _ = _get(url)
    try: return json.loads(b)
    except Exception: return {"_raw": b}


def _exists(url):
    return _get(url)[1] == 200


def run_tool(cmd, timeout=300):
    if not shutil.which(cmd[0]):
        return None
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return ((p.stdout or "") + (p.stderr or "")).strip()[:20000] or "(no output)"
    except Exception as e:
        return f"ERR {e}"


def safe(c, v):
    try:
        return c["fn"](v)
    except Exception as e:
        return f"ERR {e}"


def plan(v):
    provided = {k for k, val in v.items() if val}
    return [c for c in REGISTRY if set(c["inputs"]) & provided]


# ======================== IDENTIFIER NORMALIZERS ========================
_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
      [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
      [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
      [9,8,7,6,5,4,3,2,1,0]]
_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
      [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
      [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]


def verhoeff(num):
    c = 0
    for i, ch in enumerate(reversed(num)):
        c = _D[c][_P[i % 8][int(ch)]]
    return c == 0


def norm_phone(v):
    d = re.sub(r"\\D", "", v)
    if d.startswith("+91"): d = d[3:]
    elif d.startswith("91") and len(d) == 12: d = d[2:]
    elif d.startswith("0") and len(d) == 11: d = d[1:]
    return d if re.fullmatch(r"[6-9]\\d{9}", d) else None


def norm_aadhaar(v):
    d = re.sub(r"\\D", "", v)
    return d if re.fullmatch(r"\\d{12}", d) and verhoeff(d) else None


def norm_pan(v):
    v = v.upper().strip()
    return v if re.fullmatch(r"[A-Z]{5}\\d{4}[A-Z]", v) else None


def norm_epic(v):
    v = v.upper().replace(" ", "").replace("-", "")
    return v if re.fullmatch(r"[A-Z]{3}\\d{7}", v) else None


def norm_vehicle(v):
    n = re.sub(r"[^A-Za-z0-9]", "", v).upper()
    if re.fullmatch(r"\\d{2}BH\\d{4}[A-Z]{1,2}", n): return n
    m = re.fullmatch(r"([A-Z]{2})(\\d{1,2})([A-Z]{1,3})(\\d{4})", n)
    return f"{m.group(1)}{int(m.group(2)):02d}{m.group(3)}{m.group(4)}" if m else None


STATE_CODES = {
    "MH": "Maharashtra", "DL": "Delhi", "KA": "Karnataka", "TN": "Tamil Nadu",
    "UP": "Uttar Pradesh", "GJ": "Gujarat", "RJ": "Rajasthan", "WB": "West Bengal",
    "KL": "Kerala", "TS": "Telangana", "AP": "Andhra Pradesh", "MP": "Madhya Pradesh",
    "HR": "Haryana", "PB": "Punjab", "BR": "Bihar", "OD": "Odisha", "JH": "Jharkhand",
    "AS": "Assam", "CH": "Chandigarh", "GA": "Goa", "UK": "Uttarakhand",
    "HP": "Himachal Pradesh", "JK": "Jammu & Kashmir", "CG": "Chhattisgarh",
}

SERIES = {
    "9820": ("Vodafone Idea", "Mumbai"), "9821": ("Vodafone Idea", "Mumbai"),
    "9833": ("Vodafone Idea", "Mumbai"), "9819": ("Airtel", "Mumbai"),
    "9870": ("Airtel", "Delhi"), "9810": ("Airtel", "Delhi"),
    "9873": ("Airtel", "Delhi"), "9953": ("Airtel", "Delhi"),
    "9845": ("Airtel", "Karnataka"), "9880": ("Airtel", "Karnataka"),
    "9840": ("Airtel", "Tamil Nadu"), "9884": ("Airtel", "Tamil Nadu"),
    "9949": ("Airtel", "Andhra Pradesh"), "9000": ("Airtel", "AP"),
    "9824": ("Vodafone Idea", "Gujarat"), "9825": ("Vodafone Idea", "Gujarat"),
    "9414": ("BSNL", "Rajasthan"), "9415": ("BSNL", "Rajasthan"),
    "7200": ("Jio", "Pan-India"), "7012": ("Jio", "Pan-India"),
    "8890": ("Jio", "Pan-India"), "9999": ("Vodafone Idea", "Pan-India"),
}


# ======================== BREACH COLLECTORS ========================
@collector("XposedOrNot breach", ["email"], "breach", unmasked=True)
def c_xon(v):
    d = _json(f"https://api.xposedornot.com/v1/breach-analytics?email={v['email']}")
    b = (d.get("ExposedBreaches") or {}).get("breaches_details") or []
    return {"count": len(b), "breaches": [
        {"breach": x.get("breach"), "date": x.get("xposed_date"),
         "records": x.get("xposed_records"), "data": x.get("xposed_data")}
        for x in b]} or d


@collector("Pwned Password (HIBP)", ["password"], "breach", unmasked=True)
def c_pwn(v):
    h = hashlib.sha1(v["password"].encode()).hexdigest().upper()
    body, _ = _get(f"https://api.pwnedpasswords.com/range/{h[:5]}")
    for line in body.splitlines():
        p = line.split(":")
        if len(p) == 2 and p[0].strip() == h[5:]:
            return {"seen": int(p[1]), "verdict": "COMPROMISED"}
    return {"seen": 0, "verdict": "clean"}


@collector("emailrep.io", ["email"], "breach")
def c_emailrep(v):
    return _json(f"https://emailrep.io/{v['email']}")


# ======================== ACCOUNT COLLECTORS ========================
@collector("Gravatar", ["email"], "accounts")
def c_grav(v):
    h = hashlib.md5(v["email"].strip().lower().encode()).hexdigest()
    return {"exists": _exists(f"https://www.gravatar.com/avatar/{h}?d=404"),
            "url": f"https://www.gravatar.com/avatar/{h}"}


@collector("GitHub", ["username"], "accounts")
def c_gh(v): return _json(f"https://api.github.com/users/{v['username']}")


@collector("GitLab", ["username"], "accounts")
def c_gl(v): return _json(f"https://gitlab.com/api/v4/users?username={v['username']}")


@collector("Reddit", ["username"], "accounts")
def c_rd(v): return _json(f"https://www.reddit.com/user/{v['username']}/about.json")


@collector("Keybase", ["username"], "accounts")
def c_kb(v): return _json(f"https://keybase.io/_/api/1.0/user/lookup.json?username={v['username']}")


@collector("HackerNews", ["username"], "accounts")
def c_hn(v): return _json(f"https://hn.algolia.com/api/v1/search?tags=author_{v['username']}&hitsPerPage=5")


@collector("npm", ["username"], "accounts")
def c_npm(v): return _json(f"https://registry.npmjs.org/-/v1/search?text=maintainer:{v['username']}&size=5")


@collector("DockerHub", ["username"], "accounts")
def c_dh(v): return _json(f"https://hub.docker.com/v2/users/{v['username']}/")


@collector("PyPI", ["username"], "accounts")
def c_pypi(v): return {"exists": _exists(f"https://pypi.org/user/{v['username']}/")}


@collector("Telegram", ["username"], "accounts")
def c_tg(v): return {"exists": _exists(f"https://t.me/{v['username']}"),
                     "url": f"https://t.me/{v['username']}"}


# ======================== SHELL TOOLS ========================
@collector("Holehe", ["email"], "accounts")
def s_holehe(v): return run_tool(["holehe", v["email"], "--no-color"])


@collector("Sherlock", ["username"], "accounts")
def s_sherlock(v): return run_tool(["sherlock", v["username"], "--print-found", "--timeout", "5"])


@collector("Maigret", ["username"], "accounts")
def s_maigret(v): return run_tool(["maigret", v["username"], "--no-color", "--top-sites", "300"])


@collector("PhoneInfoga", ["phone"], "phone")
def s_phone(v): return run_tool(["phoneinfoga", "scan", "-n", v["phone"]])


# ======================== IDENTITY ========================
@collector("Username candidates", ["name"], "identity")
def c_perms(v):
    p = [x.lower() for x in v["name"].split() if x]
    if len(p) < 2: return p
    f, l = p[0], p[-1]; fi, li = f[0], l[0]
    return sorted({f + l, f + "." + l, f + "_" + l, f + "-" + l, fi + l, f + li,
                   l + f, f + l + "1", f + l + "01", l + fi})


# ======================== INDIA ========================
@collector("India: mobile carrier+circle", ["phone"], "india")
def c_india_phone(v):
    d = norm_phone(v["phone"])
    series = SERIES.get(d[:4]) if d and len(d) >= 4 else None
    return {"normalized": d, "operator": series[0] if series else "unknown",
            "circle": series[1] if series else "unknown",
            "note": "prefix-based pre-MNP hint. Confirm via TRAI / tafcop."}


@collector("India: vehicle RC parse", ["vehicle"], "india")
def c_india_vehicle(v):
    n = norm_vehicle(v["vehicle"])
    if not n: return {"valid": False, "raw": v["vehicle"]}
    if "BH" in n[:4]:
        return {"valid": True, "series": "BH", "state": "Any (BH series)", "normalized": n}
    return {"valid": True, "state_code": n[:2], "state": STATE_CODES.get(n[:2], "?"),
            "rto": n[:4], "normalized": n,
            "upstream": "https://parivahan.gov.in/rcdlstatus/"}


@collector("India: EPIC validator", ["epic"], "india")
def c_india_epic(v):
    v2 = v["epic"].upper().replace(" ", "").replace("-", "")
    return {"valid": bool(re.fullmatch(r"[A-Z]{3}[0-9]{7}", v2)), "normalized": v2}


@collector("India: PAN validator", ["pan"], "india")
def c_india_pan(v):
    v2 = v["pan"].upper().strip()
    return {"valid": bool(re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", v2)), "normalized": v2}


@collector("India: Aadhaar validator (Verhoeff)", ["aadhaar"], "india")
def c_india_aadhaar(v):
    d = re.sub(r"\\D", "", v["aadhaar"])
    return {"valid": bool(len(d) == 12 and verhoeff(d)), "normalized": d}


@collector("India: breach corpus reference", ["name", "phone", "email"], "india", unmasked=True)
def c_india_breach(v):
    return {"breaches": load_india_breaches()}


# ======================== LIVE SURVEILLANCE ========================
@collector("Live: flights over India", ["live"], "live")
def c_flights(v):
    return _json("https://opensky-network.org/api/states/all?lamin=6.5&lomin=68&lamax=37.5&lomax=97.5")


@collector("Live: earthquakes India", ["live"], "live")
def c_quakes(v):
    d = _json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
    return [f for f in d.get("features", [])
            if 6.5 < f["geometry"]["coordinates"][1] < 37.5
            and 68 < f["geometry"]["coordinates"][0] < 97]


@collector("Live: active satellites", ["live"], "live")
def c_sat(v):
    b, _ = _get("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle")
    return b[:4000]


@collector("Live: GDELT India news", ["live", "keyword"], "live")
def c_gdelt(v):
    q = v.get("keyword") or "India"
    return _json(f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}&format=json&maxrecords=20")


# ======================== IP / INFRA ========================
@collector("IP lookup (ipapi.co)", ["ip"], "infra")
def c_ip(v): return _json(f"https://ipapi.co/{v['ip']}/json/")


@collector("IP lookup (ipinfo.io)", ["ip"], "infra")
def c_ipinfo(v): return _json(f"https://ipinfo.io/{v['ip']}/json")


@collector("crt.sh certs", ["domain"], "infra")
def c_crt(v): return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("Wayback availability", ["domain"], "infra")
def c_wb(v): return _json(f"http://archive.org/wayback/available?url={v['domain']}")


# ======================== OFFENSIVE CYBER TOOLS ========================
@collector("Subdomain enum (crt.sh)", ["domain"], "offensive")
def c_off_crt(v): return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("DNS lookup", ["domain"], "offensive")
def c_off_dns(v):
    try:
        return {"domain": v["domain"], "a": socket.gethostbyname_ex(v["domain"])[2]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("HTTP headers", ["domain"], "offensive")
def c_off_headers(v):
    try:
        b, code = _get(f"http://{v['domain']}", headers={"User-Agent": "DISHA/2.0"})
        return {"domain": v["domain"], "status": code, "headers_sample": b[:2000]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("Port scan (common)", ["ip"], "offensive")
def c_off_ports(v):
    ip = v["ip"]
    common = [21,22,23,25,53,80,110,135,139,143,443,445,993,995,1433,3306,3389,5432,5900,6379,8080,8443,27017]
    open_ports = []
    for port in common:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            if s.connect_ex((ip, port)) == 0:
                open_ports.append(port)
            s.close()
        except Exception:
            pass
    return {"ip": ip, "open_ports": open_ports}


def load_india_breaches():
    path = os.path.join(HERE, "data", "india_breaches.json")
    try:
        return json.load(open(path))["breaches"]
    except Exception:
        return []
