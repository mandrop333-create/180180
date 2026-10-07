// JOL CHUNKS spatial rules.
// A JOL is one J + O + L relationship. A chunk is valid when the
// combined OUTER SILHOUETTE of those three standard tetrominoes has a
// 3x4 or 4x3 rectangular envelope. The pieces remain independent
// Tetris pieces; the rectangle describes their shared spatial boundary,
// not a requirement that their occupied cells tile every cell internally.

export const JOL_SEQUENCE = Object.freeze(['J', 'O', 'L']);
export const JOL_CHUNK_DIMENSIONS = Object.freeze([[3, 4], [4, 3]]);

function absoluteCells(placement, cellsFor) {
  return cellsFor(placement.type, placement.o).map(([x, y]) => [
    placement.x + x,
    placement.y + y
  ]);
}

function bounds(cells) {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

export function validateJolChunk(placements, cellsFor) {
  if (!Array.isArray(placements) || placements.length !== 3) {
    return { valid: false, reason: 'A JOL chunk needs exactly three pieces.' };
  }

  const types = placements.map(piece => piece.type);
  if (JOL_SEQUENCE.some(type => !types.includes(type)) || new Set(types).size !== 3) {
    return { valid: false, reason: 'The chunk must contain one J, one O, and one L.' };
  }

  const cells = placements.flatMap(piece => absoluteCells(piece, cellsFor));
  if (!cells.length) {
    return { valid: false, reason: 'The chunk has no spatial footprint.' };
  }

  // The user's chunk rule is about the combined outside boundary. Do not
  // require the three tetrominoes to tile all 12 cells: standard J/O/L
  // geometry cannot do that while preserving their normal identities.
  const box = bounds(cells);
  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;
  const validDimensions = JOL_CHUNK_DIMENSIONS.some(([w, h]) => w === width && h === height);

  if (!validDimensions) {
    return {
      valid: false,
      reason: 'The combined outside boundary must be a 3×4 or 4×3 rectangle.',
      width,
      height,
      bounds: box
    };
  }

  return {
    valid: true,
    width,
    height,
    cells,
    bounds: box,
    orientation: width === 3 ? '3×4' : '4×3'
  };
}
