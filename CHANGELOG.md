# Changelog

## Helper 0.1.3 - 2026-05-27

- Renomeia a identidade visível do produto para Helper em app, PWA, e-mails, testes, documentação, metadados e assets públicos.
- Substitui a base visual por preto, branco e escalas de cinza; cores continuam reservadas para estado, prioridade e alerta.
- Atualiza favicon, logo, service worker e ícones PWA para a marca Helper, com cache `helper-static-v5`.
- Revalida os bancos Neon acessíveis, aplica o schema idempotente sem apagar dados e separa Preview de Production.
- Mantém Production no banco com dados preservados e schema completo; prepara o banco novo de `sa-east-1` para Preview.
- Corrige variáveis mínimas de Vercel: `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` e banco de Preview.
- Mantém validação backend de reservas de Chromebooks com lock persistido, bloqueio de sala e limite por disponibilidade.
- Confirma o Kanban com abertura, edição por query string, movimentação otimista e rollback em erro.
- Atualiza documentação para operação real, recuperação de banco, deploy, PWA, Vercel e troubleshooting.
