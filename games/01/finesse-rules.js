// Finesse mathematical contract.
// This module is deliberately independent of the Trainer so it cannot change
// gameplay. It defines how the canonical finesse concept maps onto this game.
//
// State:       S = (piece type, x, y, orientation, board)
// Input route: R = [a1, a2, ... an]
// Input cost:  c(a) = 1 for every deliberate movement/rotation input
//              c(hard-drop) = 0 because hard drop is excluded from finesse
// Placement:   P(S) = (x, orientation, landingY)
//
// For a target placement p, the finesse cost is:
//   F(p) = min { sum c(ai) : transition(R, S0) has P(S) = p }
//
// A route is a finesse-perfect route when its cost equals F(p). The trainer
// must therefore never invent a second collision/rotation model: transition
// functions are supplied by the real engine.

export const FINESSE_PROFILES = Object.freeze({
  SRS_0G_60HZ: Object.freeze({
    id:'srs-0g-60hz',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    supportsDirectHalfTurn:false,
    halfTurnCost:Infinity,
    description:'0G/60Hz SRS two-step movement finesse'
  }),
  SRS_NORMAL: Object.freeze({
    id:'srs-normal',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    supportsDirectHalfTurn:false,
    halfTurnCost:Infinity,
    description:'Normal finite-gravity SRS movement finesse'
  }),
  SRS_20G: Object.freeze({
    id:'srs-20g',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    supportsDirectHalfTurn:false,
    halfTurnCost:Infinity,
    description:'20G SRS movement finesse'
  }),
  SRS_20G_WALL: Object.freeze({
    id:'srs-20g-wall',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    supportsDirectHalfTurn:false,
    halfTurnCost:Infinity,
    description:'20G SRS wall finesse'
  }),
  TETRIO_SRS_PLUS_180: Object.freeze({
    id:'tetrio-srs-plus-180',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    supportsDirectHalfTurn:true,
    halfTurnCost:1,
    description:'SRS+ movement finesse with the game\'s direct 180 rotation'
  })
});

export const FINESSE_ACTIONS=Object.freeze({
  LEFT:'left',RIGHT:'right',CW:'cw',CCW:'ccw',HALF:'half'
});

export const FINESSE_INPUT_MODES=Object.freeze({TAP:'tap',DAS:'das'});

export function finesseActionCost(action,mode='tap',profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180){
  const normalizedMode=typeof mode==='string'?mode.toLowerCase():'';
  const normalizedAction=typeof action==='string'?action.toLowerCase():'';
  if(!Object.values(FINESSE_INPUT_MODES).includes(normalizedMode)||!profile)return Infinity;
  if(normalizedMode==='das'&&profile.dasCountsAsOneInput!==true)return Infinity;
  if(normalizedAction==='half'){
    if(profile.supportsDirectHalfTurn!==true||!Number.isFinite(profile.halfTurnCost))return Infinity;
    return profile.halfTurnCost;
  }
  if(normalizedAction==='hard')return Number.isFinite(profile.hardDropCost)?profile.hardDropCost:0;
  return finesseInputCost(normalizedAction);
}


// Observation vocabulary: the game reports what actually happened; the
// visual trainer may interpret it, but this contract never authorizes or
// blocks gameplay. Non-movement events remain observable without becoming
// finesse-cost inputs.
export const FINESSE_OBSERVATIONS=Object.freeze({
  LEFT:'left',RIGHT:'right',CW:'cw',CCW:'ccw',HALF:'half',
  SOFT:'soft',HARD:'hard',HOLD:'hold',GRAVITY:'gravity'
});

export function normalizeFinesseObservation(action){
  if(typeof action!=='string')return null;
  return Object.prototype.hasOwnProperty.call(FINESSE_OBSERVATIONS,action.toUpperCase())
    ? FINESSE_OBSERVATIONS[action.toUpperCase()]
    : null;
}

