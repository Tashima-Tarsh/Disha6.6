#!/usr/bin/env python3
"""OSINT collector registry — pure functions, no HTTP surface.

Policy (Article V):
- Collectors are tagged with risk: "passive" | "active_network".
- plan() excludes active_network unless allow_active=True.
- Callers (app.scan, vyuha) must pass an explicit allow before any active probe runs.

Privacy:
- Secrets (password, token, api_key) are NEVER returned to UI or logs in cleartext.
- Identity PII may be shown on-screen to authorized operators (inputsDisplay).
- Logs / evidence / print paths use redact_for_log() only.
"""
from __future__ import annotations

import datetime
import hashlib
import json
import math
import os
import re
import shutil
import socket
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

try:
    import leakcheck
except ImportError:
    leakcheck = None

UA = {"User-Agent": "DISHA-6.6/OSINT-ONE/2.0 (+https://localhost)"}
T = 25
POOL = ThreadPoolExecutor(max_workers=16)
FETCH_POOL = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fetch")
REGISTRY: list[dict] = []

# Secrets — never cleartext in UI, logs, or evidence.
SECRET_KEYS: set[str] = {
    "password", "passwd", "secret", "token", "api_key", "apikey",
}
# Identity PII — redacted in logs/evidence; may appear in authorized UI display.
PII_KEYS: set[str] = {
    "aadhaar", "pan", "epic", "phone", "email", "name",
}

# Shell binaries mapped for install hints.
SHELL_BINARIES = {
    "Holehe": "holehe",
    "Sherlock": "sherlock",
    "Maigret": "maigret",
    "PhoneInfoga": "phoneinfoga",
}


def collector(name, inputs, category, unmasked=False, risk="passive", kind="network"):
    """Register a collector.

    kind: network | shell | local | live
    risk: passive | active_network
    """
    def deco(fn):
        REGISTRY.append(
            dict(
                name=name,
                inputs=inputs,
                category=category,
                fn=fn,
                unmasked=unmasked,
                risk=risk,
                kind=kind,
            )
        )
        return fn
    return deco


def redact_for_log(v: dict[str, Any]) -> dict[str, Any]:
    """Redact secrets + PII for logs, print, and evidence payloads."""
    out: dict[str, Any] = {}
    for k, val in v.items():
        lk = k.lower()
        if lk in SECRET_KEYS or lk in PII_KEYS:
            out[k] = "[REDACTED]"
        else:
            out[k] = val
    return out


def redact_inputs(v: dict[str, Any]) -> dict[str, Any]:
    """Alias for log/evidence redaction (backward compatible)."""
    return redact_for_log(v)


def inputs_for_display(v: dict[str, Any]) -> dict[str, Any]:
    """UI-facing inputs: secrets redacted, identity PII visible to operator."""
    out: dict[str, Any] = {}
    for k, val in v.items():
        if k.lower() in SECRET_KEYS:
            out[k] = "[REDACTED]"
        else:
            out[k] = val
    return out


def _get(url, headers=None):
    h = dict(UA)
    h.update(headers or {})
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
    try:
        return json.loads(b)
    except Exception:
        return {"_raw": b}


def _exists(url):
    return _get(url)[1] == 200


def run_tool(cmd, timeout=300):
    """Run external CLI; structured result when missing."""
    binary = cmd[0]
    if not shutil.which(binary):
        return {
            "status": "not_installed",
            "binary": binary,
            "actionable": False,
            "installHint": f"Install `{binary}` on PATH to enable this collector",
        }
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        out = ((p.stdout or "") + (p.stderr or "")).strip()[:20000] or "(no output)"
        return {
            "status": "ok" if p.returncode == 0 else "error",
            "binary": binary,
            "actionable": True,
            "exitCode": p.returncode,
            "output": out,
        }
    except Exception as e:
        return {
            "status": "error",
            "binary": binary,
            "actionable": True,
            "error": str(e),
        }


def safe(c, v):
    try:
        return c["fn"](v)
    except Exception as e:
        return {"status": "error", "error": str(e), "collector": c.get("name")}


