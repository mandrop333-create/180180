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

---
## 19. Second-pass model upgrade: from mood to a testable experience system

This section is an implementation-oriented refinement based on the current repository, not another inspiration list. It distinguishes what exists today from what the theme should become.

### 19.1 Current implementation audit

The first theme layer establishes semantic colors, a layered static background, sparse CSS star points, glass-like utility cards, board framing, coordinated controls, focus rings, mobile control materials, and reduced-motion overrides. It is a useful base, but it is **not yet the complete underwater-space experience**.

Known gaps and risks to test:

- The atmosphere is currently made from fixed gradients and sparse CSS star points. It suggests space, but does not yet create a convincing sense of suspended liquid, particulate depth, or a light field surrounding the instruments.
- The board itself must remain optically crisp; its frame can feel submerged, but the playfield must not acquire blur or decorative noise.
- The existing game.js provides reliable state seams through trainer.options.onState, renderState, trainer.options.onRhythmReport, and trainer.options.onReset. Hold, Next, stats and finesse are already rendered from runtime state. Use those seams for truthful feedback rather than creating a parallel game state or guessing from key presses.
- Hold and Next are structurally useful but visually separate in the current DOM. Strengthen their shared planning role with alignment, consistent labels and quiet connective cues, without harming mobile scan order.
- backdrop-filter is progressive enhancement, not a required material feature. The surface must still read as a translucent instrument through layered color and edge treatment when blur is absent.
- Do not add a permanent animation loop merely to make the page feel alive. The baseline atmosphere can be static; motion should be tied to a real interaction or game event.
- The first CSS pass uses broad element selectors for buttons and form controls. Prefer component-scoped selectors wherever possible so unrelated controls and embedded settings do not inherit accidental styles.

This audit is not a claim of browser visual testing. Each point is a design/test hypothesis until checked against screenshots and real devices.

### 19.2 Experience architecture: four interacting systems

**A. Environment — the abyss.** A large, quiet low-luminance field establishes scale. It has a far field (rare tiny stars), a middle field (broad, low-contrast water/nebula gradients), and a near field (subtle edge light around instruments). The environment never conveys game state.

**B. Instruments — the cockpit.** Board, Hold, Next, statistics, training rules and settings should feel like one family of precision instruments suspended in that field. Materials share edge language, corner rhythm, type hierarchy and restrained highlights; they do not all have identical opacity or emphasis.

**C. Live play — the signal.** Active piece, ghost, lock, clear, Hold, finesse, rhythm and focus feedback are short, localized and caused by actual events. Game signals outrank atmospheric decoration. Existing tetromino colors remain the primary piece identity and must not be recolored to match the theme.

**D. Practice — the interpretation layer.** Statistics and prompts help the player understand performance without competing with the board. A number changing is not automatically a reason to flash. Highlight only meaningful changes and never use color alone to encode correctness.

The priority stack is strict: **active playfield → immediate placement/rotation feedback → Hold/Next planning → training prompt → stats → atmosphere**. If two layers compete, the lower layer yields.

### 19.3 Material grammar

| Role | Visual construction | Do not do |
|---|---|---|
| Abyss | Deep navy/blue-black base, broad low-opacity gradients, very sparse star points | Bright all-over gradients, wallpaper imagery behind labels |
| Water volume | A few large, soft color fields with different scale and position | Many tiny gradients, noisy texture, animated scan lines |
| Instrument glass | Dark teal surface, subtle translucent fill, fine cool edge, tiny top highlight | Heavy blur, thick neon outlines on every card |
| Precision window | Highest edge clarity and local contrast; clean grid and legible cells | Particles, blur, busy gradients or decorative overlays inside board |
| Bioluminescent signal | Cyan/teal reserved for focus and selected positive/active events | Permanent glow, universal cyan text, color-only meaning |
| Cosmic accent | Violet only in distant environmental fields and rare secondary cues | Reverting all controls and panels to purple |
| Warning/error | Coral/rose plus explicit text/state marker | Red flash as the only indicator; false alarm styling |

A surface should remain visually understandable when blur and shadow are disabled. The silhouette, fill, edge and hierarchy must do the work.

### 19.4 State-to-feedback contract

The theme may listen to existing runtime state and callbacks, but it must not infer an event that the engine has not reported. Treat these as target behaviors; confirm the exact callback/state semantics before implementation.

