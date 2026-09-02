const fs = require('fs');
const path = require('path');

// AI 15.0 Adaptive Combat Master: survival, cooldown-aware skill routing,
// anti-overkill targeting and short combat memory layered above the combo AI.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installAdaptiveMaster(code){
  if(typeof code !== 'string' || code.includes('PixelAdaptiveCombatMaster140')) return code;
  const inject = `
/* PixelAdaptiveCombatMaster140 */
function pixelAdaptiveEnemies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team!==b.team&&dist(b,p)<=radius);
}
function pixelAdaptiveAllies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(b,p)<=radius);
}
function pixelAdaptivePick(room,b){
  const enemies=room.players.filter(p=>p.alive&&p.team!==b.team);
  return enemies.slice().sort((a,c)=>{
    const ah=a.hp/Math.max(1,a.maxHp), ch=c.hp/Math.max(1,c.maxHp);
    const ad=dist(b,a), cd=dist(b,c);
    const aa=room.players.filter(p=>p.alive&&p.team===b.team&&dist(p,a)<260).length;
    const ca=room.players.filter(p=>p.alive&&p.team===b.team&&dist(p,c)<260).length;
    let as=aa*65-ah*120-ad*.08;
    let cs=ca*65-ch*120-cd*.08;
    if(a.hero==='mage')as+=30;
    if(c.hero==='mage')cs+=30;
    if(b.hero==='assassin'&&ah<.45)as+=100;
    if(b.hero==='assassin'&&ch<.45)cs+=100;
    return cs-as;
  })[0]||null;
}
function pixelAdaptiveReady(b,skill){
  return (b?.botSkillAt?.[skill]||0)<=Date.now();
}
function pixelAdaptivePlan(room,b){
  const enemies=pixelAdaptiveEnemies(room,b,360);
  const allies=pixelAdaptiveAllies(room,b,300);
  const locked=room.players.find(p=>p.alive&&p.id===b.botAdaptiveLockId&&p.team!==b.team&&b.botAdaptiveLockUntil>Date.now());
  const comboTarget=room.players.find(p=>p.alive&&p.id===b.botCombatTargetId&&p.team!==b.team);
  const target=locked||comboTarget||pixelAdaptivePick(room,b);
  const hp=b.hp/Math.max(1,b.maxHp);
  const threatened=enemies.filter(e=>dist(b,e)<170).length>=2 || (enemies.length>=1&&hp<.27);
  const teamReady=allies.length>=1&&enemies.length>=1;
  const objective=room.jungle?.filter(j=>j.alive).some(j=>dist(b,j)<260);
  if(threatened&&hp<.32)b.botAdaptiveMode='SURVIVE';
  else if(objective&&allies.length>=1)b.botAdaptiveMode='OBJECTIVE_FIGHT';
  else if(teamReady&&enemies.length>=2)b.botAdaptiveMode='TEAM_COMBO';
  else if(target&&target.hp/Math.max(1,target.maxHp)<.28)b.botAdaptiveMode='EXECUTE';
  else b.botAdaptiveMode='PRESSURE';
  if(target){
    b.botAdaptiveTargetId=target.id;
    if(!locked && !comboTarget){
      b.botAdaptiveLockId=target.id;
      b.botAdaptiveLockUntil=Date.now()+1800;
    }
  }
  b.botAdaptiveEnemyCount=enemies.length;
  b.botAdaptiveAllyCount=allies.length;
  return {target,enemies,allies,hp,threatened,teamReady};
}

const __pixelAdaptiveOriginalUseSkill140 = useSkill;
useSkill = function(room,b,skill,target){
  try{
    if(room&&b&&b.alive){
      const plan=pixelAdaptivePlan(room,b);
      target=room.players.find(p=>p.alive&&p.id===b.botAdaptiveTargetId&&p.team!==b.team)||target||plan.target;
      if(target){
        const hp=target.hp/Math.max(1,target.maxHp);
        const enemyCount=plan.enemies.length;
        const allyCount=plan.allies.length;
        const comboLive=room.pixelAdvancedCombo?.[b.team]?.until>Date.now();
        if(skill==='r'&&!comboLive&&hp<.18&&pixelAdaptiveReady(b,'q'))skill='q';
        if(b.hero==='mage'&&enemyCount>=2&&pixelAdaptiveReady(b,'r')&&dist(b,target)<=240)skill='r';
        if(b.hero==='assassin'&&(hp<.45||allyCount===0)&&pixelAdaptiveReady(b,'e')&&dist(b,target)<=190)skill='e';
        if(b.hero==='warrior'&&enemyCount>=2&&allyCount>=1&&pixelAdaptiveReady(b,'r')&&dist(b,target)<=240)skill='r';
        if(b.botAdaptiveMode==='SURVIVE'&&b.hero==='warrior'&&pixelAdaptiveReady(b,'w'))skill='w';
      }
    }
  }catch(e){}
  return __pixelAdaptiveOriginalUseSkill140(room,b,skill,target);
};

const __pixelAdaptiveOriginalTickBots140 = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room&&!room.finished){
      for(const b of room.players.filter(p=>p.isBot&&p.alive))pixelAdaptivePlan(room,b);
    }
  }catch(e){}
  return __pixelAdaptiveOriginalTickBots140.apply(this,args);
};
`;
  return code+inject;
}

fs.readFileSync=function(file,encoding){
  const out=originalRead.call(fs,file,encoding);
  if(path.resolve(String(file))!==botsPath||typeof out!=='string')return out;
  return installAdaptiveMaster(out);
};

require('./advanced-combos.js');
