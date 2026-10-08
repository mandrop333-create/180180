// Post-game rhythm analysis. Records lightweight gameplay events, then analyzes only after game over.
export class RhythmTracker {
  constructor(enabled=true){
    this.enabled=!!enabled;
    this.reset();
  }
  reset(){
    this.lastLockAt=null;
    this.pending=[];
    this.intervals=[];
    this.finished=false;
  }
  now(value){return Number.isFinite(value)?value:performance.now();}
  input(action,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at);
    if(action==='left'||action==='right'||action==='cw'||action==='ccw'||action==='half'||action==='hold'||action==='hard'||action==='soft'){
      this.pending.push({action,t});
    }
  }
  move(dx,dy,at){
    if(!this.enabled||this.finished)return;
    if(dy===0&&dx!==0)this.pending.push({action:dx<0?'left':'right',t:this.now(at)});
  }
  rotate(delta,at){
    if(!this.enabled||this.finished)return;
    this.pending.push({action:Math.abs(delta)===2?'180':delta>0?'rotate cw':'rotate ccw',t:this.now(at)});
  }
  hold(at){if(this.enabled&&!this.finished)this.pending.push({action:'hold',t:this.now(at)});}
  hardDrop(at){if(this.enabled&&!this.finished)this.pending.push({action:'hard drop',t:this.now(at)});}
  place(piece,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at);
    if(this.lastLockAt!==null){
      const interval=Math.max(0,t-this.lastLockAt);
      this.intervals.push({intervalMs:interval,piece:piece?.type||'?',events:this.pending,_start:this.lastLockAt,_end:t});
    }
    this.pending=[];
    this.lastLockAt=t;
  }
  report(){
    if(!this.enabled||this.finished)return null;
    this.finished=true;
    const items=this.intervals.filter(x=>Number.isFinite(x.intervalMs)&&x.intervalMs>0);
    if(items.length<3)return {ready:false,reason:'Not enough placements'};
    const sorted=items.map(x=>x.intervalMs).sort((a,b)=>a-b);
    const median=sorted[Math.floor(sorted.length/2)];
    const deviations=items.map((x,index)=>({...x,index,deviation:x.intervalMs-median})).filter(x=>x.deviation>0);
    const madValues=items.map(x=>Math.abs(x.intervalMs-median)).sort((a,b)=>a-b);
    const mad=madValues[Math.floor(madValues.length/2)]||0;
    const threshold=Math.max(120,mad*3);
    const candidates=deviations.filter(x=>x.deviation>=threshold).sort((a,b)=>b.deviation-a.deviation);
    const top=(candidates.length?candidates:deviations.sort((a,b)=>b.deviation-a.deviation)).slice(0,2);
    return {
      ready:true,
      averageMs:Math.round(items.reduce((s,x)=>s+x.intervalMs,0)/items.length),
      medianMs:Math.round(median),
      pps:Math.round(1000/median*100)/100,
      outliers:top.map(x=>this.explain(x,median))
    };
  }
  explain(item,median){
    const events=item.events||[];
    const counts={};
    for(const e of events)counts[e.action]=(counts[e.action]||0)+1;
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    let pattern='No clear input pattern';
    if(counts['180'])pattern='180° rotation during placement';
    else if(counts['rotate cw']||counts['rotate ccw'])pattern='rotation + movement during placement';
    else if((counts.left||0)+(counts.right||0)>=5)pattern='repeated horizontal corrections';
    else if(counts.hold)pattern='Hold followed by placement';
    else if(counts.soft)pattern='soft-drop activity';
    const timeline=events.map(e=>e.t).filter(Number.isFinite);
    let longestGap=0;
    if(timeline.length){
      const all=[item._start,...timeline].filter(Number.isFinite).sort((a,b)=>a-b);
      all.push(item._end);
      for(let i=1;i<all.length;i++)longestGap=Math.max(longestGap,all[i]-all[i-1]);
    }
    return {
      piece:item.piece,
      intervalMs:Math.round(item.intervalMs),
      deviationMs:Math.round(item.deviation),
      pattern,
      longestGapMs:Math.round(longestGap),
      inputs:ranked.slice(0,3).map(([action,count])=>({action,count}))
    };
  }
  finish(piece,at){this.place(piece,at);}
}