| Runtime condition/event | Intended response | Timing / restraint |
|---|---|---|
| Idle / no new event | Stable atmospheric field and quiet instrument edges | No continuous pulsing |
| Active piece moves/rotates | Preserve immediate piece/ghost clarity; do not animate surrounding panels | No extra decorative transition |
| Hold succeeds | Brief localized edge/light response on Hold and, if useful, a subtle Next update | One short response, then settle |
| Piece locks | Very brief local board-edge or locked-piece confirmation | Must not obscure the next active piece |
| Line clear | Restrained horizontal/row-local highlight tied to actual cleared rows | Ends quickly; avoid full-screen flash |
| Finesse expected input advances | Existing .done, .next, .pending state remains the source of truth | Clear shape/label contrast; no pulsing requirement |
| Finesse fault | Preserve explicit fault text/state; rose accent may reinforce it | No screen shake or prolonged red |
| Rhythm report appears | Small, calm reveal or no animation; data remains immediately readable | Respect reduced motion |
| Keyboard focus | Distinct 2px high-contrast focus outline with offset | Must work without hover |
| Reset / game over | Use existing semantic messaging if present; do not invent a success state | Do not imply an outcome before engine confirmation |

The first implementation should prioritize stable colors, borders and focus states. Add transient effects only after actual lock/clear/Hold events can be observed reliably. If callbacks expose only a whole-state update, compare previous and current state carefully and avoid double-firing on rerenders.

### 19.5 Token ownership and implementation hygiene

Keep one canonical definition for each semantic token. The page currently has legacy inline styles and dedicated stylesheets; new tokens should override those intentionally rather than accumulate a second undocumented palette.

Recommended token families:
- --abyss-*: background and environmental depth.
- --glass-*: surface fills and edges.
- --text-*: primary, secondary and quiet labels.
- --biolume-*: action/focus/active signals.
- --nebula-*: secondary environmental accents.
- --state-*: success, warning and error signals.
- --motion-*: durations and easing.
- Existing piece color constants: owned by the game renderer, not the theme.

Rules:
1. Do not redefine a semantic token in multiple selectors unless the override is a documented responsive/state exception.
2. Scope styles to components; avoid blanket button rules when a settings-specific or mobile-control selector is available.
3. Never target DOM order alone for state meaning. Structural selectors can support layout, but runtime state styling needs explicit classes or attributes tied to data.
4. Use @supports (backdrop-filter: blur(1px)) if blur needs an explicit support gate; the non-blurred surface remains the baseline.
5. Keep decorative pseudo-elements pointer-events:none, behind interactive content, and out of the accessibility tree.
6. Avoid new dependencies, remote fonts, image requests, canvas loops, and large assets unless there is a measured benefit.

### 19.6 Accessibility and contrast verification protocol

The dark palette must be measured after compositing translucent surfaces over the actual background. A token pair alone does not prove contrast when alpha is involved.

- Normal text: target at least 4.5:1 against the final composited surface.
- Large text: at least 3:1.
- Meaningful control boundaries, focus indicators and state graphics: target 3:1 against adjacent colors where WCAG non-text contrast applies.
- Check quiet labels separately; do not excuse low contrast because they are “secondary.”
- Preserve seven-piece identity and existing renderer colors. Ensure ghost opacity never makes placement information ambiguous.
- Test keyboard-only operation, visible focus, settings toggles/ranges, mobile controls, and screen-reader labels after theme changes.
- prefers-reduced-motion: reduce should remove nonessential transition and animation without hiding a state or changing game timing.
- Verify at low screen brightness and in glare-prone environments. Do not use text-shadow as a substitute for contrast.
- Do not use a color-only state difference: retain label, shape, position, or explicit text.

### 19.7 Performance budget and failure behavior

The experience is a real-time input-sensitive game. A theme is not successful if it looks richer but increases input latency, dropped frames or mobile heat.

- No JavaScript animation loop for ambient effects.
- No layout-affecting animation during gameplay; animate opacity/transform only where needed.
- Avoid filters and large blur regions over the board. Use blur on a small number of utility surfaces only, and disable it at constrained widths or where testing shows cost.
- Keep background layers fixed in count; do not create per-cell DOM or particles for atmosphere.
- Confirm the board render path remains untouched by CSS effects that cause large repaint regions.
- Test at least five minutes of active play on a mid-range phone, including rapid movement, rotations, hard drop, Hold and settings open/close.
- If the environment effect is costly, degrade gracefully in this order: remove backdrop blur, remove nonessential shadows, simplify far-field layers, retain the board and state feedback.

### 19.8 Concrete acceptance evidence

Every implementation iteration should produce an evidence bundle, not only a commit message:

