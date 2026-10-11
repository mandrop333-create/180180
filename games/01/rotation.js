// Generic rotation logic with SRS quarter-turns and a separate direct 180 action.

import { targetOrientation } from './pieces.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { collides } from './collision.js';

export function tryRotate(piece, delta, board, W, H, cellsFor, onHalfTurn, halfTurnKicks = null) {
  // The public action vocabulary is quarter-turn CW/CCW or a direct 180.
  // Reject zero and arbitrary deltas rather than treating them as a zero-kick
  // rotation; this keeps the transition graph aligned with actual inputs.
  // Reject malformed state before consulting fallback geometry or kick tables.
  // Otherwise an unknown type or out-of-range orientation could be normalized
  // into a plausible but impossible transition.
  if (!piece || !['I','O','T','S','Z','J','L'].includes(piece.type) ||
      !Number.isInteger(piece.x) || !Number.isInteger(piece.y) ||
      !Number.isInteger(piece.o) || piece.o < 0 || piece.o > 3 ||
      ![1, -1, 2, -2].includes(delta)) return false;

  const from = piece.o;
  const to = targetOrientation(from, delta);
  const isHalfTurn = delta === 2 || delta === -2;
  const configuredKicks = isHalfTurn
    ? (halfTurnKicks || getTetrio180Kicks(piece.type, from))
    : getSrsKicks(piece.type, from, to);
  // Always try the direct destination first. An empty kick table (such as O's
  // 180 profile) means "no additional kicks", not "rotation is impossible".
  const kicks = configuredKicks.length ? configuredKicks : [[0, 0]];

  for (const [dx, dy] of kicks) {
    if (!collides(piece.x + dx, piece.y + dy, to, board, W, H, cellsFor, piece.type)) {
      const old = { ...piece };
      piece.x += dx;
      piece.y += dy;
      piece.o = to;

      if (isHalfTurn && onHalfTurn) onHalfTurn(old);
      return true;
    }
  }

  return false;
}
