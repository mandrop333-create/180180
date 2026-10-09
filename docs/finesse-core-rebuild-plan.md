# Finesse Core Rebuild: Rules and Verification Plan

Status: investigation/specification only. This document does not change production behavior.

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

## Implementation sequence

1. Freeze the selected rule profile and write its contract.
2. Build independent reference fixtures for piece geometry and rotation/kick behavior.
3. Implement the smallest planner and verify it against those fixtures.
4. Test the runtime observer and lock-time verifier independently.
5. Integrate the replacement behind the existing UI without changing presentation.
6. Run unit tests, regression tests, and browser tests on the isolated branch.
7. Only then request review for merge/deployment. A successful build alone is not acceptance; the original live failure must be reproduced and shown fixed.

## Acceptance criteria

- Every curated fixture has an independently specified expected result.
- Planner and oracle agree on all fixture placements and minimum costs.
- No route is marked perfect when the locked piece differs from the target.
- The same action sequence produces the same result deterministically.
- Existing unrelated modes and UI regression tests remain green.
- The original user-visible failure is reproduced before the fix and demonstrably absent after integration.