1. Matched baseline and proposed screenshots at 1440px, 900px, 720px, 560px and ~390px widths.
2. Crops of board/ghost clarity, Hold/Next scanning, stats, finesse prompt and expanded settings.
3. Contrast calculations using composited foreground/background colors, listing measured pairs and ratios.
4. Results of the existing runTrainerSelfTest() and relevant finesse/rotation regression checks.
5. A short interaction checklist: move, rotate, hard drop, Hold, line clear, reset, settings, keyboard focus and reduced motion.
6. Known issues with severity and a clear pass/fail against the release gate.

Do not call the theme finished based on the stylesheet loading successfully. If browser screenshots or device testing are unavailable, report that evidence as unavailable and keep the release gate open.

### 19.9 Decision log for the next implementation pass

- **Keep:** the quiet layered abyss, cool glass surfaces, restrained bioluminescence, crisp playfield, existing piece colors, reduced-motion support.
- **Refine:** make water depth feel volumetric through composition and restrained edge lighting rather than adding visual noise; make planning stations feel connected through hierarchy and alignment; narrow global selectors to component scopes.
- **Defer:** animated particulate fields, moving caustics, full-screen flashes, image-based nebula backgrounds, and event effects whose source events have not been confirmed.
- **Reject:** theme changes that alter scoring, gravity, lock delay, controls, training semantics, or renderer geometry; any decoration that lowers piece readability; and any production merge without screenshots and regression evidence.

This model is the working contract for the next iteration. It should guide the design toward a more convincing suspended-in-liquid cosmos while protecting the immediacy and precision that make the trainer useful.


---

## 20. Third-pass implementation record

**Implemented on the draft branch:** a second, component-aware CSS layer now extends the initial palette and background rather than replacing the model with a new visual direction.

The added layer includes:
- A subtle atmospheric field attached to the trainer page itself, with broad water-light gradients and a restrained light-shaft suggestion that stays outside the board.
- Instrument-specific edge highlights and label markers, while preserving the board as the highest-clarity surface.
- A more deliberate Hold/Next scan: centered Hold content, a distinct first upcoming piece, and a compact horizontal queue at narrower widths.
- More cohesive rule toggles and range controls, including a visible selected state for enabled rules.
- A dedicated settings-dialog material treatment, including its actual `.settings-card`, backdrop, section dividers, close/reset controls and numeric outputs.
- A calmer rhythm-report presentation and clearer finesse-key geometry.
- Explicit blur fallback and reduced-motion handling for the newly styled components.

### What this pass intentionally does not do

No JavaScript gameplay hooks, engine state, input mapping, scoring, timing, board geometry, or piece colors were changed. No animated particles, synthetic line-clear events, or inferred Hold/lock pulses were added. These remain deferred until they can be driven by verified runtime events and validated in a browser.

### Verification status

This is a source-level implementation pass, **not a visual acceptance pass**. The GitHub workflow lookup for the latest CSS commit returned no pull-request workflow runs. Browser screenshots, measured composited contrast ratios, and device performance evidence are still outstanding. The release gate remains open until those checks can be performed; a richer stylesheet alone is not sufficient evidence of completion.


---

## 21. Human-centered ambition: make the world feel discovered, not themed

A premium experience is not achieved by adding more glow. It is achieved when the player feels that the interface has a point of view, that the game is easier to read, and that small moments feel intentional. The target is not “a Tetris board with ocean colors.” The target is a precision training instrument suspended in an immense, quiet, living abyss.

### 21.1 The emotional arc

- **Arrival:** the player enters a dark, spacious environment. The title is a distant beacon, not a giant neon sign. The game is the visual destination.
- **Orientation:** Hold, board, Next and training signals feel like stations in one small submersible cockpit. The player can understand the hierarchy before reading every label.
- **Flow:** once play starts, the environment gets out of the way. Piece identity, ghost placement, board boundaries and inputs remain immediate.
- **Meaningful feedback:** a useful result feels like a precise instrument responding, not an arcade machine exploding. The reward is clarity and mastery.
- **Return:** the page is visually distinctive enough to recognize, but calm enough to spend long practice sessions in.

### 21.2 Signature design moves

These moves should be recognizable as the identity of this experience, rather than generic dark-mode decoration:

