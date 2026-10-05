// TETR.IO-style SRS kick data.
// Coordinates use +x right and +y down.
// The default TETR.IO rotation system is SRS+; the custom 180 table
// below follows the published SRS+ 180 patterns.

const JLSTZ = {
  '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]]
};

const I = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
};

// These are the SRS+ 180 candidates expressed in this engine's y-down grid.
const HALF_JLSTZ = {
  0: [[0,0],[0,-1],[1,-1],[-1,-1],[1,0],[-1,0]],
  1: [[0,0],[1,0],[1,-2],[1,-1],[0,-2],[0,-1]],
  2: [[0,0],[0,1],[-1,1],[1,1],[-1,0],[1,0]],
  3: [[0,0],[-1,0],[-1,-2],[-1,-1],[0,-2],[0,-1]]
};

// The I piece uses a different rotation center. These candidates are kept
// separate so the geometry-specific handling cannot leak into JLSTZ pieces.
const HALF_I = {
  0: [[1,0],[1,-1]],
  1: [[-1,1],[0,1]],
  2: [[-1,0],[-1,1]],
  3: [[1,-1],[0,-1]]
};

export function getSrsKicks(type, from, to) {
  if (type === 'O') return [];
  const table = type === 'I' ? I : JLSTZ;
  return table[from + '>' + to] || [];
}

export function getHalfTurnKicks(type, from) {
  if (type === 'O') return [];
  return (type === 'I' ? HALF_I : HALF_JLSTZ)[from] || [[0,0]];
}

export const DEFAULT_HALF_TURN_KICKS = HALF_JLSTZ[0];