export function finesseInputCost(action){
  if(!action)return Infinity;
  if(action==='hard'||action==='soft'||action==='gravity')return 0;
  if(action==='left'||action==='right'||action==='cw'||action==='ccw'||action==='half')return 1;
  return Infinity;
}

export function landingState(piece,moveDown){
  const p={...piece};
  while(moveDown(p)){}
  return {x:p.x,o:p.o,y:p.y};
}

// A target without landing y describes a column/orientation class. Once a
// physical landing is known, y is part of the placement identity: kicks and
// overhangs can make the same x/orientation reachable at different heights.
export function placementIdentity(placement){
  if(!placement)return null;
  const identity=placement.x+','+placement.o;
  return Number.isInteger(placement.y)?identity+','+placement.y:identity;
}

export function normalizeFinesseTarget(target,W=10,{allowNegativeX=false}={}){
  if(!target||!Number.isInteger(target.x)||!Number.isInteger(target.o))return null;
  if(target.y!==undefined&&!Number.isInteger(target.y))return null;
  const o=((target.o%4)+4)%4;
  // Piece origins are not always occupied-cell coordinates. For example, a
  // vertical I can be fully inside the field with a negative origin x because
  // its local mino coordinates are offset to the right. Callers that have only
  // a generic target retain the conservative default; the engine-backed
  // planner may opt in because collision checks already proved it is legal.
  if((target.x<0&&!allowNegativeX)||target.x>=W)return null;
  const normalized={x:target.x,o};
  if(Number.isInteger(target.y))normalized.y=target.y;
  return Object.freeze(normalized);
}

export function selectFinesseTarget(targets,selector){
  if(typeof selector!=='function')return null;
  const list=(targets||[]).map(target=>normalizeFinesseTarget(target)).filter(Boolean);
  const selected=selector(list.map(target=>Object.freeze({...target})));
  return normalizeFinesseTarget(selected);
}


// Fastest-placement policy: among legal targets inside the active finesse
// envelope, choose a placement with the fewest deliberate inputs. Ties are
// rotated deterministically without depending on map insertion order.
export function chooseTrainingTarget(targets,{pieceIndex=0,pieceType='',maxCost=2,seed=0}={}){
  const list=(targets||[]).map(target=>{
    const orientation=Number.isInteger(target?.o)?((target.o%4)+4)%4:null;
    const allowNegativeX=pieceType==='I'&&(orientation===1||orientation===3);
    return {...target,normalized:normalizeFinesseTarget(target,10,{allowNegativeX})};
  }).filter(target=>target.normalized&&Number.isFinite(target.cost)&&target.cost<=maxCost);
  if(!list.length)return null;
  const lowest=Math.min(...list.map(target=>target.cost));
  const eligible=list.filter(target=>target.cost===lowest)
    .sort((a,b)=>a.normalized.x-b.normalized.x||a.normalized.o-b.normalized.o||((a.normalized.y??-Infinity)-(b.normalized.y??-Infinity)));
  const typeSeed=String(pieceType||'').split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  const offset=Math.abs((Number(seed)||0)+pieceIndex*7+typeSeed)%eligible.length;
  return Object.freeze({...eligible[offset].normalized,cost:eligible[offset].cost});
}

// Physical landing identity, retained for collision/lock verification.
export function placementKey(placement){
  return placement.x+','+placement.o+','+placement.y;
}

export function stateKey(piece){
  return piece.x+','+piece.y+','+piece.o;
}

export function minimumFinesseTargets({
  piece,
  W=10,
  maxCost=2,
  moveHorizontal,
  rotate,
  moveDown
}={}){
  const candidates=reachableLandingTargets({piece,W,maxCost,moveHorizontal,rotate,moveDown});
  const best=new Map();
  for(const candidate of candidates){
    const key=placementIdentity(candidate);
    const previous=best.get(key);
    if(!previous||candidate.cost<previous.cost)best.set(key,candidate);
  }
  return [...best.values()].sort((a,b)=>a.cost-b.cost||a.x-b.x||a.o-b.o||(a.y??-Infinity)-(b.y??-Infinity));
}

