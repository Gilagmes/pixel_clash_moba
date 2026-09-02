(()=>{
  const canvas=document.createElement('canvas');canvas.className='anime-model-layer';
  const arena=document.getElementById('arena'),game=document.getElementById('game');
  if(!arena||!game)return;
  canvas.width=arena.width;canvas.height=arena.height;game.querySelector('.game-wrap')?.appendChild(canvas);
  const ctx=canvas.getContext('2d');let players=[],skinMap=new Map(),t=0;
  const skins={
    'Neon Ronin':['#20e7ff','#17243b','#eaffff'], 'Crimson Oni':['#ff405d','#3b101c','#fff0f3'],
    'Moon Sorcerer':['#9c7cff','#17122f','#f2edff'], 'Astral Witch':['#e86cff','#241032','#ffeaff'],
    'Void Reaper':['#9b6cff','#11101f','#f4edff'], 'Cyber Shinobi':['#36f1ff','#102a35','#eaffff'],
    'Sakura Ronin':['#ff75b7','#3a1830','#fff1f8'], 'Spirit Oracle':['#6df0c0','#15342e','#eafff7'],
    'Overdrive X':['#ffd34d','#18252d','#fff8d9']
  };
  function resize(){const r=arena.getBoundingClientRect();canvas.style.width=r.width+'px';canvas.style.height=r.height+'px'}addEventListener('resize',resize);resize();
  const Native=window.WebSocket;window.WebSocket=class extends Native{set onmessage(fn){this._h=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state')players=m.players||[];if(m.type==='skin:selected')skinMap.set(m.id,m.skin||'')}catch{}this._h&&this._h(e)}}get onmessage(){return this._h}};
  function pal(p){const key=p.skin||skinMap.get(p.id)||'';return skins[key]||([p.team===1?'#45d9ff':'#ff5278','#182235','#fff']);}
  function limb(x1,y1,x2,y2,c,w=7){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function model(p){const x=p.x,y=p.y, [accent,body,light]=pal(p), phase=Math.sin(t/130+p.id?.length||0), move=Math.sin(t/95+p.x)*2;
    ctx.save();ctx.translate(x,y);ctx.shadowColor=accent;ctx.shadowBlur=16;ctx.globalAlpha=.98;
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,15,18,23,0,0,7);ctx.fill();
    limb(-10,28,-13,48,body,8);limb(10,28,14,48,body,8);limb(-12,0,-25+move,17,body,7);limb(12,0,26-move,15,body,7);
    ctx.fillStyle=light;ctx.beginPath();ctx.arc(0,-15,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-15,-19);ctx.lineTo(-5,-35);ctx.lineTo(3,-28);ctx.lineTo(15,-36);ctx.lineTo(13,-13);ctx.lineTo(-13,-13);ctx.closePath();ctx.fill();
    ctx.fillStyle=accent;ctx.fillRect(-8,-17,5,3);ctx.fillRect(3,-17,5,3);
    if(p.hero==='warrior'||p.hero==='samurai'){limb(16,3,31,-18+phase,accent,5);limb(31,-18+phase,38,-26+phase,light,2);}
    if(p.hero==='mage'||p.hero==='shaman'){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(23,-10+phase,7,0,7);ctx.fill();ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(23,-10+phase,13,0,7);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke()}
    if(p.hero==='assassin'||p.hero==='cyborg'){limb(-16,3,-32,-12-phase,light,3);limb(16,3,32,-12+phase,light,3)}
    ctx.restore();
    ctx.save();ctx.textAlign='center';ctx.font='900 9px system-ui';ctx.fillStyle=accent;ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText((p.heroName||p.hero||'HERO').toUpperCase(),x,y+62);ctx.restore();
  }
  function render(){t=Date.now();ctx.clearRect(0,0,canvas.width,canvas.height);players.forEach(p=>{if(p.alive!==false)model(p)});requestAnimationFrame(render)}render();
})();