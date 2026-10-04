// Rotation logic with wall kicks

import { targetOrientation, getKicks } from './pieces.js';
import { collides } from './collision.js';

/**
 * Try to rotate a piece with wall kicks
 * @param {Object} piece - Piece object {x, y, o}
 * @param {number} delta - Rotation delta (1=CW, -1=CCW, 2=180°, -2=180°)
 * @param {Array<Array<number>>} board - Board state
 * @param {number} W - Board width
 * @param {number} H - Board height
 * @param {Function} cellsFor - Function to get piece cell coordinates
 * @param {Function} onHalfTurn - Callback for 180° rotation (for animation)
 * @returns {boolean} True if rotation succeeded
 */
export function tryRotate(piece, delta, board, W, H, cellsFor, onHalfTurn) {
  if (!piece) return false;
  
  const from = piece.o;
  const to = targetOrientation(from, delta);
  const kicks = getKicks(delta);
  
  for (const [dx, dy] of kicks) {
    if (!collides(piece.x + dx, piece.y + dy, to, board, W, H, cellsFor)) {
      const old = { x: piece.x, y: piece.y, o: from };
      piece.x += dx;
      piece.y += dy;
      piece.o = to;
      
      if (delta === 2 || delta === -2) {
        if (onHalfTurn) onHalfTurn(old);
      }
      
      return true;
    }
  }
  
  return false;
}
