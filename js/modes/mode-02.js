import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';

function createSession() {
  return {
    pieces: [],
    lastResult: null,
    completedChunks: 0,
    completedCells: [],
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
        heading: 'J → O → L',
        text: 'The pieces always arrive in the same order: J, then O, then L. They keep their normal Tetris shapes.'
      },
      {
        kicker: 'the chunk',
        heading: 'ONE RECTANGLE',
        text: 'Place and rotate the three pieces so their combined cells completely fill a 3×4 or 4×3 rectangle.'
      },
      {
        kicker: 'the loop',
        heading: 'BUILD → KEEP',
        text: 'A correct JOL stays on the board. If the three-piece attempt is wrong, the board resets and you try again.'
      }
    ]
  }
};

const hooks = {
  beforeClear(trainer, lockedPiece) {
    const session = trainer.session;
    session.pieces.push({ ...lockedPiece });

    if (session.pieces.length !== 3) {
      session.lastResult = null;
      return true;
    }

    session.attempts++;
    session.lastResult = validateJolChunk(session.pieces, trainer.cellsFor);
    return !session.lastResult.valid;
  },

  place(trainer) {
    const session = trainer.session;
    if (session.pieces.length < 3) return;

    if (session.lastResult?.valid) {
      session.completedChunks++;
      session.completedCells.push(session.lastResult.cells.map(([x, y]) => [x, y]));
      trainer.say(`JOL CHUNK COMPLETE — ${session.lastResult.orientation}`);
    } else {
      trainer.emptyBoard();
      session.completedChunks = 0;
      session.completedCells = [];
      trainer.say('JOL CHUNK MISSED — TRY AGAIN');
    }

    session.pieces = [];
    session.lastResult = null;
  },

  render(trainer) {
    const completed = new Set(
      trainer.session.completedCells.flat().map(([x, y]) => `${x},${y}`)
    );
    trainer.cells.forEach((cell, index) => {
      const x = index % trainer.W;
      const y = Math.floor(index / trainer.W);
      if (completed.has(`${x},${y}`)) cell.classList.add('jol-chunk');
      else cell.classList.remove('jol-chunk');
    });
  },

  reset(trainer) {
    trainer.session.pieces = [];
    trainer.session.lastResult = null;
    trainer.session.completedChunks = 0;
    trainer.session.completedCells = [];
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
  createGenerator: () => new JolChunkGenerator(['J', 'O', 'L']),
  hooks
});
