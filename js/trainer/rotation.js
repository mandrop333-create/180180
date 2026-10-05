// Rotation is a single atomic state transition: test candidates, then commit.
// No animation code is allowed to mutate gameplay state.

import { targetOrientation } from './pieces.js';
import { getSrsKicks, getHalfTurnKicks } from './kicks.js';
import { collides } from './collision.js';

export function tryRotate(piece, delta, board, W, H, cellsFor, onHalfTurn) {
  if (!piece) return false;

  // O has no rotational state in SRS/TETR.IO.
  if (piece.type === 'O') return false;

  const from = piece.o;
  const to = targetOrientation(from, delta);
  const isHalfTurn = delta === 2 || delta === -2;
  const kicks = isHalfTurn
    ? getHalfTurnKicks(piece.type, from)
    : getSrsKicks(piece.type, from, to);

  for (const [dx, dy] of kicks) {
    const nx = piece.x + dx;
    const ny = piece.y + dy;
    if (collides(nx, ny, to, board, W, H, cellsFor, piece.type)) continue;

    const old = { ...piece };
    piece.x = nx;
    piece.y = ny;
    piece.o = to;

    if (isHalfTurn && onHalfTurn) onHalfTurn(old);
    return true;
  }

  return false;
}
