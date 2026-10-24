# Secure Wiring Instructions for backend/app.py

**Status**: Required follow-up to complete Phase 0

The authentication and path-sandbox modules are already present:
- `backend/auth.py` → `require_api_key`
- `backend/path_sandbox.py` → `ensure_inside_workspace`

## Required changes inside `backend/app.py`

### 1. Imports (top of file)
```python
from fastapi import Depends
from auth import require_api_key
from path_sandbox import ensure_inside_workspace, ensure_directory_inside_workspace
```

### 2. Replace open CORS
```python
# OLD (insecure)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# NEW (constitutional)
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

### 3. Protect every sensitive endpoint
Add `dependencies=[Depends(require_api_key)]` to:
- `@app.post("/scan")`
- `@app.post("/api/v1/data/load")`
- `@app.post("/api/v1/resolve")`
- `@app.get("/api/v1/graph/stats")`
- `@app.post("/api/v1/vyuh/activate")`
- Any other data-mutating or identity-resolving route

Example:
```python
@app.post("/scan", dependencies=[Depends(require_api_key)])
async def scan(payload: ScanInput):
    ...
```

### 4. Path sandbox on data load
```python
@app.post("/api/v1/data/load", dependencies=[Depends(require_api_key)])
def data_load(payload: dict):
    path = payload.get("path")
    directory = payload.get("directory")
    ...
    if directory:
        safe_dir = ensure_directory_inside_workspace(directory)
        result = load_all(conn, str(safe_dir), ...)
    elif path:
        safe_path = ensure_inside_workspace(path)
        result = load_file(conn, str(safe_path), ...)
```

### 5. Environment
```bash
export DISHA_OSINT_API_KEY="$(openssl rand -hex 32)"
export DISHA_ALLOWED_ORIGINS="http://localhost:3000,https://disha6.6.thenitishkr.in"
export DISHA_DATA_ROOT="/absolute/path/to/allowed/data"
```

After these changes the OSINT surface will be constitutionally compliant.
