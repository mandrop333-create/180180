import { createMode } from './mode-base.js';
import { JolBagGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';

function createSession() {
  return {
    pieces: [],
    lastResult: null,
    completedChunks: 0,
    attempts: 0
  };
}

const training = {
  pageTitle: '180180 — JOL CHUNKS',
  tagline: 'Build J, O, and L into spatial chunks.',
  training: { kind: 'jol', label: 'JOL CHUNKS' },
  guide: {
    title: 'JOL CHUNKS',
    pages: [
      {
        kicker: 'the pieces',
        heading: 'J + O + L',
        text: 'Build with one J, one O, and one L. The pieces keep their normal Tetris shapes.'
      },
      {
        kicker: 'the chunk',
        heading: 'ONE SHAPE',
        text: 'Place the three pieces so their combined cells make one complete 3×4 or 4×3 rectangle.'
      },
      {
        kicker: 'the loop',
        heading: 'BUILD → REPEAT',
        text: 'A correct JOL stays on the board. A failed three-piece attempt resets the board so you can try again.'
      }
    ]
  }
};

const hooks = {
  beforeClear(trainer, lockedPiece, afterLock) {
    const session = trainer.session;
    session.pieces.push({ ...lockedPiece });

    if (session.pieces.length !== 3) {
      session.lastResult = null;
      return true;
    }

    session.attempts++;
    session.lastResult = validateJolChunk(session.pieces, trainer.cellsFor);

    // A valid chunk must remain visible. Prevent normal Tetris line clearing
    // only for this successful JOL; the universal engine remains unchanged
    // for every other mode.
    return !session.lastResult.valid;
  },

  place(trainer) {
    const session = trainer.session;
    if (session.pieces.length < 3) return;

    if (session.lastResult?.valid) {
      session.completedChunks++;
      trainer.say(`JOL CHUNK COMPLETE — ${session.lastResult.orientation}`);
    } else {
      trainer.emptyBoard();
      trainer.say('JOL CHUNK MISSED — TRY AGAIN');
    }

    session.pieces = [];
    session.lastResult = null;
  },

  reset(trainer) {
    trainer.session.pieces = [];
    trainer.session.lastResult = null;
    trainer.session.completedChunks = 0;
    trainer.session.attempts = 0;
  }
};

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL CHUNKS',
  description: 'Build J, O, and L into a complete 3×4 or 4×3 spatial chunk.',
  color: '#818cf8',
  training,
  createSession,
  createGenerator: ({ seed } = {}) => new JolBagGenerator({ seed }),
  hooks
});
