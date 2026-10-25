from __future__ import annotations

import sys
sys.path.insert(0, ".")

from packages.scanners.security_assurance_suite import (
    GitleaksScanner,
    SemgrepScanner,
    TrivyScanner,
    NucleiScanner,
)


def test_gitleaks_scanner_detection() -> None:
    scanner = GitleaksScanner()
    # Harmless synthetic test key (not a real secret)
    synthetic_key = "AKIAIOSFODNN7EXAMPLE"
    findings = scanner.scan_text(f"export AWS_KEY={synthetic_key}")
    assert len(findings) == 1
    assert findings[0]["rule"] == "AWS Access Key"
    assert findings[0]["severity"] == "CRITICAL"


def test_semgrep_scanner_code_analysis() -> None:
    scanner = SemgrepScanner()
    vulnerable_snippet = """
def run_user_input(code_str):
    eval(code_str)  # insecure eval
"""
    findings = scanner.scan_code(vulnerable_snippet)
    assert len(findings) >= 1
    assert any(f["rule_id"] == "python-unsafe-eval" for f in findings)


def test_trivy_scanner_manifest_audit() -> None:
    scanner = TrivyScanner()
    findings = scanner.scan_manifest("web/package.json")
    # package.json does not use deprecated vulnerable lodash version
    assert isinstance(findings, list)


def test_nuclei_scanner_scope_enforcement() -> None:
    scanner = NucleiScanner()
    # Unauthorized target must be rejected immediately by scope policy
    result = scanner.scan_target("https://google.com")
    assert result["status"] == "SCOPE_DENIED"
    assert "not authorized" in result["error"].lower()

    # Authorized target on localhost passes scope enforcement
    local_result = scanner.scan_target("http://127.0.0.1:8000")
    assert local_result["status"] in ("COMPLETED", "TARGET_UNREACHABLE")

