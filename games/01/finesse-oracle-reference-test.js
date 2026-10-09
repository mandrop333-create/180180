// Independent shortest-path oracle for curated finesse placements.
// The expected side uses only static reference fixtures and local transition
// logic; it does not import production geometry, kicks, collision, or planner.
// Production planner functions are imported only as the system under test.
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import {
  REFERENCE_I_SRS_PLUS,
  REFERENCE_I_180_SRS_PLUS,
  REFERENCE_JLSTZ_SRS,
  REFERENCE_JLSTZ_180_SRS_PLUS
} from './finesse-kick-reference-fixtures.js';
import { enumerateFinesseTargets } from './finesse.js';
import { cellsFor as productionCellsFor } from './pieces.js';
import { collides as productionCollides, move as productionMove } from './collision.js';
import { tryRotate as productionTryRotate } from './rotation.js';
import { FINESSE_PROFILES } from './finesse-rules.js';

const W = 10;
const H = 20;
const TYPES = ['I','J','L','O','S','T','Z'];
const PROFILE = FINESSE_PROFILES.TETRIO_SRS_PLUS_180;

function assert(condition, message) {
  if (!condition) throw new Error('independent finesse oracle: ' + message);
}
function stateKey(p) { return p.x + ',' + p.y + ',' + p.o; }
function targetKey(p) { return p.x + ',' + p.o + ',' + p.y; }
function copy(p) { return { ...p }; }
function localCells(type, orientation) {
  return REFERENCE_PIECES[type].orientations[((orientation % 4) + 4) % 4];
}
function referenceCollides(px, py, orientation, board, type) {
  for (const [cx,cy] of localCells(type, orientation)) {
    const x = px + cx;
    const y = py + cy;
    if (x < 0 || x >= W || y >= H) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}
function referenceMove(piece, dx, dy, board) {
  if (referenceCollides(piece.x + dx, piece.y + dy, piece.o, board, piece.type)) return false;
  piece.x += dx;
  piece.y += dy;
  return true;
}
function referenceRotate(piece, delta, board) {
  if (piece.type === 'O') return false;
  const from = piece.o;
  const to = (from + delta + 4) % 4;
  let kicks;
  if (delta === 2 || delta === -2) {
    kicks = (piece.type === 'I' ? REFERENCE_I_180_SRS_PLUS : REFERENCE_JLSTZ_180_SRS_PLUS)[from] || [];
  } else {
    const table = piece.type === 'I' ? REFERENCE_I_SRS_PLUS : REFERENCE_JLSTZ_SRS;
    kicks = table[from + '>' + to] || [];
  }
  for (const [dx,dy] of kicks) {
    if (!referenceCollides(piece.x + dx, piece.y + dy, to, board, piece.type)) {
      piece.x += dx;
      piece.y += dy;
      piece.o = to;
      return true;
    }
  }
  return false;
}
function referenceLanding(piece, board) {
  const p = copy(piece);
  while (referenceMove(p, 0, 1, board)) {}
  return p;
}
export function boardFor(kind) {
  const board = Array.from({ length: H }, () => Array(W).fill(0));
  if (kind.startsWith('generated-')) {
    // Deterministic, reproducible stack corpus. The top five rows remain empty
    // so all spawn states are legal; column heights vary up to 15 rows to
    // exercise high stacks, side wells, and kick-sensitive landing routes.
    const seed = Number(kind.slice('generated-'.length)) + 1;
    let randomState = (seed * 2654435761) >>> 0;
    const nextRandom = () => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState;
    };
    const heights = Array.from({ length: W }, () => 2 + (nextRandom() % 14));
    heights[seed % W] = 0;
    if (seed % 3 === 0) heights[(seed + 5) % W] = 0;
    for (let x = 0; x < W; x++) {
      for (let y = H - heights[x]; y < H; y++) {
        if (y >= 0) board[y][x] = 1;
      }
    }
    // Cut one shallow horizontal notch so the generated boards are not only
    // flat column stacks and can expose tucked/overhang landing differences.
    const notchY = H - 4 - (seed % 3);
    const notchX = (seed * 3) % W;
    board[notchY][notchX] = 0;
    if (notchX + 1 < W && seed % 2 === 0) board[notchY][notchX + 1] = 0;
  } else if (kind === 'split-well') {
    for (let x = 0; x < W; x++) if (x !== 4 && x !== 5) board[H - 1][x] = 1;
    for (let x = 0; x < W; x++) if (![3,4,5,6].includes(x)) board[H - 2][x] = 1;
  } else if (kind === 'side-towers') {
    for (let y = H - 4; y < H; y++) board[y][0] = 1;
    for (let y = H - 2; y < H; y++) board[y][1] = 1;
    for (let y = H - 3; y < H; y++) board[y][8] = 1;
    for (let y = H - 5; y < H; y++) board[y][9] = 1;
  } else if (kind === 'overhang') {
    // A roof with a narrow opening, side walls, and a split floor.
    for (let x = 2; x <= 7; x++) if (x !== 4 && x !== 5) board[H - 6][x] = 1;
    for (let y = H - 5; y < H - 1; y++) {
      board[y][2] = 1;
      board[y][7] = 1;
    }
    for (let x = 0; x < W; x++) if (x !== 4 && x !== 5) board[H - 1][x] = 1;
  }
  return board;
}
export function referenceTargets({ type, start, board, maxCost = 2 }) {
  const actions = [
    { action:'left', mode:'tap', apply:p=>{ const n=copy(p); return referenceMove(n,-1,0,board)?n:null; } },
    { action:'right', mode:'tap', apply:p=>{ const n=copy(p); return referenceMove(n,1,0,board)?n:null; } }
  ];
  if (type !== 'O') actions.push(
    { action:'cw', mode:'tap', apply:p=>{ const n=copy(p); return referenceRotate(n,1,board)?n:null; } },
    { action:'ccw', mode:'tap', apply:p=>{ const n=copy(p); return referenceRotate(n,-1,board)?n:null; } },
    { action:'half', mode:'tap', apply:p=>{ const n=copy(p); return referenceRotate(n,2,board)?n:null; } }
  );
  const wallAction = (dir, action) => ({
    action, mode:'das', apply:p=>{
      const n=copy(p);
      let moved=false;
      while(referenceMove(n,dir,0,board)) moved=true;
      return moved?n:null;
    }
  });
  actions.push(wallAction(-1,'left'), wallAction(1,'right'));

  const queue = [{ piece:copy(start), cost:0 }];
  const bestState = new Map([[stateKey(start),0]]);
  const bestTarget = new Map();
  for (let head=0; head<queue.length; head++) {
    const current = queue[head];
    const landing = referenceLanding(current.piece,board);
    // Independent lockability check: TETR.IO top-outs instead of locking when
    // any mino remains above the visible field.
    const lockCells = REFERENCE_PIECES[type].orientations[landing.o];
    const lockable = lockCells.every(([cx,cy]) => landing.y + cy >= 0 && landing.y + cy < H);
    if (lockable) {
      const target = { x:landing.x, o:landing.o, y:landing.y };
      const key = targetKey(target);
      if (!bestTarget.has(key) || current.cost < bestTarget.get(key)) bestTarget.set(key,current.cost);
    }
    if (current.cost >= maxCost) continue;
    for (const action of actions) {
      const next = action.apply(current.piece);
      if (!next) continue;
      const cost = current.cost + 1;
      if (cost > maxCost) continue;
      const keyState = stateKey(next);
      if (bestState.has(keyState) && bestState.get(keyState) <= cost) continue;
      bestState.set(keyState,cost);
      queue.push({ piece:next, cost });
    }
  }
  return bestTarget;
}

