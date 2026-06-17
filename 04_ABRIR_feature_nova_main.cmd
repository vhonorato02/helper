@echo off
setlocal
title Helper Codex - Feature nova
cd /d "%~dp0"

echo.
echo Iniciando rotina: Feature nova
echo Script: 04_feature_nova_main.ps1
echo.
echo Se o Windows perguntar, permita a execucao.
echo.

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp004_feature_nova_main.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp004_feature_nova_main.ps1"
)

echo.
echo Rotina finalizada ou interrompida.
pause
