# Finesse Core Rebuild: Rules and Verification Plan

Status: implementation and verification in progress on `rebuild/finesse-core`. At commit `b5d50e718bc910ddf030bf9a0727a7c8882c499b`, planner regression and independent reference workflows pass; the independent Playwright and prompt-requested Playwright workflows are still running. The planner rejects malformed/no-op/teleporting transitions, and lock-time scoring now fails closed when prompt generation produced no target. A Playwright regression covers that missing-target score path. This is still an incremental replacement, not proof of a fully ground-up engine rewrite: independent kick/pivot compatibility, final browser verification for this commit, and a complete repository-wide legacy-import audit remain open. Keep the compatibility facade until that audit is complete. Do not merge or deploy without explicit authorization.

## Objective

Replace the finesse calculation and execution-verification core only after its rules are explicit and independently tested. Keep the current UI, board rendering, unrelated training modes, and diagnostics isolated. Work on `rebuild/finesse-core`; do not merge or deploy without explicit authorization.

## What external references establish

1. **Finesse is a family of models, not one universal formula.** TetrisWiki documents separate 0G/60 Hz SRS, 20G SRS, and 20G SRS wall-finesse models. We must choose the one that matches this trainer rather than treating every profile as interchangeable.
   - https://tetris.wiki/Movement_finesse
   - https://www.tetris.wiki/0G_60_Hz_SRS_Movement_Finesse

2. **TETR.IO SRS+ is not identical to vanilla SRS.** Its documented SRS+ behavior modifies the I-piece kick behavior and mirrors some kick tables. The exact kick order is gameplay-significant.
   - https://tetrio.wiki.gg/wiki/Mechanics
   - https://tetris.wiki/TETR.IO

3. **Direct 180° rotation uses its own kick table.** It must not be approximated as two 90° turns. TETR.IO's default mechanics and its optional SRS-X variant must not be confused.
   - https://tetrio.wiki.gg/wiki/Mechanics
   - https://tetrio.github.io/faq/mechanics.html

4. **DAS, ARR, and DCD affect how a held horizontal input executes.** A wall-finesse route cannot be judged correctly by a generic 'one key equals one move' rule unless the chosen profile explicitly defines that abstraction.
   - https://tetrio.github.io/faq/mechanics.html
   - https://tetris.wiki/DAS

These references establish the categories and distinctions. The local kick tables and geometry still need a fixture-by-fixture comparison; they are not considered verified merely because their comments cite TETR.IO.

## Current implementation risks found during inspection

- `finesse.js` searches a bounded set of transitions using the live engine's `move` and `tryRotate` functions. This makes the planner internally consistent with gameplay, but not an independent proof that either implementation is correct.
- The current search is capped by `maxCost` (normally 2), and only considers left/right taps, quarter-turns, direct half-turns, and an optional wall-directed DAS action. Any omitted action or incorrect cost rule can make the reported minimum wrong.
- The planner settles each explored state by repeatedly moving down, rather than simulating a timed sequence of gravity, input, and lock-delay events. That can be correct for an explicitly idealized finesse model, but it is not automatically equivalent to every finite-gravity or 20G model.
- The current profiles give several distinct models the same `maxCost: 2` and share similar action-cost assumptions. That is a warning sign: profile names must correspond to actual, tested behavior.
- The runtime verifies route progress and locked placement, but this is downstream of the planner. A correct observer cannot repair an incorrect target/minimum.

## Smallest defensible mathematical model

Use a finite state graph and shortest-path search. Avoid hand-authored placement tables as the primary authority.

### State

`S = (pieceType, orientation, x, y, board)`

The board and piece geometry determine whether a state is legal. A transition is accepted only if the corresponding action succeeds under the selected, verified rotation and collision rules.

### Placement identity

For this trainer, compare the physical locked result: piece type, horizontal origin, orientation, and final landing row. Treat O-piece orientation as physically invariant. Do not merge placements with different landing rows if overhangs or kicks can distinguish them.

### Cost

Define an explicit profile function `cost(action, mode, profile)`. For the initial TETR.IO-inspired profile:
- left/right tap: one deliberate movement input;
- CW/CCW rotation: one deliberate rotation input;
- direct 180° rotation: one deliberate rotation input;
- hard drop and automatic gravity: excluded from finesse input cost;
- soft drop: excluded from finesse input cost only if that is the explicitly selected trainer rule;
- DAS/hold: do not silently equate with a tap. Its cost and execution conditions must be explicit and tested against the selected wall-finesse model and actual DAS/ARR settings.

Then, for a target placement (p):

`F(p) = min(sum(cost(action_i)))`

over all legal action sequences that reach (p) from the known spawn state. A route is perfect exactly when its measured cost equals this independently established minimum.

### Keep four responsibilities separate

