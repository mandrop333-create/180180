import { PIECE_TYPES, cellsFor, spawnFor } from './pieces.js';
import { Trainer } from './engine.js';
import { SevenBagGenerator } from './generator.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { targetOrientation } from './pieces.js';
import { listTrainingRules, TRAINING_RULE_SCHEMA } from './rules.js';
import { enumerateFinesseTargets, minimumRoutesForTargets, planFinesse } from './finesse-core.js';
import { collides, move } from './collision.js';
import { tryRotate } from './rotation.js';
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

  // JLSTZ use the conventional no-kick-first order. TETR.IO SRS+ has
  // piece-specific I-kick ordering and may apply an origin-compensating kick
  // even on an open board; its exact ordered data is checked independently.
  for(const type of ['T','J','L','S','Z'])assert(getSrsKicks(type,0,1)[0][0]===0&&getSrsKicks(type,0,1)[0][1]===0,type+' SRS basic rotation missing');

  // Exact TETR.IO SRS+ kick-order regression. Kick order changes which
  // legal destination wins when more than one offset fits.
  const expectedJLSTZ={
    '0>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '1>0':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '1>2':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '2>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '2>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '3>2':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '3>0':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '0>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]]
  };
  const expectedI={
    '0>1':[[1,0],[2,0],[-1,0],[-1,1],[2,-2]],
    '1>2':[[0,1],[-1,1],[2,1],[-1,-1],[2,2]],
    '2>3':[[-1,0],[1,0],[-2,0],[1,-1],[-2,2]],
    '3>0':[[0,-1],[1,-1],[-2,-1],[1,1],[-2,-2]],
    '0>3':[[0,1],[-1,1],[2,1],[2,2],[-1,-1]],
    '1>0':[[-1,0],[-2,0],[1,0],[-2,2],[1,-1]],
    '2>1':[[0,-1],[-2,-1],[1,-1],[-2,-2],[1,1]],
    '3>2':[[1,0],[2,0],[-1,0],[2,-2],[-1,1]]
  };
  for(const [transition,expected] of Object.entries(expectedJLSTZ)){
    assert(JSON.stringify(getSrsKicks('T',...transition.split('>').map(Number)))===JSON.stringify(expected),
      'JLSTZ SRS+ kick order mismatch for '+transition);
  }
  for(const [transition,expected] of Object.entries(expectedI)){
    assert(JSON.stringify(getSrsKicks('I',...transition.split('>').map(Number)))===JSON.stringify(expected),
      'I-piece SRS+ kick order mismatch for '+transition);
  }
  const expectedHalfJLSTZ={
    0:[[0,0],[0,-1],[1,-1],[-1,-1],[1,0],[-1,0]],
    1:[[0,0],[1,0],[1,-2],[1,-1],[0,-2],[0,-1]],
    2:[[0,0],[0,1],[-1,1],[1,1],[-1,0],[1,0]],
    3:[[0,0],[-1,0],[-1,-2],[-1,-1],[0,-2],[0,-1]]
  };
  const expectedHalfI={0:[[1,1],[1,0]],1:[[-1,1],[0,1]],2:[[-1,-1],[-1,0]],3:[[1,-1],[0,-1]]};
  for(let o=0;o<4;o++){
    assert(JSON.stringify(getTetrio180Kicks('T',o))===JSON.stringify(expectedHalfJLSTZ[o]),
      'JLSTZ 180 kick order mismatch for orientation '+o);
    assert(JSON.stringify(getTetrio180Kicks('I',o))===JSON.stringify(expectedHalfI[o]),
      'I-piece 180 kick table mismatch for orientation '+o);
  }

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

  // Visual-state contract: progress and fault metadata are separate from
  // the input path; rendering may only consume this state.
  const visualState={progress:1,total:3,faulted:false,target:{x:4,o:2}};
  assert(visualState.progress<=visualState.total,'visual Finesse progress must stay within its sequence');
  assert(visualState.target&&Number.isInteger(visualState.target.x)&&Number.isInteger(visualState.target.o),'visual Finesse target must use canonical identity');

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
  assert(routeCost([{action:'hard'}],{...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,hardDropCost:1})===1,
    'route cost must honor the active profile hard-drop cost');
  assert(finesseActionCost('left','invalid')===Infinity,'invalid finesse mode must be rejected');
  assert(finesseActionCost('left','')===Infinity,'empty explicit input modes must be rejected');
  assert(finesseActionCost('left',null)===Infinity,'null explicit input modes must be rejected');
  assert(routeCost([{action:'left'}])===1,'omitted input mode must retain the documented tap default');
  assert(routeCost([{action:'left',mode:''}])===Infinity,'an explicitly empty route mode must not be silently treated as tap');
  assert(routeCost([{action:'left',mode:null}])===Infinity,'an explicitly null route mode must not be silently treated as tap');
  assert(finesseActionCost('half','tap',{...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,halfTurnCost:0})===Infinity,
    'zero-cost direct 180 profiles must be rejected');
  assert(finesseActionCost('half','tap',{...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,halfTurnCost:-1})===Infinity,
    'negative-cost direct 180 profiles must be rejected');
  assert(finesseActionCost('hard','tap',{...FINESSE_PROFILES.SRS_NORMAL,hardDropCost:-1})===Infinity,
    'negative hard-drop profile costs must be rejected');
  assert(finesseActionCost('hard','tap',{...FINESSE_PROFILES.SRS_NORMAL,hardDropCost:0.5})===Infinity,
    'fractional hard-drop profile costs must be rejected');
  assert(finesseActionCost('cw','das')===Infinity,'DAS mode must be restricted to horizontal movement');
  assert(finesseActionCost('half','das')===Infinity,'direct 180 must remain a tap, not a DAS input');
  assert(finesseActionCost('hard','das')===0&&finesseActionCost('soft','das')===0,
    'drop and vertical events must remain finesse-neutral regardless of input-mode annotation');
  assert(finesseActionCost('left','DAS',FINESSE_PROFILES.SRS_NORMAL)===1,'input modes must normalize case before profile checks');
  assert(finesseActionCost('left','das',{...FINESSE_PROFILES.SRS_NORMAL,dasCountsAsOneInput:false})===Infinity,
    'profiles without DAS-as-one-input must reject DAS routes');
  assert(finesseActionCost('half','tap',FINESSE_PROFILES.SRS_NORMAL)===Infinity,
    'profiles without direct 180 support must reject half-turn inputs');
  assert(routeCost([{action:'half'}],FINESSE_PROFILES.SRS_NORMAL)===Infinity,
    'profile-aware route cost must reject unsupported direct 180 inputs');
  assert(routeCost([{action:'half'}],FINESSE_PROFILES.TETRIO_SRS_PLUS_180)===1,
    'TETR.IO direct 180 must cost one input');
  // Gravity contract: falling is state evolution, never a deliberate finesse input.
  assert(finesseInputCost('gravity')===0,'gravity must be finesse-neutral');
  assert(finesseInputCost('soft')===0,'soft drop must be finesse-neutral');
  assert(finesseInputCost('hard')===0,'hard drop must be finesse-neutral');
  assert(finesseInputCost('not-an-input')===Infinity,'unknown actions must not become finesse inputs');
  assert(routeCost([{action:'soft'},{action:'gravity'},{action:'left'},{action:'right'}])===2,'vertical movement must not change horizontal finesse cost');
  assert(FINESSE_PROFILES.SRS_0G_60HZ.hardDropCost===0,'0G profile hard drop must remain outside finesse cost');
  assert(FINESSE_PROFILES.SRS_20G.hardDropCost===0,'20G profile hard drop must remain outside finesse cost');
  assert(profileFor({gravity:0,rotationSystem:'srs'})===FINESSE_PROFILES.SRS_20G,'20G profile selection failed');
  assert(profileFor({gravity:0,rotationSystem:'srs',wallFinesse:true})===FINESSE_PROFILES.SRS_20G_WALL,
    '20G wall-finesse profile selection failed');  assert(profileFor({gravity:Infinity,rotationSystem:'srs'})===FINESSE_PROFILES.SRS_0G_60HZ,'0G profile selection failed');
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
  const verticalITarget=chooseTrainingTarget([{x:-2,o:1,cost:2}],{pieceType:'I',maxCost:2});
  assert(verticalITarget&&verticalITarget.x===-2&&verticalITarget.o===1,
    'generic training-target selection must preserve legal negative-origin vertical I placements');
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
  assert(placementIdentity({x:4,o:2,y:7})==='4,2,7','physical placement identity must include landing height');
  assert(placementIdentity({x:4,o:2,y:18})!==placementIdentity({x:4,o:2,y:7}),'distinct landing heights must remain distinct placements');
  assert(placementKey({x:4,o:2,y:7})!==placementKey({x:4,o:2,y:18}),'physical landing key must retain y');

  // Exact planner contract: reported cost must equal the profile-weighted
  // deliberate input cost; hard drop remains outside the route.
  assert(FINESSE_PROFILES.SRS_0G_60HZ.supportsDirectHalfTurn===false,'standard SRS must not advertise direct 180');
  assert(FINESSE_PROFILES.TETRIO_SRS_PLUS_180.supportsDirectHalfTurn===true&&FINESSE_PROFILES.TETRIO_SRS_PLUS_180.halfTurnCost===1,'TETR.IO profile must explicitly define direct 180 cost');
  const planned=planFinesse({
    piece:{x:4,y:0,o:0,type:'T'},W:10,H:20,maxCost:2,seed:0,
    move:(p,dx,dy)=>{if(dx&& (p.x+dx<0||p.x+dx>9))return false;p.x+=dx;p.y+=dy;return p.y<20;},
    tryRotate:(p,d)=>{p.o=(p.o+d+4)%4;return true;},
    cellsFor:()=>[[0,0]]
  });
  assert(planned&&planned.cost===routeCost(planned.actions,FINESSE_PROFILES.TETRIO_SRS_PLUS_180),'planner cost must equal profile-weighted deliberate route cost: planned='+JSON.stringify(planned)+' routeCost='+(planned?routeCost(planned.actions,FINESSE_PROFILES.TETRIO_SRS_PLUS_180):'no-plan'));
  assert(planned.actions.every(step=>['left','right','cw','ccw','half'].includes(step.action)),'planner must not count gravity or hard drop as finesse input');
  assert(planned.actions.every(step=>step.action!=='half'||step.mode==='tap'),'direct 180 must be represented as a deliberate tap action');
  assert(planned.target&&Number.isInteger(planned.target.x)&&Number.isInteger(planned.target.o),'planner must return canonical target identity');
  const invalidLockPlan=planFinesse({
    piece:{x:4,y:0,o:0,type:'T'},W:10,H:20,maxCost:2,
    move:(p,dx,dy)=>{p.x+=dx;p.y+=dy;return p.y<20;},
    tryRotate:(p,d)=>{p.o=(p.o+d+4)%4;return true;},
    cellsFor:()=>[]
  });
  assert(invalidLockPlan===null,'planner must fail closed when no landing can be locked');

  // Minimum-route regression: a longer route must never replace a shorter
  // route merely because its action labels sort earlier alphabetically.
  const routeRegressionBoard=Array.from({length:20},()=>Array(10).fill(0));
  const routeRegressionTargets=enumerateFinesseTargets({
    piece:{type:'O',x:4,y:0,o:0},board:routeRegressionBoard,W:10,H:20,cellsFor,
    move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
    tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf),
    maxCost:2
  });
  const malformedLimitBase={
    piece:{type:'O',x:4,y:0,o:0},board:routeRegressionBoard,W:10,H:20,cellsFor,
    move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
    tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf)
  };
  assert(enumerateFinesseTargets({...malformedLimitBase,maxCost:-1}).length===0,
    'negative finesse search limits must not produce zero-cost placements');
  assert(enumerateFinesseTargets({...malformedLimitBase,maxCost:1.5}).length===0,
    'fractional finesse search limits must be rejected rather than rounded implicitly');
  assert(enumerateFinesseTargets({...malformedLimitBase,
    profile:{...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,maxCost:1.5}}).length===0,
    'fractional profile search limits must be rejected instead of silently using a default');
  assert(planFinesse({...malformedLimitBase,maxCost:-1})===null,
    'planFinesse must fail closed for an invalid explicit search limit');
  const rightWallTarget=routeRegressionTargets.find(t=>t.target.x===8&&t.target.o===0);
  assert(rightWallTarget&&rightWallTarget.cost===1&&rightWallTarget.route.length===1&&
    rightWallTarget.route[0].action==='right'&&rightWallTarget.route[0].mode==='das',
    'a two-input left-then-right-DAS route must not overwrite the one-input right-DAS wall route');
  const allRegressionRoutes=minimumRoutesForTargets({
    piece:{type:'O',x:4,y:0,o:0},board:routeRegressionBoard,W:10,H:20,cellsFor,
    move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
    tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf),maxCost:2
  });
  assert(allRegressionRoutes.length===routeRegressionTargets.length,
    'minimumRoutesForTargets must return every reachable physical target, not just one selected plan');
  assert(allRegressionRoutes.every(target=>Array.isArray(target.routes)&&target.routes.length>=1),
    'every reachable target must expose at least one minimum-cost route');
  assert(allRegressionRoutes.every(target=>target.routes.every(route=>route.length===target.cost)),
    'every retained route must match the target minimum cost');
  assert(allRegressionRoutes.every(target=>new Set(target.routes.map(route=>route.map(step=>step.action+':'+step.mode).join('|'))).size===target.routes.length),
    'equal-cost route candidates must be distinct by action and input mode');

  // Equivalent-route regression: the same physical target can be reached by
  // moving then rotating or rotating then moving. Both routes are minimum-cost
  // and must remain available to the runtime observer.
  const equivalentStart={type:'T',x:3,y:0,o:0};
  const equivalentProfile={...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,
    supportsDirectHalfTurn:false,dasCountsAsOneInput:false};
  const equivalentOptions={
    piece:equivalentStart,board:routeRegressionBoard,W:10,H:20,cellsFor,maxCost:2,
    profile:equivalentProfile,
    move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
    tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf)
  };
  const equivalentTargets=enumerateFinesseTargets(equivalentOptions);
  const hardestEquivalentTargets=equivalentTargets.filter(target=>target.cost===equivalentTargets[0]?.cost);
  const alternativeTargetIndex=hardestEquivalentTargets.findIndex(target=>target.routes.length>1);
  assert(alternativeTargetIndex>=0,
    'planner must retain multiple equal-cost routes to at least one challenging physical target');
  const equivalentPlan=planFinesse({...equivalentOptions,seed:alternativeTargetIndex});
  assert(equivalentPlan&&equivalentPlan.routes?.length>1,
    'planner must expose all equal-cost routes for the selected physical target');
  const alternateRoute=equivalentPlan.routes.find(route=>
    route.map(step=>step.action+':'+step.mode).join('|')!==equivalentPlan.actions.map(step=>step.action+':'+step.mode).join('|'));
  assert(alternateRoute&&alternateRoute.length===equivalentPlan.cost,
    'an alternative route must remain minimum-cost');
  // O-piece regression: a square has no meaningful rotation. Even when the
  // supplied rotation transition would mutate orientation metadata, the
  // planner must never include rotation in its recommended route.
  const squarePlan=planFinesse({
    piece:{x:4,y:0,o:0,type:'O'},W:10,H:20,maxCost:2,seed:0,
    move:(p,dx,dy)=>{if(dx&&(p.x+dx<0||p.x+dx>8))return false;p.x+=dx;p.y+=dy;return p.y<20;},
    tryRotate:(p,d)=>{p.o=(p.o+d+4)%4;return true;},
    cellsFor:()=>[]
  });
  assert(squarePlan&&squarePlan.actions.every(step=>!['cw','ccw','half'].includes(step.action)),'O-piece finesse must never recommend rotation');
  assert(squarePlan.target&&squarePlan.target.o===0,'O-piece target orientation must be canonicalized');


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
  assert(routeCost(null)===Infinity,'a malformed route container must be rejected, not treated as a zero-cost route');
  assert(routeCost([{action:'left',mode:'das'}])===1,'DAS must count as one deliberate input');
  assert(placementKey({x:3,o:1,y:17})==='3,1,17','finesse placement key must include landing position');
  assert(isFinessePerfect([{action:'left'},{action:'cw'}],2),'minimum-cost route equality failed');
  assert(!isFinessePerfect([{action:'invalid'}],Infinity),
    'an invalid infinite-cost route must never be marked finesse-perfect');
  assert(!isFinessePerfect([{action:'left'}],-1)&&!isFinessePerfect([{action:'left'}],NaN),
    'finesse-perfect comparisons require a finite nonnegative target cost');
  const direct180Profile=profileFor();
  assert(direct180Profile===FINESSE_PROFILES.TETRIO_SRS_PLUS_180,'default finesse profile must match the game rotation system');
  assert(direct180Profile.supportsDirectHalfTurn===true,'direct 180 must be explicit in the game finesse profile');
  assert(direct180Profile.halfTurnCost===1,'direct 180 must cost one deliberate input');

  // Runtime integration: the displayed sequence, actual key observer, hard
  // drop, target coordinates and lock-time finesse result must agree.
  const testMode={id:'self-test',rules:{finesseProfile:{...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,
    supportsDirectHalfTurn:false,dasCountsAsOneInput:false}},hooks:{}};
  const testGenerator={next:()=> 'O'};
  const runtime=new Trainer(null,{mode:testMode,generator:testGenerator,deferInit:true,finesseEnabled:true});
  runtime.emptyBoard();
  runtime.piece={type:'O',x:4,y:0,o:0};
  runtime.generateFinessePrompt();
  assert(runtime.finesseTarget&&runtime.finesseTarget.x===2&&runtime.finesseTarget.y===18,
    'runtime prompt must retain the exact physical landing target');
  assert(runtime.finesseActions.length===2&&runtime.finesseActions.every(step=>step.action==='left'&&step.mode==='tap'),
    'runtime should expose the minimum two-tap route to the selected O placement');
  const keyEvent=code=>({code,preventDefault(){}});
  for(let i=0;i<2;i++){
    runtime.handleKeydown(keyEvent('ArrowLeft'));
    runtime.handleKeyup(keyEvent('ArrowLeft'));
  }
  assert(runtime.finesseProgress===2&&!runtime.finesseFaulted,'runtime observer must accept the displayed route');
  runtime.hardDrop();
  assert(runtime.stats.finessePerfect===1&&runtime.stats.finesseFaults===0,
    'correct route and physical landing must score exactly one clean finesse placement');

  const faultyRuntime=new Trainer(null,{mode:testMode,generator:testGenerator,deferInit:true,finesseEnabled:true});
  faultyRuntime.emptyBoard();
  faultyRuntime.piece={type:'O',x:4,y:0,o:0};
  faultyRuntime.generateFinessePrompt();
  faultyRuntime.handleKeydown(keyEvent('ArrowRight'));
  assert(faultyRuntime.finesseFaulted&&faultyRuntime.stats.finesseFaults===1,
    'wrong first input must produce exactly one finesse fault');

  // Live-transition planner contract: for every legal spawn-row x/orientation
  // across all seven pieces, every recommended action must execute through the
  // game's actual collision and kick functions and land on the advertised target.
  const emptyBoard=Array.from({length:20},()=>Array(10).fill(0));
  const alternateRuntime=new Trainer(null,{mode:testMode,generator:testGenerator,deferInit:true,finesseEnabled:true});
  alternateRuntime.emptyBoard();
  alternateRuntime.piece={...equivalentStart};
  alternateRuntime.placed=alternativeTargetIndex;
  alternateRuntime.generateFinessePrompt();
  assert(alternateRuntime.finesseTarget.x===equivalentPlan.target.x&&
    alternateRuntime.finesseTarget.o===equivalentPlan.target.o&&
    alternateRuntime.finesseTarget.y===equivalentPlan.target.y,
    'runtime must select the same physical target as the planner');
  for(const step of alternateRoute){
    const code=alternateRuntime.binds[step.action];
    alternateRuntime.handleKeydown(keyEvent(code));
    alternateRuntime.handleKeyup(keyEvent(code));
  }
  alternateRuntime.hardDrop();
  assert(alternateRuntime.stats.finessePerfect===1&&alternateRuntime.stats.finesseFaults===0,
    'runtime must accept an alternate equal-cost route and confirm its physical landing');

  // DAS runtime regression: a held horizontal input must remain pending until
  // the piece reaches the wall, then count as one deliberate finesse input.
  const dasProfile={...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,maxCost:1};
  const dasOptions={
    piece:{type:'O',x:7,y:0,o:0},board:emptyBoard,W:10,H:20,cellsFor,maxCost:1,profile:dasProfile,
    move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
    tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf)
  };
  const dasTargets=enumerateFinesseTargets(dasOptions);
  const hardestDAS=dasTargets.filter(target=>target.cost===dasTargets[0]?.cost);
  const rightWallIndex=hardestDAS.findIndex(target=>target.target.x===8&&target.route.length===1&&target.route[0].mode==='das');
  assert(rightWallIndex>=0,'DAS regression must identify the one-input right-wall target');
  const dasRuntime=new Trainer(null,{mode:{id:'self-test-das',rules:{finesseProfile:dasProfile},hooks:{}},
    generator:testGenerator,deferInit:true,finesseEnabled:true});
  dasRuntime.emptyBoard();
  dasRuntime.piece={type:'O',x:7,y:0,o:0};
  dasRuntime.placed=rightWallIndex;
  dasRuntime.rules.das=0;
  dasRuntime.rules.arr=0;
  dasRuntime.generateFinessePrompt();
  assert(dasRuntime.finesseTarget.x===8&&dasRuntime.finesseActions[0]?.mode==='das',
    'runtime must display the intended DAS wall route');
  dasRuntime.handleKeydown(keyEvent(dasRuntime.binds.right));
  assert(dasRuntime.finesseRouteCandidates.some(candidate=>
    candidate.pendingDasAction==='right'&&candidate.progress===0),
    'reaching the wall on the initial keydown must not prematurely confirm a held DAS route');
  while(dasRuntime.movePiece(1,0)){}
  dasRuntime.observeFinesseDAS('right',{confirmedHold:true});
  dasRuntime.handleKeyup(keyEvent(dasRuntime.binds.right));
  dasRuntime.hardDrop();
  assert(dasRuntime.stats.finessePerfect===1&&dasRuntime.stats.finesseFaults===0,
    'runtime must accept held-to-wall DAS as one deliberate input');


  // DAS runtime timing regression: wall contact on keydown and a single
  // animation frame must not confirm a held route before the configured DAS
  // threshold. The same held input may confirm after the threshold is crossed.
  const gatedDASRuntime=new Trainer(null,{mode:{id:'self-test-das-gated',rules:{finesseProfile:dasProfile},hooks:{}},
    generator:testGenerator,deferInit:true,finesseEnabled:true});
  gatedDASRuntime.emptyBoard();
  gatedDASRuntime.piece={type:'O',x:7,y:0,o:0};
  gatedDASRuntime.placed=rightWallIndex;
  gatedDASRuntime.rules.das=100;
  gatedDASRuntime.rules.arr=0;
  gatedDASRuntime.rules.gravity=Infinity;
  gatedDASRuntime.generateFinessePrompt();
  gatedDASRuntime.handleKeydown(keyEvent(gatedDASRuntime.binds.right));
  assert(gatedDASRuntime.finesseRouteCandidates.some(candidate=>
    candidate.pendingDasAction==='right'&&candidate.progress===0),
    'DAS interpretation must remain pending immediately after wall contact');
  gatedDASRuntime.moveState.startedAt=1000;
  gatedDASRuntime.moveState.nextRepeatAt=1100;
  gatedDASRuntime.lastTime=1000;
  // This unit test exercises the engine clock without constructing DOM nodes.
  gatedDASRuntime.flushRender=()=>{};
  gatedDASRuntime.tick(1050);
  assert(gatedDASRuntime.finesseRouteCandidates.some(candidate=>
    candidate.pendingDasAction==='right'&&candidate.progress===0),
    'DAS must not confirm before the configured hold threshold');
  gatedDASRuntime.tick(1101);
  assert(!gatedDASRuntime.finesseRouteCandidates.some(candidate=>candidate.pendingDasAction==='right')&&
    gatedDASRuntime.finesseRouteCandidates.some(candidate=>candidate.progress===candidate.route.length),
    'DAS may confirm after the configured hold threshold while the key remains held');
  gatedDASRuntime.handleKeyup(keyEvent(gatedDASRuntime.binds.right));
  gatedDASRuntime.hardDrop();
  assert(gatedDASRuntime.stats.finessePerfect===1&&gatedDASRuntime.stats.finesseFaults===0,
    'DAS hold-threshold confirmation must preserve perfect lock-time scoring');

  // Focus loss may not leave a pending DAS interpretation alive. Browsers do
  // not guarantee keyup after blur, so blur must resolve pending modes itself.
  const blurDASRuntime=new Trainer(null,{mode:{id:'self-test-das-blur',rules:{finesseProfile:dasProfile},hooks:{}},
    generator:testGenerator,deferInit:true,finesseEnabled:true});
  blurDASRuntime.emptyBoard();
  blurDASRuntime.piece={type:'O',x:7,y:0,o:0};
  blurDASRuntime.placed=rightWallIndex;
  blurDASRuntime.rules.das=100;
  blurDASRuntime.generateFinessePrompt();
  blurDASRuntime.handleKeydown(keyEvent(blurDASRuntime.binds.right));
  blurDASRuntime.handleBlur();
  assert(!blurDASRuntime.finesseRouteCandidates.some(candidate=>candidate.pendingDasAction),
    'focus loss must clear pending DAS candidates instead of falsely confirming a hold');

  let checkedPlans=0;
  for(const type of PIECE_TYPES){
    for(let o=0;o<(type==='O'?1:4);o++){
      for(let x=0;x<10;x++){
        const piece={type,x,y:0,o};
        if(collides(x,0,o,emptyBoard,10,20,cellsFor,type))continue;
        const plan=planFinesse({
          piece,board:emptyBoard,W:10,H:20,cellsFor,maxCost:2,seed:0,
          move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
          tryRotate:(p,delta,b,W,H,cf)=>tryRotate(p,delta,b,W,H,cf)
        });
        assert(plan&&plan.cost===plan.actions.length,'planner route cost mismatch for '+type+' x='+x+' o='+o);
        const simulated={...piece};
        for(const step of plan.actions){
          if(step.action==='left'||step.action==='right'){
            const dir=step.action==='left'?-1:1;
            if(step.mode==='das'){
              let moved=false;
              while(move(simulated,dir,0,emptyBoard,10,20,cellsFor))moved=true;
              assert(moved,'DAS action must move '+type+' at x='+x);
            }else assert(move(simulated,dir,0,emptyBoard,10,20,cellsFor),'tap action must move '+type+' at x='+x);
          }else{
            const delta=step.action==='cw'?1:step.action==='ccw'?-1:2;
            assert(tryRotate(simulated,delta,emptyBoard,10,20,cellsFor),'rotation action must succeed for '+type+' x='+x+' o='+o);
          }
        }
        while(move(simulated,0,1,emptyBoard,10,20,cellsFor)){}
        assert(simulated.x===plan.target.x&&(type==='O'?0:simulated.o)===plan.target.o&&simulated.y===plan.target.y,
          'executed route missed planner target for '+type+' x='+x+' o='+o);
        checkedPlans++;
      }
    }
  }
  const oneInputTargets=enumerateFinesseTargets({
    piece:{type:'T',x:3,y:0,o:0},board:emptyBoard,W:10,H:20,cellsFor,
    move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
    tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf),
    profile:{...FINESSE_PROFILES.TETRIO_SRS_PLUS_180,maxCost:1}
  });
  assert(oneInputTargets.length>0&&oneInputTargets.every(target=>target.cost<=1),
    'planner must honor the active profile maximum input cost');

    assert(checkedPlans>100,'planner regression matrix did not cover enough states');

  // Independent bounded-route oracle. Enumerate every legal action ordering
  // through two deliberate inputs and compare each target's minimum cost with
  // the planner on empty and adversarial stack geometries.
  const makeBoard=heights=>{
    const board=Array.from({length:20},()=>Array(10).fill(0));
    for(let x=0;x<10;x++)for(let n=0;n<heights[x];n++)board[19-n][x]='X';
    return board;
  };
  const auditBoards=[
    emptyBoard,
    makeBoard([2,4,1,6,3,5,0,4,2,6]),
    (()=>{const b=Array.from({length:20},()=>Array(10).fill(0));for(let y=12;y<20;y++)for(let x=0;x<10;x++)if(x!==4&&x!==5)b[y][x]='X';return b;})(),
    (()=>{const b=Array.from({length:20},()=>Array(10).fill(0));for(let y=15;y<20;y++)for(let x=0;x<10;x++)if(!(y>=17&&(x===2||x===7)))b[y][x]='X';return b;})()
  ];
  const auditActions=[
    {action:'left',mode:'tap',apply:(p,b)=>move(p,-1,0,b,10,20,cellsFor)},
    {action:'right',mode:'tap',apply:(p,b)=>move(p,1,0,b,10,20,cellsFor)},
    {action:'cw',mode:'tap',apply:(p,b)=>tryRotate(p,1,b,10,20,cellsFor)},
    {action:'ccw',mode:'tap',apply:(p,b)=>tryRotate(p,-1,b,10,20,cellsFor)},
    {action:'half',mode:'tap',apply:(p,b)=>tryRotate(p,2,b,10,20,cellsFor)},
    {action:'left',mode:'das',apply:(p,b)=>{let moved=false;while(move(p,-1,0,b,10,20,cellsFor))moved=true;return moved;}},
    {action:'right',mode:'das',apply:(p,b)=>{let moved=false;while(move(p,1,0,b,10,20,cellsFor))moved=true;return moved;}}
  ];
  let auditedStates=0,auditedTargets=0;
  for(const board of auditBoards){
    for(const profile of Object.values(FINESSE_PROFILES)){
      for(const type of PIECE_TYPES){
      for(let o=0;o<(type==='O'?1:4);o++){
        for(let x=0;x<10;x++){
          for(const y of [0,4]){
            const piece={type,x,y,o};
            if(collides(x,y,o,board,10,20,cellsFor,type))continue;
            const options={piece,board,W:10,H:20,cellsFor,maxCost:2,profile,
              move:(p,dx,dy,b,W,H,cf)=>move(p,dx,dy,b,W,H,cf),
              tryRotate:(p,d,b,W,H,cf)=>tryRotate(p,d,b,W,H,cf)};
            const plannedTargets=enumerateFinesseTargets(options);
            const oracle=new Map();
            const recordLanding=(state,cost)=>{
              const landed={...state};
              while(move(landed,0,1,board,10,20,cellsFor)){}
              // Match the lockability contract independently: reachable states
              // above the ceiling are top-outs, not legal placement targets.
              const lockCells=cellsFor(type,landed.o);
              if(!Array.isArray(lockCells)||!lockCells.length||
                !lockCells.every(([cx,cy])=>landed.y+cy>=0&&landed.y+cy<20))return;
              const orientation=type==='O'?0:landed.o;
              const key=landed.x+','+orientation+','+landed.y;
              const old=oracle.get(key);
              if(old===undefined||cost<old)oracle.set(key,cost);
            };
            const walk=(state,cost)=>{
              recordLanding(state,cost);
              if(cost===2)return;
              for(const action of auditActions){
                if(type==='O'&&['cw','ccw','half'].includes(action.action))continue;
                if(action.action==='half'&&profile.supportsDirectHalfTurn!==true)continue;
                if(action.mode==='das'&&profile.dasCountsAsOneInput!==true)continue;
                const next={...state};
                if(action.apply(next,board))walk(next,cost+1);
              }
            };
            walk({...piece},0);
            const plannedByKey=new Map(plannedTargets.map(t=>[t.target.x+','+(type==='O'?0:t.target.o)+','+t.target.y,t]));
            assert(plannedByKey.size===oracle.size,
              'planner/oracle target-set mismatch for '+type+' x='+x+' y='+y+' o='+o+
              ' plannerOnly='+[...plannedByKey.keys()].filter(key=>!oracle.has(key)).join(';')+
              ' oracleOnly='+[...oracle.keys()].filter(key=>!plannedByKey.has(key)).join(';'));
            for(const [key,minCost] of oracle){
              const target=plannedByKey.get(key);
              assert(target&&target.cost===minCost,
                'non-minimum finesse cost for '+type+' state '+x+','+y+','+o+' target '+key);
              const simulated={...piece};
              for(const step of target.route){
                if(step.action==='left'||step.action==='right'){
                  const dir=step.action==='left'?-1:1;
                  if(step.mode==='das'){
                    let moved=false;while(move(simulated,dir,0,board,10,20,cellsFor))moved=true;
                    assert(moved,'audited DAS step failed for '+type+' target '+key);
                  }else assert(move(simulated,dir,0,board,10,20,cellsFor),'audited tap step failed for '+type+' target '+key);
                }else{
                  const delta=step.action==='cw'?1:step.action==='ccw'?-1:2;
                  assert(tryRotate(simulated,delta,board,10,20,cellsFor),'audited rotation failed for '+type+' target '+key);
                }
              }
              while(move(simulated,0,1,board,10,20,cellsFor)){}
              assert(simulated.x===target.target.x&&(type==='O'?0:simulated.o)===target.target.o&&simulated.y===target.landingY,
                'audited route did not reproduce its advertised landing for '+type+' target '+key);
              auditedTargets++;
            }
            auditedStates++;
          }
        }
      }
    }
      }
  }

  return {ok:true,tests:11,plannerStates:checkedPlans,auditedStates,auditedTargets};
}

if(typeof window!=='undefined')window.runTrainerSelfTest=runTrainerSelfTest;
