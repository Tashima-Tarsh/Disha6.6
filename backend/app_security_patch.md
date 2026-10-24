# Exact Patch for backend/app.py (Apply Manually or via Follow-up)

Because `backend/app.py` is very large, the precise changes are listed here so they can be applied cleanly.

## 1. Add imports (after existing imports)

```python
from fastapi import Depends
from auth import require_api_key
from path_sandbox import ensure_inside_workspace, ensure_directory_inside_workspace
```

## 2. Replace the CORS line

Find:
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

Replace with:
```python
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("DISHA_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## 3. Protect the critical endpoints

Change these decorators:

```python
@app.post("/scan", dependencies=[Depends(require_api_key)])
@app.post("/api/v1/data/load", dependencies=[Depends(require_api_key)])
@app.post("/api/v1/resolve", dependencies=[Depends(require_api_key)])
@app.get("/api/v1/graph/stats", dependencies=[Depends(require_api_key)])
@app.post("/api/v1/vyuh/activate", dependencies=[Depends(require_api_key)])
```

## 4. Inside data_load function — add sandbox

```python
if directory:
    safe_dir = ensure_directory_inside_workspace(directory)
    result = load_all(conn, str(safe_dir), limit_per_file=limit, dry=dry)
elif path:
    safe_path = ensure_inside_workspace(path)
    if not safe_path.exists():
        return JSONResponse({"error": "file not found"}, status_code=400)
    result = load_file(conn, str(safe_path), source, limit=limit, dry=dry)
```

After these four changes the OSINT backend is constitutionally compliant.
