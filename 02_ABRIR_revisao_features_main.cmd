@echo off
setlocal
title Helper Codex - Revisao de features
cd /d "%~dp0"

echo.
echo Iniciando rotina: Revisao de features
echo Script: 02_revisao_features_main.ps1
echo.
echo Se o Windows perguntar, permita a execucao.
echo.

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp002_revisao_features_main.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp002_revisao_features_main.ps1"
)

echo.
echo Rotina finalizada ou interrompida.
pause
