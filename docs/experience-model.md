# 180436 Experience Model: Coherent Game Flow

**Status:** Research and evaluation specification  
**Scope:** Context model only. This document does not change game mechanics, CSS, layout, or deployment.  
**Version:** 1.2

## Core principle

**The board defines the rhythm; Hold and Next extend it; everything else supports the player's next decision.**

The goal is not a generic dark theme. It is a coherent play system in which spatial relationships, information hierarchy, interaction timing, and feedback feel native to the game.

## Ground truth from the current implementation

These are observations from the repository, not assumptions about all falling-block games:

- The primary board is labeled as a 10 × 20 training board in `index.html`.
- Hold is rendered in `#holdPreview`; the queue is rendered in `#nextPreview`.
- `games/01/game.js` renders Hold and Next previews from the same `miniPiece()` function and `cellsFor(type, 0)` piece geometry.
- Next queue count is bounded in the renderer to 1–15, and the trainer exposes a next-queue-size setting.
- The page has desktop and mobile layout breakpoints, touch controls, customizable mobile-control positions, and a reduced-motion rule in CSS.
- Training options include finesse guidance, information-reduction modes, and rhythm reporting. These are functional features, not decoration.

These facts should be rechecked when the relevant code changes.

## Model rules

### 1. Geometry before styling
- Treat the board's dimensions and cell rhythm as the primary spatial constraint.
- Align supporting elements to meaningful board edges or centerlines where practical.
- Derive preview scale and spacing from board proportions instead of choosing each panel independently.
- Never sacrifice board readability or playable area to make surrounding cards look symmetrical.

### 2. Hold and Next form one planning system
- Use a consistent visual grammar for both preview areas: piece geometry, scale logic, contrast, and empty states.
- Hold should communicate the stored piece (or clearly communicate that it is empty).
- Next should communicate order at a glance, with the nearest upcoming piece easiest to identify.
- Queue-size customization must remain legible and must not create awkward clipping, excessive scrolling, or a competing visual column.
- Color-only modes must remain understandable without relying on shape details that the mode intentionally removes; labels/accessibility names should preserve useful context.

### 3. Responsive layout preserves play priority
- Desktop: board remains the visual anchor; Hold/Next and supporting information balance it without displacing it.
- Narrow screens: prioritize board and immediate play aids first; place secondary stats and rule controls in a deliberate sequence.
- Preserve touch-control reach, safe spacing, and the user's customized mobile-control layout.
- Test at real viewport widths, not just by inferring behavior from CSS breakpoints.

### 4. Feedback follows the action
- Hold swaps, rotations, piece lock, line clears, and training prompts should use a consistent timing and visual language.
- Feedback should be close to the affected element when that helps comprehension, but never obscure the active board or required inputs.
- Prefer a short, clear state change over repeated glow, shake, flash, or motion that competes with play.
- Respect `prefers-reduced-motion`; core state and success/failure information must remain available without animation.

### 5. Precision outranks spectacle
- Inputs must remain responsive and predictable; visual feedback must not add perceived latency.
- Avoid effects that make piece boundaries, ghost position, occupied cells, or training cues harder to distinguish.
- Maintain sufficient contrast for text and essential states. Do not use color as the only carrier of meaning when another cue is practical.
- Optional effects should be removable or restrained if they interfere with deliberate practice.

### 6. Every element has a job
For each UI element, record:
1. What player decision or action it supports.
2. When it should attract attention.
3. What information it must not obscure.
4. What happens on small screens and with reduced motion.
5. How it will be validated.

If removing an element does not reduce clarity, feedback, or useful capability, question whether it belongs.

## Research basis

The sources below provide general mechanics and design guidance. They do **not** establish that this trainer implements every behavior described by a source.

