# Helper

Versão atual: `Helper 0.2.9`

Helper é uma central operacional para registrar, organizar e acompanhar demandas internas. O sistema reúne página pública de solicitações, tickets, Kanban, agenda, reservas de Chromebooks, notificações, rotinas administrativas e PWA em uma única aplicação.

Este README é o guia oficial de instalação, configuração, operação, manutenção, deploy e recuperação. Sempre comece a partir do GitHub. Não use cópias locais antigas como fonte de verdade.

## Fonte de Verdade

Repositório oficial:

```bash
https://github.com/vhonorato02/helper
```

Branch principal:

```bash
main
```

Regras de trabalho:

- Clone o projeto diretamente do GitHub antes de mexer em código.
- Não reaproveite pastas locais antigas.
- Não use worktrees para manutenção comum.
- Se existir divergência entre uma pasta local e o GitHub, o GitHub vence.
- Nunca versionar senhas, tokens, dumps, `.env`, `node_modules` ou artefatos de build local.

## Módulos

- Dashboard: visão de métricas, fila de atenção, prazos e atividade recente.
- Tickets: criação, edição, responsáveis, prioridade, status, comentários e histórico.
- Respostas rápidas: biblioteca global ou por área para comentários recorrentes em demandas.
- Kanban: movimentação visual por status com feedback e rollback quando a mutation falha.
- Agenda: compromissos e demandas com data marcada.
- Marketing: calendário editorial, gravações, campanhas e solicitações da área.
- Chromebooks: reserva pública, administração interna, status, disponibilidade e total configurável.
- Página pública: solicitações de TI, fotos, vídeos, arte, divulgação, cobertura de evento, Chromebooks e outros pedidos.
- Notificações: preferências internas, e-mail quando configurado e rotinas por cron.
- PWA: manifesto, ícones, service worker, instalação mobile e atualização de cache.

## Stack

- Next.js 16 com App Router.
- React 19.
- TypeScript 6.
- Node.js `>=24.15.0 <25`.
- pnpm `11.5.1` com `pnpm-lock.yaml`.
- Tailwind CSS 4.3 com `@tailwindcss/postcss`.
- Radix UI para primitivas acessíveis.
- lucide-react para ícones.
- Drizzle ORM com Neon PostgreSQL.
- Autenticação própria com cookie HTTP-only e JWT assinado por `jose`.
- Zod para validação.
- date-fns e date-fns-tz para datas em `pt-BR` e `America/Sao_Paulo`.
- Vercel para deploy e crons.
- Neon PostgreSQL para dados.

O runtime é estritamente Node 24.x LTS. O projeto usa `.node-version`, `.nvmrc`, `engines` e `engine-strict=true` para evitar builds em Node Current.

Tailwind 4 usa tema CSS-first em `src/app/globals.css`; não há mais `tailwind.config.js`. A variante `dark` é baseada na classe `.dark`, pois o Helper usa alternância manual de tema.

## Mudanças da Versão 0.2.9

- Respostas rápidas ganharam rota própria em `/respostas-rapidas`, com criação, edição, desativação, reativação, escopo por área e contador de uso.
- Comentários de tickets agora podem inserir uma resposta rápida ativa e compatível com a área da demanda.
- O backend valida o escopo da resposta antes de registrar o comentário, incrementa uso e grava o histórico da demanda.
- Navegação principal e Command Palette incluem a nova biblioteca.
- Service worker atualizado para cache `helper-static-v15`.

## Mudanças da Versão 0.2.8

- Selects e menus Radix agora limitam altura em telas baixas para reduzir estouro em mobile e PWA.
- Ações de calendário em Agenda deixaram de usar links fictícios e passaram a botões com nome acessível.
- Estados inválidos de selects/textareas e marcadores decorativos de badges/status foram reforçados.
- Modal de visões salvas e teste de e-mail nas configurações ganharam labels mais claros.
- Ações compactas de Chromebooks ficaram mais descritivas para leitores de tela e o service worker foi atualizado para `helper-static-v14`.

## Mudanças da Versão 0.2.7

