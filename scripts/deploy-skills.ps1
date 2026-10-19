$src = "D:\Disha6.6\integrations\claude-skills\.gemini\skills"
$wsDst = "D:\Disha6.6\.agents\skills"
$globalDst = "C:\Users\lenovo\.gemini\antigravity\skills"

if (-not (Test-Path $wsDst)) {
    New-Item -ItemType Directory -Force -Path $wsDst | Out-Null
}
if (-not (Test-Path $globalDst)) {
    New-Item -ItemType Directory -Force -Path $globalDst | Out-Null
}

Write-Host "Copying skills to workspace: $wsDst ..."
Copy-Item -Path "$src\*" -Destination $wsDst -Recurse -Force

Write-Host "Copying skills to global: $globalDst ..."
Copy-Item -Path "$src\*" -Destination $globalDst -Recurse -Force

$wsCount = (Get-ChildItem $wsDst).Count
$globalCount = (Get-ChildItem $globalDst).Count
Write-Host "Workspace skills count: $wsCount"
Write-Host "Global skills count: $globalCount"
