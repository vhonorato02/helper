# Helper Memory

Este arquivo guarda contexto operacional para próximas versões do Helper.

## Produto

- Helper é uma central interna para tickets, Kanban, agenda, marketing, reservas de Chromebooks, notificações, PWA e solicitações públicas.
- URL de produção: `https://helperpinda.vercel.app`.
- Repositório fonte: `https://github.com/vhonorato02/helper`, branch `main`.
- Vercel: projeto `helper`, produção a partir de `main`.
- Não usar worktrees para manutenção comum deste projeto.

## Regras de Versão

- Patch atual: `0.1.6`.
- Toda versão precisa atualizar `package.json`, `package-lock.json`, `src/lib/version.ts`, `CHANGELOG.md` e README quando houver mudança operacional.
- Tags só devem ser criadas ou movidas com decisão explícita. Não mover tag antiga silenciosamente.
- Antes de publicar: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:smoke`, `npm run test:e2e`.

## Pontos Sensíveis

- Solicitações públicas viram tickets com `origin = "Pagina publica"` e aparecem em `/tickets?origin=public&status=ativas`.
- Reservas públicas de Chromebooks ficam em `/chromebooks?status=pendente`.
- Contato externo é obrigatório para novos pedidos públicos.
- Notificações internas devem ser best-effort: falha de notificação não pode quebrar criação já salva.
- Banco é Neon/Postgres; nunca rodar scripts contra produção sem conferir env.
- O runtime suportado é Node.js 24.x.

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

