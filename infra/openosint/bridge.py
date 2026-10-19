"""
OpenOSINT Internal Bridge Service for DISHA 6.6
Provides authenticated, governed HTTP and MCP interface to the official OpenOSINT framework.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure openosint package is in python path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from openosint import __version__ as OPENOSINT_VERSION
from openosint.env import load_env_or_exit
from openosint.tool_policy import (
    ENV_ALLOW_ACTIVE,
    TOOL_POLICY,
    describe,
    disabled_result,
    env_allows_active,
    is_tool_enabled,
)
from openosint.mcp_server import _all_tools, _HANDLERS, _GRAPH_TOOL_NAMES, _call_graph_tool, split_geojson_fence
from openosint.json_output import to_json

# Load environment
load_env_or_exit(prefer_package_root=True)

logger = logging.getLogger("disha.openosint_bridge")
logging.basicConfig(level=logging.INFO, format="[OpenOSINT Bridge] %(levelname)s: %(message)s")

app = FastAPI(
    title="DISHA 6.6 OpenOSINT Internal Bridge",
    description="Governed integration bridge for OpenOSINT MCP and investigation tools",
    version=OPENOSINT_VERSION,
)

# CORS restricted to internal callers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

INTERNAL_TOKEN = os.getenv("OPENOSINT_SERVICE_TOKEN", "").strip()


def verify_internal_auth(authorization: Optional[str] = Header(None)) -> bool:
    """Validate internal bearer token when configured."""
    if not INTERNAL_TOKEN:
        return True  # Local dev mode without token
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    token = authorization.replace("Bearer ", "").strip()
    if token != INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service token",
        )
    return True


class ToolRunRequest(BaseModel):
    arguments: Dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: Optional[int] = Field(default=30, ge=1, le=180)
    allow_active: Optional[bool] = Field(default=False)


class ToolRunResponse(BaseModel):
    tool: str
    target: Optional[str] = None
    success: bool
    status: str
    output: Any
    raw_text: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    key_required: Optional[str] = None
    execution_time_ms: int


@app.get("/health")
async def health_check():
    """Service health and capability posture."""
    active_mode = env_allows_active()
    all_tools_list = _all_tools()
    enabled_count = sum(1 for t in all_tools_list if is_tool_enabled(t.name))
    
    # Check configured API keys truthfully
    configured_keys = {
        "hibp": bool(os.getenv("HIBP_API_KEY")),
        "ipinfo": bool(os.getenv("IPINFO_TOKEN")),
        "ip2location": bool(os.getenv("IP2LOCATION_API_KEY")),
        "shodan": bool(os.getenv("SHODAN_API_KEY")),
        "virustotal": bool(os.getenv("VIRUSTOTAL_API_KEY")),
        "censys": bool(os.getenv("CENSYS_API_ID") and os.getenv("CENSYS_SECRET")),
        "abuseipdb": bool(os.getenv("ABUSEIPDB_API_KEY")),
        "github": bool(os.getenv("GITHUB_TOKEN")),
        "brightdata": bool(os.getenv("BRIGHTDATA_API_KEY")),
    }

    return {
        "service": "openosint-bridge",
        "version": OPENOSINT_VERSION,
        "status": "HEALTHY",
        "active_mode_enabled": active_mode,
        "total_tools": len(all_tools_list),
        "enabled_tools_count": enabled_count,
        "configured_providers": configured_keys,
        "truthful_invariant": "Real Data or No Data. Passive execution by default.",
    }


@app.get("/tools")
async def list_available_tools(all: bool = Query(False, description="Include disabled non-passive tools")):
    """Dynamically enumerate tools from OpenOSINT MCP definitions."""
    tools = []
    for tool in _all_tools():
        enabled = is_tool_enabled(tool.name)
        if not all and not enabled:
            continue
        policy = TOOL_POLICY.get(tool.name)
        tools.append({
            "name": tool.name,
            "description": describe(tool.name, tool.description or ""),
            "inputSchema": tool.inputSchema,
            "noise": policy.noise.value if policy else "unknown",
            "is_passive": policy.is_passive if policy else True,
            "enabled": enabled,
            "note": policy.note if policy else "",
        })
    return {"tools": tools, "count": len(tools)}


@app.post("/run/{tool_name}", response_model=ToolRunResponse)
async def run_tool(
    tool_name: str,
    req: ToolRunRequest,
    authorized: bool = Depends(verify_internal_auth),
):
    """Execute an OpenOSINT tool under governed limits."""
    start_time = asyncio.get_event_loop().time()
    
    # Enforce active tool policy check
    if tool_name in TOOL_POLICY:
        policy = TOOL_POLICY[tool_name]
        if not policy.is_passive and not req.allow_active and not env_allows_active():
            return ToolRunResponse(
                tool=tool_name,
                success=False,
                status="BLOCKED_BY_POLICY",
                output={"error": disabled_result(tool_name)},
                raw_text=disabled_result(tool_name),
                warnings=["Tool requires active reconnaissance authorization."],
                execution_time_ms=int((asyncio.get_event_loop().time() - start_time) * 1000),
            )

    arguments = dict(req.arguments)
    arguments["json_output"] = True

    try:
        # Graph tools dispatch
        if tool_name in _GRAPH_TOOL_NAMES:
            res = await asyncio.wait_for(
                _call_graph_tool(tool_name, arguments),
                timeout=req.timeout_seconds,
            )
            raw_text = res.content[0].text if res.content else ""
            execution_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
            return ToolRunResponse(
                tool=tool_name,
                success=not res.isError,
                status="COMPLETED" if not res.isError else "FAILED",
                output={"raw": raw_text},
                raw_text=raw_text,
                execution_time_ms=execution_time_ms,
            )

        if tool_name not in _HANDLERS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown OpenOSINT tool: '{tool_name}'",
            )

        handler, target_fn = _HANDLERS[tool_name]
        raw_result = await asyncio.wait_for(
            handler(arguments),
            timeout=req.timeout_seconds,
        )
        cleaned_result, _ = split_geojson_fence(raw_result)
        target = str(target_fn(arguments))
        json_str = to_json(tool_name, target, cleaned_result)
        
        # Parse formatted json
        parsed = {}
        try:
            import json
            parsed = json.loads(json_str)
        except Exception:
            parsed = {"raw": json_str}

        warnings = []
        key_required = None
        status_val = "COMPLETED"

        # Check for [key_required] markers
        if isinstance(parsed, dict):
            results_list = parsed.get("results", [])
            if isinstance(results_list, list):
                for line in results_list:
                    if isinstance(line, str) and "[key_required]" in line:
                        key_name = line.split("[key_required]")[-1].strip()
                        key_required = key_name
                        status_val = "AUTH_REQUIRED"
                        warnings.append(f"Requires API key: {key_name}")

        execution_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)

        return ToolRunResponse(
            tool=tool_name,
            target=target,
            success=status_val != "AUTH_REQUIRED",
            status=status_val,
            output=parsed,
            raw_text=cleaned_result,
            warnings=warnings,
            key_required=key_required,
            execution_time_ms=execution_time_ms,
        )

    except asyncio.TimeoutError:
        execution_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
        return ToolRunResponse(
            tool=tool_name,
            success=False,
            status="TIMED_OUT",
            output={"error": f"Tool '{tool_name}' timed out after {req.timeout_seconds}s"},
            warnings=[f"Execution exceeded timeout limit ({req.timeout_seconds}s)"],
            execution_time_ms=execution_time_ms,
        )
    except Exception as exc:
        execution_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
        logger.exception("Error executing tool %s", tool_name)
        return ToolRunResponse(
            tool=tool_name,
            success=False,
            status="FAILED",
            output={"error": str(exc)},
            warnings=[f"Subprocess exception: {str(exc)}"],
            execution_time_ms=execution_time_ms,
        )


if __name__ == "__main__":
    port = int(os.getenv("OPENOSINT_BRIDGE_PORT", "8055"))
    host = os.getenv("OPENOSINT_BRIDGE_HOST", "0.0.0.0")
    logger.info("Starting OpenOSINT Bridge on %s:%d", host, port)
    uvicorn.run(app, host=host, port=port, log_level="info")
