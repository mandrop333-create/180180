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
  const originalSide=document.querySelector('.trainer-layout > .trainer-side');
  const card=originalSide?.querySelector('.trainer-card');
  if(!originalSide||!card||statsDashboard)return;
  originalSide.classList.add('regular-stats-side');
  const nextSide=[...document.querySelectorAll('.trainer-layout > .trainer-side')].find(el=>el!==originalSide);
  if(nextSide)nextSide.classList.add('next-side');
  const style=document.createElement('style');
  style.textContent='.b2b-hero{margin:10px 0;padding:12px;border:1px solid #5a4777;border-radius:11px;background:radial-gradient(ellipse at 80% 0%,#533b7544,transparent 55%),linear-gradient(135deg,#21182f,#100e16);position:relative;overflow:hidden}.b2b-hero-label{color:#b9a0ff;font:900 9px ui-monospace,monospace;letter-spacing:.16em}.b2b-hero-count{display:flex;align-items:baseline;gap:7px;margin-top:4px}.b2b-hero-count strong{font:950 32px/1 ui-monospace,monospace;color:#f0eaff;text-shadow:0 0 22px #b9a0ff55}.b2b-hero-count span{font:900 11px ui-monospace,monospace;color:#b9a0ff}.b2b-hero-meta{margin-top:7px;color:#a49ab5;font:700 9px/1.35 system-ui,sans-serif}.b2b-milestones{display:flex;gap:5px;margin-top:9px}.b2b-milestones span{flex:1;text-align:center;padding:4px 2px;border-radius:5px;background:#0c0a10;color:#665b77;font:900 8px ui-monospace,monospace;border:1px solid #30263e}.b2b-milestones span.reached{color:#e6d6ff;border-color:#8f6bc1;background:#332447}.session-stats{margin-top:12px;padding-top:12px;border-top:1px solid #403450}.session-stats-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:10px}.session-stats-head strong{color:#e9ddff;font:900 10px ui-monospace,monospace;letter-spacing:.12em}.session-stats-head span{color:#9185a7;font:700 9px ui-monospace,monospace}.session-stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.session-stat{min-width:0;padding:9px 8px;border:1px solid #393047;border-radius:9px;background:linear-gradient(145deg,#191522,#100e16)}.session-stat span{display:block;color:#91879e;font:800 8px/1.25 ui-monospace,monospace;letter-spacing:.09em;text-transform:uppercase}.session-stat strong{display:block;margin-top:6px;color:#f0eaff;font:900 15px/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}.session-stat small{display:block;margin-top:5px;color:#81778b;font:600 9px/1.3 system-ui,sans-serif}.session-stat-wide{grid-column:1/-1}.stat-progress{height:4px;margin-top:8px;border-radius:99px;background:#0c0a10;overflow:hidden}.stat-progress span{display:block;width:0;height:100%;border-radius:99px;background:linear-gradient(90deg,#6bc9d9,#b9a0ff);transition:width .2s ease}#hudB2B{font-size:11px}';
  style.textContent += ".bonus-stats-side{min-width:0;padding-top:54px}.bonus-stats-side>.trainer-card{padding:10px}.bonus-stats-side .session-stats{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:8px;margin:0;padding:0;border:0;align-items:start}.bonus-stats-side .session-stats-grid{display:contents}.bonus-stats-side .b2b-hero{grid-column:1;margin:0 0 7px;padding:9px}.bonus-stats-side .b2b-hero-count strong{font-size:26px}.bonus-stats-side .b2b-hero-meta{font-size:8px}.bonus-stats-side .b2b-milestones{flex-wrap:wrap;gap:4px}.bonus-stats-side .b2b-milestones span{flex:1 0 28px}.bonus-stats-side .session-stats-head{grid-column:2;grid-row:1;margin:0 0 7px;min-height:26px;align-items:center}.bonus-stats-side .session-stats-head strong{font-size:9px}.bonus-stats-side .session-stat{grid-column:2;min-width:0;padding:8px 6px}.bonus-stats-side .session-stat:has(#statB2BBest),.bonus-stats-side .session-stat:has(#statComboBest),.bonus-stats-side .session-stat:has(#statClearMix){grid-column:1}.bonus-stats-side .session-stat strong{font-size:12px;white-space:normal;overflow-wrap:anywhere}.bonus-stats-side .session-stat span{font-size:7px}.bonus-stats-side .session-stat small{font-size:8px}.bonus-stats-side .session-stat-wide{grid-column:2}.hold-side{min-width:0;padding-top:54px}.hold-side>.trainer-card{padding:9px}.hold-side .hold-preview{height:58px}.hold-side .action-button{padding:7px 4px}@media(min-width:1101px){.trainer-shell{width:min(1240px,100%)}.homepage-game-first .trainer-layout{grid-template-columns:minmax(265px,290px) minmax(145px,160px) 92px 300px 96px minmax(145px,160px);gap:10px;justify-content:center;align-items:start}.homepage-game-first .trainer-layout>.bonus-stats-side{grid-column:1;grid-row:1}.homepage-game-first .trainer-layout>.regular-stats-side{grid-column:2;grid-row:1}.homepage-game-first .trainer-layout>.hold-side{grid-column:3;grid-row:1}.homepage-game-first .trainer-layout>.board-column{grid-column:4;grid-row:1}.homepage-game-first .trainer-layout>.next-side{grid-column:5;grid-row:1}.homepage-game-first .trainer-layout>.rules-column{grid-column:6;grid-row:1;padding-top:54px}}@media(min-width:901px) and (max-width:1100px){.homepage-game-first .trainer-layout{grid-template-columns:minmax(230px,260px) minmax(140px,160px) 88px 300px 90px;gap:8px;justify-content:center}.homepage-game-first .trainer-layout>.bonus-stats-side{grid-column:1;grid-row:1}.homepage-game-first .trainer-layout>.regular-stats-side{grid-column:2;grid-row:1}.homepage-game-first .trainer-layout>.hold-side{grid-column:3;grid-row:1}.homepage-game-first .trainer-layout>.board-column{grid-column:4;grid-row:1}.homepage-game-first .trainer-layout>.next-side{grid-column:5;grid-row:1}.homepage-game-first .trainer-layout>.rules-column{grid-column:1/-1;grid-row:2;padding-top:0;display:grid;grid-template-columns:1fr 1fr}}@media(max-width:900px){.homepage-game-first .trainer-layout{grid-template-columns:minmax(0,1fr);justify-items:stretch;max-width:680px}.homepage-game-first .trainer-layout>.bonus-stats-side,.homepage-game-first .trainer-layout>.trainer-side,.homepage-game-first .trainer-layout>.hold-side,.homepage-game-first .trainer-layout>.board-column,.homepage-game-first .trainer-layout>.rules-column{grid-column:1;grid-row:auto;padding-top:0;margin-top:0}.homepage-game-first .trainer-layout>.board-column{order:-1}.bonus-stats-side .session-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.bonus-stats-side .session-stats-head{grid-column:2}.bonus-stats-side .session-stat{grid-column:2}.bonus-stats-side .session-stat:has(#statB2BBest),.bonus-stats-side .session-stat:has(#statComboBest),.bonus-stats-side .session-stat:has(#statClearMix){grid-column:1}.hold-side .hold-preview{height:58px}}";
  style.textContent += "@media(min-width:901px){.trainer-shell{width:min(980px,100%)!important;max-width:980px!important;margin-inline:auto!important}.homepage-game-first .trainer-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 92px 300px 96px minmax(0,1fr)!important;grid-auto-rows:auto;column-gap:12px;row-gap:18px;justify-content:stretch;align-items:start;width:100%;max-width:100%;}.homepage-game-first .trainer-layout>.hold-side{grid-column:2!important;grid-row:1!important;padding-top:54px;}.homepage-game-first .trainer-layout>.board-column{grid-column:3!important;grid-row:1!important;width:320px!important;max-width:320px!important;justify-self:center!important;}.homepage-game-first .trainer-layout>.next-side{grid-column:4!important;grid-row:1!important;padding-top:54px;}.homepage-game-first .trainer-layout>.bonus-stats-side{grid-column:1/-1!important;grid-row:2!important;padding-top:0!important;width:100%;}.homepage-game-first .trainer-layout>.regular-stats-side{grid-column:1/-1!important;grid-row:3!important;width:100%;}.homepage-game-first .trainer-layout>.rules-column{grid-column:1/-1!important;grid-row:4!important;padding-top:0!important;}.bonus-stats-side .session-stats{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}.bonus-stats-side .session-stats-grid{display:contents;}.bonus-stats-side .b2b-hero{grid-column:span 1!important;grid-row:auto!important;}.bonus-stats-side .session-stats-head{grid-column:span 3!important;grid-row:auto!important;min-height:0;align-self:center;}.bonus-stats-side .session-stat,.bonus-stats-side .session-stat:has(#statB2BBest),.bonus-stats-side .session-stat:has(#statComboBest),.bonus-stats-side .session-stat:has(#statClearMix),.bonus-stats-side .session-stat-wide{grid-column:auto!important;grid-row:auto!important;}.bonus-stats-side .session-stat-wide{grid-column:span 2!important;}.bonus-stats-side>.trainer-card{height:auto;}.regular-stats-side{display:grid;grid-template-columns:minmax(200px,300px) minmax(0,1fr);gap:12px;align-items:start;}.regular-stats-side>.trainer-card{margin:0;}.regular-stats-side #rhythmCard{margin:0;}}@media(max-width:900px){.trainer-shell{width:100%!important;max-width:680px!important;margin-inline:auto!important}.homepage-game-first .trainer-layout{display:grid!important;grid-template-columns:minmax(0,1fr)!important;justify-items:stretch;max-width:680px;width:100%;row-gap:12px}.homepage-game-first .trainer-layout>.board-column{grid-column:1!important;grid-row:1!important;order:0!important;width:100%!important;max-width:100%!important}.homepage-game-first .trainer-layout>.hold-side{grid-column:1!important;grid-row:2!important;order:1!important;padding-top:0;margin:0}.homepage-game-first .trainer-layout>.next-side{grid-column:1!important;grid-row:3!important;order:2!important;padding-top:0;margin:0}.homepage-game-first .trainer-layout>.bonus-stats-side{grid-column:1!important;grid-row:4!important;order:3!important;padding-top:0;margin:0;width:100%}.homepage-game-first .trainer-layout>.regular-stats-side{grid-column:1!important;grid-row:5!important;order:4!important;width:100%}.homepage-game-first .trainer-layout>.rules-column{grid-column:1!important;grid-row:6!important;order:5!important;padding-top:0}.bonus-stats-side .session-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.bonus-stats-side .session-stats-head{grid-column:1/-1!important}.bonus-stats-side .session-stat{grid-column:auto!important}.bonus-stats-side .session-stat-wide{grid-column:1/-1!important}.regular-stats-side{display:block}.regular-stats-side>.trainer-card{margin-bottom:12px}.hold-side .hold-preview{height:58px}}";
  style.textContent += "@media(min-width:901px){.homepage-game-first .trainer-layout>.bonus-stats-side>.trainer-card,.homepage-game-first .trainer-layout>.regular-stats-side>.trainer-card,.homepage-game-first .trainer-layout>.rules-column>.trainer-card{width:100%!important;max-width:none!important;box-sizing:border-box!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important}.homepage-game-first .trainer-layout>.bonus-stats-side .b2b-hero{grid-column:span 1!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stats-head{grid-column:span 3!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stat{grid-column:auto!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stat-wide{grid-column:span 2!important}}";
  style.textContent += "@media(min-width:901px){.homepage-game-first .trainer-layout{grid-template-columns:minmax(0,1fr) 92px 300px 96px minmax(0,1fr)!important}.homepage-game-first .trainer-layout>.bonus-stats-side,.homepage-game-first .trainer-layout>.regular-stats-side,.homepage-game-first .trainer-layout>.rules-column{width:100%!important;min-width:0!important;max-width:none!important;justify-self:stretch!important}.homepage-game-first .trainer-layout>.bonus-stats-side>.trainer-card,.homepage-game-first .trainer-layout>.regular-stats-side>.trainer-card,.homepage-game-first .trainer-layout>.rules-column>.trainer-card{width:100%!important;min-width:0!important;max-width:none!important;box-sizing:border-box!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stats-grid{display:contents!important}.homepage-game-first .trainer-layout>.bonus-stats-side .b2b-hero{grid-column:span 1!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stats-head{grid-column:span 3!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stat{grid-column:auto!important}.homepage-game-first .trainer-layout>.bonus-stats-side .session-stat-wide{grid-column:span 2!important}}";
  style.textContent += ".stats-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 8px}.stats-panel-heading h2{margin:0;min-width:0}.stats-collapse-toggle{display:inline-flex;align-items:center;justify-content:center;flex:0 0 32px;width:32px;height:30px;border:1px solid #514263;border-radius:8px;background:#17121f;color:#e9ddff;font:900 20px/1 system-ui,sans-serif;cursor:pointer}.stats-collapse-toggle:hover{background:#2a2038;border-color:#9a7ac5}.stats-collapse-toggle:focus-visible{outline:2px solid #b9a0ff;outline-offset:2px}.bonus-stats-side.stats-collapsed .session-stats{display:none!important}.bonus-stats-side.stats-collapsed>.trainer-card{padding-bottom:10px}.bonus-stats-side.stats-collapsed .stats-panel-heading{margin-bottom:0}@media(min-width:901px){.trainer-shell{width:min(980px,100%)!important;max-width:980px!important;margin-inline:auto!important}.trainer-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 92px 300px 96px minmax(0,1fr)!important;grid-auto-rows:auto;column-gap:12px;row-gap:18px;justify-content:stretch;align-items:start;width:100%;max-width:100%}.trainer-layout>.hold-side{grid-column:2!important;grid-row:1!important;padding-top:54px}.trainer-layout>.board-column{grid-column:3!important;grid-row:1!important;width:300px!important;max-width:300px!important;justify-self:center!important}.trainer-layout>.next-side{grid-column:4!important;grid-row:1!important;padding-top:54px}.trainer-layout>.bonus-stats-side{grid-column:1/-1!important;grid-row:2!important;padding-top:0!important;width:100%!important;min-width:0!important}.trainer-layout>.regular-stats-side{grid-column:1/-1!important;grid-row:3!important;width:100%!important;min-width:0!important}.trainer-layout>.rules-column{grid-column:5!important;grid-row:1!important;padding-top:54px!important;width:100%!important;min-width:0!important;align-self:start!important}.trainer-layout>.rules-column>.trainer-card{width:100%!important;max-width:none!important;box-sizing:border-box!important}.trainer-layout>.bonus-stats-side>.trainer-card,.trainer-layout>.regular-stats-side>.trainer-card,.trainer-layout>.rules-column>.trainer-card{width:100%!important;max-width:none!important;box-sizing:border-box!important}.trainer-layout>.bonus-stats-side .session-stats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}.trainer-layout>.bonus-stats-side .session-stats-grid{display:contents!important}.trainer-layout>.bonus-stats-side .b2b-hero{grid-column:span 1!important}.trainer-layout>.bonus-stats-side .session-stats-head{grid-column:span 3!important}.trainer-layout>.bonus-stats-side .session-stat{grid-column:auto!important}.trainer-layout>.bonus-stats-side .session-stat-wide{grid-column:span 2!important}.trainer-layout>.bonus-stats-side .session-stat strong{overflow-wrap:anywhere}.trainer-layout>.regular-stats-side{display:grid;grid-template-columns:minmax(200px,300px) minmax(0,1fr);gap:12px;align-items:start}.trainer-layout>.regular-stats-side>.trainer-card{margin:0}.trainer-layout>.regular-stats-side #rhythmCard{margin:0}}@media(max-width:900px){.trainer-shell{width:100%!important;max-width:680px!important;margin-inline:auto!important}.trainer-layout{display:grid!important;grid-template-columns:minmax(0,1fr)!important;justify-items:stretch;max-width:680px;width:100%;row-gap:12px}.trainer-layout>.board-column{grid-column:1!important;grid-row:1!important;order:0!important;width:100%!important;max-width:100%!important}.trainer-layout>.hold-side{grid-column:1!important;grid-row:2!important;order:1!important;padding-top:0!important;margin:0}.trainer-layout>.next-side{grid-column:1!important;grid-row:3!important;order:2!important;padding-top:0!important;margin:0}.trainer-layout>.bonus-stats-side{grid-column:1!important;grid-row:4!important;order:3!important;padding-top:0!important;margin:0;width:100%!important}.trainer-layout>.regular-stats-side{grid-column:1!important;grid-row:5!important;order:4!important;width:100%!important}.trainer-layout>.rules-column{grid-column:1!important;grid-row:6!important;order:5!important;padding-top:0!important}.trainer-layout>.bonus-stats-side .session-stats{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.trainer-layout>.bonus-stats-side .session-stats-head,.trainer-layout>.bonus-stats-side .session-stat-wide{grid-column:1/-1!important}.trainer-layout>.regular-stats-side{display:block}.trainer-layout>.regular-stats-side>.trainer-card{margin-bottom:12px}.hold-side .hold-preview{height:58px}}";
  document.head.appendChild(style);
  statsDashboard=document.createElement('section');statsDashboard.className='session-stats';statsDashboard.setAttribute('aria-label','Session performance breakdown');
  statsDashboard.innerHTML='<div class="b2b-hero" aria-live="polite"><div class="b2b-hero-label">BACK-TO-BACK CHAIN</div><div class="b2b-hero-count"><strong id="statB2BCurrent">0</strong><span id="statB2BLabel">CHAIN READY</span></div><div class="b2b-hero-meta" id="statB2BMeta">Land a Tetris or T-spin clear to start your streak.</div><div class="b2b-milestones"><span data-b2b-milestone="2">B2B ×2</span><span data-b2b-milestone="3">B2B ×3</span><span data-b2b-milestone="5">B2B ×5</span><span data-b2b-milestone="10">B2B ×10</span></div></div><div class="session-stats-head"><strong>SESSION BREAKDOWN</strong><span id="statsSessionStatus">IN PROGRESS</span></div><div class="session-stats-grid"><div class="session-stat"><span>Lines / piece</span><strong id="statLinesPerPiece">0.00</strong><small>Average lines per placement</small></div><div class="session-stat"><span>Clear rate</span><strong id="statClearRate">0%</strong><small>Placements clearing a line</small></div><div class="session-stat"><span>Rotations</span><strong id="statRotations">0</strong><small id="statHalfTurns">0 half-turns</small></div><div class="session-stat"><span>Drop distance</span><strong id="statDropRows">0</strong><small>Rows descended manually</small></div><div class="session-stat session-stat-wide"><span>Input efficiency</span><strong id="statInputEfficiency">—</strong><small id="statInputDetail">Place a few pieces to establish a baseline</small><div class="stat-progress" role="progressbar" aria-label="Input efficiency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="statEfficiencyBar"><span></span></div></div><div class="session-stat"><span>Best B2B chain</span><strong id="statB2BBest">0</strong><small id="statB2BTotal">0 bonus clears this run</small></div><div class="session-stat"><span>Best combo</span><strong id="statComboBest">0</strong><small>Consecutive line-clearing placements</small></div><div class="session-stat"><span>Singles / doubles / triples</span><strong id="statClearMix">0 / 0 / 0</strong><small>Clear type breakdown</small></div><div class="session-stat"><span>Tetrises</span><strong id="statTetrises">0</strong><small>Four-line clears</small></div><div class="session-stat"><span>T-spins</span><strong id="statTspins">0</strong><small>Detected spin placements</small></div><div class="session-stat"><span>Perfect clears</span><strong id="statPerfectClears">0</strong><small>Board emptied by a clear</small></div><div class="session-stat"><span>Soft / hard drop</span><strong id="statDropSplit">0 / 0</strong><small>Rows descended manually</small></div></div>';
  const layout=document.querySelector('.trainer-layout');const bonusAside=document.createElement('aside');bonusAside.className='trainer-side bonus-stats-side';bonusAside.setAttribute('aria-label','Bonus and session stats');const bonusCard=document.createElement('section');bonusCard.className='trainer-card';const bonusHeading=document.createElement('div');bonusHeading.className='stats-panel-heading';const bonusTitle=document.createElement('h2');bonusTitle.textContent='RUN STATS';const statsToggle=document.createElement('button');statsToggle.type='button';statsToggle.className='stats-collapse-toggle';statsToggle.textContent='−';statsToggle.setAttribute('aria-label','Collapse run stats');statsToggle.setAttribute('aria-expanded','true');statsToggle.setAttribute('aria-controls','runStatsContent');statsDashboard.id='runStatsContent';statsToggle.addEventListener('click',()=>{const collapsed=bonusAside.classList.toggle('stats-collapsed');statsToggle.textContent=collapsed?'+':'−';statsToggle.setAttribute('aria-expanded',String(!collapsed));statsToggle.setAttribute('aria-label',collapsed?'Expand run stats':'Collapse run stats');});bonusHeading.append(bonusTitle,statsToggle);bonusCard.appendChild(bonusHeading);bonusCard.appendChild(statsDashboard);bonusAside.appendChild(bonusCard);const holdCard=[...originalSide.querySelectorAll('.trainer-card')].find(el=>el.querySelector('h2')?.textContent.trim().toLowerCase()==='hold');const holdAside=document.createElement('aside');holdAside.className='trainer-side hold-side';holdAside.setAttribute('aria-label','Hold piece');if(holdCard){holdAside.appendChild(holdCard);const boardColumn=layout?.querySelector('.board-column');if(boardColumn)layout.insertBefore(holdAside,boardColumn);}if(layout)layout.insertBefore(bonusAside,originalSide);
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
  setStat('statB2BCurrent',s.b2bCurrent||0);setStat('statB2BLabel',s.b2bCurrent?(s.b2bCurrent===1?'CHAIN STARTED':'CHAIN ×'+s.b2bCurrent):'CHAIN READY');setStat('statB2BMeta',s.b2bCurrent?'Keep landing Tetrises or qualifying spins. No-clear placements keep the chain alive.':'A Tetris or qualifying spin clear starts the chain. Singles, doubles, or triples break it.');setStat('statB2BBest',s.b2bBest||0);setStat('statB2BTotal',String(s.b2bClears||0)+' bonus clears this run');setStat('statComboBest',s.comboBest||0);setStat('statClearMix',(s.singles||0)+' / '+(s.doubles||0)+' / '+(s.triples||0));document.querySelectorAll('[data-b2b-milestone]').forEach(el=>el.classList.toggle('reached',(s.b2bBest||0)>=Number(el.getAttribute('data-b2b-milestone'))));setStat('statLinesPerPiece',placed?(cleared/placed).toFixed(2):'0.00');
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
