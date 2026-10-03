#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-asia-south1}"
REPO_NAME="disha-containers"
GAR_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "Configuring Google Cloud Artifact Registry..."
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="DISHA 6.6 Docker images" || true

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "Building and pushing Web container..."
docker build -t "${GAR_PREFIX}/web:latest" -f ../../web/Dockerfile ../../web
docker push "${GAR_PREFIX}/web:latest"

echo "Building and pushing Embeddings container..."
docker build -t "${GAR_PREFIX}/embeddings:latest" -f ../../disha/embeddings/Dockerfile ../..
docker push "${GAR_PREFIX}/embeddings:latest"

echo "Building and pushing Brain container..."
docker build -t "${GAR_PREFIX}/brain:latest" -f ../../disha/brain/Dockerfile ../..
docker push "${GAR_PREFIX}/brain:latest"

echo "Deploying Embeddings Service to Cloud Run..."
gcloud run deploy disha-embeddings \
  --image="${GAR_PREFIX}/embeddings:latest" \
  --region="${REGION}" \
  --platform=managed \
  --no-allow-unauthenticated \
  --port=8081 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3

echo "Deploying Brain Service to Cloud Run..."
gcloud run deploy disha-brain \
  --image="${GAR_PREFIX}/brain:latest" \
  --region="${REGION}" \
  --platform=managed \
  --no-allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3

echo "Deploying Web Core to Cloud Run..."
gcloud run deploy disha-web \
  --image="${GAR_PREFIX}/web:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,DISHA_AUTH_MODE=password"

echo "Deployment to Cloud Run completed!"
