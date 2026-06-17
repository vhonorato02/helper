@echo off
setlocal
title Helper Codex - feature
cd /d "%~dp0"
echo.
echo Iniciando Helper Codex: feature
echo.
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-helper-codex.ps1" -Routine feature
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-helper-codex.ps1" -Routine feature
)
pause
