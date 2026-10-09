import { chromium } from 'playwright';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import { boardFor, referenceTargets } from './finesse-oracle-reference-test.js';

const baseURL = process.env.FINESSE_BROWSER_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900}});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

function assert(condition,message) {
  if (!condition) throw new Error('finesse timing browser test: ' + message);
}
function keyFor(action) {
  return action==='left'?'ArrowLeft'
    : action==='right'?'ArrowRight'
    : action==='cw'?'x'
    : action==='ccw'?'z'
    : 'a';
}
function keyOf(target) { return target.x+','+target.o+','+target.y; }
function expectedCells(type,target) {
  return REFERENCE_PIECES[type].orientations[target.o]
    .map(([x,y])=>[target.x+x,target.y+y])
    .sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
}

const types = ['I','T'];
const board = boardFor('empty');

try {
  await page.goto(baseURL + (baseURL.includes('?')?'&':'?') + 'finesseTiming=1',{
    waitUntil:'domcontentloaded',timeout:30000
  });
  await page.waitForFunction(()=>!!window.trainer,null,{timeout:15000});

  for (const type of types) {
    const spawn = REFERENCE_PIECES[type].spawn;
    const start = {type,x:spawn.x,y:spawn.y,o:0};
    const oracle = referenceTargets({type,start,board,maxCost:2});

    await page.evaluate(({type,spawn})=>{
      const t=window.trainer;
      t.reset();
      t.rules.gravity=100;
      t.rules.lockDelay=250;
      t.rules.das=0;
      t.rules.arr=0;
      t.rules.dcd=0;
      t.emptyBoard();
      t.gameOver=false;
      t.piece={type,x:spawn.x,y:spawn.y,o:0};
      t.gravityAcc=0;
      t.lockAcc=0;
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
    },{type,spawn});

    const planned=await page.evaluate(()=>{
      const t=window.trainer;
      return {
        piece:t.piece?{type:t.piece.type,x:t.piece.x,y:t.piece.y,o:t.piece.o}:null,
        target:t.finesseTarget?{...t.finesseTarget}:null,
        actions:t.finesseActions.map(step=>({...step}))
      };
    });
    assert(planned.target,type+': no target generated under finite gravity');
    const minimum=oracle.get(keyOf(planned.target));
    assert(minimum!==undefined,type+': planner target is absent from independent oracle: '+keyOf(planned.target));
    assert(planned.actions.length===minimum,
      type+': route cost differs from oracle minimum '+minimum+': '+JSON.stringify(planned.actions));

    for (const step of planned.actions) {
      const key=keyFor(step.action);
      if (step.mode==='das') {
        await page.keyboard.down(key);
        await page.waitForTimeout(100);
        await page.keyboard.up(key);
      } else {
        await page.keyboard.press(key);
      }
      // Let the real frame loop advance gravity between deliberate inputs.
      await page.waitForTimeout(115);
    }

    const active=await page.evaluate(()=>{
      const t=window.trainer;
      return {
        piece:t.piece?{type:t.piece.type,x:t.piece.x,y:t.piece.y,o:t.piece.o}:null,
        progress:t.finesseProgress,
        count:t.finesseActions.length,
        faulted:t.finesseFaulted
      };
    });
    assert(active.piece&&active.piece.x===planned.target.x&&active.piece.o===planned.target.o,
      type+': real timed inputs missed target x/orientation: '+JSON.stringify(active));
    assert(!active.faulted&&active.progress===active.count,
      type+': gravity/input interleaving produced a finesse fault: '+JSON.stringify(active));

    await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.trainer.stats.piecesPlaced===1,null,{timeout:5000});
    const locked=await page.evaluate(()=>{
      const t=window.trainer;
      const cells=[];
      for(let y=0;y<t.H;y++)for(let x=0;x<t.W;x++)if(t.board[y][x])cells.push([x,y]);
      cells.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
      return {cells,perfect:t.stats.finessePerfect,faults:t.stats.finesseFaults,placed:t.stats.piecesPlaced};
    });
    assert(JSON.stringify(locked.cells)===JSON.stringify(expectedCells(type,planned.target)),
      type+': timed route locked unexpected cells '+JSON.stringify(locked.cells));
    assert(locked.perfect===1&&locked.faults===0&&locked.placed===1,
      type+': timing run did not score exactly once: '+JSON.stringify(locked));
    console.log(JSON.stringify({type,passed:true,gravityMs:100,route:planned.actions,target:planned.target,minimumCost:minimum,lockedCells:locked.cells.length}));
  }

  assert(pageErrors.length===0,'browser page errors: '+JSON.stringify(pageErrors));
  console.log(JSON.stringify({ok:true,pieces:types.length,finiteGravity:true,pageErrors:pageErrors.length}));
} finally {
  await browser.close();
}
