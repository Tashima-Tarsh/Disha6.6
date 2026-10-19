# Multi-stage Dockerfile for OpenOSINT MCP & HTTP Bridge Service
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY disha/services/integrations/osint-upstreams/OpenOSINT/pyproject.toml ./
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY disha/services/integrations/osint-upstreams/OpenOSINT/ .
RUN uv pip install --no-cache . fastapi uvicorn mcp

FROM python:3.12-slim AS runner

WORKDIR /app

RUN groupadd -g 10001 disha && \
    useradd -u 10001 -g disha -s /bin/bash -m disha

COPY --from=builder /opt/venv /opt/venv
COPY disha/services/integrations/osint-upstreams/OpenOSINT/ .
COPY infra/openosint/bridge.py ./bridge.py

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8055

USER disha:disha

EXPOSE 8055

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8055/health').read(); print('ok')" || exit 1

CMD ["python", "bridge.py"]
