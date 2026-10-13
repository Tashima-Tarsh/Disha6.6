"""Private HTTP bridge around the official OpenOSINT MCP stdio server.

The bridge intentionally exposes a small tool allowlist, not OpenOSINT's
agent/REPL or an unrestricted MCP endpoint. Keep this service on the internal
container network; only the Disha web server should call it.
"""
from __future__ import annotations

import asyncio
import hmac
import json
import os
import sys
from contextlib import AsyncExitStack, asynccontextmanager
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from openosint import __version__ as OPENOSINT_VERSION

DEFAULT_TOOLS = {
    "generate_dorks",
    "search_abuseipdb",
    "search_dns",
    "search_gdelt_geo",
    "search_github",
    "search_ip",
    "search_ip2location",
    "search_paste",
    "search_rdap",
    "search_shodan",
    "search_virustotal",
    "search_whois",
}
IDENTITY_TOOLS = {"search_email", "search_username", "search_phone", "search_breach"}
ACTIVE_TOOLS = {"search_domain", "search_dorks_live", "search_footprint", "scrape_url"}
ALL_SUPPORTED_TOOLS = DEFAULT_TOOLS | IDENTITY_TOOLS | ACTIVE_TOOLS

# Each tool has a small, explicit input schema. No arbitrary kwargs or shell
# commands are accepted from callers.
ARGUMENT_KEYS: dict[str, set[str]] = {
    "generate_dorks": {"target"},
    "search_abuseipdb": {"ip"},
    "search_dns": {"domain"},
    "search_gdelt_geo": {"query", "timespan", "maxpoints", "bbox"},
    "search_github": {"query"},
    "search_ip": {"ip"},
    "search_ip2location": {"ip"},
    "search_paste": {"query"},
    "search_rdap": {"domain"},
    "search_shodan": {"query"},
    "search_virustotal": {"target"},
    "search_whois": {"domain"},
    "search_email": {"email"},
    "search_username": {"username"},
    "search_phone": {"phone"},
    "search_breach": {"email"},
    "search_domain": {"domain"},
    "search_dorks_live": {"target"},
    "search_footprint": {"target", "max_queries"},
    "scrape_url": {"url"},
}
REQUIRED_KEYS: dict[str, set[str]] = {}
for tool_name, keys in ARGUMENT_KEYS.items():
    optional = {"timespan", "maxpoints", "bbox"} if tool_name == "search_gdelt_geo" else set()
    if tool_name == "search_footprint":
        optional = {"max_queries"}
    REQUIRED_KEYS[tool_name] = keys - optional

class ToolCall(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=80, pattern=r"^[a-z][a-z0-9_]{0,79}$")
    arguments: dict[str, Any] = Field(default_factory=dict)

def _bool_env(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}

def _configured_allowlist() -> set[str]:
    raw = os.environ.get("DISHA_OPENOSINT_TOOL_ALLOWLIST", "").strip()
    if not raw:
        return set(DEFAULT_TOOLS)
    requested = {part.strip() for part in raw.split(",") if part.strip()}
    unknown = requested - ALL_SUPPORTED_TOOLS
    if unknown:
        raise RuntimeError(
            "Unknown OpenOSINT tool(s) in DISHA_OPENOSINT_TOOL_ALLOWLIST: "
            + ", ".join(sorted(unknown))
        )
    return requested

def _child_env() -> dict[str, str]:
    env = dict(os.environ)
    # OpenOSINT itself also gates active tools. The bridge never enables them
    # unless the operator explicitly opts in.
    env["OPENOSINT_ALLOW_ACTIVE"] = "1" if _bool_env("DISHA_OPENOSINT_ALLOW_ACTIVE") else "0"
    env["OPENOSINT_MAX_TOOL_CALLS"] = "8"
    env["OPENOSINT_MAX_TOOL_CALLS_MULTI"] = "8"
    return env

def _safe_arguments(name: str, values: dict[str, Any]) -> dict[str, Any]:
    allowed = ARGUMENT_KEYS[name]
    unexpected = set(values) - allowed
    if unexpected:
        raise HTTPException(status_code=422, detail="Unsupported argument(s): " + ", ".join(sorted(unexpected)))
    missing = REQUIRED_KEYS[name] - set(values)
    if missing:
        raise HTTPException(status_code=422, detail="Missing argument(s): " + ", ".join(sorted(missing)))
    clean: dict[str, Any] = {}
    for key, value in values.items():
        if key in {"timespan", "maxpoints", "max_queries"}:
            if not isinstance(value, int) or isinstance(value, bool):
                raise HTTPException(status_code=422, detail=f"{key} must be an integer")
            limits = {"timespan": (15, 1440), "maxpoints": (1, 100), "max_queries": (1, 3)}
            minimum, maximum = limits[key]
            if not minimum <= value <= maximum:
                raise HTTPException(status_code=422, detail=f"{key} must be between {minimum} and {maximum}")
            clean[key] = value
        elif key == "bbox":
            if (
                not isinstance(value, list)
                or len(value) != 4
                or any(not isinstance(n, (int, float)) or isinstance(n, bool) for n in value)
            ):
                raise HTTPException(status_code=422, detail="bbox must contain four numeric coordinates")
            min_lon, min_lat, max_lon, max_lat = value
            if not (
                -180 <= min_lon <= 180
                and -180 <= max_lon <= 180
                and -90 <= min_lat <= 90
                and -90 <= max_lat <= 90
                and min_lon <= max_lon
                and min_lat <= max_lat
            ):
                raise HTTPException(status_code=422, detail="bbox coordinates are invalid")
            clean[key] = value
        else:
            if not isinstance(value, str):
                raise HTTPException(status_code=422, detail=f"{key} must be text")
            value = value.strip()
            if not value or len(value) > 2048 or any(ord(ch) < 32 for ch in value):
                raise HTTPException(status_code=422, detail=f"{key} is empty, too long, or contains control characters")
            clean[key] = value
    if len(json.dumps(clean, ensure_ascii=False)) > 8192:
        raise HTTPException(status_code=413, detail="Request arguments are too large")
    return clean

