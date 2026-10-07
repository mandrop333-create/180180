import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';
import { JOL_RHYTHM, createRhythmState, advanceRhythm } from './rhythm.js';

const training = {
  pageTitle: '180180 — JOL CHUNKS',
  tagline: 'Build J, O, and L into spatial chunks.',
  training: { kind: 'spatial-pattern', label: 'JOL CHUNKS' },
  guide: {
    title: 'JOL CHUNKS',
    pages: [
      { kicker: 'the pieces', heading: 'J + O + L', text: 'A JOL is one J, one O, and one L working as one relationship.' },
      { kicker: 'the chunk', heading: 'ONE UNIT', text: 'A JOL Chunk is the completed spatial relationship of one J, one O, and one L. The pieces are free to move and rotate while you search for the relationship.' },
      { kicker: 'the rule', heading: '3×4 / 4×3', text: 'The three pieces are complete when their combined outside silhouette makes a perfect rectangle: three columns by four rows, or four columns by three rows. The pieces keep their normal Tetris shapes; the rectangle describes their shared outer boundary.' },
      { kicker: 'the rhythm', heading: 'HIDDEN PRACTICE', text: 'You get two seconds to play normally while the board is hidden. Your movement, holds, rotations, 180s, and placements still happen in real time, so DAS and finesse remain meaningful.' },
      { kicker: 'the reveal', heading: 'SEE THE RESULT', text: 'When the two-second window ends, the board is revealed for half a second. See what your inputs produced, then the board hides again and the next practice window begins.' },
      { kicker: 'the loop', heading: 'OBSERVE → BUILD', text: 'Play by feel while the state is hidden. Use each brief reveal to understand the result, adjust your next sequence, and build the JOL spatial relationship.' }
    ]
  }
};

function createSession() {
  const now = performance.now();
  return { placements: [], attempts: 0, completedChunks: 0, startedAt: now, chunkStartedAt: now, elapsedMs: 0, lastChunkMs: 0, bestChunkMs: null, lastResult: null, pendingBoardReset: false };
}

const hooks = {
  init(trainer) {
    const now = performance.now();
    trainer.session.startedAt = now;
    trainer.session.chunkStartedAt = now;
    trainer.training.rhythm = createRhythmState(JOL_RHYTHM, now);
  },
  beforeSpawn(trainer) {
    if (trainer.session.pendingBoardReset) {
      trainer.emptyBoard();
      trainer.session.pendingBoardReset = false;
    }
  },
  tick(trainer, now) {
    trainer.session.elapsedMs = Math.max(0, now - trainer.session.startedAt);
    advanceRhythm(trainer.training.rhythm, now);
  },
  render(trainer) {
    const rhythm = trainer.training.rhythm;
    trainer.boardEl.classList.toggle('jol-rhythm-hidden', !!rhythm && !rhythm.visible);
  },
  hardInput() { return true; },
  place(trainer, piece) {
    const session = trainer.session;
    const now = performance.now();
    session.placements.push({ ...piece, placedAt: now });

    if (session.placements.length < 3) {
      trainer.say(`${session.placements.length}/3 — build the JOL`);
      return;
    }

    session.attempts++;
    const result = validateJolChunk(session.placements, trainer.cellsFor);
    session.lastResult = result;
    if (result.valid) {
      const chunkMs = Math.max(0, now - session.chunkStartedAt);
      session.lastChunkMs = chunkMs;
      session.bestChunkMs = session.bestChunkMs === null ? chunkMs : Math.min(session.bestChunkMs, chunkMs);
      session.completedChunks++;
      trainer.stats.score += 1000;
      trainer.say(`JOL CHUNK COMPLETE — ${result.orientation}`);
    } else trainer.say(result.reason);

    session.placements = [];
    session.chunkStartedAt = now;
    session.pendingBoardReset = true;
  },
  reset(trainer) {
    const now = performance.now();
    trainer.session.startedAt = now;
    trainer.session.chunkStartedAt = now;
    trainer.session.placements = [];
    trainer.session.pendingBoardReset = false;
    trainer.training.rhythm = createRhythmState(JOL_RHYTHM, now);
  }
};

export default createMode({
  id: 'mode-02', number: 2, name: 'JOL CHUNKS',
  description: 'Build J, O, and L together into a perfect 3×4 or 4×3 spatial chunk.', color: '#818cf8',
  rules: { gravity: Infinity, lockDelay: 500, clearBoardAfterPlace: false, showGhost: false },
  hooks, createSession, createGenerator: () => new JolChunkGenerator(['J', 'O', 'L']), training,
  capabilities: { rhythm: true, spatial: true }
});
