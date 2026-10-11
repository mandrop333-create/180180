// Independently authored geometry fixtures for the trainer's 4x4 local-cell convention.
// These constants intentionally do not import or derive from pieces.js.
// Orientation 0 is the spawn silhouette; each subsequent orientation is clockwise.
// Values are [localX, localY] occupied cells, and list order is irrelevant.
export const REFERENCE_PIECES = Object.freeze({
  I: {
    spawn: { x: 3, y: 0 },
    orientations: [
      [[0,1],[1,1],[2,1],[3,1]],
      [[2,0],[2,1],[2,2],[2,3]],
      [[0,2],[1,2],[2,2],[3,2]],
      [[1,0],[1,1],[1,2],[1,3]]
    ]
  },
  O: {
    spawn: { x: 4, y: 0 },
    orientations: [
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]]
    ]
  },
  T: {
    spawn: { x: 3, y: 0 },
    orientations: [
      [[1,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[2,1],[1,2]],
      [[1,0],[0,1],[1,1],[1,2]]
    ]
  },
  S: {
    spawn: { x: 3, y: 0 },
    orientations: [
      [[1,0],[2,0],[0,1],[1,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[1,1],[2,1],[0,2],[1,2]],
      [[0,0],[0,1],[1,1],[1,2]]
    ]
  },
  Z: {
    spawn: { x: 3, y: 0 },
    orientations: [
      [[0,0],[1,0],[1,1],[2,1]],
      [[2,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[1,0],[0,1],[1,1],[0,2]]
    ]
  },
  J: {
    spawn: { x: 3, y: 0 },
    orientations: [
      [[0,0],[0,1],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[0,2],[1,2]]
    ]
  },
  L: {
    spawn: { x: 3, y: 0 },
    orientations: [
      [[2,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,1],[0,2]],
      [[0,0],[1,0],[1,1],[1,2]]
    ]
  }
});
