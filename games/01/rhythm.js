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
  normalizeAction(action){
    if(action==='hard')return 'hard drop';
    if(action==='soft')return 'soft drop';
    return action;
  }
  push(action,at){
    const t=this.now(at);
    const normalized=this.normalizeAction(action);
    const last=this.pending[this.pending.length-1];
    if(last&&last.action===normalized&&t-last.t<8)return;
    this.pending.push({action:normalized,t});
  }
  input(action,at){
    if(!this.enabled||this.finished)return;
    if(['left','right','cw','ccw','half','hold','hard','soft'].includes(action))this.push(action,at);
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
  median(values){
    if(!values.length)return 0;
    const sorted=[...values].sort((a,b)=>a-b);
    const middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }
  report(){
    if(!this.enabled||this.finished)return null;
    this.finished=true;
    const items=this.intervals.filter(x=>Number.isFinite(x.intervalMs)&&x.intervalMs>0);
    if(items.length<3)return {ready:false,reason:'Not enough placements'};

    const median=this.median(items.map(x=>x.intervalMs));
    const deviations=items.map((x,index)=>({...x,index,deviation:x.intervalMs-median})).filter(x=>x.deviation>0);
    const mad=this.median(items.map(x=>Math.abs(x.intervalMs-median)));
    const threshold=Math.max(120,mad*3);
    const ranked=deviations.sort((a,b)=>b.deviation-a.deviation);
    const significant=ranked.filter(x=>x.deviation>=threshold);
    const top=(significant.length>=2?significant:ranked).slice(0,2);
    return {
      ready:true,
      averageMs:Math.round(items.reduce((s,x)=>s+x.intervalMs,0)/items.length),
      medianMs:Math.round(median),
      pps:Math.round(1000/median*100)/100,
      outliers:top.map(x=>this.explain(x,items,median))
    };
  }
  explain(item,items,median){
    const events=item.events||[];
    const counts={};
    for(const e of events)counts[e.action]=(counts[e.action]||0)+1;

    const normalItems=items.filter(x=>x!==item&&Math.abs(x.intervalMs-median)<=Math.max(120,median*.5));
    const baselineItems=normalItems.length?normalItems:items.filter(x=>x!==item);
    const baselineCounts={};
    for(const normal of baselineItems){
      const seen={};
      for(const e of normal.events||[])seen[e.action]=(seen[e.action]||0)+1;
      for(const [action,count] of Object.entries(seen)){
        if(!baselineCounts[action])baselineCounts[action]=[];
        baselineCounts[action].push(count);
      }
    }

    const factors=[];
    const addFactor=(label,actual,baseline)=>{
      const delta=actual-baseline;
      if(delta>0)factors.push({label,delta,actual,baseline});
    };
    const horizontal=(counts.left||0)+(counts.right||0);
    const baselineHorizontal=(baselineCounts.left?this.median(baselineCounts.left):0)+(baselineCounts.right?this.median(baselineCounts.right):0);
    addFactor('horizontal corrections',horizontal,baselineHorizontal);

    const rotations=(counts['rotate cw']||0)+(counts['rotate ccw']||0);
    const baselineRotations=(baselineCounts['rotate cw']?this.median(baselineCounts['rotate cw']):0)+(baselineCounts['rotate ccw']?this.median(baselineCounts['rotate ccw']):0);
    addFactor('rotations',rotations,baselineRotations);

    addFactor('180° rotations',counts['180']||0,baselineCounts['180']?this.median(baselineCounts['180']):0);
    addFactor('Holds',counts.hold||0,baselineCounts.hold?this.median(baselineCounts.hold):0);
    addFactor('soft-drop inputs',counts['soft drop']||0,baselineCounts['soft drop']?this.median(baselineCounts['soft drop']):0);

    const timeline=events.map(e=>e.t).filter(Number.isFinite);
    let longestGap=0;
    let longestGapStart=null;
    if(timeline.length){
      const all=[item._start,...timeline,item._end].filter(Number.isFinite).sort((a,b)=>a-b);
      for(let i=1;i<all.length;i++){
        const gap=all[i]-all[i-1];
        if(gap>longestGap){longestGap=gap;longestGapStart=all[i-1];}
      }
    }else{
      longestGap=item.intervalMs;
      longestGapStart=item._start;
    }

    const baselineGaps=baselineItems.map(normal=>{
      const ts=(normal.events||[]).map(e=>e.t).filter(Number.isFinite);
      const all=[normal._start,...ts,normal._end].filter(Number.isFinite).sort((a,b)=>a-b);
      let gap=0;
      for(let i=1;i<all.length;i++)gap=Math.max(gap,all[i]-all[i-1]);
      return gap;
    }).filter(Number.isFinite);
    const baselineGap=this.median(baselineGaps);
    if(longestGap>baselineGap+80)factors.push({label:'input hesitation',delta:longestGap-baselineGap,actual:longestGap,baseline:baselineGap});

    factors.sort((a,b)=>b.delta-a.delta);
    const topFactor=factors[0];

    let pattern='No unusual tracked input pattern';
    if(topFactor){
      pattern='Most associated: '+topFactor.label+' (+'+Math.round(topFactor.delta)+' vs normal)';
    }else if(!events.length){
      pattern='No tracked input activity during the slowdown';
    }else if(longestGap>baselineGap+80){
      pattern='Most associated: input hesitation';
    }

    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    return {
      piece:item.piece,
      intervalMs:Math.round(item.intervalMs),
      deviationMs:Math.round(item.deviation),
      pattern,
      longestGapMs:Math.round(longestGap),
      baselineGapMs:Math.round(baselineGap),
      inputs:ranked.slice(0,3).map(([action,count])=>({action,count})),
      comparison:topFactor?{
        label:topFactor.label,
        actual:Math.round(topFactor.actual),
        normal:Math.round(topFactor.baseline),
        delta:Math.round(topFactor.delta)
      }:null
    };
  }
  finish(piece,at){this.place(piece,at);}
}
