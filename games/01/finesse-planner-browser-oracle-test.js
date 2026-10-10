import { chromium } from 'playwright';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import { boardFor, referenceTargets } from './finesse-oracle-reference-test.js';
import { cellsFor } from './pieces.js';
import { move } from './collision.js';
import { tryRotate } from './rotation.js';

const baseURL = process.env.FINESSE_BROWSER_BASE_URL || 'http://127.0.0.1:4173/';
const W = 10;
const H = 20;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width:1280, height:900 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error('finesse planner browser oracle: ' + message);
}
function targetKey(target) {
  return target.x + ',' + target.o + ',' + target.y;
}
function routeCost(route) {
  return route.reduce((sum,step) => {
    if (!['left','right','cw','ccw','half'].includes(step.action)) {
      throw new Error('unsupported finesse action in route: ' + JSON.stringify(step));
    }
    return sum + 1;
  },0);
}
function expectedLockedCells(type,target) {
  return REFERENCE_PIECES[type].orientations[target.o]
    .map(([x,y]) => [target.x+x,target.y+y])
    .sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
}

const types = ['I','J','L','O','S','T','Z'];
const emptyBoard = boardFor('empty');

try {
  await page.goto(baseURL + (baseURL.includes('?') ? '&' : '?') + 'finessePlannerOracle=1', {
    waitUntil:'domcontentloaded', timeout:30000
  });
  await page.waitForFunction(() => !!window.trainer, null, {timeout:15000});

  for (const type of types) {
    const spawn = REFERENCE_PIECES[type].spawn;
    const start = {type,x:spawn.x,y:spawn.y,o:0};
    const oracleTargets = referenceTargets({type,start,board:emptyBoard,maxCost:2});

    await page.evaluate(({type,spawn,W,H}) => {
      const t = window.trainer;
      t.reset();
      t.rules.gravity = Infinity;
      t.rules.lockDelay = 100000;
      t.rules.das = 80;
      t.rules.arr = 0;
      t.rules.dcd = 0;
      t.emptyBoard();
      t.gameOver = false;
      t.piece = {type,x:spawn.x,y:spawn.y,o:0};
      t.lastRotation = false;
      t.finesseEnabled = true;
      t.finessePlacementResolved = false;
      t.finesseMistakes = 0;
      t.finesseFaulted = false;
      t.finesseProgress = 0;
      t.finesseDASPending = null;
      t.stats.finessePerfect = 0;
      t.stats.finesseFaults = 0;
      t.stats.piecesPlaced = 0;
      t.stats.linesCleared = 0;
      t.generateFinessePrompt();
      t.emitState();
      t.render();
    }, {type,spawn,W,H});

    const planned = await page.evaluate(() => {
      const t = window.trainer;
      return {
        piece: t.piece ? {type:t.piece.type,x:t.piece.x,y:t.piece.y,o:t.piece.o} : null,
        target: t.finesseTarget ? {...t.finesseTarget} : null,
        actions: t.finesseActions.map(step => ({...step})),
        progress: t.finesseProgress,
        faulted: t.finesseFaulted,
        promptHidden: document.querySelector('#finessePrompt')?.hidden ?? true
      };
    });
    assert(planned.piece && planned.piece.type===type &&
      planned.piece.x===spawn.x && planned.piece.y===spawn.y && planned.piece.o===0,
      type + ': trainer did not begin from the independent spawn fixture: ' + JSON.stringify(planned));
    assert(planned.target, type + ': planner did not produce a target');
    const key = targetKey(planned.target);
    assert(oracleTargets.has(key),
      type + ': planner target is absent from independent reachable placements: ' + key);
    const minimum = oracleTargets.get(key);
    assert(routeCost(planned.actions)===minimum,
      type + ': displayed route cost ' + routeCost(planned.actions) +
      ' differs from independent minimum ' + minimum + ' for ' + key);
    assert(!planned.promptHidden, type + ': finesse prompt is not visible');

    // Predict each deliberate transition independently, then compare it to
    // the live browser runtime immediately after the real key event. This
    // catches x/y/orientation drift at the exact action that introduces it,
    // rather than only discovering the mismatch at the final landing.
    let predicted = { ...planned.piece };
    for (let stepIndex = 0; stepIndex < planned.actions.length; stepIndex++) {
      const step = planned.actions[stepIndex];
      const keyName = step.action==='left'?'ArrowLeft'
        : step.action==='right'?'ArrowRight'
        : step.action==='cw'?'x'
        : step.action==='ccw'?'z'
        : 'a';

      if (step.action==='left' || step.action==='right') {
        const direction = step.action==='left' ? -1 : 1;
        if (step.mode==='das') {
          let moved = false;
          for (let guard=0; guard<W+4; guard++) {
            const next = { ...predicted };
            if (!move(next,direction,0,emptyBoard,W,H,cellsFor)) break;
            predicted = next;
            moved = true;
          }
          assert(moved, type+': planned DAS action '+stepIndex+' could not move from predicted state');
        } else {
          const next = { ...predicted };
          assert(move(next,direction,0,emptyBoard,W,H,cellsFor),
            type+': planned tap action '+stepIndex+' is blocked in predicted state');
          predicted = next;
        }
      } else {
        const delta = step.action==='cw' ? 1 : step.action==='ccw' ? -1 : 2;
        const next = { ...predicted };
        assert(tryRotate(next,delta,emptyBoard,W,H,cellsFor),
          type+': planned rotation '+step.action+' at action '+stepIndex+' fails in predicted state '+JSON.stringify(predicted));
        predicted = next;
      }

      if (step.mode==='das') {
        await page.keyboard.down(keyName);
        await page.waitForTimeout(100);
        await page.keyboard.up(keyName);
        await page.waitForTimeout(30);
      } else {
        await page.keyboard.press(keyName);
      }

      const observed = await page.evaluate(() => {
        const p = window.trainer.piece;
        return p ? { type:p.type,x:p.x,y:p.y,o:p.o } : null;
      });
      assert(observed && observed.type===predicted.type &&
        observed.x===predicted.x && observed.y===predicted.y && observed.o===predicted.o,
        type+': action '+stepIndex+' ('+step.action+'/'+step.mode+') predicted '+
        JSON.stringify(predicted)+' but runtime observed '+JSON.stringify(observed));
    }

    const afterRoute = await page.evaluate(() => {
      const t = window.trainer;
      return {
        piece: t.piece ? {type:t.piece.type,x:t.piece.x,y:t.piece.y,o:t.piece.o} : null,
        progress:t.finesseProgress,
        actionCount:t.finesseActions.length,
        faulted:t.finesseFaulted,
        target:t.finesseTarget ? {...t.finesseTarget} : null
      };
    });
    assert(afterRoute.piece && afterRoute.piece.x===planned.target.x &&
      afterRoute.piece.o===planned.target.o,
      type + ': real key sequence did not reach target column/orientation: ' + JSON.stringify(afterRoute));
    assert(!afterRoute.faulted && afterRoute.progress===afterRoute.actionCount,
      type + ': runtime observer rejected the planner route: ' + JSON.stringify(afterRoute));

    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.trainer.stats.piecesPlaced===1, null, {timeout:5000});
    const locked = await page.evaluate(() => {
      const t = window.trainer;
      const cells = [];
      for(let y=0;y<t.H;y++)for(let x=0;x<t.W;x++)if(t.board[y][x])cells.push([x,y]);
      cells.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
      return {cells,perfect:t.stats.finessePerfect,faults:t.stats.finesseFaults,placed:t.stats.piecesPlaced};
    });
    const expected = expectedLockedCells(type,planned.target);
    assert(JSON.stringify(locked.cells)===JSON.stringify(expected),
      type + ': locked cells differ from independent target: expected ' +
      JSON.stringify(expected) + ', got ' + JSON.stringify(locked.cells));
    assert(locked.perfect===1 && locked.faults===0 && locked.placed===1,
      type + ': final score is not exactly one finesse-perfect placement: ' + JSON.stringify(locked));
    console.log(JSON.stringify({type,passed:true,target:planned.target,minimumCost:minimum,route:planned.actions,lockedCells:locked.cells.length}));
  }

  // Obstacle-board regression: the planner's selected target must remain
  // independently reachable, and every real key transition must match the
  // collision/kick model on the same occupied board. These cases specifically
  // exercise wall-adjacent kicks and non-flat landing geometry.
  const obstacleScenarios = [
    {type:'I',boardKind:'side-towers'},
    {type:'T',boardKind:'split-well'},
    {type:'J',boardKind:'overhang'},
    {type:'L',boardKind:'generated-4'}
  ];
  for (const scenario of obstacleScenarios) {
    const {type,boardKind}=scenario;
    const testBoard=boardFor(boardKind);
    const spawn=REFERENCE_PIECES[type].spawn;
    const start={type,x:spawn.x,y:spawn.y,o:0};
    const oracleTargets=referenceTargets({type,start,board:testBoard,maxCost:2});
    await page.evaluate(({type,spawn,board}) => {
      const t=window.trainer;
      t.reset();
      t.rules.gravity=Infinity;
      t.rules.lockDelay=100000;
      t.rules.das=80;
      t.rules.arr=0;
      t.rules.dcd=0;
      t.board=board.map(row=>row.slice());
      t.gameOver=false;
      t.piece={type,x:spawn.x,y:spawn.y,o:0};
      t.lastRotation=false;
      t.finesseEnabled=true;
      t.finessePlacementResolved=false;
      t.finesseMistakes=0;
      t.finesseFaulted=false;
      t.finesseProgress=0;
      t.finesseDASPending=null;
      t.stats.finessePerfect=0;
      t.stats.finesseFaults=0;
      t.stats.piecesPlaced=0;
      t.stats.linesCleared=0;
      t.generateFinessePrompt();
      t.emitState();
      t.render();
    },{type,spawn,board:testBoard});

    const planned=await page.evaluate(()=>({
      piece:window.trainer.piece?{...window.trainer.piece}:null,
      target:window.trainer.finesseTarget?{...window.trainer.finesseTarget}:null,
      actions:window.trainer.finesseActions.map(step=>({...step}))
    }));
    assert(planned.piece&&planned.target,
      type+'/'+boardKind+': planner failed to produce an obstacle-board target');
    const key=targetKey(planned.target);
    assert(oracleTargets.has(key),
      type+'/'+boardKind+': target absent from independent obstacle-board oracle: '+key);
    assert(routeCost(planned.actions)===oracleTargets.get(key),
      type+'/'+boardKind+': route cost differs from independent oracle for '+key);

    let predicted={...planned.piece};
    for(let stepIndex=0;stepIndex<planned.actions.length;stepIndex++){
      const step=planned.actions[stepIndex];
      const keyName=step.action==='left'?'ArrowLeft'
        :step.action==='right'?'ArrowRight'
        :step.action==='cw'?'x'
        :step.action==='ccw'?'z':'a';
      if(step.action==='left'||step.action==='right'){
        const direction=step.action==='left'?-1:1;
        if(step.mode==='das'){
          let moved=false;
          for(let guard=0;guard<W+4;guard++){
            const next={...predicted};
            if(!move(next,direction,0,testBoard,W,H,cellsFor))break;
            predicted=next;moved=true;
          }
          assert(moved,type+'/'+boardKind+': DAS action '+stepIndex+' made no predicted movement');
        }else{
          const next={...predicted};
          assert(move(next,direction,0,testBoard,W,H,cellsFor),
            type+'/'+boardKind+': tap blocked at action '+stepIndex);
          predicted=next;
        }
      }else{
        const delta=step.action==='cw'?1:step.action==='ccw'?-1:2;
        const next={...predicted};
        assert(tryRotate(next,delta,testBoard,W,H,cellsFor),
          type+'/'+boardKind+': '+step.action+' kick failed at action '+stepIndex+
          ' from '+JSON.stringify(predicted));
        predicted=next;
      }
      if(step.mode==='das'){
        await page.keyboard.down(keyName);
        await page.waitForTimeout(100);
        await page.keyboard.up(keyName);
        await page.waitForTimeout(30);
      }else{
        await page.keyboard.press(keyName);
      }
      const observed=await page.evaluate(()=>{
        const p=window.trainer.piece;
        return p?{type:p.type,x:p.x,y:p.y,o:p.o}:null;
      });
      assert(observed&&observed.type===predicted.type&&observed.x===predicted.x&&
        observed.y===predicted.y&&observed.o===predicted.o,
        type+'/'+boardKind+': action '+stepIndex+' ('+step.action+'/'+step.mode+
        ') predicted '+JSON.stringify(predicted)+' but observed '+JSON.stringify(observed));
    }
    assert(predicted.x===planned.target.x&&predicted.o===planned.target.o,
      type+'/'+boardKind+': executed route missed its target');

    // Lock on the real runtime and ensure pre-existing stack cells are
    // preserved alongside exactly the independently expected piece cells.
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.trainer.stats.piecesPlaced===1,null,{timeout:5000});
    const locked=await page.evaluate(()=>{
      const t=window.trainer,cells=[];
      for(let y=0;y<t.H;y++)for(let x=0;x<t.W;x++)if(t.board[y][x])cells.push([x,y]);
      cells.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
      return {cells,perfect:t.stats.finessePerfect,faults:t.stats.finesseFaults,placed:t.stats.piecesPlaced};
    });
    const expectedBoard=testBoard.map(row=>row.slice());
    for(const [x,y] of expectedLockedCells(type,planned.target)){
      assert(y>=0&&y<H&&x>=0&&x<W,
        type+'/'+boardKind+': expected lock cell lies outside visible board');
      expectedBoard[y][x]=1;
    }
    // The engine clears complete rows after lock. Model that board mutation
    // explicitly so generated stacks can legitimately exercise line clears.
    const survivingRows=expectedBoard.filter(row=>!row.every(Boolean));
    while(survivingRows.length<H)survivingRows.unshift(Array(W).fill(0));
    const expected=survivingRows.flatMap((row,y)=>row.flatMap((cell,x)=>cell?[[x,y]]:[]))
      .sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
    assert(JSON.stringify(locked.cells)===JSON.stringify(expected),
      type+'/'+boardKind+': locked board differs from initial stack plus target cells');
    assert(locked.perfect===1&&locked.faults===0&&locked.placed===1,
      type+'/'+boardKind+': obstacle placement scoring mismatch '+JSON.stringify(locked));
    console.log(JSON.stringify({type,boardKind,passed:true,target:planned.target,
      minimumCost:oracleTargets.get(key),route:planned.actions,lockedCells:locked.cells.length}));
  }

  // Regression: placement-resolution state must reset for each real spawn.
  await page.evaluate(() => {
    const t = window.trainer;
    t.reset();
    t.rules.gravity = Infinity;
    t.rules.lockDelay = 100000;
    t.emptyBoard();
    t.gameOver = false;
    t.finesseEnabled = true;
    t.piece = {type:'O',x:4,y:0,o:0};
    t.stats.finessePerfect = 0;
    t.stats.finesseFaults = 0;
    t.stats.piecesPlaced = 0;
    t.finessePlacementResolved = false;
    t.generateFinessePrompt();
    t.emitState();
  });
  async function executeCurrentPlan() {
    const current = await page.evaluate(() => ({
      piece:window.trainer.piece ? {...window.trainer.piece} : null,
      target:window.trainer.finesseTarget ? {...window.trainer.finesseTarget} : null,
      actions:window.trainer.finesseActions.map(step=>({...step}))
    }));
    assert(current.piece && current.target, 'consecutive-placement regression has no current target');
    for (const step of current.actions) {
      const keyName = step.action==='left'?'ArrowLeft'
        : step.action==='right'?'ArrowRight'
        : step.action==='cw'?'x'
        : step.action==='ccw'?'z':'a';
      if (step.mode==='das') {
        await page.keyboard.down(keyName);
        await page.waitForTimeout(100);
        await page.keyboard.up(keyName);
        await page.waitForTimeout(30);
      } else {
        await page.keyboard.press(keyName);
      }
    }
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.trainer.stats.piecesPlaced > 0 &&
      window.trainer.piece !== null, null, {timeout:5000});
    return current;
  }
  await executeCurrentPlan();
  const nextSpawn = await page.evaluate(() => ({
    placementResolved:window.trainer.finessePlacementResolved,
    target:window.trainer.finesseTarget ? {...window.trainer.finesseTarget} : null,
    actions:window.trainer.finesseActions.length,
    perfect:window.trainer.stats.finessePerfect,
    faults:window.trainer.stats.finesseFaults,
    placed:window.trainer.stats.piecesPlaced
  }));
  assert(nextSpawn.placementResolved===false && nextSpawn.target && nextSpawn.actions>=0,
    'new spawn inherited the previous piece\'s resolved-placement flag: '+JSON.stringify(nextSpawn));
  const second = await page.evaluate(() => ({
    target:window.trainer.finesseTarget ? {...window.trainer.finesseTarget} : null,
    actions:window.trainer.finesseActions.map(step=>({...step}))
  }));
  assert(second.target, 'second spawned piece has no finesse target');
  for (const step of second.actions) {
    const keyName = step.action==='left'?'ArrowLeft'
      : step.action==='right'?'ArrowRight'
      : step.action==='cw'?'x'
      : step.action==='ccw'?'z':'a';
    if (step.mode==='das') {
      await page.keyboard.down(keyName);
      await page.waitForTimeout(100);
      await page.keyboard.up(keyName);
      await page.waitForTimeout(30);
    } else {
      await page.keyboard.press(keyName);
    }
  }
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.trainer.stats.piecesPlaced===2, null, {timeout:5000});
  const consecutive = await page.evaluate(() => ({
    perfect:window.trainer.stats.finessePerfect,
    faults:window.trainer.stats.finesseFaults,
    placed:window.trainer.stats.piecesPlaced,
    placementResolved:window.trainer.finessePlacementResolved
  }));
  assert(consecutive.perfect===2 && consecutive.faults===0 && consecutive.placed===2,
    'two consecutive valid placements must score two perfects and zero faults: '+JSON.stringify(consecutive));
  console.log(JSON.stringify({consecutivePlacements:true,passed:true,...consecutive}));

  // Regression: a planner failure must not silently award a perfect placement.
  await page.evaluate(() => {
    const t = window.trainer;
    t.reset();
    t.rules.gravity = Infinity;
    t.rules.lockDelay = 100000;
    t.emptyBoard();
    t.gameOver = false;
    t.piece = {type:'?',x:4,y:0,o:0};
    t.finesseEnabled = true;
    t.finesseTarget = null;
    t.finesseActions = [];
    t.finesseRouteCandidates = [];
    t.finesseProgress = 0;
    t.finesseFaulted = false;
    t.finessePlacementResolved = false;
    t.stats.finessePerfect = 0;
    t.stats.finesseFaults = 0;
    t.stats.piecesPlaced = 0;
    t.generateFinessePrompt();
  });
  const failedPrompt = await page.evaluate(() => ({
    target:window.trainer.finesseTarget,
    actions:window.trainer.finesseActions.length
  }));
  assert(failedPrompt.target===null && failedPrompt.actions===0,
    'malformed spawn fixture should make the planner fail closed');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.trainer.stats.piecesPlaced===1, null, {timeout:5000});
  const failedLock = await page.evaluate(() => ({
    perfect:window.trainer.stats.finessePerfect,
    faults:window.trainer.stats.finesseFaults
  }));
  assert(failedLock.perfect===0 && failedLock.faults===1,
    'lock without a generated target must be a fault, never a finesse-perfect placement: '+JSON.stringify(failedLock));

  assert(pageErrors.length===0,'browser page errors: ' + JSON.stringify(pageErrors));
  console.log(JSON.stringify({ok:true,pieces:types.length,independentPlannerComparison:true,pageErrors:pageErrors.length}));
} finally {
  await browser.close();
}
