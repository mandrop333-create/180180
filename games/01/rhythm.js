// Post-game rhythm analysis. Records only meaningful gameplay inputs, then analyzes them after game over.
const RHYTHM_INPUTS = new Set(['left','right','cw','ccw','half','hold','soft']);

export class RhythmTracker {
  constructor(enabled=true){this.enabled=!!enabled;this.reset();}
  reset(){
    this.events=[];
    this.placements=[];
    this.lastLockAt=null;
    this.finished=false;
  }
  now(value){return Number.isFinite(value)?value:performance.now();}
  push(action,at){
    if(!RHYTHM_INPUTS.has(action))return;
    const t=this.now(at);
    const last=this.events[this.events.length-1];
    if(last&&last.action===action&&t-last.at<8)return;
    this.events.push({action,at:t});
  }
  input(action,at){
    if(!this.enabled||this.finished)return;
    this.push(action,at);
  }
  move(){/* Horizontal DAS/ARR movement is not a new player input. Keydown is. */}
  rotate(delta,at){
    if(!this.enabled||this.finished)return;
    this.push(Math.abs(delta)===2?'half':delta>0?'cw':'ccw',at);
  }
  hold(at){
    if(this.enabled&&!this.finished)this.push('hold',at);
  }
  hardDrop(){/* Hard drop ends a placement; it is never a rhythm input. */}
  place(piece,at){
    if(!this.enabled||this.finished)return;
    const t=this.now(at);
    const type=piece?.type||'?';
    if(this.lastLockAt!==null){
      this.placements.push({
        piece:type,
        events:this.events,
        lockAt:t,
        intervalMs:t-this.lastLockAt
      });
    }else{
      this.placements.push({piece:type,events:this.events,lockAt:t,intervalMs:null});
    }
    this.lastLockAt=t;
    this.events=[];
  }
  report(){
    if(!this.enabled||this.finished)return null;
    this.finished=true;

    const placements=this.placements.filter(p=>Array.isArray(p.events));
    const rhythmIntervals=placements
      .map(p=>p.intervalMs)
      .filter(ms=>Number.isFinite(ms)&&ms>0);

    const inputSamples=[];
    const byInput={};

    for(const placement of placements){
      const events=placement.events;
      for(let i=1;i<events.length;i++){
        const sample={
          action:events[i].action,
          latency:Math.max(0,events[i].at-events[i-1].at),
          piece:placement.piece
        };
        inputSamples.push(sample);
        (byInput[sample.action]??=[]).push(sample);
      }
    }

    const labels={
      left:'Left',
      right:'Right',
      cw:'CW rotation',
      ccw:'CCW rotation',
      half:'180° rotation',
      hold:'Hold',
      soft:'Soft drop'
    };

    // A slow input means an input that repeatedly has a long delay before it.
    // Require three observations so one accidental pause cannot define the result.
    const candidates=Object.entries(byInput)
      .map(([action,samples])=>{
        const sorted=samples.map(x=>x.latency).sort((a,b)=>a-b);
        const median=sorted[Math.floor(sorted.length/2)];
        const contexts={};
        for(const sample of samples)(contexts[sample.piece]??=[]).push(sample.latency);
        const contextCandidates=Object.entries(contexts)
          .filter(([,values])=>values.length>=2)
          .map(([piece,values])=>{
            const s=[...values].sort((a,b)=>a-b);
            return {piece,median:s[Math.floor(s.length/2)],count:values.length};
          })
          .sort((a,b)=>b.median-a.median);
        return {action,median,count:samples.length,context:contextCandidates[0]||null};
      })
      .filter(x=>x.count>=3)
      .sort((a,b)=>b.median-a.median);

    const slow=candidates[0]||null;

    return {
      ready:rhythmIntervals.length>=3,
      averageMs:rhythmIntervals.length
        ?Math.round(rhythmIntervals.reduce((sum,ms)=>sum+ms,0)/rhythmIntervals.length)
        :0,
      slowestInput:slow?{
        label:labels[slow.action]||slow.action,
        piece:slow.context?.piece||slow.action,
        gapMs:Math.round(slow.median)
      }:null,
      outliers:[]
    };
  }
  explain(){return null;}
  finish(piece,at){this.place(piece,at);}
}
