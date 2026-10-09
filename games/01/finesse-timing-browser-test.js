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
      t.rules.das=80;
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

  // Explicit direct-180 acceptance case under active gravity on a high stack.
  // Lower the target cost only for this isolated scenario so the planner must
  // select a one-input route, then choose a deterministic seed whose route is
  // the half-turn rather than a horizontal tap.
  const halfType='I';
  const halfBoard=boardFor('generated-0');
  const halfSpawn=REFERENCE_PIECES[halfType].spawn;
  const halfStart={type:halfType,x:halfSpawn.x,y:halfSpawn.y,o:0};
  const halfOracle=referenceTargets({type:halfType,start:halfStart,board:halfBoard,maxCost:1});
  const halfSetup=await page.evaluate(({type,spawn,board})=>{
    const t=window.trainer;
    t.reset();
    t.rules.gravity=100;
    t.rules.lockDelay=250;
    t.rules.das=80;
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
    t.mode.rules.finesseProfile={...t.mode.rules.finesseProfile,maxCost:1};
    let seed=0;
    for(;seed<64;seed++){
      t.placed=seed;
      t.generateFinessePrompt();
      if(t.finesseActions.length===1&&t.finesseActions[0].action==='half')break;
    }
    t.emitState();
    t.render();
    return {seed,target:t.finesseTarget?{...t.finesseTarget}:null,actions:t.finesseActions.map(step=>({...step}))};
  },{type:halfType,spawn:halfSpawn,board:halfBoard});
  assert(halfSetup.seed<64&&halfSetup.target&&halfSetup.actions.length===1&&halfSetup.actions[0].action==='half',
    'could not select an independent one-input direct-180 route: '+JSON.stringify(halfSetup));
  assert(halfOracle.get(keyOf(halfSetup.target))===1,
    'direct-180 target is not a one-input placement in the independent oracle: '+JSON.stringify(halfSetup));
  await page.keyboard.press('a');
  await page.waitForTimeout(115);
  const halfActive=await page.evaluate(()=>{
    const t=window.trainer;
    return {piece:t.piece?{...t.piece}:null,progress:t.finesseProgress,count:t.finesseActions.length,faulted:t.finesseFaulted};
  });
  assert(halfActive.piece&&halfActive.piece.x===halfSetup.target.x&&halfActive.piece.o===halfSetup.target.o,
    'direct-180 input under gravity missed target: '+JSON.stringify(halfActive));
  assert(!halfActive.faulted&&halfActive.progress===halfActive.count,
    'direct-180 input under gravity was rejected: '+JSON.stringify(halfActive));
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.trainer.stats.piecesPlaced===1,null,{timeout:5000});
  const halfLocked=await page.evaluate(()=>{
    const t=window.trainer;
    return {board:t.board.map(row=>[...row]),perfect:t.stats.finessePerfect,faults:t.stats.finesseFaults,
      placed:t.stats.piecesPlaced,linesCleared:t.stats.linesCleared};
  });
  const halfExpected=expectedBoardAfterLock(halfBoard,halfType,halfSetup.target);
  assert(JSON.stringify(halfLocked.board)===JSON.stringify(halfExpected.board),
    'direct-180 timed route produced an unexpected final board');
  assert(halfLocked.linesCleared===halfExpected.linesCleared&&halfLocked.perfect===1&&
    halfLocked.faults===0&&halfLocked.placed===1,
    'direct-180 timed route did not score exactly once: '+JSON.stringify(halfLocked));
  console.log(JSON.stringify({direct180UnderGravity:true,passed:true,seed:halfSetup.seed,
    route:halfSetup.actions,target:halfSetup.target,linesCleared:halfLocked.linesCleared}));

  // Lock-delay reset acceptance case: start a grounded O piece at 80% of
  // lock delay, then require the planner's DAS-plus-tap route to keep it alive.
  const lockType='O';
  const lockSpawn={x:4,y:18};
  const lockStart={type:lockType,x:lockSpawn.x,y:lockSpawn.y,o:0};
  const lockBoard=boardFor('empty');
  const lockOracle=referenceTargets({type:lockType,start:lockStart,board:lockBoard,maxCost:2});
  await page.evaluate(({type,spawn,board})=>{
    const t=window.trainer;
    t.reset();
    t.rules.gravity=Infinity;
    t.rules.lockDelay=1000;
    t.rules.das=80;
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
    t.mode.rules.finesseProfile={...t.mode.rules.finesseProfile,maxCost:2};
    t.generateFinessePrompt();
    t.lockAcc=800;
    t.emitState();
    t.render();
  },{type:lockType,spawn:lockSpawn,board:lockBoard});
  const lockPlan=await page.evaluate(()=>{
    const t=window.trainer;
    return {target:t.finesseTarget?{...t.finesseTarget}:null,actions:t.finesseActions.map(step=>({...step}))};
  });
  assert(lockPlan.target&&lockOracle.get(keyOf(lockPlan.target))===lockPlan.actions.length,
    'grounded route does not match the independent minimum: '+JSON.stringify(lockPlan));
  assert(lockPlan.actions[0]?.action==='left'&&lockPlan.actions[0]?.mode==='das',
    'grounded lock-delay case did not select the intended DAS route: '+JSON.stringify(lockPlan.actions));
  for(let index=0;index<lockPlan.actions.length;index++){
    const step=lockPlan.actions[index];
    const key=keyFor(step.action);
    if(step.mode==='das'){
      await page.keyboard.down(key);
      await page.waitForTimeout(100);
      await page.keyboard.up(key);
    }else{
      await page.keyboard.press(key);
    }
    if(index===0)await page.waitForTimeout(250);
  }
  const afterLockReset=await page.evaluate(()=>{
    const t=window.trainer;
    return {piece:t.piece?{...t.piece}:null,lockAcc:t.lockAcc,lockDelay:t.rules.lockDelay,
      placed:t.stats.piecesPlaced,progress:t.finesseProgress,count:t.finesseActions.length,faulted:t.finesseFaulted};
  });
  assert(afterLockReset.piece&&afterLockReset.placed===0&&afterLockReset.lockAcc<afterLockReset.lockDelay,
    'movement failed to reset near-expired lock delay: '+JSON.stringify(afterLockReset));
  assert(!afterLockReset.faulted&&afterLockReset.progress===afterLockReset.count,
    'grounded route was not accepted by the finesse observer: '+JSON.stringify(afterLockReset));
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.trainer.stats.piecesPlaced===1,null,{timeout:5000});
  const lockResult=await page.evaluate(()=>{
    const t=window.trainer;
    return {board:t.board.map(row=>[...row]),perfect:t.stats.finessePerfect,faults:t.stats.finesseFaults,placed:t.stats.piecesPlaced};
  });
  const lockExpected=expectedBoardAfterLock(lockBoard,lockType,lockPlan.target);
  assert(JSON.stringify(lockResult.board)===JSON.stringify(lockExpected.board),
    'grounded lock-delay case locked an unexpected board');
  assert(lockResult.perfect===1&&lockResult.faults===0&&lockResult.placed===1,
    'grounded lock-delay case did not score exactly once: '+JSON.stringify(lockResult));
  console.log(JSON.stringify({lockDelayReset:true,passed:true,initialLockAcc:800,lockDelay:1000,route:lockPlan.actions}));

  // DAS cut delay acceptance: a held horizontal key may not auto-repeat
  // during the DCD window after a rotation, but resumes afterward.
  await page.evaluate(() => {
    const t=window.trainer;
    t.reset();
    t.rules.gravity=Infinity;
    t.rules.lockDelay=100000;
    t.rules.das=80;
    t.rules.arr=0;
    t.rules.dcd=180;
    t.gameOver=false;
    t.emptyBoard();
    t.piece={type:'T',x:3,y:0,o:0};
    t.dasCutRemaining=0; // isolate post-rotation DCD, not the spawn DCD window
    t.moveState={dir:0,elapsed:0,repeatElapsed:0};
    t.emitState();
    t.render();
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(30);
  await page.keyboard.press('x');
  const afterDcdRotation=await page.evaluate(()=>({
    piece:window.trainer.piece?{...window.trainer.piece}:null,
    remaining:window.trainer.dasCutRemaining,
    dir:window.trainer.moveState.dir
  }));
  assert(afterDcdRotation.piece&&afterDcdRotation.piece.x===4&&afterDcdRotation.piece.o===1,
    'DCD fixture did not begin from expected right-move + T rotation state: '+JSON.stringify(afterDcdRotation));
  await page.waitForTimeout(100);
  const duringDcd=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    dir:window.trainer.moveState.dir
  }));
  assert(duringDcd.x===4&&duringDcd.remaining>0&&duringDcd.dir===1,
    'held horizontal input repeated during DCD: '+JSON.stringify(duringDcd));
  await page.waitForTimeout(150);
  const afterDcd=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    dir:window.trainer.moveState.dir
  }));
  assert(afterDcd.x>4&&afterDcd.remaining===0&&afterDcd.dir===1,
    'held horizontal input did not resume after DCD expired: '+JSON.stringify(afterDcd));
  await page.keyboard.up('ArrowRight');
  console.log(JSON.stringify({dcdAfterRotation:true,passed:true,duringDcdX:duringDcd.x,afterDcdX:afterDcd.x}));

  // A short key hold is a tap, not a DAS wall-slide.
  await page.evaluate(() => {
    const t=window.trainer;
    t.reset();
    t.rules.gravity=Infinity;
    t.rules.lockDelay=100000;
    t.rules.das=100;
    t.rules.arr=0;
    t.rules.dcd=0;
    t.gameOver=false;
    t.emptyBoard();
    t.piece={type:'T',x:3,y:0,o:0};
    t.dasCutRemaining=0;
    t.moveState={dir:0,elapsed:0,repeatElapsed:0};
    t.emitState();
    t.render();
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(25);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(140);
  const tapOnly=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    dir:window.trainer.moveState.dir,
    down:window.trainer.downKeys.has(window.trainer.binds.right)
  }));
  assert(tapOnly.x===4&&tapOnly.dir===0&&!tapOnly.down,
    'short horizontal hold repeated after keyup: '+JSON.stringify(tapOnly));
  console.log(JSON.stringify({tapDoesNotRepeat:true,passed:true,x:tapOnly.x}));

  assert(pageErrors.length===0,'browser page errors: '+JSON.stringify(pageErrors));
  console.log(JSON.stringify({ok:true,scenarios:scenarios.length,finiteGravity:true,stackBoards:3,lockDelayReset:true,pageErrors:pageErrors.length}));
} finally {
  await browser.close();
}
