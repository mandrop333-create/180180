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
function expectedBoardAfterLock(board,type,target) {
  const expected = board.map(row=>[...row]);
  for (const [dx,dy] of REFERENCE_PIECES[type].orientations[target.o]) {
    const x=target.x+dx, y=target.y+dy;
    assert(x>=0&&x<10&&y>=0&&y<20,type+': reference target cell outside board: '+x+','+y);
    assert(!expected[y][x],type+': reference target overlaps the initial stack at '+x+','+y);
    expected[y][x]=type;
  }
  const kept=expected.filter(row=>!row.every(Boolean));
  const linesCleared=expected.length-kept.length;
  while(kept.length<20)kept.unshift(Array(10).fill(0));
  return {board:kept,linesCleared};
}

const scenarios = [
  {type:'I',boardKind:'empty'},
  {type:'T',boardKind:'empty'},
  {type:'T',boardKind:'overhang'},
  {type:'I',boardKind:'generated-0'},
  {type:'J',boardKind:'generated-3'}
];

try {
  await page.goto(baseURL + (baseURL.includes('?')?'&':'?') + 'finesseTiming=1',{
    waitUntil:'domcontentloaded',timeout:30000
  });
  await page.waitForFunction(()=>!!window.trainer,null,{timeout:15000});

  for (const scenario of scenarios) {
    const {type,boardKind}=scenario;
    const board=boardFor(boardKind);
    const spawn = REFERENCE_PIECES[type].spawn;
    const start = {type,x:spawn.x,y:spawn.y,o:0};
    const oracle = referenceTargets({type,start,board,maxCost:2});

    await page.evaluate(({type,spawn,board})=>{
      const t=window.trainer;
      t.reset();
      t.rules.gravity=100;
      t.rules.lockDelay=250;
      t.rules.das=0;
      t.rules.arr=0;
      t.rules.dcd=0;
      t.board=board.map(row=>[...row]);
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
    },{type,spawn,board});

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
      return {board:t.board.map(row=>[...row]),perfect:t.stats.finessePerfect,faults:t.stats.finesseFaults,
        placed:t.stats.piecesPlaced,linesCleared:t.stats.linesCleared};
    });
    const expected=expectedBoardAfterLock(board,type,planned.target);
    assert(JSON.stringify(locked.board)===JSON.stringify(expected.board),
      type+' on '+boardKind+': timed route produced an unexpected final board');
    assert(locked.linesCleared===expected.linesCleared,
      type+' on '+boardKind+': line-clear count differs from independent board simulation');
    assert(locked.perfect===1&&locked.faults===0&&locked.placed===1,
      type+' on '+boardKind+': timing run did not score exactly once: '+JSON.stringify(locked));
    console.log(JSON.stringify({type,boardKind,passed:true,gravityMs:100,route:planned.actions,target:planned.target,minimumCost:minimum,linesCleared:locked.linesCleared}));
  }

  assert(pageErrors.length===0,'browser page errors: '+JSON.stringify(pageErrors));
  console.log(JSON.stringify({ok:true,scenarios:scenarios.length,finiteGravity:true,stackBoards:3,pageErrors:pageErrors.length}));
} finally {
  await browser.close();
}
