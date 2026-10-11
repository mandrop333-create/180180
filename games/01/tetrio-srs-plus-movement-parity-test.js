import assert from 'node:assert/strict';
import { tryRotate } from './rotation.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';

// Kicked SRS+ outcomes originally captured from an older TETR.IO bundle.
// The independent current-client generator re-evaluated all these exact board
// states and confirmed the landing state and ordered kick index still match.
// Rows are native bottom-up masks; states are native minimum-cell coordinates.
const VERIFIED_ASSET = 'https://tetr.io/js/tetrio.js?hv=9628c0bbd.a0cb57db6fb1.20260921T164842';
const TOTAL_HEIGHT = 40;
const W = 10;
const H = TOTAL_HEIGHT;
const CASES = [
  {
    "name": "random-0724",
    "piece": "Z",
    "from": {
      "rotation": 2,
      "x": 6,
      "y": 1
    },
    "direction": -1,
    "rows": [
      770,
      32,
      22,
      840,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 6,
      "y": 1
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-0735",
    "piece": "Z",
    "from": {
      "rotation": 1,
      "x": 1,
      "y": 3
    },
    "direction": -1,
    "rows": [
      152,
      34,
      2,
      896,
      17,
      241,
      8,
      512,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 1,
      "y": 4
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-0787",
    "piece": "S",
    "from": {
      "rotation": 0,
      "x": 4,
      "y": 5
    },
    "direction": 2,
    "rows": [
      669,
      312,
      194,
      281,
      96,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 4,
      "y": 5
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-0845",
    "piece": "Z",
    "from": {
      "rotation": 3,
      "x": 8,
      "y": 6
    },
    "direction": 1,
    "rows": [
      128,
      714,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 7,
      "y": 7
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-0855",
    "piece": "S",
    "from": {
      "rotation": 2,
      "x": 2,
      "y": 4
    },
    "direction": 1,
    "rows": [
      516,
      64,
      416,
      10,
      512,
      36,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 3,
      "y": 4
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-0888",
    "piece": "L",
    "from": {
      "rotation": 3,
      "x": 4,
      "y": 4
    },
    "direction": 1,
    "rows": [
      110,
      24,
      18,
      539,
      584,
      449,
      320,
      904,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 3,
      "y": 5
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-0912",
    "piece": "L",
    "from": {
      "rotation": 1,
      "x": 6,
      "y": 4
    },
    "direction": 1,
    "rows": [
      32,
      72,
      88,
      704,
      4,
      422,
      258,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 5,
      "y": 6
    },
    "sourceKickIndex": 2
  },
  {
    "name": "random-0924",
    "piece": "Z",
    "from": {
      "rotation": 0,
      "x": 3,
      "y": 0
    },
    "direction": 1,
    "rows": [
      832,
      0,
      513,
      192,
      616,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 3,
      "y": 0
    },
    "sourceKickIndex": 1
  },
  {
    "name": "random-1054",
    "piece": "T",
    "from": {
      "rotation": 1,
      "x": 0,
      "y": 2
    },
    "direction": 2,
    "rows": [
      774,
      545,
      36,
      644,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 0,
      "y": 2
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1117",
    "piece": "J",
    "from": {
      "rotation": 1,
      "x": 0,
      "y": 6
    },
    "direction": 2,
    "rows": [
      408,
      595,
      69,
      384,
      279,
      806,
      64,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 0,
      "y": 6
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1123",
    "piece": "T",
    "from": {
      "rotation": 3,
      "x": 6,
      "y": 2
    },
    "direction": 1,
    "rows": [
      71,
      1,
      284,
      259,
      290,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 5,
      "y": 3
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1124",
    "piece": "S",
    "from": {
      "rotation": 0,
      "x": 3,
      "y": 7
    },
    "direction": 1,
    "rows": [
      8,
      260,
      368,
      32,
      441,
      603,
      615,
      320,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 3,
      "y": 6
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1151",
    "piece": "T",
    "from": {
      "rotation": 3,
      "x": 0,
      "y": 2
    },
    "direction": 1,
    "rows": [
      402,
      413,
      0,
      580,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 0,
      "y": 5
    },
    "sourceKickIndex": 2
  },
  {
    "name": "random-1156",
    "piece": "Z",
    "from": {
      "rotation": 0,
      "x": 3,
      "y": 4
    },
    "direction": -1,
    "rows": [
      1,
      512,
      18,
      544,
      523,
      643,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 4,
      "y": 3
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1206",
    "piece": "J",
    "from": {
      "rotation": 0,
      "x": 3,
      "y": 6
    },
    "direction": -1,
    "rows": [
      518,
      513,
      21,
      256,
      0,
      72,
      133,
      594,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 4,
      "y": 5
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1313",
    "piece": "I",
    "from": {
      "rotation": 0,
      "x": 6,
      "y": 0
    },
    "direction": 2,
    "rows": [
      26,
      2,
      13,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 6,
      "y": 0
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1425",
    "piece": "J",
    "from": {
      "rotation": 3,
      "x": 8,
      "y": 0
    },
    "direction": -1,
    "rows": [
      16,
      265,
      260,
      6,
      532,
      973,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 7,
      "y": 2
    },
    "sourceKickIndex": 3
  },
  {
    "name": "random-1450",
    "piece": "Z",
    "from": {
      "rotation": 3,
      "x": 5,
      "y": 1
    },
    "direction": 1,
    "rows": [
      793,
      72,
      270,
      33,
      658,
      329,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 4,
      "y": 4
    },
    "sourceKickIndex": 3
  },
  {
    "name": "random-1478",
    "piece": "I",
    "from": {
      "rotation": 2,
      "x": 2,
      "y": 5
    },
    "direction": 2,
    "rows": [
      412,
      514,
      640,
      812,
      688,
      512,
      848,
      72,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 2,
      "y": 5
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1508",
    "piece": "I",
    "from": {
      "rotation": 0,
      "x": 2,
      "y": 4
    },
    "direction": -1,
    "rows": [
      714,
      107,
      0,
      187,
      578,
      872,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 2,
      "y": 2
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1538",
    "piece": "J",
    "from": {
      "rotation": 1,
      "x": 2,
      "y": 3
    },
    "direction": 1,
    "rows": [
      41,
      37,
      128,
      520,
      8,
      546,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 1,
      "y": 5
    },
    "sourceKickIndex": 2
  },
  {
    "name": "random-1592",
    "piece": "J",
    "from": {
      "rotation": 2,
      "x": 1,
      "y": 4
    },
    "direction": 1,
    "rows": [
      59,
      510,
      308,
      2,
      2,
      0,
      86,
      212,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 2,
      "y": 4
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1593",
    "piece": "J",
    "from": {
      "rotation": 1,
      "x": 0,
      "y": 3
    },
    "direction": 1,
    "rows": [
      600,
      24,
      513,
      640,
      128,
      128,
      549,
      768,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 0,
      "y": 3
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1718",
    "piece": "I",
    "from": {
      "rotation": 1,
      "x": 1,
      "y": 5
    },
    "direction": 1,
    "rows": [
      789,
      92,
      400,
      119,
      3,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 1,
      "y": 6
    },
    "sourceKickIndex": 1
  },
  {
    "name": "random-1792",
    "piece": "Z",
    "from": {
      "rotation": 0,
      "x": 6,
      "y": 6
    },
    "direction": 1,
    "rows": [
      266,
      845,
      19,
      16,
      16,
      704,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 6,
      "y": 6
    },
    "sourceKickIndex": 1
  },
  {
    "name": "random-1817",
    "piece": "L",
    "from": {
      "rotation": 3,
      "x": 7,
      "y": 1
    },
    "direction": -1,
    "rows": [
      34,
      211,
      195,
      5,
      113,
      69,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 7,
      "y": 3
    },
    "sourceKickIndex": 2
  },
  {
    "name": "random-1917",
    "piece": "T",
    "from": {
      "rotation": 0,
      "x": 4,
      "y": 3
    },
    "direction": 1,
    "rows": [
      1,
      30,
      44,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 4,
      "y": 2
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1922",
    "piece": "I",
    "from": {
      "rotation": 3,
      "x": 9,
      "y": 2
    },
    "direction": 2,
    "rows": [
      672,
      360,
      0,
      150,
      50,
      2,
      635,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 9,
      "y": 2
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-1950",
    "piece": "Z",
    "from": {
      "rotation": 3,
      "x": 1,
      "y": 6
    },
    "direction": -1,
    "rows": [
      128,
      520,
      13,
      906,
      707,
      77,
      5,
      848,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 1,
      "y": 8
    },
    "sourceKickIndex": 2
  },
  {
    "name": "random-1995",
    "piece": "J",
    "from": {
      "rotation": 2,
      "x": 3,
      "y": 7
    },
    "direction": 1,
    "rows": [
      630,
      697,
      400,
      34,
      128,
      160,
      770,
      337,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 4,
      "y": 8
    },
    "sourceKickIndex": 1
  },
  {
    "name": "random-2006",
    "piece": "J",
    "from": {
      "rotation": 1,
      "x": 2,
      "y": 3
    },
    "direction": -1,
    "rows": [
      622,
      73,
      193,
      16,
      2,
      993,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 2,
      "y": 4
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-2021",
    "piece": "I",
    "from": {
      "rotation": 2,
      "x": 6,
      "y": 0
    },
    "direction": -1,
    "rows": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 6,
      "y": 0
    },
    "sourceKickIndex": 2
  },
  {
    "name": "random-2037",
    "piece": "I",
    "from": {
      "rotation": 2,
      "x": 0,
      "y": 1
    },
    "direction": 2,
    "rows": [
      137,
      160,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 0,
      "x": 0,
      "y": 1
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-2039",
    "piece": "J",
    "from": {
      "rotation": 1,
      "x": 0,
      "y": 2
    },
    "direction": 1,
    "rows": [
      0,
      113,
      252,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 0,
      "y": 4
    },
    "sourceKickIndex": 3
  },
  {
    "name": "random-2047",
    "piece": "L",
    "from": {
      "rotation": 2,
      "x": 0,
      "y": 3
    },
    "direction": 1,
    "rows": [
      113,
      11,
      406,
      36,
      624,
      89,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 1,
      "y": 4
    },
    "sourceKickIndex": 1
  },
  {
    "name": "random-2083",
    "piece": "Z",
    "from": {
      "rotation": 2,
      "x": 3,
      "y": 2
    },
    "direction": 1,
    "rows": [
      268,
      941,
      204,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 4,
      "y": 2
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-2084",
    "piece": "T",
    "from": {
      "rotation": 1,
      "x": 5,
      "y": 0
    },
    "direction": 1,
    "rows": [
      8,
      24,
      325,
      17,
      162,
      327,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 2,
      "x": 5,
      "y": 0
    },
    "sourceKickIndex": 0
  },
  {
    "name": "random-2123",
    "piece": "L",
    "from": {
      "rotation": 0,
      "x": 5,
      "y": 2
    },
    "direction": -1,
    "rows": [
      672,
      421,
      3,
      83,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 3,
      "x": 6,
      "y": 2
    },
    "sourceKickIndex": 1
  },
  {
    "name": "random-2171",
    "piece": "T",
    "from": {
      "rotation": 0,
      "x": 7,
      "y": 3
    },
    "direction": 1,
    "rows": [
      46,
      711,
      256,
      6,
      2,
      96,
      276,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "expected": {
      "rotation": 1,
      "x": 7,
      "y": 2
    },
    "sourceKickIndex": 0
  }
];

function nativeToLocalOrigin(type, state) {
  const cells = REFERENCE_PIECES[type].orientations[state.rotation];
  const minX = Math.min(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  return { x: state.x - minX, y: TOTAL_HEIGHT - 1 - state.y - maxY };
}

function boardFromNativeRows(rows) {
  const board = Array.from({ length: TOTAL_HEIGHT }, () => Array(W).fill(0));
  for (let nativeY = 0; nativeY < rows.length; nativeY += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((rows[nativeY] & (1 << x)) !== 0) board[TOTAL_HEIGHT - 1 - nativeY][x] = 1;
    }
  }
  return board;
}

const cellsForReference = (type, rotation) => REFERENCE_PIECES[type].orientations[rotation];
for (const testCase of CASES) {
  const from = nativeToLocalOrigin(testCase.piece, testCase.from);
  const expected = nativeToLocalOrigin(testCase.piece, testCase.expected);
  const piece = { type: testCase.piece, ...from, o: testCase.from.rotation };
  const board = boardFromNativeRows(testCase.rows);

  assert.equal(tryRotate(piece, testCase.direction, board, W, H, cellsForReference), true,
    testCase.name + ': pinned rotation should succeed');
  assert.deepEqual({ x: piece.x, y: piece.y, rotation: piece.o },
    { ...expected, rotation: testCase.expected.rotation },
    testCase.name + ': final local-origin state must match pinned TETR.IO outcome');

  const candidates = testCase.direction === 2 || testCase.direction === -2
    ? getTetrio180Kicks(testCase.piece, testCase.from.rotation)
    : getSrsKicks(testCase.piece, testCase.from.rotation, testCase.expected.rotation);
  const selectedLocalIndex = candidates.findIndex(([dx, dy]) =>
    dx === piece.x - from.x && dy === piece.y - from.y);
  assert.equal(selectedLocalIndex, testCase.sourceKickIndex + 1,
    testCase.name + ': local selected-candidate index must equal pinned kickIndex + baseline slot');
}

console.log(JSON.stringify({ ok: true, cases: CASES.length, verifiedAgainstAsset: VERIFIED_ASSET,
  scope: '39 pinned SRS+ kicked outcomes across I/T/S/Z/J/L; final state and selected candidate order' }));
