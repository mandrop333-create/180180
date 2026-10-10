// Coordinate conversion equations ported from the pinned TETR.IO movement
// snapshot generator. Matrix data must come from the pinned client asset; this
// module intentionally accepts matrices as input and does not invent them.
export const TETRIO_VISIBLE_HEIGHT = 20;
export const TETRIO_BOARD_BUFFER = 20;
export const TETRIO_TOTAL_HEIGHT = TETRIO_VISIBLE_HEIGHT + TETRIO_BOARD_BUFFER;

function matrixFor(matrices, type, rotation) {
  const piece = matrices[type];
  if (!piece || !Array.isArray(piece.orientations) || !piece.orientations[rotation]) {
    throw new Error('Missing pinned TETR.IO matrix for ' + type + ' orientation ' + rotation);
  }
  return { ...piece, cells: piece.orientations[rotation] };
}

export function nativeToTetrioState(matrices, type, state) {
  const matrix = matrixFor(matrices, type, state.rotation);
  const minRelativeX = Math.min(...matrix.cells.map(([x]) => x - matrix.dx));
  const maxRelativeY = Math.max(...matrix.cells.map(([, y]) => y - matrix.dy));
  const ceilY = TETRIO_TOTAL_HEIGHT - 1 - state.y - maxRelativeY;
  return { x: state.x - minRelativeX, y: ceilY - 0.999999 };
}

export function tetrioBoardCells(matrices, type, rotation, x, y) {
  const matrix = matrixFor(matrices, type, rotation);
  const ceilY = Math.ceil(y);
  return matrix.cells.map(([cellX, cellY]) => ({
    x: x + (cellX - matrix.dx),
    y: ceilY + (cellY - matrix.dy)
  }));
}

export function tetrioToNativeState(matrices, type, rotation, x, y) {
  const cells = tetrioBoardCells(matrices, type, rotation, x, y);
  return {
    rotation,
    x: Math.min(...cells.map((cell) => cell.x)),
    y: Math.min(...cells.map((cell) => TETRIO_TOTAL_HEIGHT - 1 - cell.y))
  };
}
