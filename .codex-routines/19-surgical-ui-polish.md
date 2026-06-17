You are working in D:\helper, project Helper.

Routine 19h: Surgical UI and UX Polish.

Operating mode:
- Full agent mode.
- No manual approval.
- No Docker.
- No worktree.
- Direct to production when changes pass validation.
- Work only inside D:\helper unless a global tool cache is strictly necessary.
- Do not spend tokens writing long reports.
- Do not create broad reports unless needed.
- Focus on fixing visible interface problems.

Main goal:
Every day, perform surgical visual and UX polish on the Helper interface.

The current interface has problems:
- filters are cramped and overlapping
- search and filter bars look broken in some widths
- pages feel visually polluted
- Kanban cards are dense and heavy
- buttons inside cards feel repetitive and noisy
- badges and labels compete for attention
- spacing is inconsistent
- columns feel visually crowded
- header sections take too much space
- mobile and narrow desktop need careful polish
- some elements look like a rough internal prototype, not a polished operational system

Visual direction:
- clean, operational, fast and professional
- black, white and grayscale as base
- colors only for status, priority, warning, success and error
- less visual noise
- better hierarchy
- better spacing
- fewer competing elements
- better alignment
- more readable cards
- clearer filters
- better mobile behavior
- no decorative redesign
- no generic template look
- no AI-looking interface
- no overdesigned gradients
- no useless visual ornaments

Daily scope:
Choose a small, precise visual/UX area and improve it completely.

Priority targets:
1. filter bars
2. search inputs
3. dashboard header
4. Kanban columns
5. Kanban cards
6. card actions
7. badges
8. status labels
9. empty states
10. forms
11. buttons
12. mobile layout
13. tablet layout
14. overflow issues
15. spacing and alignment
16. clickable areas
17. typography scale
18. contrast
19. loading and error states
20. page density

Mandatory process:
1. Start with pwd and git status.
2. Run the app locally if needed.
3. Open the UI in a real browser.
4. Inspect desktop, tablet and mobile widths.
5. Identify the worst visible UI/UX issue today.
6. Fix only a focused set of related issues.
7. Do not create a giant redesign.
8. Do not create new product modules.
9. Do not install a new UI library.
10. Do not change database unless absolutely necessary.
11. Test the changed interface in a real browser.
12. Run pnpm lint, pnpm typecheck, pnpm test and pnpm build when available.
13. If changed, git add, git commit, git push main, deploy to Vercel and validate production.
14. Write only a short final note in the log:
   - what was polished
   - files changed
   - tests run
   - production validated or blocker

Specific checks for the demand board:
- The top filter row must never overlap.
- Filter buttons must wrap cleanly or collapse gracefully.
- Search must not squeeze other controls.
- Sort/filter controls must remain readable.
- Kanban columns must have consistent width and spacing.
- Cards must have cleaner hierarchy.
- Repeated actions inside cards should be less noisy.
- Priority badges must not dominate the card.
- Owner, time and metadata must be readable but secondary.
- Drag handle must not visually compete with the title.
- Column headers must be compact and aligned.
- Mobile view must not create horizontal chaos.

Rules:
- Do not use canary, beta, alpha or release candidate versions.
- Do not hide errors with ts-ignore, eslint-disable or any.
- Do not claim browser testing without actually testing.
- Do not claim production validation without opening production.
- Do not commit if there are no meaningful changes.
- Do not waste output on a long report.
- Be surgical.
- Make the UI better today.