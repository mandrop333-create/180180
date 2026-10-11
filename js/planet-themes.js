(()=> {
  const launcher=document.getElementById('themeLauncher');
  const picker=document.getElementById('themePicker');
  if(!launcher||!picker)return;
  const options=[...picker.querySelectorAll('[data-piece-theme]')];
  const label=document.getElementById('activeThemeLabel');
  const status=document.getElementById('themePickerStatus');
  const themes={space:{label:'SPACE',name:'Space'},glass:{label:'GLASS',name:'Glass'},nature:{label:'NATURE',name:'Nature'},generic:{label:'GENERIC',name:'Generic'}};
  let active='space';
  try{const saved=localStorage.getItem('180180.pieceTheme');const migrated=saved==='aqua-space'?'space':saved==='ember-orbit'?'generic':saved;if(themes[migrated])active=migrated;}catch{}
  function apply(id,announce){
    if(!themes[id])return;
    active=id;
    try{localStorage.setItem('180180.pieceTheme',id);}catch{}
    document.documentElement.dataset.pieceTheme=id;
    const planet=launcher.querySelector('.theme-planet');
    ['space','glass','nature','generic'].forEach(theme=>planet.classList.toggle('theme-planet-'+theme,id===theme));
    label.textContent=themes[id].label;
    options.forEach(option=>{
      const selected=option.dataset.pieceTheme===id;
      option.classList.toggle('is-selected',selected);
      option.setAttribute('aria-pressed',String(selected));
    });
    if(status)status.textContent=announce
      ? themes[id].name+' selected and saved.'
      : themes[id].name+' selected.';
    window.dispatchEvent(new CustomEvent('180436:piecethemechange',{detail:{theme:id}}));
  }
  function open(){
    picker.hidden=false;
    document.body.classList.add('theme-picker-open');
    launcher.setAttribute('aria-expanded','true');
    picker.querySelector('[data-piece-theme="'+active+'"]')?.focus();
  }
  function close(){
    picker.hidden=true;
    document.body.classList.remove('theme-picker-open');
    launcher.setAttribute('aria-expanded','false');
    launcher.focus();
  }
  launcher.addEventListener('click',()=>picker.hidden?open():close());
  picker.querySelectorAll('[data-theme-close]').forEach(el=>el.addEventListener('click',close));
  options.forEach(option=>option.addEventListener('click',()=>apply(option.dataset.pieceTheme,true)));
  document.addEventListener('keydown',event=>{
    if(picker.hidden)return;
    if(event.key==='Escape'){event.preventDefault();close();}
    if(event.key==='Tab'){
      const focusable=[...picker.querySelectorAll('button:not([disabled])')];
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  apply(active,false);
})();