def plan(v, allow_active: bool = False) -> list[dict]:
    provided = {k for k, val in v.items() if val}
    chosen = [c for c in REGISTRY if set(c["inputs"]) & provided]
    if not allow_active:
        chosen = [c for c in chosen if c.get("risk", "passive") != "active_network"]
    return chosen


def collector_runtime_status(c: dict) -> dict[str, Any]:
    """Whether this collector can execute on this host right now."""
    name = c["name"]
    kind = c.get("kind", "network")
    risk = c.get("risk", "passive")
    base = {
        "name": name,
        "inputs": c["inputs"],
        "category": c["category"],
        "risk": risk,
        "kind": kind,
    }
    if name in SHELL_BINARIES:
        binary = SHELL_BINARIES[name]
        installed = bool(shutil.which(binary))
        return {
            **base,
            "executable": installed,
            "actionable": installed,
            "binary": binary,
            "status": "ready" if installed else "not_installed",
            "installHint": None if installed else f"pip/npm install or place `{binary}` on PATH",
        }
    if kind == "local":
        return {**base, "executable": True, "actionable": True, "status": "ready"}
    # network / live — executable code is present; depends on network at run time
    return {
        **base,
        "executable": True,
        "actionable": True,
        "status": "ready",
        "note": "Requires outbound network at runtime",
    }


def list_tools_status() -> list[dict[str, Any]]:
    return [collector_runtime_status(c) for c in REGISTRY]


def policy_deny_message(collector_name: str) -> dict[str, Any]:
    return {
        "status": "denied_by_policy",
        "collector": collector_name,
        "reason": "active_network collectors require allowActive=true on the scan request",
        "policyId": "osint-active-probe-gate",
    }


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
    d = re.sub(r"\D", "", v)
    if d.startswith("+91"):
        d = d[3:]
    elif d.startswith("91") and len(d) == 12:
        d = d[2:]
    elif d.startswith("0") and len(d) == 11:
        d = d[1:]
    return d if re.fullmatch(r"[6-9]\d{9}", d) else None


def norm_aadhaar(v):
    d = re.sub(r"\D", "", v)
    return d if re.fullmatch(r"\d{12}", d) and verhoeff(d) else None


def norm_pan(v):
    v = v.upper().strip()
    return v if re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", v) else None


def norm_epic(v):
    v = v.upper().replace(" ", "").replace("-", "")
    return v if re.fullmatch(r"[A-Z]{3}\d{7}", v) else None


def norm_vehicle(v):
    n = re.sub(r"[^A-Za-z0-9]", "", v).upper()
    if re.fullmatch(r"\d{2}BH\d{4}[A-Z]{1,2}", n):
        return n
    m = re.fullmatch(r"([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})", n)
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


@collector("XposedOrNot breach", ["email"], "breach", unmasked=True, kind="network")
def c_xon(v):
    d = _json(f"https://api.xposedornot.com/v1/breach-analytics?email={v['email']}")
    b = (d.get("ExposedBreaches") or {}).get("breaches_details") or []
    return {"count": len(b), "breaches": [
        {"breach": x.get("breach"), "date": x.get("xposed_date"),
         "records": x.get("xposed_records"), "data": x.get("xposed_data")}
        for x in b]} or d


@collector("Pwned Password (HIBP)", ["password"], "breach", unmasked=True, kind="network")
def c_pwn(v):
    h = hashlib.sha1(v["password"].encode()).hexdigest().upper()
    body, status = _get(f"https://api.pwnedpasswords.com/range/{h[:5]}")
    if status == 0 or (isinstance(body, str) and body.startswith("ERR ")):
        return {"seen": None, "verdict": "unknown", "error": "upstream request failed"}
    for line in body.splitlines():
        p = line.split(":")
        if len(p) == 2 and p[0].strip() == h[5:]:
            return {"seen": int(p[1]), "verdict": "COMPROMISED"}
    return {"seen": 0, "verdict": "clean"}


@collector("emailrep.io", ["email"], "breach", kind="network")
def c_emailrep(v):
    return _json(f"https://emailrep.io/{v['email']}")


