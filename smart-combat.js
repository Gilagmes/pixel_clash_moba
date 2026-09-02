const fs = require('fs');
const path = require('path');

// Smart Combat 12.0: coordinated target focus, combo windows and role-aware ability execution.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installSmartCombat(code) {
  if (typeof code !== 'string' || code.includes('PixelSmartCombat120')) return code;

  const mageLine = 'if(b.hero==="mage"){if(dist(b,target)<=240)useSkill(room,b,"r",target);else useSkill(room,b,"q",target)}';
  const assassinLine = 'else if(b.hero==="assassin"){if(dist(b,target)<=160)useSkill(room,b,"e",target);else useSkill(room,b,"q",target)}';
  const warriorLine = 'else if(dist(b,target)<=190)useSkill(room,b,"q",target)';

  const smartMage = 'if(b.hero==="mage"){pixelSmartMage(room,b,target)}';
  const smartAssassin = 'else if(b.hero==="assassin"){pixelSmartAssassin(room,b,target)}';
  const smartWarrior = 'else {pixelSmartWarrior(room,b,target)}';

  let transformed = code;
  transformed = transformed.replace(mageLine, smartMage);
  transformed = transformed.replace(assassinLine, smartAssassin);
  transformed = transformed.replace(warriorLine, smartWarrior);

  const inject = `
/* PixelSmartCombat120 */
function pixelSmartEnemies(room,b,target,radius){
  if(!room||!b)return [];
  return room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,target||b)<radius);
}
function pixelSmartAllies(room,b,target,radius){
  if(!room||!b||!target)return [];
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(p,target)<radius);
}
function pixelSmartReady(b,key){return !!b.botSkillAt&&Date.now()>=b.botSkillAt[key];}
function pixelSmartMage(room,b,target){
  if(!target)return;
  const now=Date.now();
  const enemies=pixelSmartEnemies(room,b,target,125);
  const allies=pixelSmartAllies(room,b,target,260);
  const execute=target.hp<=target.maxHp*.30;
  const combo=enemies.length>=2&&allies.length>=1;
  b.botCombatMode=combo?'COMBO_AOE':execute?'EXECUTE':'POKE';
  b.botCombatTargetId=target.id;
  if(dist(b,target)<=240){
    if((combo||execute||b.botCommanderTask==='CONTROL'||b.botTeamTask==='BACKLINE')&&pixelSmartReady(b,'r'))useSkill(room,b,'r',target);
    else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  }else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  if(combo&&now%2===0)b.botComboWindowUntil=now+900;
}
function pixelSmartAssassin(room,b,target){
  if(!target)return;
  const now=Date.now();
  const hp=target.hp/Math.max(1,target.maxHp);
  const allies=pixelSmartAllies(room,b,target,230);
  const execute=hp<=.38;
  const isolated=allies.length===0;
  b.botCombatMode=execute?'EXECUTE':isolated?'PICKOFF':'FLANK';
  b.botCombatTargetId=target.id;
  if(dist(b,target)<=160){
    if((execute||isolated||b.botTeamTask==='FLANK'||b.botCommanderTask==='EXECUTE')&&pixelSmartReady(b,'e'))useSkill(room,b,'e',target);
    else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  }else if(pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  if(execute)b.botComboWindowUntil=now+1100;
}
function pixelSmartWarrior(room,b,target){
  if(!target)return;
  const enemies=pixelSmartEnemies(room,b,target,190);
  const allies=pixelSmartAllies(room,b,target,250);
  const teamFight=enemies.length>=2&&allies.length>=1;
  const engage=b.botCommanderTask==='INITIATE'||b.botTeamTask==='INITIATE';
  b.botCombatMode=teamFight?'AOE_INITIATE':engage?'INITIATE':'PEEL';
  b.botCombatTargetId=target.id;
  if(dist(b,target)<=240&&teamFight&&pixelSmartReady(b,'r'))useSkill(room,b,'r',target);
  else if(dist(b,target)<=190&&pixelSmartReady(b,'q'))useSkill(room,b,'q',target);
  if(teamFight)b.botComboWindowUntil=Date.now()+800;
}
`;
  return transformed + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installSmartCombat(out);
};

require('./team-commander.js');
