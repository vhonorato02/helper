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
$RoutineSlug = "04_feature_nova"
$RoutineTitle = "Feature nova diária do Helper"
$CommitPrefix = "feat(helper)"
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
Criar, implementar e validar uma feature nova útil no Helper. Pequena, segura, testável e relevante para a operação. Não entregue só planejamento.

STACK:
Next.js 16 App Router, React 19, TypeScript 6, Node >=24.15 <25, pnpm 11.5.1, Tailwind CSS 4.3 CSS-first, Radix UI, Drizzle ORM, Neon PostgreSQL, Zod, jose/JWT, date-fns/date-fns-tz America/Sao_Paulo, PWA e Vercel.

PRODUTO:
Helper é central operacional para tickets, Kanban, agenda, marketing, gravações, reservas de Chromebooks, notificações, solicitações públicas, rotinas administrativas e PWA.

ÁREAS:
- /login
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
- src/actions
- src/components
- src/lib
- src/db
- src/app/api
- tests

ANTES:
Rode git status --short, node -v, pnpm -v, pnpm install --frozen-lockfile. Leia README.md, STACK.md, MEMORY.md, CHANGELOG.md, package.json, src/db/schema.ts, database/schema.sql, copy/brand/version se existirem. Rode lint, typecheck, test e build. Se houver bug crítico, corrija antes ou escolha feature que não empilhe problema.

ESCOLHA:
Identifique 5 oportunidades pequenas com base no código real. Escolha 1.

PRIORIZAR:
Reduzir trabalho manual da escola, melhorar triagem, ajudar tickets/Kanban/Chromebooks/marketing/solicitações/notificações, usar dados existentes, baixo risco, desktop/mobile, testável, sem dependência nova, sem migração destrutiva, sem segredo novo.

BOAS FEATURES:
Filtro salvo, atalho operacional, painel de pendências, badge/resumo de atenção, exportação simples, ação rápida segura, melhoria de triagem pública, checklist em tickets, sinalização de conflito em Chromebooks, visão de próximas gravações/eventos, preferências de notificação, empty state com CTA, histórico mais claro, busca/filtro/ordenação por prioridade/prazo, resumo mobile.

PROIBIDO:
Chat genérico, IA externa, upload novo sem validação, refactor grande, troca de banco/autenticação/design system, reescrita do Kanban, dependência pesada, alteração destrutiva de schema, feature só testável em produção.

IMPLEMENTAÇÃO:
Mapeie código, escolha feature, implemente menor escopo útil, atualize UI/Server Action/validação/tipos/testes/docs, garanta loading/erro/vazio/sucesso/mobile/acessibilidade, proteja rotas internas e dados públicos.

SE ALTERAR BANCO:
Atualize src/db/schema.ts e database/schema.sql de forma idempotente. Não remova coluna/tabela. Não destrua dados. Não rode db:setup em produção. Prefira feature sem banco.

UI:
Tailwind 4 CSS-first, componentes existentes, base preto/branco/cinza, cores fortes só status/alerta/prioridade/sucesso, responsivo.

COPY:
Português do Brasil, curto, operacional, claro.

TESTES:
Antes/depois: lint, typecheck, test, build. Se tocar navegador: smoke/e2e. Instale Chromium se faltar.

VALIDAÇÃO MANUAL:
Liste rota, pré-condição, ação, resultado esperado, vazio, erro e mobile.

ENTREGA:
Feature implementada, por que foi escolhida, arquivos, implementação, encaixe no Helper, testes, comandos, teste manual, riscos/rollback e commit message sugerida.

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
