const fs = require('fs');
const path = require('path');

// Advanced Team Combos 13.0: short synchronized Warrior -> Mage -> Assassin execution windows.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installAdvancedCombos(code) {
  if (typeof code !== 'string' || code.includes('PixelAdvancedCombos130')) return code;
  const inject = `
/* PixelAdvancedCombos130 */
function pixelComboTarget(room,team){
  const enemies=room.players.filter(p=>p.alive&&p.team!==team);
  return enemies.slice().sort((a,b)=>{
    const ar=room.players.filter(p=>p.alive&&p.team===team&&p.id!==a.id&&dist(p,a)<280).length;
    const br=room.players.filter(p=>p.alive&&p.team===team&&p.id!==b.id&&dist(p,b)<280).length;
    return (br*80-(b.hp/Math.max(1,b.maxHp))*100)-(ar*80-(a.hp/Math.max(1,a.maxHp))*100);
  })[0]||null;
}
function pixelComboDirector(room){
  if(!room||room.finished)return;
  const now=Date.now();
  if(!room.pixelAdvancedCombo)room.pixelAdvancedCombo={};
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const target=room.players.find(p=>p.id===room.pixelAdvancedCombo[team]?.targetId&&p.alive&&p.team!==team)||pixelComboTarget(room,team);
    if(!target){room.pixelAdvancedCombo[team]=null;continue;}
    const grouped=bots.filter(b=>dist(b,target)<330).length;
    const ready=bots.filter(b=>b.hp>b.maxHp*.45&&dist(b,target)<360).length;
    const active=room.pixelAdvancedCombo[team];
    if(active&&active.until>now&&active.targetId===target.id){
      for(const b of bots)b.botComboTargetId=target.id;
      continue;
    }
    if(grouped>=2&&ready>=2){
      room.pixelAdvancedCombo[team]={targetId:target.id,startedAt:now,until:now+1500,stage:'SETUP'};
      for(const b of bots){
        b.botComboTargetId=target.id;
        b.botComboStage=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'FOLLOWUP':'EXECUTE';
      }
    }
  }
}
function pixelAdvancedTarget(room,b,target){
  if(!room||!b)return target;
  const id=room.pixelAdvancedCombo?.[b.team]?.targetId;
  return room.players.find(p=>p.alive&&p.id===id&&p.team!==b.team)||target;
}
function pixelSmartMage(room,b,target){
  target=pixelAdvancedTarget(room,b,target); if(!target)return;
  const combo=room.pixelAdvancedCombo?.[b.team];
  const now=Date.now();
  const enemies=pixelSmartEnemies(room,b,target,130);
  const allies=pixelSmartAllies(room,b,target,270);
  const execute=target.hp<=target.maxHp*.30;
  const comboLive=combo&&combo.until>now&&combo.targetId===target.id;
  b.botCombatMode=comboLive?'COMBO_FOLLOWUP':enemies.length>=2?'COMBO_AOE':execute?'EXECUTE':'POKE';
  b.botCombatTargetId=target.id;
  if(dist(b,target)<=240){
    if(comboLive&&pixelSmartReady(b,'r'))useSkill(room,b,'r',target);
    else if((execute||enemies.length>=2)&&pixelSmartReady(b,'r'))useSkill(room,b,'r',target);
    else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  }else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  if(comboLive)b.botComboWindowUntil=combo.until;
}
function pixelSmartAssassin(room,b,target){
  target=pixelAdvancedTarget(room,b,target); if(!target)return;
  const combo=room.pixelAdvancedCombo?.[b.team];
  const now=Date.now();
  const hp=target.hp/Math.max(1,target.maxHp);
  const allies=pixelSmartAllies(room,b,target,240);
  const comboLive=combo&&combo.until>now&&combo.targetId===target.id;
  const execute=hp<=.42;
  b.botCombatMode=comboLive?'COMBO_EXECUTE':execute?'EXECUTE':allies.length===0?'PICKOFF':'FLANK';
  b.botCombatTargetId=target.id;
  if(dist(b,target)<=160){
    if((comboLive||execute||b.botTeamTask==='FLANK'||b.botCommanderTask==='EXECUTE')&&pixelSmartReady(b,'e'))useSkill(room,b,'e',target);
    else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  }else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  if(comboLive)b.botComboWindowUntil=combo.until;
}
function pixelSmartWarrior(room,b,target){
  target=pixelAdvancedTarget(room,b,target); if(!target)return;
  const now=Date.now();
  const combo=room.pixelAdvancedCombo?.[b.team];
  const enemies=pixelSmartEnemies(room,b,target,205);
  const allies=pixelSmartAllies(room,b,target,270);
  const comboLive=combo&&combo.until>now&&combo.targetId===target.id;
  const teamFight=enemies.length>=2&&allies.length>=1;
  const engage=b.botCommanderTask==='INITIATE'||b.botTeamTask==='INITIATE';
  b.botCombatMode=comboLive?'COMBO_INITIATE':teamFight?'AOE_INITIATE':engage?'INITIATE':'PEEL';
  b.botCombatTargetId=target.id;
  if(dist(b,target)<=240&&(comboLive||teamFight)&&pixelSmartReady(b,'r')){
    useSkill(room,b,'r',target);
    if(combo)combo.stage='WARRIOR_DONE';
  }else if(dist(b,target)<=190&&pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  if(comboLive)b.botComboWindowUntil=combo.until;
}
const __pixelAdvancedOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{if(room)pixelComboDirector(room);}catch(e){}
  return __pixelAdvancedOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installAdvancedCombos(out);
};

require('./smart-combat.js');
