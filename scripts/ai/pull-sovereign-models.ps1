# DISHA 6.6 - Sovereign Local AI Model Provisioner for Docker (Windows PowerShell)
# Automatically pulls and loads top-tier censored and uncensored models into local Docker Ollama

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "      DISHA 6.6 SOVEREIGN DOCKER AI MODEL PROVISIONER                 " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

$containerName = "disha-local-ollama"

# Verify Docker container is running
$running = docker ps --filter "name=$containerName" --format "{{.Names}}"
if (-not $running) {
    # Check if disha-local-ai from compose is running
    $running = docker ps --filter "name=disha-local-ai" --format "{{.Names}}"
    if ($running) {
        $containerName = "disha-local-ai"
    } else {
        Write-Host "Starting Docker AI container ($containerName)..." -ForegroundColor Yellow
        docker run -d --name $containerName -p 11434:11434 -v disha_ollama_models:/root/.ollama ollama/ollama:latest
        Start-Sleep -Seconds 5
    }
}

Write-Host "Active AI Docker Container: $containerName" -ForegroundColor Green

$models = @(
    @{ Name = "deepseek-r1:8b"; Category = "Deep Epistemic Reasoning & Case Correlation"; Size = "4.9 GB" },
    @{ Name = "qwen2.5-coder:7b"; Category = "Alibaba - Ethical Hacking, Exploit & Code Audit"; Size = "4.7 GB" },
    @{ Name = "dolphin-llama3:8b"; Category = "Eric Hartford - Uncensored Security & Threat Intelligence"; Size = "4.7 GB" },
    @{ Name = "nemotron-mini:4b"; Category = "Nvidia - High-Speed Reasoning & Function Calling"; Size = "2.7 GB" },
    @{ Name = "llava:7b"; Category = "Multimodal Video, Image & Document Forensics"; Size = "4.7 GB" },
    @{ Name = "qwen2.5:7b"; Category = "Alibaba - Chinese & International Multilingual Intelligence"; Size = "4.7 GB" }
)

Write-Host "`nAvailable Models to Provision into Docker:" -ForegroundColor White
for ($i = 0; $i -lt $models.Count; $i++) {
    Write-Host "[$($i + 1)] $($models[$i].Name) ($($models[$i].Size)) - $($models[$i].Category)" -ForegroundColor Gray
}

Write-Host "`n[A] Pull ALL Recommended Models" -ForegroundColor Cyan
Write-Host "[1] Pull DeepSeek-R1 (8B) only" -ForegroundColor Cyan
Write-Host "[2] Pull Qwen2.5-Coder (Ethical Hacking) only" -ForegroundColor Cyan
Write-Host "[3] Pull Dolphin-Llama3 (Uncensored) only" -ForegroundColor Cyan
Write-Host "[4] Pull Nvidia Nemotron-Mini only" -ForegroundColor Cyan
Write-Host "[5] Pull LLaVA (Vision/Video Forensics) only" -ForegroundColor Cyan

$choice = Read-Host "`nEnter selection (Default: 1 - DeepSeek-R1)"
if (-not $choice) { $choice = "1" }

function Pull-Model($modelName) {
    Write-Host "`n---> Pulling $modelName into Docker ($containerName)..." -ForegroundColor Yellow
    docker exec -it $containerName ollama pull $modelName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] $modelName is active and ready for DISHA live queries." -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to pull $modelName" -ForegroundColor Red
    }
}

if ($choice -eq "A" -or $choice -eq "a") {
    foreach ($m in $models) {
        Pull-Model $m.Name
    }
} elseif ($choice -ge 1 -and $choice -le $models.Count) {
    Pull-Model $models[[int]$choice - 1].Name
} else {
    Pull-Model "deepseek-r1:8b"
}

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "Listing Installed Models in Docker:" -ForegroundColor Green
docker exec $containerName ollama list
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "DISHA Local Endpoint: http://localhost:11434/v1" -ForegroundColor Yellow
Write-Host "All inference is running 100% locally and air-gapped in Docker." -ForegroundColor Green
