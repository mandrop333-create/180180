import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';
import { validateJolChunk } from './jol-chunks.js';
import { JOL_RHYTHM, createRhythmState, evaluateBeat, advanceRhythm, currentBeat } from './rhythm.js';

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
      { kicker: 'the rhythm', heading: 'FOLLOW THE PULSE', text: 'J, O, and L arrive as a repeating temporal pattern. Watch the active beat, recognize the expected piece, and place it near the pulse. If you wait too long, that beat is missed and the rhythm moves on.' },
      { kicker: 'the loop', heading: 'OBSERVE → BUILD', text: 'Observe the rhythm. Predict. Move and rotate. Place the piece. Verify the outside boundary. Then the next JOL begins. Speed matters only after the relationship is understood.' },
      { kicker: 'timing', heading: 'PROCESSING', text: 'The timer measures real elapsed training time. Rhythm timing records completed beats, misses, and the timing error of each response.' }
    ]
  }
};

function createSession() {
  const now = performance.now();
  return { placements: [], attempts: 0, completedChunks: 0, startedAt: now, chunkStartedAt: now, elapsedMs: 0, lastChunkMs: 0, bestChunkMs: null, lastResult: null, lastRhythmResult: null, pendingBoardReset: false };
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
  spawn(trainer, piece) {
    const rhythm = trainer.training.rhythm;
    if (!rhythm) return;
    rhythm.expectedPiece = currentBeat(rhythm);
    rhythm.generatorMismatch = piece.type !== rhythm.expectedPiece;
  },
  tick(trainer, now) {
    trainer.session.elapsedMs = Math.max(0, now - trainer.session.startedAt);
    const rhythm = trainer.training.rhythm;
    if (rhythm) advanceRhythm(rhythm, now);
  },
  hardInput() { return true; },
  place(trainer, piece) {
    const session = trainer.session;
    const rhythm = trainer.training.rhythm;
    const now = performance.now();
    const rhythmResult = evaluateBeat(rhythm, piece.type, now);
    session.lastRhythmResult = rhythmResult;
    session.placements.push({ ...piece, placedAt: now, timingErrorMs: rhythmResult.timingErrorMs, rhythmValid: rhythmResult.valid });

    if (!rhythmResult.valid) {
      if (rhythmResult.reason === 'timeout') trainer.say(`Beat missed — next ${rhythmResult.expected}`);
      else if (!rhythmResult.typeCorrect) trainer.say(`Rhythm miss — expected ${rhythmResult.expected}`);
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
