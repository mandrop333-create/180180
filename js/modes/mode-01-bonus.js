// Mode #1 bonus rule layer.
// This module owns only the 180 Flip training feedback.
// It does not know about rendering, DOM, scoring, gravity, or collisions.

export const BONUS_MAX = 100;
export const BONUS_PER_180 = 10;
export const SUBSTITUTION_WINDOW_MS = 400;

export function createBonusState() {
  return {
    bonus: 0,
    successful180s: 0,
    substitutionCount: 0,
    rotationHistory: null,
    currentPieceKey: null,
    lastTrainingEventAt: 0,
    bonusBreakToken: 0
  };
}

function clampBonus(value) {
  return Math.max(0, Math.min(BONUS_MAX, value));
}

function setBonus(state, value) {
  state.bonus = clampBonus(value);
}

function clearRotationHistory(state) {
  state.rotationHistory = null;
}

export function onSpawn(state, piece) {
  state.currentPieceKey = piece.type + ':' + piece.x + ':' + piece.y;
  clearRotationHistory(state);
}

export function onInput(state, action) {
  // A quarter-turn chain is only considered a substitution when it is
  // uninterrupted. Movement, dropping, or another action ends the attempt.
  if (action !== 'cw' && action !== 'ccw') {
    clearRotationHistory(state);
  }
}

export function onRotate(state, { delta, now }) {
  const isHalfTurn = delta === 2 || delta === -2;

  if (isHalfTurn) {
    state.successful180s++;
    setBonus(state, state.bonus + BONUS_PER_180);
    clearRotationHistory(state);
    state.lastTrainingEventAt = now;
    return { type: 'successful-180', bonus: state.bonus };
  }

  const direction = delta === 1 ? 'cw' : 'ccw';
  const previous = state.rotationHistory;

  // Smart substitution detection:
  // - same piece
  // - same 90-degree direction twice
  // - second turn happens quickly
  // - no unrelated input occurred between the two turns
  //
  // This specifically detects CW->CW / CCW->CCW as one uninterrupted
  // 180-degree substitution instead of punishing unrelated rotations.
  if (
    previous &&
    previous.direction === direction &&
    previous.pieceKey === state.currentPieceKey &&
    now - previous.time <= SUBSTITUTION_WINDOW_MS
  ) {
    state.substitutionCount++;
    setBonus(state, 0);
    clearRotationHistory(state);
    state.lastTrainingEventAt = now;
    state.bonusBreakToken++;
    return { type: 'substitution-break', bonus: state.bonus };
  }

  state.rotationHistory = {
    direction,
    pieceKey: state.currentPieceKey,
    time: now
  };
  state.lastTrainingEventAt = now;

  return { type: 'quarter-turn', bonus: state.bonus };
}

export function onPlace(state) {
  clearRotationHistory(state);
  state.currentPieceKey = null;
}

export function onReset(state) {
  // Trainer.reset() creates the session and spawns the new piece before
  // calling this hook, so keep the freshly spawned piece identity intact.
  clearRotationHistory(state);
}
