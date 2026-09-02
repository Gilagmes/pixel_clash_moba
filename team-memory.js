const fs = require('fs');
const path = require('path');

// Team Memory 5.0: short-lived strategic memory + objective warfare layer.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installTeamMemory(code) {
  if (typeof code !== 'string' || code.includes('PixelTeamMemory50')) return code;
  const inject = `
/* PixelTeamMemory50 */
function pixelWarfareCamp(room,team){
  const camps=(room.jungle||[]).filter(j=>j.alive);
  let best=null,bestScore=-Infinity;
  for(const c of camps){
    const allies=room.players.filter(p=>p.alive&&p.team===team&&p.isBot&&dist(p,c)<340).length;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team&&dist(p,c)<340).length;
    const value=c.buff==='dragon'?120:c.buff==='red'||c.buff==='blue'?75:20;
    const hp=(c.hp||c.maxHp||1)/Math.max(1,c.maxHp||c.hp||1);
    const score=value+allies*24-enemies*42+(1-hp)*35;
    if(score>bestScore){bestScore=score;best=c;}
  }
  return best;
}
function pixelWarfareEnemyAt(room,camp,team,radius){
  if(!camp)return null;
  return room.players.filter(p=>p.alive&&p.team!==team&&dist(p,camp)<radius)
    .sort((a,b)=>dist(a,camp)-dist(b,camp))[0]||null;
}
function pixelWarfareAllies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.isBot&&p.id!==b.id&&dist(p,b)<radius);
}
function pixelWarfareBase(room,team){
  const base=room.bases?.find(x=>x.team===team);
  if(!base)return null;
  return room.players.filter(p=>p.alive&&p.team!==team&&dist(p,base)<330)
    .sort((a,b)=>dist(a,base)-dist(b,base))[0]||null;
}
function pixelWarfare(room){
  if(!room||room.finished)return;
  const now=Date.now();
  if(!room.pixelWarfare)room.pixelWarfare={};
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const camp=pixelWarfareCamp(room,team);
    const enemyAtCamp=pixelWarfareEnemyAt(room,camp,team,360);
    const baseThreat=pixelWarfareBase(room,team);
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const alive=bots.length;
    const enemyCount=enemies.length;
    const alliesNearCamp=camp?bots.filter(b=>dist(b,camp)<360).length:0;
    const memory=room.pixelWarfare[team]||{};
    let mode='HOLD';
    let expires=now+4500;
    if(baseThreat){
      mode='COUNTER_DEFEND';
      expires=now+3500;
    }else if(enemyAtCamp&&camp){
      if(alliesNearCamp>=2&&alive>=enemyCount)mode='AMBUSH';
      else mode='BAIT';
      expires=now+(mode==='AMBUSH'?6500:4500);
    }else if(camp&&alliesNearCamp>=2){
      mode='TRAP';
      expires=now+5000;
    }else if(alive>=2&&alive>=enemyCount){
      mode='HUNT';
      expires=now+4000;
    }
    room.pixelWarfare[team]={mode,at:now,until:expires,campId:camp?.id||null,enemyId:enemyAtCamp?.id||baseThreat?.id||null};
    for(const b of bots){
      b.botWarfareMode=mode;
      b.botWarfareUntil=expires;
      b.botWarfareCampId=camp?.id||null;
      b.botWarfareTargetId=enemyAtCamp?.id||baseThreat?.id||null;
      const nearby=pixelWarfareAllies(room,b,300).length;
      if(mode==='COUNTER_DEFEND'&&baseThreat){
        b.botTeamTask=b.hero==='warrior'?'PEEL':b.hero==='mage'?'CONTROL':'INTERCEPT';
        b.botFocusId=baseThreat.id;
        continue;
      }
      if(mode==='AMBUSH'&&enemyAtCamp){
        b.botTeamTask=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'CONTROL':'EXECUTE';
        if(b.hero!=='mage'||nearby>0)b.botFocusId=enemyAtCamp.id;
        if(b.hero==='assassin')b.botWarfareFlank=true;
        continue;
      }
      if(mode==='BAIT'&&camp){
        b.botTeamTask=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'GUARD':'SCOUT';
        if(b.hero==='assassin')b.botWarfareFlank=true;
        if(nearby>=1)b.botFocusId=enemyAtCamp?.id||null;
        continue;
      }
      if(mode==='TRAP'&&camp){
        b.botTeamTask=b.hero==='warrior'?'SECURE':b.hero==='mage'?'GUARD':'FLANK';
        if(b.hero==='assassin')b.botWarfareFlank=true;
        continue;
      }
      if(mode==='HUNT'){
        const target=room.players.filter(p=>p.alive&&p.team!==team&&dist(p,b)<420)
          .sort((a,c)=>(a.hp/Math.max(1,a.maxHp||a.hp))-(c.hp/Math.max(1,c.maxHp||c.hp)))[0];
        if(target){b.botFocusId=target.id;b.botTeamTask=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'CONTROL':'EXECUTE';}
      }
    }
  }
}
function pixelRememberTeam(room){
  if(!room||room.finished)return;
  if(!room.pixelTeamMemory)room.pixelTeamMemory={};
  const now=Date.now();
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const mode=bots[0].botTeamMode||'PUSH';
    const focus=bots.map(b=>b.botFocusId).find(Boolean)||null;
    const objective=bots.map(b=>b.botObjectiveId).find(Boolean)||null;
    const lane=bots.map(b=>b.botLane).filter(v=>v!=null)[0]||null;
    const previous=room.pixelTeamMemory[team]||{};
    const alive=bots.length;
    const enemyCount=enemies.length;
    const fightLoss=previous.mode==='FIGHT'&&mode!=='FIGHT'&&enemyCount>alive;
    const objectiveLost=previous.objectiveId&&!objective&&previous.mode==='OBJECTIVE';
    room.pixelTeamMemory[team]={
      mode,focusId:focus,objectiveId:objective,lane,
      at:now,alive,enemyCount,
      lastFightAt:fightLoss?now:(previous.lastFightAt||0),
      lastObjectiveAt:objective?now:(previous.lastObjectiveAt||0),
      lostFight:fightLoss||!!previous.lostFight&&now-(previous.lastFightAt||0)<9000,
      lostObjective:objectiveLost||!!previous.lostObjective&&now-(previous.lastObjectiveAt||0)<12000
    };
  }
}
function pixelApplyTeamMemory(room,b){
  if(!room||!b)return;
  const m=room.pixelTeamMemory?.[b.team];
  if(!m)return;
  const now=Date.now();
  const freshFight=m.lostFight&&now-(m.lastFightAt||0)<9000;
  const freshObjective=m.lostObjective&&now-(m.lastObjectiveAt||0)<12000;
  b.botMemoryMode=m.mode;
  b.botMemoryFocusId=m.focusId||null;
  b.botMemoryObjectiveId=m.objectiveId||null;
  b.botMemoryLane=m.lane||null;
  b.botFightRecoveryUntil=freshFight?(m.lastFightAt+9000):0;
  b.botObjectiveCooldownUntil=freshObjective?(m.lastObjectiveAt+12000):0;
  if(freshFight&&b.hero!=='assassin')b.botFocusId=null;
  if(freshFight&&m.lane!=null)b.botLane=m.lane;
  if(freshObjective&&b.hero==='assassin')b.botFocusId=null;
}
const __pixelMemoryOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room){
      pixelWarfare(room);
      for(const b of room.players.filter(p=>p.alive&&p.isBot))pixelApplyTeamMemory(room,b);
    }
  }catch(e){}
  const result=__pixelMemoryOriginalTickBots.apply(this,args);
  try{pixelRememberTeam(room);}catch(e){}
  return result;
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installTeamMemory(out);
};

require('./team-coordination.js');
