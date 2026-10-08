// Post-game rhythm analysis. Records meaningful player inputs, then analyzes them after game over.
const RHYTHM_INPUTS=new Set(['left','right','cw','ccw','half','hold','soft']);

export class RhythmTracker{
  constructor(enabled=true){this.enabled=!!enabled;this.reset();}
  reset(){this.events=[];this.placements=[];this.lastLockAt=null;this.finished=false;}
  now(value){return Number.isFinite(value)?value:performance.now();}
  push(action,at,code=null){
    if(!RHYTHM_INPUTS.has(action))return;
    const t=this.now(at);
    const last=this.events[this.events.length-1];
    if(last&&last.action===action&&t-last.at<8){
      if(!last.code&&code)last.code=code;
      return;
    }
    this.events.push({action,at:t,code:code||null});
  }
  input(action,at,code=null){if(!this.enabled||this.finished)return;this.push(action,at,code);}
  move(){/* DAS/ARR repeats are movement, not new player inputs. */}
  rotate(delta,at,code=null){if(!this.enabled||this.finished)return;this.push(Math.abs(delta)===2?'half':delta>0?'cw':'ccw',at,code);}
  hold(at,code=null){if(this.enabled&&!this.finished)this.push('hold',at,code);}
  hardDrop(){/* Hard drop ends placement; it is never a rhythm input. */}
  place(piece,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at),type=piece?.type||'?';
    this.placements.push({piece:type,events:this.events,lockAt:t,intervalMs:this.lastLockAt===null?null:t-this.lastLockAt});
    this.lastLockAt=t;this.events=[];
  }
  report(){
    if(!this.enabled||this.finished)return null;
    this.finished=true;
    const placements=this.placements;
    const rhythmIntervals=placements.map(p=>p.intervalMs).filter(ms=>Number.isFinite(ms)&&ms>0);
    const byInput={};
    for(const placement of placements){
      const events=placement.events||[];
      for(let i=1;i<events.length;i++){
        const current=events[i],previous=events[i-1];
        const latency=Math.max(0,current.at-previous.at);
        const sample={action:current.action,code:current.code,latency,piece:placement.piece};
        (byInput[current.action]??=[]).push(sample);
      }
    }
    const candidates=Object.entries(byInput).map(([action,samples])=>{
      if(samples.length<3)return null;
      const sorted=samples.map(s=>s.latency).sort((a,b)=>a-b);
      const median=sorted[Math.floor(sorted.length/2)];
      const contexts={};
      for(const s of samples)(contexts[s.piece]??=[]).push(s);
      const context=Object.entries(contexts)
        .filter(([,list])=>list.length>=2)
        .map(([piece,list])=>{
          const vals=list.map(s=>s.latency).sort((a,b)=>a-b);
          return {piece,median:vals[Math.floor(vals.length/2)],count:list.length};
        })
        .sort((a,b)=>b.median-a.median)[0]||null;
      return {action,samples,median,context};
    }).filter(Boolean).sort((a,b)=>b.median-a.median);
    const slow=candidates[0]||null;
    const slowSample=slow?.context
      ?slow.samples.find(s=>s.piece===slow.context.piece)
      :slow?.samples[0];
    return {
      ready:rhythmIntervals.length>=3,
      averageMs:rhythmIntervals.length?Math.round(rhythmIntervals.reduce((sum,ms)=>sum+ms,0)/rhythmIntervals.length):0,
      slowestInput:slow?{
        action:slow.action,
        code:slowSample?.code||null,
        piece:slow.context?.piece||slowSample?.piece||null,
        gapMs:Math.round(slow.median)
      }:null
    };
  }
  finish(piece,at){this.place(piece,at);}
}