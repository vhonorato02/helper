#Requires -Version 7.0
<#
Helper Codex CLI - rotina direta na main, corrigida para versões em que codex exec não aceita --ask-for-approval.

ATENÇÃO:
- Não cria branch.
- Não cria worktree.
- Não clona outro repositório.
- Trabalha direto em D:\helper.
- Faz pull/push na main.
- Usa --dangerously-bypass-approvals-and-sandbox em vez de --ask-for-approval.
- Cria patch em D:\helper\.codex-patches.
- Comita direto na main quando houver alteração.
#>

$ErrorActionPreference = "Stop"

$ProjectPath = "D:\helper"
$Model = "gpt-5.5"
$RoutineSlug = "02_revisao_features"
$RoutineTitle = "Revisão diária de features do Helper"
$CommitPrefix = "fix(regression)"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Run-Native {
  param(
    [Parameter(Mandatory=$true)][string]$Exe,
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$Args
  )
  & $Exe @Args
  return $LASTEXITCODE
}

function Has-Changes {
  $status = (& git status --porcelain)
  return -not [string]::IsNullOrWhiteSpace(($status -join "`n"))
}

function Get-PackageVersion {
  $pkg = Join-Path $ProjectPath "package.json"
  if (-not (Test-Path $pkg)) { return $null }
  try {
    $json = Get-Content $pkg -Raw | ConvertFrom-Json
    return [string]$json.version
  } catch {
    return $null
  }
}

function Bump-PackagePatchVersion {
  param([string]$InitialVersion)

  $pkg = Join-Path $ProjectPath "package.json"
  if (-not (Test-Path $pkg)) { return }

  $current = Get-PackageVersion
  if ([string]::IsNullOrWhiteSpace($current)) { return }

  if (-not [string]::IsNullOrWhiteSpace($InitialVersion) -and $current -ne $InitialVersion) {
    Write-Host "package.json já teve versionamento alterado pelo Codex: $InitialVersion -> $current" -ForegroundColor DarkYellow
    return
  }

  if ($current -notmatch '^\d+\.\d+\.\d+(-.+)?$') {
    Write-Host "Versão fora do padrão semver simples. Não alterei automaticamente: $current" -ForegroundColor DarkYellow
    return
  }

  $parts = $current.Split("-")[0].Split(".")
  $major = [int]$parts[0]
  $minor = [int]$parts[1]
  $patch = [int]$parts[2] + 1
  $next = "$major.$minor.$patch"

  $nodeCode = @"
const fs = require('fs');
const path = '$($pkg.Replace('\','\\'))';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.version = '$next';
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"@
  node -e $nodeCode
  Write-Host "Versionamento package.json: $current -> $next" -ForegroundColor Green
}

function Append-Changelog {
  param(
    [string]$PatchRelativePath
  )

  $changelog = Join-Path $ProjectPath "CHANGELOG.md"
  $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $entry = @"

## $date - $RoutineTitle

- Rotina executada diretamente na main via Codex CLI.
- Patch gerado: `$PatchRelativePath`.
- Sincronia local/GitHub feita por pull/push na main.
"@

  if (Test-Path $changelog) {
    Add-Content -Path $changelog -Value $entry -Encoding UTF8
  } else {
    Set-Content -Path $changelog -Value "# Changelog`n$entry" -Encoding UTF8
  }
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "Codex CLI não encontrado no PATH. Abra o terminal onde 'codex' funcione." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $ProjectPath)) {
  Write-Host "Pasta não encontrada: $ProjectPath" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  Write-Host "Não encontrei package.json em $ProjectPath. Confira se essa é a raiz do Helper." -ForegroundColor Red
  exit 1
}

Set-Location $ProjectPath

$RunDir = Join-Path $ProjectPath ".codex-runs"
$PatchDir = Join-Path $ProjectPath ".codex-patches"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
New-Item -ItemType Directory -Force -Path $PatchDir | Out-Null

$TranscriptPath = Join-Path $RunDir "$RoutineSlug-$Timestamp.log"
Start-Transcript -Path $TranscriptPath -Append | Out-Null

