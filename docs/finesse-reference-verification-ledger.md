# Finesse Core: Reference Verification Ledger

This ledger records what has been checked and what remains unproven. An in-repository test passing is not the same as matching an external reference, and a browser test using the production planner is not an independent oracle.

## Completed on `rebuild/finesse-core`

- Added `games/01/finesse-reference-fixtures.js`: static expected cell coordinates and spawn origins for all seven pieces and four orientations.
- Added `games/01/finesse-reference-test.js`: compares production geometry to separately authored constants, checks four cells per orientation, duplicate cells, spawn origins, and orientation arithmetic.
- Added `games/01/finesse-kick-execution-reference-test.js`: forces the production rotation code through every reachable ordered kick candidate using independently generated blocker boards and boundary cases. It also proves when a later candidate is structurally unreachable because an earlier candidate is guaranteed legal whenever the start and target are legal.
- Added `.github/workflows/finesse-reference-tests.yml` to run geometry, kick-table, independent shortest-path, collision, and ordered-kick-execution checks.
- Added `games/01/finesse-kick-reference-fixtures.js` and `games/01/finesse-kick-reference-test.js` for static SRS+ I-piece and JLSTZ 90°/direct-180 kick-order fixtures.
- Added `games/01/finesse-oracle-reference-test.js`: an independent transition/collision/shortest-path oracle that uses static geometry and kick fixtures. It seeds each piece at its independently specified spawn origin, then compares planner target identities and minimum costs across 84 piece/board fixtures: all seven pieces across four curated boards and eight deterministic generated stacks. It compares collision behavior across 1,960 piece/orientation/position cases.
- Added `games/01/finesse-browser-reference-test.js` and a dedicated `.github/workflows/finesse-browser-reference.yml`, kept separate from the diagnostics harness. Playwright directly presses real keys against the local game and checks the resulting active state, lock placement, and finesse score against four independently specified routes.
- Added `games/01/finesse-planner-browser-oracle-test.js`: an end-to-end Playwright test that begins each of the seven pieces at its independent spawn origin, compares the actual planner prompt and route cost to the independent oracle, executes the displayed route with real keyboard events (including DAS), and verifies exact locked cells and exactly-once finesse-perfect scoring.
- Corrected the production I-piece kick arrays on this isolated branch to match the normalized reference fixture; updated the colocated regression expectations so the old vanilla-SRS I table is no longer mislabelled as SRS+.
- **Verified initial CI:** [reference-fixture workflow](https://github.com/mandrop333-create/180180/actions/runs/37982829776) passed on commit `b6e54b8d8d091539e7322578ba2ee3f25fe67e26`. This proved only the initial geometry layer.
- **Verified expanded CI:** [reference workflow on latest branch head `00c7dfe`](https://github.com/mandrop333-create/180180/actions/runs/37987698771) passed. It checks all seven piece geometries/spawn origins; 24 static kick-table groups; the independent planner oracle across 84 piece/board fixtures and 1,920 target-cost comparisons; 1,960 collision states; and 322 reachable ordered kick candidates. An additional 46 later candidates were proven structurally unreachable as first-valid kicks and recorded, rather than falsely tested. The corpus includes overhang/tunnel and eight deterministic high-stack boards.
- **Verified end-to-end planner browser oracle:** [Playwright run on latest branch head `00c7dfe`](https://github.com/mandrop333-create/180180/actions/runs/37987691867) passed for all seven pieces from their real spawn origins. Each actual planner target existed in the independent reachable-target map, the displayed route cost matched the oracle minimum, real key events reached the target, locked cells matched the independent geometry fixture, and scoring recorded exactly one finesse-perfect placement with zero faults. The test reported zero browser page errors. This first pass isolates the planner prompt and route cost on an empty board; the later timing acceptance test covers representative stacks and active gravity.
- **Verified finite-gravity stack execution:** [Playwright run on latest branch head `00c7dfe`](https://github.com/mandrop333-create/180180/actions/runs/37987691867) passed five scenarios with gravity actively advancing every 100 ms: I and T on an empty board, T under an overhang, I on a generated high stack, and J on another generated stack. Every actual prompt matched an independently reachable target and minimum cost; real key events reached the target; the final board and line-clear result matched an independent board simulation; scoring was exactly one finesse-perfect placement with zero faults and no browser errors.
- **Verified direct 180 under active gravity and lock delay:** [Playwright run on latest branch head `00c7dfe`](https://github.com/mandrop333-create/180180/actions/runs/37987691867) passed the seven-piece independent planner test, five finite-gravity/stack scenarios, a direct I-piece 180° route on a generated high stack, and a grounded O-piece lock-delay reset case. The direct-180 case used a one-input target independently verified by the oracle, executed the real `A` key while gravity advanced, and matched the final board and score. The lock case began with 80% of its timer elapsed; the planned DAS-plus-tap route remained valid, movement reset the near-expired timer, and the final lock scored exactly once with zero faults. Browser page errors: zero.
- **Test-input calibration:** browser tests use a nonzero DAS threshold so a quick tap cannot accidentally become a wall slide under ARR=0. A zero-DAS test setup exposed a timing flake and was corrected before the final passing run.
- **Verified existing Playwright diagnostics:** [prompt-requested Playwright run](https://github.com/mandrop333-create/180180/actions/runs/37982829570) passed on the initial isolated branch. It exercised the current game locally in Chromium, including finesse prompts, equal-cost alternate routes, tap-versus-DAS equivalence, and lock/scoring assertions across piece/board fixtures. It did not test the deployed live site.
- **Verified independent Playwright routes:** [dedicated browser-reference workflow](https://github.com/mandrop333-create/180180/actions/runs/37987691867) passed on the isolated branch. All four independently specified scenarios passed: O one-tap horizontal movement, T clockwise rotation, I SRS+ clockwise kick, and I direct 180 kick. Each produced exactly one finesse-perfect placement, zero finesse faults, expected locked cells, and zero page errors. The isolated cases verify input/lock behavior; active-gravity and lock-delay cases are covered separately below.
- **Read-only live-site comparison:** [live Playwright smoke test](https://github.com/mandrop333-create/180180/actions/runs/37984428424) passed the O one-tap and T clockwise cases, but the live I-piece clockwise case remained at `x=4` instead of the reference fixture's `x=5`, and the direct-180 case remained at `(x=4,y=0)` instead of `(x=5,y=1)`. No browser page errors occurred. This demonstrates a live-versus-reference mismatch in both I-piece kick cases; it does not by itself prove that these are the exact original user-reported symptom. The test ran from temporary branch `test/live-finesse`; no production files were changed.
- **Remaining Playwright limitation:** the original four-route browser harness still injects targets/routes and freezes gravity. The new seven-piece planner-oracle test checks actual prompts/minimum costs from spawn; the timing test covers five representative empty/stack cases, direct 180 under gravity, and a near-expired lock timer. These are representative tests, not exhaustive coverage of every tuck or timing state.
- **Explicit model boundary:** the planner does not currently include soft drop as a route transition. TetrisWiki's TETR.IO 180-kick example demonstrates a tuck that requires soft drop before the 180 input. The current target generator therefore must not be claimed to enumerate every placement reachable in TETR.IO; full tuck coverage requires a separate vertical-state/soft-drop model and independent oracle.

## External sources consulted

1. TetrisWiki, Movement finesse: https://tetris.wiki/Movement_finesse
   - Confirms multiple distinct finesse models exist (including 0G, 20G, and wall finesse). It does not define this trainer's bespoke direct-180 cost policy.
2. TetrisWiki, TETR.IO: https://tetris.wiki/Tetr.io
   - Describes default SRS+ modifications and separates TETR.IO's default 180 table from optional SRS-X. Its 180-kick examples include a tuck requiring soft drop before the half-turn, confirming that a spawn-only action search is not a complete tuck enumerator.
3. TETR.IO official mechanics FAQ source: https://github.com/tetrio/faq/blob/main/mechanics.html
   - Documents DAS/ARR/DCD and SRS mechanics; it does not provide a convenient machine-readable complete kick fixture.
4. TetrisWiki, conventional SRS: https://tetris.wiki/Super_Rotation_System
   - Provides conventional 90-degree kick tables and coordinate conventions. This is a comparison baseline, not proof of SRS+ equivalence.
5. TETR.IO issue tracker discussion of SRS+: https://github.com/tetrio/issues/issues/506
   - Historical discussion corroborates that SRS+ changed I-piece kick behavior, but does not provide a complete table in text.
6. Third-party S-Finder rotation implementation, `MinoRotationImpl.java`: https://gist.github.com/torchlight/1832786cf053daa51bf188110b764090
   - Explicitly describes its SRS+ I-kick ordering as used in TETR.IO and includes a separate SRS+-style 180 table. This is a useful independent cross-check, not an official TETR.IO implementation. Its pivot/origin and vertical-coordinate conventions must be normalized before comparing raw offsets to this trainer.

## Findings that need follow-up

- The first run of the planner regression suite failed immediately after the kick change because the existing self-test still asserted the old I-kick table. That assertion was updated to the independent reference, and the latest run passed.

- The isolated branch now uses the S-Finder SRS+ ordered I-piece tables normalized to the trainer's screen-y-down convention. The static table tests and forced-kick execution tests pass against those fixtures. The external source is third-party, however, so exact numeric offsets and pivot/origin compatibility still require a second independent confirmation before calling the rule set authoritative.
- Current Playwright success is evidence that the existing implementation is internally consistent for its tested cases; it is not evidence that the underlying finesse minima or kick rules are correct.

## Verification status

| Area | Status | Why |
|---|---|---|
| Seven piece shapes/orientations | Initial fixture test passes; external fixture provenance still needs review | Static cells are compared to production definitions; canonical diagram and pivot conventions still need review |
| Spawn origins | Independent fixture test passes | Static spawn origins now seed the oracle; external TETR.IO-specific spawn origin confirmation remains open |
| SRS+ I-piece 90-degree kicks | Static reference and forced-execution tests pass | Eight ordered transitions match a third-party S-Finder SRS+ reference after vertical-coordinate normalization; source/pivot compatibility still needs a second independent confirmation |
| SRS+ I-piece direct 180 kicks | Static reference and forced-execution tests pass | Four orientation-specific ordered tables match the same third-party source after vertical-coordinate normalization; source/pivot compatibility still needs a second independent confirmation |
| JLSTZ 90-degree kicks | Not independently verified against a TETR.IO-specific fixture | Current table matches conventional SRS; confirm SRS+ semantics do not alter these transitions |
| JLSTZ direct 180 kicks | Static reference and forced-execution tests pass | Ordered tables align with the S-Finder SRSPlus table after vertical sign conversion; source/pivot compatibility still needs a second independent confirmation |
| Collision/top-out behavior | Independent comparison passes | Reference collision logic is compared with production over walls, floor, top boundary, and occupied cells across 1,960 piece/orientation/position states |
| Minimum route/finesse cost | Independent oracle passes 84 fixtures | Oracle uses static geometry/kicks and independent transitions; compares 1,920 target identities/costs for 7 pieces across 12 board shapes (4 curated plus 8 deterministic generated stacks), max cost 2 |
| DAS/ARR/lock timing | Partially exercised by current Playwright; not independently verified | Need declared timing assumptions and tests against those assumptions |
| Runtime observer and lock-time score | Independent Playwright checks pass for four isolated routes and seven end-to-end planner routes | The seven-piece browser oracle starts at real spawn, checks target and minimum cost against independent expected data, replays real key events, and checks locked cells and exactly-once score; gravity is frozen and the board is empty |
| Live production behavior | Read-only browser comparison found two I-piece kick mismatches | Live site kept I at (4,0) after CW and direct-180; reference fixture expects CW to (5,0) and 180 to (5,1). Original symptom still needs mapping to this concrete discrepancy; no production code changed |

## Next action

1. Confirm the S-Finder reference's pivot/origin convention against a second independent source, especially the direct-180 table; do not call the numeric table authoritative until this is done.
2. Expand the independent oracle beyond the max-cost-2 envelope where the selected trainer rules require it, and add timing-sensitive tests for gravity, DAS/ARR, lock delay, and wall finesse.
3. Expand the timing corpus beyond the current representative cases, and only add soft-drop/tuck routes if the product scope requires full TETR.IO placement reachability.
4. Reproduce the live I-piece kick mismatch with the corrected isolated branch and compare the exact locked cells, then confirm the original user-visible failure is absent before integration or deployment.
5. Preserve the UI and unrelated systems. No merge or production deploy without explicit authorization.

Do not treat current `self-test.js` expectations as independent evidence, because those expectations live beside the implementation. Do not merge or deploy without explicit authorization.

## Formula specification checkpoint — 2026-10-09

- Added `docs/finesse-math-spec.md`, which freezes the first replacement's mathematical contract: state/coordinate convention, collision predicate, move transition, orientation arithmetic, ordered kick selection, landing calculation, physical target identity, unit-cost action model, minimum-finesse objective, BFS assumptions, and separation of planner from runtime observer.
- The contract deliberately scopes the first implementation to the TETR.IO default SRS+ plus default direct-180 rules, not optional SRS-X. It explicitly separates minimum deliberate-input count from DAS/ARR/DCD timing.
- Added `games/01/finesse-t-rotation-reference-test.js` to compare unobstructed T-piece clockwise/counterclockwise cell geometry and a CW→CCW round trip against static reference cells. Added it to the independent reference workflow.
- Verified the independent reference workflow on commit `82fcba95b9065fe1f93fd9467e76ee8ad6fc0af1`: [run 37996375632](https://github.com/mandrop333-create/180180/actions/runs/37996375632) passed, including the new T rotation fixture and all pre-existing independent reference tests.
- Verified the planner regression workflow on the same commit: [run 37996375543](https://github.com/mandrop333-create/180180/actions/runs/37996375543) passed.
- The math-spec documentation commit `250347c1ca7eca8cf9449eff8a584c869fb60352` has passing independent reference and planner regression runs: [reference run 37996583256](https://github.com/mandrop333-create/180180/actions/runs/37996583256) and [planner run 37996583257](https://github.com/mandrop333-create/180180/actions/runs/37996583257).
- The two Playwright workflows for commit `250347c1ca7eca8cf9449eff8a584c869fb60352` were still running at the time of this ledger update. Do not claim their result until queried.
- Remaining formula-adjacent uncertainties are source/pivot compatibility of external kick fixtures and the full runtime input observer matrix. These are recorded in `docs/finesse-math-spec.md`; they are not silently treated as complete.
- No production finesse implementation was changed, no merge to `main` was made, and no deployment was triggered.

## Extended shortest-path and input timing checkpoint — 2026-10-09

- Extended `games/01/finesse-oracle-reference-test.js` from the original cost-2 envelope to a cost-4 cross-check across four boards and all seven pieces. It compares target sets and minimum costs against the independent solver, and checks repeated planner calls return the same canonical route.
- On commit `ccc29c518f02500c1a6e3a08f18d64b4544bc66d`, the expanded independent reference workflow passed: [run 37996725488](https://github.com/mandrop333-create/180180/actions/runs/37996725488); planner regression passed: [run 37996725636](https://github.com/mandrop333-create/180180/actions/runs/37996725636); independent Playwright route fixtures passed: [run 37996725537](https://github.com/mandrop333-create/180180/actions/runs/37996725537).
- Added two browser timing checks in `games/01/finesse-timing-browser-test.js`: (1) held horizontal input is paused after a rotation during the configured DCD window and resumes after the window expires; (2) a short horizontal hold followed by keyup does not continue into a DAS wall-slide.
- On commit `1393855aa9e004b83f59cc6b7564843f591c2f38`, the independent reference workflow passed: [run 37996902496](https://github.com/mandrop333-create/180180/actions/runs/37996902496), and the full independent Playwright route workflow passed, including the active-gravity timing suite with the new DCD and tap-release cases: [run 37996902615](https://github.com/mandrop333-create/180180/actions/runs/37996902615).
- These tests support the implemented runtime's tested DAS/DCD behavior. They do not establish that all possible TETR.IO timing configurations, simultaneous-input combinations, or every official kick fixture have been exhaustively proven.
- No production code was changed in this checkpoint; `main` and deployment remain untouched.

## Lockability and full DCD checkpoint — 2026-10-09

- Found and fixed a target-validity edge case: a rotation may legally kick a piece above the ceiling, where it can rest against a high stack, but the game's lock handler top-outs instead of placing minos if any mino remains above row zero. `games/01/finesse.js` now only emits targets whose four minos can be locked inside the visible field.
- Added an independent ceiling regression to `games/01/finesse-oracle-reference-test.js`. The fixture starts from a legal T spawn, blocks the first two CW rotation candidates, and proves the upward-kicked `(x=2,o=1,y=-1)` state is not offered as a target by either the independent oracle or the production planner.
- The independent reference workflow passed after this change: [run 37997092343](https://github.com/mandrop333-create/180180/actions/runs/37997092343). Planner regression passed: [run 37997098280](https://github.com/mandrop333-create/180180/actions/runs/37997098280).
- Extended the browser timing suite with a spawn-DCD case in addition to post-rotation DCD and short-tap/key-release behavior. The suite passed: [run 37997092349](https://github.com/mandrop333-create/180180/actions/runs/37997092349) and [run 37997098257](https://github.com/mandrop333-create/180180/actions/runs/37997098257).
- The source for TETR.IO mechanics confirms DCD cuts active DAS after a rotation or spawn; this aligns with the runtime behaviors now covered by browser tests. The suite still does not claim exhaustive coverage of every possible simultaneous-input/focus-loss combination.
- Mathematical spec updated to make lockability an explicit target precondition. No deployment or merge to `main` was performed.

## Reconnect / latest verified checkpoint — 2026-10-09

- Latest code checkpoint under validation is `df2436b8c74d64740a9aafd050ec561354193877`. On that commit, the planner regression suite passed: [run 37997207901](https://github.com/mandrop333-create/180180/actions/runs/37997207901); the independent shortest-path/reference suite passed: [run 37997208040](https://github.com/mandrop333-create/180180/actions/runs/37997208040); and the Playwright browser route suite passed: [run 37997208164](https://github.com/mandrop333-create/180180/actions/runs/37997208164).
- The spawn-DCD, post-rotation-DCD, and short-tap/key-release checks are browser-tested. The official TETR.IO mechanics FAQ describes DCD as pausing active DAS after either a rotation or a spawn: https://github.com/tetrio/faq/blob/main/mechanics.html
- Rotation-profile provenance remains bounded rather than absolute: the SRS+ I-kick fixture is independently sourced from the S-Finder implementation at https://gist.github.com/torchlight/1832786cf053daa51bf188110b764090; the TETR.IO mechanics overview describes SRS+ as the default I-piece kick-table modification and distinguishes SRS-X as optional: https://tetrio.wiki.gg/wiki/Mechanics. These sources support the selected table family, but the exact pivot/local-frame compatibility still needs stronger direct-game or authoritative fixture validation before production approval.
- The latest successful tests do not authorize merging or deployment. No production branch was changed.

## Input observer matrix expansion — 2026-10-09

- Added Playwright checks for focus-loss cleanup and simultaneous opposite directions in `games/01/finesse-timing-browser-test.js`.
- Focus-loss test confirms `handleBlur()` clears the held-key set and horizontal repeat state; no movement continues after focus cleanup without a new keydown.
- Opposite-direction test confirms last-pressed direction wins, releasing it restores the still-held opposite direction with a fresh DAS delay, and repeats resume only after that delay.
- Both the independent reference suite and browser route/timing suite passed on commit `c186e93f8dd9184b4c23ac0a08daca8c3d4e7fdb`: [reference run 37997361937](https://github.com/mandrop333-create/180180/actions/runs/37997361937); [Playwright run 37997361908](https://github.com/mandrop333-create/180180/actions/runs/37997361908).
- This improves coverage but is not yet the full input observer matrix. Remaining work includes hold/swaps, rebinds, rotation with held DAS across DCD, repeated key events, browser visibility/focus behavior in a real event loop, and comparison against TETR.IO's precise input timing rather than only this trainer's intended contract.


## Replacement-core isolation and weighted search — 2026-10-09

- Created `games/01/finesse-core.js` as the replacement planner module and changed `games/01/engine.js` to import the planner from it directly. `games/01/finesse.js` is now a compatibility facade only; it no longer contains planner logic. This separates runtime integration from the legacy import path, but the planner algorithm itself still needs further ground-up redesign and validation before the compatibility facade can be deleted.
- Replaced FIFO queue traversal in the isolated core with a binary min-heap ordered by cumulative route cost. This is Dijkstra-style search and avoids relying on the assumption that every action has equal cost. Direct half-turn actions are now only admitted when their configured cost is a positive integer.
- Added a weighted-cost regression to `games/01/finesse-oracle-reference-test.js`: when a direct half-turn costs 3, the same orientation reached through two quarter-turns must be reported at cost 2. Tests for this latest commit are running; do not mark the weighted regression or complete browser suite as passed until their workflow conclusions are checked.
- Earlier tests on commit `a42d79efeae1d97ad4ccf821311f6d9d15a76c4b` passed planner regression ([run 37997973692](https://github.com/mandrop333-create/180180/actions/runs/37997973692)), independent reference fixtures ([run 37997973684](https://github.com/mandrop333-create/180180/actions/runs/37997973684)), and browser route fixtures ([run 37997973681](https://github.com/mandrop333-create/180180/actions/runs/37997973681)). These runs predate the Dijkstra change and do not validate it.
- Current latest implementation commit at the time of this entry: `d54606bdefe7a273f5aaf904615e4a9f36e73a92`. Keep all work on `rebuild/finesse-core`; no merge or deployment to `main` is authorized.
- Next logical work: verify the latest tests; then replace the remaining implementation dependencies with explicit, independently checked transition contracts and expand the weighted oracle. Only after tests directly import `finesse-core.js` and the caller audit shows no remaining dependency on the facade should `finesse.js` be removed.

- Migrated the independent oracle and self-test imports from the compatibility facade to `finesse-core.js`, reducing test reliance on the old module path. The facade remains temporarily until a complete caller audit confirms no remaining dependency.


## Fail-closed target regression cleanup — 2026-10-09

- Corrected planner test fixtures so mock movement callbacks reject out-of-bounds moves atomically. The unbounded mock in the no-lockable-target test could otherwise make wall-directed DAS loop forever; the O-piece fixture also now supplies a valid lockable cell fixture rather than an empty geometry that the new fail-closed contract must reject.
- Latest checkpoint: `405217cfa5c0ac440d81320b5af2e4082646b0f7`.
- Planner regression suite passed on this checkpoint: [run 37999676782](https://github.com/mandrop333-create/180180/actions/runs/37999676782). Independent reference fixtures passed: [run 37999676836](https://github.com/mandrop333-create/180180/actions/runs/37999676836).
- The full browser workflow passed on this checkpoint, including independent route fixtures, actual planner prompts checked against the independent oracle, and active-gravity timing checks: [run 37999676762](https://github.com/mandrop333-create/180180/actions/runs/37999676762). The separate prompt-requested diagnostics workflow was cancelled when a newer run superseded it; it is not counted as a pass.
- These test-fixture repairs do not establish that the core is a complete ground-up rewrite. The replacement still requires independently verified rotation/kick geometry and broader state-space/execution validation. No merge or deployment to `main`.


## Movement-transition hardening — 2026-10-09

- `games/01/finesse-core.js` now validates that a successful horizontal/vertical movement callback changes exactly the requested coordinate and leaves orientation unchanged. Wall-directed DAS and landing descent are bounded by board dimensions, preventing malformed adapters from creating phantom transitions or non-terminating loops.
- Added a planner regression for a movement callback that returns success without changing coordinates. Planner self-tests passed on `746f8717cd448bc20f64a4cf033c553477a90d85`: [run 37999895113](https://github.com/mandrop333-create/180180/actions/runs/37999895113).
- Independent geometry/kick/oracle fixtures passed on the same commit: [run 37999895139](https://github.com/mandrop333-create/180180/actions/runs/37999895139).
- Independent Playwright routes, actual planner prompts checked against the oracle, and active-gravity timing scenarios all passed on the same commit: [run 37999895097](https://github.com/mandrop333-create/180180/actions/runs/37999895097).
- The separate prompt-requested diagnostics run was cancelled when a newer commit superseded it; it is not counted as a pass.
- Targeted import audit confirms `games/01/engine.js` uses `finesse-core.js`, and the inspected finesse reference tests import the core directly or exercise the browser. `games/01/finesse.js` remains a compatibility facade; a full repository-wide caller audit is still required before removal.
- These results validate the current bounded search and selected fixtures, not full external authority for every pivot/kick convention. No merge or production deployment.

## Independent weighted-cost oracle — 2026-10-09

- Expanded `games/01/finesse-oracle-reference-test.js` beyond the single half-turn regression with an independent weighted shortest-path reference using a sorted open list (not the production binary heap). With direct 180 cost raised to 3, the test compares the complete reachable target set and minimum costs against the production Dijkstra planner through cost 3.
- The weighted reference suite passed on `8642c5256572520d76bd3ab5bd2a59e6c2c1d4f3`: [run 38000060396](https://github.com/mandrop333-create/180180/actions/runs/38000060396).
- This validates weighted shortest-path behavior for the tested profile/board, but does not resolve the separately documented external kick/pivot convention uncertainty. No merge or production deployment.

## Verification refresh — 2026-10-09 (commit `40d3b764406d88e157fab0e56ce381db9b79f3e3`)

- Planner regression suite passed: [run 38000602166](https://github.com/mandrop333-create/180180/actions/runs/38000602166).
- Independent reference fixtures passed: [run 38000602184](https://github.com/mandrop333-create/180180/actions/runs/38000602184).
- Independent Playwright route fixtures passed, including the I-piece clockwise and counter-clockwise kick scenarios: [run 38000602165](https://github.com/mandrop333-create/180180/actions/runs/38000602165).
- The additional prompt-requested Playwright run [run 38000602145](https://github.com/mandrop333-create/180180/actions/runs/38000602145) remained pending at the time of this update; it is not counted as a pass.
- The preceding browser failure was traced to a post-lock test-fixture issue: synthetic blocker cells used to force an ordered I-piece kick were left on the board and affected the next spawn. The fixture now clears those synthetic cells after checking the intended rotation.
- A separate frame-sensitive DAS test was corrected to validate a fresh DAS deadline rather than assume the browser had not advanced a frame.
- No merge/deploy. Kick/pivot compatibility and repository-wide legacy-import audit remain open.

## Rotation API guard — 2026-10-09

- `games/01/rotation.js` now rejects unsupported deltas instead of accidentally treating values such as `0` or `3` as legal rotations with a fallback zero-kick. Only `1`, `-1`, `2`, and `-2` are accepted.
- `games/01/self-test.js` verifies rejected zero/270-degree rotations return false and leave the piece unchanged.
- Planner regression suite passed on `91bcc98a86e790ee605f22f4c29b70ed8598c6fd`: [run 38000877170](https://github.com/mandrop333-create/180180/actions/runs/38000877170).
- Independent geometry/kick/oracle suite passed: [run 38000877189](https://github.com/mandrop333-create/180180/actions/runs/38000877189).
- Independent Playwright route fixtures, planner-oracle comparison, and active-gravity timing checks passed: [run 38000877165](https://github.com/mandrop333-create/180180/actions/runs/38000877165).
- The prompt-requested duplicate Playwright workflow remained queued; the independent Playwright workflow above completed successfully and is the verification evidence used here.
- No merge or deployment. The remaining structural work is external verification of all kick/pivot conventions and the full legacy-import audit.

## Rotation-transition contract — 2026-10-09 (commit `98f162ba8b5d3ba3fc51cf78b41d2eae4c728192`)

- The planner now validates a successful rotation adapter call before admitting an edge: the result must retain the piece type, use integer coordinates/orientation, and reach the requested orientation. A callback that returns success without rotating is rejected as a phantom transition.
- Added an independent-oracle regression fixture for a successful-but-no-op rotation callback.
- Planner regression tests passed: [run 38001241671](https://github.com/mandrop333-create/180180/actions/runs/38001241671).
- Independent geometry/kick/weighted-cost oracle passed: [run 38001241614](https://github.com/mandrop333-create/180180/actions/runs/38001241614).
- Independent Playwright route fixtures, planner-prompt oracle comparison, and active-gravity/DAS timing checks passed: [run 38001241618](https://github.com/mandrop333-create/180180/actions/runs/38001241618).
- The separate prompt-requested workflow is trigger-gated to manual dispatch, pull requests, or an authorized `/playwright` PR comment; it is not the branch-push verification gate.
- The comprehensive legacy-import audit is not yet certified complete, so `finesse.js` remains as a compatibility facade. No merge or deployment.