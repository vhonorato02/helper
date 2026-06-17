You are working in D:\helper, project Helper.

Operating mode:
Full agent mode.
No manual approval.
No Docker.
No worktree.
Direct to production when changes pass validation.
Work only inside D:\helper unless a global tool cache is strictly necessary.
Do not ask the user to run commands.
Do not ask the user to review intermediate steps.
You must execute, test, commit, push, deploy and validate production by yourself when changes are made.

Global project rules:
- Start with pwd and git status.
- Confirm the working directory is D:\helper.
- Do not use Docker.
- Do not use worktree.
- Use pnpm.
- Do not use npm unless strictly needed for diagnosis.
- Do not use canary, beta, alpha, release candidate or experimental versions.
- Do not expose secrets.
- Do not write real secret values.
- Do not make destructive database changes unless technically unavoidable and documented.
- Do not hide errors with ts-ignore, eslint-disable or any.
- Do not leave relevant warnings behind.
- Do not leave dead code behind.
- Do not leave unused imports behind.
- Do not leave console.log behind unless technically justified.
- Do not create long reports.
- Use tokens for execution, testing and correction.
- Write only short final notes in the log.

Validation policy:
If code changed, run the available commands:
1. corepack enable when necessary
2. pnpm install --frozen-lockfile
3. pnpm lint
4. pnpm typecheck
5. pnpm test
6. pnpm build

If a command does not exist, record it. Do not invent success.
If validation fails, investigate and fix.
If files changed and validation passed:
1. git status
2. git add
3. git commit with a clear message
4. git push main
5. deploy to Vercel production
6. open production
7. validate production
8. check browser console when possible

Browser testing:
Use real browser testing whenever the change affects UI, UX or user behavior.
Do not claim browser testing unless it was actually done.
Do not claim production validation unless production was actually opened.
If login, token, 2FA, missing secret or external permission blocks the task, record the exact blocker and continue with what is accessible.

Product scope:
Do not limit the work to Kanban.
The whole Helper system must be considered continuously:
all pages, all flows, all buttons, all forms, all filters, all searches, all cards, all tables, all modals, all menus, all states, all routes, all APIs, all server actions, all database interactions and all important user actions.

UI direction:
Clean, operational, fast, readable and professional.
Black, white and grayscale as base.
Colors only for status, priority, warning, success, error and operational focus.
No decorative redesign.
No generic template feeling.
No AI-looking interface.
No visual noise.
Routine:
03h, Health.

Main goal:
Make sure the entire Helper system is alive, usable and not broken before the workday starts.

This is not a report routine.
This is not a redesign routine.
This is not a feature routine.
This is not only about Kanban.

Health must test the whole system at a practical level:
critical pages, critical flows, critical buttons, critical forms, critical states, critical routes, critical APIs, production behavior and browser console.

Primary health checks:
1. production availability
2. local build health
3. public pages
4. login
5. logout
6. dashboard
7. tickets
8. ticket details
9. ticket edit actions
10. ticket status changes
11. public request forms
12. Chromebook reservations
13. reservation conflicts
14. filters
15. searches
16. buttons
17. menus
18. modals
19. empty states
20. loading states
21. error states
22. success messages
23. API routes
24. server actions
25. database connection
26. browser console
27. mobile basic layout
28. production runtime errors

Production check:
Open production in a real browser.
Check that the main public page loads.
Check that critical public flows are usable.
Check login when credentials or session are available.
Check dashboard when access is available.
Check browser console.
If something is broken, fix it.

Bug fixing policy:
Fix small and medium health issues.
Fix broken routes.
Fix broken forms.
Fix broken buttons.
Fix broken validation.
Fix console errors.
Fix build failures.
Fix runtime errors.
Fix obvious production regressions.
Fix broken mobile basics.
Fix production issues before cosmetic improvements.

Avoid:
- new features
- big redesigns
- large refactors
- dependency upgrades unless needed to restore health
- database structure changes unless required to fix a real health issue
- visual experiments
- long reports

Minimum browser paths:
1. public entry page
2. main public request form
3. login
4. dashboard
5. tickets list
6. one ticket action when possible
7. Chromebook reservation flow when possible
8. one mobile viewport

If login, credentials, token, 2FA or permission block internal testing:
Record the blocker clearly.
Continue testing what is accessible.

Daily execution:
1. Run pwd.
2. Run git status.
3. Pull or update main safely if needed.
4. Validate local project health with pnpm commands when useful.
5. Open production in a real browser.
6. Test critical flows.
7. Check console.
8. Fix real health problems.
9. Re-run validation.
10. If changed, commit, push, deploy and validate production.
11. Write a short log note only.

Final acceptance:
The routine is successful only if production was checked, critical flows were tested as far as access allowed, and real bugs found were fixed when possible.