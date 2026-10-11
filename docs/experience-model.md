# 180436 Experience Model: Coherent Game Flow

**Status:** Research and evaluation specification  
**Scope:** Context model only. This document does not change game mechanics, CSS, layout, or deployment.  
**Version:** 1.0

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
