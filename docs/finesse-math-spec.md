# Finesse Core — Mathematical Specification and Freeze Ledger

Status: **formula specification drafted; implementation is not approved for production yet**.
Scope: Game 1 only, branch `rebuild/finesse-core`. The old finesse implementation is not a source of truth. This document specifies the replacement's mathematics and explicitly separates established rules from remaining validation work.

## 1. Purpose and non-goals

The trainer should show a minimum deliberate-input route to a reachable physical landing, observe the player's actual actions without blocking gameplay, and report whether the locked placement followed a minimum-cost route.

This is not a full game-state AI and does not need to model every variable in TETR.IO. The route solver needs the active piece, board occupancy, legal movement/rotation transitions, placement identity, and an explicit action-cost model. Timing mechanics are a separate execution/observation layer.

The default target is TETR.IO's default SRS+ rotation rules with its direct 180-degree kick system, not SRS-X. If a game mode intentionally uses different rules, it must select a different named profile; never infer the kick system from a generic mode name.

## 2. Canonical state and coordinates

A search state is:

`S = (type, x, y, o, B)`

- `type` is one of I, O, T, S, Z, J, L.
- `(x,y)` is the piece's local-frame origin on the board.
- `o` is orientation 0..3, normalized modulo four.
- `B` is the fixed board occupancy during the active piece's route.
- Board x increases to the right; board y increases downward.
- A piece orientation is a set of four unique local mino coordinates `Cells(type,o)`.
- World cells are `(x+cx, y+cy)` for each `(cx,cy)` in `Cells(type,o)`.

Spawn coordinates and occupied-cell fixtures are data, not derived from a guessed pivot formula. The independently authored static geometry fixtures currently cover all seven types and all four orientations.

## 3. Collision formula

For a candidate state `(type,x,y,o,B)`, collision is true if any local mino `(cx,cy)` yields a world cell `(wx,wy)=(x+cx,y+cy)` satisfying any of:

1. `wx < 0`
2. `wx >= W`
3. `wy >= H`
4. `wy >= 0 and B[wy][wx] is occupied`

Cells with `wy < 0` are permitted by the current engine's above-visible-field convention. Top-out/lock-above-field is a later lock-resolution rule, not a reason to call a candidate collision at spawn height.

A move by `(dx,dy)` succeeds iff the candidate state at `(x+dx,y+dy,o)` does not collide. On success, update x and y atomically; on failure, the piece state is unchanged.

## 4. Orientation and rotation formula

Normalize an orientation with `norm(o)=((o mod 4)+4) mod 4`.

- Clockwise: `to = norm(from + 1)`
- Counterclockwise: `to = norm(from - 1)`
- Direct half-turn: `to = norm(from + 2)`

A direct 180-degree action is one transition using the dedicated 180 kick table. It is not simulated as two quarter-turns.

For a rotation, select the table using piece family, source orientation, destination orientation, and rotation profile. Try kick offsets in their listed order. The first candidate destination that passes collision is accepted, including its x/y displacement. If no candidate is legal, rotation fails and the original state remains byte-for-byte unchanged. O rotation is physically invariant and is not offered as a finesse action.

The production SRS+ kick tables are compared to independent static fixtures, and the test harness forces candidate kicks where a legal board construction is possible. Some later kicks can be structurally impossible to force first because their cells are fully covered by the current and desired piece; those cases must be reported as proved-unreachable test cases, not silently counted as executed.

## 5. Landing and placement identity

For a state S, landing is the state reached by repeatedly applying the legal downward move `(0,+1)` until the next downward move collides. This is computed on a clone and must not mutate the live piece or board.

A landing is a valid target only if every occupied mino is inside the visible field at lock time:
`0 <= y_land + cy < H` for every `(cx,cy)` in `Cells(type,o_land)`.
TETR.IO top-outs rather than locking if any mino remains above row zero. A ceiling-kicked state may be reachable and rest against the stack but is not a legal finesse placement; exclude it from the target set.

Physical placement identity is:

`P(S) = (x_land, o_land, y_land)`

where `S_land` is the landing state. This intentionally includes landing y: identical x/orientation values at different resting heights are different physical placements. O is canonicalized to orientation 0 because its geometry is invariant.

## 6. Action set and cost

The default TETR.IO training profile uses these deliberate actions:

| Action | Transition | Cost |
|---|---|---:|
| left tap | one legal cell left | 1 |
| right tap | one legal cell right | 1 |
| left DAS | continue legal left movement until blocked; invalid if no cell moved | 1 |
| right DAS | continue legal right movement until blocked; invalid if no cell moved | 1 |
| CW | one legal clockwise rotation | 1 |
| CCW | one legal counterclockwise rotation | 1 |
| direct 180 | one legal direct half-turn | 1 |
| gravity | automatic vertical state evolution | 0 |
| soft drop | vertical execution control; excluded from horizontal/rotation finesse | 0 |
| hard drop | placement/lock command, not part of the route being scored | 0 |

Omit rotation actions for O. Do not allow DAS as a rotation mode. A failed move/rotation is not a legal graph edge and cannot appear in a route.

The route-cost formula is `C(R)=Σ c(a_i)`. For this profile, every deliberate movement/rotation edge costs exactly one. The solver may therefore use breadth-first search (BFS) to find minimum cost. If a future profile introduces different positive edge costs, replace BFS with Dijkstra's algorithm; do not use FIFO BFS with non-unit weights.

Important interpretation: this is the trainer's **minimum deliberate-input** score, not a claim that every route is executable in identical wall-clock time. DAS/ARR/DCD and key timing affect execution but are not added to the base input count. The live observer separately confirms that a held horizontal input qualifies as DAS; a keydown alone must not be assumed to be a completed DAS action.

