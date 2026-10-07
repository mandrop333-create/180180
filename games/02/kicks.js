// TETR.IO-inspired SRS+ kick data.
// Our board uses +y downward; published SRS tables commonly describe +y upward,
// so the vertical signs below are converted for this runtime.
//
// 90° JLSTZ follows Guideline SRS. I uses the SRS+ ordering/structure.
// 180° uses the published SRS+ kick system: it is a direct rotation, not two 90s.

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

// SRS+ makes the I kicks mirror-consistent across the horizontal axis.
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

const HALF_JLSTZ = {
  0: [[0,0],[0,-1],[1,-1],[-1,-1],[1,0],[-1,0]],
  1: [[0,0],[1,0],[1,-2],[1,-1],[0,-2],[0,-1]],
  2: [[0,0],[0,1],[-1,1],[1,1],[-1,0],[1,0]],
  3: [[0,0],[-1,0],[-1,-2],[-1,-1],[0,-2],[0,-1]]
};

const HALF_I = {
  0: [[0,0],[1,1],[1,0]],
  1: [[0,0],[-1,1],[0,1]],
  2: [[0,0],[-1,-1],[-1,0]],
  3: [[0,0],[1,-1],[0,-1]]
};

export function getSrsKicks(type, from, to) {
  if (type === 'O') return [[0,0]];
  const table = type === 'I' ? I : JLSTZ;
  return table[from + '>' + to] || [[0,0]];
}

export function getTetrio180Kicks(type, from) {
  if (type === 'O') return [];
  return (type === 'I' ? HALF_I : HALF_JLSTZ)[((from % 4) + 4) % 4] || [[0,0]];
}