export function runIndependentFinesseOracleTests() {
  let fixtures = 0;
  let comparedTargets = 0;
  let collisionStates = 0;
  const empty = boardFor('empty');
  for (const type of TYPES) for (let o=0; o<4; o++) {
    for (const x of [-4,-3,-2,-1,0,7,8,9,10,11]) for (const y of [-2,-1,0,18,19,20,21]) {
      const expected = referenceCollides(x,y,o,empty,type);
      const actual = productionCollides(x,y,o,empty,W,H,productionCellsFor,type);
      assert(actual === expected, 'collision mismatch for ' + type + ' at (' + x + ',' + y + ') orientation ' + o);
      collisionStates++;
    }
  }
  // Regression: a rotation can kick a T piece above the ceiling and leave it
  // resting there against a stack. That state is reachable but cannot lock,
  // so it must not be exposed as a finesse target.
  const ceilingBoard = boardFor('empty');
  ceilingBoard[2][3] = 1;
  ceilingBoard[2][4] = 1;
  const ceilingStart = { type:'T', x:3, y:0, o:0 };
  assert(!referenceCollides(ceilingStart.x,ceilingStart.y,ceilingStart.o,ceilingBoard,'T'),
    'ceiling regression spawn must be legal');
  const ceilingTargets = referenceTargets({type:'T',start:ceilingStart,board:ceilingBoard,maxCost:2});
  assert(!ceilingTargets.has('2,1,-1'),
    'independent oracle included a top-out landing as a legal target');
  const ceilingProduction = enumerateFinesseTargets({
    piece:{...ceilingStart},board:ceilingBoard,W,H,cellsFor:productionCellsFor,
    move:productionMove,tryRotate:productionTryRotate,maxCost:2,profile:PROFILE
  });
  assert(!ceilingProduction.some(item=>targetKey(item.target)==='2,1,-1'),
    'production planner included a top-out landing as a legal target');

  const boardKinds = ['empty','split-well','side-towers','overhang', ...Array.from({length:8}, (_,i) => 'generated-' + i)];
  for (const boardKind of boardKinds) {
    const board = boardFor(boardKind);
    for (const type of TYPES) {
      const start = { type, x:REFERENCE_PIECES[type].spawn.x, y:REFERENCE_PIECES[type].spawn.y, o:0 };
      assert(!referenceCollides(start.x,start.y,start.o,board,type),
        'invalid reference spawn state for ' + boardKind + '/' + type);
      const expected = referenceTargets({ type, start, board, maxCost:2 });
      const actual = enumerateFinesseTargets({
        piece:{...start}, board, W, H, cellsFor:productionCellsFor,
        move:productionMove, tryRotate:productionTryRotate,
        maxCost:2, profile:PROFILE
      });
      const actualMap = new Map(actual.map(item => [targetKey(item.target), item.cost]));
      assert(actualMap.size === expected.size,
        boardKind + '/' + type + ' target count differs: expected ' + expected.size + ', got ' + actualMap.size);
      for (const [key,cost] of expected) {
        assert(actualMap.has(key), boardKind + '/' + type + ' missing target ' + key);
        assert(actualMap.get(key) === cost,
          boardKind + '/' + type + ' minimum cost differs at ' + key + ': expected ' + cost + ', got ' + actualMap.get(key));
        comparedTargets++;
      }
      fixtures++;
    }
  }
  // Weighted-cost regression: the search must not assume every action has
  // unit cost. A direct half-turn costing 3 must lose to two quarter-turns
  // costing 1 each for the same physical landing.
  const weightedProfile = Object.freeze({...PROFILE,halfTurnCost:3});
  const weightedPiece = {type:'T',x:3,y:0,o:0};
  const weightedCells = () => [[0,0]];
  const weightedMove = (p,dx,dy) => {
    if(p.x+dx<0||p.x+dx>=W||p.y+dy<0||p.y+dy>=H)return false;
    p.x+=dx;p.y+=dy;return true;
  };
  const weightedRotate = (p,delta) => {p.o=((p.o+delta)%4+4)%4;return true;};
  const weighted = enumerateFinesseTargets({
    piece:weightedPiece,board:empty,W,H,cellsFor:weightedCells,
    move:weightedMove,tryRotate:weightedRotate,maxCost:3,profile:weightedProfile
  });
  const weightedHalfTarget = weighted.find(item=>item.target.x===3&&item.target.o===2&&item.target.y===19);
  assert(weightedHalfTarget&&weightedHalfTarget.cost===2,
    'cost-ordered search failed: two quarter-turns should beat a cost-3 direct half-turn');
  assert(weightedHalfTarget.routes.some(route=>route.length===2&&route.every(step=>step.action==='cw'||step.action==='ccw')),
    'weighted shortest route did not preserve the two-quarter-turn solution');

  // Extend beyond the trainer's default two-input envelope to validate the
  // shortest-path formula itself, including route and target determinism.
  let extendedFixtures = 0;
  let extendedTargets = 0;
  const extendedBoards = ['empty','split-well','overhang','generated-2'];
  const routeKey = route => route.map(step => step.action + ':' + (step.mode || 'tap')).join('|');
  for (const boardKind of extendedBoards) {
    const board = boardFor(boardKind);
    for (const type of TYPES) {
      const start = { type, x:REFERENCE_PIECES[type].spawn.x, y:REFERENCE_PIECES[type].spawn.y, o:0 };
      const expected = referenceTargets({ type, start, board, maxCost:4 });
      const args = {
        piece:{...start}, board, W, H, cellsFor:productionCellsFor,
        move:productionMove, tryRotate:productionTryRotate,
        maxCost:4, profile:PROFILE
      };
      const actual = enumerateFinesseTargets(args);
      const repeated = enumerateFinesseTargets({...args, piece:{...start}});
      const actualMap = new Map(actual.map(item => [targetKey(item.target), item]));
      const repeatedMap = new Map(repeated.map(item => [targetKey(item.target), item]));
      assert(actualMap.size === expected.size,
        'cost-4 ' + boardKind + '/' + type + ' target count differs: expected ' + expected.size + ', got ' + actualMap.size);
      assert(repeatedMap.size === actualMap.size,
        'cost-4 deterministic repeat changed target count for ' + boardKind + '/' + type);
      for (const [key,cost] of expected) {
        const got = actualMap.get(key);
        const again = repeatedMap.get(key);
        assert(got, 'cost-4 ' + boardKind + '/' + type + ' missing target ' + key);
        assert(got.cost === cost,
          'cost-4 ' + boardKind + '/' + type + ' minimum cost differs at ' + key + ': expected ' + cost + ', got ' + got.cost);
        assert(again && again.cost === got.cost && routeKey(again.route) === routeKey(got.route),
          'cost-4 deterministic canonical route changed for ' + boardKind + '/' + type + '/' + key);
        extendedTargets++;
      }
      extendedFixtures++;
    }
  }
  return { ok:true, fixtures, comparedTargets, collisionStates, boards:boardKinds.length, generatedBoards:8, pieces:7, maxCost:2, extendedFixtures, extendedTargets, extendedMaxCost:4, oracle:'static geometry/kick fixtures + independent collision and transition logic' };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runIndependentFinesseOracleTests()));
}
