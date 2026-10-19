# DISHA 6.6 - Kubernetes 1-Click Cluster Deployment Script (PowerShell)
# Supports Docker Desktop Kubernetes, Minikube, and Remote Cloud K8s

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          DISHA 6.6 PRODUCTION KUBERNETES DEPLOYMENT                  " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] kubectl is not found. Please install kubectl or enable Kubernetes in Docker Desktop." -ForegroundColor Red
    exit 1
}

$manifests = @(
    "k8s/00-namespace.yaml",
    "k8s/01-configmap-secrets.yaml",
    "k8s/02-storage.yaml",
    "k8s/03-postgres.yaml",
    "k8s/04-redis.yaml",
    "k8s/05-local-ai.yaml",
    "k8s/06-openosint.yaml",
    "k8s/07-mcp-server.yaml",
    "k8s/08-disha-web.yaml",
    "k8s/09-ingress.yaml"
)

foreach ($manifest in $manifests) {
    Write-Host "---> Applying $manifest..." -ForegroundColor Yellow
    kubectl apply -f $manifest
}

Write-Host "`nChecking Pod status in 'disha' namespace:" -ForegroundColor Green
kubectl get pods -n disha
