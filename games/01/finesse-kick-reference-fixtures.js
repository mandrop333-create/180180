// Independent TETR.IO SRS+ I-kick reference fixture.
// Transcribed from the SRSPlus branches of the third-party S-Finder implementation:
// https://gist.github.com/torchlight/1832786cf053daa51bf188110b764090
//
// That source documents mathematical +y-up offsets and states its SRS+ I-kick
// ordering is used in TETR.IO. This fixture converts only the vertical sign to
// the trainer's screen-y-down board convention. It is intentionally static and
// does not import production kick data. Source/pivot compatibility remains
// documented in docs/finesse-reference-verification-ledger.md.
//
// Keys are orientation transitions (from>to); arrays preserve kick test order.
export const REFERENCE_I_SRS_PLUS = Object.freeze({
  '0>1': [[1,0],[2,0],[-1,0],[-1,1],[2,-2]],
  '1>2': [[0,1],[-1,1],[2,1],[-1,-1],[2,2]],
  '2>3': [[-1,0],[1,0],[-2,0],[1,-1],[-2,2]],
  '3>0': [[0,-1],[1,-1],[-2,-1],[1,1],[-2,-2]],
  '0>3': [[0,1],[-1,1],[2,1],[2,2],[-1,-1]],
  '1>0': [[-1,0],[-2,0],[1,0],[-2,2],[1,-1]],
  '2>1': [[0,-1],[-2,-1],[1,-1],[-2,-2],[1,1]],
  '3>2': [[1,0],[2,0],[-1,0],[2,-2],[-1,1]]
});

export const REFERENCE_I_180_SRS_PLUS = Object.freeze({
  0: [[1,1],[1,0]],
  1: [[-1,1],[0,1]],
  2: [[-1,-1],[-1,0]],
  3: [[1,-1],[0,-1]]
});
