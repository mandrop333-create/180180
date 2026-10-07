const modeId=new URLSearchParams(location.search).get('mode')||'mode-01';
const id=/^mode-0[1-6]$/.test(modeId)?modeId.slice(-2):'01';
import('../games/'+id+'/game.js').catch(error=>{
  console.error('180180 mini-game failed to load',error);
  const toast=document.getElementById('toast');
  if(toast){toast.textContent='Mini-game failed to load';toast.hidden=false;}
});