1. **The pressure halo.** A soft cyan/teal light volume lives around the outside of the board frame. It makes the board feel suspended in deep water while leaving the cells themselves sharp. This is now implemented in the draft CSS with a low-opacity perimeter pseudo-element; browser validation is still required.
2. **The beacon wordmark.** The 180436 heading gets a restrained cool glow with a fine bright core. It should feel luminous through atmosphere, not through a thick neon stroke.
3. **Instrument typography.** Tiny uppercase station labels are deliberately spaced; values use stable numeric alignment. Headings are short, while explanation text gets comfortable line height. The hierarchy should feel closer to scientific instrumentation than to a generic gaming dashboard.
4. **Depth through absence.** Empty space is part of the design. Do not fill every gap with stars, particles, outlines, or metrics. The dark field creates scale by leaving areas quiet.
5. **A physical response, not an animation show.** Controls get a crisp focus ring and a small pressed response. Panels can rise by a pixel on desktop hover, but mobile has no hover lift and reduced-motion users get no unnecessary motion.
6. **Adaptive atmosphere.** On constrained widths the light volume is simplified; forced-colors mode receives clear system-color borders and focus. A visual effect that fails gracefully is better than one that only works in a showcase screenshot.

### 21.3 Human factors that define “super cool”

- **Instant comprehension beats ornament.** A player should find the board first, the next decision second, and settings third. Every decorative treatment must preserve this scan path.
- **Contrast is part of atmosphere.** The dark background can be rich, but text and actionable boundaries cannot become mist. Quiet does not mean unreadable.
- **Tactility matters.** A press should feel acknowledged through a small local material change. Avoid fake depth that shifts layout or delays input.
- **Trust matters.** Never show a success glow for an event the game did not confirm. Do not turn a training error into a punishment animation.
- **Long-session comfort matters.** Persistent pulsing, moving particles, large areas of bright cyan and constant motion are tiring, even when they look exciting in a short demo.
- **Personal agency matters.** Existing depth, queue size, ghost and touch-layout controls should continue to work. Theme polish must not make those options harder to find or use.
- **Distinctiveness comes from restraint.** The memorable signature is the combination of an immense abyss, precise glass instruments and one luminous playfield halo—not a pile of effects.

### 21.4 Third-pass implementation record

The third CSS pass adds a more recognizable identity: a soft perimeter halo around the board frame, a more deliberate beacon treatment for the 180436 wordmark, slightly richer environmental volume, localized focus/pressed responses, restrained desktop panel lift, and a forced-colors fallback. The halo is behind the board frame and does not intentionally overlay the playfield.

No JavaScript, game mechanics, input mapping, board geometry, piece colors or training semantics were changed. The effect should be considered provisional until the board remains crisp at all target widths and contrast/performance evidence is collected.

### 21.5 Release questions that are about people, not only code

Before approval, ask a first-time player to find the active piece, Hold, the next piece and settings without coaching. Then ask an experienced player to practice for several minutes. Observe, rather than lead:

- What do they look at first?
- Do they notice the next decision without losing the active piece?
- Does the atmosphere make the game feel special, or does it compete for attention?
- Are any labels hard to read at typical phone brightness?
- Do controls feel immediate and stable?
- Does the visual identity still feel good after five minutes, rather than only in the first five seconds?

If the answer to “is it cooler?” is yes but the player reads the board more slowly, the design has failed. The success condition is emotional character **and** improved or preserved gameplay clarity.


---

## 22. Deep human-centered interaction model: micro-tactility, liquid motion, and game-time integrity

The next level is not a stronger glow. It is the accumulation of small, coherent moments that make the interface feel authored and alive. A player may not consciously notice a two-pixel drift, a pressed-state highlight, or the difference between a flat icon and a small luminous instrument—but together those details change how the whole experience feels.

The core design principle is **ambient world motion must never become gameplay motion**. Environmental effects can drift slowly in the background. Anything that communicates piece position, queue order, timing, input, or success must remain governed by the real game state and at game pace.

### 22.1 The two clocks

There are two distinct clocks in the experience:

1. **World clock:** slow, low-amplitude, optional. It creates the sense of liquid suspension. It may affect the background, tiny highlights, or static preview presentation by a pixel or two over several seconds.
2. **Game clock:** immediate and authoritative. Active-piece movement, gravity, lock timing, input response, queue order, Hold, scoring, finesse and rhythm remain controlled by the existing engine and its actual render updates.

Never tie gameplay speed to an ambient animation. Never slow a queue update so it can finish an animation. Never animate the active piece with CSS transforms that could visually disagree with its actual grid coordinates. If a piece moves from Next to active play, it should appear in the correct place immediately; decorative motion must not delay or interpolate that state change.

### 22.2 Queue pieces should float like objects in liquid

The Next queue is a special opportunity because its pieces are important, but they are not moving game objects until promoted to the active piece.

