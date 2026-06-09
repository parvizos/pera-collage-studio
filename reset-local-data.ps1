# Сброс локальных данных Pera Collage Studio (история, шаблоны, SQLite).
# Код приложения не трогает. После запуска откройте http://localhost:8080 — подтянутся дефолты из app.js.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Get-CimInstance Win32_Process -Filter "name='python.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*$root*server.py*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

foreach ($dir in @("history", "templates", "data", "__pycache__")) {
  if (Test-Path $dir) {
    Remove-Item $dir -Recurse -Force
  }
}

foreach ($file in @("pera.sqlite3", "users.json")) {
  if (Test-Path $file) {
    Remove-Item $file -Force
  }
}

Write-Host "Локальные данные удалены. Запуск: powershell -ExecutionPolicy Bypass -File .\serve.ps1"