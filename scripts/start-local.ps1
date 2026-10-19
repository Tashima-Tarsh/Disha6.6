param(
  [switch]$Full,
  [switch]$Rebuild
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

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker was not found. Start Docker Desktop from D:\OSINT-UPSTREAM\containers\DockerDesktop or reinstall it there."
}

function Read-LocalEnv {
  param([string]$Path)
  $values = @{}
  if (Test-Path $Path) {
    foreach ($line in Get-Content $Path) {
      if ($line -match '^\s*#' -or $line -notmatch '=') {
        continue
      }
      $key, $value = $line -split '=', 2
      $values[$key.Trim()] = $value.Trim()
    }
  }
  return $values
}

function Set-LocalEnvValue {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )
  $line = "$Key=$Value"
  if (-not (Test-Path $Path)) {
    $line | Set-Content -Encoding ASCII $Path
    return
  }
  $lines = @(Get-Content $Path)
  $updated = $false
  $next = foreach ($existing in $lines) {
    if ($existing -match "^\s*$([regex]::Escape($Key))=") {
      $updated = $true
      $line
    } else {
      $existing
    }
  }
  if (-not $updated) {
    $next += $line
  }
  $next | Set-Content -Encoding ASCII $Path
}

$envPath = Join-Path $repoRoot ".env"
if (-not (Test-Path $envPath)) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $jwtBytes = New-Object byte[] 32
  $passwordBytes = New-Object byte[] 18
  $workerBytes = New-Object byte[] 32
  $rng.GetBytes($jwtBytes)
  $rng.GetBytes($passwordBytes)
  $rng.GetBytes($workerBytes)
  $jwtSecret = (($jwtBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  $devPassword = (($passwordBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  $workerToken = (($workerBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  @(
    "POSTGRES_PASSWORD=$jwtSecret"
    "DISHA_JWT_SECRET=$jwtSecret"
    "DISHA_WORKER_TOKEN=$workerToken"
    "DISHA_USER_EMAIL=admin@local.disha"
    "DISHA_USER_PASSWORD=$devPassword"
    "DISHA_USER_ROLES=admin,analyst"
    "DISHA_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000"
    "NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000"
    "NEXT_PUBLIC_API_URL=http://127.0.0.1:3000"
  ) | Set-Content -Encoding ASCII $envPath
  Write-Host "Created local .env. Local admin email: admin@local.disha"
  Write-Host "Created local .env. Local admin password: $devPassword"
}

$localEnv = Read-LocalEnv -Path $envPath
if (-not $localEnv.ContainsKey("DISHA_USER_EMAIL")) {
  Set-LocalEnvValue -Path $envPath -Key "DISHA_USER_EMAIL" -Value "admin@local.disha"
}
if (-not $localEnv.ContainsKey("DISHA_USER_PASSWORD")) {
  $fallbackPassword = $localEnv["DISHA_DEV_PASSWORD"]
  if (-not $fallbackPassword) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $passwordBytes = New-Object byte[] 18
    $rng.GetBytes($passwordBytes)
    $fallbackPassword = (($passwordBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  }
  Set-LocalEnvValue -Path $envPath -Key "DISHA_USER_PASSWORD" -Value $fallbackPassword
}
if (-not $localEnv.ContainsKey("DISHA_USER_ROLES")) {
  Set-LocalEnvValue -Path $envPath -Key "DISHA_USER_ROLES" -Value "admin,analyst"
}
if (-not $localEnv.ContainsKey("DISHA_WORKER_TOKEN")) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $workerBytes = New-Object byte[] 32
  $rng.GetBytes($workerBytes)
  $workerToken = (($workerBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  Set-LocalEnvValue -Path $envPath -Key "DISHA_WORKER_TOKEN" -Value $workerToken
}
if (-not $localEnv.ContainsKey("DISHA_ALLOWED_ORIGINS")) {
  Set-LocalEnvValue -Path $envPath -Key "DISHA_ALLOWED_ORIGINS" -Value "http://127.0.0.1:3000,http://localhost:3000"
}
if (-not $localEnv.ContainsKey("NEXT_PUBLIC_API_URL")) {
  Set-LocalEnvValue -Path $envPath -Key "NEXT_PUBLIC_API_URL" -Value "http://127.0.0.1:3000"
}
if (-not $localEnv.ContainsKey("NEXT_PUBLIC_APP_URL")) {
  Set-LocalEnvValue -Path $envPath -Key "NEXT_PUBLIC_APP_URL" -Value "http://127.0.0.1:3000"
}

$localEnv = Read-LocalEnv -Path $envPath

$composeArgs = @("compose")
if ($Full) {
  $composeArgs += @("--profile", "full")
}
$composeArgs += @("up", "-d")
if ($Rebuild) {
  $composeArgs += "--build"
}

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$seedArgs = @(
  "compose",
  "run",
  "--rm",
  "-e", "DISHA_USER_EMAIL=$($localEnv["DISHA_USER_EMAIL"])",
  "-e", "DISHA_USER_PASSWORD=$($localEnv["DISHA_USER_PASSWORD"])",
  "-e", "DISHA_USER_ROLES=$($localEnv["DISHA_USER_ROLES"])",
  "web",
  "node",
  "scripts/set-user-password.mjs"
)
& docker @seedArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
Write-Host "Seeded local admin email: $($localEnv["DISHA_USER_EMAIL"])"
Write-Host "Local admin password: $($localEnv["DISHA_USER_PASSWORD"])"

$verifyArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $PSScriptRoot "verify-local.ps1")
)
if ($Full) {
  $verifyArgs += "-Full"
}
& powershell @verifyArgs
