# Finesse Core: Reference Verification Ledger

This ledger records what has been checked and what remains unproven. An in-repository test passing is not the same as matching an external reference, and a browser test using the production planner is not an independent oracle.

## Completed on `rebuild/finesse-core`

- Added `games/01/finesse-reference-fixtures.js`: static expected cell coordinates and spawn origins for all seven pieces and four orientations.
- Added `games/01/finesse-reference-test.js`: compares production geometry to separately authored constants, checks four cells per orientation, duplicate cells, spawn origins, and orientation arithmetic.
- Added `.github/workflows/finesse-reference-tests.yml`.
- Added `games/01/finesse-kick-reference-fixtures.js` and `games/01/finesse-kick-reference-test.js` for static SRS+ I-piece and JLSTZ 90°/direct-180 kick-order fixtures.
- Added `games/01/finesse-oracle-reference-test.js`: an independent transition/collision/shortest-path oracle that uses static geometry and kick fixtures, then compares its minimum-cost physical placements to the production planner on 21 curated piece/board combinations. It also compares collision results across 1,960 piece/orientation/position cases.
- Added `games/01/finesse-browser-reference-test.js` and a dedicated `.github/workflows/finesse-browser-reference.yml`, kept separate from the diagnostics harness. Playwright directly presses real keys against the local game and checks the resulting active state, lock placement, and finesse score against four independently specified routes.
- Corrected the production I-piece kick arrays on this isolated branch to match the normalized reference fixture; updated the colocated regression expectations so the old vanilla-SRS I table is no longer mislabelled as SRS+.
- **Verified initial CI:** [reference-fixture workflow](https://github.com/mandrop333-create/180180/actions/runs/37982829776) passed on commit `b6e54b8d8d091539e7322578ba2ee3f25fe67e26`. This proved only the initial geometry layer.
- **Verified expanded CI:** [expanded reference workflow](https://github.com/mandrop333-create/180180/actions/runs/37983630582) passed on commit `85e7c106489a6ba5187c03451b4c85bd517e6e5f`, including the geometry fixtures, I-piece kick fixtures, and the independent shortest-path oracle. Boundary-comparison additions are being rerun on the current head.
- **Verified existing Playwright diagnostics:** [prompt-requested Playwright run](https://github.com/mandrop333-create/180180/actions/runs/37982829570) passed on the initial isolated branch. It exercised the current game locally in Chromium, including finesse prompts, equal-cost alternate routes, tap-versus-DAS equivalence, and lock/scoring assertions across piece/board fixtures. It did not test the deployed live site.
- **Verified independent Playwright routes:** [dedicated browser-reference workflow](https://github.com/mandrop333-create/180180/actions/runs/37983945789) passed on commit `84fc48ce913ca5fa2b414c4423b40e3612ee6181`. All four independently specified scenarios passed: O one-tap horizontal movement, T clockwise rotation, I SRS+ clockwise kick, and I direct 180 kick. Each produced exactly one finesse-perfect placement, zero finesse faults, expected locked cells, and zero page errors. The test freezes gravity to isolate the input/lock contract; timing/gravity remain separate work.
- **Important Playwright limitation:** the existing browser harness obtains targets/routes from production `enumerateFinesseTargets`, and installs alternate routes returned by that same planner. It is useful for checking UI/input-observer/lock integration, but it cannot independently prove that the planner found the true minimum or that its kick tables are correct. The harness must be extended to consume independent expected fixtures and to fail if the planner disagrees with them.

## External sources consulted

1. TetrisWiki, Movement finesse: https://tetris.wiki/Movement_finesse
   - Confirms multiple distinct finesse models exist (including 0G, 20G, and wall finesse). It does not define this trainer's bespoke direct-180 cost policy.
2. TetrisWiki, TETR.IO: https://tetris.wiki/Tetr.io
   - Describes default SRS+ modifications and separates TETR.IO's default 180 table from optional SRS-X.
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

- The current I-piece 90-degree arrays appear to follow a conventional SRS ordering in several transitions, while the third-party SRS+ reference documents a different order. This is a **candidate mismatch**, not yet a confirmed bug, because coordinate/origin conventions and transition naming must first be reconciled.
- The current I-piece 180 arrays also look different from the third-party SRS+ reference at a raw-offset level. Do not copy values blindly: normalize rotation centers, piece origins, and screen-y-down versus mathematical-y-up coordinates first.
- Current Playwright success is evidence that the existing implementation is internally consistent for its tested cases; it is not evidence that the underlying finesse minima or kick rules are correct.

## Verification status

| Area | Status | Why |
|---|---|---|
| Seven piece shapes/orientations | Initial fixture test passes; external fixture provenance still needs review | Static cells are compared to production definitions; canonical diagram and pivot conventions still need review |
| Spawn origins | Internal fixture test passes | External engine-specific spawn origin is not yet proven |
| SRS+ I-piece 90-degree kicks | Reference fixture added and CI passed | Eight ordered transitions match a third-party S-Finder SRS+ reference after vertical-coordinate normalization; this is a cross-check, not an official implementation |
| SRS+ I-piece direct 180 kicks | Reference fixture added and CI passed | Four orientation-specific ordered tables match the same third-party source after vertical-coordinate normalization; full piece/pivot validation remains open |
| JLSTZ 90-degree kicks | Not independently verified against a TETR.IO-specific fixture | Current table matches conventional SRS; confirm SRS+ semantics do not alter these transitions |
| JLSTZ direct 180 kicks | Cross-checked, not fully independently tested | Current arrays align with the S-Finder SRSPlus table after vertical sign conversion; add a static fixture test for all ordered entries |
| Collision/top-out behavior | Independent comparison added; current-head rerun pending | Reference collision logic is compared with production over walls, floor, top boundary, and occupied cells across a grid of piece/orientation/position states |
| Minimum route/finesse cost | Independent oracle added; 21-fixture run passed | Oracle uses static fixtures and independently implemented transitions; compares all target identities and minimum costs for 7 pieces across 3 board shapes with max cost 2 |
| DAS/ARR/lock timing | Partially exercised by current Playwright; not independently verified | Need declared timing assumptions and tests against those assumptions |
| Runtime observer and lock-time score | Independent Playwright scenarios passed for four specified routes | Each route is injected as an independently authored expectation, played with real keyboard events, hard-dropped, and checked against locked cells and exactly-once score; gravity is frozen for these cases |
| Live production behavior | Not verified after the persistent user-reported issue | The Playwright run served the isolated branch locally; no production code changed |

## Next action

1. Normalize the S-Finder reference coordinate/pivot conventions against the trainer's 4x4 piece origins.
2. Add static, reviewed kick fixtures and tests for all transitions, preserving ordered tests.
3. Add a separate shortest-path oracle that does not import production geometry, kick functions, or planner.
4. Extend the dedicated Playwright fixture set with more edge cases and timing-sensitive scenarios. The current browser fixtures cover four basic routes and deliberately freeze gravity; they do not yet prove timed gravity/lock-delay behavior.
5. Reproduce the original live failure before any production change, and demonstrate it fixed in the isolated branch first.

Do not treat current `self-test.js` expectations as independent evidence, because those expectations live beside the implementation. Do not merge or deploy without explicit authorization.