try {
  Write-Host ""
  Write-Host "=== Helper Codex Routine: $RoutineTitle ===" -ForegroundColor Cyan
  Write-Host "Projeto: $ProjectPath"
  Write-Host "Modelo: $Model"
  Write-Host "Direto na main, sem branch, sem worktree"
  Write-Host "Log: $TranscriptPath"
  Write-Host ""

  git status --short
  $currentBranch = (& git branch --show-current).Trim()

  if ($currentBranch -ne "main") {
    Write-Host "Branch atual: $currentBranch. Trocando para main sem criar branch..." -ForegroundColor Yellow
    git switch main
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Switch para main falhou. Tentando preservar alterações com stash temporário e aplicar na main." -ForegroundColor DarkYellow
      git stash push -u -m "codex-auto-stash-before-main-$Timestamp"
      git switch main
      git stash pop
    }
  }

  Write-Host ""
  Write-Host "Sincronizando GitHub -> local e local -> GitHub antes da rotina..." -ForegroundColor Yellow

  if (Has-Changes) {
    $prePatch = ".codex-patches/pre-$RoutineSlug-$Timestamp.patch"
    git add -N .
    git diff --binary -- . ":(exclude).codex-patches/*" | Out-File -FilePath (Join-Path $ProjectPath $prePatch) -Encoding utf8
    git add -A
    git commit -m "chore(helper): sincroniza alterações locais antes de $RoutineSlug $Timestamp"
  }

  git fetch origin main
  git pull --rebase origin main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Pull/rebase encontrou conflito. O Codex receberá a pasta neste estado para resolver." -ForegroundColor DarkYellow
  } else {
    git push origin main
  }

  $InitialVersion = Get-PackageVersion

  $Prompt = @'

REGRAS ABSOLUTAS DE GIT, PASTA E VERSIONAMENTO:
- Trabalhe somente em D:\helper.
- Trabalhe diretamente na branch main.
- Não crie branch.
- Não crie worktree.
- Não clone o repositório em outra pasta.
- Não use workspace temporário.
- Não use npm. Use pnpm.
- Não faça git commit.
- Não faça git push.
- O PowerShell fará patch, commit e push depois que você terminar.
- Antes de alterar, considere que o script já fez fetch/pull/rebase na main.
- Tudo que for alterado deve ficar no working tree real de D:\helper.
- Todo ajuste deve atualizar versionamento quando fizer sentido:
  - package.json version, se houver necessidade e ainda não estiver atualizado;
  - src/lib/version.ts, src/lib/version.tsx, src/lib/app-version.ts ou arquivo equivalente, se existir;
  - CHANGELOG.md com resumo objetivo;
  - documentação técnica mínima quando alterar comportamento.
- Não invente arquivo de versionamento se não houver padrão no projeto, exceto CHANGELOG.md quando ausente.
- Cada execução vira patch pelo PowerShell em .codex-patches.
- Não esconda alterações fora do Git.


MISSÃO:
Revisar diariamente todas as features e fluxos existentes do Helper, encontrar regressões reais, corrigir e aumentar cobertura. Não crie feature nova nesta rotina.

STACK:
Next.js 16 App Router, React 19, TypeScript 6, Node >=24.15 <25, pnpm 11.5.1, Tailwind 4.3 CSS-first, Radix UI, Drizzle, Neon, Zod, jose/JWT, PWA e Vercel.

FEATURES OBRIGATÓRIAS:
Login, alteração de senha, dashboard, tickets, detalhe, comentários, histórico, filtros, ações em lote, Kanban, movimentação de status, alternativa ao drag, agenda, marketing, calendário editorial, gravações, Chromebooks público/admin, total de Chromebooks, solicitações públicas, entrada externa, notificações, preferências, crons, PWA, manifesto, service worker, rotas protegidas, rotas públicas, error/loading/not-found, atividade e configurações.

ROTAS:
- /login
- /alterar-senha
- /solicitar
- /solicitar/ti
- /solicitar/midia
- /solicitar/arte
- /solicitar/cobertura
- /solicitar/outra
- /solicitar/chromebooks
- /
- /tickets
- /kanban
- /agendamentos
- /marketing
- /marketing/calendario
- /marketing/gravacoes
- /chromebooks
- /notificacoes
- /configuracoes
- /atividade

INÍCIO:
Rode:
- git status --short
- node -v
- pnpm -v
- pnpm install --frozen-lockfile

Leia README.md, STACK.md, MEMORY.md, CHANGELOG.md, package.json, src/db/schema.ts e testes existentes.

