// Replacement finesse core — isolated from the legacy module path.
//
// This file is the implementation entry point for the rebuild. The old
// finesse.js path remains a compatibility facade for existing tests/importers;
// gameplay should import this module directly so there is one obvious source
// of truth for the replacement planner.

import { placementIdentity,normalizeFinesseTarget,FINESSE_PROFILES } from './finesse-rules.js';

// Exact minimum-cost search over the supplied game transitions. This module
// never mutates the live piece: every transition operates on a clone supplied
// to the real collision/rotation functions.
function copyPiece(piece){return {...piece};}
function routeKey(route){return route.map(step=>step.action+':'+(step.mode||'tap')).join('|');}
function costLimit(maxCost,profile){
  // An omitted limit may use the active profile/default. An explicitly
  // malformed limit must not silently widen or narrow the finesse envelope.
  const requested=maxCost!==undefined
    ?maxCost
    :(profile&&Object.prototype.hasOwnProperty.call(profile,'maxCost')?profile.maxCost:2);
  return Number.isInteger(requested)&&requested>=0?requested:null;
}

export function enumerateFinesseTargets({piece,board,W,H,cellsFor,move,tryRotate,maxCost,profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180}={}){
  if(!piece||typeof move!=='function'||typeof tryRotate!=='function')return [];
  const limit=costLimit(maxCost,profile);
  if(limit===null)return [];
  const start=copyPiece(piece);
  const actions=[
    {action:'left',mode:'tap',cost:1,apply:p=>{const n=copyPiece(p);return move(n,-1,0,board,W,H,cellsFor)?n:null;}},
    {action:'right',mode:'tap',cost:1,apply:p=>{const n=copyPiece(p);return move(n,1,0,board,W,H,cellsFor)?n:null;}}
  ];
  // The O piece is rotationally invariant. Never offer rotations as a
  // finesse step when they cannot change its physical placement.
  if(start.type!=='O')actions.push(
    {action:'cw',mode:'tap',cost:1,apply:p=>{const n=copyPiece(p);return tryRotate(n,1,board,W,H,cellsFor)?n:null;}},
    {action:'ccw',mode:'tap',cost:1,apply:p=>{const n=copyPiece(p);return tryRotate(n,-1,board,W,H,cellsFor)?n:null;}}
  );
  if(start.type!=='O'&&profile?.supportsDirectHalfTurn===true&&Number.isFinite(profile.halfTurnCost)){
    actions.push({action:'half',mode:'tap',cost:profile.halfTurnCost,apply:p=>{const n=copyPiece(p);return tryRotate(n,2,board,W,H,cellsFor)?n:null;}});
  }
  const wallAction=(dir,action)=>({action,mode:'das',cost:1,apply:p=>{
    const n=copyPiece(p);let moved=false;
    while(move(n,dir,0,board,W,H,cellsFor))moved=true;
    return moved?n:null;
  }});
  if(profile?.dasCountsAsOneInput===true)actions.push(wallAction(-1,'left'),wallAction(1,'right'));

  const landing=p=>{const n=copyPiece(p);while(move(n,0,1,board,W,H,cellsFor)){}return n;};
  const stateKey=p=>p.x+','+p.y+','+p.o;
  const queue=[{piece:start,cost:0,route:[]}];
  const best=new Map([[stateKey(start),0]]);
  // Retain distinct equal-cost histories for a state. Positive action costs
  // and the finite cost envelope bound this search; route keys prevent repeats.
  const stateRoutes=new Map([[stateKey(start),new Set([''])]]);
  const targets=new Map();

  while(queue.length){
    const current=queue.shift();
    const currentStateKey=stateKey(current.piece);
    const currentRouteKey=routeKey(current.route);
    if(current.cost>best.get(currentStateKey)||
      !stateRoutes.get(currentStateKey)?.has(currentRouteKey))continue;
    const land=landing(current.piece);
    // A resting piece with any mino above row zero cannot be locked: the
    // engine top-outs before writing its cells to the board. Such a state is
    // reachable as a rotation intermediate but is not a valid finesse target.
    const lockCells=typeof cellsFor==='function'?cellsFor(land.type,land.o):null;
    const lockable=Array.isArray(lockCells)&&lockCells.length>0&&
      lockCells.every(([cx,cy])=>land.y+cy>=0&&land.y+cy<H);
    const target=lockable
      ?normalizeFinesseTarget({x:land.x,o:land.o,y:land.y},W,{allowNegativeX:true})
      :null;
    if(target){
      const key=placementIdentity(target);
      const candidate={route:current.route,target,cost:current.cost,landingY:land.y,routeKey:currentRouteKey};
      const previous=targets.get(key);
      // Preserve every distinct minimum-cost route to this physical landing.
      // route remains a deterministic canonical route for existing callers.
      if(!previous||candidate.cost<previous.cost){
        targets.set(key,{...candidate,routes:[current.route]});
      }else if(candidate.cost===previous.cost&&!previous.routes.some(route=>routeKey(route)===candidate.routeKey)){
        previous.routes.push(current.route);
        previous.routes.sort((a,b)=>routeKey(a).localeCompare(routeKey(b)));
        previous.route=previous.routes[0];
        previous.routeKey=routeKey(previous.route);
      }
    }
    if(current.cost>=limit)continue;
    for(const step of actions){
      const next=step.apply(current.piece);if(!next)continue;
      const stepCost=Number.isFinite(step.cost)?step.cost:Infinity;
      if(!Number.isFinite(stepCost)||stepCost<=0||current.cost+stepCost>limit)continue;
      const cost=current.cost+stepCost,key=stateKey(next);
      const nextRoute=[...current.route,{action:step.action,mode:step.mode}];
      const nextRouteKey=routeKey(nextRoute);
      const priorCost=best.get(key);
      if(priorCost!==undefined&&priorCost<cost)continue;
      if(priorCost===undefined||cost<priorCost){
        best.set(key,cost);
        stateRoutes.set(key,new Set([nextRouteKey]));
      }else{
        const knownRoutes=stateRoutes.get(key)||new Set();
        if(knownRoutes.has(nextRouteKey))continue;
        knownRoutes.add(nextRouteKey);
        stateRoutes.set(key,knownRoutes);
      }
      queue.push({piece:next,cost,route:nextRoute});
    }
  }

  return [...targets.values()].map(candidate=>({
    ...candidate,
    routes:candidate.routes.sort((a,b)=>routeKey(a).localeCompare(routeKey(b)))
  })).sort((a,b)=>b.cost-a.cost||a.target.x-b.target.x||a.target.o-b.target.o||a.target.y-b.target.y||a.routeKey.localeCompare(b.routeKey));
}

