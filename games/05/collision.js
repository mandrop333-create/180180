// Generic collision and movement logic.
// Piece geometry is supplied by the caller; this module does not know piece types.

export function collides(px, py, o, board, W, H, cellsFor, type) {
  for (const [cx, cy] of cellsFor(type, o)) {
    const x = px + cx;
    const y = py + cy;
    if (x < 0 || x >= W || y >= H) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}

export function move(piece, dx, dy, board, W, H, cellsFor) {
  if (!piece) return false;
  if (!collides(piece.x + dx, piece.y + dy, piece.o, board, W, H, cellsFor, piece.type)) {
    piece.x += dx;
    piece.y += dy;
    return true;
  }
  return false;
}
