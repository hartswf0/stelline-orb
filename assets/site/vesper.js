/* Vesper identity runtime: fit-to-zone type. Every .fit line is forced to fill its zone width. */
(function(){
  const $$=(s,r)=>[].slice.call((r||document).querySelectorAll(s));
  function wrap(){ $$('.fit').forEach(el=>{ if(!el.firstElementChild||!el.firstElementChild.classList.contains('fi')){ const s=document.createElement('span'); s.className='fi'; while(el.firstChild) s.appendChild(el.firstChild); el.appendChild(s);} }); }
  function refit(lockHeight){
    const els=$$('.fit'); els.forEach(e=>{e.style.fontSize='100px'});
    const ws=els.map(e=>[e.offsetWidth,e.firstElementChild.offsetWidth]);
    els.forEach((e,i)=>{ const W=ws[i][0], w=ws[i][1]; if(!w||!W) return; const fs=100*W/w; e.style.fontSize=fs.toFixed(2)+'px'; if(lockHeight||!e.style.height) e.style.height=(fs*.9).toFixed(1)+'px'; });
  }
  window.VesperFit={refit:function(){refit(false)}};
  function init(){ wrap(); refit(true); var t; addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){refit(true)},80)}); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){refit(true)}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
