@echo off
cd /d "%~dp0"
title Pera Collage — остановка сервера

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = if ($env:PORT) { [int]$env:PORT } else { 8080 }; " ^
  "$n = 0; Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { " ^
  "  $proc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.OwningProcess) -EA 0; " ^
  "  if ($proc.CommandLine -match 'server\.py') { Stop-Process -Id $_.OwningProcess -Force -EA 0; $n++ } " ^
  "}; if ($n) { Write-Host ('Остановлено процессов: ' + $n) -ForegroundColor Green } else { Write-Host ('Сервер на порту ' + $p + ' не найден') -ForegroundColor Yellow }"

echo.
pause