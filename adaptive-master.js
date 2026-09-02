const fs = require('fs');
const path = require('path');

// AI 16.0 Adaptive Combat Master: counter-initiation, mage protection,
// assassin punish windows and synchronized team retreat layered above AI 13-15.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installAdaptiveMaster(code){
  if(typeof code !== 'string' || code.includes('PixelAdaptiveCombatMaster160')) return code;
  const inject = `
/* PixelAdaptiveCombatMaster160 */
function pixelCounterEnemies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team!==b.team&&dist(b,p)<=radius);
}
function pixelCounterAllies(room,b,radius){
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(b,p)<=radius);
}
function pixelCounterMageThreat(room,b){
  return room.players.find(p=>p.alive&&p.team===b.team&&p.hero==='mage'&&p.hp<p.maxHp*.52&&dist(b,p)<300)||null;
}
function pixelCounterPlan(room,b){
  const now=Date.now();
  const enemies=pixelCounterEnemies(room,b,360);
  const allies=pixelCounterAllies(room,b,320);
  const mageThreat=pixelCounterMageThreat(room,b);
  const hp=b.hp/Math.max(1,b.maxHp);
  const enemyNear=enemies.filter(e=>dist(b,e)<180).length;
  const allyNear=allies.filter(a=>dist(b,a)<220).length;
  const enemyAdv=enemies.filter(e=>dist(b,e)<260).length>allyNear+1;
  const mageFocus=enemies.filter(e=>e.hero==='mage').sort((a,c)=>(a.hp/a.maxHp)-(c.hp/c.maxHp))[0]||null;
  const weakEnemy=enemies.slice().sort((a,c)=>(a.hp/a.maxHp)-(c.hp/c.maxHp))[0]||null;

  if(hp<.24 || (enemyAdv&&hp<.42)){
    b.botCounterMode='RETREAT';
  }else if(b.hero==='warrior' && enemyNear>=1 && (mageThreat||enemyAdv)){
    b.botCounterMode='COUNTER_INITIATE';
  }else if(b.hero==='assassin' && mageFocus && dist(b,mageFocus)<360){
    b.botCounterMode='MAGE_HUNT';
  }else if(b.hero==='mage' && enemies.some(e=>dist(e,b)<155)){
    b.botCounterMode='KITE';
  }else if(weakEnemy && weakEnemy.hp/Math.max(1,weakEnemy.maxHp)<.30 && allyNear>=1){
    b.botCounterMode='PUNISH';
  }else{
    b.botCounterMode='HOLD';
  }

  b.botCounterEnemyCount=enemies.length;
  b.botCounterAllyCount=allies.length;
  b.botCounterMageId=mageThreat?.id||null;
  b.botCounterTargetId=(b.botCounterMode==='MAGE_HUNT'&&mageFocus?mageFocus.id:weakEnemy?.id||null);
  b.botCounterUntil=now+700;
  return {enemies,allies,mageThreat,mageFocus,weakEnemy,enemyNear,allyNear,enemyAdv,hp};
}

const __pixelAdaptiveOriginalUseSkill160 = useSkill;
useSkill = function(room,b,skill,target){
  try{
    if(room&&b&&b.alive){
      const plan=pixelCounterPlan(room,b);
      const locked=room.players.find(p=>p.alive&&p.id===b.botCounterTargetId&&p.team!==b.team);
      if(locked)target=locked;
      if(plan.mageThreat && b.hero==='warrior' && plan.enemyNear>=1 && pixelAdaptiveReady(b,'r') && dist(b,plan.mageThreat)<300){
        target=plan.enemies[0]||target;
        if(pixelAdaptiveReady(b,'r'))skill='r';
      }
      if(b.hero==='assassin' && plan.mageFocus && dist(b,plan.mageFocus)<=190 && pixelAdaptiveReady(b,'e')){
        target=plan.mageFocus;
        skill='e';
      }
      if(b.hero==='mage' && plan.enemyNear>=1 && pixelAdaptiveReady(b,'q')){
        target=plan.enemies.slice().sort((a,c)=>dist(b,a)-dist(b,c))[0]||target;
        skill='q';
      }
      if(b.botCounterMode==='RETREAT' && b.hero==='warrior' && pixelAdaptiveReady(b,'w'))skill='w';
    }
  }catch(e){}
  return __pixelAdaptiveOriginalUseSkill160(room,b,skill,target);
};

const __pixelAdaptiveOriginalTickBots160 = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room&&!room.finished){
      const now=Date.now();
      for(const b of room.players.filter(p=>p.isBot&&p.alive)){
        const plan=pixelCounterPlan(room,b);
        if(plan.hp<.24 || (plan.enemyAdv&&plan.hp<.42)){
          b.botAdaptiveMode='SURVIVE';
          b.botTeamTask='REGROUP';
          b.botCommanderTask=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'COVER':'SCOUT';
        }
        if(b.botCounterMode==='COUNTER_INITIATE')b.botCommanderTask='INITIATE';
        if(b.botCounterMode==='MAGE_HUNT')b.botCommanderTask='EXECUTE';
        if(b.botCounterMode==='KITE')b.botCommanderTask='BACKLINE';
        if(b.botCounterMode==='PUNISH')b.botCommanderTask='EXECUTE';
        b.botCounterTickAt=now;
      }
    }
  }catch(e){}
  return __pixelAdaptiveOriginalTickBots160.apply(this,args);
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
