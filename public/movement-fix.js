(()=>{
  if(window.__pixelMovementFixV2)return;
  window.__pixelMovementFixV2=true;
  const NativeWS=window.WebSocket;
  let socket=null,state=null,selfId=null;
  const held=new Set();
  const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  const send=p=>{if(socket&&socket.readyState===1){try{socket.send(JSON.stringify(p));return true}catch{}}return false};
  window.WebSocket=class extends NativeWS{
    constructor(...args){
      super(...args); socket=this;
      this.addEventListener('message',e=>{
        try{const m=JSON.parse(e.data);if(m.type!=='state')return;state=m;const list=Array.isArray(m.players)?m.players:[];if(!selfId){const human=list.find(p=>!p.isBot);if(human)selfId=human.id;}if(selfId&&!list.some(p=>p.id===selfId))selfId=null;}catch{}
      });
      this.addEventListener('close',()=>{if(socket===this){socket=null;state=null;selfId=null}});
    }
  };
  const direction=()=>{
    let x=0,y=0;for(const k of held){const d=dirs[k];if(d){x+=d[0];y+=d[1]}}
    const len=Math.hypot(x,y)||1;return [x/len,y/len];
  };
  const tick=()=>{
    if(!held.size||!socket||socket.readyState!==1||!state||!selfId)return;
    const p=(state.players||[]).find(x=>x.id===selfId);if(!p||p.alive===false)return;
    const [dx,dy]=direction();
    const speed=60*(Number(p.speed)||1)+(Number(p.speedBonus)||0)*60;
    send({type:'move',x:Number(p.x)+dx*speed,y:Number(p.y)+dy*speed});
  };
  setInterval(tick,100);
  const start=k=>{if(dirs[k])held.add(k)};
  const stop=k=>{held.delete(k)};
  const map=e=>({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'})[e.key]||({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key];
  document.addEventListener('keydown',e=>{const k=map(e);if(k){start(k);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault()}},true);
  document.addEventListener('keyup',e=>{const k=map(e);if(k)stop(k)},true);
  document.querySelectorAll('[data-key]').forEach(b=>{
    const k=b.dataset.key;
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);start(k)},true);
    b.addEventListener('pointerup',()=>stop(k),true);
    b.addEventListener('pointercancel',()=>stop(k),true);
  });
  window.addEventListener('blur',()=>held.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)held.clear()});
})();