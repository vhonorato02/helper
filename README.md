# Helper

Versão atual: `Helper 0.1.3`

Helper é uma central operacional para equipes escolares e administrativas acompanharem demandas, tickets, prazos, agenda, solicitações públicas, reservas de Chromebooks, ações de Marketing, rotinas de TI, notificações e histórico de atendimento.

A versão 0.1.3 consolida a identidade Helper, remove a identidade anterior do produto, estabiliza o schema do banco, reforça a separação de ambientes, atualiza PWA e documentação, e mantém a base preparada para uso diário em produção.

## Módulos principais

- Painel com métricas, fila de atenção e demandas recentes.
- Tickets com criação, edição, comentários, histórico, responsáveis, prioridades e prazos.
- Kanban com movimentação por status, filtros e rollback visual em erro.
- Agenda para compromissos e tarefas com data marcada.
- Marketing com calendário editorial, gravações, campanhas e demandas da área.
- Feriados e pontos facultativos de Pindamonhangaba em fonte única no código.
- Chromebooks com reserva pública, administração interna, conflitos e total configurável.
- Página pública sem login para TI, mídia, arte, cobertura, Chromebooks e outras solicitações.
- Notificações internas, e-mail quando configurado, preferências e rotinas por cron.
- PWA instalável com manifesto, ícones, service worker e orientação mobile.

## Stack

- Next.js 16 com App Router.
- React 19.
- TypeScript 6.
- Node.js 24 para CI, Vercel e runtime recomendado.
- npm com `package-lock.json`.
- Tailwind CSS 3.
- Radix UI para primitivas acessíveis.
- lucide-react para ícones.
- Drizzle ORM com Neon PostgreSQL.
- Auth.js/NextAuth 5 beta com credenciais e JWT.
- Zod para validação.
- date-fns e date-fns-tz para datas em pt-BR e America/Sao_Paulo.
- Vercel para deploy e crons.
- Neon PostgreSQL para dados.

## Estrutura de pastas

- `src/app`: rotas, páginas, layouts, loading states, API routes e crons.
- `src/actions`: server actions de tickets, usuários, comentários, notificações, marketing, reservas e solicitações públicas.
- `src/components`: componentes reutilizáveis, UI base, layout, Kanban, tickets, dashboard e PWA.
- `src/db`: schema Drizzle, conexão com Neon e seed.
- `src/lib`: regras de domínio, textos do produto, validações, e-mail, rate limit, datas, feriados, marca e helpers.
- `database/schema.sql`: schema SQL idempotente para recuperar ou sincronizar bancos.
- `public`: favicon, logo, ícones PWA, imagem Open Graph e service worker.
- `scripts`: build controlado, smoke test, geração de ícones e setup do banco.
- `tests`: testes unitários das regras críticas e helpers.
- `.github/workflows`: CI com lint, typecheck, testes e build.

## Pré-requisitos

- Node.js 24.x.
- npm 11 ou compatível com Node 24.
- Acesso ao repositório `https://github.com/vhonorato02/helper`.
- Um banco Neon PostgreSQL com SSL.
- Projeto Vercel vinculado ao GitHub.

Use Node 24 para evitar warning de engine. Rodar com Node 26 pode funcionar localmente, mas gera `EBADENGINE` porque a entrega está padronizada em Node 24.

## Rodar localmente a partir do GitHub

```bash
git clone https://github.com/vhonorato02/helper.git
cd helper
git checkout main
npm ci
cp .env.example .env.local
npm run db:setup
npm run dev
```

Acesse `http://localhost:3000`.

Nunca copie valores reais de produção para o README, para issues ou para commits. Configure segredos apenas em `.env.local`, Vercel ou no painel do provedor.

## Variáveis de ambiente

Obrigatórias para app autenticado:

- `DATABASE_URL`: string do Neon. Pode ser pooled ou unpooled.
- `DATABASE_URL_UNPOOLED`: string direta do Neon. Usada como fallback.
- `AUTH_SECRET`: segredo forte para Auth.js.
- `NEXTAUTH_URL`: URL local ou pública do app.
- `NEXT_PUBLIC_SITE_URL`: URL pública usada em metadados e links.

Operação e bootstrap:

- `BOOTSTRAP_ADMIN_USERNAME`: usuário admin inicial.
- `BOOTSTRAP_ADMIN_DISPLAY_NAME`: nome exibido do admin inicial.
- `BOOTSTRAP_ADMIN_PASSWORD`: senha inicial forte.
- `BOOTSTRAP_SECRET`: token para `/api/admin/bootstrap`.
- `CRON_SECRET`: token usado pelos crons da Vercel.

