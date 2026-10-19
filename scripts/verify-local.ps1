param(
  [switch]$Full
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$dockerPaths = @(
  "D:\OSINT-UPSTREAM\containers\DockerDesktop\resources\bin",
  "D:\OSINT-UPSTREAM\containers\DockerDesktop\resources\cli-plugins",
  "C:\Program Files\Docker\cli-plugins"
)

foreach ($path in $dockerPaths) {
  if (Test-Path $path) {
    $env:PATH = "$path;$env:PATH"
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker executable is not available in PATH."
}

Write-Host "Docker:"
docker --version
docker compose version

Write-Host "`nCompose services:"
docker compose ps

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 -Uri $Url
    Write-Host "$Name OK $($response.StatusCode) $Url"
  } catch {
    Write-Host "$Name NOT READY $Url"
    Write-Host $_.Exception.Message
  }
}

Test-Endpoint -Name "Dashboard" -Url "http://127.0.0.1:3000/api/v1/health"

if ($Full) {
  Test-Endpoint -Name "Brain API" -Url "http://127.0.0.1:8000/api/v1/health"
}

Write-Host "`nOSINT local smoke checks:"
npm run osint:smoke -- exiftool
npm run osint:smoke -- detect-secrets
