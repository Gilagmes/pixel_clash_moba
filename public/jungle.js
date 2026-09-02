(()=>{
  const NativeWS=window.WebSocket;
  window.__pixelJungle=[];
  const wrap=document.querySelector('.game-wrap');
  let hud=null,feed=null;
  function ensureHud(){
    if(!wrap||hud)return;
    const style=document.createElement('style');style.textContent='#objectivesHud{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:70;display:flex;gap:8px;pointer-events:none;font-family:system-ui,sans-serif}.objective-card{min-width:118px;padding:7px 10px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(9,12,22,.84);backdrop-filter:blur(8px);box-shadow:0 8px 28px rgba(0,0,0,.28);color:#fff;text-align:center}.objective-card strong{display:block;font-size:11px;letter-spacing:.08em}.objective-card span{display:block;margin-top:2px;font-weight:800;font-size:14px}.objective-card.ready{border-color:rgba(255,210,90,.7);box-shadow:0 0 18px rgba(255,210,90,.18)}#objectiveFeed{position:absolute;top:72px;left:50%;transform:translateX(-50%);z-index:71;display:flex;flex-direction:column;align-items:center;gap:5px;pointer-events:none}.objective-event{padding:7px 13px;border-radius:999px;background:rgba(12,15,28,.9);border:1px solid rgba(255,255,255,.14);color:#fff;font-weight:800;font-size:12px;animation:objectivePop 3.4s ease both}@keyframes objectivePop{0%{opacity:0;transform:translateY(-10px) scale(.92)}12%,78%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-8px) scale(.98)}}@media(max-width:600px){#objectivesHud{top:8px;gap:4px;width:96%;justify-content:center}.objective-card{min-width:0;flex:1;padding:5px}.objective-card strong{font-size:9px}.objective-card span{font-size:12px}#objectiveFeed{top:55px;width:92%}.objective-event{font-size:11px;padding:6px 10px}}';document.head.appendChild(style);
    hud=document.createElement('div');hud.id='objectivesHud';hud.innerHTML='<div class="objective-card" data-o="blue"><strong>⚡ BLUE</strong><span>--</span></div><div class="objective-card" data-o="red"><strong>🔥 RED</strong><span>--</span></div><div class="objective-card" data-o="boss"><strong>🐉 DRAGON</strong><span>--</span></div>';wrap.appendChild(hud);
    feed=document.createElement('div');feed.id='objectiveFeed';wrap.appendChild(feed);
  }
  function fmt(ms){if(ms<=0)return'ГОТОВ';const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
  function renderObjectives(){ensureHud();if(!hud)return;const now=Date.now();for(const j of window.__pixelJungle){const card=hud.querySelector('[data-o="'+j.type+'"]');if(!card)continue;const span=card.querySelector('span');span.textContent=j.alive?'АКТИВЕН':fmt((j.respawnAt||0)-now);card.classList.toggle('ready',!j.alive&&((j.respawnAt||0)-now)<=0)}}
  function objectiveEvent(m){ensureHud();if(!feed)return;const icon=m.buff==='dragon'?'🐉':m.buff==='red'?'🔥':'⚡';const e=document.createElement('div');e.className='objective-event';e.textContent=icon+' '+m.monster+' повержен! +'+(m.reward||0)+' 🪙';feed.appendChild(e);setTimeout(()=>e.remove(),3400)}
  function objectiveBuffEvent(m){ensureHud();if(!feed)return;const icon=m.icon||'⚡';const pct=Math.round((m.damage||0)*100);const e=document.createElement('div');e.className='objective-event';e.textContent=icon+' КОМАНДНЫЙ БАФФ: +'+pct+'% урона на '+Math.round((m.duration||0)/1000)+'с';feed.appendChild(e);setTimeout(()=>e.remove(),4200)}
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){this._pcOnMessage=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==="state")window.__pixelJungle=Array.isArray(m.jungle)?m.jungle:[];if(m.type==="jungleKill")objectiveEvent(m);if(m.type==="objectiveBuff")objectiveBuffEvent(m)}catch{}if(this._pcOnMessage)this._pcOnMessage(e)}};
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