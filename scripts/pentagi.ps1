param(
    [ValidateSet('install', 'start', 'stop', 'status', 'verify', 'credentials')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$installRoot = Join-Path $repoRoot 'infra/pentagi'
$envPath = Join-Path $installRoot '.env'
$credentialPath = Join-Path $installRoot 'credentials.local.xml'
$lockPath = Join-Path $installRoot 'upstream.lock.json'
$sourceRoot = Join-Path $repoRoot 'integrations/pentagi/upstream'
$docker = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (-not $docker) { $docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }
$composeArgs = @('compose', '--project-name', 'disha66-pentagi', '--env-file', $envPath, '-f', (Join-Path $installRoot 'compose.yml'))
$baseUrl = 'http://127.0.0.1:8443'

function Invoke-Docker([string[]]$Arguments) {
    & $docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker failed (exit $LASTEXITCODE)" }
}

function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

function Connect-LocalModel {
    $networks = & $docker network ls --format '{{.Name}}'
    if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is unavailable' }
    if ($networks -notcontains 'disha66-pentagi-models') {
        Invoke-Docker @('network', 'create', 'disha66-pentagi-models') | Out-Null
    }
    $modelState = (& $docker inspect disha-local-ai | ConvertFrom-Json)[0]
    if ($LASTEXITCODE -ne 0 -or -not $modelState.State.Running) { throw 'Start DISHA6.6 disha-local-ai before PentAGI' }
    if (-not $modelState.NetworkSettings.Networks.PSObject.Properties['disha66-pentagi-models']) {
        Invoke-Docker @('network', 'connect', '--alias', 'disha-local-ai', 'disha66-pentagi-models', 'disha-local-ai')
    }
}

function Initialize-LocalAccount {
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        try {
            Invoke-RestMethod "$baseUrl/api/v1/info" -TimeoutSec 5 | Out-Null
            $ready = $true
            break
        } catch { Start-Sleep -Seconds 3 }
    }
    if (-not $ready) { throw 'PentAGI startup timed out; check docker compose logs' }

    $credential = Import-Clixml -LiteralPath $credentialPath
    $webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $loginBody = @{ mail = $credential.UserName; password = $credential.GetNetworkCredential().Password } | ConvertTo-Json
    try {
        Invoke-RestMethod "$baseUrl/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody -WebSession $webSession | Out-Null
    } catch {
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 401) { throw }
        # Upstream seeds this account on an empty database; rotate it before use.
        $initialBody = @{ mail = 'admin@pentagi.com'; password = 'admin' } | ConvertTo-Json
        Invoke-RestMethod "$baseUrl/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $initialBody -WebSession $webSession | Out-Null
        $passwordBody = @{
            current_password = 'admin'
            password = $credential.GetNetworkCredential().Password
            confirm_password = $credential.GetNetworkCredential().Password
        } | ConvertTo-Json
        Invoke-RestMethod "$baseUrl/api/v1/user/password" -Method Put -ContentType 'application/json' -Body $passwordBody -WebSession $webSession | Out-Null
    }
    Write-Host 'PentAGI account login verified. Credentials are encrypted for this Windows account.'
}

if ($Action -eq 'credentials') {
    $credential = Import-Clixml -LiteralPath $credentialPath
    Write-Output "URL: $baseUrl"
    Write-Output "Username: $($credential.UserName)"
    Write-Output "Password: $($credential.GetNetworkCredential().Password)"
    return
}

if ($Action -eq 'install') {
    $lock = Get-Content -Raw -LiteralPath $lockPath | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath $sourceRoot)) {
        & git clone --depth 10 $lock.repository $sourceRoot
        if ($LASTEXITCODE -ne 0) { throw 'PentAGI source download failed' }
    }
    $sourceCommit = & git -C $sourceRoot rev-parse HEAD
    if ($sourceCommit -ne $lock.commit) { throw 'Upstream checkout differs from the reviewed lock; review it before updating' }
    $appData = Join-Path $repoRoot 'data/pentagi/app'
    New-Item -ItemType Directory -Force -Path $appData | Out-Null
    if (-not (Test-Path -LiteralPath $envPath)) {
        @(
            "PENTAGI_IMAGE=$($lock.images.pentagi)",
            "PGVECTOR_IMAGE=$($lock.images.pgvector)",
            "SCRAPER_IMAGE=$($lock.images.scraper)",
            "POSTGRES_PASSWORD=$(New-LocalSecret)",
            "COOKIE_SIGNING_SALT=$(New-LocalSecret)",
            "SCRAPER_PASSWORD=$(New-LocalSecret)"
        ) | Set-Content -LiteralPath $envPath -Encoding ascii
    }
    if (-not (Test-Path -LiteralPath $credentialPath)) {
        $securePassword = ConvertTo-SecureString (New-LocalSecret) -AsPlainText -Force
        $credential = New-Object System.Management.Automation.PSCredential('admin@pentagi.com', $securePassword)
        $credential | Export-Clixml -LiteralPath $credentialPath
    }
    Connect-LocalModel
    Invoke-Docker @('exec', 'disha-local-ai', 'ollama', 'pull', 'qwen2.5:3b')
    Invoke-Docker @('exec', 'disha-local-ai', 'ollama', 'pull', 'nomic-embed-text')
    Invoke-Docker ($composeArgs + @('config', '--quiet'))
    Invoke-Docker ($composeArgs + @('pull'))
    Invoke-Docker ($composeArgs + @('up', '-d'))
    Initialize-LocalAccount
} elseif ($Action -eq 'start') {
    Connect-LocalModel
    Invoke-Docker ($composeArgs + @('up', '-d'))
} elseif ($Action -eq 'stop') {
    Invoke-Docker ($composeArgs + @('stop'))
} elseif ($Action -eq 'verify') {
    Initialize-LocalAccount
    Invoke-Docker ($composeArgs + @('ps'))
    Invoke-RestMethod "$baseUrl/api/v1/info" -TimeoutSec 5 | ConvertTo-Json -Depth 5
} else {
    Invoke-Docker ($composeArgs + @('ps'))
}
