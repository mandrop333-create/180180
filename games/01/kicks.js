// TETR.IO-inspired SRS+ kick data.
// The board uses +y downward. These offsets are transcribed from the
// TETR.IO SRS+ tables; the zero-offset test is first for 90° and 180° turns.
// 180° is a direct rotation with its own kick table, not two quarter-turns.

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

// TETR.IO SRS+ I-piece kicks. The order differs from vanilla SRS and is
// gameplay-significant: the engine must try each kick in this exact order.
const I = {
 // TETR.IO SRS+ ordered kicks, converted from S-Finder's explicitly documented
 // "basic rotation coordinate system" to this board's screen-y-down axes.
 // Do not use S-Finder's raw Mino-origin offsets here: our pieces.js geometry
 // rotates around the basic local-frame pivot.
 '0>1': [[0,0],[1,0],[-2,0],[-2,1],[1,-2]],
 '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
 '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
 '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
 '0>3': [[0,0],[-1,0],[2,0],[2,1],[-1,-2]],
 '1>0': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
 '2>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
 '3>2': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
};

const HALF_JLSTZ = {
 0: [[0,0],[0,-1],[1,-1],[-1,-1],[1,0],[-1,0]],
 1: [[0,0],[1,0],[1,-2],[1,-1],[0,-2],[0,-1]],
 2: [[0,0],[0,1],[-1,1],[1,1],[-1,0],[1,0]],
 3: [[0,0],[-1,0],[-1,-2],[-1,-1],[0,-2],[0,-1]]
};

// Always test the unshifted destination first. The pinned TETR.IO snapshot
// runner does this baseline attempt before iterating the non-zero kick data.
// Pinned TETR.IO SRS+ I-piece direct-180 candidates, transformed through the
// pinned matrix anchors into trainer-local origin offsets. The zero-offset
// destination is checked first; each orientation then has exactly one source
// candidate. Raw client kickIndex 0 therefore corresponds to local index 1.
const HALF_I = {
 0: [[0,0],[0,-1]],
 1: [[0,0],[1,0]],
 2: [[0,0],[0,1]],
 3: [[0,0],[-1,0]]
};

export function getSrsKicks(type, from, to) {
 if(type==='O') return [[0,0]];
 const table=type==='I'?I:JLSTZ;
 return table[from+'>'+to] || [[0,0]];
}
export function getTetrio180Kicks(type, from) {
 if(type==='O') return [];
 return (type==='I'?HALF_I:HALF_JLSTZ)[((from%4)+4)%4] || [];
}
