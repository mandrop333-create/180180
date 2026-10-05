import { loadSettings, saveSettings, resetSettings, applySettings, snapshotSettings, ACTION_LABELS } from './trainer/settings.js';

export function mountSettings(trainer) {
  const panel = document.getElementById('settingsPanel');
  const gear = document.getElementById('settingsGear');
  if (!panel || !gear) return;

  const open = () => { panel.hidden = false; panel.setAttribute('aria-hidden','false'); render(); };
  const close = () => { panel.hidden = true; panel.setAttribute('aria-hidden','true'); trainer.rebinding = null; };
  const persist = () => saveSettings(snapshotSettings(trainer));
  const label = code => trainer.keyLabel(code);

  function render() {
    const values = [
      ['settingsDepth', trainer.depth, `${Math.round(trainer.depth * 100)}%`],
      ['settingsSoft', trainer.softScale, ['1×','2×','5×','10×','MAX'][trainer.softScale] || '1×'],
      ['settingsDas', trainer.rules.das, `${trainer.rules.das} ms`],
      ['settingsArr', trainer.rules.arr, trainer.rules.arr === 0 ? '0 ARR' : `${trainer.rules.arr} ms`]
    ];
    values.forEach(([id,value,text]) => { const input=document.getElementById(id); if(input){ input.value=value; const out=input.parentElement?.querySelector('output'); if(out) out.textContent=text; } });
    const list=document.getElementById('settingsBinds');
    if(!list) return;
    list.innerHTML='';
    Object.keys(ACTION_LABELS).forEach(action=>{
      const row=document.createElement('div'); row.className='settings-bind-row';
      const name=document.createElement('span'); name.className='settings-bind-name'; name.textContent=ACTION_LABELS[action];
      const btn=document.createElement('button'); btn.className='settings-key';
      const listening=trainer.rebinding===action; btn.classList.toggle('listening',listening); btn.textContent=listening?'PRESS KEY':label(trainer.binds[action]);
      btn.onclick=()=>{ trainer.rebinding=action; render(); };
      row.append(name,btn); list.append(row);
    });
  }

  gear.addEventListener('click', open);
  panel.querySelector('.settings-backdrop')?.addEventListener('click', close);
  panel.querySelector('.settings-close')?.addEventListener('click', close);
  panel.querySelector('[data-settings-reset]')?.addEventListener('click',()=>{ applySettings(trainer,resetSettings()); render(); });
  [['settingsDepth',v=>trainer.depth=v],['settingsSoft',v=>trainer.softScale=v],['settingsDas',v=>trainer.rules.das=v],['settingsArr',v=>trainer.rules.arr=v]].forEach(([id,set])=>document.getElementById(id)?.addEventListener('input',e=>{set(Number(e.target.value)); trainer.render(); persist(); render();}));

  const previousKeydown = trainer.handleKeydown.bind(trainer);
  window.addEventListener('keydown',e=>{
    if(trainer.rebinding){ e.preventDefault(); if(e.code==='Escape'){trainer.rebinding=null;render();return;} const owner=Object.keys(trainer.binds).find(a=>trainer.binds[a]===e.code); if(!owner||owner===trainer.rebinding){trainer.binds[trainer.rebinding]=e.code;trainer.rebinding=null;persist();render();} return; }
    previousKeydown(e);
  });
  window.addEventListener('keyup',e=>trainer.handleKeyup(e));
  window.addEventListener('blur',()=>trainer.handleBlur());

  return { open, close, render, settings: loadSettings, persist };
}
