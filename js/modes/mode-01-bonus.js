// Mode #1 bonus rule layer.
// This module owns the 180 Flip training feedback.
// It does not know about rendering, DOM, scoring, gravity, or collisions.

import { analyzePlacement } from './mode-01-placement.js';

export const BONUS_MAX = 100;
export const BONUS_PER_180 = 10;
export const SUBSTITUTION_WINDOW_MS = 400;

export function createBonusState() {
  return {
    bonus: 0,
    successful180s: 0,
    substitutionCount: 0,
    rotationHistory: null,
    halfTurnsThisPiece: 0,
    bonusBrokenThisPiece: false,
    currentPieceKey: null,
    lastTrainingEventAt: 0,
    bonusBreakToken: 0,
    pendingPlacement: null,
    lastPlacementAnalysis: null
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

function breakBonus(state) {
  setBonus(state, 0);
  state.bonusBrokenThisPiece = true;
  state.pendingPlacement = null;
  state.bonusBreakToken++;
}

export function onSpawn(state, piece) {
  state.currentPieceKey = piece.type + ':' + piece.x + ':' + piece.y;
  state.halfTurnsThisPiece = 0;
  state.bonusBrokenThisPiece = false;
  state.pendingPlacement = null;
  state.lastPlacementAnalysis = null;
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
    clearRotationHistory(state);
    state.halfTurnsThisPiece++;
    state.lastTrainingEventAt = now;

    // Three 180s on one piece means the player has over-rotated and then
    // used another 180 to correct it. That is not a clean 180 and breaks
    // the accumulated bonus so repeated half-turns cannot be spammed.
    if (state.halfTurnsThisPiece >= 3) {
      breakBonus(state);
      return { type: 'over-rotation-break', bonus: state.bonus };
    }

    // Do not award the bonus yet. The piece still has to prove that the
    // 180 resulted in a clean Tetris placement when it locks.
    state.pendingPlacement = {
      halfTurns: state.halfTurnsThisPiece,
      pieceKey: state.currentPieceKey
    };

    return { type: 'pending-180', bonus: state.bonus };
  }

  const direction = delta === 1 ? 'cw' : 'ccw';
  const previous = state.rotationHistory;

  // Smart substitution detection:
  // - same piece
  // - same 90-degree direction twice
  // - second turn happens quickly
  // - no unrelated input occurred between the two turns
  if (
    previous &&
    previous.direction === direction &&
    previous.pieceKey === state.currentPieceKey &&
    now - previous.time <= SUBSTITUTION_WINDOW_MS
  ) {
    state.substitutionCount++;
    breakBonus(state);
    clearRotationHistory(state);
    state.lastTrainingEventAt = now;
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

export function onPlace(state, _trainer, _lockedPiece, cleared, boards) {
  clearRotationHistory(state);

  if (state.pendingPlacement && !state.bonusBrokenThisPiece && boards) {
    const analysis = analyzePlacement({
      beforeBoard: boards.beforeLock,
      afterLockBoard: boards.afterLock,
      afterClearBoard: boards.afterClear,
      cleared
    });

    state.lastPlacementAnalysis = analysis;

    if (analysis.misdrop) {
      breakBonus(state);
    } else {
      const earned = state.pendingPlacement.halfTurns * BONUS_PER_180;
      state.successful180s += state.pendingPlacement.halfTurns;
      setBonus(state, state.bonus + earned);
    }
  }

  state.pendingPlacement = null;
  state.currentPieceKey = null;
}

export function onReset(state) {
  // Trainer.reset() creates the session and spawns the new piece before
  // calling this hook, so keep the freshly spawned piece identity intact.
  clearRotationHistory(state);
  state.pendingPlacement = null;
  state.lastPlacementAnalysis = null;
}
