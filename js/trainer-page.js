import { Trainer } from './trainer/engine.js';
import { getModeById } from './modes/modes.js';
import { getSettings } from './settings.js';

const modeId=new URLSearchParams(location.search).get('mode')||'mode-01';
const mode=getModeById(modeId)||getModeById('mode-01');
const board=document.getElementById('board');
const settings=getSettings();

const trainer=new Trainer(board,{
  mode,
  depth:settings.depth,
  softScale:settings.softScale,
  shadowOpacity:settings.shadowOpacity,
  shadowBrightness:settings.shadowBrightness,
  das:settings.das,
  arr:settings.arr,
  dcd:settings.dcd
});

window.trainer=trainer;
window.dispatchEvent(new Event('trainerready'));

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
const finesse=document.getElementById('hudFinesse');
const hold=document.getElementById('holdPreview');
const next=document.getElementById('nextPreview');

function miniPiece(type){
  if(!type)return '';
  return '<span class="mini-piece mini-'+type.toLowerCase()+'" aria-label="'+type+'">'+type+'</span>';
}
function renderState(state){
  if(score)score.textContent=String(state.stats.score);
  if(lines)lines.textContent=String(state.lines);
  if(combo)combo.textContent=state.combo<0?'—':String(state.combo);
  if(b2b)b2b.textContent=state.b2b?'ON':'—';
  if(pieces)pieces.textContent=String(state.stats.piecesPlaced);
  if(finesse)finesse.textContent=state.stats.rotations+'R / '+state.stats.halfTurns+' 180';
  if(hold)hold.innerHTML=miniPiece(state.hold);
  if(next)next.innerHTML=state.queue.slice(0,5).map(miniPiece).join('');
}
trainer.options.onState=renderState;
trainer.setToastCallback(message=>{const toast=document.getElementById('toast');if(toast){toast.textContent=message;toast.hidden=false;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.hidden=true,1400);}});

window.addEventListener('keydown',e=>trainer.handleKeydown(e),true);
window.addEventListener('keyup',e=>trainer.handleKeyup(e),true);
window.addEventListener('blur',()=>trainer.handleBlur());
document.getElementById('restartButton')?.addEventListener('click',()=>trainer.reset());
document.getElementById('holdButton')?.addEventListener('click',()=>trainer.hold());

trainer.start();
