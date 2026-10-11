# Abyssal Space — Full Theme & Experience Model

**Status:** Design model / implementation contract  
**Scope:** Visual system, spatial atmosphere, layout, typography, UI surfaces, state feedback, and motion  
**Non-goals:** Changing game rules, piece geometry, board dimensions, input bindings, scoring, gravity, lock timing, training logic, or the meaning of existing metrics.

## 1. Product thesis

180436 should feel like a precise training instrument suspended inside a vast, beautiful alien ocean: not a spaceship dashboard pasted over a game, and not an underwater illustration behind a generic interface. The player is inside a quiet, deep-space liquid environment. The board is the luminous instrument at the center; previews, training cues, and statistics are nearby instruments sharing the same atmosphere.

**Experience sentence:** *A clear geometric game, floating in a deep, living cosmos.*

The experience should evoke:
- **Abyss:** enormous depth, quiet darkness, distance, and room to breathe.
- **Suspension:** translucent layers, soft edge refraction, gentle gradients, and objects that feel held in fluid rather than pinned to flat cards.
- **Celestial beauty:** sparse stars, distant nebulae, and restrained spectral color.
- **Bioluminescence:** light appears where information matters, with brief purposeful pulses rather than permanent neon.
- **Precision:** the board remains crisp, legible, stable, and faster to read than the surrounding atmosphere.

The mood is wondrous but not noisy; tactile but not skeuomorphic; expressive but never at the expense of training.

## 2. Experience hierarchy

The visual hierarchy is a strict order, not a collection of equal cards.

1. **Playfield — the instrument.** Highest contrast and clearest geometry. The player must immediately locate the active piece, landing/ghost position, stack, and board boundary.
2. **Active planning — Hold and Next.** A connected orbit/rail around the board, clearly subordinate to the playfield but easy to scan before a decision.
3. **Action confirmation — placement and training cues.** Short-lived visual confirmation close to the relevant source; never an unrelated global flourish.
4. **Performance — score, lines, combo, finesse, rhythm.** Quiet instrumentation. Metrics become brighter only when their value or state is relevant.
5. **Controls and configuration.** Calm, accessible, discoverable. Settings must not compete with the active play loop.
6. **Atmosphere.** Background depth and liquid light. It may enrich peripheral vision, but must never lower the contrast of gameplay information.

At any moment, one thing should lead. The atmosphere is the environment, not the content.

## 3. Art direction: the Abyssal Space palette

Use semantic tokens rather than scattering literal colors through CSS. These values are initial design anchors; check them against the real rendered board and text before finalizing.

| Token | Starting value | Role |
|---|---|---|
| `--abyss-void` | `#030711` | Outer page darkness |
| `--abyss-deep` | `#071321` | Main atmospheric field |
| `--abyss-blue` | `#0A2032` | Distant water/space gradients |
| `--glass-surface` | `rgba(12, 29, 44, .72)` | Secondary floating surfaces |
| `--glass-raised` | `rgba(18, 43, 61, .78)` | Interactive or raised surfaces |
| `--glass-edge` | `rgba(135, 207, 230, .20)` | Fine glass edge |
| `--glass-edge-active` | `rgba(113, 231, 246, .58)` | Active/focused edge |
| `--text-primary` | `#E8F6FC` | Primary readable text |
| `--text-secondary` | `#A5C0D0` | Secondary labels |
| `--text-quiet` | `#7895A9` | Low-priority metadata; verify contrast |
| `--biolume-cyan` | `#65E7E8` | Primary interface signal |
| `--biolume-teal` | `#58CBB9` | Secondary living-light accent |
| `--nebula-violet` | `#9A8BFF` | Rare celestial accent |
| `--star-pearl` | `#D8F7FF` | Tiny high-energy highlights |
| `--danger-coral` | `#FF8798` | Errors or destructive state only |

Tetromino identity colors belong to the game and must remain distinct from the ambient palette. Never recolor pieces merely to match the theme. Avoid turning every surface cyan or violet: bioluminescence is precious because it is sparse.

