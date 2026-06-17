You are working in D:\helper, project Helper.

Operating mode:
- Full agent mode.
- No manual approval.
- No Docker.
- No worktree.
- Changes go directly to production when needed.
- Work only inside D:\helper unless a global tool cache is strictly necessary.
- Do not invent results.
- Do not say something was tested unless it was actually tested.
- Use real browser testing when browser validation is required.
- If something depends on missing login, token, secret, 2FA or external permission, record the blocker clearly.

Rules:
- Start with pwd and git status.
- Do not use canary, beta, alpha or release candidate versions.
- Do not use ts-ignore, eslint-disable or any to hide real problems.
- Do not make destructive database changes unless unavoidable and documented.
- Do not commit if there are no meaningful changes.
- If files changed, run the necessary validation before commit.
- If code changed, run pnpm lint, pnpm typecheck, pnpm test and pnpm build when available.
- If production is changed, deploy to Vercel and validate production.
- Always write a short report in D:\helper\.codex-routines\logs.

Project preferences:
- pnpm, not npm.
- No Docker.
- No worktree.
- Direct to production workflow.
- UI must be clean, operational, fast, readable and professional.
- Base visual style: black, white and grayscale. Colors only for status, priority, warning, success and error.
Routine 00h: Engineering Audit.

Goal:
Keep the technical foundation healthy without rebuilding the whole product every day.

Do:
1. Check git status.
2. Pull/update main safely if needed.
3. Inspect package.json, pnpm-lock.yaml, Next, React, TypeScript, ESLint, Tailwind, Drizzle, Zod, auth, Vercel and PWA.
4. Apply only safe stable patch/minor updates when useful.
5. Do not do risky major upgrades automatically.
6. Inspect architecture, database schema, APIs, server actions, security, performance and dead code.
7. Fix small or medium technical problems.
8. Run pnpm install --frozen-lockfile, lint, typecheck, test and build when available.
9. If changed, commit, push to main, deploy to Vercel and validate production.
10. Write report.

Avoid:
- Feature work.
- Big redesign.
- Experimental dependencies.
- Destructive database changes.