- TetrisWiki, [Movement finesse](https://tetris.wiki/Movement_finesse): input efficiency and predictable movement are central to finesse practice.
- TetrisWiki, [Super Rotation System](https://tetris.wiki/Super_Rotation_System): rotation behavior depends on defined rotation and kick rules; verify the trainer's own engine rather than assuming all games behave identically.
- TetrisWiki, [General technique](https://tetris.wiki/General_technique): piece planning and the hold/queue context support placement decisions.
- Game Feel Survey, [A survey of game feel](https://arxiv.org/abs/2011.09201): frames game feel in terms including physicality, amplification, and support; useful for thinking about feedback without treating effects as ends in themselves.
- Nielsen Norman Group, [Dark Mode: How Users Think About It and Issues to Avoid](https://www.nngroup.com/articles/dark-mode-users-issues/): dark interfaces need careful contrast; highly saturated colors against dark backgrounds can create visual discomfort or blur.

## Validation checklist

Before any UI change is considered complete:

- [ ] Board dimensions and cell alignment are unchanged unless the task explicitly requires otherwise.
- [ ] Hold and Next piece shapes, order, empty state, and settings still work.
- [ ] Keyboard controls and touch controls still work.
- [ ] Finesse and rhythm-training information remains readable and does not block required play information.
- [ ] Desktop and narrow-screen layouts have been inspected at representative viewport widths.
- [ ] Reduced-motion preferences are respected.
- [ ] Text and essential state indicators have adequate contrast.
- [ ] Any claim about behavior is verified in the actual trainer, not inferred from a reference game.
- [ ] Automated checks pass, and any manual visual checks are reported separately.

## Evidence discipline

Keep three categories distinct in future model updates:

- **Observed:** verified in the current source or tested in the running trainer.
- **Research-backed principle:** supported by a cited external source but not necessarily implemented here.
- **Hypothesis to test:** a plausible improvement that requires user-flow or visual validation.

Do not describe a proposed change as implemented, or a successful automated test as proof of visual quality, without the corresponding evidence.


## Version 1.1 — Seamless-flow model

This version makes the experience model operational: it describes the player's attention cycle, defines priority between interface elements, and records concrete hypotheses from the current source. It remains documentation-only.

### The continuous loop

The trainer should support one unbroken loop:

1. **Orient:** the player reads the active board state and the landing/ghost information.
2. **Anticipate:** Hold and the ordered Next queue provide just enough information for the next placement decision.
3. **Act:** keyboard or touch input produces a predictable, low-latency game response.
4. **Confirm:** the board state changes clearly when a piece moves, rotates, locks, or clears lines.
5. **Learn:** finesse and rhythm feedback explain a useful pattern without hijacking the next decision.
6. **Resume:** transient feedback settles; attention naturally returns to the active piece and board.

This is a design model, not a claim that every phase is currently measured or implemented as a formal state machine.

### Attention priority

When elements compete for attention, resolve the conflict in this order:

1. **Immediate play:** active piece, board boundaries, occupied cells, ghost/landing position, and the next required input.
2. **Near-future planning:** Hold state and the first Next pieces. The closest upcoming piece should be easiest to scan.
3. **Action confirmation:** a concise cue for meaningful events such as hold, lock, line clear, or rotation.
4. **Training guidance:** the next finesse step or a relevant rhythm insight, presented only when it helps the current task.
5. **Session metrics and configuration:** score, counts, tuning controls, and deeper settings; available without constantly pulling focus from play.

This is a priority order, not a mandate to hide useful information. A mode's purpose can legitimately promote a training cue, but that choice should be explicit and testable.

### Element relationships and transitions

- **Board ↔ previews:** use a shared spatial rhythm and consistent piece geometry. Preview placement should make the relationship to the board obvious, not make the interface look like a row of unrelated cards.
- **Hold ↔ Next:** treat them as one planning pair with distinct meanings: Hold is stored optionality; Next is ordered future information. Empty Hold must be unambiguous.
- **Input ↔ response:** the visual response must confirm the action that actually happened. Effects must not delay the engine or suggest a rotation/movement that was rejected.
- **Board event ↔ training feedback:** feedback should be anchored to the event or its result. Avoid persistent high-salience overlays that mask cells or interfere with reading the active piece.
- **Active play ↔ settings:** tuning should be easy to access, but opening or adjusting settings must not accidentally consume gameplay input or obscure essential context.
- **Desktop ↔ mobile:** preserve the same mental model even if the spatial arrangement changes. Responsive behavior must not reorder information in a way that breaks the player's learned scan path.

### What the source currently tells us

Observed in repository source; these are not visual QA findings:

- The HTML uses a board-first composition with Hold/Next, HUD, rules/settings, and responsive layout rules. Several responsive breakpoints alter the column structure and ordering.
- The board uses a fixed 10 × 20 logical grid with 28px cells in the renderer; narrow-screen CSS scales the board cell size.
- Hold and Next are rendered by the same preview helper, while queue length is configurable and clamped by the renderer.
- The engine records gameplay actions and exposes training state, finesse prompts, rhythm reports, and callbacks for state changes.
- The settings UI persists many controls locally and can re-render the board when visual tuning values change.
- The renderer has an explicit reduced-motion path for the 180-degree turn animation, including a fallback that releases the animation state. This is a good example of preserving game-state correctness when visual motion is suppressed.

These observations justify testing information flow and transition behavior before proposing decorative changes. Source inspection alone cannot establish whether the live layout feels seamless.

### Prioritized hypotheses to validate

| Priority | Hypothesis | How to validate | Failure signal |
| --- | --- | --- | --- |
| P0 | Players can scan board → Hold → first Next piece without losing the active piece. | Inspect desktop and mobile at representative widths; perform repeated placements while verbalizing the scan order. | Eyes/attention repeatedly lose the active piece or the next piece is hard to locate. |
| P0 | Feedback confirms actions without interrupting control. | Test accepted and rejected rotations, Hold, hard drop, line clear, and reduced-motion mode. | Visual response contradicts engine state, delays input, or hides the landing/board. |
| P0 | The board remains the dominant play surface across responsive layouts. | Check 901px, 900px, 560px, 520px boundaries plus actual phone dimensions. | Board is squeezed, jumps position unexpectedly, or supporting panels displace immediate play information. |
| P1 | Hold and Next communicate stored vs ordered information with no ambiguity. | Test empty Hold, occupied Hold, swapping, queue-size extremes, and color-only settings. | The meaning/order of a preview must be inferred from color alone or pieces are clipped. |
| P1 | Training guidance helps the next input rather than adding a second task. | Run finesse on/off and rhythm reporting through multiple placements. | Prompt obscures relevant cells, remains stale, or demands attention after its value has passed. |
| P2 | HUD metrics can be read peripherally without becoming visual noise. | Compare a short play session with and without looking at the metrics. | Metrics repeatedly draw attention during active placement but do not inform a decision. |

Do not mark a hypothesis as passed without a recorded manual check or reproducible automated test. Automated tests verify logic; they do not substitute for observing the visual scan path.

### Flow quality scorecard

For future reviews, score each dimension as **Pass / Needs evidence / Fail**, and link evidence:

- **Continuity:** transitions between states feel like consequences of the player's input, not disconnected effects.
- **Legibility:** essential game state remains quickly distinguishable at normal play speed.
- **Predictability:** identical inputs under identical rules yield understandable outcomes.
- **Priority:** only the information needed now competes for primary attention.
- **Spatial coherence:** board, Hold, Next, and controls feel related by alignment, scale, and scan order.
- **Recovery:** interruption, settings, reset, focus loss, and reduced motion do not strand the player or confuse the game state.
- **Adaptability:** desktop, mobile, color-only modes, and user settings preserve the same core mental model.

A change should improve at least one identified friction point without regressing any P0 dimension. If evidence is inconclusive, keep the proposal as a hypothesis rather than changing the live interface.

### Research connections

- The game-feel survey separates physicality, amplification, and support. For this trainer, apply that as: tune input/motion for predictability; amplify only events that need confirmation; streamline the route from intent to action. Source: [Designing Game Feel: A Survey](https://arxiv.org/abs/2011.09201).
- TetrisWiki describes Next as ordered preview information and Hold as a stored piece. Use these as the functional distinction; do not copy another game's exact layout as a universal rule. Sources: [Tetris Guideline](https://tetris.wiki/Tetris_Guideline), [Hold piece](https://tetris.wiki/Hold_piece).
- Movement finesse is specifically about minimizing inputs and making placement more efficient. Training feedback should therefore reinforce clarity and repeatability rather than add visual spectacle. Source: [Movement finesse](https://tetris.wiki/Movement_finesse).
- Dark-mode guidance cautions against relying on highly saturated colors against dark backgrounds for essential visibility. Treat color as one cue within a larger state language. Source: [Nielsen Norman Group](https://www.nngroup.com/articles/dark-mode-users-issues/).

### Change gate

Before moving from model work to a code change, write down:
1. The exact friction observed in the running trainer.
2. The affected player decision and moment in the loop.
3. The smallest change likely to remove that friction.
4. The game-state, responsive, accessibility, and reduced-motion regressions to test.
5. Evidence from before/after checks.

No broad redesign, theme pass, or deployment is justified by the model alone.


## Version 1.2 — Theme as part of the game, not a layer around it

### Principle: the game owns the visual language

The visual theme must emerge from the board's geometry, piece states, motion, and training purpose. It must not read as a decorative website skin placed around an otherwise unrelated game.

**The board is the source of truth for the interface's visual language.** Panels, previews, prompts, and controls should feel like extensions of the same game system, while retaining their own clear functions.

This changes how future visual decisions are judged:

- Do not begin with generic cards, glow, gradients, borders, or a palette and then wrap the game in them.
- Begin with game meaning: active piece, ghost/landing position, locked cells, held piece, ordered queue, input state, and training feedback.
- Let the theme express those meanings consistently through shape, contrast, spacing, color, and restrained motion.
- Use decoration only when it reinforces hierarchy or makes state easier to read. If an effect could be removed without losing clarity, feedback, or identity, it is secondary.
- A subtle dark atmosphere is the canvas, not the feature. The game should still feel distinctive when effects are reduced or disabled.

### Translate game states into a shared visual grammar

| Game meaning | Visual responsibility | Flow rule |
| --- | --- | --- |
| Active piece | Highest immediate clarity; distinct from locked cells and background | Never let ornament compete with piece position or orientation |
| Ghost / landing projection | Predictive, secondary but easy to track | Clearly related to the active piece without appearing equally solid |
| Locked stack and board grid | Stable spatial reference | Keep boundaries and cell occupancy legible under every supported visual setting |
| Hold | A single stored option | Communicate empty/occupied state clearly; do not imply it is part of the ordered queue |
| Next queue | Ordered future information | Make order and near-term priority obvious; keep preview geometry consistent with piece geometry |
| Input and rotation response | Immediate confirmation of a successful state change | Motion must follow the engine's committed result and must not delay subsequent input |
| Finesse cue | Temporary instruction relevant to the next action | Keep it readable without obscuring the board information needed to execute it |
| Rhythm insight / HUD | Secondary analysis | Calm, compact, and subordinate during active play; more detail can live outside the immediate action path |
| Settings and rule controls | Deliberate configuration, not part of the falling-block field | Visually related to the game but clearly separate in interaction purpose |

This table describes intended semantics. It is not a claim that the current UI already satisfies every row.

### Make visual transitions carry meaning

The theme should be felt in how the game changes state, not only in static styling.

- A movement should read as a direct response to the input, not a decorative animation.
- A rotation should preserve the player's sense of piece identity and final orientation.
- A lock or clear should make the board's new state immediately understandable.
- Hold should clearly transfer the active piece and update the stored/next information without visual ambiguity.
- A finesse prompt should appear when it is actionable and recede when its instruction is no longer relevant.
- Opening settings or changing a visual option should not make the game feel like it has switched to a different product.
- Reduced-motion and color-only modes must preserve state meaning; they should remove a channel, not remove understanding.

Avoid adding transitions to every component simply to make the UI feel animated. Motion is useful when it communicates continuity, cause, or state change. Otherwise, stillness is part of the rhythm.

### Integration over containment

The current page source contains several card-like support panels and layered visual treatments. That is useful evidence to inspect, not a reason to add more surfaces. Future work should test whether the board, Hold, Next, and training cues read as one composition rather than separate boxed widgets.

Preferred decision order:
1. Establish the scan path and relative scale.
2. Establish which game state each element communicates.
3. Align shared geometry, spacing, and edges so related elements feel connected.
4. Tune contrast and color for state recognition.
5. Add only the smallest visual or motion cue that improves understanding.
6. Check the whole play loop again at desktop and phone sizes.

### New acceptance criteria

A theme/flow change is acceptable only if all relevant criteria pass:

- **Native:** it looks and behaves as though it belongs to this trainer's game mechanics, not a generic dashboard.
- **Continuous:** the eye can move between board, Hold, and Next without feeling that each belongs to a different visual system.
- **Quietly expressive:** character comes from game-specific geometry and meaningful state changes, not constant glow or movement.
- **State-first:** the player can distinguish active, projected, stored, upcoming, and locked pieces at a glance.
- **Input-first:** feedback never makes the engine feel slower or less predictable.
- **Graceful without effects:** reduced motion, color-only modes, and restrained display settings preserve the same core meaning.
- **Responsive but familiar:** changing screen size rearranges the composition without changing the player's mental model.

### Practical next step

Do not launch a broad redesign. First review a real play session and capture three moments: a normal placement, a Hold swap, and a finesse/rotation cue. For each moment, trace the eye and the visual state from input through result to the next decision. Record the single biggest point of visual separation or interruption. Fix that one point, then compare the same moments before and after.

The next code change should be chosen from observed friction in those transitions, not from a desire to make the page look more themed.
