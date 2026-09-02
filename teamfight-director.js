const fs = require('fs');
const path = require('path');

// AI 17.0 Teamfight Director: live fight phase, engage/cancel decisions,
// mage peel, assassin punish windows and coordinated retreat.
const __pixel17Read = fs.readFileSync;
const __pixel17BotsPath = path.resolve(__dirname, 'bots.js');

function __pixel17Install(code){
  if(typeof code !== 'string' || code.includes('PixelTeamfightDirector170')) return code;
  const inject = `
/* PixelTeamfightDirector170 */
function pixel17Enemies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team!==b.team&&dist(b,p)<=radius);
}
function pixel17Allies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(b,p)<=radius);
}
function pixel17Director(room){
  if(!room||room.finished)return;
  const now=Date.now();
  if(!room.pixelTeamfightDirector)room.pixelTeamfightDirector={};
  for(const team of [1,2]){
    const members=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!members.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const nearby=members.filter(b=>enemies.some(e=>dist(b,e)<300)).length;
    const ready=members.filter(b=>b.hp>b.maxHp*.48).length;
    const wounded=members.filter(b=>b.hp<b.maxHp*.35).length;
    const enemyNearby=enemies.filter(e=>members.some(b=>dist(b,e)<300)).length;
    const enemyHp=enemies.filter(e=>members.some(b=>dist(b,e)<300)).reduce((s,e)=>s+e.hp/Math.max(1,e.maxHp),0);
    const allyHp=members.reduce((s,b)=>s+b.hp/Math.max(1,b.maxHp),0);
    const advantage=enemyNearby>0 && enemyHp < Math.max(.1,allyHp*.82);
    let phase='SEARCH';
    if(wounded>=2 || (enemyNearby>=2&&allyHp<enemyHp*.78))phase='RETREAT';
    else if(nearby>=2&&ready>=2&&advantage)phase='ENGAGE';
    else if(enemyNearby>=1&&ready>=1)phase='CONTEST';
    else if(nearby>=1)phase='POKE';
    room.pixelTeamfightDirector[team]={phase,updatedAt:now,nearby,ready,wounded};
    for(const b of members){
      b.botTeamfightPhase=phase;
      b.botTeamfightUntil=now+900;
      if(phase==='RETREAT'){
        b.botTeamTask=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'COVER':'SCOUT';
        b.botAdaptiveMode='SURVIVE';
      }else if(phase==='ENGAGE'){
        b.botTeamTask=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'BACKLINE':'FLANK';
      }else if(phase==='CONTEST'){
        b.botTeamTask=b.hero==='warrior'?'PEEL':b.hero==='mage'?'CONTROL':'INTERCEPT';
      }
    }
  }
}
function pixel17Target(room,b,target){
  const phase=room.pixelTeamfightDirector?.[b.team]?.phase;
  const enemies=pixel17Enemies(room,b,360);
  if(!enemies.length)return target;
  if(b.hero==='mage'){
    const threat=enemies.slice().sort((a,c)=>dist(b,a)-dist(b,c))[0];
    if(phase==='RETREAT'&&threat)return threat;
  }
  if(b.hero==='assassin'){
    const mage=enemies.filter(e=>e.hero==='mage').sort((a,c)=>(a.hp/a.maxHp)-(c.hp/c.maxHp))[0];
    if(mage&&dist(b,mage)<330)return mage;
  }
  return target||enemies[0];
}
const __pixel17OriginalSkill = useSkill;
useSkill=function(room,b,skill,target){
  try{
    if(room&&b&&b.alive){
      const phase=room.pixelTeamfightDirector?.[b.team]?.phase;
      target=pixel17Target(room,b,target);
      if(phase==='RETREAT'){
        if(b.hero==='warrior'&&pixelAdaptiveReady(b,'w'))skill='w';
        else if(b.hero==='assassin'&&pixelAdaptiveReady(b,'w'))skill='w';
      }else if(phase==='ENGAGE'){
        if(b.hero==='warrior'&&pixelAdaptiveReady(b,'r')&&target&&dist(b,target)<=240)skill='r';
        else if(b.hero==='mage'&&pixelAdaptiveReady(b,'r')&&target&&dist(b,target)<=240)skill='r';
        else if(b.hero==='assassin'&&pixelAdaptiveReady(b,'e')&&target&&dist(b,target)<=190)skill='e';
      }else if(phase==='CONTEST'&&b.hero==='warrior'&&pixelAdaptiveReady(b,'q')&&target&&dist(b,target)<=190){
        skill='q';
      }
    }
  }catch(e){}
  return __pixel17OriginalSkill(room,b,skill,target);
};
const __pixel17OriginalTick = tickBots;
tickBots=function(...args){
  const room=args[0];
  try{if(room&&!room.finished)pixel17Director(room);}catch(e){}
  return __pixel17OriginalTick.apply(this,args);
};
`;
  return code+inject;
}

fs.readFileSync=function(file,encoding){
  const out=__pixel17Read.call(fs,file,encoding);
  if(path.resolve(String(file))!==__pixel17BotsPath||typeof out!=='string')return out;
  return __pixel17Install(out);
};

require('./adaptive-master.js');
