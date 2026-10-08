import { Trainer } from './engine.js';
import mode from './mode.js';
import { getSettings, mountSettings } from './settings.js';
import { runTrainerSelfTest } from './self-test.js';
import { cellsFor } from './pieces.js';

const settings=getSettings();
const colorOnlyFocalPiece=localStorage.getItem('180180.colorOnlyFocalPiece')==='1';
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
  colorOnlyFocalPiece
});
window.trainer=trainer;
const title=document.getElementById('miniHomeTitle');
const number=document.getElementById('miniHomeNumber');
const description=document.getElementById('miniHomeDescription');
if(title)title.textContent=mode.name;
if(number)number.textContent=mode.number;
if(description)description.textContent=mode.description;
document.title='180180 — '+mode.name;
const score=document.getElementById('hudScore');
const lines=document.getElementById('hudLines');
const combo=document.getElementById('hudCombo');
const b2b=document.getElementById('hudB2B');
const pieces=document.getElementById('hudPieces');
const hold=document.getElementById('holdPreview');
const next=document.getElementById('nextPreview');
function miniPiece(type){
  if(!type)return '';
  const cells=cellsFor(type,0);
  const minX=Math.min(...cells.map(([x])=>x)), maxX=Math.max(...cells.map(([x])=>x));
  const minY=Math.min(...cells.map(([,y])=>y)), maxY=Math.max(...cells.map(([,y])=>y));
  const w=maxX-minX+1,h=maxY-minY+1;
  const colors={I:'#8bd5ff',O:'#ffe68a',T:'#d7a1ff',S:'#8be7a7',Z:'#ff8d9c',J:'#73a9ff',L:'#ffb05f'};
  const color=colors[type]||'#eee8fb';
  const blocks=cells.map(([x,y])=>'<span class="mini-block" style="grid-column:'+(x-minX+1)+';grid-row:'+(y-minY+1)+';display:block;width:8px;height:8px;background:'+color+';border:1px solid '+color+';box-sizing:border-box;border-radius:1px"></span>').join('');
  return '<span class="mini-piece" aria-label="'+type+' piece"><span class="mini-grid mini-grid-'+w+'x'+h+'">'+blocks+'</span></span>';
}
function renderState(state){
  if(score)score.textContent=String(state.stats.score);
  if(lines)lines.textContent=String(state.lines);
  if(combo)combo.textContent=state.combo<0?'—':String(state.combo);
  if(b2b)b2b.textContent=state.b2b?'ON':'—';
  if(pieces)pieces.textContent=String(state.stats.piecesPlaced);
  if(hold)hold.innerHTML=miniPiece(state.hold);
  if(next){const count=Math.max(1,Math.min(15,Number(trainer.nextQueueSize)||5));next.innerHTML=state.queue.slice(0,count).map(miniPiece).join('');}
}
trainer.options.onState=renderState;
trainer.emitState();
trainer.setToastCallback(message=>{const toast=document.getElementById('toast');if(toast){toast.textContent=message;toast.hidden=false;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.hidden=true,1400);}});
window.addEventListener('keydown',e=>trainer.handleKeydown(e),true);
window.addEventListener('keyup',e=>trainer.handleKeyup(e),true);
window.addEventListener('blur',()=>trainer.handleBlur());
document.getElementById('restartButton')?.addEventListener('click',()=>trainer.reset());
document.getElementById('holdButton')?.addEventListener('click',()=>trainer.hold());
mountSettings({trainer});
window.dispatchEvent(new Event('trainerready'));
runTrainerSelfTest();
trainer.start();
