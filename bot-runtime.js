// Stable bot runtime: keeps the existing AI, but adds a deterministic movement layer.
const Module=require('module');
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  const loaded=originalLoad.apply(this,arguments);
  if(request==='./bots' && parent && /server\.js$/.test(parent.filename) && loaded && !loaded.__pixelMotionWrapped){
    const originalTick=loaded.tickBots;
    const wrapped={...loaded};
    wrapped.tickBots=function(room){
      originalTick(room);
      const now=Date.now();
      for(const b of room?.players||[]){
        if(!b?.isBot||b.alive===false)continue;
        const lane=Number(b.botLane)||450;
        const dir=b.team===1?1:-1;
        const enemies=(room.players||[]).filter(p=>p.alive&&p.team!==b.team);
        let target=null,best=Infinity;
        for(const e of enemies){const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<best&&d<520){best=d;target=e}}
        const desired=target&&best>105?target:{x:dir===1?820:180,y:lane};
        const dx=desired.x-b.x,dy=desired.y-b.y,d=Math.hypot(dx,dy)||1;
        const speed=(b.hero==='assassin'?4.4:b.hero==='mage'?3.8:3.5)+(b.speedBonus||0)*3;
        b.x=Math.max(80,Math.min(920,b.x+dx/d*Math.min(speed,d)));
        b.y=Math.max(80,Math.min(820,b.y+dy/d*Math.min(speed*.72,Math.abs(dy))));
        if(now%1000<220)b.botMotionAt=now;
      }
    };
    wrapped.__pixelMotionWrapped=true;
    return wrapped;
  }
  return loaded;
};
require('./server.js');
