import { Trainer } from './engine.js';
import mode from './mode.js';
import { getSettings, mountSettings, keyLabel } from './settings.js';
import { runTrainerSelfTest } from './self-test.js';
import { cellsFor } from './pieces.js';

const settings=getSettings();
const colorOnlyFocalPiece=localStorage.getItem('180180.colorOnlyFocalPiece')==='1';
const calculateRhythm=localStorage.getItem('180180.calculateRhythm')==='1';
const board=document.getElementById('board');
const trainer=new Trainer(board,{
  mode,
  depth:settings.depth,
  softScale:settings.softScale,
  shadowOpacity:settings.shadowOpacity,
  shadowBrightness:settings.shadowBrightness,
  das:settings.das,
  arr:settings.arr,
  dcd:settings.dcd,
  lockDelay:settings.lockDelay,
  safeLock:settings.safeLock,
  cancelDas:settings.cancelDas,
  preferSoftDrop:settings.preferSoftDrop,
  colorOnlyFocalPiece,
  calculateRhythm,
  finesseEnabled:settings.finesse
});
window.trainer=trainer;
const title=document.getElementById('miniHomeTitle');
const number=document.getElementById('miniHomeNumber');
const description=document.getElementById('miniHomeDescription');
if(title)title.textContent=mode.name;
if(number)number.textContent=mode.number;
if(description)description.textContent=mode.description;
const score=document.getElementById('hudScore');
const lines=document.getElementById('hudLines');
const combo=document.getElementById('hudCombo');
const b2b=document.getElementById('hudB2B');
const pieces=document.getElementById('hudPieces');
const hold=document.getElementById('holdPreview');
const next=document.getElementById('nextPreview');
const finessePrompt=document.getElementById('finessePrompt');
const hudFinesse=document.getElementById('hudFinesse');
const rhythmCard=document.getElementById('rhythmCard');
const rhythmReport=document.getElementById('rhythmReport');
function clearRhythmReport(){if(rhythmCard)rhythmCard.hidden=true;if(rhythmReport)rhythmReport.innerHTML='';}
function renderFinesse(state){
  if(!finessePrompt)return;
  // Prefer the executable guide when available so soft-drop navigation
  // appears in the right order without becoming a finesse-scoring action.
  const steps=state.finesseGuide?.length?state.finesseGuide:(state.finesse||[]);
  if(!steps.length){
    finessePrompt.hidden=true;
    finessePrompt.innerHTML='';
    return;
  }
  finessePrompt.hidden=false;
  finessePrompt.innerHTML='';
  const faulted=!!state.finesseState?.faulted;
  steps.forEach((step,index)=>{
    if(index)finessePrompt.appendChild(document.createTextNode(' '));
    const el=document.createElement('span');
    el.className='finesse-key '+step.state+(faulted?' faulted':'');
    el.textContent=step.label;
    const status=step.state==='done'?'Completed ':step.state==='next'?'Required ':step.state==='navigation'?'Navigation ':'Pending ';
    el.setAttribute('aria-label',status+step.label+(faulted?' — placement has a finesse fault':''));
    finessePrompt.appendChild(el);
  });
}
function renderRhythmReport(report){
  if(!rhythmCard||!rhythmReport)return;
  rhythmCard.hidden=false;
  if(!report?.ready){rhythmReport.innerHTML='<div class="rhythm-metric"><span>STATUS</span><strong>Not enough placements</strong></div>';return;}
  const slow=report.slowestInput;
  const slowControl=slow?.code?keyLabel(slow.code):(slow?.action||'Not enough input data');
  const slowText=slow?(slowControl+(slow.piece?' ('+slow.piece+')':'')):'Not enough input data';
  rhythmReport.innerHTML='<div class="rhythm-metric"><span>AVERAGE RHYTHM</span><strong>'+report.averageMs+' ms</strong></div><div class="rhythm-metric"><span>SLOWEST INPUT</span><strong>'+slowText+'</strong></div>';
}
function miniPiece(type,colorOnly=false){
  if(!type)return '';
  const cells=cellsFor(type,0);
  const minX=Math.min(...cells.map(([x])=>x)), maxX=Math.max(...cells.map(([x])=>x));
  const minY=Math.min(...cells.map(([,y])=>y)), maxY=Math.max(...cells.map(([,y])=>y));
  const w=maxX-minX+1,h=maxY-minY+1;
  const colors={I:'#8bd5ff',O:'#ffe68a',T:'#d7a1ff',S:'#8be7a7',Z:'#ff8d9c',J:'#73a9ff',L:'#ffb05f'};
  const color=colors[type]||'#eee8fb';
  if(colorOnly){
    const widthPx=w*8,heightPx=h*8,radius=Math.hypot(widthPx,heightPx)/2+1;
    return '<span class="mini-piece color-only-hold-piece" aria-label="'+type+' piece color only"><span style="display:block;width:'+Math.ceil(radius*2)+'px;height:'+Math.ceil(radius*2)+'px;border-radius:50%;background:'+color+';flex:0 0 auto"></span></span>';
  }
  const blocks=cells.map(([x,y])=>'<span class="mini-block" style="grid-column:'+(x-minX+1)+';grid-row:'+(y-minY+1)+';display:block;width:8px;height:8px;background:'+color+';border:1px solid '+color+';box-sizing:border-box;border-radius:1px"></span>').join('');
  return '<span class="mini-piece" aria-label="'+type+' piece"><span class="mini-grid mini-grid-'+w+'x'+h+'">'+blocks+'</span></span>';
}
let latestState=null;
let colorOnlyHoldEnabled=localStorage.getItem('180180.colorOnlyHold')==='1';
let colorOnlyNextEnabled=localStorage.getItem('180180.colorOnlyNext')==='1';
window.setColorOnlyHold=enabled=>{colorOnlyHoldEnabled=!!enabled;if(latestState)renderState(latestState);};
window.setColorOnlyNext=enabled=>{colorOnlyNextEnabled=!!enabled;if(latestState)renderState(latestState);};
function renderState(state){
  latestState=state;
  if(score)score.textContent=String(state.stats.score);
  if(lines)lines.textContent=String(state.lines);
  if(combo)combo.textContent=state.combo<0?'—':String(state.combo);
  if(b2b)b2b.textContent=state.b2b?'ON':'—';
  if(pieces)pieces.textContent=String(state.stats.piecesPlaced);
  if(hudFinesse)hudFinesse.textContent=String(state.stats.finesseFaults)+' faults · '+String(state.stats.finessePerfect)+' clean';
  renderFinesse(state);
  if(hold)hold.innerHTML=miniPiece(state.hold,colorOnlyHoldEnabled);
  if(next){const count=Math.max(1,Math.min(15,Number(trainer.nextQueueSize)||5));next.innerHTML=state.queue.slice(0,count).map(type=>miniPiece(type,colorOnlyNextEnabled)).join('');}
}
trainer.options.onState=renderState;
trainer.options.onRhythmReport=renderRhythmReport;
trainer.options.onReset=reason=>{if(reason!=='gameover')clearRhythmReport();};
trainer.emitState();
trainer.setToastCallback(message=>{const toast=document.getElementById('toast');if(toast){toast.textContent=message;toast.hidden=false;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.hidden=true,1400);}});
window.addEventListener('keydown',e=>trainer.handleKeydown(e),true);
window.addEventListener('keyup',e=>trainer.handleKeyup(e),true);
window.addEventListener('blur',()=>trainer.handleBlur());
document.getElementById('restartButton')?.addEventListener('click',()=>trainer.reset());
document.getElementById('holdButton')?.addEventListener('click',()=>trainer.hold());
mountSettings({trainer});
window.dispatchEvent(new Event('trainerready'));
try{
  runTrainerSelfTest();
}catch(error){
  console.error('180180 trainer self-test failed; continuing startup:',error);
}
trainer.start();
