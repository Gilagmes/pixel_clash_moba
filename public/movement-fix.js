/* Pixel Clash — single authoritative movement input. Loaded before game.js. */
(()=>{
  const NativeWS=window.WebSocket;
  const held=new Set();
  const DIR={up:[0,-48],down:[0,48],left:[-48,0],right:[48,0]};
  let socket=null;
  let selfId=null;
  let selfPos=null;

  function rememberState(data){
    try{
      const m=JSON.parse(data);
      if(m?.type!=="state"||!Array.isArray(m.players))return;
      let me=selfId?m.players.find(p=>p.id===selfId):null;
      if(!me)me=m.players.find(p=>p.isBot===false)||null;
      if(me){selfId=me.id;selfPos={x:Number(me.x),y:Number(me.y),alive:me.alive!==false};}
    }catch{}
  }

  function HookedWebSocket(...args){
    const ws=new NativeWS(...args);
    socket=ws;
    ws.addEventListener("message",e=>rememberState(e.data));
    ws.addEventListener("close",()=>{if(socket===ws){socket=null;selfId=null;selfPos=null;held.clear();}});
    return ws;
  }
  HookedWebSocket.prototype=NativeWS.prototype;
  for(const k of ["CONNECTING","OPEN","CLOSING","CLOSED"])HookedWebSocket[k]=NativeWS[k];
  window.WebSocket=HookedWebSocket;

  function send(dx,dy){
    const ws=socket,p=selfPos;
    if(!ws||ws.readyState!==NativeWS.OPEN||!p||p.alive===false)return;
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const x=p.x+dx,y=p.y+dy;
    try{
      ws.send(JSON.stringify({type:"move",x,y}));
      selfPos={...p,x,y};
    }catch{}
  }

  function movementButton(e,down){
    const b=e.target?.closest?.("[data-key]");
    const key=b?.dataset?.key;
    if(!key||!DIR[key])return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(down){held.add(key);try{b.setPointerCapture?.(e.pointerId)}catch{};send(...DIR[key]);}
    else held.delete(key);
  }

  document.addEventListener("pointerdown",e=>movementButton(e,true),true);
  document.addEventListener("pointerup",e=>movementButton(e,false),true);
  document.addEventListener("pointercancel",e=>movementButton(e,false),true);
  document.addEventListener("lostpointercapture",e=>movementButton(e,false),true);

  const keys={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};
  document.addEventListener("keydown",e=>{
    const k=keys[e.key]||keys[e.key?.toLowerCase()];
    if(!k)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    held.add(k);
  },true);
  document.addEventListener("keyup",e=>{
    const k=keys[e.key]||keys[e.key?.toLowerCase()];
    if(k)held.delete(k);
  },true);
  window.addEventListener("blur",()=>held.clear());
  document.addEventListener("visibilitychange",()=>{if(document.hidden)held.clear();});

  setInterval(()=>{
    if(document.getElementById("game")?.classList.contains("hidden")||!held.size)return;
    let dx=0,dy=0;
    for(const k of held){dx+=DIR[k][0];dy+=DIR[k][1];}
    if(dx||dy){const n=Math.hypot(dx,dy)||1;send(dx/n*48,dy/n*48);}
  },90);

  window.__pixelMovementFix=true;
  window.__pixelMovementFixV4=true;
})();
