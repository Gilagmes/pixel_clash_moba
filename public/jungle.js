(()=>{
  const NativeWS=window.WebSocket;
  window.__pixelJungle=[];
  const wrap=document.querySelector('.game-wrap');
  let hud=null,feed=null;
  function ensureHud(){
    if(!wrap||hud)return;
    hud=document.createElement('div');hud.id='objectivesHud';hud.innerHTML='<div class="objective-card" data-o="blue"><strong>⚡ BLUE</strong><span>--</span></div><div class="objective-card" data-o="red"><strong>🔥 RED</strong><span>--</span></div><div class="objective-card" data-o="boss"><strong>🐉 DRAGON</strong><span>--</span></div>';wrap.appendChild(hud);
    feed=document.createElement('div');feed.id='objectiveFeed';wrap.appendChild(feed);
  }
  function fmt(ms){if(ms<=0)return'ГОТОВ';const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
  function renderObjectives(){ensureHud();if(!hud)return;const now=Date.now();for(const j of window.__pixelJungle){const card=hud.querySelector('[data-o="'+j.type+'"]');if(!card)continue;const span=card.querySelector('span');span.textContent=j.alive?'АКТИВЕН':fmt((j.respawnAt||0)-now);card.classList.toggle('ready',!j.alive&&((j.respawnAt||0)-now)<=0)}}
  function objectiveEvent(m){ensureHud();if(!feed)return;const icon=m.buff==='dragon'?'🐉':m.buff==='red'?'🔥':'⚡';const e=document.createElement('div');e.className='objective-event';e.textContent=icon+' '+m.monster+' повержен! +'+m.reward+' 🪙';feed.appendChild(e);setTimeout(()=>e.remove(),3400)}
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){
      this._pcOnMessage=fn;
      super.onmessage=e=>{
        try{const m=JSON.parse(e.data);if(m.type==="state")window.__pixelJungle=Array.isArray(m.jungle)?m.jungle:[];if(m.type==="jungleKill")objectiveEvent(m)}catch{}
        if(this._pcOnMessage)this._pcOnMessage(e);
      };
    }
    get onmessage(){return this._pcOnMessage}
  };
  function draw(){
    const c=document.getElementById("arena"),x=c?.getContext("2d");
    if(x){const now=Date.now();x.save();x.textAlign="center";
      for(const j of window.__pixelJungle){
        const r=j.type==="boss"?27:20;
        if(!j.alive){x.globalAlpha=.45;x.font="18px system-ui";x.fillText("⏳",j.x,j.y+6);x.globalAlpha=1;continue}
        const pulse=1+Math.sin(now/220+j.x)*.08;
        x.translate(j.x,j.y);x.scale(pulse,pulse);x.shadowBlur=16;x.shadowColor=j.type==="blue"?"#55b9ff":j.type==="red"?"#ff5b6e":"#d58cff";x.fillStyle=x.shadowColor;x.beginPath();x.arc(0,0,r,0,Math.PI*2);x.fill();x.shadowBlur=0;x.fillStyle="#171923";x.beginPath();x.arc(-6,-3,4,0,Math.PI*2);x.arc(6,-3,4,0,Math.PI*2);x.fill();x.fillStyle="#fff";x.font="bold 10px system-ui";x.fillText(j.type==="boss"?"🐉":j.type==="blue"?"B":"R",0,4);x.setTransform(1,0,0,1,0,0);x.restore();
        x.fillStyle="#fff";x.font="bold 10px system-ui";x.fillText(j.name,j.x,j.y-r-12);x.fillStyle="#151824";x.fillRect(j.x-28,j.y-r-8,56,4);x.fillStyle="#55d98b";x.fillRect(j.x-28,j.y-r-8,56*Math.max(0,j.hp/j.maxHp),4);
        if(j.buff){x.font="12px system-ui";x.fillText(j.buff==="blue"?"⚡":j.buff==="red"?"🔥":"🐉",j.x,j.y+r+16)}
      }
      x.restore();
    }
    renderObjectives();
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();