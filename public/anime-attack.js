(()=>{
  const game=document.getElementById('game');
  const base=document.getElementById('arena');
  if(!game||!base)return;
  const wrap=game.querySelector('.game-wrap');
  if(!wrap)return;
  const old=wrap.querySelector('.anime-attack-layer'); if(old)old.remove();
  const canvas=document.createElement('canvas'); canvas.className='anime-attack-layer'; wrap.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  const players=new Map(), bursts=[];
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){
      this._attackHandler=fn;
      super.onmessage=e=>{
        try{
          const m=JSON.parse(e.data), now=performance.now();
          if(m.type==='state'){
            for(const p of (Array.isArray(m.players)?m.players:[])) players.set(p.id,p);
          } else if(m.type==='combat' && m.action==='attack'){
            const p=players.get(m.by);
            if(p) burst(p,'attack',now);
          } else if(m.type==='ability'){
            const p=players.get(m.by);
            if(p) burst(p,m.key||'q',now);
          } else if(m.type==='effect'){
            let p=players.get(m.by);
            if(!p){
              let best=null,d=1e9;
              for(const x of players.values()) if(x.alive!==false&&x.team===m.team){const dx=x.x-m.x,dy=x.y-m.y,n=dx*dx+dy*dy;if(n<d){d=n;best=x}}
              p=best;
            }
            if(p) burst(p,m.key||'q',now,m.x,m.y);
          }
        }catch{}
        if(this._attackHandler)this._attackHandler(e);
      };
    }
    get onmessage(){return this._attackHandler}
  };
  function resize(){const r=base.getBoundingClientRect();canvas.width=base.width;canvas.height=base.height;canvas.style.width=r.width+'px';canvas.style.height=r.height+'px'}
  addEventListener('resize',resize,{passive:true}); resize();
  function burst(p,key,t,tx,ty){
    bursts.push({p,key,t,tx,ty});
    if(bursts.length>80)bursts.splice(0,20);
  }
  function glow(c,b=18){ctx.shadowColor=c;ctx.shadowBlur=b}
  function arc(x,y,r,a1,a2,c,w=5){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,r,a1,a2);ctx.stroke()}
  function line(x1,y1,x2,y2,c,w=4){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function drawHeroFx(e,a){
    const p=e.p; if(!p||p.alive===false)return;
    const x=p.x,y=p.y,ang=(p.team===1?0:Math.PI)+Math.sin(e.t/55)*.25;
    const h=p.hero||'warrior', k=e.key, c=h==='mage'?'#bca7ff':h==='assassin'?'#ff73df':h==='samurai'?'#ffb0ca':h==='shaman'?'#8fffb9':h==='cyborg'?'#7cffff':'#ffd36b';
    ctx.save(); ctx.globalAlpha=Math.max(0,1-a); glow(c,22);
    if(k==='attack'){
      if(h==='warrior'){
        arc(x,y,38,ang-.9,ang+.65,c,7); line(x,y,x+Math.cos(ang)*42,y+Math.sin(ang)*42,'#fff4d0',3);
      } else if(h==='mage'){
        circle(x+Math.cos(ang)*34,y+Math.sin(ang)*34,10,c); arc(x,y,28,ang-1.1,ang+1.1,c,3);
      } else if(h==='assassin'){
        line(x,y,x+Math.cos(ang-.35)*48,y+Math.sin(ang-.35)*48,'#fff',5); line(x,y,x+Math.cos(ang+.35)*48,y+Math.sin(ang+.35)*48,c,4);
      } else if(h==='samurai'){
        arc(x,y,52,ang-1.25,ang+.25,'#fff',4); arc(x,y,55,ang-1.1,ang+.15,c,6);
      } else if(h==='shaman'){
        for(let i=0;i<3;i++)arc(x,y,22+i*9,ang-1.1+i*.2,ang+.9+i*.2,c,3);
      } else {
        line(x,y,x+Math.cos(ang)*44,y+Math.sin(ang)*44,c,8); circle(x+Math.cos(ang)*48,y+Math.sin(ang)*48,7,'#fff');
      }
    } else {
      const r=k==='r'?95:k==='e'?62:k==='w'?42:55;
      if(h==='warrior'){
        arc(x,y,r,ang-1.35,ang+1.35,c,k==='r'?10:6);
        if(k==='r')arc(x,y,r+18,ang-1,ang+1,'#fff',3);
      } else if(h==='mage'){
        circle(x+Math.cos(ang)*r*.5,y+Math.sin(ang)*r*.5,12,c);arc(x,y,r,0,Math.PI*2,c,4);
      } else if(h==='assassin'){
        line(x,y,x+Math.cos(ang)*r,y+Math.sin(ang)*r,c,6);line(x,y,x+Math.cos(ang+.4)*r*.8,y+Math.sin(ang+.4)*r*.8,'#fff',3);
      } else if(h==='samurai'){
        arc(x,y,r,ang-1.5,ang+.1,'#fff',4);arc(x,y,r+8,ang-1.4,ang+.2,c,7);
      } else if(h==='shaman'){
        arc(x,y,r,0,Math.PI*2,c,5);for(let i=0;i<5;i++){const q=i*1.256+e.t/180;circle(x+Math.cos(q)*r,y+Math.sin(q)*r,5,c)}
      } else {
        circle(x,y,r*.35,c);arc(x,y,r,0,Math.PI*2,'#fff',3);line(x-r,y,x+r,y,c,3);line(x,y-r,x,y+r,c,3);
      }
    }
    ctx.restore();
  }
  function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function render(){
    const now=performance.now(); ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let i=bursts.length-1;i>=0;i--){const e=bursts[i],age=now-e.t;if(age>650){bursts.splice(i,1);continue}drawHeroFx(e,age/650)}
    requestAnimationFrame(render);
  }
  render();
})();