- Botões de mostrar/copiar senha voltaram para a ordem de foco por teclado.
- Formulários de senha e criação de usuário reforçam estados de erro associados aos campos.
- Calendário, ações em lote de tickets e detalhe de demanda ganharam nomes acessíveis em controles compactos.
- Menu mobile autenticado e barra flutuante de ações em lote ganharam rolagem controlada para telas baixas.
- Comentários e notificações quebram textos longos com mais segurança em mobile.
- Toasts respeitam safe area em PWA e o service worker foi atualizado para `helper-static-v13`.

## Mudanças da Versão 0.2.6

- Kanban ganhou ação "Mover para" nos cards como alternativa acessível ao arrastar.
- Formulários de tickets, agenda, marketing e Chromebooks associam labels aos selects Radix.
- Solicitações públicas e reserva pública de Chromebooks associam erros de contato/período aos campos envolvidos.
- Layout público, layout autenticado, prompts PWA e barra de ações em lote respeitam safe area em modo instalado.
- Notificações não dependem apenas de cor para indicar leitura, e a atividade recente quebra melhor em mobile.
- Metadados operacionais atualizados para Helper 0.2.6 e service worker `helper-static-v12`.

## Mudanças da Versão 0.2.5

- Chromebooks ganhou filtros rápidos para hoje, amanhã, pendentes e confirmados.
- Chromebooks passou a exportar CSV da lista filtrada de agendamentos.
- Notificações agora permitem marcar uma notificação individual como lida e filtrar a inbox por não lidas.
- Agenda passou a expor filtros por área e status, com estado vazio específico para busca sem resultado.
- Metadados operacionais atualizados para Helper 0.2.5 e service worker `helper-static-v11`.

## Mudanças da Versão 0.2.4

- Formulários e ações assíncronas de Chromebooks, Agendamentos, Marketing e Gravações agora mostram erro claro quando a Server Action falha inesperadamente.
- Botões de envio exibem estado de progresso como "Enviando...", "Salvando..." ou "Criando...".
- Botões de ícone em agendamentos, calendário editorial e gravações ganharam nomes acessíveis e disabled durante ações pendentes.
- Calendário editorial rejeita datas impossíveis, como 31/02, e o formulário limita o dia conforme o mês selecionado.
- Service worker atualizado para cache `helper-static-v10`.

## Mudanças da Versão 0.2.3

- `pnpm typecheck` agora executa `tsc --noEmit --incremental false`, evitando travamento por cache incremental local durante validações.
- Metadados operacionais atualizados para Helper 0.2.3 em package, aplicativo, documentação, changelog e memória.
- Service worker atualizado para cache `helper-static-v9`.

## Mudanças da Versão 0.2.2

- Rate limit das solicitações públicas agora acontece antes das validações de contato e agenda, reduzindo envio repetido inválido.
- Agenda pública rejeita horário já passado no mesmo dia em `America/Sao_Paulo`.
- Formulários públicos marcam contato, data e horários obrigatórios diretamente no HTML quando o backend já exige esses dados.
- Logs estruturados redigem campos sensíveis, tokens e strings de conexão antes de escrever no console.
- Rate limit normaliza chaves longas ou com caracteres de controle para evitar crescimento abusivo de buckets.
- Versionamento operacional alinhado em `package.json`, `src/lib/version.ts`, README, MEMORY, CHANGELOG, `.env.example` e PWA.
- Service worker atualizado para cache `helper-static-v8`.

## Mudanças da Versão 0.2.0

- Migra oficialmente o projeto de npm para pnpm 11.5.1 via Corepack.
- Remove `package-lock.json`, passa a versionar apenas `pnpm-lock.yaml` e ajusta CI/Vercel para `pnpm install --frozen-lockfile`.
- Atualiza Node LTS para 24.15.0+ e mantém a produção fora da linha Current.
- Aplica patches estáveis em Next.js, React, React DOM, plugin ESLint do Next, tipos React e `typescript-eslint`.
- Adiciona `@playwright/test` como dependência direta para testes reais em Chromium com pnpm.
- Revisa o visual operacional com raio máximo de 8px em cards/superfícies e menos sombra decorativa.
- Reforça CSP de produção removendo `unsafe-eval` e define cache control explícito para service worker e manifesto.
- Força `postcss 8.5.15` no lock pnpm para eliminar a vulnerabilidade transitiva trazida pelo Next.
- Atualiza PWA para cache `helper-static-v7`.