Target behavior:
- Give each static preview a restrained, asynchronous vertical drift of approximately 1–2 CSS pixels over a 6–9 second cycle.
- Use different negative animation delays so the previews do not bob in synchrony like a loading indicator.
- Give only the first upcoming piece a barely perceptible light refraction/highlight; later pieces remain quieter.
- Keep the order, colors, silhouette and spacing stable. No rotation, scale wobble, perspective tilt, parallax chase, or movement large enough to imply a changed queue order.
- On promotion into active play, the queue's ordinary DOM/state update takes precedence immediately. The incoming active piece is not required to inherit or complete the preview animation.
- On small screens, reduce or remove the effect if it adds noise or affects performance.
- With reduced motion enabled, remove drift and shimmer entirely.

**A first version of this idea is now in the draft CSS:** the preview items use a tiny, staggered vertical drift, with a faint highlight on the first item and a reduced-motion override. This is intentionally a preview-only treatment, not a change to active-piece physics or timing. Browser validation is still required to confirm the actual preview DOM and ensure animation does not conflict with existing transforms.

### 22.3 Micro-controls: the small details people actually touch

Every control has a human interaction lifecycle: discover → approach → focus/touch → act → receive confirmation. A premium theme should honor that lifecycle.

**Settings beacon**
- Make the settings control read as a small piece of luminous hardware, not a generic gear floating over the page.
- Give it a distinct inset rim, low-energy internal glow, and a clear focus ring.
- Its open/closed state should be visibly different if the existing UI exposes that state. Do not invent state or add a second source of truth.

**Action buttons**
- A fine top-edge glint and subtle material gradient can make a button feel like a solid control surface.
- Hover should be a slight edge-brightening, not a dramatic lift. Press should be immediate and local—roughly one pixel of movement or a restrained inset response.
- The visual pressed response must not change the element's layout box or delay click/touch handling.
- Disabled controls must remain recognizably disabled and must not receive the same bright active treatment.

**Mobile controls**
- Treat the touch controls as small pressure-sealed instruments: translucent deep-teal surfaces, precise cool edge, readable glyph, and a clear pressed state.
- Do not make them smaller to look delicate. Preserve touch target geometry and user-customized positions.
- The editing mode needs a legible boundary that remains clear against different backgrounds.
- Avoid blur when constrained mobile performance makes it expensive.

**Settings modal**
- The modal should feel like opening a small control console into the same world. Keep the backdrop dark and quiet, the panel's edge precise, and range/checkbox accents coherent.
- Keep labels and numeric values readable; atmosphere must not reduce control discoverability.

**One material rule:** controls should share edge, light and press language, but not all share the same silhouette. The settings beacon, rectangular action buttons and round touch controls need distinct shapes appropriate to their use.

### 22.4 The board and the previews need different physics

The board is a live coordinate system, not a decorative object. No ambient transform, blur, opacity pulse or background animation should alter its cell geometry, ghost position, or the perceived grid.

- Board frame: stable, sharp, with a soft perimeter halo behind the frame.
- Active piece and ghost: stable game-state rendering; preserve the renderer's piece identity and opacity semantics.
- Next previews: may have very small independent ambient drift while static; queue order and silhouettes must remain immediately legible.
- Hold preview: may share the same low-amplitude drift as the Next preview because it is a separate instrument in the surrounding world. The held piece's identity and availability must remain obvious; do not add a celebratory cue until a successful Hold event is explicitly observable.
- Statistics: values update immediately, with tabular numerals; avoid flashing every counter change.
- Finesse prompt: explicit correctness states and key sequence remain more important than effects.

### 22.5 Motion budget and accessibility

Motion is a scarce resource. The interface should not make every surface move.

| Element | Motion allowance | Reason |
|---|---|---|
| Ambient background | Static by default; optional extremely slow low-contrast field shift only after performance testing | Atmosphere, not attention |
| Next previews | 1–2px over 6–9 seconds, staggered | Subtle liquid suspension |
| Active piece / ghost / board | No theme-controlled motion | Game engine owns movement |
| Buttons | Immediate pressed response, no layout shift | Tactility and feedback |
| Desktop card hover | At most 1px; none on touch | Quiet affordance |
| Settings open/close | Short opacity/transform transition only if current interaction and reduced-motion settings permit | Orientation |
| Confirmed gameplay event | Brief local response only after source event is verified | Truthful feedback |

For reduced-motion preferences, disable preview drift, shimmer, panel lift, and nonessential transitions. Never modify the game engine's timing in response to a CSS preference. Avoid relying on the will-change hint for dozens of queue items; if browser profiling shows layer proliferation, remove it. Motion must never be the only indicator of state.

