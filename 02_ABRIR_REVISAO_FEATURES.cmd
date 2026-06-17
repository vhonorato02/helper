@echo off
setlocal
title Helper Codex - features
cd /d "%~dp0"
echo.
echo Iniciando Helper Codex: features
echo.
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-helper-codex.ps1" -Routine features
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-helper-codex.ps1" -Routine features
)
pause
