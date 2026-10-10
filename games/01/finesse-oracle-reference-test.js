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
import { enumerateFinesseTargets, enumerateFinesseNavigationTargets } from './finesse-core.js';
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


/**
 * Expanded independent oracle for routes that use deliberate soft-drop
 * navigation before a horizontal move or rotation. Navigation steps are
 * recorded in executionRoute but excluded from finesseRoute and cost.
 *
 * This is kept separate from referenceTargets until the production planner
 * and browser observer support the same two-route contract.
 */
export export function referenceNavigationTargets({type,start,board,maxCost=2}) {
  const actions = [
    {action:'left',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceMove(n,-1,0,board)?n:null;}},
    {action:'right',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceMove(n,1,0,board)?n:null;}},
    {action:'softDrop',mode:'navigation',cost:0,apply:p=>{const n=copy(p);return referenceMove(n,0,1,board)?n:null;}}
  ];
  if(type!=='O') actions.push(
    {action:'cw',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceRotate(n,1,board)?n:null;}},
    {action:'ccw',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceRotate(n,-1,board)?n:null;}},
    {action:'half',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceRotate(n,2,board)?n:null;}}
  );
  const wallAction=(dir,action)=>({action,mode:'das',cost:1,apply:p=>{
    const n=copy(p);let moved=false;
    for(let i=0;i<W+4;i++){if(!referenceMove(n,dir,0,board))break;moved=true;}
    return moved?n:null;
  }});
  actions.push(wallAction(-1,'left'),wallAction(1,'right'));

  const queue=[{piece:copy(start),cost:0,executionRoute:[],finesseRoute:[]}];
  const bestState=new Map([[stateKey(start),0]]);
  const bestTarget=new Map();
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost||a.executionRoute.length-b.executionRoute.length);
    const current=queue.shift();
    const sk=stateKey(current.piece);
    if(current.cost!==bestState.get(sk))continue;
    const landing=referenceLanding(current.piece,board);
    const lockCells=REFERENCE_PIECES[type].orientations[landing.o];
    if(lockCells.every(([cx,cy])=>landing.y+cy>=0&&landing.y+cy<H)){
      const target={x:landing.x,o:landing.o,y:landing.y},key=targetKey(target);
      const candidate={target,cost:current.cost,executionRoute:current.executionRoute,finesseRoute:current.finesseRoute};
      const prior=bestTarget.get(key);
      if(!prior||candidate.cost<prior.cost||
        (candidate.cost===prior.cost&&candidate.executionRoute.length<prior.executionRoute.length))bestTarget.set(key,candidate);
    }
    for(const action of actions){
      const next=action.apply(current.piece);if(!next)continue;
      const cost=current.cost+action.cost;
      if(cost>maxCost)continue;
      const key=stateKey(next),prior=bestState.get(key);
      if(prior!==undefined&&prior<=cost)continue;
      bestState.set(key,cost);
      const step={action:action.action,mode:action.mode};
      queue.push({
        piece:next,cost,
        executionRoute:[...current.executionRoute,step],
        finesseRoute:action.cost===0?current.finesseRoute:[...current.finesseRoute,step]
      });
    }
  }
  return bestTarget;
}