E-mail:

- `GMAIL_USER`: conta Gmail remetente.
- `GMAIL_APP_PASSWORD`: senha de app do Google.
- `NOTIFICATION_TO_EMAILS`: destinatários gerais.
- `NOTIFICATION_TI_EMAILS`: destinatários de TI.
- `EMAIL_TIMEOUT_MS`: timeout SMTP.

Nunca use variáveis sensíveis com prefixo `NEXT_PUBLIC_`.

## Banco de dados

O app lê `DATABASE_URL` e, se ela estiver vazia, usa `DATABASE_URL_UNPOOLED`.

Para aplicar o schema de forma idempotente:

```bash
npm run db:setup
```

O script executa `database/schema.sql`, cria tipos, tabelas, índices e dados base sem apagar registros existentes.

Validação segura recomendada:

```sql
select current_database(), current_schema(), now();
select table_name from information_schema.tables where table_schema = 'public';
select count(*) from tickets;
select count(*) from users;
select count(*) from chromebook_bookings;
```

Antes de qualquer mudança de região, confirme:

- Qual banco Production usa.
- Qual banco Preview usa.
- Qual banco Development usa.
- Se o banco novo tem schema.
- Se o banco novo tem dados ou está vazio.
- Se há backup, snapshot ou dump.
- Se existe rollback documentado.

Não use banco vazio como produção. Se um banco novo for criado para Preview ou Development, aplique schema, valide conexão e mantenha Production no banco com dados preservados até haver migração planejada.

## Ambientes

Production deve usar o banco preservado, com dados reais e schema completo.

Preview deve usar banco separado, sem escrever nos dados reais.

Development deve usar banco de desenvolvimento ou local. Só use dados de produção localmente quando houver autorização e justificativa documentada.

Checklist por ambiente:

- `DATABASE_URL` conecta.
- Schema tem as tabelas esperadas.
- `AUTH_SECRET` está configurado.
- `NEXT_PUBLIC_SITE_URL` aponta para a URL correta.
- `CRON_SECRET` existe em Production.
- Gmail só é obrigatório se notificações por e-mail estiverem habilitadas.
- Nenhum segredo aparece no frontend.

## Vercel

Configuração esperada:

- Projeto: `helper`.
- Branch de produção: `main`.
- Node.js: `24.x`.
- Build command: `npm run build`.
- Framework preset: Next.js.
- Crons em `vercel.json`.

Comandos úteis:

```bash
npx vercel project ls
npx vercel env ls
npx vercel env pull .env.production.local --environment=production
npx vercel deploy --prod
```

Depois de alterar envs na Vercel, faça novo deploy. Deploys antigos não recebem envs novas retroativamente.

Para rollback, use o painel da Vercel ou promova um deployment anterior que tenha sido validado com o banco correto.

## PWA

Arquivos importantes:

