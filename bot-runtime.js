const fs=require("fs");
const path=require("path");
const Module=require("module");

// Load bots normally, then wrap their tick with a deterministic motion safety layer.
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  const loaded=originalLoad.apply(this,arguments);
  if(request==='./bots' && parent && /server\.js$/.test(parent.filename) && loaded && !loaded.__pixelMotionWrapped){
    const originalTick=loaded.tickBots;
    const originalEnsure=loaded.ensureBots;
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
    wrapped.ensureBots=originalEnsure;
    wrapped.__pixelMotionWrapped=true;
    return wrapped;
  }
  return loaded;
};

// Patch the WebSocket broadcast bug before compiling server.js.
// The old implementation looked for a non-existent room._clients map, so
// players never received state and the arena appeared empty.
const target=path.join(__dirname,"server.js");
let source=fs.readFileSync(target,"utf8");
const broken='function broadcast(r,msg){for(const p of r.players){const c=r._clients?.get(p.id);if(c&&c.readyState===1)c.send(JSON.stringify(msg))}}';
const fixed='function broadcast(r,msg){for(const c of wss.clients){if(c.readyState!==1||c.roomId!==r.id)continue;c.send(JSON.stringify(msg))}}';
if(source.includes(broken)){
  source=source.replace(broken,fixed);
  console.log("[PixelClash runtime] WebSocket broadcast patch active");
}else{
  console.log("[PixelClash runtime] broadcast patch not needed or signature changed");
}

// Arena visibility + movement safety layer. It runs inside server.js scope,
// so it can access the live rooms map and keep bots/minions/state visible.
source += `

// PIXEL CLASH ARENA SAFETY: guaranteed bots, minion waves and visible motion.
(function pixelArenaSafety(){
  const MINION_WAVE_MS=7000;
  const STATE_MS=250;
  function spawnFallbackWave(room,now){
    if(!room||room.finished||!Array.isArray(room.minions))return;
    const alive=room.minions.filter(m=>m&&m.alive!==false&&Number(m.hp)>0).length;
    if(alive>0)return;
    if(room.__pixelLastWave && now-room.__pixelLastWave<MINION_WAVE_MS)return;
    room.__pixelLastWave=now;
    const lanes=Array.isArray(LANES)&&LANES.length?LANES:[180,450,720];
    let n=0;
    for(const team of [1,2]){
      for(const laneY of lanes){
        const startX=team===1?125:875;
        for(const type of ['melee','ranged']){
          room.minions.push({
            id:'m-fallback-'+now+'-'+team+'-'+n++,
            team,x:startX,y:laneY,laneY,
            hp:type==='melee'?70:48,maxHp:type==='melee'?70:48,
            damage:type==='melee'?9:7,range:type==='melee'?34:150,
            speed:type==='melee'?1.25:1.05,type,alive:true,attackAt:0,
            __pixelFallback:true
          });
        }
      }
    }
  }
  setInterval(()=>{
    const now=Date.now();
    try{
      for(const room of rooms.values()){
        if(!room||room.finished)continue;
        if(!Array.isArray(room.minions))room.minions=[];
        if(!room.__pixelSafetyStarted)room.__pixelSafetyStarted=now;
        if(now-room.startedAt>3500 && typeof ensureBots==='function'){
          try{ensureBots(room)}catch(e){}
        }
        spawnFallbackWave(room,now);
        // Fallback waves advance at a clearly visible MOBA pace.
        for(const m of room.minions){
          if(!m||!m.__pixelFallback||m.alive===false||Number(m.hp)<=0)continue;
          const dir=m.team===1?1:-1;
          const speed=(Number(m.speed)||1.1)*2.8;
          m.x+=dir*speed;
          m.x=Math.max(70,Math.min(930,m.x));
        }
        if(typeof broadcastState==='function')broadcastState(room);
      }
    }catch(e){console.error('[PixelClash safety]',e.message)}
  },STATE_MS);
})();
`;

const mod=new Module(target,module);
mod.filename=target;
mod.paths=Module._nodeModulePaths(__dirname);
mod._compile(source,target);
