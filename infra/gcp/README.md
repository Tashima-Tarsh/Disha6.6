# DISHA 6.6 Enterprise Google Cloud Platform (GCP) Infrastructure

This directory contains the production-grade deployment automation, container manifests, and infrastructure configuration for hosting DISHA 6.6 entirely on **Google Cloud Platform (GCP)**.

## Architecture

- **GCP Project**: `avian-branch-499413-p7` (Project # `934670221919`)
- **Compute**: Google Compute Engine (GCE) `e2-standard-4` in `asia-south1-a` (Mumbai)
- **Networking**: GCP VPC with Cloud Firewall (ports 80, 443, 22)
- **Container Stack**:
  1. `caddy`: High-performance HTTP/2 & HTTP/3 reverse proxy with automated Let's Encrypt TLS.
  2. `web`: Next.js 16 standalone production engine with zero-mock policy gate and strict RBAC.
  3. `postgres`: PostgreSQL 16 + PostGIS + pgvector (sovereign geospatial & vector intelligence).
  4. `redis`: Redis 7 in-memory cache and session broker.
  5. `embeddings`: Python FastAPI sovereign embedding microservice (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`).
  6. `disha-brain`: Python FastAPI Cognitive Kernel for graph orchestration & intelligence depth.
  7. `dynamic-worker`: Autonomous background worker for telemetry ingestion and mission workflows.

## Scripts & Configurations

| File | Purpose |
| :--- | :--- |
| `setup-gce.sh` | Provisions the GCE VM, static external IP, firewall rules, and startup script via `gcloud compute`. |
| `deploy-remote.sh` | Orchestrates the remote environment on `/opt/disha`, builds all microservices, initializes databases, and applies migrations. |
| `gce-startup-script.sh` | VM initialization script that configures Docker, systemd, and runtime directories. |
| `cloud-run-deploy.sh` | Serverless deployment alternative targeting Google Cloud Run. |

## Quick Deployment

```bash
# Set project and region
gcloud config set project avian-branch-499413-p7
gcloud config set compute/zone asia-south1-a

# Provision VM & firewall rules
bash infra/gcp/setup-gce.sh

# Deploy services and seed production data
bash infra/gcp/deploy-remote.sh
```