@collector("LeakCheck breach intelligence", ["email", "username", "phone"], "breach", unmasked=True, kind="network")
def c_leakcheck(v):
    q = v.get("email") or v.get("username") or v.get("phone")
    if not q:
        return {"found": 0, "error": "target required"}
    q = str(q).strip()
    api_key = os.getenv("LEAKCHECK_APIKEY")
    try:
        if leakcheck is not None and api_key and len(api_key) >= 40:
            client = leakcheck.LeakCheckAPI_v2(api_key=api_key)
            q_type = "email" if "@" in q else ("phone" if q.replace("+", "").replace("-", "").isdigit() else "username")
            res = client.lookup(q, query_type=q_type, limit=100)
            return {
                "source": "LeakCheck Pro API v2",
                "target": q,
                "type": q_type,
                "found": len(res) if isinstance(res, list) else 0,
                "entries": res if isinstance(res, list) else [],
            }
        elif leakcheck is not None:
            client = leakcheck.LeakCheckAPI_Public()
            res = client.lookup(q)
            return {
                "source": "LeakCheck Public API",
                "target": q,
                "success": res.get("success", False),
                "found": res.get("found", 0),
                "fields": res.get("fields", []),
                "sources": res.get("sources", []),
            }
        else:
            d = _json(f"https://leakcheck.io/api/public?check={q}")
            return {
                "source": "LeakCheck Public API (Direct)",
                "target": q,
                "success": d.get("success", False) if isinstance(d, dict) else False,
                "found": d.get("found", 0) if isinstance(d, dict) else 0,
                "fields": d.get("fields", []) if isinstance(d, dict) else [],
                "sources": d.get("sources", []) if isinstance(d, dict) else [],
            }
    except Exception as e:
        return {"target": q, "error": str(e), "source": "LeakCheck"}


@collector("Gravatar", ["email"], "accounts", kind="network")
def c_grav(v):
    h = hashlib.md5(v["email"].strip().lower().encode()).hexdigest()
    return {"exists": _exists(f"https://www.gravatar.com/avatar/{h}?d=404"),
            "url": f"https://www.gravatar.com/avatar/{h}"}


@collector("GitHub", ["username"], "accounts", kind="network")
def c_gh(v): return _json(f"https://api.github.com/users/{v['username']}")


@collector("GitLab", ["username"], "accounts", kind="network")
def c_gl(v): return _json(f"https://gitlab.com/api/v4/users?username={v['username']}")


@collector("Reddit", ["username"], "accounts", kind="network")
def c_rd(v): return _json(f"https://www.reddit.com/user/{v['username']}/about.json")


@collector("Keybase", ["username"], "accounts", kind="network")
def c_kb(v): return _json(f"https://keybase.io/_/api/1.0/user/lookup.json?username={v['username']}")


@collector("HackerNews", ["username"], "accounts", kind="network")
def c_hn(v): return _json(f"https://hn.algolia.com/api/v1/search?tags=author_{v['username']}&hitsPerPage=5")


@collector("npm", ["username"], "accounts", kind="network")
def c_npm(v): return _json(f"https://registry.npmjs.org/-/v1/search?text=maintainer:{v['username']}&size=5")


@collector("DockerHub", ["username"], "accounts", kind="network")
def c_dh(v): return _json(f"https://hub.docker.com/v2/users/{v['username']}/")


@collector("PyPI", ["username"], "accounts", kind="network")
def c_pypi(v): return {"exists": _exists(f"https://pypi.org/user/{v['username']}/")}


@collector("Telegram", ["username"], "accounts", kind="network")
def c_tg(v): return {"exists": _exists(f"https://t.me/{v['username']}"),
                     "url": f"https://t.me/{v['username']}"}


@collector("Holehe", ["email"], "accounts", kind="shell")
def s_holehe(v): return run_tool(["holehe", v["email"], "--no-color"])


@collector("Sherlock", ["username"], "accounts", kind="shell")
def s_sherlock(v): return run_tool(["sherlock", v["username"], "--print-found", "--timeout", "5"])


@collector("Maigret", ["username"], "accounts", kind="shell")
def s_maigret(v): return run_tool(["maigret", v["username"], "--no-color", "--top-sites", "300"])


