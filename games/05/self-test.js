import { PIECE_TYPES, cellsFor, spawnFor } from './pieces.js';
import { SevenBagGenerator } from './generator.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { targetOrientation } from './pieces.js';

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

  return {ok:true,tests:6};
}

if(typeof window!=='undefined')window.runTrainerSelfTest=runTrainerSelfTest;
