# Site Performance Audit — 2026-10-11

## Scope and method

This is a source-level audit of the current `main` tree and the isolated `chore/site-layout-performance` cleanup branch. File size and source references are evidence of complexity, not proof of runtime cost. Runtime cost must be confirmed with browser profiling on the real page and device.

## Findings ranked by expected impact

### P0 — Exhaustive Finesse self-test ran during every gameplay startup

- `games/01/game.js` statically imported `games/01/self-test.js` and called `runTrainerSelfTest()` before `trainer.start()`.
- `games/01/self-test.js` is approximately 42.6 KB and includes broad planner/oracle enumeration and route replay checks.
- That means every player paid its module download/parse cost and synchronous test cost before normal play, even when they were only training.
- First fix on this branch: remove the static import and normal-startup call. The test is now opt-in via `?selftest=1`, loaded dynamically only when explicitly requested. Gameplay regression checks still run in CI.

### P1 — Theme stylesheet has accumulated override debt

- `css/abyssal-space.css` is approximately 54.7 KB, with roughly 330 rule blocks and more than 200 `!important` declarations.
- Several generations of atmosphere, card, layout and component styling coexist. The high override count makes cascade behavior hard to reason about and increases the risk of visual regressions.
- Plan: map selectors and ownership first, consolidate duplicate declarations into a small token layer plus one component rule per concern, and delete only after checking live selector usage and screenshot diffs. Do not blindly minify or mass-delete.

### P1 — Inline CSS is mixed with external stylesheets

- `index.html` contains multiple inline style blocks and also loads base, trainer, settings, prototype-flow, layout, theme and piece-theme stylesheets.
- Layout rules have historically been defined in multiple places; the cleanup branch removes the superseded grid blocks and makes `css/aqua-space-layout-fix.css` the layout authority.
- Plan: move stable page styles into their owning stylesheets, remove duplicates after visual comparison, and keep only truly critical first-paint rules inline if measurements justify them.

### P2 — Legacy and per-game source copies increase maintenance cost

- The repository has several game folders with repeated file blobs. For example, `games/02` through `games/06` share identical engine, settings and renderer blobs in the current tree; `js/settings.js` also shares a blob with several game settings files.
- There is also a separate `js/trainer` engine family alongside `games/01`.
- These copies do not automatically add to the current page's download: the browser follows the active module import graph. Their main proven cost today is maintenance drift and repository size.
- Plan: trace route and import references, identify the canonical implementation, then consolidate with compatibility wrappers only where the public/runtime contracts are verified.

### P2 — CSS motion/effects must remain bounded

- The previous canvas fluid simulation used a perpetual JavaScript animation loop plus particle/caustic calculations. The cleanup branch removes that canvas and its JS/CSS wiring and uses a single slow CSS transform drift for ambience.
- The current design target is decorative movement that never competes with the board, input handling, or frame budget. Motion should respect `prefers-reduced-motion`; avoid adding permanent `will-change` to large page regions without measured evidence.

## Ordered execution plan

1. **Startup work** — keep exhaustive tests out of the production startup path; measure first input and main-thread work.
2. **Theme CSS** — establish ownership/tokens, find duplicate/conflicting selectors, then consolidate the largest/highest-override sections.
3. **HTML/CSS critical path** — reduce inline styling and duplicate stylesheets without reintroducing first-paint layout flashes.
4. **Runtime module graph** — measure transferred/parsed code and remove unused imports or optional modules from startup.
5. **Legacy game copies** — consolidate after verifying every route, import, and test contract.
6. **Visual polish** — refine atmosphere/materials after the render and input path is lean.

## Deployment blocker

Cloudflare's Workers Builds check currently reports a failed build for PR #29's latest head commit, while the GitHub Finesse and Playwright checks passed. Do not merge or claim a live deployment until the exact Cloudflare build error is obtained and resolved. The available repository workflow deploys a separate diagnostics Worker; it does not prove that the public website is deployed.

## Acceptance gates for each section

- One bounded change at a time.
- Finesse/gameplay regression tests pass on the exact head SHA.
- Browser checks pass for desktop and mobile.
- Compare startup/network/long-task/frame behavior before and after on a real browser; do not equate source bytes with performance.
- Verify Cloudflare build/deployment status separately.
- User confirms live appearance and training feel; do not claim zero lag without device-level measurements.
