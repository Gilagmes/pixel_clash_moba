/* Pixel Clash — clean movement controller. game.js owns WebSocket; this file owns only input. */
(()=>{
  const held=new Set();
  const DIR={up:[0,-45],down:[0,45],left:[-45,0],right:[45,0]};
  const KEY={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'};
  const keyOf=e=>KEY[e.key]||KEY[String(e.key||'').toLowerCase()]||null;
  const set=(k,on)=>{if(k)on?held.add(k):held.delete(k)};
  document.addEventListener('pointerdown',e=>{
    const b=e.target?.closest?.('[data-key]'); const k=b?.dataset?.key;
    if(!DIR[k])return; e.preventDefault(); e.stopPropagation(); set(k,true);
    try{b.setPointerCapture?.(e.pointerId)}catch{}
  },true);
  document.addEventListener('pointerup',e=>{
    const b=e.target?.closest?.('[data-key]'); const k=b?.dataset?.key;
    if(DIR[k]){e.preventDefault();e.stopPropagation();set(k,false)}
  },true);
  document.addEventListener('pointercancel',e=>{const b=e.target?.closest?.('[data-key]');if(b) set(b.dataset.key,false)},true);
  document.addEventListener('keydown',e=>{const k=keyOf(e);if(!k)return;e.preventDefault();set(k,true)},true);
  document.addEventListener('keyup',e=>{const k=keyOf(e);if(k){e.preventDefault();set(k,false)}},true);
  const clear=()=>held.clear(); window.addEventListener('blur',clear); document.addEventListener('visibilitychange',()=>document.hidden&&clear());
  setInterval(()=>{
    if(document.getElementById('game')?.classList.contains('hidden')||!held.size||typeof window.move!=='function')return;
    let x=0,y=0; for(const k of held){x+=DIR[k][0];y+=DIR[k][1]}
    if(x||y){const n=Math.hypot(x,y)||1; window.move(x/n*45,y/n*45)}
  },120);
})();