### Color behavior
- The page background is a layered field of nearly-black navy, faint blue-green water, and a remote violet nebula—not a single flat color.
- Keep the board interior dark and visually quieter than its active piece. Board lines are subtle; the board boundary is unmistakable.
- Use cool luminous edges on selected/focused states, not on every card at rest.
- Gradients should imply depth and scattered light, not glossy buttons or loud gaming RGB.
- Use color plus shape, position, text, or icon to communicate state. Color alone is insufficient.
- Check text and control contrast against the actual composited/translucent backgrounds; don't assume the token values guarantee accessibility.

## 4. Space made liquid: spatial and material rules

The theme's signature is not a starfield alone. It is the meeting of distant cosmic scale and near-field fluid material.

### Three depth planes
1. **Far field:** static or extremely slow gradient haze, sparse pinprick stars, and broad low-opacity color blooms. These are far behind the UI and have no sharp decorative detail.
2. **Water volume:** faint blurred light shafts, soft caustic-like gradients, and drifting particulate hints. Use CSS gradients and a few restrained pseudo-elements before considering image assets or canvas.
3. **Instrument plane:** the board, Hold/Next, and controls. These are crisp, high-legibility objects with fine cool edges, restrained inner highlights, and soft shadows that imply suspension.

Use depth cues consistently: farther elements are softer, dimmer, larger-scale, and lower contrast; closer elements are sharper and more legible. Never blur text, piece cells, controls, or the board grid to simulate atmosphere.

### Floating glass, not card soup
- Replace repeated heavy bordered cards with a coherent surface grammar: one primary instrument area, lightweight preview stations, and quieter utility surfaces.
- Glass surfaces are translucent only where the underlying background stays calm. Use a solid-enough fallback for browsers or situations where transparency harms readability.
- Give edges a thin cool highlight and shadows a diffuse blue-black tint. Avoid thick borders, high-radius pill-everything styling, and strong drop shadows on every block.
- Reserve a distinct raised treatment for focused, pressed, selected, or active states.
- The board remains a deliberate dark well; do not make the grid itself look like a translucent panel.

### Liquid motion
The environment may drift; gameplay must not drift. The board and piece positions remain mechanically exact. Background motion, if used, is slow and peripheral. No permanent bouncing, breathing cards, bobbing panels, camera movement, or parallax that competes with key presses.

## 5. Composition and layout model

### Desktop
- Treat the board as the central anchor with a deliberate quiet margin around it.
- Hold is the nearest planning station before the board's top/side scan; Next is the continuation of the same planning system, not a separate unrelated card.
- Use shared alignment lines, consistent label typography, and coordinated spacing to make these elements feel like one instrument cluster.
- Place score and performance readouts in a lower-priority band or compact side instrument. Don't let large stat cards rival the board.
- Rules and settings are a utility zone. They should be visually quiet and structurally separate from immediate piece planning.
- Avoid creating an overly wide empty shell just to imply space; negative space must support focus and scale.

### Mobile
- Preserve the board as the focal anchor and keep controls and previews close enough to understand.
- Recompose the same visual language into a deliberate vertical sequence: playfield, immediate planning information, essential status, then settings/support.
- Do not shrink labels to fit a desktop arrangement or rely on desktop-only ordering.
- Ensure Hold/Next previews remain distinguishable, touch targets remain usable, and atmospheric backgrounds do not obscure small screens.
- Test the actual existing responsive breakpoints and board cell sizing before altering layout.

### Geometry and rhythm
- Use a consistent spacing scale (e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48 px).
- Use crisp geometry for the board and a slightly softer geometry for environmental surfaces; the contrast between precision and suspension is intentional.
- Use one shared label style for instrument labels: compact, legible, modest tracking. Don't make every label tiny or excessively letter-spaced.
- Avoid relying on positional selectors such as `:nth-of-type()` as the long-term styling contract for important components. Prefer stable semantic classes when implementation work begins.