RODE E CORRIJA:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:smoke
- pnpm test:e2e
- pnpm build

COBERTURA E2E:
Se e2e/smoke não cobrem rotas obrigatórias, aumente cobertura sem fragilizar. Verifique renderização, ausência de console error relevante, rota protegida redirecionando, rota pública sem login, mobile básico, formulário público inválido com erro, PWA básico, Chromebooks com período inválido/conflito, Kanban com ação acessível e tickets com filtro.

FLUXOS:
Login:
labels, erro claro, sucesso, redirect, cookies seguros.

Solicitações públicas:
sem login, contato obrigatório, honeypot, rate limit, confirmação, erro sem stack, dados internos protegidos.

Tickets:
criar, listar, filtrar, abrir, editar, status, prioridade, responsável, comentário, arquivar, fechar/reabrir, histórico e revalidação.

Kanban:
cards nas colunas, drag, rollback, alternativa teclado/mobile, card abre detalhe, filtros, coluna vazia e loading.

Agenda:
timezone America/Sao_Paulo, datas, criar/editar se aplicável, empty state, ordenação e mobile.

Marketing:
calendário, gravações, formulários, empty states, filtros, datas e mobile.

Chromebooks:
público/admin, total configurável, conflito por sala, conflito por total, pendente/confirmado reservam, cancelado libera, erro claro, revalidação ao aprovar.

Notificações:
lista, preferências, e-mail best-effort, logs sem segredo.

PWA:
manifesto, ícones, service worker, cache, nome Helper, safe area.

CORREÇÃO:
Para cada regressão, corrija na origem, adicione teste que pegaria a regressão, rode teste isolado e suíte relevante.

VALIDAÇÃO FINAL:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:smoke
- pnpm test:e2e
- pnpm build
- git diff --check
- git status --short

ENTREGA:
Fluxos revisados, regressões encontradas, correções, testes, comandos, limitações, validação manual e commit message sugerida.

'@

  Write-Host ""
  Write-Host "Iniciando Codex CLI na main..." -ForegroundColor Green
  Write-Host ""

  $CodexArgs = @(
    "exec",
    "-C", $ProjectPath,
    "--model", $Model,
    "--dangerously-bypass-approvals-and-sandbox",
    "-c", 'web_search="live"',
    "-"
  )

  $Prompt | & codex @CodexArgs
  $CodexExit = $LASTEXITCODE

  Write-Host ""
  Write-Host "Codex finalizado com código: $CodexExit" -ForegroundColor Cyan

  if (Has-Changes) {
    Write-Host ""
    Write-Host "Aplicando versionamento obrigatório e gerando patch..." -ForegroundColor Yellow

    Bump-PackagePatchVersion -InitialVersion $InitialVersion

    $PatchFileName = "$RoutineSlug-$Timestamp.patch"
    $PatchPath = Join-Path $PatchDir $PatchFileName
    $PatchRelativePath = ".codex-patches/$PatchFileName"

    Append-Changelog -PatchRelativePath $PatchRelativePath

    git add -N .
    git diff --binary -- . ":(exclude).codex-patches/*" | Out-File -FilePath $PatchPath -Encoding utf8

    git add -A
    git commit -m "${CommitPrefix}: $RoutineTitle $Timestamp"

    Write-Host ""
    Write-Host "Sincronizando main com GitHub após a rotina..." -ForegroundColor Yellow
    git pull --rebase origin main
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Rebase final falhou. Rode a rotina novamente ou resolva conflito manualmente. Nada foi descartado." -ForegroundColor Red
      git status --short
      exit 1
    }

    git push origin main
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Push final falhou. O commit está local na main. Nada foi descartado." -ForegroundColor Red
      git status --short
      exit 1
    }
  } else {
    Write-Host "Nenhuma alteração detectada após a rotina. Fazendo pull/push final mesmo assim." -ForegroundColor DarkYellow
    git pull --rebase origin main
    git push origin main
  }

  Write-Host ""
  Write-Host "Status final:" -ForegroundColor Yellow
  git status --short

  Write-Host ""
  Write-Host "Rotina finalizada direto na main." -ForegroundColor Green
  exit $CodexExit
}
finally {
  Stop-Transcript | Out-Null
}
