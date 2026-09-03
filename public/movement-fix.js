/* Pixel Clash — authoritative movement controller. Loaded before game.js. */
(()=>{
  const NativeWS=window.WebSocket;
  let activeWS=null;
  let self=null;
  const held=new Set();
  const DIR={up:[0,-48],down:[0,48],left:[-48,0],right:[48,0]};

  function trackSocket(sock){
    activeWS=sock;
    try{
      const oldMessage=sock.onmessage;
      sock.addEventListener('message',ev=>{
        try{
          const m=JSON.parse(ev.data);
          if(m?.type==='state'&&Array.isArray(m.players)){
            const found=self?.id?m.players.find(p=>p.id===self.id):null;
            self=found||self||m.players.find(p=>!p.isBot)||null;
          }
        }catch{}
      });
    }catch{}
  }

  function PixelWebSocket(...args){
    const sock=new NativeWS(...args);
    trackSocket(sock);
    sock.addEventListener('close',()=>{if(activeWS===sock){activeWS=null;self=null}});
    return sock;
  }
  PixelWebSocket.prototype=NativeWS.prototype;
  for(const k of ['CONNECTING','OPEN','CLOSING','CLOSED'])PixelWebSocket[k]=NativeWS[k];
  window.WebSocket=PixelWebSocket;

  function sendMove(dx,dy){
    const ws=activeWS;
    if(!ws||ws.readyState!==NativeWS.OPEN||!self||self.alive===false)return;
    const x=Number(self.x),y=Number(self.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    try{ws.send(JSON.stringify({type:'move',x:x+dx,y:y+dy}))}catch{}
  }

  function stop(e){
    const b=e.currentTarget;
    const key=b?.dataset?.key;
    if(key)held.delete(key);
  }
  document.addEventListener('pointerdown',e=>{
    const b=e.target?.closest?.('[data-key]');
    if(!b)return;
    const key=b.dataset.key;
    if(!DIR[key])return;
    e.preventDefault();
    e.stopImmediatePropagation();
    held.add(key);
    try{b.setPointerCapture?.(e.pointerId)}catch{}
    sendMove(...DIR[key]);
  },true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>{
    const b=e.target?.closest?.('[data-key]');
    if(b?.dataset?.key)held.delete(b.dataset.key);
  },true);

  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
  document.addEventListener('keydown',e=>{
    const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];
    if(!key)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    held.add(key);
  },true);
  document.addEventListener('keyup',e=>{
    const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];
    if(key)held.delete(key);
  },true);
  window.addEventListener('blur',()=>held.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)held.clear()});

  setInterval(()=>{
    if(document.getElementById('game')?.classList.contains('hidden'))return;
    if(!held.size)return;
    let dx=0,dy=0;
    for(const key of held){dx+=DIR[key][0];dy+=DIR[key][1]}
    if(dx||dy){const len=Math.hypot(dx,dy)||1;sendMove(dx/len*48,dy/len*48)}
  },100);

  window.__pixelMovementFix=true;
  window.__pixelMovementFixV3=true;
})();
