import { chromium } from 'playwright';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import { boardFor, referenceTargets } from './finesse-oracle-reference-test.js';

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

    for (const step of planned.actions) {
      const keyName = step.action==='left'?'ArrowLeft'
        : step.action==='right'?'ArrowRight'
        : step.action==='cw'?'x'
        : step.action==='ccw'?'z'
        : 'a';
      if (step.mode==='das') {
        await page.keyboard.down(keyName);
        await page.waitForTimeout(100);
        await page.keyboard.up(keyName);
        await page.waitForTimeout(30);
      } else {
        await page.keyboard.press(keyName);
      }
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

  assert(pageErrors.length===0,'browser page errors: ' + JSON.stringify(pageErrors));
  console.log(JSON.stringify({ok:true,pieces:types.length,independentPlannerComparison:true,pageErrors:pageErrors.length}));
} finally {
  await browser.close();
}
