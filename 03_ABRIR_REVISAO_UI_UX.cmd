@echo off
setlocal
title Helper Codex - uiux
cd /d "%~dp0"
echo.
echo Iniciando Helper Codex: uiux
echo.
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-helper-codex.ps1" -Routine uiux
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0run-helper-codex.ps1" -Routine uiux
)
pause
