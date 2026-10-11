# Finesse Core Rebuild: Rules and Verification Plan

Status: implementation and verification in progress on `rebuild/finesse-core`. At branch head `485a2acb00bb36b61d7eef74454cc79f139a9710`, planner regression tests, independent reference fixtures, independent Playwright route fixtures, and prompt-requested Playwright diagnostics all pass. The planner rejects malformed/no-op/teleporting transitions, and lock-time scoring fails closed when prompt generation produces no target; browser tests verify actual inputs, locked placement, and exactly-once scoring for the covered cases. This remains an incremental core replacement, not proof of a fully ground-up engine rewrite. Open gates: second-source kick/pivot compatibility review, explicit documentation and boundary tests for soft-drop/tuck coverage, expanding the independent planner oracle beyond the current cost envelope where required, and a complete repository-wide legacy-import audit. The deployed site is the old implementation; its read-only probe failures are not a release gate for the candidate and must not be used as the candidate's correctness oracle. Keep the compatibility facade until the import audit is complete. Do not merge or deploy without explicit authorization.

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
- soft drop: for the current candidate, a navigation/execution transition with zero finesse cost; it is omitted from the scoring-route projection. Coverage of this transition does not imply exhaustive coverage of every timed tuck or lock-delay interaction;
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
- **Explicit vertical-movement boundary:** the current candidate includes soft drop as a zero-cost navigation/execution transition while excluding it from the finesse-scoring route. Independent browser tests cover selected descent-before-rotation/tuck cases under active gravity, but not every possible soft-drop, gravity, or lock-delay interaction. Keep claims limited to the verified corpus; expand the independent oracle and timing corpus before claiming exhaustive TETR.IO placement reachability.
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

### Gate 4 — Prove candidate behavior independently
- Run the independent fixtures against the isolated candidate branch, not the old deployed Finesse implementation.
- Compare actual prompt targets and minimum costs with the independent oracle; replay real key events and verify active state, final locked cells, and exactly-once scoring.
- Keep any read-only probe of the old deployed site diagnostic-only. Its known broken Finesse behavior is expected to differ and is not a blocker or acceptance oracle for this rebuild.

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
- Candidate behavior is independently verified on the isolated branch against the declared fixtures and browser oracle. Differences from the old deployed Finesse implementation are not treated as regressions.
- No merge or production deployment occurs without explicit authorization.
