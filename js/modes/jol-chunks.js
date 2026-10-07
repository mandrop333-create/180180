// JOL CHUNKS spatial rule.
// One J, one O, and one L form a valid chunk when their occupied cells
// exactly fill a 3x4 or 4x3 rectangle. The pieces remain normal Tetris
// tetrominoes; their positions and orientations create the larger shape.

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

export function getJolEnvelope(placements, cellsFor) {
  const cells = placements.flatMap(piece => absoluteCells(piece, cellsFor));
  if (!cells.length) return null;
  const box = bounds(cells);
  return {
    ...box,
    width: box.maxX - box.minX + 1,
    height: box.maxY - box.minY + 1
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
  const unique = new Set(cells.map(([x, y]) => `${x},${y}`));
  if (unique.size !== 12) {
    return { valid: false, reason: 'The three pieces cannot overlap.' };
  }

  const envelope = getJolEnvelope(placements, cellsFor);
  const is3x4 = envelope.width === 3 && envelope.height === 4;
  const is4x3 = envelope.width === 4 && envelope.height === 3;
  if (!is3x4 && !is4x3) {
    return {
      valid: false,
      reason: 'The JOL must form a 3×4 or 4×3 rectangle.',
      width: envelope.width,
      height: envelope.height,
      bounds: envelope
    };
  }

  // Three tetrominoes contain exactly 12 cells, so a 3x4 or 4x3 envelope
  // with 12 unique cells is completely filled: there are no holes.
  return {
    valid: true,
    width: envelope.width,
    height: envelope.height,
    cells,
    bounds: envelope,
    orientation: is3x4 ? '3×4' : '4×3'
  };
}