function referenceWeightedTargets({type,start,board,maxCost,halfTurnCost=1}) {
  const actions = [
    {action:'left',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceMove(n,-1,0,board)?n:null;}},
    {action:'right',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceMove(n,1,0,board)?n:null;}}
  ];
  if(type!=='O')actions.push(
    {action:'cw',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceRotate(n,1,board)?n:null;}},
    {action:'ccw',mode:'tap',cost:1,apply:p=>{const n=copy(p);return referenceRotate(n,-1,board)?n:null;}},
    {action:'half',mode:'tap',cost:halfTurnCost,apply:p=>{const n=copy(p);return referenceRotate(n,2,board)?n:null;}}
  );
  const wallAction=(dir,action)=>({action,mode:'das',cost:1,apply:p=>{
    const n=copy(p);let moved=false;
    for(let i=0;i<W+4;i++){if(!referenceMove(n,dir,0,board))break;moved=true;}
    return moved?n:null;
  }});
  actions.push(wallAction(-1,'left'),wallAction(1,'right'));
  const queue=[{piece:copy(start),cost:0}];
  const bestState=new Map([[stateKey(start),0]]);
  const bestTarget=new Map();
  while(queue.length){
    // Deliberately use a sorted list rather than the production binary heap.
    queue.sort((a,b)=>a.cost-b.cost);
    const current=queue.shift();
    if(current.cost!==bestState.get(stateKey(current.piece)))continue;
    const landing=referenceLanding(current.piece,board);
    const lockCells=REFERENCE_PIECES[type].orientations[landing.o];
    if(lockCells.every(([cx,cy])=>landing.y+cy>=0&&landing.y+cy<H)){
      const target={x:landing.x,o:landing.o,y:landing.y};
      const key=targetKey(target);
      if(!bestTarget.has(key)||current.cost<bestTarget.get(key))bestTarget.set(key,current.cost);
    }
    if(current.cost>=maxCost)continue;
    for(const action of actions){
      const next=action.apply(current.piece);
      if(!next)continue;
      const cost=current.cost+action.cost;
      if(cost>maxCost)continue;
      const key=stateKey(next);
      const prior=bestState.get(key);
      if(prior!==undefined&&prior<=cost)continue;
      bestState.set(key,cost);
      queue.push({piece:next,cost});
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

  // Navigation-oracle contract: soft-drop steps are preserved in the
  // executable route but do not contribute to the finesse-scoring route.
  const navigationTargets=referenceNavigationTargets({
    type:'T',start:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,maxCost:2
  });
  const navigationExample=[...navigationTargets.values()].find(item=>
    item.executionRoute.some(step=>step.action==='softDrop'));
  assert(navigationExample,'navigation oracle failed to preserve any executable soft-drop route');
  assert(navigationExample.executionRoute.filter(step=>step.action!=='softDrop').length===
    navigationExample.finesseRoute.length,
    'navigation route and finesse route disagree about costed actions');
  assert(navigationExample.finesseRoute.every(step=>step.action!=='softDrop'),
    'soft-drop navigation leaked into the finesse-scoring route');
  // Every paired route must preserve the same physical landing. This catches
  // the prior failure mode where zero-cost descent was removed from the route
  // sent to the executor, leaving a scoring-correct but physically incomplete
  // sequence. Replay executionRoute with independent transitions, then verify
  // that finesseRoute is exactly the costed-action projection.
  let navigationRoutesChecked=0;
  for(const candidate of navigationTargets.values()){
    const state=copy({type:'T',...REFERENCE_PIECES.T.spawn,o:0});
    for(const step of candidate.executionRoute){
      if(step.action==='softDrop'){
        assert(referenceMove(state,0,1,empty),
          'navigation execution route contains a blocked soft-drop step');
      }else if(step.action==='left'||step.action==='right'){
        const dir=step.action==='left'?-1:1;
        if(step.mode==='das'){
          let moved=false;
          for(let guard=0;guard<W+4;guard++){
            if(!referenceMove(state,dir,0,empty))break;
            moved=true;
          }
          assert(moved,'navigation execution route contains a blocked DAS action');
        }else assert(referenceMove(state,dir,0,empty),
          'navigation execution route contains a blocked horizontal tap');
      }else{
        const delta=step.action==='cw'?1:step.action==='ccw'?-1:2;
        assert(referenceRotate(state,delta,empty),
          'navigation execution route contains an invalid rotation');
      }
    }
    const landed=referenceLanding(state,empty);
    assert(landed.x===candidate.target.x&&landed.o===candidate.target.o&&landed.y===candidate.target.y,
      'execution route does not reproduce its advertised physical landing: '+JSON.stringify(candidate));
    const projected=candidate.executionRoute.filter(step=>step.action!=='softDrop');
    assert(JSON.stringify(projected)===JSON.stringify(candidate.finesseRoute),
      'finesse route is not the exact costed-action projection of execution route');
    assert(projected.length===candidate.cost,
      'navigation route cost differs from its costed action count');
    navigationRoutesChecked++;
  }

  // Production navigation planner must match the independent reference target
  // set while exposing paired physical/scoring routes for every target.
  const productionNavigation=enumerateFinesseNavigationTargets({
    piece:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,W,H,cellsFor:productionCellsFor,move:productionMove,
    tryRotate:productionTryRotate,maxCost:2,profile:PROFILE
  });
  const expectedNavigationMap=new Map([...navigationTargets].map(([key,item])=>[key,item.cost]));
  const actualNavigationMap=new Map(productionNavigation.map(item=>[targetKey(item.target),item.cost]));
  assert(actualNavigationMap.size===expectedNavigationMap.size,
    'production navigation planner target count differs from independent oracle: expected '+expectedNavigationMap.size+', got '+actualNavigationMap.size);
  let productionNavigationRoutesChecked=0;
  for(const candidate of productionNavigation){
    const key=targetKey(candidate.target);
    assert(expectedNavigationMap.has(key),
      'production navigation planner exposed target absent from independent oracle: '+key);
    assert(candidate.cost===expectedNavigationMap.get(key),
      'production navigation minimum cost differs at '+key);
    assert(candidate.routes.length===candidate.executionRoutes.length,
      'production navigation scoring/execution route pairs are misaligned at '+key);
    assert(JSON.stringify(candidate.route)===JSON.stringify(candidate.executionRoute.filter(step=>step.action!=='softDrop')),
      'canonical scoring route is not the costed-action projection at '+key);
    assert(candidate.route.length===candidate.cost,
      'canonical finesse route cost differs from its costed action count at '+key);
    const state=copy({type:'T',...REFERENCE_PIECES.T.spawn,o:0});
    for(const step of candidate.executionRoute){
      if(step.action==='softDrop'){
        assert(referenceMove(state,0,1,empty),'production route has blocked soft-drop at '+key);
      }else if(step.action==='left'||step.action==='right'){
        const dir=step.action==='left'?-1:1;
        if(step.mode==='das'){
          let moved=false;
          for(let guard=0;guard<W+4;guard++){
            if(!referenceMove(state,dir,0,empty))break;
            moved=true;
          }
          assert(moved,'production route has blocked DAS action at '+key);
        }else assert(referenceMove(state,dir,0,empty),'production route has blocked horizontal tap at '+key);
      }else{
        const delta=step.action==='cw'?1:step.action==='ccw'?-1:2;
        assert(referenceRotate(state,delta,empty),'production route has invalid rotation at '+key);
      }
    }
    const landed=referenceLanding(state,empty);
    assert(landed.x===candidate.target.x&&landed.o===candidate.target.o&&landed.y===candidate.target.y,
      'production execution route does not reach its advertised landing at '+key);
    productionNavigationRoutesChecked++;
  }


  // Obstacle navigation regression: descent changes which rotations and
  // wall-adjacent states are reachable. Compare the new production planner to
  // the independent oracle on representative non-empty boards before wiring
  // this route model into gameplay.
  let obstacleNavigationFixtures=0;
  let obstacleNavigationTargets=0;
  let descentBeforeRotationWitnesses=0;
  for(const boardKind of ['split-well','side-towers','overhang','generated-4']){
    const board=boardFor(boardKind);
    const start={type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0};
    assert(!referenceCollides(start.x,start.y,start.o,board,'T'),
      'obstacle navigation spawn is invalid for '+boardKind);
    const expected=referenceNavigationTargets({type:'T',start,board,maxCost:3});
    const actual=enumerateFinesseNavigationTargets({
      piece:{...start},board,W,H,cellsFor:productionCellsFor,move:productionMove,
      tryRotate:productionTryRotate,maxCost:3,profile:PROFILE
    });
    const expectedMap=new Map([...expected].map(([key,item])=>[key,item.cost]));
    const actualMap=new Map(actual.map(item=>[targetKey(item.target),item.cost]));
    assert(actualMap.size===expectedMap.size,
      'obstacle navigation target count differs for '+boardKind+': expected '+expectedMap.size+', got '+actualMap.size);
    for(const [key,cost] of expectedMap){
      assert(actualMap.has(key),'obstacle navigation missing '+boardKind+' target '+key);
      assert(actualMap.get(key)===cost,
        'obstacle navigation cost differs for '+boardKind+'/'+key+': expected '+cost+', got '+actualMap.get(key));
      obstacleNavigationTargets++;
    }
    for(const candidate of actual){
      const descentIndex=candidate.executionRoute.findIndex(step=>step.action==='softDrop');
      if(descentIndex>=0&&candidate.executionRoute.slice(descentIndex+1).some(step=>['cw','ccw','half'].includes(step.action))){
        descentBeforeRotationWitnesses++;
      }
      const key=targetKey(candidate.target);
      assert(candidate.routes.length===candidate.executionRoutes.length,
        'obstacle navigation route pairs are misaligned for '+boardKind+'/'+key);
      assert(JSON.stringify(candidate.route)===JSON.stringify(candidate.executionRoute.filter(step=>step.action!=='softDrop')),
        'obstacle scoring route is not paired with execution route for '+boardKind+'/'+key);
      const state=copy(start);
      for(const step of candidate.executionRoute){
        if(step.action==='softDrop'){
          assert(referenceMove(state,0,1,board),'obstacle execution route has blocked descent for '+boardKind+'/'+key);
        }else if(step.action==='left'||step.action==='right'){
          const dir=step.action==='left'?-1:1;
          if(step.mode==='das'){
            let moved=false;
            for(let guard=0;guard<W+4;guard++){
              if(!referenceMove(state,dir,0,board))break;
              moved=true;
            }
            assert(moved,'obstacle execution route has blocked DAS for '+boardKind+'/'+key);
          }else assert(referenceMove(state,dir,0,board),
            'obstacle execution route has blocked horizontal tap for '+boardKind+'/'+key);
        }else{
          const delta=step.action==='cw'?1:step.action==='ccw'?-1:2;
          assert(referenceRotate(state,delta,board),
            'obstacle execution route has invalid rotation for '+boardKind+'/'+key);
        }
      }
      const landed=referenceLanding(state,board);
      assert(landed.x===candidate.target.x&&landed.o===candidate.target.o&&landed.y===candidate.target.y,
        'obstacle execution route does not reproduce landing for '+boardKind+'/'+key);
    }
    obstacleNavigationFixtures++;
  }
  assert(descentBeforeRotationWitnesses>0,
    'obstacle navigation fixtures never exercise a route that descends before rotating');

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
  // A malformed adapter that reports rotation success without changing
  // orientation must not create phantom rotational routes or targets.
  const noOpRotation=enumerateFinesseTargets({
    piece:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,W,H,cellsFor:productionCellsFor,move:productionMove,
    tryRotate:()=>true,maxCost:1,profile:PROFILE
  });
  assert(noOpRotation.every(item=>item.target.o===0),
    'planner accepted a successful-but-no-op rotation as a finesse transition');

  // A callback may report the correct orientation yet teleport the origin.
  // The planner must only accept displacement vectors in the engine kick table.
  const teleportRotation=enumerateFinesseTargets({
    piece:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,W,H,cellsFor:productionCellsFor,move:productionMove,
    tryRotate:(piece,delta)=>{piece.x+=7;piece.o=((piece.o+delta)%4+4)%4;return true;},
    maxCost:1,profile:PROFILE
  });
  assert(teleportRotation.every(item=>item.route.every(step=>
    step.action!=='cw'&&step.action!=='ccw'&&step.action!=='half')),
    'planner accepted a rotation callback that teleported the piece outside legal kick offsets');
  // Movement adapters must preserve piece identity too. A callback that
  // changes the type while claiming a successful horizontal move is invalid.
  const typeChangingMove=enumerateFinesseTargets({
    piece:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,W,H,cellsFor:productionCellsFor,
    move:(piece,dx,dy)=>{piece.x+=dx;piece.y+=dy;piece.type='I';return true;},
    tryRotate:productionTryRotate,maxCost:1,profile:PROFILE
  });
  assert(typeChangingMove.every(item=>item.route.every(step=>step.action!=='left'&&step.action!=='right')),
    'planner accepted a movement transition that changed piece identity');

  // Malformed initial states must fail closed. The production geometry helper
  // falls back to T for unknown piece types, so accepting an unknown type here
  // would hide a caller/data error as a plausible but incorrect target set.
  for (const malformedPiece of [
    {type:'?',x:3,y:0,o:0},
    {type:'T',x:3.5,y:0,o:0},
    {type:'T',x:3,y:0.5,o:0},
    {type:'T',x:3,y:0,o:-1},
    {type:'T',x:3,y:0,o:4}
  ]) {
    assert(enumerateFinesseTargets({
      piece:malformedPiece,board:empty,W,H,cellsFor:productionCellsFor,
      move:productionMove,tryRotate:productionTryRotate,maxCost:2,profile:PROFILE
    }).length===0,'planner accepted malformed start state '+JSON.stringify(malformedPiece));
  }

  const weightedExpected=referenceWeightedTargets({
    type:'T',start:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,maxCost:3,halfTurnCost:3
  });
  const weightedActual=enumerateFinesseTargets({
    piece:{type:'T',x:REFERENCE_PIECES.T.spawn.x,y:REFERENCE_PIECES.T.spawn.y,o:0},
    board:empty,W,H,cellsFor:productionCellsFor,move:productionMove,
    tryRotate:productionTryRotate,maxCost:3,profile:weightedProfile
  });
  const weightedActualMap=new Map(weightedActual.map(item=>[targetKey(item.target),item.cost]));
  assert(weightedActualMap.size===weightedExpected.size,
    'weighted Dijkstra target-set differs from independent sorted-list oracle');
  for(const [key,cost] of weightedExpected){
    assert(weightedActualMap.get(key)===cost,
      'weighted minimum cost differs from independent oracle at '+key+': expected '+cost+', got '+weightedActualMap.get(key));
  }

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
  return { ok:true, fixtures, comparedTargets, collisionStates, boards:boardKinds.length, generatedBoards:8, pieces:7, maxCost:2, extendedFixtures, extendedTargets, extendedMaxCost:4, navigationRoutesChecked, productionNavigationRoutesChecked, obstacleNavigationFixtures, obstacleNavigationTargets, oracle:'static geometry/kick fixtures + independent collision and transition logic' };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runIndependentFinesseOracleTests()));
}
