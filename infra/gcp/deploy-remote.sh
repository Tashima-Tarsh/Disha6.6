#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f "$REPO_ROOT/.env" ]; then
  echo "ERROR: $REPO_ROOT/.env is required for production deployment." >&2
  exit 1
fi

DEPLOYED_SHA=$(git rev-parse HEAD)
export DISHA_BUILD_SHA="$DEPLOYED_SHA"
echo "Deploying DISHA revision: ${DEPLOYED_SHA}"
printf "%s\n" "$DEPLOYED_SHA" > "$REPO_ROOT/DEPLOYED_COMMIT"
sed -i "s/^DISHA_BUILD_SHA=.*/DISHA_BUILD_SHA=${DEPLOYED_SHA}/" "$REPO_ROOT/.env"

if [ -f "$REPO_ROOT/.gitmodules" ]; then
  echo "Initializing pinned OSINT upstream source trees..."
  git submodule sync
  git submodule update --init --jobs "${DISHA_SUBMODULE_JOBS:-4}"
fi

echo "[1/6] Preparing docker-compose.gcp.yml..."
cat <<'COMPOSE_EOF' > "$REPO_ROOT/docker-compose.gcp.yml"
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      web:
        condition: service_healthy

  postgres:
    build:
      context: .
      dockerfile: infra/postgres/Dockerfile
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-disha}
      POSTGRES_USER: ${POSTGRES_USER:-disha}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Database password required}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-disha} -d ${POSTGRES_DB:-disha}"]
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD:-}"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a \"${REDIS_PASSWORD:-}\" ping || redis-cli ping"]
      interval: 10s
      timeout: 3s
      retries: 10

  embeddings:
    build:
      context: ./disha/embeddings
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      DISHA_EMBEDDING_MODEL: ${DISHA_EMBEDDING_MODEL:-sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2}
      DISHA_EMBEDDING_DIMENSIONS: ${DISHA_EMBEDDING_DIMENSIONS:-384}
    volumes:
      - embedding_models:/models
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8081/health', timeout=5).read()"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 60s

  disha-brain:
    build:
      context: .
      dockerfile: disha/brain/Dockerfile
    restart: unless-stopped
    environment:
      DISHA_BRAIN_API_HOST: 0.0.0.0
      DISHA_BRAIN_API_PORT: 8080
      DISHA_BRAIN_API_TOKEN: ${DISHA_BRAIN_API_TOKEN:?Brain token required}
      DISHA_BRAIN_DB_PATH: /data/disha_brain.db
      DISHA_ALLOWED_ORIGINS: ${DISHA_ALLOWED_ORIGINS:-http://localhost:3000}
    volumes:
      - disha_brain_data:/data
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/v1/health', timeout=5).read()\""]
      interval: 15s
      timeout: 5s
      retries: 10

  web-migrate:
    image: disha-web:local
    command: ["node", "scripts/apply-schema.mjs"]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  web:
    image: disha-web:local
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DISHA_BUILD_SHA: ${DISHA_BUILD_SHA:-unknown}
      DISHA_AUTH_MODE: ${DISHA_AUTH_MODE:-password}
      DISHA_DEV_PASSWORD: ${DISHA_DEV_PASSWORD:-}
      DISHA_DEV_ADMIN_EMAILS: ${DISHA_DEV_ADMIN_EMAILS:-}
      DISHA_JWT_SECRET: ${DISHA_JWT_SECRET:?JWT secret required}
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      DISHA_ALLOWED_ORIGINS: ${DISHA_ALLOWED_ORIGINS:-http://localhost:3000}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
      DISHA_BRAIN_URL: http://disha-brain:8080
      DISHA_BRAIN_API_TOKEN: ${DISHA_BRAIN_API_TOKEN}
      DISHA_RESEARCH_RUNTIME_URL: http://disha-brain:8080
      DISHA_RESEARCH_RUNTIME_TOKEN: ${DISHA_RESEARCH_RUNTIME_TOKEN:-${DISHA_BRAIN_API_TOKEN}}
      DISHA_WORKER_TOKEN: ${DISHA_WORKER_TOKEN:?Worker token required}
      DISHA_EMBEDDING_PROVIDER: openai-compatible
      DISHA_EMBEDDING_BASE_URL: http://embeddings:8081/v1
      DISHA_EMBEDDING_MODEL: ${DISHA_EMBEDDING_MODEL:-sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2}
      DISHA_EMBEDDING_TIMEOUT_MS: 5000
      DISHA_EMBEDDING_API_KEY: "none"
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      OPENAI_MODEL: ${OPENAI_MODEL:-gpt-5.6-luna}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      ANTHROPIC_MODEL: ${ANTHROPIC_MODEL:-claude-sonnet-4-5}
      DISHA_MODEL_PROVIDER: ${DISHA_MODEL_PROVIDER:-disabled}
      OPENCTI_BASE_URL: ${OPENCTI_BASE_URL:-}
      OPENCTI_TOKEN: ${OPENCTI_TOKEN:-}
      INTELOWL_BASE_URL: ${INTELOWL_BASE_URL:-}
      INTELOWL_API_KEY: ${INTELOWL_API_KEY:-}
      INTELOWL_ANALYZERS_ALLOWLIST: ${INTELOWL_ANALYZERS_ALLOWLIST:-${INTELOWL_ANALYZERS:-}}
      INTELOWL_ANALYZERS: ${INTELOWL_ANALYZERS:-${INTELOWL_ANALYZERS_ALLOWLIST:-}}
      INTELOWL_JOB_TIMEOUT_MS: ${INTELOWL_JOB_TIMEOUT_MS:-15000}
      DISHA_ASTRA6_ALL_TOOLS_ENABLED: ${DISHA_ASTRA6_ALL_TOOLS_ENABLED:-false}
      DISHA_ASTRA6_SHERLOCK_ENABLED: ${DISHA_ASTRA6_SHERLOCK_ENABLED:-false}
      DISHA_ASTRA6_MAIGRET_ENABLED: ${DISHA_ASTRA6_MAIGRET_ENABLED:-false}
      DISHA_ASTRA6_HOLEHE_ENABLED: ${DISHA_ASTRA6_HOLEHE_ENABLED:-false}
      DISHA_ASTRA6_PHONEINFOGA_ENABLED: ${DISHA_ASTRA6_PHONEINFOGA_ENABLED:-false}
      DISHA_ASTRA6_INSTALOADER_ENABLED: ${DISHA_ASTRA6_INSTALOADER_ENABLED:-false}
      DISHA_ASTRA6_TELEGRAM_PUBLIC_ENABLED: ${DISHA_ASTRA6_TELEGRAM_PUBLIC_ENABLED:-false}
      DISHA_ASTRA6_THEHARVESTER_ENABLED: ${DISHA_ASTRA6_THEHARVESTER_ENABLED:-false}
      DISHA_ASTRA6_OWASP_AMASS_ENABLED: ${DISHA_ASTRA6_OWASP_AMASS_ENABLED:-false}
      DISHA_ASTRA6_SUBFINDER_ENABLED: ${DISHA_ASTRA6_SUBFINDER_ENABLED:-false}
      DISHA_ASTRA6_SPIDERFOOT_ENABLED: ${DISHA_ASTRA6_SPIDERFOOT_ENABLED:-false}
      DISHA_ASTRA6_RECON_NG_ENABLED: ${DISHA_ASTRA6_RECON_NG_ENABLED:-false}
      DISHA_ASTRA6_PHOTON_ENABLED: ${DISHA_ASTRA6_PHOTON_ENABLED:-false}
      DISHA_IDENTITY_ENUMERATION_APPROVED: ${DISHA_IDENTITY_ENUMERATION_APPROVED:-false}
      DISHA_ACTIVE_RECON_APPROVED: ${DISHA_ACTIVE_RECON_APPROVED:-false}
      TELEGRAM_API_ID: ${TELEGRAM_API_ID:-}
      TELEGRAM_API_HASH: ${TELEGRAM_API_HASH:-}
      TELEGRAM_SESSION: ${TELEGRAM_SESSION:-}
    depends_on:
      web-migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      embeddings:
        condition: service_healthy
      disha-brain:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 30s

  dynamic-worker:
    image: disha-web:local
    command: ["node", "scripts/dynamic-worker.mjs"]
    healthcheck:
      disable: true
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DISHA_INTERNAL_WEB_URL: http://web:3000
      DISHA_WORKER_TOKEN: ${DISHA_WORKER_TOKEN}
      DISHA_SCHEDULER_POLL_SECONDS: ${DISHA_SCHEDULER_POLL_SECONDS:-30}
      DISHA_SCHEDULER_MAX_JOBS: ${DISHA_SCHEDULER_MAX_JOBS:-10}
      DISHA_WORKFLOW_MAX_JOBS: ${DISHA_WORKFLOW_MAX_JOBS:-10}
      DISHA_WORKFLOW_LEASE_SECONDS: ${DISHA_WORKFLOW_LEASE_SECONDS:-120}
      DISHA_WORKER_ID: gcp-dynamic-worker-1
    depends_on:
      web:
        condition: service_healthy

  osint-identity-worker:
    build:
      context: .
      dockerfile: infra/workers/Dockerfile.identity
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      DISHA_WORKER_ID: gcp-astra6-identity-worker-1
      DISHA_OSINT_POLL_MS: ${DISHA_OSINT_POLL_MS:-1000}
      DISHA_ASTRA6_ALL_TOOLS_ENABLED: ${DISHA_ASTRA6_ALL_TOOLS_ENABLED:-false}
      DISHA_ASTRA6_PHONEINFOGA_ENABLED: ${DISHA_ASTRA6_PHONEINFOGA_ENABLED:-false}
      DISHA_ASTRA6_SHERLOCK_ENABLED: ${DISHA_ASTRA6_SHERLOCK_ENABLED:-false}
      DISHA_ASTRA6_MAIGRET_ENABLED: ${DISHA_ASTRA6_MAIGRET_ENABLED:-false}
      DISHA_ASTRA6_HOLEHE_ENABLED: ${DISHA_ASTRA6_HOLEHE_ENABLED:-false}
      DISHA_ASTRA6_INSTALOADER_ENABLED: ${DISHA_ASTRA6_INSTALOADER_ENABLED:-false}
      DISHA_ASTRA6_TELEGRAM_PUBLIC_ENABLED: ${DISHA_ASTRA6_TELEGRAM_PUBLIC_ENABLED:-false}
      DISHA_IDENTITY_ENUMERATION_APPROVED: ${DISHA_IDENTITY_ENUMERATION_APPROVED:-false}
      WORKER_CLASS: identity
      TELEGRAM_API_ID: ${TELEGRAM_API_ID:-}
      TELEGRAM_API_HASH: ${TELEGRAM_API_HASH:-}
      TELEGRAM_SESSION: ${TELEGRAM_SESSION:-}
      INSTAGRAM_LOGIN: ${INSTAGRAM_LOGIN:-}
      INSTAGRAM_SESSION_FILE: ${INSTAGRAM_SESSION_FILE:-}
      DISHA_MAIGRET_TOP_SITES: ${DISHA_MAIGRET_TOP_SITES:-300}
      DISHA_HOLEHE_TIMEOUT_SECONDS: ${DISHA_HOLEHE_TIMEOUT_SECONDS:-8}
      DISHA_SHERLOCK_TIMEOUT_SECONDS: ${DISHA_SHERLOCK_TIMEOUT_SECONDS:-10}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      web-migrate:
        condition: service_completed_successfully

  osint-infrastructure-worker:
    build:
      context: .
      dockerfile: infra/workers/Dockerfile.infrastructure
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      DISHA_WORKER_ID: gcp-astra6-infrastructure-worker-1
      DISHA_OSINT_POLL_MS: ${DISHA_OSINT_POLL_MS:-1000}
      DISHA_ASTRA6_ALL_TOOLS_ENABLED: ${DISHA_ASTRA6_ALL_TOOLS_ENABLED:-false}
      DISHA_ASTRA6_THEHARVESTER_ENABLED: ${DISHA_ASTRA6_THEHARVESTER_ENABLED:-false}
      DISHA_ASTRA6_OWASP_AMASS_ENABLED: ${DISHA_ASTRA6_OWASP_AMASS_ENABLED:-false}
      DISHA_ASTRA6_SUBFINDER_ENABLED: ${DISHA_ASTRA6_SUBFINDER_ENABLED:-false}
      WORKER_CLASS: infrastructure
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      web-migrate:
        condition: service_completed_successfully

  osint-advanced-worker:
    build:
      context: .
      dockerfile: infra/workers/Dockerfile.research-osint
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      DISHA_WORKER_ID: gcp-astra6-advanced-worker-1
      DISHA_OSINT_POLL_MS: ${DISHA_OSINT_POLL_MS:-1000}
      DISHA_ASTRA6_ALL_TOOLS_ENABLED: ${DISHA_ASTRA6_ALL_TOOLS_ENABLED:-false}
      DISHA_ASTRA6_SPIDERFOOT_ENABLED: ${DISHA_ASTRA6_SPIDERFOOT_ENABLED:-false}
      DISHA_ASTRA6_RECON_NG_ENABLED: ${DISHA_ASTRA6_RECON_NG_ENABLED:-false}
      DISHA_ASTRA6_PHOTON_ENABLED: ${DISHA_ASTRA6_PHOTON_ENABLED:-false}
      DISHA_ACTIVE_RECON_APPROVED: ${DISHA_ACTIVE_RECON_APPROVED:-false}
      WORKER_CLASS: advanced
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      web-migrate:
        condition: service_completed_successfully

volumes:
  postgres_data:
  redis_data:
  embedding_models:
  disha_brain_data:
  caddy_data:
  caddy_config:
COMPOSE_EOF

echo "[2/6] Preparing Caddyfile..."
cat <<'CADDY_EOF' > "$REPO_ROOT/Caddyfile"
disha6.6.thenitishkr.in, :80, :443 {
    reverse_proxy web:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_down Location 0.0.0.0:3000 {host}
    }
}
CADDY_EOF

echo "[3/6] Building production Docker images..."
docker builder prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
docker compose -f docker-compose.gcp.yml build

echo "[4/6] Launching PostgreSQL and Redis..."
docker compose -f docker-compose.gcp.yml up -d postgres redis

echo "Waiting for PostgreSQL pgvector/postgis to be healthy..."
db_ready=0
for attempt in $(seq 1 40); do
  if docker compose -f docker-compose.gcp.yml exec -T postgres pg_isready -U disha -d disha >/dev/null 2>&1; then
    db_ready=1
    break
  fi
  sleep 3
done
if [ "$db_ready" -ne 1 ]; then
  echo "ERROR: PostgreSQL did not become ready." >&2
  docker compose -f docker-compose.gcp.yml logs --tail=200 postgres >&2 || true
  exit 1
fi

echo "[5/6] Applying database schema migrations..."
docker compose -f docker-compose.gcp.yml up web-migrate

echo "[6/6] Launching full DISHA 6.6 production stack..."
docker compose -f docker-compose.gcp.yml up -d

echo "Configuring systemd service for persistence across reboots..."
cat <<SYSTEMD_EOF > /etc/systemd/system/disha.service
[Unit]
Description=DISHA 6.6 Production Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${REPO_ROOT}
ExecStart=/usr/bin/docker compose -f docker-compose.gcp.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.gcp.yml down

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

systemctl daemon-reload
systemctl enable disha.service

echo "Verifying service health..."
healthy=0
for attempt in $(seq 1 30); do
  if curl -fsSL http://127.0.0.1:3000/api/v1/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

docker compose -f docker-compose.gcp.yml ps

if [ "$healthy" -ne 1 ]; then
  echo "ERROR: DISHA web health check did not become ready." >&2
  docker compose -f docker-compose.gcp.yml logs --tail=200 web >&2 || true
  exit 1
fi

echo "SUCCESS: DISHA 6.6 is live at revision ${DEPLOYED_SHA}."
