(()=>{
  const selected=()=>window.pixelSkins?.getSelected?.()||null;
  const catalog=()=>window.pixelSkins?.getCatalog?.()||{};
  const skinInfo=id=>Object.values(catalog()).flat().find(s=>s.id===id)||null;
  const originalSend=WebSocket.prototype.send;
  WebSocket.prototype.send=function(data){
    try{const m=JSON.parse(data);if(m?.type==='join'){m.skin=selected();data=JSON.stringify(m)}}catch{}
    return originalSend.call(this,data);
  };
  let state=[];
  const oldDispatch=WebSocket.prototype.dispatchEvent;
  WebSocket.prototype.dispatchEvent=function(ev){
    try{if(ev?.data){const m=JSON.parse(ev.data);if(m.type==='state'&&Array.isArray(m.players))state=m.players}}catch{}
    return oldDispatch.call(this,ev);
  };
  function boot(){
    const canvas=document.getElementById('arena');if(!canvas)return;
    const wrap=canvas.parentElement;if(!wrap)return;
    const layer=document.createElement('canvas');layer.className='skin-render-layer';layer.width=1000;layer.height=900;layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:35';wrap.appendChild(layer);
    const c=layer.getContext('2d');
    function frame(){c.clearRect(0,0,1000,900);for(const p of state){if(!p.alive||!p.skin)continue;const s=skinInfo(p.skin);if(!s)continue;const mine=p.id===state.find(x=>x.name&&x.id===p.id)?.id; c.save();c.translate(p.x,p.y);c.textAlign='center';c.font='22px system-ui';c.shadowBlur=14;c.shadowColor=p.team===1?'#5de7ff':'#ff4f9a';c.fillText(s.art,0,-22);c.globalAlpha=.7;c.beginPath();c.arc(0,0,24+Math.sin(Date.now()/160)*3,0,Math.PI*2);c.strokeStyle=p.team===1?'#58dcff':'#ff5d9e';c.lineWidth=2;c.stroke();c.restore()}requestAnimationFrame(frame)}
    frame();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
