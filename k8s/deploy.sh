#!/usr/bin/env bash
# ==============================================================================
# DISHA 6.6 - Kubernetes 1-Click Cluster Deployment Script
# Supports DigitalOcean Kubernetes (DOKS), k3s, Minikube, and Cloud K8s
# ==============================================================================

set -euo pipefail

echo "======================================================================"
echo "          DISHA 6.6 PRODUCTION KUBERNETES DEPLOYMENT                  "
echo "======================================================================"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "[ERROR] kubectl is not installed or not in PATH."
    exit 1
fi

echo "[1/8] Applying Namespace..."
kubectl apply -f k8s/00-namespace.yaml

echo "[2/8] Applying ConfigMaps and Secrets..."
kubectl apply -f k8s/01-configmap-secrets.yaml

echo "[3/8] Provisioning Persistent Volume Claims..."
kubectl apply -f k8s/02-storage.yaml

echo "[4/8] Deploying PostgreSQL (StatefulSet with pgvector)..."
kubectl apply -f k8s/03-postgres.yaml

echo "[5/8] Deploying Redis (Pub/Sub & Coordination)..."
kubectl apply -f k8s/04-redis.yaml

echo "[6/8] Deploying Sovereign Local AI Engine (Ollama)..."
kubectl apply -f k8s/05-local-ai.yaml

echo "[7/8] Deploying OpenOSINT & MCP Toolkit..."
kubectl apply -f k8s/06-openosint.yaml
kubectl apply -f k8s/07-mcp-server.yaml

echo "[8/8] Deploying DISHA Web Engine & Ingress..."
kubectl apply -f k8s/08-disha-web.yaml
kubectl apply -f k8s/09-ingress.yaml

echo ""
echo "======================================================================"
echo "Deployment applied successfully. Checking Pod status in 'disha' namespace:"
kubectl get pods -n disha
echo "======================================================================"
echo "To pull sovereign models into the k8s AI pod, run:"
echo "  kubectl exec -it -n disha deployment/disha-local-ai -- ollama pull deepseek-r1:8b"
echo "  kubectl exec -it -n disha deployment/disha-local-ai -- ollama pull qwen2.5-coder:7b"
echo "  kubectl exec -it -n disha deployment/disha-local-ai -- ollama pull dolphin-llama3:8b"