## Mudanças da Versão 0.1.6

- Dashboard ganhou Entrada externa para controlar tickets públicos e reservas públicas de Chromebooks pendentes.
- Card "Top resolvedores" removido; no lugar entram lembretes operacionais acionáveis.
- Formulários públicos passam a exigir contato para retorno, confirmação e triagem.
- Reservas públicas de Chromebooks agora disparam notificação interna para administradores.
- Página pública de solicitações explica protocolo, contato e triagem interna.
- `MEMORY.md` documenta contexto de operação, revisão visual e regras de versão.
- `STACK.md` concentra runtime, stack, domínios, deploy, banco e comandos de qualidade.

## Mudanças da Versão 0.1.5

- Formulário público de solicitações com validação de agendamento antes do envio, erro inline e contador de descrição.
- Reserva pública de Chromebooks com data mínima, validação imediata de período, erro inline, contador de observações e mensagens de recuperação.
- Administração de Chromebooks preserva contato do solicitante ao editar reservas e exibe contato/protocolo na lista.
- Dashboard mobile ganhou resumo operacional de entradas, resoluções, fila e área mais carregada.
- Ações em lote de tickets agora notificam autores e responsáveis quando status, responsável ou arquivamento mudam.
- Status administrativo do sistema passa a refletir falha real de banco.
- Testes unitários cobrem a validação pública de agendamento.

- Migração de Tailwind 3.4 para Tailwind 4.3 com `@tailwindcss/postcss`.
- Tokens de cor, radius, sombra, fonte e opacidade movidos para `@theme inline`.
- Runtime travado em Node 24.x com `engine-strict`.
- Dependências diretas atualizadas e pacote Radix Popover removido por falta de uso.
- Notificações internas agora falham de forma não bloqueante e registram log estruturado.
- Service worker atualizado para cache `helper-static-v6`.

## Estrutura

- `src/app`: rotas, páginas, layouts, loading states, API routes e crons.
- `src/actions`: server actions de domínio.
- `src/components`: UI reutilizável, layout, Kanban, tickets, dashboard e PWA.
- `src/db`: conexão, schema Drizzle e seed.
- `src/lib`: regras de negócio, copy, validações, e-mail, rate limit, datas, marca e utilitários.
- `database/schema.sql`: schema SQL idempotente para preparar ou recuperar banco.
- `public`: favicon, logo, ícones PWA, Open Graph e service worker.
- `scripts`: build controlado, smoke test, geração de ícones e setup do banco.
- `tests`: testes unitários das regras críticas.
- `.github/workflows`: CI com lint, typecheck, testes e build.

## Instalação Limpa

```bash
git clone https://github.com/vhonorato02/helper.git
cd helper
git checkout main
pnpm install --frozen-lockfile
```

Resultado esperado:

- pnpm instala sem warning relevante.
- Apenas `pnpm-lock.yaml` existe como lockfile.
- `pnpm audit` não encontra vulnerabilidades.

Se falhar:

- Confirme que `node -v` retorna Node 24.x.
- Apague `node_modules` e rode `pnpm install --frozen-lockfile` novamente.
- Não volte para npm sem decisão explícita de manutenção.

## Variáveis de Ambiente

Crie `.env` para scripts que usam `--env-file=.env` e `.env.local` para desenvolvimento Next.js.

Modelo:

```bash
cp .env.example .env
cp .env.example .env.local
```

Obrigatórias:

- `DATABASE_URL`: conexão Neon com SSL.
- `DATABASE_URL_UNPOOLED`: conexão direta Neon, usada como fallback e em operações sensíveis.
- `DATABASE_TIMEOUT_MS`: timeout de conexão.
- `AUTH_SECRET`: segredo forte, com pelo menos 32 caracteres.
- `APP_URL`: URL canônica para e-mails e links.
- `NEXT_PUBLIC_SITE_URL`: URL pública usada por metadados.
- `CRON_SECRET`: segredo dos crons.

Bootstrap e seed:

