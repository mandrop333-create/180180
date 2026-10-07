import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';
import { JOL_RHYTHM, createRhythmState, advanceRhythm } from './rhythm.js';

function createSession() {
  const now = performance.now();
  return {
    pieces: [],
    lastResult: null,
    completedChunks: 0,
    completedCells: [],
    attempts: 0,
    startedAt: now,
    chunkStartedAt: now,
    elapsedMs: 0,
    lastChunkMs: 0,
    bestChunkMs: null
  };
}

const training = {
  pageTitle: '180180 — JOL CHUNKS',
  tagline: 'Recognize the rhythm, then build J → O → L into a spatial chunk.',
  jolHud: true,
  rhythmHud: true,
  training: { kind: 'spatial-pattern', label: 'JOL CHUNKS' },
  guide: {
    title: 'JOL CHUNKS',
    pages: [
      {
        kicker: 'the order',
        heading: 'J → O → L',
        text: 'The pieces always arrive in this order. They never shuffle. Each piece keeps its normal Tetris shape and can still move and rotate normally.'
      },
      {
        kicker: 'the rhythm',
        heading: '2.0s HIDDEN',
        text: 'For two seconds you play normally while the board result is hidden. Your real movement, rotation, drop, lock, and timing continue underneath.'
      },
      {
        kicker: 'the reveal',
        heading: '0.5s REVEAL',
        text: 'The result appears for half a second. Use that brief reveal to recognize what your inputs produced, then the next hidden window begins.'
      },
      {
        kicker: 'the chunk',
        heading: 'ONE RECTANGLE',
        text: 'Place J, O, and L so their combined occupied cells exactly fill a 3×4 or 4×3 rectangle. The pieces themselves remain recognizable.'
      },
      {
        kicker: 'the loop',
        heading: 'VERIFY → KEEP / RESET',
        text: 'A valid JOL chunk stays on the board. A failed three-piece attempt clears the board and starts the next J → O → L attempt.'
      }
    ]
  }
};

const hooks = {
  init(trainer) {
    const now = performance.now();
    trainer.session.startedAt = now;
    trainer.session.chunkStartedAt = now;
    trainer.training.rhythm = createRhythmState(JOL_RHYTHM, now);
  },

  tick(trainer, now) {
    trainer.session.elapsedMs = Math.max(0, now - trainer.session.startedAt);
    advanceRhythm(trainer.training.rhythm, now);
  },

  render(trainer) {
    const rhythm = trainer.training.rhythm;
    trainer.boardEl.classList.toggle(
      'jol-rhythm-hidden',
      !!rhythm && !rhythm.visible
    );

    const completed = new Set(
      trainer.session.completedCells
        .flat()
        .map(([x, y]) => `${x},${y}`)
    );

    trainer.cells.forEach((cell, index) => {
      const x = index % trainer.W;
      const y = Math.floor(index / trainer.W);
      cell.classList.toggle('jol-chunk', completed.has(`${x},${y}`));
    });
  },

  hardInput() {
    return true;
  },

  beforeClear(trainer, lockedPiece) {
    const session = trainer.session;
    session.pieces.push({ ...lockedPiece });

    if (session.pieces.length !== 3) {
      session.lastResult = null;
      return true;
    }

    session.attempts++;
    session.lastResult = validateJolChunk(session.pieces, trainer.cellsFor);

    // Mode 2 verifies spatial chunks itself; ordinary line clearing is not part of the rule.
    return true;
  },

  place(trainer) {
    const session = trainer.session;
    if (session.pieces.length < 3) return;

    const now = performance.now();
    const result = session.lastResult;

    if (result?.valid) {
      const chunkMs = Math.max(0, now - session.chunkStartedAt);
      session.lastChunkMs = chunkMs;
      session.bestChunkMs = session.bestChunkMs === null
        ? chunkMs
        : Math.min(session.bestChunkMs, chunkMs);
      session.completedChunks++;
      session.completedCells.push(result.cells.map(([x, y]) => [x, y]));
      trainer.say(`JOL CHUNK COMPLETE — ${result.orientation}`);
    } else {
      trainer.emptyBoard();
      session.completedChunks = 0;
      session.completedCells = [];
      trainer.say('JOL CHUNK MISSED — TRY AGAIN');
    }

    session.pieces = [];
    session.lastResult = null;
    session.chunkStartedAt = now;
  },

  reset(trainer) {
    const now = performance.now();
    trainer.session.pieces = [];
    trainer.session.lastResult = null;
    trainer.session.completedChunks = 0;
    trainer.session.completedCells = [];
    trainer.session.attempts = 0;
    trainer.session.startedAt = now;
    trainer.session.chunkStartedAt = now;
    trainer.session.elapsedMs = 0;
    trainer.session.lastChunkMs = 0;
    trainer.session.bestChunkMs = null;
    trainer.training.rhythm = createRhythmState(JOL_RHYTHM, now);
  }
};

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL CHUNKS',
  description: 'Recognize the rhythm, then build J → O → L into a complete 3×4 or 4×3 spatial chunk.',
  color: '#818cf8',
  rules: {
    clearBoardAfterPlace: false,
    showGhost: true
  },
  training,
  createSession,
  // Deliberately deterministic: Mode 2 is always J → O → L, never a random bag.
  createGenerator: () => new JolChunkGenerator(['J', 'O', 'L']),
  hooks,
  capabilities: { rhythm: true, spatial: true }
});
