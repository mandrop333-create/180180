import { Trainer } from './engine.js';
import mode from './mode.js';
import { getSettings, mountSettings, keyLabel } from './settings.js';
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
  const originalSide=document.querySelector('.trainer-layout > .trainer-side');
  const card=originalSide?.querySelector('.trainer-card');
  if(!originalSide||!card||statsDashboard)return;
  originalSide.classList.add('regular-stats-side');
  const nextSide=[...document.querySelectorAll('.trainer-layout > .trainer-side')].find(el=>el!==originalSide);
  if(nextSide)nextSide.classList.add('next-side');

  statsDashboard=document.createElement('section');statsDashboard.className='session-stats';statsDashboard.setAttribute('aria-label','Session performance breakdown');
  statsDashboard.innerHTML='<div class="b2b-hero" aria-live="polite"><div class="b2b-hero-label">BACK-TO-BACK CHAIN</div><div class="b2b-hero-count"><strong id="statB2BCurrent">0</strong><span id="statB2BLabel">CHAIN READY</span></div><div class="b2b-hero-meta" id="statB2BMeta">Land a Tetris or a line-clearing T-spin to start your chain.</div><div class="b2b-milestones"><span data-b2b-milestone="2">B2B ×2</span><span data-b2b-milestone="3">B2B ×3</span><span data-b2b-milestone="5">B2B ×5</span><span data-b2b-milestone="10">B2B ×10</span></div></div><div class="session-stats-head"><strong>USEFUL SESSION METRICS</strong><span id="statsSessionStatus">IN PROGRESS</span></div><div class="session-stats-grid"><div class="session-stat"><span>Score</span><strong id="statScore">0</strong><small>Current run score</small></div><div class="session-stat"><span>Lines cleared</span><strong id="statLines">0</strong><small>Total lines removed</small></div><div class="session-stat"><span>Pieces placed</span><strong id="statPieces">0</strong><small>Locked pieces this run</small></div><div class="session-stat"><span>Current combo</span><strong id="statCombo">—</strong><small>Consecutive line clears</small></div><div class="session-stat"><span>Best B2B chain</span><strong id="statB2BBest">0</strong><small id="statB2BTotal">0 bonus clears this run</small></div><div class="session-stat session-stat-wide"><span>Finesse efficiency</span><strong id="statInputEfficiency">—</strong><small id="statInputDetail">Enable Finesse Trainer to measure minimum-input placements</small><div class="stat-progress" role="progressbar" aria-label="Finesse efficiency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="statEfficiencyBar"><span></span></div></div><div class="session-stat"><span>Move / rotate inputs per piece</span><strong id="statInputPerPiece">0.00</strong><small>Average deliberate inputs per locked piece</small></div><div class="session-stat"><span>Drop distance</span><strong id="statDropRows">0</strong><small>Rows descended by soft or hard drop</small></div><div class="session-stat"><span>Tetrises</span><strong id="statTetrises">0</strong><small>Four-line clears</small></div><div class="session-stat"><span>T-spins</span><strong id="statTspins">0</strong><small>Detected T-spin placements</small></div><div class="session-stat"><span>Tetris rate</span><strong id="statTetrisRate">—</strong><small>Share of cleared lines from Tetrises</small></div><div class="session-stat"><span>Tetris drought</span><strong id="statDrought">0</strong><small>Pieces placed since last Tetris</small></div><div class="session-stat"><span>Burn lines</span><strong id="statBurnLines">0</strong><small>Non-Tetris lines cleared since last Tetris</small></div></div>';
  const layout=document.querySelector('.trainer-layout');const bonusAside=document.createElement('aside');bonusAside.className='trainer-side bonus-stats-side';bonusAside.setAttribute('aria-label','Bonus and session stats');const bonusCard=document.createElement('section');bonusCard.className='trainer-card';const bonusHeading=document.createElement('div');bonusHeading.className='stats-panel-heading';const bonusTitle=document.createElement('h2');bonusTitle.textContent='RUN STATS';const statsToggle=document.createElement('button');statsToggle.type='button';statsToggle.className='stats-collapse-toggle';statsToggle.textContent='−';statsToggle.setAttribute('aria-label','Collapse run stats');statsToggle.setAttribute('aria-expanded','true');statsToggle.setAttribute('aria-controls','runStatsContent');statsDashboard.id='runStatsContent';statsToggle.addEventListener('click',()=>{const collapsed=!statsDashboard.classList.contains('stats-hidden');if(collapsed){statsDashboard.classList.add('stats-hidden');statsDashboard.style.setProperty('display','none','important');bonusAside.classList.add('stats-collapsed');}else{statsDashboard.classList.remove('stats-hidden');statsDashboard.style.removeProperty('display');bonusAside.classList.remove('stats-collapsed');}statsToggle.textContent=collapsed?'+':'−';statsToggle.setAttribute('aria-expanded',String(!collapsed));statsToggle.setAttribute('aria-label',collapsed?'Expand run stats':'Collapse run stats');statsDashboard.setAttribute('aria-hidden',String(collapsed));});bonusHeading.append(bonusTitle,statsToggle);bonusCard.appendChild(bonusHeading);bonusCard.appendChild(statsDashboard);bonusAside.appendChild(bonusCard);const holdCard=[...originalSide.querySelectorAll('.trainer-card')].find(el=>el.querySelector('h2')?.textContent.trim().toLowerCase()==='hold');const holdAside=document.createElement('aside');holdAside.className='trainer-side hold-side';holdAside.setAttribute('aria-label','Hold piece');if(holdCard)holdAside.appendChild(holdCard);const rhythmCard=document.getElementById('rhythmCard');if(rhythmCard)holdAside.appendChild(rhythmCard);const boardColumn=layout?.querySelector('.board-column');if(boardColumn)layout.insertBefore(holdAside,boardColumn);if(layout)layout.insertBefore(bonusAside,originalSide);card.remove();originalSide.remove();
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
  if(b2b){b2b.textContent=state.b2b?'B2B ×'+(state.stats.b2bCurrent||1):'READY';b2b.title=state.b2b?'Current back-to-back chain: '+(state.stats.b2bCurrent||1)+' qualifying clears.':'Make a Tetris or spin clear to start a back-to-back chain.';b2b.setAttribute('aria-label',b2b.title);}
  if(pieces)pieces.textContent=String(state.stats.piecesPlaced);
  if(hudFinesse)hudFinesse.textContent=String(state.stats.finesseFaults)+' flagged · '+String(state.stats.finessePerfect)+' efficient';
  const s=state.stats||{},placed=Math.max(0,Number(s.piecesPlaced)||0),cleared=Math.max(0,Number(s.linesCleared)||0),efficient=Math.max(0,Number(s.finessePerfect)||0),faults=Math.max(0,Number(s.finesseFaults)||0),attempts=efficient+faults,efficiency=attempts?Math.round(efficient/attempts*100):0;
  setStat('statScore',s.score||0);setStat('statLines',cleared);setStat('statPieces',placed);setStat('statCombo',state.combo>=0?state.combo:'—');
  setStat('statB2BCurrent',s.b2bCurrent||0);setStat('statB2BLabel',s.b2bCurrent?(s.b2bCurrent===1?'CHAIN STARTED':'CHAIN ×'+s.b2bCurrent):'CHAIN READY');setStat('statB2BMeta',s.b2bCurrent?'Keep landing Tetrises or line-clearing T-spins. No-clear placements keep the chain alive.':'A Tetris or line-clearing T-spin starts the chain. A non-B2B line clear breaks it.');setStat('statB2BBest',s.b2bBest||0);setStat('statB2BTotal',String(s.b2bClears||0)+' bonus clears this run');document.querySelectorAll('[data-b2b-milestone]').forEach(el=>el.classList.toggle('reached',(s.b2bBest||0)>=Number(el.getAttribute('data-b2b-milestone'))));
  setStat('statInputEfficiency',attempts?efficiency+'%':'—');setStat('statInputDetail',attempts?efficient+' clean placements · '+faults+' faults':'Enable Finesse Trainer to measure minimum-input placements');setStat('statInputPerPiece',placed?(Number(s.totalPieceInputs||0)/placed).toFixed(2):'0.00');
  const bar=document.querySelector('#statEfficiencyBar span'),progress=document.getElementById('statEfficiencyBar');if(bar)bar.style.width=efficiency+'%';if(progress)progress.setAttribute('aria-valuenow',String(efficiency));
  setStat('statDropRows',(s.softDropRows||0)+(s.hardDropRows||0));setStat('statTetrises',s.tetrises||0);setStat('statTspins',s.tspins||0);setStat('statTetrisRate',cleared?Math.round(((s.tetrises||0)*4/cleared)*100)+'%':'—');setStat('statDrought',s.piecesSinceTetris||0);setStat('statBurnLines',s.burnLines||0);setStat('statsSessionStatus',state.gameOver?'GAME OVER':'IN PROGRESS');
  renderFinesse(state);
  if(hold)hold.innerHTML=miniPiece(state.hold,colorOnlyHoldEnabled);
  if(next)next.innerHTML=state.queue.slice(0,5).map(type=>miniPiece(type,colorOnlyNextEnabled)).join('');
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
// The exhaustive planner self-test is opt-in so it never competes with
// real-time training during ordinary startup. Run with ?selftest=1 when needed.
if (new URLSearchParams(window.location.search).get('selftest') === '1') {
  import('./self-test.js')
    .then(({ runTrainerSelfTest }) => {
      const result = runTrainerSelfTest();
      console.info('180180 trainer self-test passed:', result);
    })
    .catch(error => {
      console.error('180180 trainer self-test failed:', error);
    });
}
trainer.start();
