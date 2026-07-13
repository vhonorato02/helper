@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "PACKAGE_DIR=%~dp0.."
set "BASE_DIR=%USERPROFILE%\Codex"
set "REPO_DIR=%BASE_DIR%\helper-autopilot"
set "REPO_URL=https://github.com/vhonorato02/helper.git"

echo ============================================================
echo HELPER CODEX PLUS AUTOPILOT - PREPARAR REPOSITORIO
echo ============================================================
echo Destino: %REPO_DIR%
echo.

for %%C in (git gh node npm.cmd) do (
  where %%C >nul 2>nul
  if errorlevel 1 (
    echo ERRO: %%C nao foi encontrado no PATH.
    echo Execute 01-INSTALAR-FERRAMENTAS.cmd, feche o terminal e abra outro.
    pause
    exit /b 1
  )
)

echo [1/8] Conferindo login do GitHub...
gh auth status >nul 2>nul
if errorlevel 1 (
  echo O navegador sera aberto para autenticar o GitHub.
  gh auth login --web --git-protocol https
  if errorlevel 1 goto :erro
)
gh auth setup-git
if errorlevel 1 goto :erro

echo [2/8] Criando pasta base...
if not exist "%BASE_DIR%" mkdir "%BASE_DIR%"

echo [3/8] Clonando ou atualizando o repositorio dedicado...
if exist "%REPO_DIR%\.git" (
  pushd "%REPO_DIR%"
  for /f "delims=" %%R in ('git remote get-url origin') do set "CURRENT_REMOTE=%%R"
  if /I not "!CURRENT_REMOTE!"=="%REPO_URL%" (
    echo ERRO: a pasta existente aponta para outro remote:
    echo !CURRENT_REMOTE!
    popd
    pause
    exit /b 1
  )
  git fetch origin
  if errorlevel 1 goto :erro_popd
  git checkout main
  if errorlevel 1 goto :erro_popd
  git reset --hard origin/main
  if errorlevel 1 goto :erro_popd
  git clean -fd
  popd
) else (
  if exist "%REPO_DIR%" (
    echo ERRO: a pasta existe, mas nao e um repositorio Git.
    echo Renomeie ou remova: %REPO_DIR%
    pause
    exit /b 1
  )
  git clone "%REPO_URL%" "%REPO_DIR%"
  if errorlevel 1 goto :erro
)

echo [4/8] Configurando identidade do Git, se necessario...
pushd "%REPO_DIR%"
git config user.name >nul 2>nul
if errorlevel 1 (
  set /p "GIT_NAME=Digite o nome que aparecera nos commits: "
  if "!GIT_NAME!"=="" set "GIT_NAME=Codex Autopilot"
  git config user.name "!GIT_NAME!"
)
git config user.email >nul 2>nul
if errorlevel 1 (
  set /p "GIT_EMAIL=Digite o e-mail do GitHub para os commits: "
  if "!GIT_EMAIL!"=="" (
    echo ERRO: o e-mail nao pode ficar vazio.
    goto :erro_popd
  )
  git config user.email "!GIT_EMAIL!"
)

echo [5/8] Instalando pnpm quando necessario...
where pnpm.cmd >nul 2>nul
if errorlevel 1 (
  npm.cmd install --global pnpm@11.5.1
  if errorlevel 1 goto :erro_popd
)

echo [6/8] Copiando configuracao e prompts...
if not exist ".codex\automation-prompts" mkdir ".codex\automation-prompts"
copy /Y "%PACKAGE_DIR%\repo-template\.codex\config.toml" ".codex\config.toml" >nul
copy /Y "%PACKAGE_DIR%\repo-template\.codex\automation-prompts\01-feature.md" ".codex\automation-prompts\01-feature.md" >nul
copy /Y "%PACKAGE_DIR%\repo-template\.codex\automation-prompts\02-review.md" ".codex\automation-prompts\02-review.md" >nul
copy /Y "%PACKAGE_DIR%\repo-template\.codex\automation-prompts\03-ui-ux.md" ".codex\automation-prompts\03-ui-ux.md" >nul
copy /Y "%PACKAGE_DIR%\repo-template\.codex\automation-prompts\04-maintenance.md" ".codex\automation-prompts\04-maintenance.md" >nul

echo [7/8] Instalando dependencias com lockfile...
pnpm.cmd install --frozen-lockfile
if errorlevel 1 (
  echo AVISO: a instalacao com lockfile falhou.
  echo Os arquivos do Autopilot ainda serao instalados, mas valide o projeto depois.
)

echo [8/8] Criando o commit inicial e enviando para main...
git add .codex
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore: configure Codex local automations"
  if errorlevel 1 goto :erro_popd
  git pull --rebase origin main
  if errorlevel 1 goto :erro_popd
  git push origin main
  if errorlevel 1 goto :erro_popd
) else (
  echo Os arquivos do Autopilot ja estao atualizados no repositorio.
)

popd
echo.
echo ============================================================
echo REPOSITORIO PREPARADO
echo ============================================================
echo Pasta: %REPO_DIR%
echo Agora execute scripts\03-VALIDAR-AMBIENTE.cmd
echo Depois abra o Codex App e adicione essa pasta como projeto Local.
echo.
pause
exit /b 0

:erro_popd
popd
:erro
echo.
echo ERRO: a preparacao nao foi concluida.
echo Leia instrucoes\RESOLVER-PROBLEMAS.md.
pause
exit /b 1
