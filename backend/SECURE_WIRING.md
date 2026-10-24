# Final Security Wiring for backend/app.py

## Goal
Make every sensitive route require authentication and every file path sandboxed.

## Steps

### 1. At the top of `app.py` (after other imports)

```python
from fastapi import Depends
from secure_bootstrap import (
    apply_security,
    require_api_key,
    ensure_inside_workspace,
    ensure_directory_inside_workspace,
)
```

### 2. Right after `app = FastAPI(...)`

**Remove** the open CORS line:
```python
# DELETE THIS:
# app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

**Add**:
```python
apply_security(app)
```

### 3. Protect routes

Change decorators to:

```python
@app.post("/scan", dependencies=[Depends(require_api_key)])
@app.post("/api/v1/data/load", dependencies=[Depends(require_api_key)])
@app.post("/api/v1/resolve", dependencies=[Depends(require_api_key)])
@app.get("/api/v1/graph/stats", dependencies=[Depends(require_api_key)])
@app.post("/api/v1/vyuh/activate", dependencies=[Depends(require_api_key)])
```

### 4. Inside `data_load`

```python
if directory:
    safe_dir = ensure_directory_inside_workspace(directory)
    result = load_all(conn, str(safe_dir), ...)
elif path:
    safe_path = ensure_inside_workspace(path)
    if not safe_path.exists():
        return JSONResponse({"error": "file not found"}, status_code=400)
    result = load_file(conn, str(safe_path), ...)
```

### 5. Environment

```bash
export DISHA_OSINT_API_KEY="$(openssl rand -hex 32)"
export DISHA_ALLOWED_ORIGINS="http://localhost:3000,https://your-frontend.example"
export DISHA_DATA_ROOT="/absolute/path/to/allowed/data"
```

After these changes the legacy OSINT surface is constitutionally compliant.
