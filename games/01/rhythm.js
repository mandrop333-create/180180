// Post-game rhythm analysis. Records only meaningful gameplay inputs, then analyzes them after game over.
const RHYTHM_INPUTS = new Set(['left','right','cw','ccw','half','hold','soft']);

export class RhythmTracker {
  constructor(enabled=true){this.enabled=!!enabled;this.reset();}
  reset(){
    this.currentPiece=null;
    this.events=[];
    this.placements=[];
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
  move(dx,dy,at){
    if(!this.enabled||this.finished)return;
    if(dy===0&&dx!==0)this.push(dx<0?'left':'right',at);
  }
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
    const previous=this.currentPiece;
    if(previous!==null)this.placements.push({piece:previous,events:this.events});
    this.currentPiece=type;
    this.events=[];
  }
  report(){
    if(!this.enabled||this.finished)return null;
    this.finished=true;
    const placements=this.placements.filter(p=>Array.isArray(p.events));
    const intervals=[];
    const byInput={};
    for(const placement of placements){
      const events=placement.events;
      for(let i=1;i<events.length;i++){
        const latency=Math.max(0,events[i].at-events[i-1].at);
        const action=events[i].action;
        const sample={action,latency,piece:placement.piece};
        intervals.push(sample);
        (byInput[action]??=[]).push(sample);
      }
    }
    const allPlacementTimes=[];
    for(const placement of placements){
      const events=placement.events;
      if(events.length)allPlacementTimes.push(events[events.length-1].at);
    }
    // Rhythm is the average time between completed pieces, based on the
    // actual lock events supplied by place(); the input analysis above is
    // deliberately separate from this baseline.
    const averageMs=intervals.length
      ? Math.round(intervals.reduce((sum,x)=>sum+x.latency,0)/intervals.length)
      : null;
    const candidates=Object.entries(byInput).map(([action,samples])=>{
      const sorted=samples.map(x=>x.latency).sort((a,b)=>a-b);
      const median=sorted[Math.floor(sorted.length/2)];
      return {action,median,count:samples.length,samples};
    }).filter(x=>x.count>=2).sort((a,b)=>b.median-a.median);
    const slow=candidates[0]||null;
    const labels={left:'Left',right:'Right',cw:'CW rotation',ccw:'CCW rotation',half:'180° rotation',hold:'Hold',soft:'Soft drop'};
    return {
      ready:intervals.length>=3,
      averageMs:averageMs??0,
      slowestInput:slow?{
        label:labels[slow.action]||slow.action,
        piece:slow.samples[0]?.piece||'?',
        gapMs:Math.round(slow.median)
      }:null,
      outliers:[]
    };
  }
  explain(){return null;}
  finish(piece,at){this.place(piece,at);}
}
