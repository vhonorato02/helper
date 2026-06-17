#Requires -Version 5.1
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("reparo","features","uiux","feature")]
  [string]$Routine
)

$ErrorActionPreference = "Stop"

$ProjectPath = "D:\helper"
$Model = "gpt-5.5"

$RoutineMap = @{
  "reparo" = @{
    Title = "Reparo profundo diario do Helper"
    CommitPrefix = "fix(helper)"
    PromptFile = "prompts\01_reparo_profundo.txt"
  }
  "features" = @{
    Title = "Revisao diaria de features do Helper"
    CommitPrefix = "fix(regression)"
    PromptFile = "prompts\02_revisao_features.txt"
  }
  "uiux" = @{
    Title = "Revisao diaria de UI UX do Helper"
    CommitPrefix = "fix(ui)"
    PromptFile = "prompts\03_revisao_ui_ux.txt"
  }
  "feature" = @{
    Title = "Feature nova diaria do Helper"
    CommitPrefix = "feat(helper)"
    PromptFile = "prompts\04_feature_nova.txt"
  }
}

$Meta = $RoutineMap[$Routine]
$Title = [string]$Meta.Title
$CommitPrefix = [string]$Meta.CommitPrefix
$PromptFile = Join-Path $PSScriptRoot ([string]$Meta.PromptFile)
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Fail($Message) {
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  exit 1
}

function HasGitChanges {
  $status = git status --porcelain
  if ($null -eq $status) { return $false }
  return (($status | Out-String).Trim().Length -gt 0)
}

function RunGitSyncToGithub {
  param(
    [string]$StageName
  )

  Write-Host ""
  Write-Host "[$StageName] Sincronizando main com GitHub..." -ForegroundColor Yellow

  git fetch origin main
  if ($LASTEXITCODE -ne 0) { Fail "git fetch origin main falhou." }

  git pull --rebase origin main
  if ($LASTEXITCODE -ne 0) { Fail "git pull --rebase origin main falhou. Resolva conflito no D:\helper e rode de novo." }

  git push origin main
  if ($LASTEXITCODE -ne 0) { Fail "git push origin main falhou. O commit pode estar local. Confira git status e git log." }
}

function GetPackageVersion {
  $pkg = Join-Path $ProjectPath "package.json"
  if (-not (Test-Path $pkg)) { return "" }
  try {
    $json = Get-Content $pkg -Raw | ConvertFrom-Json
    return [string]$json.version
  } catch {
    return ""
  }
}

function BumpPackagePatchVersionIfNeeded {
  param(
    [string]$InitialVersion
  )

  $pkg = Join-Path $ProjectPath "package.json"
  if (-not (Test-Path $pkg)) { return }

  $current = GetPackageVersion
  if ([string]::IsNullOrWhiteSpace($current)) { return }

  if ((-not [string]::IsNullOrWhiteSpace($InitialVersion)) -and ($current -ne $InitialVersion)) {
    Write-Host "O Codex ja alterou a versao: $InitialVersion -> $current" -ForegroundColor DarkYellow
    return
  }

  if ($current -notmatch '^\d+\.\d+\.\d+($|-)') {
    Write-Host "Versao fora do semver simples. Nao alterei automaticamente: $current" -ForegroundColor DarkYellow
    return
  }

  $main = ($current -split "-")[0]
  $parts = $main -split "\."
  $major = [int]$parts[0]
  $minor = [int]$parts[1]
  $patch = ([int]$parts[2]) + 1
  $next = "$major.$minor.$patch"

  $nodeCode = @"
const fs = require('fs');
const p = 'D:/helper/package.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
data.version = '$next';
fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
"@
  node -e $nodeCode
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Versionamento package.json: $current -> $next" -ForegroundColor Green
  }
}

function AppendChangelog {
  param(
    [string]$PatchRelativePath
  )

  $changelog = Join-Path $ProjectPath "CHANGELOG.md"
  $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $entry = @"

## $date - $Title

- Rotina executada diretamente na main via Codex CLI.
- Alteracoes versionadas, commitadas e enviadas ao GitHub.
- Patch gerado: `$PatchRelativePath`.
"@

  if (Test-Path $changelog) {
    Add-Content -Path $changelog -Value $entry -Encoding UTF8
  } else {
    Set-Content -Path $changelog -Value "# Changelog`n$entry" -Encoding UTF8
  }
}

