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
19h, Heavy Design.

Main goal:
Improve the entire Helper interface and user experience every day with surgical but meaningful design work.

This is not decoration.
This is not a generic redesign.
This is not only Kanban.
This is not a report routine.
This is product design and operational UX for the whole system.

You must continuously improve:
all pages, all flows, all buttons, all forms, all filters, all searches, all cards, all tables, all modals, all menus, all states, all routes and all important user actions.

Known UI problems to hunt aggressively:
1. cramped filters
2. overlapping elements
3. polluted pages
4. weak hierarchy
5. poor spacing
6. inconsistent alignment
7. dense cards
8. noisy repeated buttons
9. badges competing for attention
10. controls that do not wrap well
11. search fields squeezing filters
12. mobile overflow
13. tablet awkwardness
14. desktop density
15. unclear actions
16. weak empty states
17. weak error states
18. weak loading states
19. low contrast secondary text
20. inconsistent typography
21. rough prototype feeling
22. generic template feeling
23. interface that looks AI-generated
24. pages that require too much cognitive effort

Design principles:
The user must understand what matters first.
The primary action must be obvious.
Secondary information must be secondary.
Filters must be readable and usable.
Buttons must not fight for attention.
Forms must feel clear.
Cards must have hierarchy.
Tables must be scannable.
Mobile must not be an afterthought.
Whitespace must be intentional.
Density must serve work, not suffocate it.
Every visual element must have a job.

Whole-system UX audit:
Review:
1. dashboard
2. tickets list
3. ticket details
4. ticket editing
5. Kanban board
6. public request pages
7. public forms
8. Chromebook reservation pages
9. admin or configuration pages
10. login page
11. navigation
12. header areas
13. filter bars
14. search inputs
15. sort controls
16. cards
17. tables
18. buttons
19. badges
20. status labels
21. modals
22. dropdowns
23. menus
24. tabs
25. empty states
26. loading states
27. error states
28. success states
29. mobile layout
30. tablet layout
31. desktop layout
32. keyboard focus
33. visible focus states
34. contrast
35. spacing
36. typography
37. microinteractions
38. icon usage
39. responsive wrapping
40. scroll behavior

Daily execution:
Do not redesign the entire app in one run.
Do not scatter tiny unrelated edits everywhere.
Audit the whole system, then choose one focused design target with high impact.

Choose one focused target:
1. all filter bars across the app
2. all search and sort controls
3. all form layouts
4. all primary and secondary buttons
5. all cards in one module
6. all empty states
7. all loading and error states
8. all mobile issues in one flow
9. dashboard hierarchy
10. public form clarity
11. reservation UX
12. ticket UX
13. navigation clarity
14. density reduction in one major page
15. consistency pass for badges and status indicators
16. table readability
17. modal and dialog clarity
18. accessibility visual pass

The improvement must be complete for the chosen target.
Do not leave half-improved UI.

Specific expectations:
Filter rows must not overlap.
Filter rows must wrap cleanly.
Search must not squeeze every other control.
Controls must keep readable labels.
There must be consistent height.
There must be consistent spacing.
On mobile, filters must collapse, stack or wrap gracefully.
Cards must be readable.
Title must be clearly dominant.
Metadata must be secondary.
Actions must not be noisy.
Priority must be visible but not screaming.
Owner and time must be readable.
Badges must not dominate.
Forms must have clear labels.
Validation errors must be close to fields.
Success messages must be clear.
Primary action must be obvious.
Secondary action must be calmer.
Icon-only buttons must have accessible labels.
Clickable areas must be large enough.
Mobile must not create horizontal chaos.

Testing:
Use real browser testing.
Test the changed area on desktop, tablet and mobile.
Check browser console.
Check that no existing critical flow was broken.

Viewport expectations:
Check at least:
1. desktop width
2. tablet width
3. 390px mobile width

Daily execution:
1. Run pwd.
2. Run git status.
3. Pull or update main safely if needed.
4. Audit the whole UI.
5. Choose one focused high-impact design target.
6. Improve it completely.
7. Test in real browser.
8. Run validation.
9. If changed, commit, push, deploy and validate production.
10. Write a short log note only.

Final acceptance:
The routine is successful only if the whole system was considered, one focused design target was improved completely, real browser testing was done, validation passed and production was validated if changes were pushed.