# Helper Stack

## Runtime

- Node.js `>=24.15.0 <25`
- pnpm `11.5.1` com `pnpm-lock.yaml`
- Next.js 16 App Router
- React 19
- TypeScript 6

## Frontend

- Tailwind CSS 4.3 via `@tailwindcss/postcss`
- Tema CSS-first em `src/app/globals.css`
- Radix UI para primitivas acessíveis
- lucide-react para ícones
- sonner para toasts
- PWA com manifest, ícones e `public/sw.js`

## Backend

- Server Actions em `src/actions`
- Route Handlers em `src/app/api`
- Autenticação própria com cookie HTTP-only e JWT assinado por `jose`
- Zod para validação de entrada
- Drizzle ORM
- Neon PostgreSQL

## Domínios Principais

- Tickets: `src/actions/tickets.ts`, `src/components/tickets/*`, `src/app/tickets/*`
- Kanban: `src/components/kanban/*`, `src/app/kanban`
- Solicitações públicas: `src/actions/public-requests.ts`, `src/app/solicitar/*`
- Entrada externa: `src/actions/external-intake.ts`, dashboard e filtros de tickets/chromebooks
- Chromebooks: `src/actions/chromebooks.ts`, `src/app/chromebooks/*`
- Notificações: `src/actions/notifications.ts`, `src/components/notifications/*`, `src/app/notificacoes`
- Lembretes e crons: `src/lib/reminders.ts`, `src/app/api/cron/*`
- Marketing: `src/actions/marketing-events.ts`, `src/actions/recordings.ts`, `src/app/marketing/*`

## Deploy

- Vercel conectado ao GitHub.
- Produção sai de `main`.
- Domínio público: `helperpinda.vercel.app`.
- Validar build logs no Vercel depois de cada push.

## Banco

- Schema principal em `src/db/schema.ts`.
- SQL de recuperação/setup em `database/schema.sql`.
- Scripts: `pnpm db:setup`, `pnpm db:seed`.
- Separar Production, Preview e Development em branches/bancos diferentes no Neon.

## Qualidade

- Unitários: `pnpm test`
- Tipos: `pnpm typecheck`
- Lint: `pnpm lint`
- Build: `pnpm build`
- Smoke: `pnpm test:smoke`
- E2E: `pnpm test:e2e`
