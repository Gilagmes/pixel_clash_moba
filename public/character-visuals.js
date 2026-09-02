(()=>{
  const game=document.getElementById('game');
  const base=document.getElementById('arena');
  if(!game||!base)return;
  const layer=document.createElement('canvas');
  layer.className='character-visuals-layer';
  layer.width=base.width; layer.height=base.height;
  game.querySelector('.game-wrap')?.appendChild(layer);
  const ctx=layer.getContext('2d');
  const state={players:[],minions:[]};
  let raf=0;
  function resize(){const r=base.getBoundingClientRect();layer.style.width=r.width+'px';layer.style.height=r.height+'px'}
  addEventListener('resize',resize,{passive:true});resize();
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){this._visualHandler=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state'){state.players=Array.isArray(m.players)?m.players:[];state.minions=Array.isArray(m.minions)?m.minions:[]}}catch{}if(this._visualHandler)this._visualHandler(e)}}
    get onmessage(){return this._visualHandler}
  };
  function color(team,mine=false){return mine?'#ffe66b':team===1?'#42c9ff':'#ff5577'}
  function reset(){ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.lineWidth=1;ctx.strokeStyle='#fff';ctx.fillStyle='#fff'}
  function glow(c,b=12){ctx.shadowColor=c;ctx.shadowBlur=b}
  function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function rect(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function hp(p,w=56){const max=Math.max(1,p.maxHp||100),v=Math.max(0,p.hp||0),x=p.x-w/2,y=p.y-47;ctx.fillStyle='#090c14';ctx.fillRect(x-1,y-1,w+2,7);ctx.fillStyle=v/max>.5?'#49e58b':v/max>.25?'#ffd15a':'#ff5268';ctx.fillRect(x,y,w*Math.min(1,v/max),5)}
  function label(p){ctx.textAlign='center';ctx.font='900 10px system-ui';ctx.fillStyle='#fff';ctx.fillText((p.heroName||p.hero||'').toUpperCase(),p.x,p.y+45);ctx.font='900 8px system-ui';ctx.fillStyle='#ffe68a';ctx.fillText('LV '+(p.level||1),p.x,p.y-51)}
  function warrior(p,c,t){const x=p.x,y=p.y,a=Math.sin(t/120)*2;glow(c,15);rect(x-15,y-10,30,27,6,'#34435b');rect(x-11,y-23,22,16,5,'#aebbd0');ctx.fillStyle='#dfe8f4';ctx.beginPath();ctx.arc(x,y-18,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263042';ctx.fillRect(x-10,y-23,20,8);ctx.fillStyle='#ffd94f';ctx.fillRect(x-6,y-19,4,3);ctx.fillRect(x+2,y-19,4,3);ctx.fillStyle='#70849f';ctx.beginPath();ctx.roundRect(x-23,y-10,9,23,4);ctx.fill();ctx.strokeStyle='#dbe6f4';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#9fb2cc';ctx.beginPath();ctx.arc(x-18,y+1,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f5f7fb';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+13,y+10);ctx.lineTo(x+25,y-12+a);ctx.stroke();ctx.strokeStyle='#9aaec7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+25,y-12+a);ctx.lineTo(x+31,y-16+a);ctx.stroke();reset()}
  function mage(p,c,t){const x=p.x,y=p.y,pulse=1+Math.sin(t/130)*.12;glow(c,18);ctx.fillStyle='#514083';ctx.beginPath();ctx.moveTo(x-16,y+15);ctx.lineTo(x-12,y-7);ctx.lineTo(x,y-18);ctx.lineTo(x+12,y-7);ctx.lineTo(x+16,y+15);ctx.closePath();ctx.fill();ctx.fillStyle='#dcd4ff';ctx.beginPath();ctx.arc(x,y-19,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29223f';ctx.beginPath();ctx.arc(x,y-22,11,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#bda8ff';ctx.fillRect(x-6,y-20,4,3);ctx.fillRect(x+2,y-20,4,3);ctx.strokeStyle='#d9caff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+14,y+11);ctx.lineTo(x+24,y-25);ctx.stroke();circle(x+25,y-29,6*pulse,'#f1dcff');circle(x+25,y-29,2,'#fff');reset()}
  function assassin(p,c,t){const x=p.x,y=p.y,s=Math.sin(t/90)*3;glow(c,16);ctx.fillStyle='#202533';ctx.beginPath();ctx.moveTo(x,y-25);ctx.lineTo(x+16,y-4);ctx.lineTo(x+13,y+16);ctx.lineTo(x,y+21);ctx.lineTo(x-13,y+16);ctx.lineTo(x-16,y-4);ctx.closePath();ctx.fill();ctx.fillStyle='#cbd3df';ctx.beginPath();ctx.arc(x,y-18,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101521';ctx.beginPath();ctx.moveTo(x-12,y-20);ctx.lineTo(x,y-30);ctx.lineTo(x+12,y-20);ctx.lineTo(x+8,y-10);ctx.lineTo(x-8,y-10);ctx.closePath();ctx.fill();ctx.fillStyle='#ff5c8b';ctx.fillRect(x-6,y-17,4,3);ctx.fillRect(x+2,y-17,4,3);ctx.strokeStyle='#f0f4fb';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-11,y+10);ctx.lineTo(x-26,y-7+s);ctx.moveTo(x+11,y+10);ctx.lineTo(x+26,y-7-s);ctx.stroke();ctx.strokeStyle='#7e8ba1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-26,y-7+s);ctx.lineTo(x-30,y-10+s);ctx.moveTo(x+26,y-7-s);ctx.lineTo(x+30,y-10-s);ctx.stroke();reset()}
  function drawHero(p,t){if(!p||p.alive===false)return;const mine=window.__pixelMeId&&p.id===window.__pixelMeId,c=color(p.team,mine);if(p.hero==='mage')mage(p,c,t);else if(p.hero==='assassin')assassin(p,c,t);else warrior(p,c,t);hp(p);label(p)}
  function minionType(m,i){const s=String(m.type||m.kind||m.role||m.class||'').toLowerCase();if(/siege|cannon|catapult/.test(s))return'siege';if(/range|ranged|archer|caster/.test(s))return'ranged';return i%7===0?'siege':i%3===0?'ranged':'melee'}
  function drawMinion(m,i,t){if(!m||m.hp<=0)return;const x=m.x,y=m.y,c=m.team===1?'#6bd6ff':'#ff6684',type=minionType(m,i),b=Math.sin(t/120+i)*2;glow(c,8);if(type==='siege'){rect(x-18,y-10+b,36,20,5,'#394458');rect(x-11,y-6+b,22,7,3,'#aebbd0');circle(x,y-11+b,8,c);ctx.strokeStyle='#95a5bd';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-12,y+10);ctx.lineTo(x-17,y+16);ctx.moveTo(x+12,y+10);ctx.lineTo(x+17,y+16);ctx.stroke();ctx.strokeStyle='#dbe5f2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-7+b);ctx.lineTo(x+17,y-16+b);ctx.stroke()}else if(type==='ranged'){rect(x-9,y-9+b,18,18,5,'#3d4860');circle(x,y-12+b,7,c);ctx.strokeStyle='#e7eef8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+7,y+1+b,8,-1.2,1.2);ctx.stroke();ctx.beginPath();ctx.moveTo(x+10,y-6+b);ctx.lineTo(x+17,y+8+b);ctx.stroke()}else{rect(x-10,y-9+b,20,19,5,'#4b5870');circle(x,y-11+b,7,c);ctx.fillStyle='#fff';ctx.fillRect(x-4,y-12+b,2,2);ctx.fillRect(x+2,y-12+b,2,2);ctx.strokeStyle='#e2ebf5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-10,y+5+b);ctx.lineTo(x-17,y+12+b);ctx.stroke()}reset();const max=Math.max(1,m.maxHp||100),v=Math.max(0,m.hp||0);ctx.fillStyle='#0b0e16';ctx.fillRect(x-17,y-23,34,4);ctx.fillStyle=v/max>.5?'#49e58b':v/max>.25?'#ffd15a':'#ff5268';ctx.fillRect(x-17,y-23,34*Math.min(1,v/max),4)}
  function render(){const t=Date.now();ctx.clearRect(0,0,base.width,base.height);state.minions.forEach((m,i)=>drawMinion(m,i,t));state.players.forEach(p=>drawHero(p,t));raf=requestAnimationFrame(render)}
  render();
})();