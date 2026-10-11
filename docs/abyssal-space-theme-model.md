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


---

# Research dossier and design synthesis (expanded)

This section turns external research into explicit decisions for this project. References are not mood-board decoration: each source has a scope, a finding, a translation into design rules, and limits on what can reasonably be inferred.

## 13. Research method and evidence levels

Use three evidence labels when making implementation decisions:

- **Empirical / standards-based:** peer-reviewed studies, official accessibility standards, browser platform documentation, and primary scientific sources. These establish constraints or useful frameworks, not necessarily the exact best-looking implementation.
- **Reference observation:** real game interfaces, scientific imagery, underwater photography, and space imagery. These provide visual examples and compositional patterns, not usability proof.
- **Project hypothesis:** a specific proposal for 180436 that must be checked with screenshots, interaction, and player feedback.

Do not cite a source as proof of an aesthetic choice it did not test. A scientific explanation of ocean color supports a believable palette; it does not prove that cyan UI is more usable. A game-feel survey gives a framework for feedback; it does not prove that a line-clear glow will improve this game. Every project hypothesis must be validated in the actual interface.

## 14. Research source → decision ledger

### A. Ocean light is filtered by depth, not painted uniformly blue

**Primary sources**
- NOAA Ocean Service, “Why is the ocean blue?” https://oceanservice.noaa.gov/facts/oceanblue.html
- NOAA Ocean Exploration, “Why are so many deep-sea animals red in color?” https://oceanexplorer.noaa.gov/ocean-fact/red-color/
- NOAA Ocean Exploration, “Student Investigation: Light and Color in the Deep Ocean.” https://oceanexplorer.noaa.gov/lesson/bioluminescence-light-and-color/

**Finding:** Water absorbs wavelengths differently; red wavelengths are filtered relatively quickly, blue penetrates farther, and suspended material can alter the hue. At sufficient depth, natural sunlight is scarce or absent. Bioluminescence therefore reads as a local light source against darkness, rather than a whole environment uniformly illuminated in bright blue.

**Translation to 180436**
1. Build a depth gradient, not a flat “ocean blue” background: near-black abyss at the edges, blue/teal scattering in a few broad distant regions, and localized luminous points.
2. Let most of the canvas remain dark. Light should have a source and a reason: an instrument edge, a distant particle, a focus state, or a short game event.
3. Keep the UI's ambient illumination mostly blue-cyan/teal. Use violet as the cosmic counterpoint. Use warm colors sparingly for warnings or as tiny distant nebula accents, not as a competing interface palette.
4. Avoid a uniform blue overlay on the board; it would muddy tetromino identity colors and weaken the instrument/atmosphere separation.
5. Use the scientific analogy with restraint: this is stylized deep space blended with liquid, not a claim to simulate underwater optics accurately.

**Project hypothesis to test:** multiple low-opacity gradients and sparse points will create stronger depth than one saturated radial gradient. Compare at full desktop and phone width; the board must retain the same perceived contrast.

### B. Bioluminescence is temporal, spatial, and eventful

**Peer-reviewed source**
- Barati, Karana, Pont & van Dortmont, “Living Light Interfaces — An Exploration of Bioluminescence Aesthetics,” ACM DIS 2021. https://doi.org/10.1145/3461778.3462038
- TU Delft research portal record: https://research.tudelft.nl/en/publications/living-light-interfaces-an-exploration-of-bioluminescence-aesthet/

**Finding:** This research studies the visual character of bioluminescent microalgae, including variation in intensity over time, texture, spatial distribution, and stimuli such as orbital rotation, pulsation, and vibration. It provides a vocabulary for “living light”; it does not establish that constant animation is desirable in a competitive game.

**Translation to 180436**
1. Prefer **local light events** to constant glowing chrome. A successful placement can produce a tiny local afterglow; Hold can briefly illuminate its own station; focus can brighten one edge.
2. Give each light response an envelope: a clear onset, brief peak, and calm return. Do not leave the whole UI breathing continuously.
3. Give each effect a spatial source and target. A board event belongs at the board; a preview change belongs at the preview; keyboard focus belongs at the focused control.
4. Distinguish **ambient life** from **interaction feedback**. Ambient motion should be extremely subtle and optional. Interaction feedback should be faster, clearer, and causally linked to the action.
5. Use different temporal patterns sparingly: a brief pulse for acknowledgement, a localized sweep for row clearing, and a stable outline for focus. Avoid making every event use the same pulse.
6. Do not simulate biological movement with random noise or particle spam. The reference's value is the relationship between stimulus, intensity, texture, and space.

**Project hypothesis to test:** one well-timed local response will make actions feel more deliberate than a global flash. Measure clarity first; visual delight is only a benefit if the player still reads the board immediately.

### C. Game feel research: tune, amplify, and support

