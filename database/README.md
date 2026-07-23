# Operação segura do banco

`database/schema.sql` é o contrato canônico e idempotente do Helper. O schema
Drizzle em `src/db/schema.ts` deve declarar as mesmas tabelas, colunas e enums.

## Antes de publicar

Execute nesta ordem, apontando `.env` para o ambiente correto:

```bash
pnpm db:schema:check
pnpm db:setup
pnpm db:check
pnpm build
```

- `db:schema:check` é local e não acessa banco. Ele impede que o schema SQL e o
  schema usado pelo app sejam publicados com objetos incompatíveis.
- `db:setup` prefere `DATABASE_URL_UNPOOLED`, usa lock consultivo e aplica as
  alterações de tabelas e dados em uma transação. Ele não deve ser executado
  automaticamente no build da Vercel, porque Preview e Production precisam de
  alvos explícitos.
- `db:check` é somente leitura. Ele compara o banco real com todas as tabelas,
  colunas e enums que o release usa.

Faça backup ou crie uma branch Neon antes de qualquer alteração relevante.
Nunca aponte Preview para o banco de Production.

## Depois de publicar

Validação pública sem alterar dados:

```bash
SMOKE_BASE_URL=https://seu-dominio pnpm test:smoke:built
```

Validação autenticada das páginas principais:

```bash
PLAYWRIGHT_BASE_URL=https://seu-dominio \
PLAYWRIGHT_USERNAME=usuario-de-qa \
PLAYWRIGHT_PASSWORD=senha \
pnpm test:e2e
```

Defina `PLAYWRIGHT_ADMIN=1` para incluir `/configuracoes`. Use uma conta de QA
sem troca de senha pendente. O teste autenticado registra um login, mas não cria
nem edita demandas.

Depois de um `pnpm build` local já concluído, use
`PLAYWRIGHT_SKIP_BUILD=1 pnpm test:e2e` para reutilizar o mesmo artefato.

## Diagnóstico de drift

Se `db:check` listar `missing table`, `missing column` ou `missing enum value`,
não crie o objeto manualmente. Corrija `database/schema.sql`, valide em uma
branch do banco, execute `db:setup` e repita `db:check` antes do deploy.

Cada execução bem-sucedida do setup registra o checksum do contrato em
`_helper_schema_history`, permitindo identificar qual versão do schema foi
aplicada sem armazenar credenciais ou dados do aplicativo.
