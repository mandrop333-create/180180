import { mountSettings } from './settings.js';

// The trainer page owns the settings UI, but mounting is kept independent from
// gameplay initialization so the button cannot become inert because of script timing.
function mount(){
  const trainer=window.trainer||null;
  const api=mountSettings({trainer});
  if(api) window.trainerSettings=api;
}

function mountWhenReady(){
  if(window.trainer){mount();return;}
  window.addEventListener('trainerready',mount,{once:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountWhenReady,{once:true});
else mountWhenReady();
