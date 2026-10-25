"""
DISHA 6.6 — Security Assurance Suite
Implements Nuclei, Semgrep, Trivy, and Gitleaks security tooling contracts.
Strictly restricted to authorized localhost / project workspace targets.
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List


class GitleaksScanner:
    """Secret and credential exposure detection (Upstream 20: gitleaks/gitleaks)."""

    SECRET_PATTERNS = [
        ("AWS Access Key", re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}")),
        ("Generic Private Key", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
        ("Generic High-Entropy API Key", re.compile(r"""(?:api_key|apikey|secret|token)\s*[:=]\s*["']([A-Za-z0-9_\-]{24,})["']""", re.I)),
    ]

    def scan_text(self, text: str, source_label: str = "buffer") -> List[Dict[str, Any]]:
        findings = []
        for name, pattern in self.SECRET_PATTERNS:
            for match in pattern.finditer(text):
                findings.append({
                    "rule": name,
                    "source": source_label,
                    "matched": match.group(0)[:6] + "..." + match.group(0)[-4:],
                    "start": match.start(),
                    "severity": "CRITICAL",
                })
        return findings

    def scan_file(self, filepath: str) -> List[Dict[str, Any]]:
        if not os.path.exists(filepath):
            return []
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return self.scan_text(content, source_label=filepath)


class SemgrepScanner:
    """Code security analysis & AST rule matching (Upstream 18: semgrep/semgrep)."""

    CODE_RULES = [
        {
            "id": "python-unsafe-eval",
            "pattern": re.compile(r"\beval\s*\("),
            "severity": "CRITICAL",
            "message": "Use of eval() detected, which allows arbitrary code execution",
        },
        {
            "id": "python-shell-true",
            "pattern": re.compile(r"subprocess\.(?:run|Popen|call)\s*\([^)]*shell\s*=\s*True"),
            "severity": "HIGH",
            "message": "subprocess with shell=True detected without strict sanitization",
        },
        {
            "id": "js-inner-html",
            "pattern": re.compile(r"dangerouslySetInnerHTML"),
            "severity": "MEDIUM",
            "message": "dangerouslySetInnerHTML detected; ensure input is sanitized",
        },
    ]

    def scan_code(self, code: str, filename: str = "snippet") -> List[Dict[str, Any]]:
        findings = []
        for rule in self.CODE_RULES:
            for match in rule["pattern"].finditer(code):
                findings.append({
                    "rule_id": rule["id"],
                    "severity": rule["severity"],
                    "message": rule["message"],
                    "file": filename,
                    "offset": match.start(),
                })
        return findings


class TrivyScanner:
    """Dependency and configuration security assessment (Upstream 19: aquasecurity/trivy)."""

    # Known vulnerable package versions dictionary for offline verification
    KNOWN_ADVISORIES = {
        "lodash": {"<4.17.21": "CVE-2021-23337 Prototype Pollution"},
        "urllib3": {"<2.0.7": "CVE-2023-45803 Request body strip on redirect"},
    }

    def scan_manifest(self, manifest_path: str) -> List[Dict[str, Any]]:
        findings = []
        if not os.path.exists(manifest_path):
            return findings

        if manifest_path.endswith("package.json"):
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                for pkg, ver in deps.items():
                    if pkg in self.KNOWN_ADVISORIES:
                        findings.append({
                            "package": pkg,
                            "installed_version": ver,
                            "advisory": self.KNOWN_ADVISORIES[pkg],
                            "manifest": manifest_path,
                        })
            except Exception:
                pass
        return findings


class NucleiScanner:
    """Authorized template-based vulnerability assessment (Upstream 17: projectdiscovery/nuclei)."""

    AUTHORIZED_HOSTS = {"127.0.0.1", "localhost", "0.0.0.0"}

    def scan_target(self, target_url: str, check_headers: bool = True) -> Dict[str, Any]:
        """
        Executes authorized scan on localhost target only.
        Rejects non-localhost targets immediately.
        """
        import urllib.parse
        parsed = urllib.parse.urlparse(target_url)
        hostname = (parsed.hostname or "").lower()

        if hostname not in self.AUTHORIZED_HOSTS:
            return {
                "status": "SCOPE_DENIED",
                "target": target_url,
                "error": f"Target '{hostname}' is not authorized. Scans permitted on localhost only.",
                "findings": [],
            }

        # Safe local endpoint check
        import urllib.request
        findings = []
        started = time.time()
        try:
            req = urllib.request.Request(target_url, headers={"User-Agent": "DISHA-Nuclei-Authorized-Probe/6.6"})
            with urllib.request.urlopen(req, timeout=5) as response:
                headers = dict(response.headers)
                # Template: Security Header Missing Check
                if "x-frame-options" not in {k.lower() for k in headers}:
                    findings.append({
                        "template_id": "missing-x-frame-options",
                        "severity": "LOW",
                        "target": target_url,
                        "description": "Target response lacks X-Frame-Options header (clickjacking protection)",
                    })
                if "content-security-policy" not in {k.lower() for k in headers}:
                    findings.append({
                        "template_id": "missing-csp",
                        "severity": "LOW",
                        "target": target_url,
                        "description": "Target response lacks Content-Security-Policy header",
                    })

                return {
                    "status": "COMPLETED",
                    "target": target_url,
                    "http_status": response.status,
                    "duration_s": round(time.time() - started, 3),
                    "findings": findings,
                }
        except Exception as e:
            return {
                "status": "TARGET_UNREACHABLE",
                "target": target_url,
                "error": str(e),
                "findings": [],
            }

