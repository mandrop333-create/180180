// Application entry point. The trainer owns gameplay; mode metadata owns mode presentation.
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
  const training = mode.training || {};
  const titleEl = document.querySelector('.brand-title');
  const taglineEl = document.querySelector('.tagline');
  if (titleEl) titleEl.textContent = mode.name;
  if (taglineEl) taglineEl.textContent = mode.description;

  if (training.pageTitle) {
    document.title = training.pageTitle;
    document.getElementById('pageTitle')?.replaceChildren(training.pageTitle);
    document.getElementById('ogTitle')?.setAttribute('content', training.pageTitle);
    document.getElementById('twitterTitle')?.setAttribute('content', training.pageTitle);
  }
  if (training.description) {
    document.getElementById('pageDescription')?.setAttribute('content', training.description);
    document.getElementById('ogDescription')?.setAttribute('content', training.description);
    document.getElementById('twitterDescription')?.setAttribute('content', training.description);
  }

  const concept = document.getElementById('concept');
  const conceptImage = document.getElementById('conceptImage');
  const conceptText = document.getElementById('conceptText');
  if (training.conceptText && conceptText) conceptText.textContent = training.conceptText;
  if (training.conceptImage && conceptImage) {
    conceptImage.src = training.conceptImage;
    conceptImage.alt = training.conceptAlt || '';
    concept?.setAttribute('aria-label', `${mode.name} training concept`);
  }

  const guide = training.guide;
  if (guide) {
    const guideTitle = document.getElementById('guideTitle');
    const guideSubtitle = document.getElementById('guideSubtitle');
    const guideKicker = document.getElementById('guideKicker');
    const guideHeading = document.getElementById('guideHeading');
    const guideIntro = document.getElementById('guideIntro');
    const guideExerciseKicker = document.getElementById('guideExerciseKicker');
    const guideExercise = document.getElementById('guideExercise');
    const guideCover = document.querySelector('[data-guide-cover]');
    if (guideTitle) guideTitle.textContent = guide.title || mode.name;
    if (guideSubtitle) guideSubtitle.textContent = guide.subtitle || '';
    if (guideKicker) guideKicker.textContent = guide.kicker || '';
    if (guideHeading) guideHeading.textContent = guide.heading || mode.name;
    if (guideIntro) guideIntro.textContent = guide.intro || '';
    if (guideExerciseKicker) guideExerciseKicker.textContent = guide.exerciseKicker || '';
    if (guideExercise) guideExercise.textContent = guide.exercise || '';
    if (guideCover && guide.coverLabel) guideCover.setAttribute('aria-label', guide.coverLabel);

    if (Array.isArray(guide.pages) && guide.pages.length) {
      const pagesRoot = document.querySelector('[data-guide-pages]');
      if (pagesRoot) {
        pagesRoot.replaceChildren();
        guide.pages.forEach(page => {
          const article = document.createElement('article');
          article.className = 'trainer-guide-page';
          article.dataset.guidePage = '';
          const kicker = document.createElement('p');
          kicker.className = 'trainer-guide-kicker'; kicker.textContent = page.kicker || '';
          const heading = document.createElement('h2');
          heading.className = 'trainer-guide-heading'; heading.textContent = page.heading || '';
          const text = document.createElement('p');
          text.className = 'trainer-guide-text'; text.textContent = page.text || '';
          article.append(kicker, heading, text);
          pagesRoot.append(article);
        });
      }
    }
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
    onReset: () => { document.getElementById('turns')?.replaceChildren('0'); document.getElementById('placed')?.replaceChildren('0'); }
  });

  trainer.depth=settings.depth; trainer.softScale=settings.softScale; trainer.shadowOpacity=settings.shadowOpacity; trainer.shadowBrightness=settings.shadowBrightness;
  trainer.rules.das=settings.das; trainer.rules.arr=settings.arr; trainer.binds={...trainer.binds,...settings.binds};

  let toastTimer;
  const showToast = message => {
    const toast=document.getElementById('toast'); if(!toast)return;
    toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),1500);
  };
  trainer.say=showToast;
  document.getElementById('reset')?.addEventListener('click',()=>trainer.reset());

  let lastBonusBreakToken=0, lastBonusValue=Number.NaN;
  function updateBonus(){
    const meter=document.getElementById('bonusMeter'), number=document.getElementById('bonusNumber'), liquid=document.getElementById('bonusLiquid');
    if(!meter||!number)return;
    const active=mode.id==='mode-01'; meter.hidden=!active; if(!active)return;
    const bonus=Math.max(0,Math.min(100,Number(trainer.session?.bonus??0)));
    const increased=Number.isFinite(lastBonusValue)&&bonus>lastBonusValue;
    number.textContent=String(Math.floor(bonus));
    if(liquid){liquid.style.width=`${bonus}%`;if(increased){liquid.classList.remove('boosting');void liquid.offsetWidth;liquid.classList.add('boosting');setTimeout(()=>liquid.classList.remove('boosting'),520);}}
    lastBonusValue=bonus;
    const token=Number(trainer.session?.bonusBreakToken??0);
    if(token!==lastBonusBreakToken){lastBonusBreakToken=token;meter.classList.remove('breaking');void meter.offsetWidth;meter.classList.add('breaking');setTimeout(()=>meter.classList.remove('breaking'),340);}
  }

  function updateTrainingHud(){
    const hud=document.getElementById('jolHud'); if(!hud)return;
    const active=mode.id==='mode-02'; hud.hidden=!active; if(!active)return;
    const session=trainer.session || {};
    const timer=document.getElementById('jolTimer'), progress=document.getElementById('jolProgress'), chunks=document.getElementById('jolChunks'), best=document.getElementById('jolBest');
    if(timer)timer.textContent=(Math.max(0,Number(session.elapsedMs||0))/1000).toFixed(1)+'s';
    if(progress)progress.textContent=`${session.placements?.length||0}/3`;
    if(chunks)chunks.textContent=String(session.completedChunks||0);
    if(best)best.textContent=session.bestChunkMs==null?'—':(session.bestChunkMs/1000).toFixed(1)+'s';
  }

  function updateOrientation(){
    const el=document.getElementById('orient'), name=document.getElementById('orientName'); if(!el||!name)return;
    const arrows=['↑','→','↓','←'], names=['Spawn','Right','180°','Left'], o=trainer.piece?trainer.piece.o:0;
    el.textContent=arrows[o]; name.textContent=names[o];
  }

  const originalRender=trainer.render.bind(trainer);
  trainer.render=function(){originalRender();updateOrientation();updateBonus();updateTrainingHud();};

  const settingsOpen=()=>document.body.classList.contains('settings-open');
  window.addEventListener('keydown',e=>{if(settingsOpen())return;trainer.handleKeydown(e);},{passive:false});
  window.addEventListener('keyup',e=>{if(settingsOpen())return;trainer.handleKeyup(e);});
  window.addEventListener('blur',()=>trainer.handleBlur());

  window.trainer=trainer;
  window.dispatchEvent(new CustomEvent('trainerready',{detail:trainer}));
  function tick(t){trainer.tick(t);requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
})();