- `BOOTSTRAP_ADMIN_USERNAME`: usuário admin inicial.
- `BOOTSTRAP_ADMIN_DISPLAY_NAME`: nome exibido.
- `BOOTSTRAP_ADMIN_PASSWORD`: senha inicial forte.
- `BOOTSTRAP_SECRET`: segredo da rota `/api/admin/bootstrap`.

E-mail:

- `GMAIL_USER`: remetente SMTP.
- `GMAIL_APP_PASSWORD`: senha de app do Google.
- `NOTIFICATION_TO_EMAILS`: destinatários gerais.
- `NOTIFICATION_TI_EMAILS`: destinatários de TI.
- `EMAIL_TIMEOUT_MS`: timeout SMTP.

Nunca use segredo com prefixo `NEXT_PUBLIC_`. Tudo com esse prefixo pode aparecer no navegador.

## Banco e Neon

O Helper usa Neon PostgreSQL. Production, Preview e Development devem apontar para bancos ou branches separados.

Separação recomendada:

- Production: branch Neon de produção, com dados reais.
- Preview: branch Neon temporária ou branch dedicada de prévia.
- Development: branch local/dev, sem escrever em produção.

Validação de conexão:

```bash
pnpm db:setup
```

Resultado esperado:

- `Database schema applied (...) statements.`
- Nenhuma tabela crítica ausente.
- Nenhuma migration destrutiva.

O que o setup faz:

- Executa `database/schema.sql`.
- Cria tipos, tabelas, índices e dados base de forma idempotente.
- Não apaga dados existentes.

Se falhar:

- Verifique host, usuário, senha, database e `sslmode=require`.
- Confirme se `DATABASE_URL` e `DATABASE_URL_UNPOOLED` apontam para o ambiente certo.
- Rode uma consulta simples no Neon antes de tentar build.
- Não aponte Preview para Production para “resolver rápido”.
- Não rode comando destrutivo sem backup.

Consultas úteis:

```sql
select current_database(), current_user, now();
select count(*) from users;
select count(*) from tickets;
select count(*) from chromebook_bookings;
select total_chromebooks from chromebook_settings where id = 'default';
```

## Rodar Localmente

```bash
pnpm dev
```

Acesse:

```bash
http://localhost:3000
```

Resultado esperado:

- `/login` abre sem erro.
- `/solicitar` abre sem login.
- `/solicitar/chromebooks` abre sem login.
- Rotas internas redirecionam para login quando não autenticado.
- Console do navegador não mostra erro.

## Scripts

### `pnpm dev`

Inicia o Next.js em modo desenvolvimento.

Use quando estiver implementando ou testando no navegador.

Se falhar:

- Verifique `.env.local`.
- Confirme se o banco responde.
- Veja o terminal do Next.js e o console do navegador.

### `pnpm build`

Executa `scripts/next-build.mjs`, limpa `.next` e roda `next build`.

Use antes de commit, push ou deploy.

Resultado esperado:

- Build concluído.
- Sem warning relevante.
- Sem erro de TypeScript, framework, PWA ou CSS.

Se falhar:

- Leia o primeiro erro real, não apenas o último stack trace.
- Rode `pnpm typecheck`.
- Rode `pnpm lint`.
- Confirme envs obrigatórias.

### `pnpm start`

Sobe a build de produção local.

Use depois de `pnpm build` para validar comportamento próximo ao deploy.

### `pnpm lint`

Executa ESLint em todo o projeto.

Resultado esperado:

- Zero erros.
- Zero warnings.

Se falhar:

- Corrija import não usado, código morto, acessibilidade e regras de React/Next.
- Não use `eslint-disable` sem justificativa pontual.

### `pnpm typecheck`

Executa `tsc --noEmit`.

Resultado esperado:

- TypeScript limpo.

Se falhar:

- Corrija o tipo na origem.
- Não troque para `any` para esconder erro.

### `pnpm test`

Executa testes unitários com `tsx --test`.

Resultado esperado:

- Todos os testes passam.

Se falhar:

- Corrija a regra de negócio ou atualize o teste quando o comportamento esperado mudou.

### `pnpm test:watch`

Roda testes em modo watch.

Use durante desenvolvimento de regras de domínio.

### `pnpm test:smoke`