### 22.6 How to tell whether it feels human

Use an observation-based review rather than asking only whether the design looks cool:

- Can a player locate settings without hunting?
- Do the small controls feel intentionally crafted or merely overdecorated?
- Does the queue feel gently suspended while its order remains instantly readable?
- Can the player track the active piece at full speed without noticing background motion?
- Does the visual feedback feel immediate on touch, including on a lower-powered phone?
- Does the interface feel calm and precise after several minutes of play?
- Does turning on reduced motion preserve the whole experience, rather than making it feel broken?

A successful design makes the user feel the care without forcing them to watch the effects.

### 22.7 Third-pass implementation status and caveats

The latest draft stylesheet adds a restrained, staggered 1–2px ambient drift to static Next-preview items, a faint first-preview shimmer, liquid-material settings/action/mobile controls, and reduced-motion overrides. It does not change queue data, active-piece rendering, input handling, or game timing. These are CSS-level effects and remain subject to browser verification: confirm that the preview elements are direct children matching the selectors, that no existing transform is overwritten, and that the motion is quiet at phone sizes.

The settings beacon and mobile controls now have more distinctive surface treatment; touch-target dimensions and custom control positions are intentionally left to the existing implementation.

This is still a draft implementation, not a claim of production readiness. The next verification should specifically test rapid queue updates, Hold, game reset, reduced motion, mobile controls, and whether the animation creates excess compositing layers on a mid-range phone.



## 23. Logical upgrade: model the interface as an ecosystem, not a pile of effects

The next iteration should not be defined as “add more animation.” It should be defined as a coherent system where every visual behavior has a cause, a spatial role, a priority, and a stopping rule. The aquatic metaphor becomes convincing when objects seem to share one environment while retaining different physical responsibilities.

### 23.1 Four behavior layers

1. **Gameplay truth layer** — board cells, active piece, ghost, input response, score, timers, queue order, finesse states. This layer is authoritative and never receives theme-driven movement or delayed feedback.
2. **Instrument layer** — Hold, Next, statistics, training prompts, settings. These elements can have tiny material responses, but content updates immediately and text remains stable.
3. **Water layer** — peripheral glass panels, the board's exterior halo, soft light falloff, restrained drifting. This layer supplies atmosphere and must stay visually subordinate.
4. **Access layer** — focus indicators, reduced-motion behavior, contrast modes, touch-target geometry, and narrow-screen layout. This layer overrides atmosphere whenever there is a conflict.

The hierarchy is deliberate: gameplay truth wins over instrument styling; access wins over atmosphere. A beautiful effect is incorrect if it makes the next piece harder to recognize, a focus ring harder to see, or a touch target move under a finger.

### 23.2 One world, several movement signatures

A convincing underwater scene is not a synchronized screensaver. Give each class a distinct signature and a clear budget:

| Class | Signature | Boundary |
|---|---|---|
| Next pieces | Independent 1–2px vertical drift, slow and staggered | Never change order, spacing, or reading rhythm |
| Hold preview | Similar buoyancy, but visually quieter than the first Next item | Never imply a Hold occurred when none did |
| Side instruments | Extremely small slow suspension on desktop only | No layout movement; stop/disable on hover, touch layouts, and reduced motion |
| Board frame | Low-contrast peripheral “pressure” or light halo | Keep the grid and every cell stable and sharp |
| Controls | Fast local press response and fine edge light | No scale jump that changes hit geometry; no delayed response |
| Background light | Broad, slow, low-contrast variation | No flashing, no high-frequency noise, no competing focal point |
| Gameplay events | Brief local cue only when a real state transition is known | No invented success/error feedback from CSS alone |

Prefer animating decorative pseudo-elements and isolated preview wrappers over animating large blurred panels. Avoid permanent compositing hints on every queue item unless profiling demonstrates a measurable benefit; these hints can cost memory on phones. Where possible, use opacity and transforms, but do not let transform animations overwrite existing scale/position transforms. Separate nested layers when both transformations are needed.

### 23.3 State transitions should be truthful

The model distinguishes **ambient behavior** from **event feedback**:

- Ambient behavior is continuous, low salience, and does not assert that anything happened.
- Event feedback is short, local, and tied to a verified state change.
- Data updates are immediate and never wait for an animation to finish.
- A newly rendered queue may naturally restart its decorative motion, but it must not animate across the screen or appear to swap positions.
- Reset clears gameplay state immediately; atmospheric animation may continue because it represents the environment, not the previous run.
- Reduced motion removes ambient and decorative transitions without removing labels, state changes, or access to controls.

