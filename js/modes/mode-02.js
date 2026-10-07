import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';

const training = {
  pageTitle: '180180 — JOL CHUNKS',
  description: 'Build J, O, and L together into a perfect 3×4 or 4×3 spatial chunk.',
  conceptAlt: 'J, O, and L tetrominoes arranged as a spatial JOL chunk',
  conceptText: 'Turn the J → O → L rhythm into a spatial chunk. Place the three pieces until their combined shape becomes a perfect rectangle.',
  guide: {
    title: 'JOL',
    subtitle: 'CHUNKS',
    kicker: 'JOL practice',
    heading: 'JOL CHUNKS',
    intro: 'A JOL is the J → O → L piece relationship. A JOL Chunk is formed when those three pieces are arranged into a perfect 3×4 or 4×3 rectangle.',
    exerciseKicker: 'the exercise',
    exercise: 'Follow the J → O → L rhythm. Move and rotate each piece, then place it so the three pieces combine into one clean rectangle. The rectangle may be 3×4 or 4×3.',
    coverLabel: 'Open JOL Chunks guide'
  }
};

function createSession() {
  return {
    placements: [],
    attempts: 0,
    completedChunks: 0,
    startedAt: performance.now(),
    chunkStartedAt: performance.now(),
    elapsedMs: 0,
    lastChunkMs: 0,
    bestChunkMs: null,
    lastResult: null
  };
}

const hooks = {
  init(trainer) {
    trainer.session.startedAt = performance.now();
    trainer.session.chunkStartedAt = trainer.session.startedAt;
  },

  tick(trainer) {
    const now = performance.now();
    trainer.session.elapsedMs = Math.max(0, now - trainer.session.startedAt);
  },

  place(trainer, piece) {
    const session = trainer.session;
    session.placements.push({ ...piece });

    if (session.placements.length < 3) {
      trainer.say(`${session.placements.length}/3 — build the JOL`);
      return;
    }

    session.attempts++;
    const result = validateJolChunk(session.placements, trainer.cellsFor);
    session.lastResult = result;

    if (result.valid) {
      const now = performance.now();
      const chunkMs = Math.max(0, now - session.chunkStartedAt);
      session.lastChunkMs = chunkMs;
      session.bestChunkMs = session.bestChunkMs === null
        ? chunkMs
        : Math.min(session.bestChunkMs, chunkMs);
      session.completedChunks++;
      trainer.stats.score += 1000;
      trainer.say(`JOL CHUNK COMPLETE — ${result.orientation}`);
    } else {
      trainer.say(result.reason);
    }

    // A chunk is one three-piece unit. Keep the board focused on the current
    // unit so the next J → O → L begins cleanly without changing the engine.
    session.placements = [];
    session.chunkStartedAt = performance.now();
    trainer.emptyBoard();
  },

  reset(trainer) {
    trainer.session.startedAt = performance.now();
    trainer.session.chunkStartedAt = trainer.session.startedAt;
  }
};

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL CHUNKS',
  description: 'Build J, O, and L together into a perfect 3×4 or 4×3 spatial chunk.',
  color: '#818cf8',
  // The chunk is deliberately player-placed rather than gravity-driven. The
  // existing soft-drop control lets the player choose vertical position.
  rules: {
    gravity: Infinity,
    lockDelay: 500,
    clearBoardAfterPlace: false
  },
  hooks,
  createSession,
  createGenerator: () => new JolChunkGenerator(['J', 'O', 'L']),
  training
});
