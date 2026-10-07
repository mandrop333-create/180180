// JOL CHUNKS spatial rules. A JOL is one J + O + L sequence; a chunk is
// valid when those three standard tetrominoes form a complete 3x4 or 4x3 rectangle.

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
  const keys = cells.map(([x, y]) => `${x},${y}`);
  if (new Set(keys).size !== 12) {
    return { valid: false, reason: 'Pieces overlap; the chunk must be one clean shape.' };
  }

  const box = bounds(cells);
  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;
  const validDimensions = JOL_CHUNK_DIMENSIONS.some(([w, h]) => w === width && h === height);

  if (!validDimensions || width * height !== cells.length) {
    return {
      valid: false,
      reason: 'The outside shape must be a perfect 3×4 or 4×3 rectangle.',
      width,
      height
    };
  }

  return {
    valid: true,
    width,
    height,
    cells,
    orientation: width === 3 ? '3×4' : '4×3'
  };
}
