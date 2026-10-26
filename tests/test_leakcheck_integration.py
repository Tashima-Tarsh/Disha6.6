import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BACKEND = os.path.join(ROOT, "backend")
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)


def test_leakcheck_public_collector():
    from osint_collectors import c_leakcheck
    result = c_leakcheck({"email": "test@example.com"})
    assert isinstance(result, dict)
    assert result.get("target") == "test@example.com"
    assert result.get("found", 0) > 0
    assert "fields" in result or "sources" in result or "entries" in result


def test_leakcheck_app_lookup():
    from app import run_leakcheck_lookup
    res = run_leakcheck_lookup(query="admin@example.com", query_type="email", limit=10, offset=0, explicit_key=None)
    assert isinstance(res, dict)
    assert res.get("target") == "admin@example.com"
    assert "found" in res
