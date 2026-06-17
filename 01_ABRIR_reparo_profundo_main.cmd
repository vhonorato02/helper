@echo off
setlocal
title Helper Codex - Reparo profundo
cd /d "%~dp0"

echo.
echo Iniciando rotina: Reparo profundo
echo Script: 01_reparo_profundo_main.ps1
echo.
echo Se o Windows perguntar, permita a execucao.
echo.

where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp001_reparo_profundo_main.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp001_reparo_profundo_main.ps1"
)

echo.
echo Rotina finalizada ou interrompida.
pause
