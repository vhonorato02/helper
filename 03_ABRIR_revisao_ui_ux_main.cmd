@echo off
setlocal
title Helper Codex - Revisao UI UX
cd /d "%~dp0"

echo.
echo Iniciando rotina: Revisao UI UX
echo Script: 03_revisao_ui_ux_main.ps1
echo.
echo Se o Windows perguntar, permita a execucao.
echo.

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp003_revisao_ui_ux_main.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp003_revisao_ui_ux_main.ps1"
)

echo.
echo Rotina finalizada ou interrompida.
pause
