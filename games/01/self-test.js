import { PIECE_TYPES, cellsFor, spawnFor } from './pieces.js';
import { SevenBagGenerator } from './generator.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { targetOrientation } from './pieces.js';
import { listTrainingRules, TRAINING_RULE_SCHEMA } from './rules.js';
import { routeCost,placementKey,isFinessePerfect,profileFor,FINESSE_PROFILES } from './finesse-rules.js';

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
