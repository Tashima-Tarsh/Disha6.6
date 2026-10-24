#!/usr/bin/env python3
"""
Apply constitutional security wiring to backend/app.py in place.

Usage (from repo root):
  python scripts/apply_backend_security.py

What it does:
- Updates module docstring (removes "Zero API key required")
- Switches to secure_bootstrap (auth + CORS + path sandbox)
- Adds Depends(require_api_key) to sensitive routes
- Sandboxes /api/v1/data/load paths
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "backend" / "app.py"


def main() -> None:
    src = APP.read_text(encoding="utf-8")
    original = src

    # 1. Docstring
    src = src.replace(
        "Zero API key required. Runs standalone or proxied by Next.js.",
        "Constitutional security: fail-closed auth, restricted CORS, path sandbox.",
    )

    # 2. Imports
    if "from secure_bootstrap import" not in src:
        src = src.replace(
            "from fastapi import FastAPI\n",
            "from fastapi import FastAPI, Depends\n",
        )
        src = src.replace(
            "from fastapi.middleware.cors import CORSMiddleware\n",
            "",
        )
        insert = (
            "\nfrom secure_bootstrap import (\n"
            "    apply_security,\n"
            "    require_api_key,\n"
            "    ensure_inside_workspace,\n"
            "    ensure_directory_inside_workspace,\n"
            ")\n"
        )
        src = src.replace(
            "from typing import Optional, Dict, Any, List\n",
            "from typing import Optional, Dict, Any, List\n" + insert,
        )

    # 3. CORS → apply_security
    src = src.replace(
        'app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])',
        "apply_security(app)  # restricted CORS + constitutional defaults",
    )

    # 4. Protect routes
    route_map = [
        ('@app.get("/api/v1/vyuh/formations")', '@app.get("/api/v1/vyuh/formations", dependencies=[Depends(require_api_key)])'),
        ('@app.post("/api/v1/vyuh/activate")', '@app.post("/api/v1/vyuh/activate", dependencies=[Depends(require_api_key)])'),
        ('@app.post("/scan")', '@app.post("/scan", dependencies=[Depends(require_api_key)])'),
        ('@app.get("/api/v1/graph/stats")', '@app.get("/api/v1/graph/stats", dependencies=[Depends(require_api_key)])'),
        ('@app.post("/api/v1/data/load")', '@app.post("/api/v1/data/load", dependencies=[Depends(require_api_key)])'),
        ('@app.post("/api/v1/resolve")', '@app.post("/api/v1/resolve", dependencies=[Depends(require_api_key)])'),
    ]
    for old, new in route_map:
        if old in src and new not in src:
            src = src.replace(old, new)

    # 5. Path sandbox in data_load
    old_block = """        if directory:
            result = load_all(conn, directory, limit_per_file=limit, dry=dry)
        elif path:
            if not os.path.exists(path):
                return JSONResponse({"error": "file not found"}, status_code=400)
            result = load_file(conn, path, source, limit=limit, dry=dry)"""
    new_block = """        if directory:
            safe_dir = ensure_directory_inside_workspace(directory)
            result = load_all(conn, str(safe_dir), limit_per_file=limit, dry=dry)
        elif path:
            safe_path = ensure_inside_workspace(path)
            if not safe_path.exists():
                return JSONResponse({"error": "file not found"}, status_code=400)
            result = load_file(conn, str(safe_path), source, limit=limit, dry=dry)"""
    if old_block in src:
        src = src.replace(old_block, new_block)

    if "except PermissionError" not in src and "def data_load" in src:
        src = src.replace(
            "    except Exception as e:\n        return JSONResponse({\"error\": str(e)}, status_code=500)\n\n\n@app.post(\"/api/v1/resolve\"",
            "    except PermissionError as e:\n        return JSONResponse({\"error\": str(e)}, status_code=403)\n    except Exception as e:\n        return JSONResponse({\"error\": str(e)}, status_code=500)\n\n\n@app.post(\"/api/v1/resolve\"",
        )

    if src == original:
        print("No changes needed (already secured) or patterns not found.")
        # Still report status
    else:
        APP.write_text(src, encoding="utf-8")
        print(f"Updated {APP}")

    # Verify markers
    final = APP.read_text(encoding="utf-8")
    checks = {
        "apply_security": "apply_security(app)" in final,
        "require_api_key": "Depends(require_api_key)" in final,
        "path_sandbox": "ensure_inside_workspace" in final,
        "no_open_cors": 'allow_origins=["*"]' not in final,
    }
    for k, v in checks.items():
        print(f"  {k}: {'OK' if v else 'MISSING'}")
    if all(checks.values()):
        print("Constitutional security wiring complete.")
    else:
        print("Some checks failed — review backend/app.py manually.")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
