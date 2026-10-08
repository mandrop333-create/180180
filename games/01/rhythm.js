// Post-game rhythm analysis. Records lightweight gameplay events, then analyzes only after game over.
export class RhythmTracker {
  constructor(enabled=true){this.enabled=!!enabled;this.reset();}
  reset(){this.lastLockAt=null;this.pending=[];this.intervals=[];this.finished=false;}
  now(value){return Number.isFinite(value)?value:performance.now();}
  push(action,at){const t=this.now(at);const last=this.pending[this.pending.length-1];if(last&&last.action===action&&t-last.t<8)return;this.pending.push({action,t});}
  input(action,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at);
    if(action==='left'||action==='right'||action==='cw'||action==='ccw'||action==='half'||action==='hold'||action==='hard'||action==='soft')this.push(action,t);
  }
  move(dx,dy,at){if(!this.enabled||this.finished)return;if(dy===0&&dx!==0)this.push(dx<0?'left':'right',at);}
  rotate(delta,at){if(!this.enabled||this.finished)return;this.push(Math.abs(delta)===2?'180':delta>0?'rotate cw':'rotate ccw',at);}
  hold(at){if(this.enabled&&!this.finished)this.push('hold',at);}
  hardDrop(at){if(this.enabled&&!this.finished)this.push('hard drop',at);}
  place(piece,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at);
    if(this.lastLockAt!==null)this.intervals.push({intervalMs:Math.max(0,t-this.lastLockAt),piece:piece?.type||'?',events:this.pending,_start:this.lastLockAt,_end:t});
    this.pending=[];this.lastLockAt=t;
  }
  report(){
    if(!this.enabled||this.finished)return null;
    this.finished=true;
    const items=this.intervals.filter(x=>Number.isFinite(x.intervalMs)&&x.intervalMs>0);
    if(items.length<3)return {ready:false,reason:'Not enough placements'};
    const sorted=items.map(x=>x.intervalMs).sort((a,b)=>a-b);
    const median=sorted[Math.floor(sorted.length/2)];
    const inputStats={};
    for(const item of items){
      const events=(item.events||[]).filter(e=>Number.isFinite(e.t)).sort((a,b)=>a.t-b.t);
      for(let i=0;i<events.length;i++){
        const e=events[i];
        const prev=i===0?item._start:events[i-1].t;
        const gap=Math.max(0,e.t-prev);
        const action=e.action;
        if(!inputStats[action])inputStats[action]={sum:0,count:0,pieces:{}};
        inputStats[action].sum+=gap;inputStats[action].count++;
        inputStats[action].pieces[item.piece]=(inputStats[action].pieces[item.piece]||0)+1;
      }
    }
    const labels={left:'Left',right:'Right','rotate cw':'CW rotation','rotate ccw':'CCW rotation','180':'180° rotation',hold:'Hold',soft:'Soft drop','hard drop':'Hard drop'};
    const inputCandidates=Object.entries(inputStats)
      .filter(([,s])=>s.count>=2)
      .map(([action,s])=>{
        const pieceEntry=Object.entries(s.pieces).sort((a,b)=>b[1]-a[1])[0];
        return {action,label:labels[action]||action,piece:pieceEntry&&pieceEntry[1]>=2?pieceEntry[0]:'',avgMs:s.sum/s.count,count:s.count};
      })
      .sort((a,b)=>b.avgMs-a.avgMs);
    const slow=inputCandidates[0]||null;
    return {
      ready:true,
      averageMs:Math.round(items.reduce((s,x)=>s+x.intervalMs,0)/items.length),
      medianMs:Math.round(median),
      pps:Math.round(1000/median*100)/100,
      slowestInput:slow?{label:slow.label,piece:slow.piece,avgMs:Math.round(slow.avgMs),count:slow.count}:null,
      outliers:[]
    };
  }
  explain(item,median){
    const events=item.events||[];
    const counts={};
    for(const e of events)counts[e.action]=(counts[e.action]||0)+1;
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    return {piece:item.piece,intervalMs:Math.round(item.intervalMs),deviationMs:Math.round(item.intervalMs-median),inputs:ranked.slice(0,3).map(([action,count])=>({action,count}))};
  }
  finish(piece,at){this.place(piece,at);}
}
