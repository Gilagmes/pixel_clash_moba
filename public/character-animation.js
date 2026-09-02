(()=>{
  const game=document.getElementById('game'),base=document.getElementById('arena');
  if(!game||!base)return;
  const wrap=game.querySelector('.game-wrap'); if(!wrap)return;
  const layer=document.createElement('canvas'); layer.className='character-animation-layer'; layer.width=base.width; layer.height=base.height; wrap.appendChild(layer);
  const ctx=layer.getContext('2d');
  const players=new Map(), fx=[];
  const NativeWS=window.WebSocket;
  function resize(){const r=base.getBoundingClientRect();layer.style.width=r.width+'px';layer.style.height=r.height+'px'}
  addEventListener('resize',resize,{passive:true}); resize();
  function burst(p,type){if(!p)return; fx.push({x:p.x,y:p.y,type,until:performance.now()+420});}
  window.WebSocket=class extends NativeWS{
    constructor(...args){super(...args);this.addEventListener('message',e=>{try{const m=JSON.parse(e.data);if(m.type==='state'&&Array.isArray(m.players)){m.players.forEach(p=>{const old=players.get(p.id);players.set(p.id,{...p});if(old&&old.hp>p.hp)burst(p,'hit')})}else if(m.type==='combat'){const p=players.get(m.attackerId)||players.get(m.id);if(p)burst(p,'attack')}else if(m.type==='ability'||m.type==='effect'){const p=players.get(m.playerId)||players.get(m.id);if(p)burst(p,String(m.ability||m.skill||'ability').toLowerCase())}}catch{}})}
  };
  function glow(c,b){ctx.shadowColor=c;ctx.shadowBlur=b}
  function slash(x,y,a,c,len,w){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,len,a-.8,a+.8);ctx.stroke();ctx.restore()}
  function draw(p,t){if(p.alive===false)return;const f=fx.find(v=>v.x===p.x&&v.y===p.y);const hero=p.hero||'warrior';const phase=Math.sin(t/180+p.x*.01);let bob=phase*2,lean=0,weapon=0;if(f){const q=Math.max(0,1-(f.until-t)/420);if(f.type==='hit')lean=-Math.sin(q*Math.PI)*6;else {weapon=Math.sin(q*Math.PI)*1.15;lean=Math.sin(q*Math.PI)*3}}
    const c=hero==='mage'?'#8fc7ff':hero==='assassin'?'#d18aff':hero==='samurai'?'#ff789f':hero==='shaman'?'#78f0ad':hero==='cyborg'?'#72faff':'#ffb65a';
    ctx.save();ctx.translate(p.x,p.y+bob);ctx.rotate(lean*.02);glow(c,12);
    ctx.globalAlpha=.18;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,35,24,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(hero==='warrior'||hero==='samurai'){ctx.fillStyle='#171b28';ctx.fillRect(-16,-8,32,31);ctx.fillStyle=c;ctx.fillRect(-11,-30,22,20);ctx.fillStyle='#f0d0bd';ctx.beginPath();ctx.arc(0,-36,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(12,-2);ctx.lineTo(28,-25-weapon*18);ctx.stroke();slash(0,-5,-1.8+weapon,c,34,hero==='samurai'?4:3);if(hero==='samurai'){ctx.strokeStyle='#fff0f5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-34,15,Math.PI*1.05,Math.PI*1.95);ctx.stroke()}}
    else if(hero==='mage'||hero==='shaman'){ctx.fillStyle='#18233c';ctx.beginPath();ctx.moveTo(-19,25);ctx.lineTo(-13,-22);ctx.lineTo(0,-30);ctx.lineTo(13,-22);ctx.lineTo(19,25);ctx.closePath();ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-36,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eafcff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(14,8);ctx.lineTo(31,-34-weapon*12);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(32,-38-weapon*12,7+weapon*4,0,Math.PI*2);ctx.fill();if(hero==='shaman'){ctx.strokeStyle='#d8ff8e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-8,28+weapon*8,0,Math.PI*2);ctx.stroke()}}
    else if(hero==='assassin'){ctx.fillStyle='#171326';ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(18,5);ctx.lineTo(12,28);ctx.lineTo(0,18);ctx.lineTo(-12,28);ctx.lineTo(-18,5);ctx.closePath();ctx.fill();ctx.fillStyle='#eac8ba';ctx.beginPath();ctx.arc(0,-36,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-12,2);ctx.lineTo(-30,-18+weapon*14);ctx.moveTo(12,2);ctx.lineTo(30,-18-weapon*14);ctx.stroke();if(f){ctx.globalAlpha=.35;ctx.strokeStyle=c;ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,34+weapon*12,0,Math.PI*2);ctx.stroke()}}
    else {ctx.fillStyle='#172733';ctx.fillRect(-17,-5,34,31);ctx.fillStyle=c;ctx.fillRect(-14,-29,28,27);ctx.fillStyle='#dffcff';ctx.fillRect(-11,-44,22,17);ctx.fillStyle='#101923';ctx.fillRect(-9,-39,18,5);ctx.strokeStyle=c;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(14,3);ctx.lineTo(33,-10-weapon*10);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(35,-12-weapon*10,4+weapon*3,0,Math.PI*2);ctx.fill()}
    ctx.restore();
  }
  function loop(t){ctx.clearRect(0,0,base.width,base.height);players.forEach(p=>draw(p,t));for(let i=fx.length-1;i>=0;i--)if(fx[i].until<t)fx.splice(i,1);requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();