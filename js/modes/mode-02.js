import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';
import { JOL_RHYTHM, createRhythmState, evaluateBeat, resetRhythmState, currentBeat } from './rhythm.js';

const training = {
  pageTitle: '180180 — JOL CHUNKS',
  description: 'Build J, O, and L together into a perfect 3×4 or 4×3 spatial chunk.',
  conceptImage: 'assets/jol-chunks.svg',
  conceptAlt: 'J, O, and L tetrominoes arranged as a spatial JOL chunk',
  conceptText: 'Turn the J → O → L rhythm into a spatial chunk. Place the three pieces until their combined shape becomes a perfect rectangle.',
  guide: {
    title: 'JOL', subtitle: 'CHUNKS', kicker: 'JOL practice', heading: 'JOL CHUNKS',
    intro: 'A JOL is the J → O → L piece relationship. A JOL Chunk is formed when those three pieces are arranged into a perfect 3×4 or 4×3 rectangle.',
    exerciseKicker: 'the exercise',
    exercise: 'Follow the J → O → L rhythm. Move and rotate each piece, then place it so the three pieces combine into one clean rectangle. The rectangle may be 3×4 or 4×3.',
    coverLabel: 'Open JOL Chunks guide',
    pages: [
      { kicker: 'the format', heading: 'JOL', text: 'JOL is a spatial format made from three recognizable Tetris pieces: J, then O, then L. The pieces keep their normal identities and colors.' },
      { kicker: 'the rhythm', heading: 'J → O → L', text: 'The sequence is temporal information. Notice the rhythm, predict the next piece, then turn that pattern into a spatial construction.' },
      { kicker: 'the chunk', heading: 'ONE UNIT', text: 'A JOL Chunk is the completed spatial relationship of one J, one O, and one L. The pieces are free to move and rotate while you search for the relationship.' },
      { kicker: 'the rule', heading: '3×4 / 4×3', text: 'The three pieces are complete when their combined occupied cells form a perfect rectangle: three columns by four rows, or four columns by three rows.' },
      { kicker: 'the loop', heading: 'OBSERVE → BUILD', text: 'Observe the rhythm. Predict. Move and rotate. Place the piece. Verify the rectangle. Then the next JOL begins. Speed matters only after the relationship is understood.' },
      { kicker: 'timing', heading: 'PROCESSING', text: 'The timer measures real elapsed training time. Rhythm timing records whether each J, O, and L response arrives near its expected beat.' }
    ]
  }
};

function createSession() {
  const now = performance.now();
  return {
    placements: [],
    attempts: 0,
    completedChunks: 0,
    startedAt: now,
    chunkStartedAt: now,
    elapsedMs: 0,
    lastChunkMs: 0,
    bestChunkMs: null,
    lastResult: null,
    pendingBoardReset: false,
    rhythm: createRhythmState(JOL_RHYTHM, now)
  };
}

const hooks = {
  init(trainer) {
    const now = performance.now();
    trainer.session.startedAt = now;
    trainer.session.chunkStartedAt = now;
    resetRhythmState(trainer.session.rhythm, JOL_RHYTHM, now);
  },
  beforeSpawn(trainer) {
    if (trainer.session.pendingBoardReset) {
      trainer.emptyBoard();
      trainer.session.pendingBoardReset = false;
    }
  },
  spawn(trainer, piece) {
    const expected = currentBeat(trainer.session.rhythm);
    trainer.session.rhythm.expectedPiece = expected;
    if (piece.type !== expected) trainer.session.rhythm.generatorMismatch = true;
    else trainer.session.rhythm.generatorMismatch = false;
  },
  tick(trainer) {
    trainer.session.elapsedMs = Math.max(0, performance.now() - trainer.session.startedAt);
  },
  hardInput() { return true; },
  place(trainer, piece) {
    const session = trainer.session;
    const now = performance.now();
    const rhythmResult = evaluateBeat(session.rhythm, piece.type, now);
    session.lastRhythmResult = rhythmResult;
    session.placements.push({ ...piece, placedAt: now, timingErrorMs: rhythmResult.timingErrorMs });

    if (!rhythmResult.valid) {
      if (!rhythmResult.typeCorrect) trainer.say(`Rhythm miss — expected ${rhythmResult.expected}`);
      else trainer.say(`Timing miss — ${Math.round(rhythmResult.timingErrorMs)}ms`);
    }

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
    } else {
      trainer.say(result.reason);
    }

    session.placements = [];
    session.chunkStartedAt = now;
  },
  reset(trainer) {
    const now = performance.now();
    trainer.session.startedAt = now;
    trainer.session.chunkStartedAt = now;
    resetRhythmState(trainer.session.rhythm, JOL_RHYTHM, now);
  }
};

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL CHUNKS',
  description: 'Build J, O, and L together into a perfect 3×4 or 4×3 spatial chunk.',
  color: '#818cf8',
  rules: { gravity: Infinity, lockDelay: 500, clearBoardAfterPlace: false, showGhost: false },
  hooks,
  createSession,
  createGenerator: () => new JolChunkGenerator(['J', 'O', 'L']),
  training,
  capabilities: { rhythm: true, spatial: true }
});
