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


## Second audit — cohesion and unintended runtime work (2026-10-11)

Baseline: `main` at `c9cc2fbac24f766c57048ab787b5b2919799d50b`, after the first cleanup.

### Confirmed findings

- **Runtime-generated stylesheet:** `games/01/game.js` created a style element on every page startup and assembled 16.3 KB of CSS through six concatenated string literals. This mixed presentation/layout ownership into the gameplay module and caused an avoidable JS-to-DOM style-injection step before training started.
- **Duplicate layout generations:** the injected CSS contained several overlapping desktop/mobile grid definitions that repeatedly overrode earlier rules, including repeated `!important` declarations. The intended final responsive layout was already expressed in the last block; earlier layout drafts were redundant.
- **Safe bounded fix on `audit/site-cohesion`:** moved session-stat presentation into `css/session-stats.css`, linked it with the page stylesheets, removed runtime style construction, and consolidated the repeated layout drafts into one responsive layout authority. The stylesheet shrank from 16.3 KB of CSS literals to about 8.3 KB of CSS while preserving the existing stats markup and controls. This is a source-size reduction; runtime performance still needs browser measurement.
- **Expected runtime activity, not random bloat:** the trainer's requestAnimationFrame loop is the active game simulation and stops when the game ends; rendering is gated by `renderDirty`. Keyboard, blur, mobile-control, theme-picker and settings listeners support visible features. The toast timeout is event-triggered, not a permanent timer. These should not be removed without changing behavior.
- **No evidence from this source pass that every legacy game folder executes on this page.** The active entry point is `games/01/game.js`; duplicate game folders primarily need import/route tracing before any deletion. Do not equate repository copies with browser startup cost.

### Remaining audit order

1. Run CI on the exact PR head after moving and consolidating the CSS; inspect responsive layout behavior at desktop and mobile widths.
2. Audit the remaining `index.html` inline CSS and `css/abyssal-space.css` for conflicting ownership and dead selectors, one bounded section at a time.
3. Trace imports and page references before removing any legacy module or feature.
4. Measure first input, startup main-thread tasks, transferred bytes, and frame/input latency in a real browser. Do not claim zero lag from source inspection alone.

The second-audit cleanup was merged through PR #30 at commit `067ccf148b23f40c6c6c1e075b58f21ca54cf298` after Finesse regression and Playwright gameplay/mobile-layout checks passed. Merge is not proof of production deployment; the live website remains unverified.

## Deployment blocker

Cloudflare Workers Builds reported failed previews for PR #29 and again for the second-audit PR #30 head (`bf93189`) on service `180trainertool`. The exact error is available in the [Cloudflare build log](https://dash.cloudflare.com/?to=/9965aaa4ea53734bec1392b232330098/workers/services/view/180trainertool/production/builds/e349ad2b-bb2a-4efb-aa0a-55ab394bccf8). This preview failure does not, by itself, establish whether the public static website deployment succeeded or failed. No production deployment record was available through the repository workflows checked here, and `https://180436.xyz/` could not be verified through the available browser check. Identify the actual production website deployment target and verify its build separately before claiming a live release. The repository workflow in `.github/workflows/deploy-diagnostics-worker.yml` deploys a separate diagnostics Worker.

## Acceptance gates for each section

- One bounded change at a time.
- Finesse/gameplay regression tests pass on the exact head SHA.
- Browser checks pass for desktop and mobile.
- Compare startup/network/long-task/frame behavior before and after on a real browser; do not equate source bytes with performance.
- Verify Cloudflare build/deployment status separately.
- User confirms live appearance and training feel; do not claim zero lag without device-level measurements.

## Third audit — protected SEO and runtime/CSS ownership map (2026-10-11)

### Protected metadata — verified present and intentionally untouched

The current `index.html` contains the document title, meta description, robots directive, canonical URL, theme color, Open Graph title/description/type/site name/URL, Twitter card/title/description, and JSON-LD describing the WebSite and SoftwareApplication. These are intentional page metadata, not cleanup targets. No SEO metadata or structured data was removed in this audit.

### Actual page runtime entry points

- `games/01/game.js` is the page's game module entry point. It imports the active game engine, mode, settings, and piece helpers.
- `js/planet-themes.js` is loaded by the page with `defer` and owns the theme picker behavior.
- Two inline scripts own the visible rules controls and customizable mobile controls. They use the page's existing controls, settings persistence, and trainer events; they are not free-running background loops.
- The exhaustive `games/01/self-test.js` module is dynamically imported only for the explicit `?selftest=1` opt-in path. It is not part of normal startup.
- `js/app.js` and `js/home.js` are not loaded by the current `index.html`. Their presence in the repository does not mean the browser downloads or executes them on this page. Do not delete them solely to claim a runtime speedup.

### CSS overlap review — no blind deletion

The current page loads base, trainer, settings, prototype-flow, layout-fix, theme, and session-stat styles. The scan found selectors shared between style owners, including the inline page rules and `css/abyssal-space.css`. These overlaps are not automatically dead code: several define different properties, media-query behavior, theme materials, accessibility states, or intentional later overrides. The prototype-flow and layout-fix files also have overlapping selectors where one file supplies properties the other does not.

No CSS selector or stylesheet was removed based only on name overlap. A safe deletion needs computed-style or screenshot comparison at desktop/mobile breakpoints and checks for runtime-generated classes. This is deliberately more conservative than mass-cleaning `!important` declarations, because the latter can change the actual page even when selectors look duplicated.

### Next safe optimization gate

1. Establish a browser baseline for first input, long tasks, transferred CSS bytes, and desktop/mobile screenshots.
2. Compare computed styles and responsive screenshots before removing or merging a specific CSS rule group.
3. Re-run the Finesse regression and Playwright gameplay/mobile checks on the exact change head.
4. Keep SEO metadata, accessible labels, reduced-motion behavior, theme selection, settings persistence, and mobile-control editing as explicit regression checks.
5. Verify the production static-site deployment separately; GitHub checks and a Worker preview are not proof that the public site is live.