**Primary academic sources**
- Pichlmair & Johansen, “Designing Game Feel: A Survey,” *IEEE Transactions on Games*. https://doi.org/10.1109/TG.2021.3072241
- Open preprint: https://arxiv.org/abs/2011.09201
- Hicks, Dickinson, Holopainen & Gerling, “Good Game Feel: An Empirically Grounded Framework for Juicy Design,” DiGRA 2018. https://doi.org/10.26503/dl.v2018i1.936
- Lin et al., “What Features Influence Impact Feel? A Study of Impact Feedback in Action Games,” IEEE GEM 2022. https://doi.org/10.1109/GEM56474.2022.10017782

**Finding:** The game-feel survey groups design intentions around physicality, amplification, and support: making interaction coherent/predictable, making important events legible, and helping the player's intent translate into action. The “juicy design” literature also cautions that audiovisual feedback is multi-factor and hard to reduce to “add effects.”

**Translation to 180436**
- **Tune:** the piece, ghost, locked stack, and board geometry must remain stable and predictable. Visual polish must not fake movement, obscure landing position, or imply timing/mechanics that are not present.
- **Amplify:** a meaningful placement or clear can receive a concise, local visual confirmation. Intensity should be proportional to event significance. Routine inputs should not all get celebratory effects.
- **Support:** Hold/Next and training cues should make the next decision easier to read. Finesse states should retain their actual semantics; completed, next, pending, and faulted must not be confused.
- **Streamline:** do not make any action wait for an animation. Feedback should acknowledge an action without blocking or altering the game loop.
- Avoid importing hit-stop, camera shake, screen punch, or other action-game conventions by default. This is a precision falling-block trainer; those techniques may undermine trust and should be considered out of scope unless separately justified and approved.

**Project hypothesis to test:** the theme succeeds when it improves *anticipation, action confirmation, and resumption* without raising cognitive load. In tests, ask whether Hold/Next is quicker to parse and whether feedback distracts from the next falling piece.

### D. Motion should explain, not delay

**Primary platform and standards sources**
- Google Design, “Making Motion Meaningful.” https://design.google/library/making-motion-meaningful
- Material Design, “Duration & easing.” https://m1.material.io/motion/duration-easing.html
- W3C, “Understanding Success Criterion 2.3.3: Animation from Interactions.” https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions
- W3C technique C39, `prefers-reduced-motion`: https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html

**Finding:** Motion can show relationships and guide attention, but unnecessary movement can distract or cause discomfort. Motion should respond to user intent and not create waiting. Reduced-motion support is a real user need, not a cosmetic option.

**Translation to 180436**
1. Define a motion token set for micro-feedback, state transition, and ambient movement; never choose timing ad hoc in every selector.
2. Short UI transitions may begin around 120–200 ms, then be adjusted by actual distance and frequency. Ambient drift, if retained, should be much slower and should not be needed to understand any state.
3. Prefer a direct change of luminance/outline for repeated gameplay feedback; movement is justified only when it explains a relationship or confirms a meaningful event.
4. Support `prefers-reduced-motion: reduce` comprehensively. Disable ambient drift, parallax, nonessential movement, and scaling; preserve focus, state, and success feedback with static contrast/shape.
5. No flashing, camera shake, board displacement, or motion that risks hiding the active piece.
6. Motion must never block input, alter gravity/lock timing, or change the order of game events.

### E. Dark UI legibility requires restraint and actual contrast checks

**Sources**
- W3C WCAG 2.2, Contrast Minimum (SC 1.4.3): https://www.w3.org/TR/WCAG22/#contrast-minimum
- Nielsen Norman Group, “Dark Mode: How Users Think About It and Issues to Avoid.” https://www.nngroup.com/articles/dark-mode-users-issues/
- MDN, `backdrop-filter`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter

**Finding:** In dark interfaces, thin type can disappear and both overly thin and overly heavy weights can harm legibility. WCAG 2.2 sets a 4.5:1 minimum contrast for ordinary text and 3:1 for large text, subject to its defined exceptions. `backdrop-filter` is supported on modern browsers but not all older browser/device combinations.

**Translation to 180436**
1. Treat text contrast as a measurable constraint, not a visual impression. Test the final composited color of text over each surface, including gradients and transparency.
2. Aim for WCAG AA text contrast for ordinary interface text; do not use the quietest color for information needed during play.
3. Do not solve dark-theme legibility with glow or text shadow. Increase luminance, weight, or surface separation instead.
4. Keep small labels concise and readable. Avoid ultra-thin type, excessive tracking, and tiny low-contrast technical labels.
5. Use a solid/translucent surface fallback if blur is unavailable. The interface must not depend on `backdrop-filter` for its structure or contrast.
6. Glass is a material accent, not a blanket effect. A complex moving background behind small text is not an acceptable glass surface.

