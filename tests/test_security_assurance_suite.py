from __future__ import annotations

import sys

sys.path.insert(0, ".")

from packages.scanners.security_assurance_suite import (
    GitleaksScanner,
    NucleiScanner,
    SecurityAssuranceSuite,
    SemgrepScanner,
    TrivyScanner,
)


def test_gitleaks_scanner_detection_and_fallback() -> None:
    scanner = GitleaksScanner()
    # Harmless synthetic test key (not a real secret)
    synthetic_key = "AKIAIOSFODNN7EXAMPLE"
    findings = scanner.scan_text(f"export AWS_KEY={synthetic_key}")
    assert len(findings) == 1
    assert findings[0]["rule"] == "AWS Access Key"
    assert findings[0]["severity"] == "CRITICAL"
    assert findings[0]["execution_mode"] == "HEURISTIC_FALLBACK"

    # Scan on missing binary reports honest NOT_INSTALLED status
    result = scanner.scan("packages/scanners/security_assurance_suite.py", allow_heuristic_fallback=False)
    if not scanner.is_available():
        assert result["status"] == "NOT_INSTALLED"
        assert "not installed" in result["error"].lower()
    else:
        assert result["status"] == "COMPLETED"


def test_semgrep_scanner_code_analysis_and_fallback() -> None:
    scanner = SemgrepScanner()
    vulnerable_snippet = """
def run_user_input(code_str):
    eval(code_str)  # insecure eval
"""
    findings = scanner.scan_code(vulnerable_snippet)
    assert len(findings) >= 1
    assert any(f["rule_id"] == "python-unsafe-eval" for f in findings)
    assert findings[0]["execution_mode"] == "HEURISTIC_FALLBACK"

    result = scanner.scan("packages/scanners/security_assurance_suite.py", allow_heuristic_fallback=False)
    if not scanner.is_available():
        assert result["status"] == "NOT_INSTALLED"
        assert "not installed" in result["error"].lower()
    else:
        assert result["status"] == "COMPLETED"


def test_trivy_scanner_manifest_audit_and_fallback() -> None:
    scanner = TrivyScanner()
    findings = scanner.scan_manifest("web/package.json")
    assert isinstance(findings, list)

    result = scanner.scan("web/package.json", allow_heuristic_fallback=False)
    if not scanner.is_available():
        assert result["status"] == "NOT_INSTALLED"
        assert "not installed" in result["error"].lower()
    else:
        assert result["status"] == "COMPLETED"


def test_nuclei_scanner_scope_enforcement() -> None:
    scanner = NucleiScanner()
    # Unauthorized target must be rejected immediately by scope policy
    result = scanner.scan_target("https://google.com")
    assert result["status"] == "SCOPE_DENIED"
    assert "not authorized" in result["error"].lower()

    # Authorized target on localhost passes scope enforcement
    local_result = scanner.scan_target("http://127.0.0.1:8000", allow_heuristic_fallback=True)
    assert local_result["status"] in ("COMPLETED", "TARGET_UNREACHABLE", "HEURISTIC_FALLBACK")


def test_security_assurance_suite_audit() -> None:
    suite = SecurityAssuranceSuite()
    audit = suite.audit_environment()
    assert "gitleaks" in audit
    assert "semgrep" in audit
    assert "trivy" in audit
    assert "nuclei" in audit
    for tool in ("gitleaks", "semgrep", "trivy", "nuclei"):
        assert "available" in audit[tool]
