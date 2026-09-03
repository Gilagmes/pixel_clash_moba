(()=>{
  if(window.__pixelMovementFix)return;
  window.__pixelMovementFix=true;
  const active=new Map();
  const keyForButton=b=>b?.dataset?.key||null;
  const keyEvent=(key,type)=>{
    const map={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
    document.dispatchEvent(new KeyboardEvent(type,{key:map[key],code:map[key],bubbles:true,cancelable:true,repeat:false}));
  };
  const start=key=>{
    if(!key||active.has(key))return;
    keyEvent(key,'keydown');
    active.set(key,setInterval(()=>keyEvent(key,'keydown'),100));
  };
  const stop=key=>{
    if(!key)return;
    const timer=active.get(key);
    if(timer){clearInterval(timer);active.delete(key)}
    keyEvent(key,'keyup');
  };
  const stopAll=()=>[...active.keys()].forEach(stop);
  document.addEventListener('pointerdown',e=>{
    const b=e.target?.closest?.('[data-key]');
    if(!b)return;
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    start(keyForButton(b));
  },true);
  document.addEventListener('pointerup',e=>{
    const b=e.target?.closest?.('[data-key]');
    if(b)stop(keyForButton(b));
  },true);
  document.addEventListener('pointercancel',e=>{
    const b=e.target?.closest?.('[data-key]');
    if(b)stop(keyForButton(b));
  },true);
  document.addEventListener('touchstart',e=>{
    const b=e.target?.closest?.('[data-key]');
    if(b){e.preventDefault();start(keyForButton(b));}
  },{capture:true,passive:false});
  document.addEventListener('touchend',e=>{
    const b=e.target?.closest?.('[data-key]');
    if(b)stop(keyForButton(b));
  },true);
  document.addEventListener('keydown',e=>{
    if(e.repeat)return;
    const map={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
    const k=map[e.key]||map[e.key.toLowerCase?.()];
    if(k){start(k);}
  },true);
  document.addEventListener('keyup',e=>{
    const map={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
    const k=map[e.key]||map[e.key.toLowerCase?.()];
    if(k)stop(k);
  },true);
  window.addEventListener('blur',stopAll);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll()});
})();