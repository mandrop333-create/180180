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
 // TETR.IO SRS+ I-piece ordered kicks, normalized to screen-y-down.
 '0>1': [[1,0],[2,0],[-1,0],[-1,1],[2,-2]],
 '1>2': [[0,1],[-1,1],[2,1],[-1,-1],[2,2]],
 '2>3': [[-1,0],[1,0],[-2,0],[1,-1],[-2,2]],
 '3>0': [[0,-1],[1,-1],[-2,-1],[1,1],[-2,-2]],
 '0>3': [[0,1],[-1,1],[2,1],[2,2],[-1,-1]],
 '1>0': [[-1,0],[-2,0],[1,0],[-2,2],[1,-1]],
 '2>1': [[0,-1],[-2,-1],[1,-1],[-2,-2],[1,1]],
 '3>2': [[1,0],[2,0],[-1,0],[2,-2],[-1,1]]
};

const HALF_JLSTZ = {
 0: [[0,0],[0,-1],[1,-1],[-1,-1],[1,0],[-1,0]],
 1: [[0,0],[1,0],[1,-2],[1,-1],[0,-2],[0,-1]],
 2: [[0,0],[0,1],[-1,1],[1,1],[-1,0],[1,0]],
 3: [[0,0],[-1,0],[-1,-2],[-1,-1],[0,-2],[0,-1]]
};

// TETR.IO's I-piece 180 table has only one non-zero kick per direction.
const HALF_I = {
 // TETR.IO SRS+ direct-180 I-piece kicks, normalized to screen-y-down.
 0: [[1,1],[1,0]],
 1: [[-1,1],[0,1]],
 2: [[-1,-1],[-1,0]],
 3: [[1,-1],[0,-1]]
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