- `src/app/manifest.ts`: nome, short name, tema, ícones, start URL e shortcuts.
- `public/sw.js`: service worker.
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`: ícones Android/PWA.
- `public/apple-touch-icon.png`: ícone iOS.
- `public/favicon.svg` e `public/favicon-32.png`: favicon.

O service worker mantém páginas autenticadas em modo network-only e cacheia apenas assets estáticos. Ao mudar marca ou ícones, incremente o nome do cache para evitar versão antiga instalada.

Android normalmente oferece instalação nativa. iOS depende do menu Compartilhar e tem limitações maiores para push; por isso o app mantém notificações internas e e-mail como fallback.

## Página pública

Rotas públicas:

- `/solicitar`
- `/solicitar/chromebooks`
- `/solicitar/ti`
- `/solicitar/midia`
- `/solicitar/arte`
- `/solicitar/cobertura`
- `/solicitar/outra`

Essas rotas não exigem login. Elas usam validação no backend, honeypot, rate limit, trava contra envio duplicado no cliente e mensagem de sucesso com protocolo quando aplicável.

Não exponha listas internas, dados de usuários ou reservas completas na área pública.

## Chromebooks

Regras críticas ficam no backend:

- Horário final deve ser maior que o inicial.
- Duração mínima: 15 minutos.
- Duração máxima: 8 horas.
- Antecedência mínima: 1 hora.
- Quantidade deve ser positiva.
- Quantidade não pode ultrapassar o total configurado.
- Sala não pode ter outro agendamento sobreposto.
- Soma de reservas ativas não pode ultrapassar o total disponível.
- Feriados sem expediente bloqueiam reservas.
- Ponto facultativo parcial respeita horário de início permitido.

O módulo usa lock persistido no Postgres para reduzir risco de duas reservas simultâneas passarem pela validação ao mesmo tempo.

## Tickets e Kanban

Fluxos esperados:

- Criar demanda em `/tickets?novo=1`.
- Abrir demanda por `/tickets/[code]`.
- Editar detalhes em `/tickets/[code]?edit=1`.
- Alterar responsável, prioridade e status no detalhe.
- Mover cards no Kanban por drag and drop.
- Desfazer movimento pelo toast.
- Exportar CSV na lista de tickets.

Se o Kanban não abrir ou editar:

- Confirme que o link gerado é `/tickets/CODIGO`.
- Confirme que o usuário está autenticado.
- Confirme que a tabela `tickets` existe e tem a coluna `code`.
- Verifique logs de server action e erro de banco.

## Feriados

Fonte única:

- `src/lib/holidays.ts`

O arquivo diferencia feriado nacional, estadual, municipal, ponto facultativo e ponto facultativo parcial. Use os helpers desse módulo em calendário, prazos, marketing, lembretes e Chromebooks. Não replique datas dentro de componentes.

## Notificações

O Helper suporta:

- Notificações internas em `/notificacoes`.
- Preferências em `/configuracoes`.
- E-mail via Gmail quando configurado.
- Crons para resumo, demandas paradas, atrasos e agenda.

Evite ruído: prefira resumos agrupados quando a mesma pessoa receberia muitos avisos semelhantes.

## Scripts

`npm run dev`

Inicia o servidor local. Use durante desenvolvimento.

`npm run build`

Executa build de produção via `scripts/next-build.mjs`. Deve passar antes de deploy.

`npm start`

Sobe o build já gerado. Use para validar produção local.

`npm run lint`

Roda ESLint no projeto.

`npm run typecheck`

Roda TypeScript sem emitir arquivos.

`npm test`

Executa testes unitários em `tests/*.test.ts`.

`npm run test:smoke`

Sobe o app e valida rotas principais de forma simples.

`npm run icons`

Regenera ícones PWA a partir de `scripts/generate-icons.mjs`.

`npm run db:setup`

Aplica `database/schema.sql` no banco configurado.

`npm run db:seed`

Cria ou atualiza o admin inicial a partir das variáveis de bootstrap.

## Validação antes de publicar

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run icons
```

Valide também:

- Login.
- Dashboard.
- Criar demanda.
- Abrir demanda.
- Editar demanda.
- Mover demanda no Kanban.
- Enviar solicitação pública.
- Criar reserva de Chromebooks.
- Bloquear conflito de Chromebooks.
- Ver calendário e feriados.
- Abrir em mobile.
- Instalar PWA.
- Checar `/api/admin/system-status` como admin.

## Troubleshooting

Erro de conexão com Neon:

- Verifique `DATABASE_URL`.
- Confirme `sslmode=require`.
- Teste `select 1`.
- Confirme host, database e role.
- Veja se a branch do Neon ainda existe.

Schema inconsistente:

- Rode `npm run db:setup`.
- Compare tabelas em `information_schema.tables`.
- Confirme índices e colunas novas.
- Não invente colunas apenas para passar build.

Build falhando na Vercel:

- Confirme Node 24.
- Rode `npm ci` localmente.
- Rode `npm run build`.
- Compare envs Production, Preview e Development.

PWA com versão antiga:

- Incremente o nome do cache em `public/sw.js`.
- Rode `npm run icons`.
- Faça novo deploy.
- Reinstale o app se o dispositivo continuar preso em assets antigos.

E-mail não enviado:

- Confirme `GMAIL_USER`.
- Confirme `GMAIL_APP_PASSWORD`.
- Confirme destinatários.
- Veja se o erro é timeout SMTP.
- O ticket deve continuar salvo mesmo sem e-mail.

Reserva de Chromebooks recusada:

- Confira horário inicial e final.
- Confira antecedência mínima.
- Confira feriados.
- Confira sala.
- Confira total configurado.
- Confira reservas sobrepostas.

## Checklist final de aceite

- Nome visível: Helper.
- Versão: Helper 0.1.3.
- Build passa.
- Lint passa.
- Typecheck passa.
- Testes passam.
- Banco Production conecta e preserva dados.
- Preview não escreve no banco de Production.
- Página pública funciona sem login.
- Regras críticas de Chromebooks rodam no backend.
- Kanban abre, edita e move demandas.
- PWA usa ícones e cache Helper.
- README está atualizado.
- Nenhum segredo está versionado.