@collector("PhoneInfoga", ["phone"], "phone", kind="shell")
def s_phone(v): return run_tool(["phoneinfoga", "scan", "-n", v["phone"]])


@collector("Username candidates", ["name"], "identity", kind="local")
def c_perms(v):
    p = [x.lower() for x in v["name"].split() if x]
    if len(p) < 2:
        return p
    first_name, last_name = p[0], p[-1]
    fi, li = first_name[0], last_name[0]
    return sorted({
        first_name + last_name,
        first_name + "." + last_name,
        first_name + "_" + last_name,
        first_name + "-" + last_name,
        fi + last_name,
        first_name + li,
        last_name + first_name,
        first_name + last_name + "1",
        first_name + last_name + "01",
        last_name + fi,
    })


@collector("India: mobile carrier+circle", ["phone"], "india", kind="local")
def c_india_phone(v):
    d = norm_phone(v["phone"])
    series = SERIES.get(d[:4]) if d and len(d) >= 4 else None
    return {"normalized": d, "operator": series[0] if series else "unknown",
            "circle": series[1] if series else "unknown",
            "note": "prefix-based pre-MNP hint. Confirm via TRAI / tafcop."}


@collector("India: vehicle RC parse", ["vehicle"], "india", kind="local")
def c_india_vehicle(v):
    n = norm_vehicle(v["vehicle"])
    if not n:
        return {"valid": False, "raw": v["vehicle"]}
    if "BH" in n[:4]:
        return {"valid": True, "series": "BH", "state": "Any (BH series)", "normalized": n}
    return {"valid": True, "state_code": n[:2], "state": STATE_CODES.get(n[:2], "?"),
            "rto": n[:4], "normalized": n,
            "upstream": "https://parivahan.gov.in/rcdlstatus/"}


@collector("India: EPIC validator", ["epic"], "india", kind="local")
def c_india_epic(v):
    v2 = norm_epic(v["epic"])
    return {"valid": bool(v2), "normalized": v2 or v["epic"].upper().replace(" ", "").replace("-", "")}


@collector("India: PAN validator", ["pan"], "india", kind="local")
def c_india_pan(v):
    v2 = norm_pan(v["pan"])
    return {"valid": bool(v2), "normalized": v2 or v["pan"].upper().strip()}


@collector("India: Aadhaar validator (Verhoeff)", ["aadhaar"], "india", kind="local")
def c_india_aadhaar(v):
    d = norm_aadhaar(v["aadhaar"])
    raw = re.sub(r"\D", "", v["aadhaar"])
    # Results still avoid full Aadhaar in stored observation; UI inputsDisplay may show query.
    return {
        "valid": bool(d),
        "normalized_last4": (d or raw)[-4:] if (d or raw) else None,
        "note": "result payload holds last4 only; operator screen may show full query via inputsDisplay",
    }


@collector("India: breach corpus reference", ["name", "phone", "email"], "india", unmasked=True, kind="local")
def c_india_breach(v):
    return {"breaches": load_india_breaches()}


@collector("Live: flights over India", ["live"], "live", kind="live")
def c_flights(v):
    return _json("https://opensky-network.org/api/states/all?lamin=6.5&lomin=68&lamax=37.5&lomax=97.5")


@collector("Live: earthquakes India", ["live"], "live", kind="live")
def c_quakes(v):
    d = _json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
    return [f for f in d.get("features", [])
            if 6.5 < f["geometry"]["coordinates"][1] < 37.5
            and 68 < f["geometry"]["coordinates"][0] < 97]


@collector("Live: active satellites", ["live"], "live", kind="live")
def c_sat(v):
    b, _ = _get("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle")
    return b[:4000]


@collector("Live: GDELT India news", ["live", "keyword"], "live", kind="live")
def c_gdelt(v):
    q = v.get("keyword") or "India"
    return _json(f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}&format=json&maxrecords=20")


@collector("IP lookup (ipapi.co)", ["ip"], "infra", kind="network")
def c_ip(v): return _json(f"https://ipapi.co/{v['ip']}/json/")


@collector("IP lookup (ipinfo.io)", ["ip"], "infra", kind="network")
def c_ipinfo(v): return _json(f"https://ipinfo.io/{v['ip']}/json")