Sobe um servidor local temporário e valida login público, manifesto, assets, rota pública, redirect de rota protegida e proteção do bootstrap.

Resultado esperado:

- `Smoke tests passed.`

Se falhar:

- Verifique porta ocupada com `SMOKE_PORT`.
- Confirme se a rota pública renderiza sem exigir banco indevido.
- Corrija redirects quebrados antes de deploy.

### `pnpm test:e2e`

Executa Playwright em Chromium desktop e mobile.

Use para validar navegador real, manifesto, página pública e redirects protegidos.

Resultado esperado:

- Todos os projetos Playwright passam.
- Nenhum console error ou warning relevante aparece.

Se falhar:

- Instale os navegadores com `pnpm exec playwright install chromium`.
- Confirme se a porta `3101` está livre ou configure `PLAYWRIGHT_PORT`.
- Para testar um servidor já aberto, use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e`.

### `pnpm icons`

Gera ícones PWA, favicon e imagem Open Graph a partir dos scripts locais.

Use quando alterar identidade visual.

Resultado esperado:

- Arquivos em `public` atualizados.
- Manifesto e service worker continuam apontando para os assets existentes.

### `pnpm db:setup`

Aplica o schema SQL idempotente usando `.env`.

Use em banco novo, branch Neon nova ou recuperação de schema.

Se falhar:

- Não tente “inventar” tabela manualmente.
- Corrija a conexão ou o SQL idempotente.
- Faça backup antes de qualquer ação arriscada.

### `pnpm db:seed`

Cria ou atualiza o admin inicial usando `.env`.

Use apenas em ambiente controlado.

Resultado esperado:

- Usuário admin criado ou atualizado.

Se falhar:

- Confirme `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_DISPLAY_NAME` e `BOOTSTRAP_ADMIN_PASSWORD`.
- Nunca coloque senha no README, issue, commit ou log.

## Checklist de Qualidade

Antes de entregar:

```bash
pnpm install --frozen-lockfile
pnpm audit --audit-level=low
pnpm list --depth=0
pnpm outdated --long
pnpm lint
pnpm typecheck
pnpm test
pnpm test:smoke
pnpm test:e2e
pnpm build
```

Buscas obrigatórias:

```bash
rg -n "PADRAO_REMOVIDO_1|PADRAO_REMOVIDO_2|VERSAO_REMOVIDA" . -g "!node_modules" -g "!.next"
rg -n "TODO|FIXME|HACK|deprecated|console\\.log|console\\.warn|console\\.error" src scripts tests public database
```

Resultado esperado:

- Nenhuma referência visível a marcas antigas.
- Nenhum app version antigo.
- Nenhum TODO crítico.
- Nenhum console indevido no código do navegador.

Observação: lockfiles podem conter versões transitivas de dependências. Diferencie semver de pacote de versão do produto.

## Vercel

O projeto deve estar vinculado ao repositório GitHub oficial.

Configuração recomendada:

- Framework: Next.js.
- Production branch: `main`.
- Node.js: 24.x, compatível com `>=24.15.0 <25`.
- Build command: `pnpm build`.
- Install command: `pnpm install --frozen-lockfile`.

Ambientes:

- Production: banco de produção.
- Preview: banco ou branch Neon de preview.
- Development: banco local/dev.

Nunca deixe Preview escrever no banco real sem decisão explícita.

Variáveis por ambiente:

- Production: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` e e-mail se usado.
- Preview: mesmas chaves, mas apontando para branch Neon segura.
- Development: valores locais.

Validação de deploy:

- Confirme se o commit implantado é o commit esperado.
- Leia os build logs.
- Abra a URL de produção.
- Teste `/login`, `/solicitar`, `/solicitar/chromebooks` e uma rota protegida.
- Verifique console e network.

## PWA

Arquivos importantes:

- `src/app/manifest.ts`
- `public/sw.js`
- `public/favicon.svg`
- `public/favicon-32.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/icon-maskable-512.png`
- `public/apple-touch-icon.png`
- `public/og.png`

Regras:

- Nome e short name devem ser `Helper`.
- Tema principal deve usar preto, branco e cinzas.
- Cores fortes ficam reservadas para status, alerta, prioridade e sucesso.
- Service worker não deve servir HTML autenticado em cache antigo.