export function planFinesse({piece,board,W,H,cellsFor,move,tryRotate,seed=0,maxCost,profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180}={}){
  if(!piece||typeof move!=='function'||typeof tryRotate!=='function')return null;
  const limit=costLimit(maxCost,profile);
  if(limit===null)return null;
  const candidates=enumerateFinesseTargets({piece,board,W,H,cellsFor,move,tryRotate,maxCost:limit,profile});
  if(!candidates.length){
    const land=copyPiece(piece);
    while(move(land,0,1,board,W,H,cellsFor)){}
    return {actions:[],target:{x:land.x,o:land.o,y:land.y},cost:0,landingY:land.y};
  }
  // Teach the most demanding placement that is still inside the active
  // finesse envelope. Every target already carries its shortest route, so
  // this maximizes training value without ever recommending a longer route.
  const highestCost=candidates[0].cost;
  const hardest=candidates.filter(candidate=>candidate.cost===highestCost);
  const offset=Math.abs(Number(seed)||0)%hardest.length;
  const chosen=hardest[offset];
  return {actions:chosen.route,routes:chosen.routes,target:chosen.target,cost:chosen.cost,landingY:chosen.landingY};
}

export function minimumRoutesForTargets(options={}){
  return enumerateFinesseTargets(options).map(candidate=>({
    actions:candidate.route,
    routes:candidate.routes,
    target:candidate.target,
    cost:candidate.cost,
    landingY:candidate.landingY
  }));
}
