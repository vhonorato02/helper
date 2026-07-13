@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "REPO_DIR=%USERPROFILE%\Codex\helper-autopilot"
set "REPO_URL=https://github.com/vhonorato02/helper.git"

echo ============================================================
echo HELPER CODEX PLUS AUTOPILOT - VALIDACAO
echo ============================================================
echo.

if not exist "%REPO_DIR%\.git" (
  echo ERRO: repositorio nao encontrado em %REPO_DIR%
  pause
  exit /b 1
)

pushd "%REPO_DIR%"

echo [GitHub]
gh auth status
if errorlevel 1 goto :erro
echo.

echo [Remote]
git remote -v
for /f "delims=" %%R in ('git remote get-url origin') do set "CURRENT_REMOTE=%%R"
if /I not "%CURRENT_REMOTE%"=="%REPO_URL%" (
  echo ERRO: remote incorreto: %CURRENT_REMOTE%
  goto :erro
)
echo.

echo [Branch e estado]
git branch --show-current
git status --short
echo.

echo [Ferramentas]
git --version
gh --version
node --version
npm.cmd --version
pnpm.cmd --version
echo.

echo [Sincronizacao]
git fetch origin
if errorlevel 1 goto :erro
git push --dry-run origin main
if errorlevel 1 goto :erro
echo.

echo [Arquivos do Autopilot]
if not exist ".codex\config.toml" goto :arquivo_faltando
if not exist ".codex\automation-prompts\01-feature.md" goto :arquivo_faltando
if not exist ".codex\automation-prompts\02-review.md" goto :arquivo_faltando
if not exist ".codex\automation-prompts\03-ui-ux.md" goto :arquivo_faltando
if not exist ".codex\automation-prompts\04-maintenance.md" goto :arquivo_faltando
echo Todos os arquivos foram encontrados.
echo.

echo ============================================================
echo VALIDACAO CONCLUIDA
echo ============================================================
echo Abra o Codex App, adicione %REPO_DIR% como projeto Local
echo e cole o arquivo CRIAR-AS-4-AUTOMACOES.txt em uma conversa.
popd
pause
exit /b 0

:arquivo_faltando
echo ERRO: arquivo do Autopilot ausente.
goto :erro

:erro
popd
echo.
echo A validacao encontrou um problema.
echo Leia instrucoes\RESOLVER-PROBLEMAS.md.
pause
exit /b 1
