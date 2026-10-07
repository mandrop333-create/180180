// Generic rotation logic with SRS quarter-turns and a separate direct 180 action.

import { targetOrientation } from './pieces.js';
import { getSrsKicks, DEFAULT_HALF_TURN_KICKS } from './kicks.js';
import { collides } from './collision.js';

export function tryRotate(piece, delta, board, W, H, cellsFor, onHalfTurn, halfTurnKicks = DEFAULT_HALF_TURN_KICKS) {
  if (!piece) return false;

  const from = piece.o;
  const to = targetOrientation(from, delta);
  const isHalfTurn = delta === 2 || delta === -2;
  const kicks = isHalfTurn ? halfTurnKicks : getSrsKicks(piece.type, from, to);

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
