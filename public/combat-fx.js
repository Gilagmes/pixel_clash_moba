(()=>{
  const arena=document.getElementById('arena');
  if(!arena)return;
  const wrap=arena.parentElement;
  const fx=document.createElement('canvas');
  fx.className='combat-fx-layer';
  fx.width=arena.width;fx.height=arena.height;
  wrap.appendChild(fx);
  const c=fx.getContext('2d');
  const events=[],hp=new Map();
  let state=null,combo=0,comboAt=0;
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){this._pcFx=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state'){state=m;for(const p of (m.players||[])){const old=hp.get(p.id);if(old!=null&&p.hp<old&&p.alive!==false)hit(p,old-p.hp);hp.set(p.id,Math.max(0,p.hp||0))}}if(m.type==='combat'){const p=(state?.players||[]).find(x=>x.id===m.by)||state?.players?.find(x=>x.id===window.__pixelMeId);if(p)attackFx(p);combo=comboAt>Date.now()-1200?Math.min(9,combo+1):1;comboAt=Date.now()}if(m.type==='ability'){const p=(state?.players||[]).find(x=>x.id===m.by)||state?.players?.find(x=>x.id===window.__pixelMeId);if(p)skillFx(p,m.key,m.hits||0)}if(m.type==='effect')events.push({type:'skill',x:m.x,y:m.y,key:m.key,t:Date.now(),team:m.team})}catch{}if(this._pcFx)this._pcFx(e)}}
    get onmessage(){return this._pcFx}
  };
  function hit(p,d){events.push({type:'hit',x:p.x,y:p.y,t:Date.now(),d:Math.round(d),hero:p.hero});if(p.id===window.__pixelMeId)events.push({type:'hurt',x:p.x,y:p.y,t:Date.now()})}
  function attackFx(p){events.push({type:'attack',x:p.x,y:p.y,t:Date.now(),hero:p.hero,team:p.team,angle:Math.random()*6.28});if(p.hero==='assassin')events.push({type:'slash',x:p.x,y:p.y,t:Date.now(),hero:p.hero,angle:Math.random()*6.28});if(p.hero==='mage')events.push({type:'orb',x:p.x,y:p.y,t:Date.now(),hero:p.hero})}
  function skillFx(p,key,hits){events.push({type:'skill',x:p.x,y:p.y,t:Date.now(),key,hero:p.hero,hits,team:p.team});if(key==='r')events.push({type:'ultimate',x:p.x,y:p.y,t:Date.now(),hero:p.hero});if(p.hero==='assassin'&&(key==='e'||key==='r'))events.push({type:'dash',x:p.x,y:p.y,t:Date.now()});if(p.hero==='warrior'&&key==='w')events.push({type:'shield',x:p.x,y:p.y,t:Date.now()})}
  function resize(){const r=arena.getBoundingClientRect();fx.width=arena.width;fx.height=arena.height;fx.style.width=r.width+'px';fx.style.height=r.height+'px'}
  addEventListener('resize',resize,{passive:true});resize();
  function line(x1,y1,x2,y2,color,width,alpha){c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
  function draw(){const now=Date.now();c.clearRect(0,0,fx.width,fx.height);const sx=fx.width/arena.width,sy=fx.height/arena.height;c.save();c.scale(sx,sy);
    for(let i=events.length-1;i>=0;i--){const e=events[i],age=now-e.t;if(age>1100){events.splice(i,1);continue}const p=Math.min(1,age/900),a=1-p;
      if(e.type==='hit'||e.type==='hurt'){const r=12+age*.12;c.globalAlpha=a;c.lineWidth=e.type==='hurt'?5:4;c.strokeStyle=e.type==='hurt'?'#ff526d':'#ffe27a';c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();c.font='900 19px system-ui';c.textAlign='center';c.fillStyle=e.type==='hurt'?'#ff7180':'#fff1a1';c.fillText(`-${e.d||''}`,e.x,e.y-28-age*.02);if(e.type==='hit'){for(let k=0;k<4;k++){const q=k*Math.PI/2+e.t/180;line(e.x+Math.cos(q)*8,e.y+Math.sin(q)*8,e.x+Math.cos(q)*(18+age*.03),e.y+Math.sin(q)*(18+age*.03),'#fff0a6',2,a)}}}
      else if(e.type==='attack'){const q=Math.min(1,age/260),r=20+q*42,col=e.hero==='assassin'?'#d9a8ff':e.hero==='mage'?'#8ddcff':'#ffe27a';c.globalAlpha=(1-q)*.9;c.lineWidth=8;c.strokeStyle=col;c.beginPath();c.arc(e.x,e.y,r,e.angle-.95,e.angle+.8);c.stroke()}
      else if(e.type==='slash'){const q=Math.min(1,age/300);c.globalAlpha=(1-q)*.95;c.strokeStyle='#f3e8ff';c.lineWidth=5;for(let k=0;k<2;k++){const off=k?Math.PI/2:-Math.PI/2;c.beginPath();c.arc(e.x,e.y,22+q*38,e.angle+off-.7,e.angle+off+.55);c.stroke()}}
      else if(e.type==='orb'){const q=Math.min(1,age/650);c.globalAlpha=(1-q)*.85;c.fillStyle='#bca2ff';c.shadowColor='#8bdcff';c.shadowBlur=18;c.beginPath();c.arc(e.x+28+q*30,e.y-16,7+Math.sin(age/50)*2,0,Math.PI*2);c.fill();c.shadowBlur=0}
      else if(e.type==='dash'){const q=Math.min(1,age/500);c.globalAlpha=(1-q)*.35;for(let k=1;k<5;k++){c.beginPath();c.arc(e.x-k*13,e.y+k*5,18+k*2,0,Math.PI*2);c.strokeStyle='#a875ff';c.lineWidth=4;c.stroke()}}
      else if(e.type==='shield'){const q=Math.min(1,age/550);c.globalAlpha=(1-q)*.7;c.strokeStyle='#8ddcff';c.lineWidth=6;c.beginPath();c.arc(e.x,e.y,28+q*16,-1.7,1.7);c.stroke()}
      else if(e.type==='skill'){const q=Math.min(1,age/720),r=e.key==='r'?28+q*170:e.key==='e'?20+q*90:22+q*65;const col=e.hero==='warrior'?'#ffd76a':e.hero==='mage'?'#a7dcff':'#d09aff';c.globalAlpha=(1-q)*.82;c.lineWidth=e.key==='r'?10:5;c.strokeStyle=col;c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();if(age<300){c.globalAlpha=1-age/300;c.font=e.key==='r'?'46px system-ui':'30px system-ui';c.textAlign='center';c.fillText(e.key==='r'?'✦':e.hero==='warrior'?'🛡️':e.hero==='mage'?'✦':'⚡',e.x,e.y-24)}if(e.hits>1&&age<600){c.globalAlpha=1-age/600;c.font='900 17px system-ui';c.fillStyle='#fff';c.fillText(`${e.hits} HITS`,e.x,e.y-52)}}
      else if(e.type==='ultimate'){const q=Math.min(1,age/1000);c.globalAlpha=(1-q)*.32;c.fillStyle='#fff';c.beginPath();c.arc(e.x,e.y,35+q*210,0,Math.PI*2);c.fill();c.globalAlpha=(1-q)*.9;c.strokeStyle=e.hero==='warrior'?'#ffd76a':e.hero==='mage'?'#9edcff':'#d39bff';c.lineWidth=7;c.beginPath();c.arc(e.x,e.y,35+q*210,0,Math.PI*2);c.stroke()}
    }
    if(combo>1&&now-comboAt<1200){c.globalAlpha=Math.max(0,(1200-(now-comboAt))/1200);c.textAlign='center';c.font='900 20px system-ui';c.fillStyle='#ffd34d';c.fillText(`COMBO ×${combo}`,500,34);c.font='700 10px system-ui';c.fillStyle='#fff';c.fillText(combo>=5?'RAMPAGE!':combo>=3?'ON FIRE!':'CHAIN HIT',500,50)}
    c.restore();requestAnimationFrame(draw)}
  draw();
})();