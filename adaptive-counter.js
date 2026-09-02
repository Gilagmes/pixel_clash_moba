const fs = require('fs');
const path = require('path');

// Adaptive Counter 6.0: lightweight opponent-pattern memory layered before the existing AI.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installAdaptiveCounter(code) {
  if (typeof code !== 'string' || code.includes('PixelAdaptiveCounter60')) return code;
  const inject = `
/* PixelAdaptiveCounter60 */
function pixelCounterObserve(room){
  if(!room||room.finished)return;
  if(!room.pixelCounterMemory)room.pixelCounterMemory={};
  const now=Date.now();
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const previous=room.pixelCounterMemory[team]||{};
    const danger=enemies.filter(e=>{
      const base=room.bases?.find(x=>x.team===team);
      return base&&dist(e,base)<330;
    }).length;
    const pressure=enemies.filter(e=>{
      const tower=room.towers?.find(t=>t.alive&&t.team===team&&dist(e,t)<250);
      return !!tower;
    }).length;
    const mage=enemies.filter(e=>e.hero==='mage').length;
    const assassin=enemies.filter(e=>e.hero==='assassin').length;
    const warrior=enemies.filter(e=>e.hero==='warrior').length;
    const focus=enemies.slice().sort((a,b)=>(a.hp/Math.max(1,a.maxHp))-(b.hp/Math.max(1,b.maxHp)))[0];
    room.pixelCounterMemory[team]={
      at:now,danger,pressure,mage,assassin,warrior,
      enemyCount:enemies.length,
      weakId:focus?.id||null,
      repeatedDefense:previous.danger>=2&&danger>=2,
      repeatedPressure:previous.pressure>=2&&pressure>=2
    };
  }
}
function pixelCounterApply(room,b){
  if(!room||!b)return;
  const m=room.pixelCounterMemory?.[b.team];
  if(!m)return;
  b.botCounterMode='NORMAL';
  b.botCounterTargetId=null;
  b.botCounterLane=null;
  if(m.danger>=2||m.repeatedDefense){
    b.botCounterMode='DEFEND';
  }else if(m.pressure>=2||m.repeatedPressure){
    b.botCounterMode='COUNTERPUSH';
  }
  if(m.assassin>0&&b.hero==='mage')b.botCounterMode='PEEL';
  if(m.mage>0&&b.hero==='assassin')b.botCounterMode='DIVE_MAGE';
  if(m.warrior>0&&b.hero==='mage')b.botCounterMode='POKE_FRONT';
  if(m.weakId)b.botCounterTargetId=m.weakId;
  if(b.botCounterMode==='COUNTERPUSH'){
    const lanes=[180,450,720];
    b.botCounterLane=lanes.reduce((best,y)=>{
      const allied=room.minions.filter(x=>x.hp>0&&x.team===b.team&&x.laneY===y).length;
      const enemy=room.minions.filter(x=>x.hp>0&&x.team!==b.team&&x.laneY===y).length;
      return (allied-enemy)>(best.score??-Infinity)?{y,score:allied-enemy}:best;
    },{y:450,score:-Infinity}).y;
    b.botLane=b.botCounterLane;
  }
  if(b.botCounterMode==='DEFEND'){
    const base=room.bases?.find(x=>x.team===b.team);
    if(base)b.botLane=base.y||b.botLane;
  }
}
const __pixelAdaptiveOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room){
      pixelCounterObserve(room);
      for(const b of room.players.filter(p=>p.alive&&p.isBot))pixelCounterApply(room,b);
    }
  }catch(e){}
  return __pixelAdaptiveOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installAdaptiveCounter(out);
};

require('./team-memory.js');
