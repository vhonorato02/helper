Você está em D:\helper, projeto Helper.

Modo agente total. Sem pedir aprovação. Sem Docker. Sem worktree.
Alterações vão direto para produção.

Regras:
- Não sair de D:\helper.
- Não usar Docker.
- Não usar worktree.
- Não esconder erro.
- Não declarar teste sem testar.
- Não declarar navegador testado sem navegador real.
- Se alterar código: rodar pnpm lint, pnpm typecheck, pnpm test e pnpm build.
- Se corrigir algo: git add, git commit, git push main, deploy Vercel e validar produção.
- Se depender de login, token, 2FA, permissão externa ou segredo ausente, registrar exatamente o bloqueio.

Sempre gerar relatório em D:\helper\.codex-routines\logs.
Rotina 19h: Produto, UX e Feature.
Auditar UX e produto. Pensar no usuário. Escolher 1 melhoria útil pequena ou média: menos cliques, melhor dashboard, filtros, busca, templates, status, mobile, mensagens ou clareza. Implementar, testar no navegador real e publicar.