function CommitPatchAndPush {
  param(
    [string]$Reason
  )

  if (-not (HasGitChanges)) {
    Write-Host "Sem alteracoes para commit em: $Reason" -ForegroundColor DarkYellow
    return
  }

  $PatchDir = Join-Path $ProjectPath ".codex-patches"
  New-Item -ItemType Directory -Force -Path $PatchDir | Out-Null

  $PatchName = "$Routine-$Timestamp.patch"
  $PatchPath = Join-Path $PatchDir $PatchName
  $PatchRelative = ".codex-patches/$PatchName"

  BumpPackagePatchVersionIfNeeded -InitialVersion $script:InitialVersion
  AppendChangelog -PatchRelativePath $PatchRelative

  git add -N .
  git diff --binary -- . ":(exclude).codex-patches/*" | Out-File -FilePath $PatchPath -Encoding utf8

  git add -A
  $CommitMessage = "${CommitPrefix}: $Title $Timestamp"
  git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) { Fail "git commit falhou." }

  RunGitSyncToGithub -StageName "Depois do commit"
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Fail "Codex CLI nao encontrado no PATH."
}

if (-not (Test-Path $ProjectPath)) {
  Fail "Pasta nao encontrada: $ProjectPath"
}

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  Fail "Nao encontrei package.json em D:\helper. Confira a raiz do projeto."
}

if (-not (Test-Path $PromptFile)) {
  Fail "Prompt nao encontrado: $PromptFile"
}

Set-Location $ProjectPath

$RunDir = Join-Path $ProjectPath ".codex-runs"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
$LogPath = Join-Path $RunDir "$Routine-$Timestamp.log"

Start-Transcript -Path $LogPath -Append | Out-Null

try {
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
  Write-Host "Projeto: $ProjectPath"
  Write-Host "Modelo: $Model"
  Write-Host "Modo: MAIN DIRETO + COMMIT + PUSH"
  Write-Host "Log: $LogPath"
  Write-Host ""

  $branch = (git branch --show-current).Trim()
  if ($branch -ne "main") {
    Write-Host "Branch atual: $branch. Trocando para main..." -ForegroundColor Yellow
    git switch main
    if ($LASTEXITCODE -ne 0) { Fail "Nao consegui trocar para main. Resolva manualmente e rode de novo." }
  }

  $script:InitialVersion = GetPackageVersion

  if (HasGitChanges) {
    Write-Host "Ha alteracoes locais antes da rotina. Vou commitar e subir antes para manter GitHub/local sincronizados." -ForegroundColor Yellow
    git add -A
    $preMsg = "chore(sync): salva alteracoes locais antes de $Routine $Timestamp"
    git commit -m $preMsg
    if ($LASTEXITCODE -ne 0) { Fail "Commit das alteracoes locais preexistentes falhou." }
  }

  RunGitSyncToGithub -StageName "Antes do Codex"

  $Prompt = Get-Content $PromptFile -Raw

  Write-Host ""
  Write-Host "Rodando Codex..." -ForegroundColor Green
  Write-Host ""

  $CodexArgs = @(
    "exec",
    "-C", $ProjectPath,
    "--model", $Model,
    "--dangerously-bypass-approvals-and-sandbox",
    "-c", "web_search=""live""",
    "-"
  )

  $Prompt | & codex @CodexArgs
  $CodexExit = $LASTEXITCODE

  Write-Host ""
  Write-Host "Codex terminou com codigo: $CodexExit" -ForegroundColor Cyan

  CommitPatchAndPush -Reason "pos-Codex"

  Write-Host ""
  Write-Host "Status final:" -ForegroundColor Yellow
  git status --short

  Write-Host ""
  Write-Host "Finalizado. Se houve alteracao, foi commitada e enviada ao GitHub na main." -ForegroundColor Green

  exit $CodexExit
}
finally {
  Stop-Transcript | Out-Null
}