### F. Rendering performance is part of visual quality

**Sources**
- web.dev, “How to create high-performance CSS animations”: https://web.dev/articles/animations-guide
- Chrome/web.dev source notes on animation performance: https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/animations-and-performance/index.md
- MDN, `backdrop-filter`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter

**Finding:** Animating layout- and paint-triggering properties can be expensive. Opacity and transform are generally the preferred starting points for smooth animations, but even those should be measured. Large blur regions and layered filters can be costly, especially on mobile.

**Translation to 180436**
- Start with static CSS gradients, one or two pseudo-element layers, and a sparse set of static stars; don't begin with canvas, video, or dozens of animated particles.
- If animation is needed, test opacity/transform first and profile on an actual mobile device.
- Avoid animating blur radius, box-shadow spread, width/height, grid geometry, or the board itself.
- Do not add `will-change` globally; use it only when profiling identifies a real need.
- Test sustained gameplay, not just a screenshot. Dropped frames during input undermine the entire “precision instrument” idea.

### G. Reference imagery should establish principles, not become a wallpaper collage

**Primary scientific imagery sources**
- NASA image and media library: https://images.nasa.gov/
- NASA Science, Hubble imagery and nebula background: https://science.nasa.gov/mission/hubble/
- NOAA Ocean Exploration image and education resources: https://oceanexplorer.noaa.gov/

**How to use these references**
1. Study **value structure**: large dark regions, sparse bright structures, and separation between foreground and distant light.
2. Study **scale**: a nebula is a vast low-frequency form, not a tiny repeated texture; particles are sparse relative to the volume.
3. Study **color relationships**: deep cool tones can coexist with isolated violet or warm accents without making every region saturated.
4. Study **light falloff**: luminous sources create local influence; the whole image is not equally bright.
5. Study **edge treatment**: atmospheric forms are diffuse, while near objects have crisp edges. Transfer this contrast to the UI hierarchy.
6. Prefer procedural CSS gradients and shapes for the live background when they can deliver the same visual idea. Use external images only when they materially improve the art direction and their license, size, crop, and contrast behavior are understood.

Do not copy NASA/NOAA imagery wholesale as a page background by default. A photographic nebula can dominate the board, introduce unpredictable color behind text, and make the interface look like a wallpaper. Reference images should guide composition and lighting, while the UI remains deliberately authored.

## 15. Consolidated art-direction rules

The sources above converge on the following actionable rules:

### Rule 1 — Darkness is depth, not emptiness
Keep the majority of the environment low-luminance, but build subtle differences between void, water volume, and instrument surfaces. Pure black everywhere feels flat; bright gradients everywhere destroy the abyss.

### Rule 2 — Light has a source
Every bright element should read as a distant star, diffuse nebula, instrument edge, active focus, or event response. Remove light that has no semantic or compositional role.

### Rule 3 — The board is a precision window
The board receives the sharpest geometry, highest useful contrast, and least visual interference. Atmospheric effects never cross the active piece or ghost in a way that reduces readability.

### Rule 4 — Glass is an edge and a depth cue
Use translucent blue-green surfaces, a fine top edge, and a restrained inner highlight on selected utility surfaces. Do not wrap every component in blur and a thick luminous border.

### Rule 5 — Bioluminescence is earned
Reserve the strongest cyan/teal response for a meaningful state or interaction. At rest, the UI should feel alive through composition and low-frequency light, not through constant pulsing.

### Rule 6 — Violet is cosmic distance
Use nebula violet as a secondary environmental color and rare accent. It must not compete with the existing seven piece colors or become the default color of every button and panel.

### Rule 7 — Feedback is local and causally truthful
The visual response must match an event that actually happened. No fake success states, guessed engine events, or animation that suggests a rule change.

### Rule 8 — Readability beats material realism
If transparency, bloom, gradients, or tiny labels lower contrast, simplify the effect. The interface should still work with no blur, no animation, and a dim display.

### Rule 9 — Responsiveness is a composition decision
At each breakpoint, recompose the instrument cluster instead of merely scaling it. Test the existing 901px, 720px, 560px, and 520px boundaries and add intermediate widths if evidence reveals a failure.

### Rule 10 — The theme must feel coherent during play, not only at rest
Capture states while a piece is active, after Hold, with a populated Next queue, during finesse guidance, after a lock/clear, with the rhythm report present, and with settings expanded. Static hero screenshots alone are insufficient.

## 16. Visual test matrix and scoring rubric

Score each category 0–4 at matched viewport sizes: 0 = broken/absent; 1 = weak; 2 = mixed; 3 = strong; 4 = exceptional. Do not average away a critical failure: readability and gameplay clarity must each score at least 3 before merge.

