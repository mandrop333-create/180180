// Executes every independently specified kick candidate in isolation.
// Static reference geometry/kicks define the expected result; production
// rotation/collision are only the system under test. For candidate i, blockers
// force every earlier candidate to collide while candidate i remains legal.
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import {
  REFERENCE_I_SRS_PLUS,
  REFERENCE_I_180_SRS_PLUS,
  REFERENCE_JLSTZ_SRS,
  REFERENCE_JLSTZ_180_SRS_PLUS
} from './finesse-kick-reference-fixtures.js';
import { tryRotate } from './rotation.js';
import { cellsFor } from './pieces.js';

const W = 10;
const H = 20;

function assert(condition, message) {
  if (!condition) throw new Error('kick execution reference: ' + message);
}
function key(x,y) { return x + ',' + y; }
function worldCells(type, orientation, x, y) {
  return REFERENCE_PIECES[type].orientations[((orientation % 4) + 4) % 4]
    .map(([cx,cy]) => [x + cx, y + cy]);
}
function referenceCollides(type, orientation, x, y, board) {
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
function tryOrigin({type, from, to, delta, kicks, index, x, y}) {
  const [dx,dy] = kicks[index];
  const current = new Set(worldCells(type, from, x, y).map(([cx,cy]) => key(cx,cy)));
  const expected = new Set(worldCells(type, to, x + dx, y + dy).map(([cx,cy]) => key(cx,cy)));
  const empty = Array.from({ length:H }, () => Array(W).fill(0));
  if (referenceCollides(type, from, x, y, empty) ||
      referenceCollides(type, to, x + dx, y + dy, empty)) return null;

  const blockers = new Set();
  for (let earlier = 0; earlier < index; earlier++) {
    const [priorDx,priorDy] = kicks[earlier];
    if (referenceCollides(type, to, x + priorDx, y + priorDy, empty)) continue;
    const priorCells = worldCells(type, to, x + priorDx, y + priorDy);
    const available = priorCells
      .filter(([cx,cy]) => cx >= 0 && cx < W && cy >= 0 && cy < H)
      .filter(([cx,cy]) => !current.has(key(cx,cy)) && !expected.has(key(cx,cy)))
      .sort((a,b) => a[1] - b[1] || a[0] - b[0]);
    if (available.length === 0) return null;
    blockers.add(key(available[0][0], available[0][1]));
  }

  const blockerCells = [...blockers].map(value => value.split(',').map(Number));
  const board = boardWithBlockers(blockerCells);
  if (referenceCollides(type, from, x, y, board) ||
      referenceCollides(type, to, x + dx, y + dy, board)) return null;
  for (let earlier = 0; earlier < index; earlier++) {
    const [priorDx,priorDy] = kicks[earlier];
    if (!referenceCollides(type, to, x + priorDx, y + priorDy, board)) return null;
  }

  const piece = { type, x, y, o:from };
  const succeeded = tryRotate(piece, delta, board, W, H, cellsFor);
  assert(succeeded, type + ' ' + from + '>' + to + ' candidate ' + index + ': production rotation failed');
  assert(piece.x === x + dx && piece.y === y + dy && piece.o === to,
    type + ' ' + from + '>' + to + ' candidate ' + index + ': expected offset (' + dx + ',' + dy +
    ') but production selected (' + (piece.x - x) + ',' + (piece.y - y) + ') orientation ' + piece.o);
  return {blockers:blockerCells.length, origin:{x,y}};
}
function makeCase(spec) {
  const positions = [];
  for (let y of [0,1,2,3,4,6,12,14,15,16,17]) {
    for (let x=0; x<W; x++) positions.push({x,y});
  }
  for (const origin of positions) {
    const result = tryOrigin({...spec,...origin});
    if (result) return result;
  }
  throw new Error('could not isolate ' + spec.label + ' candidate ' + spec.index +
    ' (' + JSON.stringify(spec.kicks[spec.index]) + ') at any valid origin');
}

export function runFinesseKickExecutionReferenceTests() {
  let checked = 0;
  let blockerCount = 0;
  const run = (spec) => {
    const result = makeCase(spec);
    checked++;
    blockerCount += result.blockers;
  };
  for (const [transition,kicks] of Object.entries(REFERENCE_I_SRS_PLUS)) {
    const [from,to] = transition.split('>').map(Number);
    const delta = to === (from + 1) % 4 ? 1 : -1;
    for (let index=0; index<kicks.length; index++) {
      run({type:'I',from,to,delta,kicks,index,label:'I SRS+ ' + transition});
    }
  }
  for (const [orientationText,kicks] of Object.entries(REFERENCE_I_180_SRS_PLUS)) {
    const from = Number(orientationText);
    run({type:'I',from,to:(from + 2) % 4,delta:2,kicks,index:0,label:'I direct 180'});
    for (let index=1; index<kicks.length; index++) {
      run({type:'I',from,to:(from + 2) % 4,delta:2,kicks,index,label:'I direct 180'});
    }
  }
  for (const [transition,kicks] of Object.entries(REFERENCE_JLSTZ_SRS)) {
    const [from,to] = transition.split('>').map(Number);
    const delta = to === (from + 1) % 4 ? 1 : -1;
    for (const type of ['J','L','S','T','Z']) {
      for (let index=0; index<kicks.length; index++) {
        run({type,from,to,delta,kicks,index,label:type + ' SRS ' + transition});
      }
    }
  }
  for (const [orientationText,kicks] of Object.entries(REFERENCE_JLSTZ_180_SRS_PLUS)) {
    const from = Number(orientationText);
    for (const type of ['J','L','S','T','Z']) {
      for (let index=0; index<kicks.length; index++) {
        run({type,from,to:(from + 2) % 4,delta:2,kicks,index,label:type + ' direct 180'});
      }
    }
  }
  return {ok:true,checked,blockerCount,coverage:'every ordered kick candidate forced through real production rotation/collision',originsSearched:'10 columns × 11 spawn heights as needed'};
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runFinesseKickExecutionReferenceTests()));
}
