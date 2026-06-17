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
Rotina 16h: Criador de Testes E2E.
Verificar testes existentes. Escolher 1 fluxo crítico pouco coberto. Criar ou melhorar teste E2E com Playwright quando fizer sentido. Rodar testes e publicar se alterar.
