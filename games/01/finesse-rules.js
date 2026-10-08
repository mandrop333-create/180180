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
    description:'20G SRS wall finesse'
  })
});

export const FINESSE_ACTIONS=Object.freeze({
  LEFT:'left',RIGHT:'right',CW:'cw',CCW:'ccw',HALF:'half'
});

export function finesseInputCost(action){
  return action ? 1 : Infinity;
}

export function landingState(piece,moveDown){
  const p={...piece};
  while(moveDown(p)){}
  return {x:p.x,o:p.o,y:p.y};
}

export function placementKey(placement){
  return placement.x+','+placement.o+','+placement.y;
}

export function stateKey(piece){
  return piece.x+','+piece.y+','+piece.o;
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

export function profileFor({gravity=800}={}){
  // This is a profile selector, not a claim that the game is currently 0G.
  // The 0G profile is the canonical two-step reference; 20G profiles are
  // available when the engine's gravity actually requires their rules.
  return gravity===Infinity?FINESSE_PROFILES.SRS_20G:FINESSE_PROFILES.SRS_0G_60HZ;
}
