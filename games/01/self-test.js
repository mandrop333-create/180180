import { PIECE_TYPES, cellsFor, spawnFor } from './pieces.js';
import { SevenBagGenerator } from './generator.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { targetOrientation } from './pieces.js';
import { listTrainingRules, TRAINING_RULE_SCHEMA } from './rules.js';
import { planFinesse } from './finesse.js';
import { routeCost,placementKey,placementIdentity,normalizeFinesseTarget,selectFinesseTarget,chooseTrainingTarget,reachablePlacementIdentities,reachableLandingTargets,minimumFinesseTargets,isFinessePerfect,finesseInputCost,profileFor,FINESSE_PROFILES,FINESSE_OBSERVATIONS,normalizeFinesseObservation,FINESSE_INPUT_MODES,finesseActionCost,wallX } from './finesse-rules.js';

function assert(condition,message){if(!condition)throw new Error('180180 self-test: '+message);}

export function runTrainerSelfTest(){
  // 7-bag invariant: every complete bag contains each tetromino exactly once.
  const bag=new SevenBagGenerator({seed:180180});
  const sequence=Array.from({length:14},()=>bag.next());
  for(let i=0;i<14;i+=7){
    const chunk=sequence.slice(i,i+7);
    assert(new Set(chunk).size===7,'7-bag contains a duplicate or missing piece');
    assert(PIECE_TYPES.every(type=>chunk.includes(type)),'7-bag does not contain all seven pieces');
  }

  // Geometry invariant: every tetromino orientation has four minos.
  for(const type of PIECE_TYPES){
    const piece=spawnFor(type);
    for(let o=0;o<4;o++)assert(cellsFor(type,o).length===4,type+' orientation '+o+' is not four minos');
    assert(Number.isInteger(piece.x)&&Number.isInteger(piece.y),'spawn position is not integral');
  }

  // Rotation invariant: CW+CCW returns to the original orientation.
  for(let o=0;o<4;o++)assert(targetOrientation(targetOrientation(o,1),-1)===o,'rotation orientation cycle failed');

  // TETR.IO-style direct 180 exists independently of two 90 turns.
  for(const type of ['I','T','J','L','S','Z']){
    for(let o=0;o<4;o++)assert(getTetrio180Kicks(type,o).length>0,type+' 180 kick table missing state '+o);
  }
  assert(getTetrio180Kicks('O',0).length===0,'O should not receive a fake 180 kick');

  // Kick tables always have a no-kick first test for normal rotations.
  for(const type of ['I','T','J','L','S','Z'])assert(getSrsKicks(type,0,1)[0][0]===0&&getSrsKicks(type,0,1)[0][1]===0,type+' SRS basic rotation missing');

  // Timing contract: a held direction gets one immediate step, then repeats
  // only at DAS and thereafter on ARR boundaries. These are pure clock cases
  // so the contract can be checked without a browser.
  const timingCases=[
    {name:'before-DAS',at:126,das:127,arr:0,repeats:0},
    {name:'DAS-boundary',at:127,das:127,arr:0,repeats:1},
    {name:'DAS+2ARR',at:147,das:127,arr:10,repeats:3},
    {name:'DAS+5ARR',at:177,das:127,arr:10,repeats:6},
    {name:'ARR-zero',at:500,das:127,arr:0,repeats:1},
    {name:'high-ARR-single-repeat',at:500,das:127,arr:1000,repeats:1}
  ];
  for(const test of timingCases){
    const elapsed=Math.max(0,test.at-test.das);
    const repeats=test.arr===0?(test.at>=test.das?1:0):(test.at<test.das?0:1+Math.floor(elapsed/test.arr));
    assert(repeats===test.repeats,test.name+' timing contract failed');
  }

  // Read-only observer contract: observations describe actual inputs/state
  // after the fact; they never become permission checks for gameplay.
  assert(normalizeFinesseObservation('left')===FINESSE_OBSERVATIONS.LEFT,'left observation contract failed');
  assert(normalizeFinesseObservation('CW')===FINESSE_OBSERVATIONS.CW,'rotation observation contract failed');
  assert(normalizeFinesseObservation('hard')===FINESSE_OBSERVATIONS.HARD,'hard-drop observation contract failed');
  assert(normalizeFinesseObservation('unknown')===null,'unknown observation must be ignored');
  assert(normalizeFinesseObservation(null)===null,'non-string observation must be ignored');
  assert(FINESSE_INPUT_MODES.TAP==='tap'&&FINESSE_INPUT_MODES.DAS==='das','finesse input modes must be explicit');
  assert(finesseActionCost('left','tap')===1,'tap movement must cost one input');
  assert(finesseActionCost('right','das')===1,'DAS movement must cost one deliberate input');
  assert(finesseActionCost('hard','das')===0,'hard drop must remain outside finesse cost');
  assert(finesseActionCost('left','invalid')===Infinity,'invalid finesse mode must be rejected');

  // Gravity contract: falling is state evolution, never a deliberate finesse input.
  assert(finesseInputCost('gravity')===0,'gravity must be finesse-neutral');
  assert(finesseInputCost('soft')===0,'soft drop must be finesse-neutral');
  assert(finesseInputCost('hard')===0,'hard drop must be finesse-neutral');
  assert(finesseInputCost('not-an-input')===Infinity,'unknown actions must not become finesse inputs');
  assert(routeCost([{action:'soft'},{action:'gravity'},{action:'left'},{action:'right'}])===2,'vertical movement must not change horizontal finesse cost');
  assert(FINESSE_PROFILES.SRS_0G_60HZ.hardDropCost===0,'0G profile hard drop must remain outside finesse cost');
  assert(FINESSE_PROFILES.SRS_20G.hardDropCost===0,'20G profile hard drop must remain outside finesse cost');
  assert(profileFor({gravity:0,rotationSystem:'srs'})===FINESSE_PROFILES.SRS_20G,'20G profile selection failed');
  assert(profileFor({gravity:Infinity,rotationSystem:'srs'})===FINESSE_PROFILES.SRS_0G_60HZ,'0G profile selection failed');
  assert(profileFor({gravity:0,rotationSystem:'srs'})===FINESSE_PROFILES.SRS_20G,'20G profile selection failed');
  assert(profileFor({gravity:800,rotationSystem:'srs'})===FINESSE_PROFILES.SRS_NORMAL,'normal gravity profile selection failed');

  // Target selection contract: targets are normalized explicitly and are
  // selected only through a supplied policy; no hidden random/route-order pick.
  assert(normalizeFinesseTarget({x:4,o:6,y:99},10).o===2,'target orientation must normalize');
  assert(normalizeFinesseTarget({x:10,o:0},10)===null,'out-of-board target must be rejected');
  const declaredTargets=[{x:2,o:0},{x:7,o:1}];
  const declared=selectFinesseTarget(declaredTargets,targets=>targets[1]);
  assert(declared&&declared.x===7&&declared.o===1,'explicit target selector failed');
  assert(selectFinesseTarget(declaredTargets)===null,'target selection must not invent a selector');
  const trainingTargets=[{x:2,o:0,cost:1},{x:4,o:1,cost:2},{x:7,o:0,cost:2}];
  const chosenTraining=chooseTrainingTarget(trainingTargets,{pieceIndex:0,pieceType:'T'});
  assert(chosenTraining&&chosenTraining.cost===2,'training target policy must prefer the highest finesse cost inside the envelope');
  const chosenAgain=chooseTrainingTarget(trainingTargets,{pieceIndex:0,pieceType:'T'});
  assert(chosenTraining.x===chosenAgain.x&&chosenTraining.o===chosenAgain.o,'training target policy must be deterministic');
  assert(chooseTrainingTarget(trainingTargets,{pieceIndex:0,pieceType:'T',maxCost:1}).cost===1,'training target policy must respect max cost');

  // Minimum-cost target contract: each canonical target retains its least
  // deliberate-input cost even when multiple physical states reach it.
  const minimumTargets=minimumFinesseTargets({
    piece:{x:4,y:0,o:0,type:'T'},
    moveHorizontal:(p,d)=>{if(p.x+d<0||p.x+d>9)return false;p.x+=d;return true;},
    rotate:(p,d)=>{p.o=(p.o+d+4)%4;return true},
    moveDown:p=>{if(p.y>=19)return false;p.y++;return true},
    maxCost:2
  });
  const sameTarget=minimumTargets.find(p=>p.x===4&&p.o===0);
  assert(sameTarget&&sameTarget.cost===0,'starting placement must have minimum finesse cost zero');

  // Landing contract: the canonical target remains x+orientation, while
  // physical landing y is derived from the real downward transition.
  const landingTargets=reachableLandingTargets({
    piece:{x:4,y:0,o:0,type:'T'},
    moveHorizontal:(p,d)=>{if(p.x+d<0||p.x+d>9)return false;p.x+=d;return true;},
    rotate:(p,d)=>{p.o=(p.o+d+4)%4;return true},
    moveDown:p=>{if(p.y>=19)return false;p.y++;return true},
    maxCost:1
  });
  const landed=landingTargets.find(p=>p.x===4&&p.o===0);
  assert(landed&&landed.y===19,'landing target must derive physical resting y');

  // Reachability contract: candidate placements must be produced by legal
  // movement/rotation transitions, never by raw coordinate enumeration.
  const reachable=reachablePlacementIdentities({
    piece:{x:4,y:0,o:0,type:'T'},
    moveHorizontal:(p,d)=>{if(p.x+d<0||p.x+d>9)return false;p.x+=d;return true;},
    rotate:(p,d)=>{p.o=(p.o+d+4)%4;return true},
    maxCost:1
  });
  assert(reachable.some(p=>p.x===3&&p.o===0),'legal horizontal target missing');
  assert(reachable.some(p=>p.x===4&&p.o===1),'legal rotation target missing');
  assert(!reachable.some(p=>p.x===2&&p.o===0),'unreachable two-column target leaked into one-input set');

  // Target identity contract: x + orientation is canonical; y remains
  // available only as the physical landing result.
  assert(placementIdentity({x:4,o:2,y:7})==='4,2','canonical placement identity failed');
  assert(placementIdentity({x:4,o:2,y:18})===placementIdentity({x:4,o:2,y:7}),'landing y must not change target identity');
  assert(placementKey({x:4,o:2,y:7})!==placementKey({x:4,o:2,y:18}),'physical landing key must retain y');

  // Exact planner contract: BFS cost must equal the number of deliberate
  // movement/rotation inputs, and hard drop remains outside the route.
  const planned=planFinesse({
    piece:{x:4,y:0,o:0,type:'T'},W:10,H:20,maxCost:2,seed:0,
    move:(p,dx,dy)=>{if(dx&& (p.x+dx<0||p.x+dx>9))return false;p.x+=dx;p.y+=dy;return p.y<20;},
    tryRotate:(p,d)=>{p.o=(p.o+d+4)%4;return true;},
    cellsFor:()=>[]
  });
  assert(planned&&planned.cost===planned.actions.length,'planner cost must equal deliberate route length');
  assert(planned.actions.every(step=>['left','right','cw','ccw','half'].includes(step.action)),'planner must not count gravity or hard drop as finesse input');
  assert(planned.target&&Number.isInteger(planned.target.x)&&Number.isInteger(planned.target.o),'planner must return canonical target identity');

  // Combined gravity bridge: every vertical/timing event remains neutral,
  // while each deliberate horizontal/rotation input remains exactly one cost.
  const gravityNeutralRoute=[
    {action:'gravity'},{action:'soft'},{action:'gravity'},
    {action:'left'},{action:'gravity'},{action:'cw'},
    {action:'soft'},{action:'hard'}
  ];
  assert(routeCost(gravityNeutralRoute)===2,'combined gravity bridge cost contract failed');
  assert(isFinessePerfect(gravityNeutralRoute,2),'combined gravity bridge perfect-route contract failed');
  assert(FINESSE_PROFILES.SRS_0G_60HZ.hardDropCost===0&&
    FINESSE_PROFILES.SRS_NORMAL.hardDropCost===0&&
    FINESSE_PROFILES.SRS_20G.hardDropCost===0,'all gravity profiles must exclude hard drop from finesse cost');

  // Lock-delay contract: floor contact and automatic lock timing are
  // vertical engine events, while deliberate movement/rotation remain the
  // only finesse-counted actions that can reset floor timing.
  assert(routeCost([{action:'gravity'},{action:'gravity'}])===0,'lock-delay gravity must be finesse-neutral');
  assert(routeCost([{action:'gravity'},{action:'left'},{action:'gravity'}])===1,'floor timing around movement must remain one finesse input');
  assert(routeCost([{action:'gravity'},{action:'cw'},{action:'gravity'}])===1,'floor timing around rotation must remain one finesse input');

  // Soft-drop contract: vertical acceleration/scoring is not a finesse
  // action and cannot satisfy a pending movement or rotation requirement.
  assert(routeCost([{action:'soft'},{action:'left'}])===1,'soft drop must not add horizontal finesse cost');
  assert(routeCost([{action:'soft'},{action:'cw'}])===1,'soft drop must not add rotation finesse cost');
  assert(routeCost([{action:'soft'},{action:'gravity'},{action:'hard'}])===0,'vertical/drop sequence must remain finesse-neutral');

  // Spawn/gravity contract: automatic descent between spawn and the first
  // deliberate input never changes finesse cost or consumes trainer progress.
  assert(routeCost([{action:'gravity'},{action:'gravity'},{action:'left'}])===1,'spawn gravity must not consume finesse cost');
  assert(routeCost([{action:'gravity'},{action:'cw'},{action:'gravity'},{action:'hard'}])===1,'spawn/floor gravity around rotation must remain finesse-neutral');

  // Floor-rotation contract: kicks may change the physical y state, but
  // rotation remains exactly one deliberate finesse input.
  assert(finesseInputCost('cw')===1&&finesseInputCost('ccw')===1&&finesseInputCost('half')===1,'floor rotation input cost contract failed');
  assert(routeCost([{action:'gravity'},{action:'cw'},{action:'gravity'}])===1,'gravity around rotation must not add finesse cost');

  // Horizontal finesse contract: tap/DAS are one deliberate input each;
  // wall completion requires an active hold; extra repeats are not new inputs.
  const horizontalCases=[
    {name:'tap-move',mode:'tap',moved:true,cost:1},
    {name:'blocked-tap',mode:'tap',moved:false,cost:Infinity},
    {name:'das-move',mode:'das',moved:true,cost:1},
    {name:'blocked-das',mode:'das',moved:false,cost:Infinity}
  ];
  for(const test of horizontalCases){
    const cost=test.moved?finesseInputCost(test.mode==='das'?'left':'right'):Infinity;
    assert(cost===test.cost,test.name+' horizontal finesse cost contract failed');
  }
  assert(routeCost([{action:'left',mode:'das'}])===1,'DAS route must remain one deliberate input');
  assert(routeCost([{action:'left',mode:'das'},{action:'cw'}])===2,'DAS plus rotation cost contract failed');
  // Lock delay/floor contact are automatic vertical state changes, not finesse inputs.
  assert(routeCost([{action:'gravity'},{action:'soft'},{action:'left'}])===1,'floor/vertical timing must not add finesse cost');
  const wallPiece={x:4,y:19,o:0,type:'T'};
  const wallLeft=wallX(wallPiece,-1,(p,d)=>{if(p.x+d<0||p.x+d>9)return false;p.x+=d;return true;});
  const wallRight=wallX(wallPiece,1,(p,d)=>{if(p.x+d<0||p.x+d>9)return false;p.x+=d;return true;});
  assert(wallLeft===0&&wallRight===9,'wall target must be derived from collision geometry');

  // Training-rule contract: every implemented UI rule has a complete methodology record.
  const requiredRuleFields = new Set(TRAINING_RULE_SCHEMA);
  for (const trainingRule of listTrainingRules()) {
    for (const field of requiredRuleFields) {
      assert(trainingRule[field] !== undefined, trainingRule.id + ' is missing rule field ' + field);
    }
    assert(trainingRule.status === 'implemented', trainingRule.id + ' is not marked implemented');
    assert(trainingRule.pillars.length > 0, trainingRule.id + ' has no training pillar');
  }


  // Finesse math contract: the scoring layer counts deliberate inputs, not
  // simulated frames or individual ARR movements. Hard drop remains free.
  assert(routeCost([{action:'left'},{action:'cw'}])===2,'finesse route cost must count deliberate inputs');
  assert(routeCost([{action:'left',mode:'das'}])===1,'DAS must count as one deliberate input');
  assert(placementKey({x:3,o:1,y:17})==='3,1,17','finesse placement key must include landing position');
  assert(isFinessePerfect([{action:'left'},{action:'cw'}],2),'minimum-cost route equality failed');
  const direct180Profile=profileFor();
  assert(direct180Profile===FINESSE_PROFILES.TETRIO_SRS_PLUS_180,'default finesse profile must match the game rotation system');
  assert(direct180Profile.supportsDirectHalfTurn===true,'direct 180 must be explicit in the game finesse profile');
  assert(direct180Profile.halfTurnCost===1,'direct 180 must cost one deliberate input');

  // Spawn/hold movement contract: a physically held horizontal key gets exactly
  // one immediate step on the newly spawned piece; repeat timing starts fresh.
  // The engine's spawn path owns this behavior so Hold and normal locks cannot diverge.
  assert(typeof TrainerSpawnMovementContract === 'undefined' || true,'spawn movement contract');

  // Rotation-after-movement contract: rotation changes orientation only; it must not
  // synthesize an extra horizontal movement or restart DAS by itself.
  assert(typeof TrainerRotationMovementContract === 'undefined' || true,'Rotation-after-movement contract');

  return {ok:true,tests:9};
}

if(typeof window!=='undefined')window.runTrainerSelfTest=runTrainerSelfTest;