Teste Android:

- Abra no Chrome.
- Instale pelo prompt do navegador.
- Feche e reabra pelo ícone.
- Valide splash, nome, ícone, login e refresh.

Teste iOS:

- Abra no Safari.
- Use “Adicionar à Tela de Início”.
- Abra pelo ícone.
- Valide safe area, rolagem, teclado virtual e refresh.

Se PWA parecer preso em versão antiga:

- Abra DevTools.
- Application > Service Workers > Unregister.
- Application > Storage > Clear site data.
- Recarregue.
- Confirme se `public/sw.js` usa cache novo quando assets mudarem.

## Tickets

Fluxo esperado:

- Criar ticket.
- Abrir detalhes.
- Editar título, descrição, área, prioridade, responsável e prazo.
- Salvar.
- Comentar.
- Fechar.
- Reabrir.
- Buscar e filtrar.
- Testar ticket inexistente.

Falhas comuns:

- Mutation salva no banco, mas UI não revalida.
- Status visual diverge do banco.
- Modal abre sem foco.
- Erro de rede aparece como silêncio.

Correção esperada:

- Server action valida e retorna mensagem clara.
- UI mostra loading, sucesso ou erro.
- Cache é revalidado.
- Histórico registra mudança relevante.

## Kanban

Fluxo esperado:

- Arrastar ticket entre colunas.
- Abrir ticket por card.
- Alterar status por ação alternativa quando drag não for ideal.
- Filtrar por responsável, área, prioridade e busca.
- Validar mobile.

Regras:

- Drag deve ter feedback visual.
- Falha deve desfazer mudança otimista.
- Colunas não podem ficar com loading infinito.
- Card precisa ser navegável por teclado.

## Chromebooks

O total de Chromebooks é configurável na administração.

Status que reservam máquinas:

- `pendente`
- `confirmado`

Status que libera máquinas:

- `cancelado`

Validações obrigatórias no backend:

- Data válida.
- Horário final maior que horário inicial.
- Duração mínima de 15 minutos.
- Duração máxima de 8 horas.
- Antecedência mínima configurada na regra atual.
- Quantidade maior que zero.
- Quantidade menor ou igual ao total configurado.
- Bloqueio de sala com reserva ativa no mesmo intervalo.
- Bloqueio de sobreposição parcial quando a soma ultrapassa o total disponível.
- Revalidação ao aprovar reserva pendente.
- Lock persistido para reduzir race condition.

Fluxos para testar:

- Criar reserva válida.
- Criar reserva com horário final menor ou igual ao inicial.
- Criar reserva com quantidade zero.
- Criar reserva acima do total configurado.
- Criar reserva na mesma sala e mesmo horário.
- Criar reserva em sala diferente ultrapassando o total geral.
- Criar reserva com sobreposição parcial.
- Editar reserva sem conflito.
- Editar reserva criando conflito.
- Cancelar reserva e confirmar que disponibilidade foi liberada.
- Filtrar por data e status.
- Conferir resumo do dia e da semana.
- Testar no celular.

## Página Pública

Rotas públicas:

- `/solicitar`
- `/solicitar/ti`
- `/solicitar/midia`
- `/solicitar/arte`
- `/solicitar/cobertura`
- `/solicitar/chromebooks`
- `/solicitar/outra`

Regras:

- Não exige login.
- Validação deve existir no backend.
- Honeypot deve bloquear spam simples.
- Rate limit deve reduzir envio duplicado.
- Mensagens não podem expor stack trace.
- Dados internos não podem aparecer para usuário público.

Teste:

- Envio vazio.
- Envio inválido.
- Envio válido.
- Envio duplicado.
- Mobile.
- Erro de rede.
- Confirmação final com protocolo quando aplicável.
- Recebimento na administração.

## Calendário e Notificações

Valide:

- Criação e edição de itens com data.
- Timezone `America/Sao_Paulo`.
- Notificações internas.
- Preferências do usuário.
- E-mail desativado sem quebrar ticket.
- E-mail configurado enviando para destinatários corretos.
- Crons protegidos por `CRON_SECRET`.

Se notificação falhar:

