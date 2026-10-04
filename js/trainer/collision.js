// Collision detection logic

/**
 * Check if a piece collides with walls, floor, or locked blocks
 * @param {number} px - Piece x position
 * @param {number} py - Piece y position
 * @param {number} o - Piece orientation
 * @param {Array<Array<number>>} board - 2D array representing the board (0=empty, 1=locked)
 * @param {number} W - Board width
 * @param {number} H - Board height
 * @param {Function} cellsFor - Function to get piece cell coordinates
 * @returns {boolean} True if collision detected
 */
export function collides(px, py, o, board, W, H, cellsFor) {
  for (const [cx, cy] of cellsFor(o)) {
    const x = px + cx;
    const y = py + cy;
    if (x < 0 || x >= W || y >= H) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}

/**
 * Try to move a piece
 * @param {Object} piece - Piece object {x, y, o}
 * @param {number} dx - X movement delta
 * @param {number} dy - Y movement delta
 * @param {Array<Array<number>>} board - Board state
 * @param {number} W - Board width
 * @param {number} H - Board height
 * @param {Function} cellsFor - Function to get piece cell coordinates
 * @returns {boolean} True if move succeeded
 */
export function move(piece, dx, dy, board, W, H, cellsFor) {
  if (!piece) return false;
  if (!collides(piece.x + dx, piece.y + dy, piece.o, board, W, H, cellsFor)) {
    piece.x += dx;
    piece.y += dy;
    return true;
  }
  return false;
}
