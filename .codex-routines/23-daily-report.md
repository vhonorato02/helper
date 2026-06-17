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
Routine 23h: Daily Report.

Goal:
Create a daily consolidated report and keep the project memory clean.

Do:
1. Read today's logs in D:\helper\.codex-routines\logs.
2. Check git log for today.
3. Summarize what ran, what failed, what changed, commits, deploys, production validation and remaining risks.
4. Write or update D:\helper\.codex-routines\reports\YYYY-MM-DD.md.
5. Update CHANGELOG.md only if there were meaningful product or technical changes.
6. Commit and push report/changelog only if files changed.
7. Write final report.

Avoid:
- Code changes.
- Refactors.
- Feature work.
- Dependency updates.