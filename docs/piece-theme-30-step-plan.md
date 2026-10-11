# Original Piece Theme System — 30-Step Build & Launch Plan

Status: implementation contract and delivery checklist for Glass, Nature, and Space.

## Product goal
Add three original piece materials to 180180 while preserving Generic as a fallback. Theme changes are cosmetic: no changes to piece geometry, rotation, collision, gravity, timing, scoring, or input. Theme choice persists locally and affects active, locked, ghost/preview, Hold, Next, and 180 Flip visuals consistently.

## Research method: 50 reference points, not 50 assets to copy
Use these references to extract design principles—material, lighting, contrast, edge treatment, texture density, and motion. Do not reuse proprietary screenshots, textures, or game artwork in shipped skins. Build original CSS/SVG treatments.

### 50-reference study inventory
1. Tetris Effect: Connected — stage-specific material and lighting.
2. Tetris Effect official media — silhouette/readability in varied scenes.
3. NES Tetris — unmistakable flat color identity.
4. Game Boy Tetris — monochrome value separation.
5. Tetr.js — alternate block skins in a browser trainer.
6. Blockrain candy — saturated, rounded material language.
7. Blockrain modern — restrained bevel and gradient.
8. Blockrain retro — pixel-era contrast.
9. Blockrain vim — limited palette and custom texture.
10. Blockrain monochrome — value-only piece differentiation.
11. Blockrain gameboy — green-scale hierarchy.
12. Blockrain aerolab — clean, airy material treatment.
13. Classic flat-block clones — minimal visual noise.
14. Neon-block clones — emissive rim discipline.
15. Matte-block clones — low-glare readability.
16. Pastel-block clones — light/dark separation.
17. Metallic-block clones — specular edge restraint.
18. Pixel-block clones — crisp corners at small sizes.
19. Outlined-block clones — silhouette-first recognition.
20. Glass-block clones — transparency without losing silhouette.
21. Crystal mineral photography — faceted edge highlights.
22. Cut-glass product renders — internal reflections and bevel cues.
23. Frosted glass UI — diffuse rather than mirror-like surfaces.
24. Clear acrylic objects — layered edge refraction.
25. Ice crystal photography — cool highlights and deep shadows.
26. Prism photography — controlled spectral accents.
27. Quartz and amethyst — natural facet/color transitions.
28. Obsidian — dark reflective surfaces.
29. Opal — iridescence used sparingly.
30. Sea glass — softened edges and sea-worn color.
31. Moss macro photography — dense, low-frequency organic texture.
32. Fern leaves — branching vein motifs.
33. Monstera leaves — bold vein silhouettes.
34. Bioluminescent algae — localized green-blue emission.
35. Forest canopy photography — layered greens and shadow.
36. Jade stone — smooth, mineral color depth.
37. Malachite — curved mineral banding.
38. Agate slices — concentric bands.
39. Lichen on stone — speckled surface texture.
40. Fern-fossil impressions — botanical relief without clutter.
41. NASA nebula imagery — large-scale color clouds.
42. Hubble deep-field imagery — sparse point highlights and depth.
43. James Webb nebula imagery — layered gas/dust color.
44. Star-cluster photography — small bright points on dark fields.
45. Planetary limb renders — thin atmospheric rims.
46. Aurora photography — smooth luminous gradients.
47. Pulsar illustrations — directional rays used sparingly.
48. Meteorite surfaces — dark mineral grain.
49. Lunar regolith — fine particulate texture.
50. Sci-fi hard-surface materials — contrast between emissive trim and base.

### Online starting references
- Blockrain theme configuration and custom block artwork: https://github.com/MeanPug/tetris
- Tetr.js features including multiple block skins: https://github.com/simonlc/tetr.js/
- Tetris Effect official media: https://tetriseffect.game/connected/media/
- Tetris Effect product visual direction: https://www.playstation.com/en-us/games/tetris-effect/
- Example CSS-variable theme architecture: https://github.com/paulfxyz/tetris

This is a 50-point design-research checklist, not a claim that all 50 are separate licensed asset packs. Record reference notes/screenshots during visual QA and keep source/license notes in the project.

## The 30 steps, in order
1. Inventory current renderer, CSS, theme picker, persistence, and preview rendering.
2. Establish acceptance criteria: shape readability first, material second.
3. Review the 50-reference inventory and record reusable visual principles.
4. Separate inspiration notes from assets; do not ship copied game art.
5. Define a shared material model: base color, light edge, dark edge, texture, highlight, ghost treatment.
6. Define seven per-piece palettes for each theme so piece identity remains distinct.
7. Set contrast requirements for active, locked, ghost, Hold, and Next states.
8. Keep Generic as the baseline and migration-safe fallback.
9. Replace the two-choice picker with Generic, Glass, Nature, and Space.
10. Add accessible names, selected states, keyboard support, and live status.
11. Persist selection in localStorage and migrate Aqua Space selection to Space.
12. Add semantic CSS color tokens for every piece in every theme.
13. Update locked-piece rendering to consume theme tokens.
14. Update SVG active-piece gradients to consume the same tokens.
15. Match 180 Flip front/back surfaces to the selected material.
16. Keep geometry, hitboxes, rotations, and timing unchanged.
17. Design Glass highlights, translucent-looking edges, and cool refraction cues.
18. Design Nature's botanical grain and moss/stone palette without noisy camouflage.
19. Design Space's nebula palette and sparse star flecks without hiding boundaries.
20. Keep ghost contrast configurable and distinct across all themes.
21. Apply material consistently to Hold and Next previews.
22. Refresh cached active-piece SVG when the theme changes.
23. Check mobile board and small preview readability.
24. Check reduced-motion behavior and avoid decorative animation dependencies.
25. Check forced-colors/high-contrast behavior and keyboard focus visibility.
26. Run lint/build and existing trainer/finesse regression tests.
27. Run browser checks for all seven tetrominoes in each theme and persistence.
28. Test 180 Flip, ghost, invisible-piece, and color-only rules for conflicts.
29. Merge the reviewed implementation and confirm production deployment separately.
30. Verify live on desktop and mobile, document issues, then iterate from gameplay feedback.

## Implementation notes
The first implementation adds picker choices, persisted theme state, token-driven locked and active-piece colors, and distinct CSS material treatments. Verification steps remain mandatory before calling the release fully live.
