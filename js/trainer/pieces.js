// Piece definitions and rotation logic
// Currently T-piece only, but structured for future expansion to all 7 pieces

/**
 * Get cell coordinates for a piece at a given orientation
 * @param {number} o - Orientation (0=spawn/up, 1=right, 2=180°, 3=left)
 * @returns {Array<Array<number>>} Array of [x, y] coordinates relative to pivot
 */
export function cellsFor(o) {
  // 3x3 pivot-centered T, orientations are quarter-turns from spawn-up
  const base = [[0, 1], [1, 1], [2, 1], [1, 0]];
  return base.map(([x, y]) => {
    let a = x - 1, b = y - 1;
    for (let i = 0; i < o; i++) {
      [a, b] = [-b, a];
    }
    return [a + 1, b + 1];
  });
}

/**
 * Calculate target orientation for a rotation
 * @param {number} from - Current orientation
 * @param {number} delta - Rotation delta (1=CW, -1=CCW, 2=180°, -2=180°)
 * @returns {number} Target orientation (0-3)
 */
export function targetOrientation(from, delta) {
  // A 180 input is a single direct orientation transition: 0↔2 or R↔L.
  // It is never implemented by invoking CW/CCW twice.
  return (from + (delta === 2 || delta === -2 ? 2 : delta) + 4) % 4;
}

/**
 * Get kick table for a rotation
 * @param {number} delta - Rotation delta
 * @returns {Array<Array<number>>} Array of [dx, dy] kick offsets
 */
export function getKicks(delta) {
  // TETR.IO-inspired direct half-turn: test offsets as a single transition.
  // The 180 list is deliberately conservative; verify against official kick diagram before claiming exact parity.
  if (delta === 2 || delta === -2) {
    return [[0, 0], [0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [2, 0], [-2, 0]];
  }
  return [[0, 0], [0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1]];
}
