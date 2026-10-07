// Mode #1 placement-quality analyzer.
// This is intentionally a trainer-specific misdrop detector, not a full Tetris AI.
// It compares the board before and after a lock and measures damage introduced by
// the placement. Existing holes are not penalized; new damage is.

const WEIGHTS = Object.freeze({
  newHoles: 100,
  newHoleDepth: 12,
  newBumpiness: 4,
  newAggregateHeight: 1,
  newMaxHeight: 2,
  linesCleared: 18
});

const MISDROP_THRESHOLD = 70;

function cloneBoard(board) {
  return board.map(row => [...row]);
}

export function countHoles(board) {
  if (!board?.length) return 0;
  const height = board.length;
  const width = board[0]?.length ?? 0;
  let holes = 0;

  for (let x = 0; x < width; x++) {
    let seenBlock = false;
    for (let y = 0; y < height; y++) {
      if (board[y][x]) {
        seenBlock = true;
      } else if (seenBlock) {
        holes++;
      }
    }
  }

  return holes;
}

export function holeDepth(board) {
  if (!board?.length) return 0;
  const height = board.length;
  const width = board[0]?.length ?? 0;
  let depth = 0;

  for (let x = 0; x < width; x++) {
    let top = -1;
    for (let y = 0; y < height; y++) {
      if (board[y][x]) {
        top = y;
        break;
      }
    }
    if (top < 0) continue;

    for (let y = top + 1; y < height; y++) {
      if (!board[y][x]) depth += y - top;
    }
  }

  return depth;
}

export function columnHeights(board) {
  if (!board?.length) return [];
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const result = Array(width).fill(0);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (board[y][x]) {
        result[x] = height - y;
        break;
      }
    }
  }

  return result;
}

export function aggregateHeight(board) {
  return columnHeights(board).reduce((sum, value) => sum + value, 0);
}

export function maxHeight(board) {
  return Math.max(0, ...columnHeights(board));
}

export function bumpiness(board) {
  const heights = columnHeights(board);
  let value = 0;
  for (let x = 1; x < heights.length; x++) {
    value += Math.abs(heights[x] - heights[x - 1]);
  }
  return value;
}

function metrics(board) {
  return {
    holes: countHoles(board),
    holeDepth: holeDepth(board),
    bumpiness: bumpiness(board),
    aggregateHeight: aggregateHeight(board),
    maxHeight: maxHeight(board)
  };
}

export function analyzePlacement({
  beforeBoard,
  afterLockBoard,
  afterClearBoard,
  cleared = 0
}) {
  const before = metrics(beforeBoard);
  const rawAfter = metrics(afterLockBoard);
  const after = metrics(afterClearBoard || afterLockBoard);

  // When a line was cleared, use the final board for hole damage. A temporary
  // cavity that disappears with the cleared line should not be called a misdrop.
  // Without a clear, the raw lock board is the authoritative placement result.
  const resultBoard = cleared > 0 ? after : rawAfter;

  const newHoles = Math.max(0, resultBoard.holes - before.holes);
  const newHoleDepth = Math.max(0, resultBoard.holeDepth - before.holeDepth);
  const newBumpiness = Math.max(0, resultBoard.bumpiness - before.bumpiness);
  const newAggregateHeight = Math.max(0, resultBoard.aggregateHeight - before.aggregateHeight);
  const newMaxHeight = Math.max(0, resultBoard.maxHeight - before.maxHeight);

  const damage =
    newHoles * WEIGHTS.newHoles +
    newHoleDepth * WEIGHTS.newHoleDepth +
    newBumpiness * WEIGHTS.newBumpiness +
    newAggregateHeight * WEIGHTS.newAggregateHeight +
    newMaxHeight * WEIGHTS.newMaxHeight;

  const lineReward = cleared * WEIGHTS.linesCleared;
  const score = damage - lineReward;
  const misdrop = damage >= MISDROP_THRESHOLD;

  return {
    misdrop,
    score,
    damage,
    lineReward,
    metrics: {
      before,
      rawAfter,
      after: resultBoard,
      delta: {
        newHoles,
        newHoleDepth,
        newBumpiness,
        newAggregateHeight,
        newMaxHeight,
        cleared
      }
    }
  };
}

export function snapshotBoard(board) {
  return cloneBoard(board);
}
