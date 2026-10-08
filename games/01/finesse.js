import { placementIdentity,normalizeFinesseTarget,FINESSE_PROFILES } from './finesse-rules.js';

// Exact minimum-cost search over the supplied game transitions. This module
// never mutates the live piece: every transition operates on a clone supplied
// to the real collision/rotation functions.
function copyPiece(piece){return {...piece};}
function routeKey(route){return route.map(step=>step.action+':'+(step.mode||'tap')).join('|');}

export function enumerateFinesseTargets({piece,board,W,H,cellsFor,move,tryRotate,maxCost=2,profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180}={}){
  if(!piece||typeof move!=='function'||typeof tryRotate!=='function')return [];
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
  const targets=new Map();

  while(queue.length){
    const current=queue.shift();
    const land=landing(current.piece);
    const target=normalizeFinesseTarget({x:land.x,o:land.o,y:land.y},W,{allowNegativeX:true});
    if(target){
      const key=placementIdentity(target);
      const candidate={route:current.route,target,cost:current.cost,landingY:land.y,routeKey:routeKey(current.route)};
      const previous=targets.get(key);
      // Cost must dominate route ordering. A lexicographically earlier route
      // is only a tie-breaker between equally short routes, never permission
      // to replace a minimum route with a longer one.
      if(!previous||candidate.cost<previous.cost||
        (candidate.cost===previous.cost&&candidate.routeKey<previous.routeKey)){
        targets.set(key,candidate);
      }
    }
    if(current.cost>=maxCost)continue;
    for(const step of actions){
      const next=step.apply(current.piece);if(!next)continue;
      const stepCost=Number.isFinite(step.cost)?step.cost:Infinity;
      if(!Number.isFinite(stepCost)||current.cost+stepCost>maxCost)continue;
      const cost=current.cost+stepCost,key=stateKey(next);
      if(best.has(key)&&best.get(key)<=cost)continue;
      best.set(key,cost);
      queue.push({piece:next,cost,route:[...current.route,{action:step.action,mode:step.mode}]});
    }
  }

  return [...targets.values()].sort((a,b)=>b.cost-a.cost||a.target.x-b.target.x||a.target.o-b.target.o||a.target.y-b.target.y||a.routeKey.localeCompare(b.routeKey));
}

export function planFinesse({piece,board,W,H,cellsFor,move,tryRotate,seed=0,maxCost=2,profile=FINESSE_PROFILES.TETRIO_SRS_PLUS_180}={}){
  if(!piece||typeof move!=='function'||typeof tryRotate!=='function')return null;
  const candidates=enumerateFinesseTargets({piece,board,W,H,cellsFor,move,tryRotate,maxCost,profile});
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
  return {actions:chosen.route,target:chosen.target,cost:chosen.cost,landingY:chosen.landingY};
}

export function minimumRoutesForTargets(options={}){
  return enumerateFinesseTargets(options).map(candidate=>({
    actions:candidate.route,
    target:candidate.target,
    cost:candidate.cost,
    landingY:candidate.landingY
  }));
}