## 7. Minimum-finesse formula

For a target placement p and starting state S0:

`F(p) = min { C(R) | R is a legal route from S0 and P(T(S0,R)) = p }`

If no legal route reaches p within the configured cost envelope, p is not a candidate. A route is finesse-perfect for p exactly when its cost equals F(p), it reaches the selected physical placement, and the required action sequence is observed under the observer's rules.

Search algorithm for the current unit-cost profile:

1. Put S0 in a FIFO queue with cost 0.
2. Pop a state; calculate its landing and record the least cost for that landing identity.
3. If the cost is at the configured limit, do not expand it.
4. Otherwise enumerate every legal action from the action set.
5. For each unseen state, or state found at a lower cost, store its cost and enqueue it.
6. Return each target's minimum cost and deterministic minimum-cost route(s).

The state key is `(type,x,y,o)` for a fixed board and fixed profile. The target key is `(x_land,o_land,y_land)`. Distinct equal-cost routes may be retained for observer matching; duplicate action histories must not create duplicate routes.

## 8. Trainer observation is separate from the solver

The planner is a read-only route oracle. It must not authorize, suppress, or rewrite game inputs. The observer consumes actual events and compares them to minimum routes.

- A tap route step completes on the corresponding valid discrete input.
- A DAS route step remains pending until the hold meets the configured DAS timing and reaches its wall destination; release, blur, or an incompatible action cancels that pending interpretation.
- A failed rotation/move, wrong action, or lock at the wrong target is a finesse fault.
- Hard drop/automatic gravity do not increase route cost, but lock-time target verification is still required.
- The observer must resolve a placement exactly once, so a mismatch cannot increment fault counters twice.
- Spawn, hold, keyup, focus loss, simultaneous left/right, rotation while DAS is charged, DCD, ARR=0, and lock-delay interactions require explicit deterministic tests. The existing browser/runtime behavior is not declared complete merely because the route oracle passes.

## 9. Reference sources and confidence

Primary TETR.IO mechanics source:
- https://tetrio.github.io/faq/mechanics.html — describes DAS, ARR, DCD, SRS and handling behavior.
- https://github.com/tetrio/faq/blob/main/mechanics.html — maintained source repository for that mechanics document.

Secondary rotation references:
- https://tetris.wiki/TETR.IO — describes SRS+, the I-piece symmetry change, and that SRS-X is an optional non-default kick system.
- https://tetris.wiki/SRS — baseline SRS geometry/kicks.
- https://gist.github.com/torchlight/1832786cf053daa51bf188110b764090 — S-Finder SRSPlus kick data used as an independent static comparison; this is not an official TETR.IO source.

Finesse terminology:
- https://tetris.wiki/Movement_finesse — defines movement finesse as minimizing inputs to place tetrominoes; classic two-step tables are useful references but do not replace this project's explicit TETR.IO-aware cost model.

Source confidence is not the same as test success. Independent tests can prove production code matches the recorded fixture, but cannot prove the fixture itself is correct if the external reference is wrong or uses a different pivot convention. Any unresolved source/pivot discrepancy must remain listed as pending rather than being described as verified.

## 10. Current verification evidence

The independent-reference workflow on branch `rebuild/finesse-core` has a successful run at commit `82fcba95b9065fe1f93fd9467e76ee8ad6fc0af1`. Its successful steps include:
- unobstructed T-piece CW/CCW and round-trip geometry fixture;
- independent geometry/spawn/orientation fixture;
- independent ordered kick fixture comparison;
- production planner comparison with a separate shortest-path oracle across curated and generated boards;
- forced ordered kick execution cases where a legal isolating board exists.

The planner regression workflow at the same commit also passed. This is evidence for the tested cases only; it is not a claim that the full runtime/input model or all TETR.IO edge cases have passed.

## 11. Remaining gates before replacing the broken finesse implementation

1. Review the independent kick fixture's source/pivot assumptions against the TETR.IO reference; specifically preserve any uncertainty about I-piece local origins.
2. Continue extending shortest-path and deterministic-route tests beyond the initial two-input envelope; a cost-4 independent comparison is now passing.
3. Validate every reachable ordered kick, record structurally unreachable later kicks, and retain wall/floor/ceiling/overhang fixtures. A new ceiling regression now rejects reachable but un-lockable top-out landings.
4. The browser suite now verifies representative DAS/ARR/DCD behavior, including post-rotation DCD, spawn DCD, short key release, finite gravity, and lock-delay reset. Remaining work is broader simultaneous-input/focus-loss and full configuration coverage.
5. Freeze the default cost profile and make the trainer's displayed sequence agree with its lock-time observer.
6. Only after these pass, complete the replacement-path integration and run all browser/runtime diagnostics.
7. Keep `main` and deployment untouched until the user explicitly approves a reviewed, passing pull request.

## 12. Frozen decisions vs. open decisions

Frozen for the first replacement:
- fixed board during route search;
- screen-y-down coordinates;
- physical target includes landing height;
- direct 180 is its own action and uses its own kick table;
- default profile is TETR.IO SRS+ plus its default direct-180 system, not SRS-X;
- every deliberate action has unit cost; gravity/soft-drop/hard-drop are finesse-cost-neutral;
- solver optimizes deliberate input count, while timing is handled by a separate observer;
- no production deployment until independent and runtime gates pass.

Open until tested:
- whether every recorded reference table exactly matches the target TETR.IO version/pivot convention;
- completeness of runtime observer behavior under all input timing combinations;
- whether the selected target-selection policy (currently hardest reachable placement inside the cost envelope, deterministic tie-breaking) is the desired teaching policy;
- full UI/browser integration and diagnostics on the rebuilt finesse path.
