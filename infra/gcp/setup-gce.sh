#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "DISHA 6.6 — Google Cloud (GCE) Bootstrap"
echo "=========================================="

# 1. Update OS and install Docker & Docker Compose
echo "[1/5] Installing Docker engine..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group
sudo usermod -aG docker "$USER" || true

# 2. Check environment file
echo "[2/5] Verifying environment configuration..."
if [ ! -f .env ]; then
  echo "Error: .env file not found in current directory!"
  echo "Please copy .env.gcp.template to .env and set your production secrets."
  exit 1
fi

# 3. Build containers
echo "[3/5] Building DISHA production containers..."
docker compose -f ../aws/docker-compose.aws.yml build

# 4. Launch database migration and services
echo "[4/5] Launching database and services..."
docker compose -f ../aws/docker-compose.aws.yml up -d postgres redis
echo "Waiting for PostgreSQL to be healthy..."
docker compose -f ../aws/docker-compose.aws.yml exec postgres pg_isready -U disha -d disha -t 30

echo "Running database schema migrations (apply-schema.mjs)..."
docker compose -f ../aws/docker-compose.aws.yml up web-migrate

echo "Starting full application stack..."
docker compose -f ../aws/docker-compose.aws.yml up -d

# 5. Health check
echo "[5/5] Performing health checks..."
sleep 10
docker compose -f ../aws/docker-compose.aws.yml ps
curl -fsSL http://127.0.0.1:3000/api/v1/health || echo "Service starting up, will be available shortly..."

echo "=========================================="
echo "DISHA 6.6 is successfully deployed on GCP!"
echo "=========================================="
