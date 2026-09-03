(()=>{
  if(window.__pixelMovementFix)return;
  window.__pixelMovementFix=true;
  const active=new Map();
  const keyForButton=b=>b?.dataset?.key||null;
  const fire=(key,type)=>document.dispatchEvent(new KeyboardEvent(type,{key:key==='up'?'ArrowUp':key==='down'?'ArrowDown':key==='left'?'ArrowLeft':'ArrowRight',bubbles:true,cancelable:true}));
  const start=(key)=>{
    if(!key||active.has(key))return;
    active.set(key,setInterval(()=>{fire(key,'keyup');fire(key,'keydown')},120));
  };
  const stop=key=>{const t=active.get(key);if(t){clearInterval(t);active.delete(key)}fire(key,'keyup')};
  document.addEventListener('pointerdown',e=>{const b=e.target?.closest?.('[data-key]');if(b)start(keyForButton(b))},true);
  document.addEventListener('pointerup',e=>{const b=e.target?.closest?.('[data-key]');if(b)stop(keyForButton(b))},true);
  document.addEventListener('pointercancel',e=>{const b=e.target?.closest?.('[data-key]');if(b)stop(keyForButton(b))},true);
  document.addEventListener('keydown',e=>{
    const map={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
    const k=map[e.key];
    if(k)start(k);
  },true);
  document.addEventListener('keyup',e=>{
    const map={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
    const k=map[e.key];
    if(k)stop(k);
  },true);
  window.addEventListener('blur',()=>{for(const k of [...active.keys()])stop(k)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const k of [...active.keys()])stop(k)});
})();