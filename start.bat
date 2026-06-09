@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Pera Collage Studio
echo.
echo  Pera Collage Studio
echo  ===================
echo  Не закрывайте это окно, пока работаете с сайтом.
echo  Откройте в браузере: http://localhost:8080
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
exit /b %ERRORLEVEL%