This distinction prevents the theme from fabricating gameplay meaning. CSS alone cannot reliably determine whether a lock, Hold, reset, or training milestone succeeded; those effects should wait until the existing game code exposes a real event or state signal.

### 23.4 Responsive depth is not uniform scaling

On desktop, side panels can read as instruments floating around the board, with the board remaining the visual anchor. On narrow screens, vertical movement on entire cards can create scroll jitter, distract from touch controls, or make the page feel unstable. Mobile should retain the aquatic material language—color falloff, edge highlights, small preview drift—while removing movement from large containers. Preserve existing control coordinates, minimum touch targets, safe-area spacing, and scroll behavior.

The background must never force page width or height beyond the existing layout. Decorative layers should be clipped to their own region, ignore pointer events, and avoid intercepting gestures. If an effect needs to be disabled to protect touch accuracy, disable the effect rather than the interaction.

### 23.5 Verification gates, in priority order

**Gate A — correctness:** run existing self-tests; verify board geometry, queue order, Hold behavior, reset, keyboard and touch controls, and training rules remain unchanged.

**Gate B — legibility and access:** test reduced motion, keyboard focus, forced-colors mode, contrast, zoom, and the smallest supported viewport. Every essential state must remain understandable with animation removed.

**Gate C — perception:** observe a real play session for several minutes. Ask whether the queue remains instantly scannable, the board remains the first fixation point, and motion fades into awareness rather than demanding attention.

**Gate D — performance:** inspect a mid-range phone during rapid queue updates and extended play. Check dropped frames, layer count, memory pressure, scrolling, and touch latency. Remove expensive blur or permanent compositing hints before compromising game responsiveness.

**Gate E — release:** capture desktop and mobile before/after states, document browser/device conditions, and only then consider merging. A code diff is not a visual QA result, and an empty CI status is not a passing test.

### 23.6 Design decision rule

For every proposed effect, answer five questions before implementation:

1. What real object or environmental phenomenon does it represent?
2. Which behavior layer owns it?
3. What higher-priority information could it obscure or destabilize?
4. What is its reduced-motion and mobile behavior?
5. How will we verify that it improves recognition or atmosphere rather than merely adding activity?

If these questions have no clear answers, leave the effect out. The target is not maximal motion; it is a world whose smallest details feel like they belong together.


## 24. Reference-informed upgrade criteria: habitat, not theme

This section translates current platform guidance into concrete acceptance criteria for the next visual iterations. The cited sources are implementation references, not aesthetic templates; the design must remain specific to 180436.

### 24.1 Performance as a design constraint

MDN's CSS performance guidance recommends limiting unnecessary animation and preferring properties such as transforms and opacity when motion is needed. Its animation performance guide explains why layout and paint costs can destabilize frame delivery. The web.dev animation guide likewise emphasizes selecting properties that can be handled efficiently by the browser. These principles lead to the following rules:

- The water column is ambient and low-frequency; it must never animate the board, cells, text, or layout geometry.
- Use a small number of layered gradients instead of hundreds of animated particle elements.
- Do not add `will-change` indiscriminately; compositing hints have costs.
- Avoid continuous animated blur, shadow, or large-area repaint when a static optical treatment achieves the same depth.
- Validate on a real mid-range phone; desktop smoothness does not establish mobile performance.

References:
- MDN, CSS performance optimization: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS
- MDN, animation performance and frame rate: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate
- web.dev, high-performance CSS animations: https://web.dev/articles/animations-guide

### 24.2 Motion and access are first-class behavior

The `prefers-reduced-motion` media feature communicates a system-level preference to reduce non-essential motion. It is not enough to make motion slower: essential information must remain legible with animation removed. The experience must also offer clear focus feedback and maintain readable contrast across the game and training controls.

- Reduced-motion mode removes ambient movement and interaction sheens without hiding state.
- Keyboard focus remains visible independent of hover.
- Forced-colors mode removes decorative atmospheric layers and preserves instrument boundaries.
- Mobile mode reduces compositing and background complexity before reducing game clarity.

