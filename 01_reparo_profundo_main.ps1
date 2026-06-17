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
$RoutineSlug = "01_reparo_profundo"
$RoutineTitle = "Reparo profundo diário do Helper"
$CommitPrefix = "fix(helper)"
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
Executar reparo profundo diário no Helper inteiro. Isto não é relatório. É auditoria com correção. Encontre problemas reais, corrija, rode validações, repita até passar ou até restar bloqueio externo verificável.

REPOSITÓRIO OFICIAL:
https://github.com/vhonorato02/helper

STACK ESPERADA:
Next.js 16 App Router, React 19, TypeScript 6, Node >=24.15 <25, pnpm 11.5.1, Tailwind CSS 4.3 CSS-first em src/app/globals.css, Radix UI, lucide-react, sonner, Server Actions, Route Handlers, jose/JWT com cookie HTTP-only, Zod, Drizzle ORM, Neon PostgreSQL, date-fns/date-fns-tz America/Sao_Paulo, PWA e Vercel.

MÓDULOS:
Dashboard, tickets, detalhe de ticket, comentários, histórico, Kanban, agenda, marketing, calendário editorial, gravações, Chromebooks, solicitações públicas, entrada externa, notificações, configurações, atividade, login, alteração de senha, PWA, APIs, crons, banco e schema.

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
Rode e leia:
- pwd
- git status --short
- git branch --show-current
- node -v
- pnpm -v
- README.md
- STACK.md
- MEMORY.md
- CHANGELOG.md
- package.json
- src/db/schema.ts
- database/schema.sql

VALIDAÇÃO BASE COM CORREÇÃO:
Rode e corrija até passar:
- pnpm install --frozen-lockfile
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

SMOKE/E2E:
- pnpm test:smoke
- se Chromium faltar: pnpm exec playwright install chromium
- pnpm test:e2e

Corrija console errors, redirects errados, rotas públicas pedindo login, rotas internas sem proteção, hidratação, Server Actions, loading infinito, botão/link quebrado, formulário sem validação, empty/error states ruins, regressão em PWA.

BUSCAS OBRIGATÓRIAS:
- rg -n "TODO|FIXME|HACK|deprecated|console\\.log|console\\.warn|console\\.error" src scripts tests public database
- rg -n "any\\b|as unknown as|@ts-ignore|@ts-expect-error" src scripts tests
- rg -n "window\\.|document\\.|localStorage|sessionStorage" src/app src/components src/lib
- rg -n "dangerouslySetInnerHTML|innerHTML|eval\\(|new Function" src
- rg -n "DATABASE_URL|AUTH_SECRET|CRON_SECRET|GMAIL_APP_PASSWORD|BOOTSTRAP_ADMIN_PASSWORD" src scripts public tests README.md STACK.md MEMORY.md CHANGELOG.md
- rg -n "PADRAO_REMOVIDO_1|PADRAO_REMOVIDO_2|VERSAO_REMOVIDA" . -g "!node_modules" -g "!.next"

CORRIJA POR DOMÍNIO:

Tickets:
Criação, listagem, edição, detalhe, comentários, histórico, filtros, busca, status, prioridade, responsável, arquivamento, fechamento e reabertura. Corrija mutation sem revalidação, feedback ruim, validação ausente, erro genérico e status visual divergente.

Kanban:
@dnd-kit, colunas, cards, filtros, alternativa acessível ao drag, rollback em falha, mobile, empty states, loading preso e card sem ação clara.

Chromebooks:
Data válida, fim maior que início, duração mínima 15 minutos, duração máxima 8 horas, quantidade >0, quantidade <= total configurado, conflito por sala, conflito por total, pendente/confirmado reservam, cancelado libera, revalidação ao aprovar e mensagens claras.

Solicitações públicas:
Todas as subrotas, contato obrigatório, honeypot, rate limit, confirmação, erro sem stack, dados internos protegidos e UX mobile.

Marketing/agenda:
Datas, timezone America/Sao_Paulo, filtros, formulários, gravações, calendário, empty states, loading, error states e responsividade.

Notificações:
Falha de e-mail best-effort. Não quebrar operação principal. Logs sem segredo. Preferências coerentes.

PWA:
Manifest, ícones, service worker, cache versionado, safe area, nome Helper e HTML autenticado sem cache velho.

Autenticação/segurança:
Rotas internas exigem login. Ações administrativas conferem permissão. Cookies HTTP-only. Inputs públicos validados no backend. APIs públicas sem vazamento.

TESTES:
Adicione/atualize teste unitário para regra de negócio e e2e para fluxo de navegador. Não remova cobertura.

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
Explique arquivos alterados, problemas encontrados, correções, testes, comandos, pendências bloqueadas, teste manual, riscos e commit message sugerida. Não entregue só relatório.

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
