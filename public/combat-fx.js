(()=>{
  const arena=document.getElementById("arena");
  if(!arena)return;
  const wrap=arena.parentElement;
  const fx=document.createElement("canvas");
  fx.className="combat-fx-layer";
  fx.width=arena.width;fx.height=arena.height;
  wrap.appendChild(fx);
  const c=fx.getContext("2d");
  const events=[],hp=new Map();
  let state=null,combo=0,comboAt=0;
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){
      this._pcFx=fn;
      super.onmessage=e=>{
        try{
          const m=JSON.parse(e.data);
          if(m.type==="state"){
            state=m;
            const list=m.players||[];
            for(const p of list){
              const old=hp.get(p.id);
              if(old!=null&&p.hp<old&&p.alive!==false)hit(p,old-p.hp);
              hp.set(p.id,Math.max(0,p.hp||0));
            }
          }
          if(m.type==="combat"){
            const p=(state?.players||[]).find(x=>x.id===m.by)||state?.players?.find(x=>x.id===window.__pixelMeId);
            if(p)attackFx(p,m.action==="skill");
            combo=comboAt>Date.now()-1200?combo+1:1;comboAt=Date.now();
          }
          if(m.type==="ability"){
            const p=(state?.players||[]).find(x=>x.id===m.by);
            if(p)skillFx(p,m.key,m.hits||0);
          }
          if(m.type==="effect"){
            events.push({type:"skill",x:m.x,y:m.y,key:m.key,t:Date.now(),team:m.team});
          }
        }catch{}
        if(this._pcFx)this._pcFx(e);
      };
    }
    get onmessage(){return this._pcFx}
  };
  function hit(p,d){
    events.push({type:"hit",x:p.x,y:p.y,t:Date.now(),d:Math.round(d)});
    if(p.id===window.__pixelMeId)events.push({type:"hurt",x:p.x,y:p.y,t:Date.now()});
  }
  function attackFx(p,skill){events.push({type:skill?"skill":"attack",x:p.x,y:p.y,t:Date.now(),hero:p.hero});}
  function skillFx(p,key,hits){events.push({type:"skill",x:p.x,y:p.y,t:Date.now(),key,hero:p.hero,hits});}
  function resize(){const r=arena.getBoundingClientRect();fx.width=arena.width;fx.height=arena.height;fx.style.width=r.width+"px";fx.style.height=r.height+"px"}
  addEventListener("resize",resize);resize();
  function draw(){
    const now=Date.now();c.clearRect(0,0,fx.width,fx.height);
    const sx=fx.width/arena.width,sy=fx.height/arena.height;c.save();c.scale(sx,sy);
    for(let i=events.length-1;i>=0;i--){const e=events[i],age=now-e.t;if(age>900){events.splice(i,1);continue}const a=1-age/900;
      if(e.type==="hit"||e.type==="hurt"){
        const r=10+age*.09;c.globalAlpha=a;c.lineWidth=4;c.strokeStyle=e.type==="hurt"?"#ff5368":"#ffe27a";c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();
        c.font="bold 18px system-ui";c.textAlign="center";c.fillStyle=e.type==="hurt"?"#ff6b7c":"#fff2a6";c.fillText(`-${e.d||""}`,e.x,e.y-28-age*.025);
      }else if(e.type==="attack"){
        const p=Math.min(1,age/300),r=18+p*34;c.globalAlpha=(1-p)*.9;c.lineWidth=7;c.strokeStyle=e.hero==="assassin"?"#d9b3ff":e.hero==="mage"?"#8fd4ff":"#ffe27a";c.beginPath();c.arc(e.x,e.y,r,-.8,1.7);c.stroke();
      }else if(e.type==="skill"){
        const p=Math.min(1,age/700),r=e.key==="r"?24+p*155:e.key==="e"?18+p*80:20+p*60;c.globalAlpha=(1-p)*.8;c.lineWidth=e.key==="r"?9:5;c.strokeStyle=e.key==="r"?"#ffffff":e.key==="q"?"#c995ff":"#7ee7ff";c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();
        if(age<260){c.globalAlpha=1-age/260;c.font=e.key==="r"?"42px system-ui":"28px system-ui";c.textAlign="center";c.fillText(e.key==="r"?"💥":e.key==="q"?"✦":"⚡",e.x,e.y-20)}
        if(e.hits>1&&age<500){c.globalAlpha=(1-age/500);c.font="bold 16px system-ui";c.fillStyle="#fff";c.fillText(`${e.hits} HITS`,e.x,e.y-48)}
      }
    }
    if(combo>1&&now-comboAt<1200){c.globalAlpha=Math.max(0,(1200-(now-comboAt))/1200);c.font="bold 18px system-ui";c.textAlign="center";c.fillStyle="#ffd34d";c.fillText(`COMBO ×${combo}`,500,34)}
    c.restore();requestAnimationFrame(draw);
  }
  draw();
})();