1. **Rules/geometry:** piece cells, collision, orientation transitions, ordered kick tests.
2. **Planner:** enumerate legal states and compute minimum-cost routes using a declared profile.
3. **Runtime observer:** record actual input edges/holds and the state transitions they cause.
4. **Placement verifier/scorer:** compare the final locked placement and observed route to the target and minimum.

The UI only displays the target, route, progress, and result. It must not contain hidden rule logic.

## Independent verification requirements

The expected answers must not be generated by importing the production planner, production kick functions, or production piece geometry. Use hand-reviewed reference fixtures and a separate minimal oracle.

Required coverage:
- all seven pieces, every distinct orientation, and spawn coordinates;
- all 90° transitions and every kick test in its documented order;
- direct 180° transitions and every kick test in their separate table;
- left/right walls, floor, occupied cells, overhangs, and top-out boundary behavior;
- O-piece rotational invariance;
- equivalent physical placements reached by different routes;
- minimum cost and all equal-cost routes for a curated fixture set;
- held-key/DAS/ARR behavior under the actual trainer settings;
- gravity and lock timing where the selected model depends on them;
- actual input sequence, final locked state, and exactly-once scoring.

For each failure, report the first divergent layer: expected geometry, legal transition, target enumeration, minimum route, observed input, locked placement, or score.

## Implementation sequence and gates

### Gate 0 — Freeze the contract
- Lock down the exact profile: TETR.IO-style SRS+, separate direct 180° rotation, one finesse input for a direct half-turn, hard drop excluded from finesse cost, and the explicit treatment of soft drop and DAS.
- Document what "minimum" means for this trainer. Do not silently mix 0G, finite-gravity, 20G, and wall-finesse assumptions.
- **Explicit vertical-movement boundary:** the current 180 Flip candidate searches horizontal taps, wall-directed DAS, 90° rotations, and direct 180° rotations from the active piece state, then computes landing. Gravity and hard drop do not add finesse cost. Soft drop is ignored by the score observer but is not currently a planner transition; therefore the planner must not be described as enumerating every TETR.IO-reachable tuck. TETR.IO reference material documents 180 tucks that require soft drop before rotation. If full tuck coverage is required, add soft-drop/vertical-state transitions as a separate model change, with independent tests; do not quietly broaden the current oracle's claims.
- Keep the current UI and all unrelated modes out of scope.

### Gate 1 — Prove the rules layer
- Compare piece geometry and spawn origins against static fixtures.
- Verify all ordered kick arrays against a documented reference, including coordinate/pivot normalization.
- Force every reachable kick candidate through production rotation/collision; document candidates that cannot be first-valid by geometry.
- **No-go:** a third-party table is not treated as authoritative solely because its own fixture test passes. Confirm the pivot/origin convention and exact offsets against a second independent source before freezing the table.

### Gate 2 — Prove the planner
- Use a separate shortest-path oracle that imports no production geometry, kick logic, collision, or planner for its expected answers.
- Compare all target identities, minimum costs, and equal-cost routes across curated edge cases and a deterministic generated board corpus.
- Expand beyond the current max-cost-2 test envelope if the selected profile or UI can present targets/routes outside that envelope.
- Report the first divergent layer rather than adjusting expected values to make tests pass.

### Gate 3 — Prove execution
- Test keydown/keyup edges, taps, holds, DAS/ARR and DCD assumptions, gravity, lock delay, and wall/tunnel behavior under the chosen profile.
- Playwright must begin from the actual spawn state, independently check the displayed target against the oracle, press real keys, and verify the active state, final locked cells, and exactly-once score.
- Keep isolated input/lock tests with frozen gravity, but do not confuse them with end-to-end timing validation.

### Gate 4 — Prove the live regression is fixed
- Reproduce the live discrepancy with a read-only browser test.
- Run the same independent fixture against the isolated candidate and compare expected target, actual active state, and final locked cells.
- Confirm the original user-visible failure is absent; a successful build or an internally consistent planner is not enough.

### Gate 5 — Review and integrate
- Preserve the existing UI, other training modes, and the separate diagnostics branch.
- Run all unit, oracle, regression, and Playwright suites on the final candidate commit.
- Only then request review for merge/deployment. Do not merge or deploy without explicit authorization.

## Acceptance criteria

- The selected rule profile and its input-cost assumptions are explicit and tested.
- Geometry, spawn origins, 90° kicks, and direct-180 kicks are independently sourced and normalized.
- Planner and oracle agree on target identities, minimum costs, and equal-cost routes for all fixtures.
- Every route is replayed from actual spawn using real key events and checked against independent target/lock expectations.
- No route is marked perfect when its measured input cost is above the independently computed minimum or its locked placement differs from the target.
- Timing-sensitive behavior matches the declared gravity, DAS/ARR, and lock-delay model.
- Existing unrelated modes and UI regression tests remain green.
- The observed live failure is reproduced before the fix and demonstrably absent on the isolated candidate before integration.
- No merge or production deployment occurs without explicit authorization.
