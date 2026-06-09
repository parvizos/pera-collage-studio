param(
    [string]$DestinationRoot = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataRoot = if ($env:PERA_DATA_DIR) { $env:PERA_DATA_DIR } else { $projectRoot }
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

if (-not $DestinationRoot) {
    $DestinationRoot = Join-Path $projectRoot "backups"
}

$backupDir = Join-Path $DestinationRoot "pera-backup-$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$dbFile = Join-Path $dataRoot "pera.sqlite3"
if (Test-Path $dbFile) {
    Copy-Item $dbFile (Join-Path $backupDir "pera.sqlite3") -Force
}

$historyDir = Join-Path $dataRoot "history"
if (Test-Path $historyDir) {
    Copy-Item $historyDir (Join-Path $backupDir "history") -Recurse -Force
}

$templatesDir = Join-Path $dataRoot "templates"
if (Test-Path $templatesDir) {
    Copy-Item $templatesDir (Join-Path $backupDir "templates") -Recurse -Force
}

Write-Host "Backup completed: $backupDir"