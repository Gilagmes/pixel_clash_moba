(()=>{
  const boot=()=>{
    const arena=document.getElementById('arena'),wrap=document.querySelector('.game-wrap');
    if(!arena||!wrap)return;
    const old=wrap.querySelector('.anime-combat-animation-layer'); if(old)old.remove();
    const canvas=document.createElement('canvas');canvas.className='anime-combat-animation-layer';wrap.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    const players=new Map(),fx=[];
    const NativeWS=window.WebSocket;
    window.WebSocket=class extends NativeWS{
      set onmessage(fn){
        this._acaHandler=fn;
        super.onmessage=e=>{
          try{
            const m=JSON.parse(e.data),now=performance.now();
            if(m.type==='state'){
              for(const p of (Array.isArray(m.players)?m.players:[]))players.set(p.id,p);
            }else if(m.type==='combat'&&m.action==='attack'){
              const p=players.get(m.by);if(p)spawn(p,'attack',now);
            }else if(m.type==='ability'){
              const p=players.get(m.by);if(p)spawn(p,String(m.key||'q').toLowerCase(),now);
            }else if(m.type==='effect'){
              const p=players.get(m.by)||nearest(m.x,m.y,m.team);if(p)spawn(p,String(m.key||'q').toLowerCase(),now,m.x,m.y);
            }
          }catch{}
          if(this._acaHandler)this._acaHandler(e);
        };
      }
      get onmessage(){return this._acaHandler}
    };
    function nearest(x,y,team){let best=null,d=1e12;for(const p of players.values())if(p.alive!==false&&(!team||p.team===team)){const n=(p.x-x)**2+(p.y-y)**2;if(n<d){d=n;best=p}}return best}
    function spawn(p,key,t,tx,ty){fx.push({p,key,t,tx,ty});if(fx.length>70)fx.splice(0,20)}
    function resize(){canvas.width=arena.width;canvas.height=arena.height;canvas.style.width=arena.clientWidth+'px';canvas.style.height=arena.clientHeight+'px'}
    addEventListener('resize',resize,{passive:true});resize();
    const palettes={
      warrior:{main:'#ffd36a',hot:'#fff4c4'},mage:{main:'#a98cff',hot:'#e7ddff'},assassin:{main:'#ff5bd7',hot:'#ffffff'},
      samurai:{main:'#ff6686',hot:'#fff1f5'},shaman:{main:'#6ff0b1',hot:'#e8fff4'},cyborg:{main:'#55e9ff',hot:'#ffffff'}
    };
    function color(p){const s=String(p?.skin||'');const h=p?.hero||'warrior';if(s.includes('thunder'))return ['#ffe45c','#fff'];if(s.includes('frost'))return ['#8be9ff','#fff'];if(s.includes('blood'))return ['#ff304f','#ffd2d8'];if(s.includes('storm'))return ['#8fa8ff','#fff'];if(s.includes('ember'))return ['#ff8a3d','#fff1cf'];if(s.includes('plasma'))return ['#45ffe0','#fff'];return [palettes[h]?.main||'#fff',palettes[h]?.hot||'#fff']}
    function line(x1,y1,x2,y2,c,w=6){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
    function arc(x,y,r,a,b,c,w=6){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,r,a,b);ctx.stroke()}
    function circle(x,y,r,c,fill=true){ctx.fillStyle=c;ctx.strokeStyle=c;if(fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}else{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke()}}
    function glow(c,b=24){ctx.shadowColor=c;ctx.shadowBlur=b}
    function draw(p,key,age,tx,ty){if(!p||p.alive===false)return;const u=Math.min(1,age/620),ease=1-Math.pow(1-u,3),x=p.x,y=p.y,dir=p.team===1?1:-1,ang=(p.team===1?0:Math.PI)+Math.sin(age*.03)*.08,[c,hot]=color(p),h=p.hero||'warrior';ctx.save();ctx.globalAlpha=1-u;glow(c,28);
      if(key==='attack'){
        if(h==='warrior'){const swing=-1.15+ease*2.15;arc(x,y,34,swing,swing+.85,c,9);line(x+dir*8,y-4,x+dir*(48+ease*18),y+dir*.25,hot,3);circle(x+dir*55,y,5,hot)}
        else if(h==='mage'){const q=dir*(18+ease*48);circle(x+q,y-5,10,c);arc(x,y,30,ang-1.3,ang+1.3,hot,3);for(let i=0;i<3;i++)circle(x+dir*(q+i*9),y-5+i*5,3,c)}
        else if(h==='assassin'){const a1=ang-.5,a2=ang+.5;line(x,y,x+Math.cos(a1)*58*ease,y+Math.sin(a1)*58*ease,hot,5);line(x,y,x+Math.cos(a2)*58*ease,y+Math.sin(a2)*58*ease,c,5)}
        else if(h==='samurai'){arc(x,y,58,-1.45+ease*1.9,-.35+ease*1.9,hot,4);arc(x,y,61,-1.4+ease*1.9,-.3+ease*1.9,c,8)}
        else if(h==='shaman'){for(let i=0;i<4;i++){const q=i*Math.PI/2+age*.006;circle(x+Math.cos(q)*34*ease,y+Math.sin(q)*34*ease,5,c)}arc(x,y,26+20*ease,0,Math.PI*2,c,3)}
        else {line(x+dir*6,y,x+dir*(65*ease),y,c,10);circle(x+dir*(68*ease),y,9,hot);for(let i=0;i<3;i++)line(x+dir*(15+i*12),y-8-i*3,x+dir*(27+i*12),y-8-i*3,hot,2)}
      }else{
        const r=key==='r'?110:key==='e'?72:key==='w'?48:62;
        if(h==='warrior'){arc(x,y,r,ang-1.45,ang+1.45,c,key==='r'?13:7);if(key==='r'){arc(x,y,r+18,ang-1.1,ang+1.1,hot,4);for(let i=0;i<5;i++)line(x+Math.cos(ang+i*.35)*r*.55,y+Math.sin(ang+i*.35)*r*.55,x+Math.cos(ang+i*.35)*r,y+Math.sin(ang+i*.35)*r,hot,2)}}
        else if(h==='mage'){circle(x+dir*r*.55,y,r*.18,c);arc(x,y,r,0,Math.PI*2,hot,3);for(let i=0;i<6;i++){const q=i*Math.PI/3+age*.004;circle(x+Math.cos(q)*r,y+Math.sin(q)*r,4,c)}if(key==='r'){circle(x+dir*95,y,20,c);circle(x+dir*95,y,10,hot)}}
        else if(h==='assassin'){const dash=key==='e'?90:50;line(x,y,x+dir*dash*ease,y,c,8);line(x,y-8,x+dir*dash*ease,y-8,hot,3);for(let i=0;i<4;i++)circle(x-dir*i*15,y+i*3,4,c);if(key==='r'){arc(x,y,75,ang-1.3,ang+1.3,c,10);circle(x+dir*55,y,12,hot)}}
        else if(h==='samurai'){arc(x,y,r,-1.55+ease*1.5,.15+ease*1.5,hot,4);arc(x,y,r+10,-1.5+ease*1.5,.2+ease*1.5,c,8);if(key==='r'){line(x-dir*70,y,x+dir*70,y,hot,3)}}
        else if(h==='shaman'){arc(x,y,r,0,Math.PI*2,c,6);for(let i=0;i<7;i++){const q=i*Math.PI*2/7+age*.005;circle(x+Math.cos(q)*r,y+Math.sin(q)*r,7,c)}if(key==='r')circle(x,y,28,hot)}
        else {circle(x,y,r*.36,c);arc(x,y,r,0,Math.PI*2,hot,3);line(x-r,y,x+r,y,c,3);line(x,y-r,x,y+r,c,3);if(key==='r'){for(let i=0;i<5;i++){const q=i*Math.PI*2/5+age*.004;circle(x+Math.cos(q)*r,y+Math.sin(q)*r,7,c)}}}
        if(tx!=null&&ty!=null){ctx.globalAlpha*=.75;line(x,y,tx,ty,hot,2);circle(tx,ty,7,c)}
      }
      ctx.restore();
    }
    function render(){const now=performance.now();ctx.clearRect(0,0,canvas.width,canvas.height);for(let i=fx.length-1;i>=0;i--){const e=fx[i],age=now-e.t;if(age>700){fx.splice(i,1);continue}draw(e.p,e.key,age,e.tx,e.ty)}requestAnimationFrame(render)}
    render();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
