#!/usr/bin/env bash
set -euo pipefail
cd /opt/disha

echo "[1/6] Preparing docker-compose.gcp.yml..."
cat <<'COMPOSE_EOF' > /opt/disha/docker-compose.gcp.yml
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
    build:
      context: ./web
      dockerfile: Dockerfile
    command: ["node", "scripts/apply-schema.mjs"]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
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
    build:
      context: ./web
      dockerfile: Dockerfile
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

  osint-worker:
    build:
      context: .
      dockerfile: infra/workers/Dockerfile.osint-worker
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-disha}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-disha}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      DISHA_WORKER_ID: gcp-astra6-worker-1
      DISHA_OSINT_POLL_MS: 3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
  embedding_models:
  disha_brain_data:
  caddy_data:
  caddy_config:
COMPOSE_EOF

echo "[2/6] Preparing Caddyfile..."
cat <<'CADDY_EOF' > /opt/disha/Caddyfile
:80 {
    reverse_proxy web:3000 {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
CADDY_EOF

echo "[3/6] Building production Docker images..."
docker compose -f docker-compose.gcp.yml build

echo "[4/6] Launching PostgreSQL and Redis..."
docker compose -f docker-compose.gcp.yml up -d postgres redis

echo "Waiting for PostgreSQL pgvector/postgis to be healthy..."
until docker compose -f docker-compose.gcp.yml exec -T postgres pg_isready -U disha -d disha; do
  sleep 3
done

echo "[5/6] Applying database schema migrations..."
docker compose -f docker-compose.gcp.yml up web-migrate

echo "[6/6] Launching full DISHA 6.6 production stack..."
docker compose -f docker-compose.gcp.yml up -d

echo "Configuring systemd service for persistence across reboots..."
cat <<'SYSTEMD_EOF' > /etc/systemd/system/disha.service
[Unit]
Description=DISHA 6.6 Production Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/disha
ExecStart=/usr/bin/docker compose -f docker-compose.gcp.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.gcp.yml down

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

systemctl daemon-reload
systemctl enable disha.service

echo "Verifying service health..."
sleep 15
curl -fsSL http://127.0.0.1:3000/api/v1/health || true
docker compose -f docker-compose.gcp.yml ps
echo "SUCCESS: DISHA 6.6 is live!"