References:
- MDN, `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- web.dev, animation and motion accessibility: https://web.dev/learn/accessibility/motion

### 24.3 The spatial composition has distinct jobs

The page is not one background plus a set of matching cards. It has four perceptual distances:

1. **Far water:** broad, quiet light gradients and sparse marine snow. It establishes scale, not detail.
2. **Habitat volume:** barely visible vertical water columns and distant spectral blooms. These should be noticed subconsciously, not read as interface content.
3. **Instrument plane:** Hold, Next, metrics, and rules have related but distinguishable surface materials. They should feel built for different jobs.
4. **Precision plane:** the playfield, active piece, ghost, and controls remain the fastest elements to parse. Atmospheric effects may frame them but never distort their geometry.

### 24.4 Acceptance questions for each release

- Does a first-time viewer perceive depth and an environment, rather than a blue color scheme?
- Are Hold, Next, statistics, and training rules distinguishable by purpose, not just position?
- Does the game remain readable during rapid queue changes and sustained play?
- Does the composition retain its identity on a narrow screen without excessive blur or visual noise?
- Can every gameplay-critical task be completed with reduced motion, keyboard focus, and forced colors?
- Has the result been observed in an actual browser and on a real phone, with the conditions recorded?

A source-level check is not a visual test. A successful pull request is not proof of a good frame rate. A polished screenshot is not proof that the interface remains comfortable after ten minutes of play.


## 25. V2.2 implementation brief: authored habitat, not blue glass

The latest pass is an art-direction change, not another blanket increase in saturation. It establishes four distinct visual distances:

1. **Surface light** — broad, nearly still shafts and a faint luminous ceiling. These are environmental, not UI indicators.
2. **Habitat edge** — asymmetric, blurred reef-like silhouettes at the outer margins of the content. They imply an inhabited space without introducing image assets, network requests, or a busy particle field.
3. **Pressure window** — the board frame gets a more deliberate, layered edge and inner seal. The playfield itself stays dark, sharp, and geometrically unchanged.
4. **Instrument material** — Hold, Next, metrics, and actions retain a shared aquatic material vocabulary but differ in corner rhythm, light source, and surface treatment so the whole page is not one repeated card component.

This is a deliberate rejection of “more cyan = more underwater.” The composition should read as a quiet, deep environment surrounding a precise instrument. The organic forms stay peripheral and blurred; the central board remains the first fixation point.

### 25.1 Constraints retained

- No changes to game.js, engine.js, pieces.js, training rules, input bindings, queue state, scoring, gravity, lock timing, or board geometry.
- No new remote fonts, scripts, images, animation libraries, or runtime dependencies.
- No animation on the active piece, ghost, board cells, or gameplay values.
- Touch-control position and hit geometry remain owned by the existing implementation.
- On narrow screens, remove the decorative habitat silhouettes and expensive backdrop blur; keep only static material, edge, and contrast treatments.
- Reduced-motion and forced-colors modes remove nonessential decoration and preserve functional focus.

### 25.2 Why the effects are deliberately mostly static

Current MDN performance guidance warns that large or numerous animations can degrade performance and that properties affecting geometry or paint can be costly. Its reduced-motion guidance also makes clear that motion should be reduced or replaced for users who request it. This pass therefore uses layered static gradients and only immediate, local control feedback. It does not add an animated reef, particle simulation, page parallax, or animated blur.

References:
- MDN, CSS performance optimization: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS
- MDN, CSS and JavaScript animation performance: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance
- MDN, prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion

### 25.3 Acceptance criteria for this pass

- At a glance, the composition must feel spatially underwater, not merely tinted blue.
- The board is the strongest high-contrast focal area; the outer habitat cannot compete with it.
- Hold, Next, HUD, and training controls are visibly related but not interchangeable-looking.
- All text remains readable against the new surfaces, and keyboard focus remains explicit.
- The design must not depend on animation to communicate any gameplay state.
- Mobile must preserve existing board size and touch behavior while dropping peripheral decoration.
- These criteria remain unverified until a real browser/device review. A valid CSS parse and a clean Git diff cannot prove the visual hierarchy or phone performance.

## 26. Next quality gate: perception over author intent

Do not accept this iteration simply because its CSS is more elaborate. Review the rendered result at a normal viewing distance and ask:

- Does the page have an identifiable “surface above / deep water below” structure?
- Do the edges imply habitat while the central board feels like a protected instrument?
- Are the materials different enough to feel designed, but restrained enough to support rapid play?
- Is any decorative shape visibly clipping, overlapping content, or expanding the scrollable page?
- Does the mobile view feel intentionally simplified rather than like a broken desktop composition?
- Can a person play for several minutes without noticing the background as an attention competitor?

If the answer to the first two is no, the next iteration should change the composition and silhouettes, not add more glows. If the answer to any of the last four is no, simplify before adding more detail.
