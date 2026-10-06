#!/usr/bin/env bash
set -euo pipefail
exec > >(tee -a /var/log/disha-startup.log) 2>&1

echo "=========================================================="
echo "DISHA 6.6 — Google Compute Engine Automated Initialization"
echo "Date: $(date -u)"
echo "=========================================================="

# 1. System packages & Docker installation
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# 2. Get Public IP
EXTERNAL_IP=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip || echo "localhost")
echo "Instance External IP: ${EXTERNAL_IP}"

# 3. Clone Repository
mkdir -p /opt
cd /opt
if [ ! -d "/opt/disha" ]; then
  git clone https://github.com/Tashima-Tarsh/Disha6.6.git /opt/disha
fi
cd /opt/disha

DEPLOYED_SHA=$(git rev-parse HEAD)
echo "Checked-out DISHA revision: ${DEPLOYED_SHA}"
printf "%s\n" "$DEPLOYED_SHA" > /opt/disha/DEPLOYED_COMMIT

# 4. Generate Production Secrets
POSTGRES_PWD=$(openssl rand -hex 16)
REDIS_PWD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 24)
WORKER_TOKEN=$(openssl rand -hex 16)
BRAIN_TOKEN=$(openssl rand -hex 16)
ADMIN_PWD=$(openssl rand -hex 10)

cat <<EOF > /opt/disha/.env
# DISHA 6.6 Production Environment
NODE_ENV=production
DOMAIN=${EXTERNAL_IP}
NEXT_PUBLIC_APP_URL=http://${EXTERNAL_IP}
DISHA_ALLOWED_ORIGINS=http://${EXTERNAL_IP},http://localhost:3000

# Database
POSTGRES_DB=disha
POSTGRES_USER=disha
POSTGRES_PASSWORD=${POSTGRES_PWD}

# Redis
REDIS_PASSWORD=${REDIS_PWD}

# Authentication
DISHA_AUTH_MODE=password
DISHA_DEV_PASSWORD=${ADMIN_PWD}
DISHA_DEV_ADMIN_EMAILS=admin@thenitishkr.in
DISHA_JWT_SECRET=${JWT_SECRET}

# Internal Service Tokens
DISHA_WORKER_TOKEN=${WORKER_TOKEN}
DISHA_BRAIN_API_TOKEN=${BRAIN_TOKEN}
DISHA_RESEARCH_RUNTIME_TOKEN=${BRAIN_TOKEN}

# Embeddings Engine
DISHA_EMBEDDING_PROVIDER=openai-compatible
DISHA_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# Scheduler & Workers
DISHA_SCHEDULER_POLL_SECONDS=30
DISHA_SCHEDULER_MAX_JOBS=10
DISHA_WORKFLOW_MAX_JOBS=10
DISHA_WORKFLOW_LEASE_SECONDS=120
EOF

# Save generated credentials safely for the admin
cat <<EOF > /opt/disha/CREDENTIALS.txt
=====================================================
DISHA 6.6 Production Credentials
Generated: $(date -u)
Revision: ${DEPLOYED_SHA}
Access URL: http://${EXTERNAL_IP}
Admin Username/Email: admin@thenitishkr.in
Admin Password: ${ADMIN_PWD}
JWT Secret: ${JWT_SECRET}
Database: postgresql://disha:${POSTGRES_PWD}@localhost:5432/disha
Redis: localhost:6379 (Password: ${REDIS_PWD})
Worker Token: ${WORKER_TOKEN}
Brain Token: ${BRAIN_TOKEN}
=====================================================
EOF
chmod 600 /opt/disha/CREDENTIALS.txt

# 5. Build and deploy the canonical GCP stack
bash /opt/disha/infra/gcp/deploy-remote.sh

echo "=========================================================="
echo "DISHA 6.6 initialization complete!"
echo "Revision: ${DEPLOYED_SHA}"
echo "Server is live at http://${EXTERNAL_IP}"
echo "=========================================================="