@collector("crt.sh certs", ["domain"], "infra", kind="network")
def c_crt(v): return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("Wayback availability", ["domain"], "infra", kind="network")
def c_wb(v): return _json(f"http://archive.org/wayback/available?url={v['domain']}")


@collector("Subdomain enum (crt.sh)", ["domain"], "offensive", risk="passive", kind="network")
def c_off_crt(v):
    return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("DNS lookup", ["domain"], "offensive", risk="active_network", kind="network")
def c_off_dns(v):
    try:
        return {"domain": v["domain"], "a": socket.gethostbyname_ex(v["domain"])[2]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("HTTP headers", ["domain"], "offensive", risk="active_network", kind="network")
def c_off_headers(v):
    try:
        b, code = _get(f"http://{v['domain']}", headers={"User-Agent": "DISHA/2.0"})
        return {"domain": v["domain"], "status": code, "headers_sample": b[:2000]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("Port scan (common)", ["ip"], "offensive", risk="active_network", kind="network")
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


@collector("AlienVault OTX (Domain)", ["domain"], "infra", kind="network")
def c_otx_domain(v):
    url = f"https://otx.alienvault.com/api/v1/indicators/domain/{v['domain']}/general"
    data = _json(url)
    if not isinstance(data, dict):
        return {"domain": v["domain"], "error": "unreachable"}
    pulse = data.get("pulse_info", {})
    return {
        "domain": v["domain"],
        "pulse_count": pulse.get("count", 0),
        "validation": data.get("validation", []),
        "whois": data.get("whois"),
        "alexa_rank": data.get("alexa"),
        "indicator_type": data.get("type_title"),
    }


@collector("AlienVault OTX (IP)", ["ip"], "infra", kind="network")
def c_otx_ip(v):
    url = f"https://otx.alienvault.com/api/v1/indicators/IPv4/{v['ip']}/general"
    data = _json(url)
    if not isinstance(data, dict):
        return {"ip": v["ip"], "error": "unreachable"}
    pulse = data.get("pulse_info", {})
    return {
        "ip": v["ip"],
        "pulse_count": pulse.get("count", 0),
        "reputation": data.get("reputation", 0),
        "asn": data.get("asn"),
        "country": data.get("country_name"),
        "city": data.get("city"),
    }


@collector("URLScan.io public scans", ["domain"], "infra", kind="network")
def c_urlscan_domain(v):
    url = f"https://urlscan.io/api/v1/search/?q=domain:{v['domain']}&size=5"
    data = _json(url)
    if not isinstance(data, dict):
        return {"domain": v["domain"], "error": "unreachable"}
    results = []
    for item in data.get("results", [])[:5]:
        page = item.get("page", {})
        results.append({
            "url": page.get("url"),
            "domain": page.get("domain"),
            "ip": page.get("ip"),
            "asn": page.get("asnname"),
            "title": page.get("title"),
            "screenshot": item.get("screenshot"),
            "time": item.get("task", {}).get("time"),
        })
    return {"domain": v["domain"], "total_scans": data.get("total", 0), "recent": results}


@collector("HackerTarget DNS lookup", ["domain"], "infra", kind="network")
def c_hackertarget_dns(v):
    raw, code = _get(f"https://api.hackertarget.com/dnslookup/?q={v['domain']}")
    lines = [line.strip() for line in raw.splitlines() if line.strip() and not line.startswith("API count")]
    records: dict[str, list[str]] = {}
    for line in lines:
        parts = line.split(" : ", 1)
        if len(parts) == 2:
            rtype, val = parts[0].strip(), parts[1].strip()
            records.setdefault(rtype, []).append(val)
    return {"domain": v["domain"], "status": code, "records": records if records else {"raw": lines[:10]}}


@collector("HackerTarget Reverse DNS", ["ip"], "infra", kind="network")
def c_hackertarget_rev(v):
    raw, code = _get(f"https://api.hackertarget.com/reversedns/?q={v['ip']}")
    lines = [line.strip() for line in raw.splitlines() if line.strip() and not line.startswith("API count")]
    return {"ip": v["ip"], "status": code, "hostnames": lines}


@collector("Bluesky social profile", ["username"], "identity", kind="network")
def c_bluesky(v):
    u = v["username"].lstrip("@")
    url = f"https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={u}.bsky.social"
    data = _json(url)
    if isinstance(data, dict) and data.get("did"):
        return {
            "found": True,
            "handle": data.get("handle"),
            "displayName": data.get("displayName"),
            "description": data.get("description"),
            "did": data.get("did"),
            "followersCount": data.get("followersCount"),
            "avatar": data.get("avatar"),
        }
    return {"found": False, "username": u}


@collector("Bellingcat ShadowFinder (Solar Chrono)", ["lat", "lon"], "geo", kind="local")
def c_shadowfinder(v):
    try:
        lat = float(v["lat"])
        lon = float(v["lon"])
        dt_str = v.get("timestamp") or v.get("datetime")
        if dt_str:
            try:
                dt_utc = datetime.datetime.fromisoformat(dt_str.replace("Z", "+00:00")).astimezone(datetime.UTC)
            except Exception:
                dt_utc = datetime.datetime.now(datetime.UTC)
        else:
            dt_utc = datetime.datetime.now(datetime.UTC)

        day_of_year = dt_utc.timetuple().tm_yday
        hour = dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0
        gamma = 2.0 * math.pi / 365.0 * (day_of_year - 1 + (hour - 12.0) / 24.0)

        eqtime = 229.18 * (0.000075 + 0.001868 * math.cos(gamma) - 0.032077 * math.sin(gamma)
                           - 0.014615 * math.cos(2*gamma) - 0.040849 * math.sin(2*gamma))
        decl = (0.006918 - 0.399912 * math.cos(gamma) + 0.070257 * math.sin(gamma)
                - 0.006758 * math.cos(2*gamma) + 0.000907 * math.sin(2*gamma)
                - 0.002697 * math.cos(3*gamma) + 0.00148 * math.sin(3*gamma))

        time_offset = eqtime + 4.0 * lon
        tst = hour * 60.0 + time_offset
        solar_time_deg = (tst / 4.0) - 180.0
        ha_rad = math.radians(solar_time_deg)

        lat_rad = math.radians(lat)
        cos_zenith = math.sin(lat_rad) * math.sin(decl) + math.cos(lat_rad) * math.cos(decl) * math.cos(ha_rad)
        cos_zenith = max(-1.0, min(1.0, cos_zenith))
        zenith_rad = math.acos(cos_zenith)
        elevation_deg = 90.0 - math.degrees(zenith_rad)

        if elevation_deg <= 0:
            return {
                "coordinates": [lat, lon],
                "utc_time": dt_utc.isoformat(),
                "sun_above_horizon": False,
                "elevation_deg": round(elevation_deg, 2),
                "shadow_ratio": None,
                "note": "Sun below horizon at target time (nighttime; no shadow)",
            }

        shadow_ratio = 1.0 / math.tan(zenith_rad if elevation_deg < 89.9 else 0.01)
        cos_az = (math.sin(decl) - math.sin(lat_rad) * cos_zenith) / (math.cos(lat_rad) * math.sin(zenith_rad))
        cos_az = max(-1.0, min(1.0, cos_az))
        azimuth_deg = math.degrees(math.acos(cos_az))
        if solar_time_deg > 0:
            azimuth_deg = 360.0 - azimuth_deg

        return {
            "coordinates": [lat, lon],
            "utc_time": dt_utc.isoformat(),
            "sun_above_horizon": True,
            "elevation_deg": round(elevation_deg, 2),
            "azimuth_deg": round(azimuth_deg, 2),
            "shadow_ratio": round(shadow_ratio, 3),
            "shadow_direction_deg": round((azimuth_deg + 180.0) % 360.0, 2),
            "methodology": "Bellingcat ShadowFinder solar geometry",
        }
    except Exception as e:
        return {"error": str(e)}


def load_india_breaches():
    path = os.path.join(HERE, "data", "india_breaches.json")
    try:
        return json.load(open(path))["breaches"]
    except Exception:
        return []
