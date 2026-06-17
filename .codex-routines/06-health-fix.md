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
Routine 06h: Health Fix.

Goal:
Make sure production is alive before the day starts.

Do:
1. Check git status.
2. Validate local project health with pnpm commands when available.
3. Open production in a real browser.
4. Check public page, login when possible, dashboard, tickets, Chromebook reservations and public forms.
5. Check browser console.
6. Fix small bugs only.
7. If changed, run validation, commit, push, deploy and validate production again.
8. Write report.

Avoid:
- New features.
- Large refactors.
- Dependency upgrades.
- Database structure changes.