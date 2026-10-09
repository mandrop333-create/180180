// Generic rotation logic with SRS quarter-turns and a separate direct 180 action.

import { targetOrientation } from './pieces.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { collides } from './collision.js';

export function tryRotate(piece, delta, board, W, H, cellsFor, onHalfTurn, halfTurnKicks = null) {
  // The public action vocabulary is quarter-turn CW/CCW or a direct 180.
  // Reject zero and arbitrary deltas rather than treating them as a zero-kick
  // rotation; this keeps the transition graph aligned with actual inputs.
  if (!piece || ![1, -1, 2, -2].includes(delta)) return false;

  const from = piece.o;
  const to = targetOrientation(from, delta);
  const isHalfTurn = delta === 2 || delta === -2;
  const kicks = isHalfTurn ? (halfTurnKicks || getTetrio180Kicks(piece.type, from)) : getSrsKicks(piece.type, from, to);

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
