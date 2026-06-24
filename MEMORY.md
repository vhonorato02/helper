# Helper Memory

Este arquivo guarda contexto operacional para próximas versões do Helper.

## Produto

- Helper é uma central interna para tickets, Kanban, agenda, marketing, reservas de Chromebooks, notificações, PWA e solicitações públicas.
- URL de produção: `https://helperpinda.vercel.app`.
- Repositório fonte: `https://github.com/vhonorato02/helper`, branch `main`.
- Vercel: projeto `helper`, produção a partir de `main`.
- Não usar worktrees para manutenção comum deste projeto.

## Regras de Versão

- Patch atual: `0.2.6`.
- Toda versão precisa atualizar `package.json`, `src/lib/version.ts`, `CHANGELOG.md`, README, MEMORY e `.env.example` quando houver mudança operacional.
- Atualize `pnpm-lock.yaml` somente quando `pnpm install` alterar dependências, overrides, package manager ou metadata realmente representada no lockfile. O lockfile pnpm v9 não replica a versão do pacote raiz.
- Atualize `public/sw.js` quando uma versão precisar forçar atualização PWA ou quando assets estáticos cacheados mudarem.
- Tags só devem ser criadas ou movidas com decisão explícita. Não mover tag antiga silenciosamente.
- Antes de publicar: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:smoke`, `pnpm test:e2e`.
- Em 0.2.5, Chromebooks ganharam filtros rápidos e exportação CSV, notificações ganharam marcação individual como lida e a agenda passou a expor filtros por área/status.
- Em 0.2.4, formulários críticos passaram a capturar exceções de Server Actions com feedback claro, e o calendário editorial passou a rejeitar datas recorrentes impossíveis.
- Em 0.2.3, `pnpm typecheck` passou a desativar cache incremental para evitar travamento por `tsconfig.tsbuildinfo` local.
- Em 0.2.2, solicitações públicas passaram a limitar tentativas antes das validações finais e a agenda pública rejeita horário já passado no dia atual de São Paulo.
- Logs estruturados devem continuar redigindo campos sensíveis, tokens e strings de conexão antes de escrever no console.
- Em 0.2.6, o Kanban ganhou alternativa acessível ao drag, selects Radix receberam labels associados, formulários públicos associam erros aos campos, e o PWA passou a respeitar safe area em telas instaladas.

## Pontos Sensíveis

- Solicitações públicas viram tickets com `origin = "Pagina publica"` e aparecem em `/tickets?origin=public&status=ativas`.
- Reservas públicas de Chromebooks ficam em `/chromebooks?status=pendente`.
- Contato externo é obrigatório para novos pedidos públicos.
- Notificações internas devem ser best-effort: falha de notificação não pode quebrar criação já salva.
- Banco é Neon/Postgres; nunca rodar scripts contra produção sem conferir env.
- O runtime suportado é Node.js 24.16+ na linha LTS 24.x.

## Revisão Visual Obrigatória

Em toda versão, revisar no navegador:

- `/login`
- `/solicitar`
- `/solicitar/ti`
- `/solicitar/midia`
- `/solicitar/arte`
- `/solicitar/cobertura`
- `/solicitar/outra`
- `/solicitar/chromebooks`
- `/`
- `/tickets`
- `/kanban`
- `/agendamentos`
- `/marketing`
- `/marketing/calendario`
- `/marketing/gravacoes`
- `/chromebooks`
- `/notificacoes`
- `/configuracoes`
- `/atividade`
