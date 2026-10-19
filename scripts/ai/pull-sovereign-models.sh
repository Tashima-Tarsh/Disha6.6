#!/usr/bin/env bash
# ==============================================================================
# DISHA 6.6 - Sovereign Local AI Model Provisioner for Docker (Linux & DigitalOcean)
# Automatically pulls and loads top-tier censored & uncensored models into Docker Ollama
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="disha-local-ai"

echo "======================================================================"
echo "      DISHA 6.6 SOVEREIGN DOCKER AI MODEL PROVISIONER (LINUX)         "
echo "======================================================================"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -Eq "^(${CONTAINER_NAME}|disha-local-ollama)$"; then
    echo "[!] AI container not running. Starting disha-local-ai in Docker..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p 127.0.0.1:11434:11434 \
        -v disha_ollama_models:/root/.ollama \
        --restart unless-stopped \
        ollama/ollama:latest
    echo "[+] Waiting for Ollama daemon to initialize..."
    sleep 6
else
    # Find matching name
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep -E "^(disha-local-ai|disha-local-ollama)$" | head -n1)
    echo "[+] Found active AI container: $CONTAINER_NAME"
fi

MODELS=(
    "deepseek-r1:8b|DeepSeek-R1 (8B) - Deep Epistemic Reasoning & Court Evidence Correlation|4.9 GB"
    "qwen2.5-coder:7b|Alibaba Qwen2.5-Coder (7B) - Ethical Hacking, Reverse Engineering & Vulnerability Audit|4.7 GB"
    "dolphin-llama3:8b|Cognitive Computations Dolphin-Llama3 (8B) - Uncensored Threat Intel & Payload Analysis|4.7 GB"
    "nemotron-mini:4b|Nvidia Nemotron-Mini (4B) - Ultra-Fast Agentic Function Execution|2.7 GB"
    "llava:7b|LLaVA (7B) - Multimodal Video Frame, Image & Document Tampering Forensics|4.7 GB"
    "qwen2.5:7b|Alibaba Qwen2.5 (7B) - Chinese & International Multilingual Reasoning (Kimi-class)|4.7 GB"
)

echo ""
echo "Select models to provision into Docker:"
echo "[1] Pull DeepSeek-R1 (8B) [Epistemic Reasoning]"
echo "[2] Pull Qwen2.5-Coder (7B) [Ethical Hacking & Code Audit]"
echo "[3] Pull Dolphin-Llama3 (8B) [Uncensored Offensive Cyber]"
echo "[4] Pull Nvidia Nemotron-Mini (4B) [Fast Agentic]"
echo "[5] Pull LLaVA (7B) [Video & Image Forensics]"
echo "[6] Pull Qwen2.5 (7B) [Chinese Multilingual Kimi-Class]"
echo "[A] Pull ALL Recommended Sovereign Models"
echo ""

read -rp "Enter choice [Default: 1]: " CHOICE
CHOICE=${CHOICE:-1}

pull_model() {
    local MODEL_TAG="$1"
    echo ""
    echo "---> [Docker Pull] Ingesting $MODEL_TAG into $CONTAINER_NAME..."
    docker exec -it "$CONTAINER_NAME" ollama pull "$MODEL_TAG"
    echo "[SUCCESS] $MODEL_TAG loaded into local sovereign ledger."
}

case "$CHOICE" in
    1)
        pull_model "deepseek-r1:8b"
        ;;
    2)
        pull_model "qwen2.5-coder:7b"
        ;;
    3)
        pull_model "dolphin-llama3:8b"
        ;;
    4)
        pull_model "nemotron-mini:4b"
        ;;
    5)
        pull_model "llava:7b"
        ;;
    6)
        pull_model "qwen2.5:7b"
        ;;
    [Aa])
        for entry in "${MODELS[@]}"; do
            tag="${entry%%|*}"
            pull_model "$tag"
        done
        ;;
    *)
        echo "[*] Defaulting to DeepSeek-R1 (8b)..."
        pull_model "deepseek-r1:8b"
        ;;
esac

echo ""
echo "======================================================================"
echo "Active Sovereign Models in Docker:"
docker exec "$CONTAINER_NAME" ollama list
echo "======================================================================"
echo "Local Sovereign REST Endpoint: http://127.0.0.1:11434/v1"
echo "All inferences run 100% locally and air-gapped under DISHA Governance."
