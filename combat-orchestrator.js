const fs = require('fs');
const path = require('path');

// AI 18.0 Combat Orchestrator: converts teamfight intent into a short,
// deterministic execution sequence with target lock, engage window and finish.
const __pixel18Read = fs.readFileSync;
const __pixel18BotsPath = path.resolve(__dirname, 'bots.js');

function __pixel18Install(code){
  if(typeof code !== 'string' || code.includes('PixelCombatOrchestrator180')) return code;
  const inject = `
/* PixelCombatOrchestrator180 */
function pixel18Enemies(room,team,radius){
  return room.players.filter(p=>p.alive&&p.team!==team&&(!p.statuses||!p.statuses.stealthUntil||p.statuses.stealthUntil<Date.now())).filter(p=>{
    const allies=room.players.filter(a=>a.alive&&a.team===team&&a.isBot);
    return allies.some(a=>dist(a,p)<=radius);
  });
}
function pixel18Pick(room,team){
  const es=pixel18Enemies(room,team,420);
  if(!es.length)return null;
  return es.slice().sort((a,b)=>{
    const ah=a.hp/Math.max(1,a.maxHp), bh=b.hp/Math.max(1,b.maxHp);
    const av=a.hero==='mage'?35:0, bv=b.hero==='mage'?35:0;
    return (ah*100-av)-(bh*100-bv);
  })[0]||null;
}
function pixel18Orchestrate(room){
  if(!room||room.finished)return;
  const now=Date.now();
  if(!room.pixelCombatOrchestrator)room.pixelCombatOrchestrator={};
  for(const team of [1,2]){
    const bots=room.players.filter(b=>b.alive&&b.team===team&&b.isBot);
    if(!bots.length)continue;
    const enemies=pixel18Enemies(room,team,420);
    const ready=bots.filter(b=>b.hp>b.maxHp*.45).length;
    const target=pixel18Pick(room,team);
    const existing=room.pixelCombatOrchestrator[team];
    const active=existing&&existing.until>now;
    if(!target||enemies.length===0||ready<2){
      if(!active)room.pixelCombatOrchestrator[team]={phase:'IDLE',until:now+500,targetId:null};
      continue;
    }
    const clustered=bots.filter(b=>dist(b,target)<300).length>=2;
    const enemyHp=target.hp/Math.max(1,target.maxHp);
    if(!active&&clustered){
      room.pixelCombatOrchestrator[team]={phase:enemyHp<.32?'FINISH':'COMBO',startedAt:now,until:now+1700,targetId:target.id};
    }
    const plan=room.pixelCombatOrchestrator[team];
    if(plan&&plan.until>now){
      for(const b of bots){
        b.botComboTargetId=plan.targetId;
        b.botComboUntil=plan.until;
        if(b.hero==='warrior')b.botComboStage='INITIATE';
        else if(b.hero==='mage')b.botComboStage='FOLLOWUP';
        else if(b.hero==='assassin')b.botComboStage='EXECUTE';
      }
    }
  }
}
function pixel18Target(room,b,target){
  const plan=room?.pixelCombatOrchestrator?.[b.team];
  if(plan&&plan.until>Date.now()&&plan.targetId){
    const t=room.players.find(p=>p.id===plan.targetId&&p.alive);
    if(t)return t;
  }
  return target;
}
const __pixel18OriginalSkill = useSkill;
useSkill=function(room,b,skill,target){
  try{
    if(room&&b&&b.alive){
      target=pixel18Target(room,b,target);
      const plan=room.pixelCombatOrchestrator?.[b.team];
      const live=plan&&plan.until>Date.now()&&target&&target.alive;
      if(live){
        const hp=target.hp/Math.max(1,target.maxHp);
        if(b.hero==='warrior'&&pixelAdaptiveReady(b,'r')&&dist(b,target)<=240)skill='r';
        else if(b.hero==='mage'&&pixelAdaptiveReady(b,'r')&&dist(b,target)<=240)skill='r';
        else if(b.hero==='assassin'&&pixelAdaptiveReady(b,'e')&&dist(b,target)<=190)skill='e';
        else if(hp<.28&&b.hero==='assassin'&&pixelAdaptiveReady(b,'q')&&dist(b,target)<=190)skill='q';
      }
    }
  }catch(e){}
  return __pixel18OriginalSkill(room,b,skill,target);
};
const __pixel18OriginalTick = tickBots;
tickBots=function(...args){
  const room=args[0];
  try{if(room&&!room.finished)pixel18Orchestrate(room);}catch(e){}
  return __pixel18OriginalTick.apply(this,args);
};
`;
  return code+inject;
}

fs.readFileSync=function(file,encoding){
  const out=__pixel18Read.call(fs,file,encoding);
  if(path.resolve(String(file))!==__pixel18BotsPath||typeof out!=='string')return out;
  return __pixel18Install(out);
};

require('./teamfight-director.js');
