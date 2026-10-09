// Independent TETR.IO SRS+ I-kick reference fixture.
// The S-Finder source explicitly distinguishes its raw Mino-origin offsets from
// the equivalent "basic rotation coordinate system" values. Our pieces.js
// uses the basic local-frame pivot, so these constants use the latter, with
// only +y-up converted to screen-y-down. Preserve the source's kick order.
// Source: https://gist.github.com/torchlight/1832786cf053daa51bf188110b764090
// This fixture is static and does not import production kick data.
//
// Keys are orientation transitions (from>to); arrays preserve kick test order.
export const REFERENCE_I_SRS_PLUS = Object.freeze({
  '0>1': [[0,0],[1,0],[-2,0],[-2,1],[1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[2,1],[-1,-2]],
  '1>0': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>2': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
});

export const REFERENCE_I_180_SRS_PLUS = Object.freeze({
  // The zero-offset baseline is attempted before explicit kicks by the
  // pinned TETR.IO movement algorithm. Non-zero offsets remain under audit.
  0: [[0,0],[1,1],[1,0]],
  1: [[0,0],[-1,1],[0,1]],
  2: [[0,0],[-1,-1],[-1,0]],
  3: [[0,0],[1,-1],[0,-1]]
});

 
// Conventional JLSTZ SRS 90-degree reference table (TetrisWiki), expressed in
// the trainer's screen-y-down convention. TETR.IO SRS+ documentation describes
// the special symmetry change as applying to I-piece kicks.
export const REFERENCE_JLSTZ_SRS = Object.freeze({
  '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]]
});

// TETR.IO-style JLSTZ 180 table transcribed from the S-Finder reference above,
// with only the vertical coordinate sign converted to screen-y-down.
export const REFERENCE_JLSTZ_180_SRS_PLUS = Object.freeze({
  0: [[0,0],[0,-1],[1,-1],[-1,-1],[1,0],[-1,0]],
  1: [[0,0],[1,0],[1,-2],[1,-1],[0,-2],[0,-1]],
  2: [[0,0],[0,1],[-1,1],[1,1],[-1,0],[1,0]],
  3: [[0,0],[-1,0],[-1,-2],[-1,-1],[0,-2],[0,-1]]
});
