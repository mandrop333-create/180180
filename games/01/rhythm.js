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
    const deviations=items.map((x,index)=>({...x,index,deviation:x.intervalMs-median})).filter(x=>x.deviation>0);
    const madValues=items.map(x=>Math.abs(x.intervalMs-median)).sort((a,b)=>a-b);
    const mad=madValues[Math.floor(madValues.length/2)]||0;
    const threshold=Math.max(120,mad*3);
    const ranked=deviations.sort((a,b)=>b.deviation-a.deviation);
    const significant=ranked.filter(x=>x.deviation>=threshold);
    const top=(significant.length>=2?significant:ranked).slice(0,2);
    const diagnoses=this.findWeaknesses(items,median);
    return {
      ready:true,
      averageMs:Math.round(items.reduce((s,x)=>s+x.intervalMs,0)/items.length),
      medianMs:Math.round(median),
      pps:Math.round(1000/median*100)/100,
      outliers:top.map(x=>this.explain(x,median)),
      weaknesses:diagnoses
    };
  }
  findWeaknesses(items,median){
    const candidates=[];
    const add=(key,label,piece,intervalMs,baselineCount)=>{
      if(!key||baselineCount<2)return;
      candidates.push({key,label,piece,intervalMs,baselineCount});
    };
    const pieceStats={};
    for(const item of items){
      const p=item.piece||'?';
      if(!pieceStats[p])pieceStats[p]={sum:0,count:0};
      pieceStats[p].sum+=item.intervalMs;pieceStats[p].count++;
    }
    Object.entries(pieceStats).forEach(([piece,s])=>{
      if(s.count>=2)add('piece:'+piece,piece,piece,s.sum/s.count,s.count);
    });
    const inputStats={};
    for(const item of items){
      const ev=item.events||[];
      const seen=new Set(ev.map(e=>e.action));
      seen.forEach(action=>{
        if(!inputStats[action])inputStats[action]={sum:0,count:0,pieceCounts:{}};
        inputStats[action].sum+=item.intervalMs;inputStats[action].count++;
        inputStats[action].pieceCounts[item.piece]=(inputStats[action].pieceCounts[item.piece]||0)+1;
      });
    }
    Object.entries(inputStats).forEach(([action,s])=>{
      if(s.count<2)return;
      const avg=s.sum/s.count;
      const label={left:'Left',right:'Right','rotate cw':'CW rotation','rotate ccw':'CCW rotation','180':'180° rotation',hold:'Hold',soft:'Soft drop','hard drop':'Hard drop'}[action]||action;
      const pieceEntry=Object.entries(s.pieceCounts).sort((a,b)=>b[1]-a[1])[0];
      const piece=pieceEntry&&pieceEntry[1]>=2?pieceEntry[0]:'';
      add('input:'+action,label,piece,avg,s.count);
    });
    Object.entries(pieceStats).forEach(([piece,s])=>{
      const seqCounts={};
      for(const item of items.filter(x=>x.piece===piece)){
        const seq=[...(item.events||[])].map(e=>e.action).filter(a=>a!=='hard drop');
        for(let i=0;i<seq.length-1;i++){
          const key=seq[i]+'>'+seq[i+1];
          seqCounts[key]=(seqCounts[key]||0)+1;
        }
      }
      Object.entries(seqCounts).forEach(([seq,count])=>{
        if(count>=2){
          const [a,b]=seq.split('>');
          add('seq:'+piece+':'+seq,a+' + '+b,piece,s.sum/s.count,count);
        }
      });
    });
    const scored=candidates.map(c=>({...c,score:c.intervalMs-median+Math.log2(c.baselineCount+1)*10}))
      .filter(c=>c.score>0)
      .sort((a,b)=>b.score-a.score);
    const unique=[];
    const keys=new Set();
    for(const c of scored){
      const family=c.key.split(':')[0];
      const dedupe=family==='input'?c.key:c.key;
      if(keys.has(dedupe))continue;
      keys.add(dedupe);unique.push(c);
      if(unique.length>=2)break;
    }
    return unique.map(c=>({label:c.label,piece:c.piece||'',score:Math.round(c.score),count:c.baselineCount}));
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
