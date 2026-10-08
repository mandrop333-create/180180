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
    description:'0G/60Hz SRS two-step movement finesse'
  }),
  SRS_NORMAL: Object.freeze({
    id:'srs-normal',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    description:'Normal finite-gravity SRS movement finesse'
  }),
  SRS_20G: Object.freeze({
    id:'srs-20g',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    description:'20G SRS movement finesse'
  }),
  SRS_20G_WALL: Object.freeze({
    id:'srs-20g-wall',
    maxCost:2,
    hardDropCost:0,
    dasCountsAsOneInput:true,
    supportsDirectHalfTurn:false,
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

// Canonical finesse target identity: horizontal column + orientation.
 // The resting y is a physical landing result, not part of the requested
 // placement identity because gravity and stack geometry determine it.
export function placementIdentity(placement){
  if(!placement)return null;
  return placement.x+','+placement.o;
}

export function normalizeFinesseTarget(target,W=10){
  if(!target||!Number.isInteger(target.x)||!Number.isInteger(target.o))return null;
  const o=((target.o%4)+4)%4;
  if(target.x<0||target.x>=W)return null;
  return Object.freeze({x:target.x,o});
}

export function selectFinesseTarget(targets,selector){
  if(typeof selector!=='function')return null;
  const list=(targets||[]).map(target=>normalizeFinesseTarget(target)).filter(Boolean);
  const selected=selector(list.map(target=>Object.freeze({...target})));
  return normalizeFinesseTarget(selected);
}

// Physical landing identity, retained for collision/lock verification.
export function placementKey(placement){
  return placement.x+','+placement.o+','+placement.y;
}

export function stateKey(piece){
  return piece.x+','+piece.y+','+piece.o;
}

export function wallX(piece,dir,moveHorizontal){
  if(!piece||dir!==-1&&dir!==1||typeof moveHorizontal!=='function')return null;
  const p={...piece};
  while(moveHorizontal(p,dir)){}
  return p.x;
}

export function routeCost(route=[]){
  let cost=0;
  for(const step of route)cost+=finesseInputCost(typeof step==='string'?step:step?.action);
  return cost;
}

export function isFinessePerfect(route,targetCost){
  return routeCost(route)===targetCost;
}

export function chooseMinimumRoute(routes,targetKey){
  let best=null;
  for(const candidate of routes||[]){
    if(candidate.targetKey!==targetKey)continue;
    if(!best||candidate.cost<best.cost||(candidate.cost===best.cost&&candidate.order<best.order))best=candidate;
  }
  return best;
}

export function profileFor({gravity=800,rotationSystem='tetrio-srs-plus-180'}={}){
  // Standard SRS profiles remain available as external references. The
  // running game uses SRS+ 90° kicks plus a direct 180° system, so its
  // execution profile is explicit rather than silently calling itself
  // vanilla SRS.
  if(rotationSystem==='tetrio-srs-plus-180')return FINESSE_PROFILES.TETRIO_SRS_PLUS_180;
  if(gravity===Infinity)return FINESSE_PROFILES.SRS_0G_60HZ;
  if(gravity===0)return FINESSE_PROFILES.SRS_20G;
  return FINESSE_PROFILES.SRS_NORMAL;
}
