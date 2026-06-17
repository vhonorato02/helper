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
Routine 19h: Product, UX and One Useful Improvement.

Goal:
Improve the user experience daily with exactly one useful small or medium improvement.

Think first:
- Does this save time?
- Does this reduce human error?
- Does this reduce clicks?
- Does this make the interface clearer?
- Does this help IT, marketing, requesters or managers?
- Does this improve mobile?
- Does this improve dashboard clarity?

Do:
1. Check git status.
2. Review dashboard, public page, tickets, reservations, forms, empty states, error messages, success messages, mobile and navigation.
3. List internally 5 possible improvements.
4. Choose only 1 improvement for today.
5. Implement it completely.
6. Test in real browser.
7. Run pnpm lint, typecheck, test and build when available.
8. Commit, push, deploy to Vercel and validate production.
9. Write report.

Avoid:
- Giant modules.
- Half-built features.
- Decorative UI changes with no practical value.
- New libraries unless clearly necessary.
- Breaking existing flows.