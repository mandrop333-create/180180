# Finesse Core: Reference Verification Ledger

This ledger records what has been checked and what remains unproven. It is deliberately conservative: an in-repository test passing is not the same as matching an external reference.

## Completed on `rebuild/finesse-core`

- Added `games/01/finesse-reference-fixtures.js`: static expected cell coordinates and spawn origins for all seven pieces and four orientations.
- Added `games/01/finesse-reference-test.js`: compares production geometry to those separately authored constants, checks four cells per orientation, checks duplicate cells, spawn origins, and orientation arithmetic.
- Added `.github/workflows/finesse-reference-tests.yml`: runs the reference fixture test on pushes to this rebuild branch and on pull requests to main.
- These checks cover geometry shape and orientation arithmetic only. They do not prove kick tables, collision, finesse minima, or runtime scoring.

## External sources consulted

1. TetrisWiki, Movement finesse: https://tetris.wiki/Movement_finesse
   - Confirms multiple distinct finesse models exist (including 0G, 20G, and wall finesse). It does not define the trainer's bespoke direct-180 cost policy.
2. TetrisWiki, TETR.IO: https://tetris.wiki/TETR.IO
   - Describes TETR.IO's default SRS+ modifications and separates its default 180 table from optional SRS-X.
3. TETR.IO official mechanics FAQ source: https://github.com/tetrio/faq/blob/main/mechanics.html
   - Documents DAS/ARR/DCD and describes SRS mechanics. Its explanations are useful for input behavior but do not provide a convenient machine-readable complete kick fixture.
4. TetrisWiki, SRS: https://tetris.wiki/Super_Rotation_System
   - Provides the conventional SRS 90-degree kick tables and coordinate convention. This is a comparison baseline, not proof of TETR.IO SRS+ equivalence.
5. TETR.IO issue tracker discussion of SRS+: https://github.com/tetrio/issues/issues/506
   - Historical discussion corroborates that SRS+ changed I-piece kick behavior. It does not by itself provide a complete authoritative table in text.

## Verification status

| Area | Status | Why |
|---|---|---|
| Seven piece shapes/orientations | Initial fixture added; CI result not yet independently observed | Static expected cells are compared to runtime definitions, but fixture provenance still deserves review against canonical diagrams |
| Spawn origins | Matches current intended local convention; external engine-specific spawn convention not yet proven | Spawn offsets are implementation-specific |
| SRS+ 90-degree kicks | Not yet independently verified | Must compare every transition, in order, against the TETR.IO SRS+ reference, accounting for screen-y-down coordinates |
| Direct 180 kicks | Not yet independently verified | Public documentation points to a diagram; each piece/orientation's ordered tests must be transcribed and reviewed |
| Collision/top-out behavior | Not yet independently verified | Need explicit boundary and board fixtures |
| Minimum route/finesse cost | Not yet independently verified | Need a separate oracle and curated board-state fixtures |
| DAS/ARR/lock timing | Not yet independently verified | Timing changes execution; must be tested against this trainer's selected rules |
| Runtime score and locked placement | Not yet independently verified | Needs end-to-end tests of inputs through lock resolution |

## Next action

Create independent, hand-reviewed kick fixtures and transition tests before changing the production calculator. Compare the existing tables to external source data first; only then decide which data can be retained. Do not treat current `self-test.js` expectations as independent evidence, because those expectations live beside the implementation.