def _authorize(authorization: str | None) -> None:
    expected = os.environ.get("DISHA_OPENOSINT_BRIDGE_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="OpenOSINT bridge is not configured")
    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Bearer token required")

def _effective_allowlist() -> set[str]:
    allowlist = _configured_allowlist()
    if not _bool_env("DISHA_OPENOSINT_ALLOW_ACTIVE"):
        allowlist -= ACTIVE_TOOLS
    if not (
        _bool_env("DISHA_OPENOSINT_ALLOW_ACTIVE")
        and _bool_env("DISHA_OPENOSINT_IDENTITY_ENUMERATION_APPROVED")
    ):
        allowlist -= IDENTITY_TOOLS
    return allowlist

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.environ.get("DISHA_OPENOSINT_BRIDGE_TOKEN", "").strip():
        raise RuntimeError("DISHA_OPENOSINT_BRIDGE_TOKEN must be set to a strong random secret")
    stack = AsyncExitStack()
    try:
        params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "openosint.mcp_server"],
            env=_child_env(),
            encoding="utf-8",
            encoding_error_handler="strict",
        )
        read_stream, write_stream = await stack.enter_async_context(stdio_client(params))
        session = await stack.enter_async_context(ClientSession(read_stream, write_stream))
        await session.initialize()
        result = await session.list_tools()
        upstream_tools = {tool.name: tool.description or "" for tool in result.tools}
        app.state.mcp_session = session
        app.state.upstream_tools = upstream_tools
        app.state.tool_lock = asyncio.Lock()
        app.state.started = True
        app.state.last_error = None
        yield
    except Exception as exc:
        app.state.last_error = type(exc).__name__
        raise
    finally:
        app.state.started = False
        await stack.aclose()

app = FastAPI(
    title="Disha OpenOSINT Bridge",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

@app.get("/health")
async def health(request: Request):
    return {
        "status": "healthy" if getattr(request.app.state, "started", False) else "unavailable",
        "integration": "OpenOSINT MCP stdio",
        "openosintVersion": OPENOSINT_VERSION,
        "mcpConnected": bool(getattr(request.app.state, "started", False)),
        "toolCount": len(getattr(request.app.state, "upstream_tools", {})),
        "lastError": getattr(request.app.state, "last_error", None),
    }

@app.get("/v1/tools")
async def list_tools(request: Request, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    available = getattr(request.app.state, "upstream_tools", {})
    allowed = _effective_allowlist()
    tools = [
        {"name": name, "description": description}
        for name, description in sorted(available.items())
        if name in allowed and name in ALL_SUPPORTED_TOOLS
    ]
    return {
        "integration": "OpenOSINT",
        "version": OPENOSINT_VERSION,
        "tools": tools,
        "identityToolsRequireApproval": True,
        "activeToolsEnabled": _bool_env("DISHA_OPENOSINT_ALLOW_ACTIVE"),
    }

@app.post("/v1/tools/call")
async def call_tool(body: ToolCall, request: Request, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    allowed = _effective_allowlist()
    if body.name not in ALL_SUPPORTED_TOOLS or body.name not in allowed:
        raise HTTPException(status_code=403, detail="Tool is not enabled by the Disha OpenOSINT policy")
    available = getattr(request.app.state, "upstream_tools", {})
    if body.name not in available:
        raise HTTPException(status_code=503, detail="Tool is not available from the configured OpenOSINT MCP runtime")
    arguments = _safe_arguments(body.name, body.arguments)

    # Identity lookups require separate explicit operator approval even when
    # the MCP server exposes the tool.
    if body.name in IDENTITY_TOOLS and not (
        _bool_env("DISHA_OPENOSINT_ALLOW_ACTIVE")
        and _bool_env("DISHA_OPENOSINT_IDENTITY_ENUMERATION_APPROVED")
    ):
        raise HTTPException(status_code=403, detail="Identity-enumeration tools require explicit Disha approval")

    session = getattr(request.app.state, "mcp_session", None)
    if session is None:
        raise HTTPException(status_code=503, detail="OpenOSINT MCP runtime is unavailable")
    try:
        async with request.app.state.tool_lock:
            result = await asyncio.wait_for(
                session.call_tool(body.name, {**arguments, "json_output": True}),
                timeout=45,
            )
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="OpenOSINT tool execution timed out") from exc
    except Exception as exc:
        request.app.state.last_error = type(exc).__name__
        raise HTTPException(status_code=502, detail="OpenOSINT MCP tool call failed") from exc

    text_parts = [
        item.text
        for item in (result.content or [])
        if getattr(item, "type", None) == "text" and isinstance(getattr(item, "text", None), str)
    ]
    raw = "\n".join(text_parts)
    try:
        parsed = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        parsed = {"results": raw.splitlines(), "error": None}
    if not isinstance(parsed, dict):
        parsed = {"results": [str(parsed)], "error": None}
    return {
        "tool": body.name,
        "target": next(iter(arguments.values()), ""),
        "status": "provider_error" if result.isError else "completed",
        "isError": bool(result.isError),
        "result": parsed,
        "source": "OpenOSINT",
        "upstream": "https://github.com/OpenOSINT/OpenOSINT",
    }
