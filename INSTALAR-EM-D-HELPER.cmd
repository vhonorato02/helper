@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "REPO_DIR=D:\helper"
set "SOURCE_DIR=%~dp0arquivos-para-repositorio\.codex"

echo ============================================================
echo HELPER CODEX - INSTALAR EM D:\helper
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERRO: Git nao foi encontrado no PATH.
  pause
  exit /b 1
)

if not exist "%REPO_DIR%\.git" (
  echo ERRO: D:\helper nao existe ou nao e um repositorio Git.
  pause
  exit /b 1
)

if not exist "%SOURCE_DIR%\automation-prompts\01-feature.md" (
  echo ERRO: arquivos do pacote nao foram encontrados.
  pause
  exit /b 1
)

pushd "%REPO_DIR%"

for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "REMOTE=%%R"
echo Remote atual: !REMOTE!
echo !REMOTE! | findstr /I /C:"github.com/vhonorato02/helper" >nul
if errorlevel 1 (
  echo ERRO: origin nao pertence a github.com/vhonorato02/helper
  goto :erro
)

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if /I not "!BRANCH!"=="main" (
  echo ERRO: a branch atual e !BRANCH!, mas precisa ser main.
  goto :erro
)

set "DIRTY="
for /f "delims=" %%S in ('git status --porcelain --untracked-files^=all') do set "DIRTY=1"
if defined DIRTY (
  echo ERRO: D:\helper possui alteracoes locais.
  echo O instalador nao vai limpar, resetar ou sobrescrever seu trabalho.
  git status --short
  goto :erro
)

echo [1/4] Sincronizando main sem operacao destrutiva...
git fetch origin
if errorlevel 1 goto :erro
git pull --ff-only origin main
if errorlevel 1 goto :erro

echo [2/4] Copiando arquivos para D:\helper\.codex...
if not exist ".codex" mkdir ".codex"
xcopy "%SOURCE_DIR%" ".codex" /E /I /Y /Q >nul
if errorlevel 1 goto :erro

echo [3/4] Criando commit da configuracao...
git add .codex
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma mudanca nova. A configuracao ja esta instalada.
  goto :sucesso
)

git config user.name >nul 2>nul
if errorlevel 1 (
  set /p "GIT_NAME=Nome para os commits: "
  if "!GIT_NAME!"=="" set "GIT_NAME=Codex Autopilot"
  git config user.name "!GIT_NAME!"
)

git config user.email >nul 2>nul
if errorlevel 1 (
  set /p "GIT_EMAIL=E-mail do GitHub para os commits: "
  if "!GIT_EMAIL!"=="" (
    echo ERRO: e-mail obrigatorio.
    goto :erro
  )
  git config user.email "!GIT_EMAIL!"
)

git commit -m "chore: configure Codex automations in D helper"
if errorlevel 1 goto :erro

echo [4/4] Enviando diretamente para main...
git fetch origin
if errorlevel 1 goto :erro
git rebase origin/main
if errorlevel 1 (
  git rebase --abort >nul 2>nul
  echo ERRO: houve conflito. Nenhum force push foi executado.
  goto :erro
)
git push origin main
if errorlevel 1 goto :erro

:sucesso
popd
echo.
echo ============================================================
echo CONFIGURACAO INSTALADA EM D:\helper\.codex
echo ============================================================
echo Abra D:\helper\.codex\CONFIGURAR-CODEX.md
echo.
pause
exit /b 0

:erro
popd
echo.
echo A instalacao foi interrompida sem reset, clean ou force push.
echo.
pause
exit /b 1
