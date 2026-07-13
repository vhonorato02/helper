@echo off
set "REPO_DIR=%USERPROFILE%\Codex\helper-autopilot"
if not exist "%REPO_DIR%" (
  echo Repositorio nao encontrado: %REPO_DIR%
  pause
  exit /b 1
)
start "" explorer "%REPO_DIR%"