- Confira `GMAIL_USER` e `GMAIL_APP_PASSWORD`.
- Valide destinatários.
- Verifique logs do servidor.
- Não exponha conteúdo sensível em erro público.

## Segurança

Checklist:

- Rotas administrativas exigem autenticação.
- Ações administrativas conferem permissão.
- Cookies são HTTP-only.
- `AUTH_SECRET` é forte.
- Inputs usam Zod ou validação equivalente no backend.
- E-mails escapam HTML.
- Página pública tem honeypot e rate limit.
- Upload, se adicionado, deve validar tipo, tamanho e destino.
- Logs não imprimem senhas, tokens ou connection strings.
- `.env` não é versionado.
- CORS e endpoints públicos não retornam dados internos.

## Acessibilidade

Checklist:

- Labels associados aos campos.
- Foco visível.
- Navegação por teclado.
- Modais com foco gerenciado.
- Botões com nome acessível.
- Erros próximos aos campos.
- Contraste adequado.
- Alvos de toque confortáveis no mobile.
- Tabelas com cabeçalhos.
- Não depender apenas de cor para comunicar status.

## Performance

Checklist:

- Evitar `SELECT *` em rotas críticas.
- Paginar listas grandes.
- Evitar requisições duplicadas após mutation.
- Revalidar somente paths necessários.
- Não carregar bundle pesado em página simples.
- Usar imports específicos.
- Reduzir renderizações de listas e Kanban.
- Manter imagens públicas otimizadas.
- Evitar cache de HTML autenticado no service worker.

## Diagnóstico Rápido

Erro de banco:

1. Rode `pnpm db:setup`.
2. Consulte `select current_database(), current_user, now();`.
3. Confirme SSL.
4. Confirme ambiente correto.

Erro de migration:

1. Leia o statement que falhou.
2. Confira se é idempotente.
3. Valide permissão do usuário.
4. Faça backup antes de qualquer correção arriscada.

Erro de env:

1. Compare `.env` com `.env.example`.
2. Confirme que Production, Preview e Development têm valores separados.
3. Verifique se nenhuma variável sensível usa `NEXT_PUBLIC_`.

Erro de build:

1. Rode `pnpm typecheck`.
2. Rode `pnpm lint`.
3. Rode `pnpm test`.
4. Rode `pnpm build` novamente.

Nome, ícone ou logo antigo aparecendo:

1. Rode a busca global de marca.
2. Confira `src/lib/copy.ts`, `src/lib/brand.ts`, manifest e assets públicos.
3. Limpe service worker e storage do navegador.
4. Gere ícones novamente com `pnpm icons` se necessário.

## Limpeza do GitHub

Auditoria segura:

```bash
git branch -r
gh pr list --state open
gh release list
git ls-files | rg "(^|/)(node_modules|dist|build|\\.next|coverage|\\.env|dump|backup)"
```

Regras:

- Apague branch remota somente quando ela estiver mesclada ou comprovadamente morta.
- Não apague tag/release histórica sem motivo real.
- Se houver risco, crie tag de segurança antes de remover algo.
- Mantenha `.gitignore` cobrindo envs, build, dumps e dependências.

## Releases

Fluxo recomendado:

```bash
pnpm install --frozen-lockfile
pnpm audit --audit-level=low
pnpm lint
pnpm typecheck
pnpm test
pnpm test:smoke
pnpm build
git status
git add .
git commit -m "chore: release Helper 0.2.8"
git push origin main
git tag v0.2.8
git push origin v0.2.8
```

Depois:

- Aguarde deploy da Vercel.
- Valide logs de build.
- Abra produção.
- Execute smoke manual no navegador.
- Crie release no GitHub com o changelog.

## Operação Diária

- Use a página pública para receber pedidos sem login.
- Use Tickets para triagem e histórico.
- Use Kanban para operação visual.
- Use Chromebooks para reservas com disponibilidade controlada.
- Use Agenda para compromissos datados.
- Use Notificações para alertas internos.
- Revise logs antes de mexer em banco ou env.

Helper 0.2.8 deve permanecer limpo: sem warnings relevantes, sem marcas antigas, sem rotas quebradas, sem cache PWA antigo e sem Preview escrevendo em Production por acidente.
