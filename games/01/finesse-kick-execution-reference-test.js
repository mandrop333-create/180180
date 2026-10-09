// Executes every independently specified kick candidate in isolation.
// Static reference geometry/kicks define the expected result; production
// rotation/collision are only the system under test. For candidate i, blockers
// are placed so every earlier candidate collides while candidate i remains legal.
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import {
  REFERENCE_I_SRS_PLUS,
  REFERENCE_I_180_SRS_PLUS,
  REFERENCE_JLSTZ_SRS,
  REFERENCE_JLSTZ_180_SRS_PLUS
} from './finesse-kick-reference-fixtures.js';
import { tryRotate } from './rotation.js';
import { cellsFor } from './pieces.js';
import { collides } from './collision.js';

const W = 10;
const H = 20;
const START_X = 4;
const START_Y = 6;

function assert(condition, message) {
  if (!condition) throw new Error('kick execution reference: ' + message);
}
function key(x,y) { return x + ',' + y; }
function worldCells(type, orientation, x, y) {
  return REFERENCE_PIECES[type].orientations[((orientation % 4) + 4) % 4]
    .map(([cx,cy]) => [x + cx, y + cy]);
}
function intersectsBoard(type, orientation, x, y, board) {
  for (const [cx,cy] of worldCells(type, orientation, x, y)) {
    if (cx < 0 || cx >= W || cy >= H) return true;
    if (cy >= 0 && board[cy][cx]) return true;
  }
  return false;
}
function boardWithBlockers(cells) {
  const board = Array.from({ length:H }, () => Array(W).fill(0));
  for (const [x,y] of cells) {
    assert(x >= 0 && x < W && y >= 0 && y < H, 'generated blocker outside board: ' + key(x,y));
    board[y][x] = 1;
  }
  return board;
}
function makeCase({type, from, to, delta, kicks, index, label}) {
  const dx = kicks[index][0];
  const dy = kicks[index][1];
  const current = new Set(worldCells(type, from, START_X, START_Y).map(([x,y]) => key(x,y)));
  const expected = new Set(worldCells(type, to, START_X + dx, START_Y + dy).map(([x,y]) => key(x,y)));
  const blockers = new Set();

  for (let earlier = 0; earlier < index; earlier++) {
    const [priorDx,priorDy] = kicks[earlier];
    const priorCells = worldCells(type, to, START_X + priorDx, START_Y + priorDy);
    // Any target cell not occupied by the initial piece or the expected
    // result can block this earlier candidate without invalidating the test.
    const available = priorCells
      .map(([x,y]) => [x,y])
      .filter(([x,y]) => x >= 0 && x < W && y >= 0 && y < H)
      .filter(([x,y]) => !current.has(key(x,y)) && !expected.has(key(x,y)))
      .sort((a,b) => a[1] - b[1] || a[0] - b[0]);
    if (available.length === 0) {
      return { skipped:true, reason:'no blocker cell isolates earlier candidate ' + earlier };
    }
    blockers.add(key(available[0][0], available[0][1]));
  }

  const blockerCells = [...blockers].map(value => value.split(',').map(Number));
  const board = boardWithBlockers(blockerCells);
  assert(!intersectsBoard(type, from, START_X, START_Y, board),
    label + ' candidate ' + index + ': generated board overlaps initial piece');
  assert(!intersectsBoard(type, to, START_X + dx, START_Y + dy, board),
    label + ' candidate ' + index + ': generated board blocks expected kick');
  for (let earlier = 0; earlier < index; earlier++) {
    const [priorDx,priorDy] = kicks[earlier];
    assert(intersectsBoard(type, to, START_X + priorDx, START_Y + priorDy, board),
      label + ' candidate ' + index + ': earlier kick ' + earlier + ' remains legal');
  }

  const piece = { type, x:START_X, y:START_Y, o:from };
  const succeeded = tryRotate(piece, delta, board, W, H, cellsFor);
  assert(succeeded, label + ' candidate ' + index + ': production rotation failed');
  assert(piece.x === START_X + dx && piece.y === START_Y + dy && piece.o === to,
    label + ' candidate ' + index + ': expected offset (' + dx + ',' + dy +
    ') but production selected (' + (piece.x - START_X) + ',' +
    (piece.y - START_Y) + ') orientation ' + piece.o);
  return { skipped:false, blockers:blockerCells.length };
}

export function runFinesseKickExecutionReferenceTests() {
  let checked = 0;
  let skipped = 0;
  const sources = [];
  for (const [transition,kicks] of Object.entries(REFERENCE_I_SRS_PLUS)) {
    const [from,to] = transition.split('>').map(Number);
    const delta = to === (from + 1) % 4 ? 1 : -1;
    for (let index=0; index<kicks.length; index++) {
      const label = 'I SRS+ ' + transition;
      const result = makeCase({type:'I',from,to,delta,kicks,index,label});
      if (result.skipped) { skipped++; sources.push(label + '#' + index + ': ' + result.reason); }
      else checked++;
    }
  }
  for (const [orientationText,kicks] of Object.entries(REFERENCE_I_180_SRS_PLUS)) {
    const from = Number(orientationText);
    const to = (from + 2) % 4;
    for (let index=0; index<kicks.length; index++) {
      const label = 'I direct 180 orientation ' + from;
      const result = makeCase({type:'I',from,to,delta:2,kicks,index,label});
      if (result.skipped) { skipped++; sources.push(label + '#' + index + ': ' + result.reason); }
      else checked++;
    }
  }
  for (const [transition,kicks] of Object.entries(REFERENCE_JLSTZ_SRS)) {
    const [from,to] = transition.split('>').map(Number);
    const delta = to === (from + 1) % 4 ? 1 : -1;
    for (const type of ['J','L','S','T','Z']) {
      for (let index=0; index<kicks.length; index++) {
        const label = type + ' SRS ' + transition;
        const result = makeCase({type,from,to,delta,kicks,index,label});
        if (result.skipped) { skipped++; sources.push(label + '#' + index + ': ' + result.reason); }
        else checked++;
      }
    }
  }
  for (const [orientationText,kicks] of Object.entries(REFERENCE_JLSTZ_180_SRS_PLUS)) {
    const from = Number(orientationText);
    const to = (from + 2) % 4;
    for (const type of ['J','L','S','T','Z']) {
      for (let index=0; index<kicks.length; index++) {
        const label = type + ' direct 180 orientation ' + from;
        const result = makeCase({type,from,to,delta:2,kicks,index,label});
        if (result.skipped) { skipped++; sources.push(label + '#' + index + ': ' + result.reason); }
        else checked++;
      }
    }
  }
  assert(skipped === 0, 'some kick candidates could not be independently isolated: ' + sources.join('; '));
  return {ok:true,checked,skipped,coverage:'all ordered kick candidates forced through real production rotation/collision'};
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runFinesseKickExecutionReferenceTests()));
}