| Category | 0–4 review question |
|---|---|
| Spatial depth | Does the screen feel like a deep volume, not a flat background? |
| Liquid material | Do surfaces feel suspended in the same medium without becoming cloudy? |
| Celestial identity | Is the cosmic quality present through scale, color, and sparse light? |
| Board primacy | Can the player find and read the active piece immediately? |
| Planning flow | Are Hold and Next easy to scan as a connected system? |
| State feedback | Does every accent have a clear cause and correct meaning? |
| Type/contrast | Are labels and controls readable against their actual backgrounds? |
| Motion quality | Is feedback fast, meaningful, non-blocking, and reduced-motion safe? |
| Mobile coherence | Does the small-screen layout feel intentionally composed? |
| Performance | Does sustained play remain smooth on a real phone? |

**Release gate:** no merge while board primacy, planning flow, type/contrast, or mobile coherence is below 3/4. A strong overall score cannot compensate for a failed gameplay-critical category.

### Screenshot protocol
- Capture the current production UI and the proposed theme at the same viewport, zoom, browser, and game state.
- Required viewports: 1440×900, 1024×768, 900×900, 720×900, 560×900, and a narrow phone around 390×844; include a 320px stress test if the existing app supports it.
- Required states: idle/active piece, Hold populated, Next queue populated, finesse prompt visible, rhythm card visible, settings expanded, keyboard focus, and reduced motion.
- Record one sentence per screenshot: intended improvement, visible evidence, and any regression.
- Verify game controls and run self-tests/Playwright diagnostics after styling changes. If screenshot capture is unavailable, say so; do not claim visual validation that did not happen.

## 17. Implementation work packages and deliverables

### Package 1 — Theme architecture
**Deliverable:** semantic CSS tokens for environment, material, text, light, spacing, shape, shadow, and motion; documented ownership and usage. Remove contradictory legacy colors only after auditing all selectors.

### Package 2 — Atmospheric environment
**Deliverable:** a carefully composed far field and water-volume layer using a small number of CSS gradients and optional sparse star marks. Verify the board region stays visually quiet and fixed-position effects do not create mobile scroll/performance issues.

### Package 3 — Instrument materials and composition
**Deliverable:** one clear playfield treatment, one family of glass/utility surfaces, one preview-station treatment, and one focus/active treatment. Align Hold, board, Next, and performance metrics with explicit spacing and layout rules.

### Package 4 — State feedback
**Deliverable:** a state-to-visual mapping that references actual existing DOM/state hooks. Implement only events the runtime reliably exposes without changing game mechanics. Use static states for reduced motion.

### Package 5 — Accessibility and performance
**Deliverable:** contrast measurements, keyboard focus review, reduced-motion review, fallback for unsupported blur, and mobile performance check.

### Package 6 — Visual acceptance
**Deliverable:** matched before/after screenshots, scorecard, regression results, and a concise list of remaining issues. Only after this package passes should a production merge be considered.

## 18. Source index

1. NOAA Ocean Service — Ocean color and wavelength absorption: https://oceanservice.noaa.gov/facts/oceanblue.html
2. NOAA Ocean Exploration — Deep-sea color and light penetration: https://oceanexplorer.noaa.gov/ocean-fact/red-color/
3. NOAA Ocean Exploration — Light and color in the deep ocean: https://oceanexplorer.noaa.gov/lesson/bioluminescence-light-and-color/
4. Barati et al., ACM DIS 2021 — Living light interface aesthetics: https://doi.org/10.1145/3461778.3462038
5. Pichlmair & Johansen, IEEE Transactions on Games — Designing Game Feel survey: https://doi.org/10.1109/TG.2021.3072241
6. Hicks et al., DiGRA 2018 — Empirically grounded framework for juicy design: https://doi.org/10.26503/dl.v2018i1.936
7. Lin et al., IEEE GEM 2022 — Impact feedback framework: https://doi.org/10.1109/GEM56474.2022.10017782
8. Google Design — Making Motion Meaningful: https://design.google/library/making-motion-meaningful
9. Material Design — Duration and easing: https://m1.material.io/motion/duration-easing.html
10. W3C WAI — Animation from interactions: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions
11. W3C WAI — Reduced-motion CSS technique: https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html
12. W3C — WCAG 2.2 contrast minimum: https://www.w3.org/TR/WCAG22/#contrast-minimum
13. Nielsen Norman Group — Dark mode readability pitfalls: https://www.nngroup.com/articles/dark-mode-users-issues/
14. MDN — Backdrop filter behavior and support: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
15. web.dev — High-performance CSS animations: https://web.dev/articles/animations-guide
16. NASA — Image and media library: https://images.nasa.gov/
17. NASA Science — Hubble mission imagery: https://science.nasa.gov/mission/hubble/

The model is intentionally much more detailed than a mood board: it records the evidence, translates it into implementation rules, identifies the hypotheses that need testing, and defines the release gate. It should be used as the working design contract for the full theme pass.
