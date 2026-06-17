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
00h, Heavy Engineering.

Main goal:
Improve the engineering quality of the entire Helper project every day.

This is not superficial maintenance.
This is not only about making the build pass.
This is not focused on a single page.
This is not focused only on Kanban.

Engineering must improve the whole codebase:
architecture, typing, tests, security, performance, accessibility structure, consistency, maintainability, database, APIs, server actions, frontend integration, backend integration and deployment reliability.

Engineering principles:
The code must be clean.
The code must be typed.
The code must be predictable.
The code must be testable.
The code must be secure.
The code must be maintainable.
The code must follow modern best practices for Next.js, React, TypeScript, Node, Drizzle, Neon, pnpm and Vercel.

Audit and improve:
1. package.json
2. pnpm-lock.yaml
3. Next.js configuration
4. TypeScript configuration
5. ESLint configuration
6. Tailwind configuration
7. Vercel configuration
8. PWA configuration
9. src/app
10. src/components
11. src/db
12. API routes
13. server actions
14. authentication
15. authorization
16. cookies
17. JWT handling
18. validation schemas
19. Drizzle schema
20. database queries
21. migrations
22. Neon connection handling
23. public routes
24. internal routes
25. error handling
26. logging
27. security-sensitive code
28. performance-sensitive code
29. test structure
30. E2E tests
31. unit or integration tests when present
32. accessibility-related technical structure
33. imports and exports
34. component boundaries
35. duplicated logic
36. dependency health
37. build pipeline
38. deployment configuration
39. environment variables and examples
40. consistency between frontend, backend and database

Do not accept:
- hidden errors
- meaningless any
- unjustified ts-ignore
- unjustified eslint-disable
- dead code
- dead imports
- unused dependencies
- duplicated business rules
- huge components without reason
- huge functions without reason
- business logic trapped inside visual components
- fragile state handling
- silent failures
- weak validation
- inconsistent database schema
- unsafe server actions
- unsafe API routes
- poor error handling
- temporary code
- console logs left behind
- TODO comments left behind
- FIXME comments left behind
- workarounds that only hide the problem

Dependency policy:
Check whether dependencies have stable patch or minor updates that are safe.
Apply only safe stable updates.
Do not perform risky major upgrades automatically.
Do not use canary, beta, alpha, rc or experimental versions.
If a major upgrade is clearly valuable, record it as a follow-up unless it is small, safe and fully validated.
Remove unused dependencies when confirmed.
Fix dependency issues revealed by pnpm.

Database policy:
Review schema, queries, indexes, constraints and Drizzle definitions.
Do not perform destructive database changes unless technically unavoidable.
Do not drop tables without a safe migration path.
Do not reset production data.
If database structure must change, create a safe idempotent migration.
Validate that the app still works after database changes.
Document any database risk clearly in the log.

Security policy:
Review authentication, authorization, public routes, server actions, API routes, cookies, JWT, environment variables, NEXT_PUBLIC usage, secrets exposure, logs with sensitive data, user input validation, rate limit needs, error messages and stack traces exposed to users.
Fix security issues when safe.
Do not expose secrets.

Performance policy:
Review unnecessary client components, heavy imports, repeated queries, unnecessary re-renders, oversized components, caching opportunities, slow pages, bundle impact, PWA behavior and database query patterns.
Improve performance safely.

Daily execution:
1. Run pwd.
2. Run git status.
3. Pull or update main safely if needed.
4. Audit the whole codebase.
5. Choose the highest-impact technical issue that can be fixed safely today.
6. Fix it properly.
7. Run validation.
8. Test affected user flows in real browser when relevant.
9. If changed, commit, push, deploy and validate production.
10. Write a short log note only.

Final acceptance:
The routine is successful only if the codebase is technically healthier or health was confirmed through real validation.