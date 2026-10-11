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
let statsDashboard=null;
function mountStatsDashboard(){
  const card=document.querySelector('.trainer-side .trainer-card');
  if(!card||statsDashboard)return;
  const style=document.createElement('style');
  style.textContent='.session-stats{margin-top:12px;padding-top:12px;border-top:1px solid #403450}.session-stats-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:10px}.session-stats-head strong{color:#e9ddff;font:900 10px ui-monospace,monospace;letter-spacing:.12em}.session-stats-head span{color:#9185a7;font:700 9px ui-monospace,monospace}.session-stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.session-stat{min-width:0;padding:9px 8px;border:1px solid #393047;border-radius:9px;background:linear-gradient(145deg,#191522,#100e16)}.session-stat span{display:block;color:#91879e;font:800 8px/1.25 ui-monospace,monospace;letter-spacing:.09em;text-transform:uppercase}.session-stat strong{display:block;margin-top:6px;color:#f0eaff;font:900 15px/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}.session-stat small{display:block;margin-top:5px;color:#81778b;font:600 9px/1.3 system-ui,sans-serif}.session-stat-wide{grid-column:1/-1}.stat-progress{height:4px;margin-top:8px;border-radius:99px;background:#0c0a10;overflow:hidden}.stat-progress span{display:block;width:0;height:100%;border-radius:99px;background:linear-gradient(90deg,#6bc9d9,#b9a0ff);transition:width .2s ease}#hudB2B{font-size:11px}';
  document.head.appendChild(style);
  statsDashboard=document.createElement('section');statsDashboard.className='session-stats';statsDashboard.setAttribute('aria-label','Session performance breakdown');
  statsDashboard.innerHTML='<div class="session-stats-head"><strong>SESSION BREAKDOWN</strong><span id="statsSessionStatus">IN PROGRESS</span></div><div class="session-stats-grid"><div class="session-stat"><span>Lines / piece</span><strong id="statLinesPerPiece">0.00</strong><small>Average lines per placement</small></div><div class="session-stat"><span>Clear rate</span><strong id="statClearRate">0%</strong><small>Placements clearing a line</small></div><div class="session-stat"><span>Rotations</span><strong id="statRotations">0</strong><small id="statHalfTurns">0 half-turns</small></div><div class="session-stat"><span>Drop distance</span><strong id="statDropRows">0</strong><small>Rows descended manually</small></div><div class="session-stat session-stat-wide"><span>Input efficiency</span><strong id="statInputEfficiency">—</strong><small id="statInputDetail">Place a few pieces to establish a baseline</small><div class="stat-progress" role="progressbar" aria-label="Input efficiency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="statEfficiencyBar"><span></span></div></div><div class="session-stat"><span>Tetrises</span><strong id="statTetrises">0</strong><small>Four-line clears</small></div><div class="session-stat"><span>T-spins</span><strong id="statTspins">0</strong><small>Detected spin placements</small></div><div class="session-stat"><span>Perfect clears</span><strong id="statPerfectClears">0</strong><small>Board emptied by a clear</small></div><div class="session-stat"><span>Soft / hard drop</span><strong id="statDropSplit">0 / 0</strong><small>Rows descended manually</small></div></div>';
  card.appendChild(statsDashboard);
}
function setStat(id,value){const el=document.getElementById(id);if(el)el.textContent=String(value);}
mountStatsDashboard();
const rhythmCard=document.getElementById('rhythmCard');
const rhythmReport=document.getElementById('rhythmReport');
function clearRhythmReport(){if(rhythmCard)rhythmCard.hidden=true;if(rhythmReport)rhythmReport.innerHTML='';}
function renderFinesse(state){
  if(!finessePrompt)return;
  const steps=state.finesse||[];
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
    const status=step.state==='done'?'Completed ':step.state==='next'?'Required ':'Pending ';
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
  if(b2b){b2b.textContent=state.b2b?'ACTIVE':'READY';b2b.title=state.b2b?'Back-to-back bonus is armed: another difficult clear can continue the chain.':'Ready: make a Tetris or qualifying spin clear to start a chain.';b2b.setAttribute('aria-label',b2b.title);}
  if(pieces)pieces.textContent=String(state.stats.piecesPlaced);
  if(hudFinesse)hudFinesse.textContent=String(state.stats.finesseFaults)+' flagged · '+String(state.stats.finessePerfect)+' efficient';
  const s=state.stats||{},placed=Math.max(0,Number(s.piecesPlaced)||0),cleared=Math.max(0,Number(s.linesCleared)||0),efficient=Math.max(0,Number(s.finessePerfect)||0),faults=Math.max(0,Number(s.finesseFaults)||0),attempts=efficient+faults,efficiency=attempts?Math.round(efficient/attempts*100):0;
  setStat('statLinesPerPiece',placed?(cleared/placed).toFixed(2):'0.00');
  setStat('statClearRate',placed?Math.round((Number(s.piecesWithLineClear||0)/placed)*100)+'%':'0%');
  setStat('statRotations',s.rotations||0);setStat('statHalfTurns',(s.halfTurns||0)+' half-turns');
  setStat('statDropRows',(s.softDropRows||0)+(s.hardDropRows||0));setStat('statInputEfficiency',attempts?efficiency+'%':'—');
  setStat('statInputDetail',attempts?efficient+' efficient · '+faults+' flagged':'Place a few pieces to establish a baseline');
  const bar=document.querySelector('#statEfficiencyBar span'),progress=document.getElementById('statEfficiencyBar');if(bar)bar.style.width=efficiency+'%';if(progress)progress.setAttribute('aria-valuenow',String(efficiency));
  setStat('statTetrises',s.tetrises||0);setStat('statTspins',s.tspins||0);setStat('statPerfectClears',s.perfectClears||0);setStat('statDropSplit',(s.softDropRows||0)+' / '+(s.hardDropRows||0));setStat('statsSessionStatus',state.gameOver?'GAME OVER':'IN PROGRESS');
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
