(()=>{
  const game=document.getElementById('game'),base=document.getElementById('arena');
  if(!game||!base)return;
  const wrap=game.querySelector('.game-wrap'); if(!wrap)return;
  const old=wrap.querySelector('.skin-model-layer'); if(old)old.remove();
  const canvas=document.createElement('canvas');canvas.className='skin-model-layer';wrap.appendChild(canvas);
  const ctx=canvas.getContext('2d'),players=new Map();
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){this._skinHandler=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state')for(const p of (m.players||[]))players.set(p.id,p)}catch{}if(this._skinHandler)this._skinHandler(e)}}
    get onmessage(){return this._skinHandler}
  };
  function resize(){const r=base.getBoundingClientRect();canvas.width=base.width;canvas.height=base.height;canvas.style.width=r.width+'px';canvas.style.height=r.height+'px'}
  addEventListener('resize',resize,{passive:true});resize();
  const skinStyle={
    'warrior-neon':['#7fffff','#163e5a'],'warrior-crimson':['#ff5265','#35101a'],
    'warrior-thunder':['#ffe66d','#182c52'],'mage-moon':['#b7d8ff','#28245a'],'mage-astral':['#ff8cff','#401752'],
    'mage-frost':['#dffcff','#214c66'],'assassin-void':['#c38cff','#211034'],'assassin-cyber':['#72ffff','#123a44'],
    'assassin-blood':['#ff405f','#3a0e18'],'samurai-sakura':['#ffd1e2','#4a1830'],'samurai-storm':['#b9e6ff','#173654'],
    'shaman-spirit':['#d9ff83','#17452f'],'shaman-ember':['#ff9b54','#4b2117'],'cyborg-overdrive':['#ffef76','#143d43'],
    'cyborg-plasma':['#ff78ed','#361446']
  };
  function line(x1,y1,x2,y2,c,w){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function ring(x,y,r,c,a=.75){ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  function draw(p,t){const s=skinStyle[p.skin];if(!s||p.alive===false)return;const[x,y]=[p.x,p.y],c=s[0],d=s[1],q=t/180;ctx.save();ctx.shadowColor=c;ctx.shadowBlur=14;
    if(p.skin==='warrior-thunder'){ring(x,y,35,c,.6);line(x-27,y+25,x-5,y+5,c,3);line(x+5,y+5,x+27,y+25,c,3);line(x-4,y-54,x-10,y-63,c,3);line(x+4,y-54,x+10,y-63,c,3)}
    else if(p.skin==='warrior-neon'){ring(x,y,34,c,.7);ctx.fillStyle=c;ctx.globalAlpha=.75;ctx.fillRect(x-20,y-4,40,3);ctx.globalAlpha=1}
    else if(p.skin==='warrior-crimson'){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-14,y-48);ctx.lineTo(x-5,y-60);ctx.lineTo(x,y-51);ctx.lineTo(x+6,y-62);ctx.lineTo(x+15,y-47);ctx.closePath();ctx.fill()}
    else if(p.skin==='mage-frost'){for(let i=0;i<6;i++){const a=q+i*Math.PI/3;line(x+Math.cos(a)*20,y-20+Math.sin(a)*20,x+Math.cos(a)*34,y-20+Math.sin(a)*34,c,2)}ring(x+28,y-40,11,c,.7)}
    else if(p.skin==='mage-moon'){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+28,y-40,10,0,Math.PI*2);ctx.arc(x+32,y-43,9,0,Math.PI*2);ctx.fill();ring(x,y,37,c,.45)}
    else if(p.skin==='mage-astral'){for(let i=0;i<5;i++){const a=q*.5+i*1.25;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+Math.cos(a)*38,y-12+Math.sin(a)*30,3,0,Math.PI*2);ctx.fill()}}
    else if(p.skin==='assassin-blood'){line(x-20,y-8,x-42,y-30,c,5);line(x+20,y-8,x+42,y-30,c,5);ring(x,y,31,c,.45)}
    else if(p.skin==='assassin-cyber'){line(x-18,y-28,x-35,y-42,c,3);line(x+18,y-28,x+35,y-42,c,3);ctx.fillStyle=c;ctx.fillRect(x-3,y-48,6,4)}
    else if(p.skin==='assassin-void'){ctx.globalAlpha=.22;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,43+Math.sin(q)*4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
    else if(p.skin==='samurai-storm'){ring(x,y,39,c,.55);line(x-35,y-5,x-50,y-18,c,2);line(x+35,y-5,x+50,y-18,c,2)}
    else if(p.skin==='samurai-sakura'){for(let i=0;i<5;i++){const a=q*.7+i*1.25;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*42,y-15+Math.sin(a)*28,5,3,a,0,Math.PI*2);ctx.fill()}}
    else if(p.skin==='shaman-ember'){for(let i=0;i<4;i++){const a=q+i*1.57;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+Math.cos(a)*36,y-8+Math.sin(a)*27,4,0,Math.PI*2);ctx.fill()}}
    else if(p.skin==='shaman-spirit'){ring(x,y,40,c,.5);for(let i=0;i<3;i++){const a=q+i*2.09;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+Math.cos(a)*32,y-20+Math.sin(a)*22,4,0,Math.PI*2);ctx.fill()}}
    else if(p.skin==='cyborg-plasma'){ring(x,y,40,c,.65);line(x-31,y-24,x-45,y-38,c,4);line(x+31,y-24,x+45,y-38,c,4)}
    else if(p.skin==='cyborg-overdrive'){ring(x,y,42,c,.7);ctx.fillStyle=c;ctx.globalAlpha=.8;ctx.fillRect(x+25,y-13,15,5);ctx.globalAlpha=1}
    ctx.restore();
  }
  function render(){ctx.clearRect(0,0,canvas.width,canvas.height);const t=performance.now();players.forEach(p=>draw(p,t));requestAnimationFrame(render)}render();
})();
