// Application entry point. The trainer owns gameplay; the trainer page mounts its own settings controller.
import { Trainer } from './trainer/core-engine.js';
import { getModeById } from './modes/modes.js';
import { getSettings } from './settings.js';

(() => {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;
  const modeId = new URLSearchParams(window.location.search).get('mode') || 'mode-01';
  const mode = getModeById(modeId);
  if (!mode) { window.location.href = 'index.html'; return; }

  const settings = getSettings();
  const titleEl = document.querySelector('.brand-title');
  const taglineEl = document.querySelector('.tagline');
  if (titleEl) titleEl.textContent = mode.name;
  if (taglineEl) taglineEl.textContent = mode.description;

  // Mode-specific presentation. Mode 01 retains its existing trainer presentation.
  if (mode.id === 'mode-02') {
    document.title = '180180 — JOL CHUNKS';
    const concept = document.getElementById('concept');
    const conceptImage = document.getElementById('conceptImage');
    const conceptText = document.getElementById('conceptText');
    const guideTitle = document.getElementById('guideTitle');
    const guideSubtitle = document.getElementById('guideSubtitle');
    const guideKicker = document.getElementById('guideKicker');
    const guideHeading = document.getElementById('guideHeading');
    const guideIntro = document.getElementById('guideIntro');
    const guideExerciseKicker = document.getElementById('guideExerciseKicker');
    const guideExercise = document.getElementById('guideExercise');
    if (concept) concept.setAttribute('aria-label', 'JOL chunks training concept');
    if (conceptImage) {
      conceptImage.src = 'assets/jol-chunks.svg';
      conceptImage.alt = 'J, O, and L tetrominoes in the repeating JOL chunk sequence';
    }
    if (conceptText) conceptText.textContent = 'Build automatic recognition of the ordered J → O → L chunk.';
    if (guideTitle) guideTitle.textContent = 'JOL';
    if (guideSubtitle) guideSubtitle.textContent = 'CHUNKS';
    if (guideKicker) guideKicker.textContent = 'JOL practice';
    if (guideHeading) guideHeading.textContent = 'JOL CHUNKS';
    if (guideIntro) guideIntro.textContent = 'A JOL chunk is one ordered three-piece unit: J → O → L. The sequence repeats continuously.';
    if (guideExerciseKicker) guideExerciseKicker.textContent = 'the exercise';
    if (guideExercise) guideExercise.textContent = 'Do not wait for a normal 7-bag. Learn the three-piece rhythm itself: J, then O, then L, then immediately back to J.';
  }

  const trainer = new Trainer(boardEl, {
    mode,
    depth: settings.depth,
    softScale: settings.softScale,
    shadowOpacity: settings.shadowOpacity,
    shadowBrightness: settings.shadowBrightness,
    das: settings.das,
    arr: settings.arr,
    onTurn: turns => { const el=document.getElementById('turns'); if(el) el.textContent=turns; },
    onPlace: placed => { const el=document.getElementById('placed'); if(el) el.textContent=placed; },
    onReset: () => {
      document.getElementById('turns')?.replaceChildren('0');
      document.getElementById('placed')?.replaceChildren('0');
    }
  });

  trainer.depth=settings.depth;
  trainer.softScale=settings.softScale;
  trainer.shadowOpacity=settings.shadowOpacity;
  trainer.shadowBrightness=settings.shadowBrightness;
  trainer.rules.das=settings.das;
  trainer.rules.arr=settings.arr;
  trainer.binds={...trainer.binds,...settings.binds};

  let toastTimer;
  const showToast = message => {
    const toast=document.getElementById('toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1500);
  };
  trainer.say=showToast;

  document.getElementById('reset')?.addEventListener('click',()=>trainer.reset());

  let lastBonusBreakToken=0;
  let lastBonusValue=Number.NaN;
  function updateBonus(){
    const meter=document.getElementById('bonusMeter'); const number=document.getElementById('bonusNumber'); const liquid=document.getElementById('bonusLiquid');
    if(!meter||!number)return;
    const active=mode.id==='mode-01'; meter.hidden=!active; if(!active)return;
    const bonus=Math.max(0,Math.min(100,Number(trainer.session?.bonus??0)));
    const increased=Number.isFinite(lastBonusValue)&&bonus>lastBonusValue;
    number.textContent=String(Math.floor(bonus)); if(liquid){liquid.style.width=`${bonus}%`;if(increased){liquid.classList.remove("boosting");void liquid.offsetWidth;liquid.classList.add("boosting");setTimeout(()=>liquid.classList.remove("boosting"),520);}}
    lastBonusValue=bonus;
    const token=Number(trainer.session?.bonusBreakToken??0);
    if(token!==lastBonusBreakToken){lastBonusBreakToken=token;meter.classList.remove('breaking');void meter.offsetWidth;meter.classList.add('breaking');setTimeout(()=>meter.classList.remove('breaking'),340);}
  }

  function updateOrientation(){
    const el=document.getElementById('orient'); const name=document.getElementById('orientName');
    if(!el||!name)return;
    const arrows=['↑','→','↓','←']; const names=['Spawn','Right','180°','Left']; const o=trainer.piece?trainer.piece.o:0;
    el.textContent=arrows[o]; name.textContent=names[o];
  }

  const originalRender=trainer.render.bind(trainer);
  trainer.render=function(){originalRender();updateOrientation();updateBonus();};

  const settingsOpen=()=>document.body.classList.contains('settings-open');
  window.addEventListener('keydown',e=>{
    if(settingsOpen())return;
    trainer.handleKeydown(e);
  },{passive:false});
  window.addEventListener('keyup',e=>{
    if(settingsOpen())return;
    trainer.handleKeyup(e);
  });
  window.addEventListener('blur',()=>trainer.handleBlur());

  window.trainer=trainer;
  window.dispatchEvent(new CustomEvent('trainerready',{detail:trainer}));

  function tick(t){trainer.tick(t);requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
})();