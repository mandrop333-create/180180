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
  push(action,at){const t=this.now(at);const last=this.pending[this.pending.length-1];if(last&&last.action===action&&t-last.t<8)return;this.pending.push({action,t});}
  input(action,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at);
    if(action==='left'||action==='right'||action==='cw'||action==='ccw'||action==='half'||action==='hold'||action==='hard'||action==='soft'){
      this.push(action,t);
    }
  }
  move(dx,dy,at){
    if(!this.enabled||this.finished)return;
    if(dy===0&&dx!==0)this.push(dx<0?'left':'right',at);
  }
  rotate(delta,at){
    if(!this.enabled||this.finished)return;
    this.push(Math.abs(delta)===2?'180':delta>0?'rotate cw':'rotate ccw',at);
  }
  hold(at){if(this.enabled&&!this.finished)this.push('hold',at);}
  hardDrop(at){if(this.enabled&&!this.finished)this.push('hard drop',at);}
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
    const ranked=deviations.sort((a,b)=>b.deviation-a.deviation);
    const significant=ranked.filter(x=>x.deviation>=threshold);
    const top=(significant.length>=2?significant:ranked).slice(0,2);
    return {
      ready:true,
      averageMs:Math.round(items.reduce((s,x)=>s+x.intervalMs,0)/items.length),
      medianMs:Math.round(median),
      pps:Math.round(1000/median*100)/100,
      outliers:top.map(x=>this.explain(x,median)),
      recurringPattern:(()=>{
        if(top.length<2)return '';
        const patterns=top.map(x=>this.explain(x,median).pattern);
        return patterns[0]===patterns[1]?patterns[0]:'';
      })()
    };
  }
  explain(item,median){
    const events=item.events||[];
    const counts={};
    for(const e of events)counts[e.action]=(counts[e.action]||0)+1;
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const timeline=events.map(e=>e.t).filter(Number.isFinite).sort((a,b)=>a-b);
    const gaps=[];
    const all=[item._start,...timeline,item._end].filter(Number.isFinite).sort((a,b)=>a-b);
    for(let i=1;i<all.length;i++)gaps.push({ms:all[i]-all[i-1],index:i-1});
    const firstGap=timeline.length?timeline[0]-item._start:item.intervalMs;
    const lastGap=timeline.length?item._end-timeline[timeline.length-1]:item.intervalMs;
    const betweenGap=timeline.length>1?Math.max(...timeline.slice(1).map((t,i)=>t-timeline[i])):0;
    const directionRuns=[];
    for(const e of events){
      if(e.action!=='left'&&e.action!=='right')continue;
      if(directionRuns[directionRuns.length-1]!==e.action)directionRuns.push(e.action);
    }
    const directionReversals=Math.max(0,directionRuns.length-1);
    let timingPattern='';
    const gapCandidates=[
      {label:'recognition/decision hesitation',ms:firstGap},
      {label:'input hesitation',ms:betweenGap},
      {label:'post-placement hesitation',ms:lastGap}
    ];
    gapCandidates.sort((a,b)=>b.ms-a.ms);
    if(gapCandidates[0].ms>=120)timingPattern=gapCandidates[0].label;
    let pattern='No clear input pattern';
    if(timingPattern)pattern=timingPattern;
    else if(directionReversals>=2)pattern='direction reversals during placement';
    else if(counts['180'])pattern='180° rotation during placement';
    else if(counts['rotate cw']||counts['rotate ccw'])pattern='rotation + movement during placement';
    else if((counts.left||0)+(counts.right||0)>=5)pattern='repeated horizontal corrections';
    else if(counts.hold)pattern='Hold followed by placement';
    else if(counts.soft)pattern='soft-drop activity';
    let longestGap=0;
    for(const gap of gaps)longestGap=Math.max(longestGap,gap.ms);
    return {
      piece:item.piece,
      intervalMs:Math.round(item.intervalMs),
      deviationMs:Math.round(item.deviation),
      pattern,
      longestGapMs:Math.round(longestGap),
      timingPattern:timingPattern||'normal timing',
      directionReversals,
      inputs:ranked.slice(0,3).map(([action,count])=>({action,count}))
    };
  }
  finish(piece,at){this.place(piece,at);}
}
