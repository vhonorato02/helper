@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
set "REPO_DIR=D:\helper"

echo ============================================================
echo HELPER CODEX - VALIDAR D:\helper
echo ============================================================
echo.

if not exist "%REPO_DIR%\.git" (
  echo ERRO: repositorio nao encontrado em D:\helper
  pause
  exit /b 1
)

pushd "%REPO_DIR%"

for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "REMOTE=%%R"
echo Remote: !REMOTE!
echo !REMOTE! | findstr /I /C:"github.com/vhonorato02/helper" >nul
if errorlevel 1 goto :erro

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
echo Branch: !BRANCH!
if /I not "!BRANCH!"=="main" goto :erro

echo.
echo Estado local:
git status --short

echo.
echo Sincronizacao:
git fetch origin
if errorlevel 1 goto :erro
for /f "delims=" %%H in ('git rev-parse HEAD') do set "LOCAL=%%H"
for /f "delims=" %%H in ('git rev-parse origin/main') do set "REMOTE_HEAD=%%H"
echo Local : !LOCAL!
echo GitHub: !REMOTE_HEAD!
if /I not "!LOCAL!"=="!REMOTE_HEAD!" (
  echo AVISO: o commit local nao e identico a origin/main.
)

git push --dry-run origin main
if errorlevel 1 goto :erro

for %%F in (
  ".codex\CRIAR-AS-4-AUTOMACOES.txt"
  ".codex\CONFIGURAR-CODEX.md"
  ".codex\RESOLVER-PROBLEMAS.md"
  ".codex\automation-prompts\01-feature.md"
  ".codex\automation-prompts\02-review.md"
  ".codex\automation-prompts\03-ui-ux.md"
  ".codex\automation-prompts\04-maintenance.md"
) do (
  if not exist %%F (
    echo ERRO: arquivo ausente %%F
    goto :erro
  )
)

echo.
echo VALIDACAO CONCLUIDA.
echo Projeto unico: D:\helper
echo Arquivos do Codex: D:\helper\.codex
popd
pause
exit /b 0

:erro
popd
echo.
echo A validacao encontrou um problema.
pause
exit /b 1