export function reachableLandingTargets({
  piece,
  W=10,
  maxCost=2,
  moveHorizontal,
  rotate,
  moveDown
}={}){
  if(!piece||typeof moveHorizontal!=='function'||typeof rotate!=='function'||typeof moveDown!=='function')return [];
  const reachable=reachablePlacementIdentities({piece,W,moveHorizontal,rotate,maxCost});
  const result=[];
  for(const target of reachable){
    const start={...piece,x:target.x,y:target.y,o:target.o};
    const landing=landingState(start,moveDown);
    result.push(Object.freeze({
      x:target.x,
      o:target.o,
      y:landing.y,
      cost:target.cost
    }));
  }
  return result;
}

export function reachablePlacementIdentities({
  piece,
  board,
  W=10,
  H=20,
  moveHorizontal,
  rotate,
  maxCost=2
}={}){
  if(!piece||typeof moveHorizontal!=='function'||typeof rotate!=='function')return [];
  const clone=p=>({...p});
  const key=p=>p.x+','+p.y+','+p.o;
  const queue=[{piece:clone(piece),cost:0}];
  const best=new Map([[key(piece),0]]);
  const targets=new Map();
  while(queue.length){
    const current=queue.shift();
    const identity=key(current.piece);
    if(!targets.has(identity))targets.set(identity,{x:current.piece.x,y:current.piece.y,o:current.piece.o,cost:current.cost});
    if(current.cost>=maxCost)continue;
    const candidates=[];
    for(const dir of [-1,1]){
      const p=clone(current.piece);
      if(moveHorizontal(p,dir))candidates.push(p);
    }
    for(const delta of [1,-1,2]){
      const p=clone(current.piece);
      if(rotate(p,delta))candidates.push(p);
    }
    for(const p of candidates){
      const state=p.x+','+p.y+','+p.o;
      const cost=current.cost+1;
      if(best.has(state)&&best.get(state)<=cost)continue;
      best.set(state,cost);
      queue.push({piece:p,cost});
    }
  }
  return [...targets.values()].sort((a,b)=>a.cost-b.cost||a.x-b.x||a.o-b.o||a.y-b.y);
}

export function wallX(piece,dir,moveHorizontal){
  if(!piece||dir!==-1&&dir!==1||typeof moveHorizontal!=='function')return null;
  const p={...piece};
  while(moveHorizontal(p,dir)){}
  return p.x;
}

export function routeCost(route=[],profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180){
  let cost=0;
  for(const step of route){
    const action=typeof step==='string'?step:step?.action;
    const mode=typeof step==='string'?'tap':(step?.mode||'tap');
    const stepCost=finesseActionCost(action,mode,profile);
    if(!Number.isFinite(stepCost))return Infinity;
    cost+=stepCost;
  }
  return cost;
}

export function isFinessePerfect(route,targetCost,profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180){
  return routeCost(route,profile)===targetCost;
}

export function chooseMinimumRoute(routes,targetKey){
  let best=null;
  for(const candidate of routes||[]){
    if(candidate.targetKey!==targetKey)continue;
    if(!best||candidate.cost<best.cost||(candidate.cost===best.cost&&candidate.order<best.order))best=candidate;
  }
  return best;
}

export function profileFor({gravity=800,rotationSystem='tetrio-srs-plus-180',wallFinesse=false}={}){
  // Standard SRS profiles remain available as explicit reference cases. The
  // running game uses SRS+ 90° kicks plus a direct 180° system, so its
  // execution profile is not silently inferred from gravity alone.
  if(rotationSystem==='tetrio-srs-plus-180')return FINESSE_PROFILES.TETRIO_SRS_PLUS_180;
  if(gravity===Infinity)return FINESSE_PROFILES.SRS_0G_60HZ;
  if(gravity===0)return wallFinesse?FINESSE_PROFILES.SRS_20G_WALL:FINESSE_PROFILES.SRS_20G;
  return FINESSE_PROFILES.SRS_NORMAL;
}