## 6. Typography and language

- **Primary UI:** highly legible system sans-serif, with a consistent weight scale.
- **Instrument numerals and micro-labels:** restrained monospace for values that benefit from a technical readout; don't force all text into a terminal aesthetic.
- **Brand/display:** a distinctive but controlled face or weight; no stacked extruded text shadows, faux chrome, or excessive sci-fi letter spacing.
- Use hierarchy through size, weight, spacing, and luminance—not every technique at once.
- Labels should name the actual task or metric plainly. Avoid fictional spacecraft terminology when it slows a player trying to train.

## 7. Interaction-state grammar

Every visual state must have a reason, a source, a duration, and a reduced-motion equivalent.

| State/event | Visual response | Must not do |
|---|---|---|
| Idle | Quiet instrument edges; faint atmospheric depth | Constantly pulse every panel |
| Keyboard focus | Clear high-contrast outline and subtle cool edge | Remove browser focus or use glow alone |
| Pressed control | Brief inward/brightness response | Delay the action for an animation |
| Hold action | Brief highlight on Hold station; preview changes clearly | Flash the whole screen or add mechanics |
| Queue/Next change | Clear local update, optionally a tiny fade/edge shimmer | Animate every queued piece independently for long durations |
| Piece locks | Precise, brief contact/settle cue at the board, if it can be added without changing gameplay timing | Shake the board, delay next spawn, or move the camera |
| Line clear | Localized luminous sweep/afterglow tied to cleared rows, brief enough not to obscure the board | Cover pieces or make effects necessary to understand the clear |
| Finesse cue | Obvious distinction between completed, next, pending, and faulted steps; consistent with current semantics | Change meaning or hide textual/accessible state |
| Rhythm/performance update | Quiet numerical transition or local highlight only when useful | Constant ticking, celebratory noise, or make the HUD more salient than play |
| Error/game-over | Distinct, accessible state with text/shape and color | Communicate through color alone |

**Animation timing:** micro-feedback should be brief and interruptible (often around 100–220 ms); ambient movement should be much slower and optional. These are starting ranges, not rigid mandates. Don't add animation where an instantaneous state change communicates better.

Honor `prefers-reduced-motion: reduce`: remove ambient drift, parallax, scale movement, and nonessential transition effects. Preserve state meaning through stable contrast, outlines, icons, and text. This follows W3C guidance on reduced motion and interaction animation.

## 8. Soundness, accessibility, and performance

- Preserve all existing keyboard and touch behavior.
- Maintain visible keyboard focus and sufficient contrast on controls, text, board boundaries, and state indicators.
- Never use glow, animation, or color as the only indication of a state.
- Avoid large blurred fixed layers, continuously animated canvas, excessive box-shadow stacks, or filters that trigger expensive repaints on mobile.
- Prefer a few static layered gradients and a small number of pseudo-elements; animate opacity or background position sparingly and only after profiling.
- Keep decorative layers `pointer-events: none`, non-interactive, and hidden from assistive technology.
- Respect reduced-motion preferences from the first implementation, not as a later patch.
- Avoid flicker and high-frequency flashing. Ambient light must never simulate emergency alarms.
- Verify on real mobile-sized viewports and low-power hardware, not just a desktop screenshot.

References:
- W3C, *Using the CSS prefers-reduced-motion query to prevent motion*: https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html
- W3C, *Understanding Animation from Interactions*: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions
- Apple Human Interface Guidelines, *Motion* (purposeful, brief, optional motion): https://developer.apple.com/design/human-interface-guidelines/motion
- Barati, Karana, Pont & van Dortmont, *Living Light Interfaces — an exploration of bioluminescence aesthetics*, DIS 2021, DOI: https://doi.org/10.1145/3461778.3462038. This research is inspiration for localized, temporal living-light behavior, not evidence that a specific game effect is automatically good.

## 9. Implementation layers

