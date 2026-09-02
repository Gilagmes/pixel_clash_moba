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

  function resize(){
    const r=base.getBoundingClientRect();
    layer.style.width=r.width+'px';
    layer.style.height=r.height+'px';
  }
  addEventListener('resize',resize,{passive:true}); resize();

  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){
      this._visualHandler=fn;
      super.onmessage=e=>{
        try{
          const m=JSON.parse(e.data);
          if(m.type==='state'){
            state.players=Array.isArray(m.players)?m.players:[];
            state.minions=Array.isArray(m.minions)?m.minions:[];
          }
        }catch{}
        if(this._visualHandler)this._visualHandler(e);
      };
    }
    get onmessage(){return this._visualHandler}
  };

  function teamColor(team,mine=false){return mine?'#ffe36e':team===1?'#55c7ff':'#ff6177'}
  function shadow(c){ctx.shadowColor=c;ctx.shadowBlur=9}
  function reset(){ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.lineWidth=1}
  function pixelCircle(x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function hpBar(p,w=48){
    const max=Math.max(1,p.maxHp||100), hp=Math.max(0,p.hp||0), x=p.x-w/2,y=p.y-38;
    ctx.fillStyle='#10131d';ctx.fillRect(x,y,w,5);
    ctx.fillStyle=hp/max>.5?'#48df88':hp/max>.25?'#ffd45a':'#ff5d6e';
    ctx.fillRect(x,y,w*Math.max(0,Math.min(1,hp/max)),5);
  }
  function label(p){
    ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';
    ctx.fillText((p.heroName||p.hero||'').toUpperCase(),p.x,p.y+36);
    ctx.font='bold 8px system-ui';ctx.fillStyle='#ffe78b';ctx.fillText('LV '+(p.level||1),p.x,p.y-43);
  }
  function warrior(p,c,t){
    const x=p.x,y=p.y,step=Math.sin(t/110)*1.5;
    shadow(c);
    ctx.fillStyle='#253247';ctx.beginPath();ctx.roundRect(x-12,y-8,24,20,5);ctx.fill();
    ctx.fillStyle='#aebbd0';ctx.fillRect(x-10,y-7,20,7);
    ctx.fillStyle='#d9e4f3';ctx.beginPath();ctx.arc(x,y-12,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#202735';ctx.fillRect(x-8,y-15,16,7);
    ctx.fillStyle='#ffd34d';ctx.fillRect(x-5,y-12,3,2);ctx.fillRect(x+2,y-12,3,2);
    ctx.fillStyle='#6e7f98';ctx.fillRect(x-17,y-7,7,17);ctx.fillStyle='#d6dfed';ctx.fillRect(x-19,y-4,4,10);
    ctx.strokeStyle='#f1f4fb';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+12,y+8);ctx.lineTo(x+21,y-7+step);ctx.stroke();
    ctx.strokeStyle='#8fa3bd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+18,y-8);ctx.lineTo(x+24,y-12);ctx.stroke();
    reset();
  }
  function mage(p,c,t){
    const x=p.x,y=p.y,pulse=1+Math.sin(t/170)*.08;
    shadow(c);
    ctx.fillStyle='#493d78';ctx.beginPath();ctx.moveTo(x-12,y+12);ctx.lineTo(x-9,y-5);ctx.lineTo(x,y-12);ctx.lineTo(x+9,y-5);ctx.lineTo(x+12,y+12);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d9cfff';ctx.beginPath();ctx.arc(x,y-13,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#28223f';ctx.beginPath();ctx.arc(x,y-15,9,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9f8cff';ctx.fillRect(x-4,y-14,3,2);ctx.fillRect(x+2,y-14,3,2);
    ctx.strokeStyle='#c8b7ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+11,y+9);ctx.lineTo(x+18,y-18);ctx.stroke();
    pixelCircle(x+18,y-20,4* pulse,'#d9c8ff');
    reset();
  }
  function assassin(p,c,t){
    const x=p.x,y=p.y,s=Math.sin(t/95)*2;
    shadow(c);
    ctx.fillStyle='#252936';ctx.beginPath();ctx.moveTo(x,y-17);ctx.lineTo(x+12,y+10);ctx.lineTo(x,y+14);ctx.lineTo(x-12,y+10);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c9d0dc';ctx.beginPath();ctx.arc(x,y-11,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#141722';ctx.fillRect(x-8,y-14,16,8);
    ctx.fillStyle='#ff5d86';ctx.fillRect(x-5,y-11,3,2);ctx.fillRect(x+2,y-11,3,2);
    ctx.strokeStyle='#dce4f3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-9,y+8);ctx.lineTo(x-20,y-4+s);ctx.moveTo(x+9,y+8);ctx.lineTo(x+20,y-4-s);ctx.stroke();
    reset();
  }
  function drawHero(p,t){
    if(!p||p.alive===false)return;
    const mine=window.__pixelMeId&&p.id===window.__pixelMeId,c=teamColor(p.team,mine);
    if(p.hero==='mage')mage(p,c,t);else if(p.hero==='assassin')assassin(p,c,t);else warrior(p,c,t);
    hpBar(p);label(p);
  }
  function minionType(m,i){
    const raw=String(m.type||m.kind||m.role||m.class||'').toLowerCase();
    if(/siege|cannon|catapult/.test(raw))return'siege';
    if(/range|ranged|archer|caster/.test(raw))return'ranged';
    if(i%7===0)return'siege';
    if(i%3===0)return'ranged';
    return'melee';
  }
  function drawMinion(m,i,t){
    if(!m||m.hp<=0)return;
    const x=m.x,y=m.y,c=m.team===1?'#79cfff':'#ff7185',type=minionType(m,i),bob=Math.sin(t/150+i)*1.2;
    shadow(c);
    if(type==='siege'){
      ctx.fillStyle='#3b4354';ctx.fillRect(x-13,y-8+bob,26,16);ctx.fillStyle='#b7c1d2';ctx.fillRect(x-9,y-5+bob,18,5);
      ctx.strokeStyle='#8f9bad';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-9,y+7);ctx.lineTo(x-14,y+13);ctx.moveTo(x+9,y+7);ctx.lineTo(x+14,y+13);ctx.stroke();
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y-8+bob,7,0,Math.PI*2);ctx.fill();
    }else if(type==='ranged'){
      ctx.fillStyle='#39445b';ctx.fillRect(x-7,y-7+bob,14,14);ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y-10+bob,6,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#e8eef7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+6,y+1+bob,6,-1.2,1.2);ctx.stroke();ctx.beginPath();ctx.moveTo(x+8,y-5+bob);ctx.lineTo(x+15,y+7+bob);ctx.stroke();
    }else{
      ctx.fillStyle='#465064';ctx.beginPath();ctx.roundRect(x-8,y-8+bob,16,17,4);ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y-9+bob,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e6edf7';ctx.fillRect(x-4,y-10+bob,2,2);ctx.fillRect(x+2,y-10+bob,2,2);
      ctx.strokeStyle='#dce4f3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-9,y+3+bob);ctx.lineTo(x-15,y+9+bob);ctx.stroke();
    }
    reset();
    const max=Math.max(1,m.maxHp||100),hp=Math.max(0,m.hp||0);ctx.fillStyle='#10131d';ctx.fillRect(x-14,y-20,28,3);ctx.fillStyle=hp/max>.5?'#48df88':hp/max>.25?'#ffd45a':'#ff5d6e';ctx.fillRect(x-14,y-20,28*Math.min(1,hp/max),3);
  }
  function render(){
    const t=Date.now();ctx.clearRect(0,0,1000,900);
    state.minions.forEach(drawMinion);
    state.players.forEach(p=>drawHero(p,t));
    raf=requestAnimationFrame(render);
  }
  render();
})();