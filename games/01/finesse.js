// Finesse route planner for the trainer's actual movement/rotation rules.
// Hard drop is excluded from finesse cost. A completed DAS-to-wall movement
// counts as one deliberate input, matching the trainer's movement model.
//
// The planner deliberately separates two ideas:
//   1. route cost = number of deliberate inputs;
//   2. target = the resulting resting x/orientation after natural gravity.
// This lets the trainer choose a deterministic minimum-input placement without
// pretending that every board state has a fixed universal input string.

function copyPiece(piece){return {...piece};}

export function planFinesse({piece,board,W,H,cellsFor,move,tryRotate,seed=0,maxDepth=8}={}){
  if(!piece)return null;
  const start=copyPiece(piece);

  const actions=[
    {action:'left',mode:'tap',apply:p=>{const n=copyPiece(p);return move(n,-1,0,board,W,H,cellsFor)?n:null;}},
    {action:'right',mode:'tap',apply:p=>{const n=copyPiece(p);return move(n,1,0,board,W,H,cellsFor)?n:null;}},
    {action:'left',mode:'das',apply:p=>{const n=copyPiece(p);let moved=false;while(move(n,-1,0,board,W,H,cellsFor))moved=true;return moved?n:null;}},
    {action:'right',mode:'das',apply:p=>{const n=copyPiece(p);let moved=false;while(move(n,1,0,board,W,H,cellsFor))moved=true;return moved?n:null;}},
    {action:'cw',mode:'tap',apply:p=>{const n=copyPiece(p);return tryRotate(n,1,board,W,H,cellsFor)?n:null;}},
    {action:'ccw',mode:'tap',apply:p=>{const n=copyPiece(p);return tryRotate(n,-1,board,W,H,cellsFor)?n:null;}},
    {action:'half',mode:'tap',apply:p=>{const n=copyPiece(p);return tryRotate(n,2,board,W,H,cellsFor)?n:null;}}
  ];

  const landing=p=>{
    const n=copyPiece(p);
    while(move(n,0,1,board,W,H,cellsFor)){}
    return n;
  };
  const stateKey=p=>p.x+','+p.y+','+p.o;
  const targetKey=p=>{const land=landing(p);return land.x+','+land.o+','+land.y;};

  // BFS guarantees minimum deliberate-input count. The deterministic action
  // order is also our tie-breaker, so identical states produce stable prompts.
  const queue=[{piece:start,route:[]}];
  const seen=new Set([stateKey(start)]);
  const targets=new Map();

  while(queue.length){
    const current=queue.shift();
    if(current.route.length>=maxDepth)continue;

    for(const step of actions){
      const next=step.apply(current.piece);
      if(!next)continue;

      const key=stateKey(next);
      if(seen.has(key))continue;
      seen.add(key);

      const route=[...current.route,{action:step.action,mode:step.mode}];
      const land=landing(next);
      const target=targetKey(next);

      // Only store the first route to a target: BFS makes it minimum cost.
      if(!targets.has(target)){
        targets.set(target,{route,target:{x:land.x,o:land.o,y:land.y}});
      }

      queue.push({piece:next,route});
    }
  }

  if(!targets.size)return {actions:[],target:{x:start.x,o:start.o,y:landing(start).y}};

  const candidates=[...targets.values()];
  // Prefer the shortest routes (normally 1–2 inputs under 0G SRS finesse).
  // Among equal-cost routes, choose deterministically using the seeded index.
  const minLength=Math.min(...candidates.map(c=>c.route.length));
  const pool=candidates.filter(c=>c.route.length===minLength);
  const chosen=pool[(Math.abs(Number(seed)||0))%pool.length];

  return chosen;
}
