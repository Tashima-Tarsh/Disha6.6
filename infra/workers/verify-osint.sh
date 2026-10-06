#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-fast}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[DISHA] OSINT verification mode: $MODE"

echo "[1/4] Worker source syntax"
node --check web/scripts/astra6-worker.mjs
python3 -m py_compile web/scripts/identity-osint-adapter.py web/scripts/recon-ng-adapter.py

echo "[2/4] Focused OSINT tests"
cd web
if [[ ! -d node_modules ]]; then
  npm ci
fi
npx vitest run \
  tests/astra6-tool-integration.test.ts \
  tests/ephemeral-investigation.test.ts \
  tests/server-security.test.ts
npm run type-check
cd "$ROOT_DIR"

if [[ "$MODE" != "full" && "$MODE" != "--full" ]]; then
  echo "[PASS] Fast OSINT verification completed."
  echo "Run: bash infra/workers/verify-osint.sh full"
  echo "for production Docker/runtime validation."
  exit 0
fi

command -v docker >/dev/null 2>&1 || {
  echo "[FAIL] Docker is required for full verification." >&2
  exit 1
}

echo "[3/4] Production compose validation"
POSTGRES_PASSWORD="verify-only-password" \
DISHA_BRAIN_API_TOKEN="verify-only-brain-token" \
DISHA_ALLOWED_ORIGINS="https://example.invalid" \
DISHA_JWT_SECRET="verify-only-jwt-secret-at-least-32-bytes-long" \
DISHA_PRODUCTION_URL="https://example.invalid" \
DISHA_RESEARCH_RUNTIME_TOKEN="verify-only-research-token" \
DISHA_WORKER_TOKEN="verify-only-worker-token-at-least-24-bytes" \
docker compose -f docker-compose.prod.yml config -q

echo "[4/4] Build and smoke production OSINT workers"
docker build -f infra/workers/Dockerfile.identity -t disha-identity-worker:verify .
docker run --rm --entrypoint node disha-identity-worker:verify --check /opt/disha-worker/scripts/astra6-worker.mjs
docker run --rm --entrypoint python3 disha-identity-worker:verify -m py_compile /opt/disha-worker/scripts/identity-osint-adapter.py
docker run --rm --entrypoint /opt/venvs/sherlock/bin/python disha-identity-worker:verify -c 'from sherlock_project.notify import QueryNotify; from sherlock_project.result import QueryStatus; from sherlock_project.sherlock import sherlock; from sherlock_project.sites import SitesInformation'
docker run --rm --entrypoint /opt/venvs/maigret/bin/python disha-identity-worker:verify -c 'import maigret; assert hasattr(maigret, "search"); assert hasattr(maigret, "MaigretDatabase")'
docker run --rm --entrypoint /opt/venvs/holehe/bin/python disha-identity-worker:verify -c 'from holehe.core import get_functions, import_submodules, launch_module'
docker run --rm --entrypoint /opt/venvs/instaloader/bin/python disha-identity-worker:verify -c 'import instaloader; assert hasattr(instaloader, "Profile")'
docker run --rm --entrypoint /opt/venvs/telethon/bin/python disha-identity-worker:verify -c 'from telethon import TelegramClient; from telethon.sessions import StringSession'
docker run --rm --entrypoint sh disha-identity-worker:verify -c 'command -v phoneinfoga >/dev/null'

docker build -f infra/workers/Dockerfile.infrastructure -t disha-infrastructure-worker:verify .
docker run --rm --entrypoint node disha-infrastructure-worker:verify --check /opt/disha-worker/scripts/astra6-worker.mjs
docker run --rm --entrypoint sh disha-infrastructure-worker:verify -c 'command -v subfinder >/dev/null && command -v amass >/dev/null && command -v theHarvester >/dev/null'

docker build -f infra/workers/Dockerfile.research-osint -t disha-research-osint-worker:verify .
docker run --rm --entrypoint node disha-research-osint-worker:verify --check /opt/disha-worker/scripts/astra6-worker.mjs
docker run --rm --entrypoint /opt/venvs/recon/bin/python disha-research-osint-worker:verify -m py_compile /opt/disha-worker/scripts/recon-ng-adapter.py
docker run --rm --entrypoint /opt/venvs/spiderfoot/bin/python disha-research-osint-worker:verify /opt/osint/spiderfoot/sf.py -h >/dev/null
docker run --rm --entrypoint /opt/venvs/photon/bin/python disha-research-osint-worker:verify /opt/osint/photon/photon.py -h >/dev/null

echo "[PASS] Full OSINT verification completed."
