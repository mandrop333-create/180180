import { mountSettings } from './settings.js';

// This controller is intentionally mounted outside the gameplay bootstrap.
// If gameplay changes, the settings button must remain independently operable.
function mount(){
  const trainer=window.trainer;
  const api=mountSettings({trainer});
  if(api) window.trainerSettings=api;
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
