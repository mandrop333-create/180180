// Finesse route planner for the trainer's actual movement/rotation rules.
// A DAS-to-wall action counts as one input, matching standard movement-finesse practice.
// Hard drop is deliberately excluded: finesse measures the inputs used to position the piece.

function copyPiece(piece){return {...piece};}

export function planFinesse({piece,board,W,H,cellsFor,move,tryRotate,seed=0}={}){
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
  const landing=p=>{const n=copyPiece(p);while(move(n,0,1,board,W,H,cellsFor)){}return n;};
  const stateKey=p=>p.x+','+p.y+','+p.o;
  const landingKey=p=>{const n=landing(p);return n.x+','+n.o+','+n.y;};
  const queue=[{piece:start,route:[]}],seen=new Set([stateKey(start)]),candidates=[];
  while(queue.length){
    const current=queue.shift();
    if(current.route.length>=2)continue;
    for(const step of actions){
      const next=step.apply(current.piece);if(!next)continue;
      const key=stateKey(next);if(seen.has(key))continue;seen.add(key);
      const route=[...current.route,{action:step.action,mode:step.mode}];
      const land=landing(next);
      if(!(next.x===start.x&&next.y===start.y&&next.o===start.o))candidates.push({route,target:{x:next.x,o:next.o},landing:{x:land.x,y:land.y,o:land.o}});
      queue.push({piece:next,route});
    }
  }
  if(!candidates.length)return {actions:[],target:{x:start.x,o:start.o}};
  const unique=[];const targetSeen=new Set();
  for(const candidate of candidates){
    const key=candidate.target.x+','+candidate.target.o+','+candidate.landing.y+':'+candidate.route.map(a=>a.mode+':'+a.action).join('|');
    if(targetSeen.has(key))continue;targetSeen.add(key);unique.push(candidate);
  }
  // Prefer genuine two-input routes when available; one-input routes remain valid
  // and are selected when they are the only route to the chosen target.
  const maxLength=Math.max(...unique.map(c=>c.route.length));
  const pool=unique.filter(c=>c.route.length===maxLength);
  const chosen=pool[(Number(seed)||0)%pool.length];
  return {actions:chosen.route,target:chosen.target};
}