Implement in deliberate layers; don't try to make every idea move at once.

### Layer A — Foundations
1. Inventory existing selectors, component structure, renderer behavior, theme values, and responsive rules.
2. Establish semantic CSS custom properties for palette, surfaces, edges, text, spacing, radii, shadows, and motion.
3. Define the page's far-field background and the instrument surface grammar.
4. Verify text/control contrast and existing piece colors.

### Layer B — Spatial composition
1. Recompose board, Hold, Next, stats, and settings into a single hierarchy.
2. Establish desktop and mobile compositions intentionally.
3. Replace heavy repetitive cards with a small, consistent family of surfaces.
4. Keep gameplay geometry and information positions stable enough to preserve muscle memory.

### Layer C — Living-light feedback
1. Add only local, event-tied feedback that the current runtime can reliably identify.
2. Prefer CSS state classes or existing render-state hooks; do not invent events that the engine does not expose.
3. Ensure all feedback is brief, interruptible, accessible, and motion-reduced.
4. If an event hook requires gameplay changes, stop and design a no-mechanics alternative first.

### Layer D — Atmosphere and polish
1. Add sparse stars, diffuse water-light gradients, and subtle edge refraction.
2. Tune at desktop and mobile scale.
3. Profile rendering and remove effects that cost frames or harm contrast.
4. Reduce or remove any decoration that makes the board harder to read.

## 10. Evaluation contract: how to know the theme is working

A theme pass is not accepted because it adds a gradient or removes a border. It must pass all of the following.

### Visual review
- At first glance, the page reads as a beautiful underwater/celestial environment, not generic purple-on-black UI.
- The board is still the clearest and most important object.
- Hold and Next read as connected planning instruments.
- Surfaces feel suspended in the same medium; there is no mix of unrelated card styles.
- Ambient depth is visible without reducing text or piece contrast.
- Accents are sparse and meaningful; the page does not become neon clutter.

### Gameplay review
- The active piece, ghost, stack, Hold piece, and upcoming pieces remain easy to distinguish.
- The board scan path is uninterrupted.
- Finesse, rhythm, score, and lines retain their current meaning and readability.
- A user can continue playing without waiting for an animation.

### Regression matrix
- Desktop wide layout and the 901px transition.
- 720px, 560px, and 520px breakpoints already present in the codebase.
- Portrait mobile viewport and narrow phone viewport.
- Keyboard focus, mouse, touch, and settings controls.
- `prefers-reduced-motion: reduce`.
- Existing self-tests, finesse regression tests, and Playwright gameplay diagnostics.

### Evidence required for each iteration
1. State the specific visual problem and which player decision it affects.
2. Show before/after screenshots at matched viewport sizes.
3. Run existing tests and inspect the browser console.
4. Record what improved and what regressed.
5. Do not merge or deploy based on a source-only review when visual behavior can be tested.

## 11. Explicit anti-patterns

Reject:
- A generic starfield wallpaper behind unchanged cards.
- Replacing purple with cyan while retaining the same visual hierarchy.
- Applying glow to every edge, button, metric, and piece.
- Making the whole page glassy/translucent until contrast collapses.
- Excessive particles, constant motion, parallax, or screen shake.
- Treating Hold/Next as decorative widgets rather than decision aids.
- Styling only desktop while leaving mobile as an afterthought.
- Rewriting mechanics or training semantics in the name of theme.
- Declaring success without screenshot comparison and real interaction tests.

## 12. Change gate

Before each change, answer:
1. **What does the player currently see or struggle to find?**
2. **Which decision or moment does that affect?**
3. **Which layer of the model owns the problem?**
4. **What is the smallest coherent change across the whole system?**
5. **How will we compare it at the same viewport and verify no gameplay regression?**

A strong theme is a system of relationships, not a bag of effects. The target is not “more decoration”; it is a cohesive, beautiful sense of floating in liquid space while the game remains immediate, exact, and easy to read.
