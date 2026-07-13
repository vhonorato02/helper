@echo off
setlocal EnableExtensions
chcp 65001 >nul

echo ============================================================
echo HELPER CODEX PLUS AUTOPILOT - INSTALAR FERRAMENTAS
echo ============================================================
echo.

where winget >nul 2>nul
if errorlevel 1 (
  echo ERRO: winget nao foi encontrado.
  echo Atualize ou instale o App Installer pela Microsoft Store.
  pause
  exit /b 1
)

echo [1/4] Instalando ou atualizando Git...
winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements

echo [2/4] Instalando ou atualizando GitHub CLI...
winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements

echo [3/4] Instalando ou atualizando Node.js LTS...
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements

echo [4/4] Instalando ou atualizando Codex App pela Microsoft Store...
winget install Codex -s msstore --accept-package-agreements --accept-source-agreements

echo.
echo Ferramentas solicitadas ao winget.
echo Feche esta janela, abra um novo Prompt de Comando e execute:
echo scripts\02-PREPARAR-REPOSITORIO.cmd
echo.
pause
