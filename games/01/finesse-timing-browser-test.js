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
  // Map the rotationally invariant O piece independently before broadening
  // coverage to asymmetric pieces and generated stacks.
  {type:'O',boardKind:'empty'},
  {type:'O',boardKind:'overhang'},
  {type:'J',boardKind:'empty'},
  {type:'J',boardKind:'overhang'},
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

  // Prompt-path descent-before-rotation integration under finite gravity.
  // Use the real prompt generator, then execute its navigation route through
  // browser input while the frame loop is allowed to apply gravity.
  let gravityDescentWitness=null;
  for(const boardKind of ['side-towers','split-well','overhang','generated-4']){
    const board=boardFor(boardKind);
    for(const type of ['I','T','J','L','S','Z','O']){
      const spawn=REFERENCE_PIECES[type].spawn;
      for(let seed=0;seed<32;seed++){
        await page.evaluate(({board,type,spawn,seed})=>{
          const t=window.trainer;
          t.reset();
          t.rules.gravity=500;
          t.rules.lockDelay=100000;
          t.rules.das=80;
          t.rules.arr=0;
          t.rules.dcd=0;
          t.board=board.map(row=>row.slice());
          t.gameOver=false;
          t.piece={type,x:spawn.x,y:spawn.y,o:0};
          t.placed=seed;
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
        },{board,type,spawn,seed});
        const planned=await page.evaluate(()=>({
          piece:window.trainer.piece?{...window.trainer.piece}:null,
          target:window.trainer.finesseTarget?{...window.trainer.finesseTarget}:null,
          actions:window.trainer.finesseActions.map(step=>({...step})),
          executionRoute:(window.trainer.finesseExecutionRoute||[]).map(step=>({...step}))
        }));
        const route=planned.executionRoute;
        const rotationAt=route.findIndex(step=>['cw','ccw','half'].includes(step.action));
        if(planned.piece&&planned.target&&rotationAt>0&&
          route.slice(0,rotationAt).some(step=>step.action==='softDrop')){
          gravityDescentWitness={boardKind,type,board,spawn,seed,planned};
          break;
        }
      }
      if(gravityDescentWitness)break;
    }
    if(gravityDescentWitness)break;
  }
  assert(gravityDescentWitness,
    'finite-gravity prompt generation did not select descent-before-rotation across obstacle fixtures/seeds');
  {
    const {boardKind,type,board,seed,planned}=gravityDescentWitness;
    const route=planned.executionRoute;
    for(const step of route){
      const key=step.action==='left'?'ArrowLeft'
        :step.action==='right'?'ArrowRight'
        :step.action==='cw'?'x'
        :step.action==='ccw'?'z'
        :step.action==='softDrop'?'ArrowDown':'a';
      if(step.mode==='das'){
        await page.keyboard.down(key);
        await page.waitForTimeout(100);
        await page.keyboard.up(key);
        await page.waitForTimeout(30);
      }else{
        await page.keyboard.press(key);
      }
    }
    const active=await page.evaluate(()=>({
      piece:window.trainer.piece?{...window.trainer.piece}:null,
      target:window.trainer.finesseTarget?{...window.trainer.finesseTarget}:null,
      progress:window.trainer.finesseProgress,
      count:window.trainer.finesseActions.length,
      faulted:window.trainer.finesseFaulted,
      gravity:window.trainer.rules.gravity
    }));
    assert(active.piece&&active.target&&active.piece.x===active.target.x&&
      active.piece.o===active.target.o,
      'finite-gravity descent-before-rotation route missed target x/orientation: '+
      JSON.stringify({boardKind,type,seed,active,route}));
    assert(!active.faulted&&active.progress===active.count,
      'finite-gravity descent-before-rotation route was rejected by finesse observer: '+
      JSON.stringify({boardKind,type,seed,active,route}));
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.trainer.stats.piecesPlaced===1,null,{timeout:5000});
    const locked=await page.evaluate(()=>({
      board:window.trainer.board.map(row=>[...row]),
      perfect:window.trainer.stats.finessePerfect,
      faults:window.trainer.stats.finesseFaults,
      placed:window.trainer.stats.piecesPlaced
    }));
    const expected=expectedBoardAfterLock(board,type,active.target);
    assert(JSON.stringify(locked.board)===JSON.stringify(expected.board),
      'finite-gravity descent-before-rotation route locked an unexpected board: '+
      JSON.stringify({boardKind,type,seed,route}));
    assert(locked.perfect===1&&locked.faults===0&&locked.placed===1,
      'finite-gravity descent-before-rotation route did not score exactly once: '+
      JSON.stringify(locked));
    console.log(JSON.stringify({promptPathDescentBeforeRotationUnderGravity:true,passed:true,
      type,boardKind,seed,gravityMs:active.gravity,route,lockedCells:locked.board.flat().filter(Boolean).length}));
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
  // Once DCD expires, ARR=0 can move multiple cells in the same browser
  // scheduling interval. Do not assert an impossible intermediate frame where
  // the DCD timer is zero but no repeat has happened yet.
  // Wait for the runtime's scheduled repeat rather than assuming a fixed
  // browser sleep spans the preserved DAS remainder plus the DCD pause.
  await page.waitForFunction(()=>window.trainer.piece?.x>4,null,{timeout:1500});
  const afterDcd=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    dir:window.trainer.moveState.dir
  }));
  assert(afterDcd.x>4&&afterDcd.remaining===0&&afterDcd.dir===1,
    'held horizontal input did not resume after its remaining DAS delay: '+JSON.stringify(afterDcd));
  await page.keyboard.up('ArrowRight');
  console.log(JSON.stringify({dcdAfterRotation:true,passed:true,duringDcdX:duringDcd.x,afterDcdX:afterDcd.x}));

  // Spawn cuts charged DAS. A direction held across spawn moves the new
  // piece once immediately, then its repeat timer stays paused during DCD.
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
    t.dasCutRemaining=0;
    t.moveState={dir:0,elapsed:0,repeatElapsed:0,startedAt:0,nextRepeatAt:Infinity};
    t.emitState();
    t.render();
  });
  await page.keyboard.down('ArrowRight');
  const beforeSpawn=await page.evaluate(()=>({x:window.trainer.piece?.x,dir:window.trainer.moveState.dir}));
  assert(beforeSpawn.x===4&&beforeSpawn.dir===1,
    'pre-spawn held direction did not move the old piece once: '+JSON.stringify(beforeSpawn));
  await page.evaluate(() => window.trainer.spawn('T'));
  const afterSpawn=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    elapsed:window.trainer.moveState.elapsed,
    dir:window.trainer.moveState.dir,
    progress:window.trainer.finesseProgress,
    faulted:window.trainer.finesseFaulted
  }));
  // A requestAnimationFrame tick can consume part of DCD between spawn()
  // and this read. Assert the invariant (positive remaining cut, reset DAS
  // elapsed time, direction preserved) rather than an exact wall-clock value.
  assert(afterSpawn.x===4&&afterSpawn.remaining>0&&afterSpawn.remaining<=180&&
    afterSpawn.elapsed===0&&afterSpawn.dir===1,
    'spawn did not preserve held input while starting DCD: '+JSON.stringify(afterSpawn));
  assert(afterSpawn.progress===0&&!afterSpawn.faulted,
    'inherited held input was incorrectly counted as a new finesse action: '+JSON.stringify(afterSpawn));
  await page.waitForTimeout(100);
  const duringSpawnDcd=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    elapsed:window.trainer.moveState.elapsed
  }));
  assert(duringSpawnDcd.x===afterSpawn.x&&duringSpawnDcd.remaining>0&&duringSpawnDcd.elapsed===0,
    'spawn DCD did not pause the inherited held-key repeat timer: '+JSON.stringify(duringSpawnDcd));
  await page.waitForTimeout(120);
  const justAfterSpawnDcd=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    elapsed:window.trainer.moveState.elapsed
  }));
  assert(justAfterSpawnDcd.remaining===0&&justAfterSpawnDcd.x===afterSpawn.x,
    'inherited DAS repeated immediately when spawn DCD expired: '+JSON.stringify(justAfterSpawnDcd));
  await page.waitForTimeout(100);
  const afterSpawnDcd=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    remaining:window.trainer.dasCutRemaining,
    elapsed:window.trainer.moveState.elapsed
  }));
  assert(afterSpawnDcd.remaining===0&&afterSpawnDcd.x>afterSpawn.x,
    'inherited horizontal input did not resume after its remaining DAS delay: '+JSON.stringify(afterSpawnDcd));
  await page.keyboard.up('ArrowRight');
  console.log(JSON.stringify({dcdAfterSpawn:true,inheritedHeldInput:true,passed:true,duringDcdX:duringSpawnDcd.x,afterDcdX:afterSpawnDcd.x}));

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

  // Focus loss must clear held directions and stop repeat timers even if
  // the browser never delivers the matching keyup event.
  await page.evaluate(() => {
    const t=window.trainer;
    t.reset();
    t.rules.gravity=Infinity;
    t.rules.lockDelay=100000;
    t.rules.das=80;
    t.rules.arr=0;
    t.rules.dcd=0;
    t.gameOver=false;
    t.emptyBoard();
    t.piece={type:'T',x:3,y:0,o:0};
    t.moveState={dir:0,elapsed:0,repeatElapsed:0,startedAt:0,nextRepeatAt:Infinity};
    t.emitState();
    t.render();
  });
  await page.keyboard.down('ArrowRight');
  const beforeBlur=await page.evaluate(()=>window.trainer.piece?.x);
  await page.evaluate(()=>window.trainer.handleBlur());
  await page.waitForTimeout(160);
  const afterBlur=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    dir:window.trainer.moveState.dir,
    held:window.trainer.downKeys.size
  }));
  assert(beforeBlur===4&&afterBlur.x===4&&afterBlur.dir===0&&afterBlur.held===0,
    'focus loss left a sticky horizontal input: '+JSON.stringify({beforeBlur,afterBlur}));
  await page.keyboard.up('ArrowRight');
  console.log(JSON.stringify({focusLossClearsHeldInput:true,passed:true,x:afterBlur.x}));

  // Opposite horizontal keys use last-pressed direction; releasing that key
  // restores the still-held direction without an immediate extra movement.
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
    t.moveState={dir:0,elapsed:0,repeatElapsed:0,startedAt:0,nextRepeatAt:Infinity};
    t.emitState();
    t.render();
  });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  const bothHeld=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    dir:window.trainer.moveState.dir,
    right:window.trainer.downKeys.has(window.trainer.binds.right),
    left:window.trainer.downKeys.has(window.trainer.binds.left)
  }));
  assert(bothHeld.x===3&&bothHeld.dir===-1&&bothHeld.right&&bothHeld.left,
    'simultaneous directions did not honor last-pressed input: '+JSON.stringify(bothHeld));
  await page.keyboard.up('ArrowLeft');
  const restored=await page.evaluate(()=>({
    x:window.trainer.piece?.x,
    dir:window.trainer.moveState.dir,
    elapsed:window.trainer.moveState.elapsed,
    startedAt:window.trainer.moveState.startedAt,
    nextRepeatAt:window.trainer.moveState.nextRepeatAt,
    right:window.trainer.downKeys.has(window.trainer.binds.right),
    left:window.trainer.downKeys.has(window.trainer.binds.left)
  }));
  assert(restored.x===3&&restored.dir===1&&restored.right&&!restored.left&&
    Math.abs((restored.nextRepeatAt-restored.startedAt)-100)<1,
    'releasing the last-pressed direction did not restore the held opposite direction with a fresh DAS clock: '+JSON.stringify(restored));
  await page.waitForTimeout(130);
  const afterRestoreDAS=await page.evaluate(()=>({x:window.trainer.piece?.x,dir:window.trainer.moveState.dir}));
  assert(afterRestoreDAS.x>3&&afterRestoreDAS.dir===1,
    'restored direction did not resume after a fresh DAS delay: '+JSON.stringify(afterRestoreDAS));
  await page.keyboard.up('ArrowRight');
  console.log(JSON.stringify({oppositeDirections:true,passed:true,afterRestoreX:afterRestoreDAS.x}));

  // Soft drop is a vertical navigation input, not a finesse step. Keep this
  // invariant explicit before expanding the planner's route domain to include
  // soft-drop-dependent tucks.
  await page.evaluate(() => {
    const t=window.trainer;
    t.reset();
    t.rules.gravity=Infinity;
    t.rules.lockDelay=100000;
    t.rules.softFactors[0]=1;
    t.softScale=0;
    t.rules.das=80;
    t.rules.arr=0;
    t.rules.dcd=0;
    t.gameOver=false;
    t.emptyBoard();
    t.piece={type:'T',x:3,y:0,o:0};
    t.finesseEnabled=true;
    t.finesseFaulted=false;
    t.finesseProgress=0;
    t.generateFinessePrompt();
    t.emitState();
    t.render();
  });
  const beforeSoftDrop=await page.evaluate(()=>({
    piece:window.trainer.piece?{...window.trainer.piece}:null,
    progress:window.trainer.finesseProgress,
    faulted:window.trainer.finesseFaulted
  }));
  await page.keyboard.press('ArrowDown');
  const afterSoftDrop=await page.evaluate(()=>({
    piece:window.trainer.piece?{...window.trainer.piece}:null,
    progress:window.trainer.finesseProgress,
    faulted:window.trainer.finesseFaulted
  }));
  assert(beforeSoftDrop.piece&&afterSoftDrop.piece&&
    afterSoftDrop.piece.y===beforeSoftDrop.piece.y+1,
    'single soft-drop press did not advance the active piece exactly one row: '+JSON.stringify({beforeSoftDrop,afterSoftDrop}));
  assert(afterSoftDrop.progress===beforeSoftDrop.progress&&!afterSoftDrop.faulted,
    'soft drop was incorrectly counted or faulted as a finesse input: '+JSON.stringify({beforeSoftDrop,afterSoftDrop}));
  console.log(JSON.stringify({softDropVerticalNavigation:true,softDropExcludedFromFinesseCost:true,passed:true}));

  assert(pageErrors.length===0,'browser page errors: '+JSON.stringify(pageErrors));
  console.log(JSON.stringify({ok:true,scenarios:scenarios.length,finiteGravity:true,stackBoards:3,lockDelayReset:true,pageErrors:pageErrors.length}));
} finally {
  await browser.close();
}
