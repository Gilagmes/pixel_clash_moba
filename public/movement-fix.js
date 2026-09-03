/* Pixel Clash — movement only. Never replaces WebSocket. */
(()=>{
  const held=new Set();
  const DIR={up:[0,-45],down:[0,45],left:[-45,0],right:[45,0]};
  const keys={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};
  function keyOf(e){return keys[e.key]||keys[e.key?.toLowerCase()]||null}
  function setHeld(key,on){if(!key||!DIR[key])return;on?held.add(key):held.delete(key)}
  function button(e,on){const b=e.target?.closest?.("[data-key]");const key=b?.dataset?.key;if(!key||!DIR[key])return;e.preventDefault();e.stopImmediatePropagation();setHeld(key,on);if(on)try{b.setPointerCapture?.(e.pointerId)}catch{}}
  document.addEventListener("pointerdown",e=>button(e,true),true);
  document.addEventListener("pointerup",e=>button(e,false),true);
  document.addEventListener("pointercancel",e=>button(e,false),true);
  document.addEventListener("lostpointercapture",e=>button(e,false),true);
  document.addEventListener("keydown",e=>{const k=keyOf(e);if(!k)return;e.preventDefault();e.stopImmediatePropagation();setHeld(k,true)},true);
  document.addEventListener("keyup",e=>{const k=keyOf(e);if(k)setHeld(k,false)},true);
  window.addEventListener("blur",()=>held.clear());
  document.addEventListener("visibilitychange",()=>{if(document.hidden)held.clear()});
  setInterval(()=>{
    if(document.getElementById("game")?.classList.contains("hidden")||!held.size)return;
    if(typeof window.move!=="function")return;
    let dx=0,dy=0;for(const k of held){dx+=DIR[k][0];dy+=DIR[k][1]}
    if(dx||dy){const n=Math.hypot(dx,dy)||1;try{window.move(dx/n*45,dy/n*45)}catch{}}
  },120);
  window.__pixelMovementFix=true;
  window.__pixelMovementFixV5=true;
})();
