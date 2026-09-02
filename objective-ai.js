const fs = require('fs');
const path = require('path');

// Objective + teamfight AI layer: augments compressed bots.js at runtime.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');
fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;

  let code = out;
  const inject = `
function teamFightFocus(room,b,enemies){
  let best=null,bestScore=-Infinity;
  for(const e of enemies){
    if(!e.alive||dist(b,e)>430)continue;
    const allies=room.players.filter(p=>p.alive&&p.team===b.team&&dist(p,e)<260).length;
    const enemyGuard=room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,e)<180).length;
    const hp=e.hp/Math.max(1,e.maxHp||e.hp);
    let score=allies*90-enemyGuard*22+(1-hp)*130;
    if(e.hero==='mage')score+=35;
    if(b.hero==='assassin'&&hp<.45)score+=120;
    if(b.hero==='warrior'&&allies>=2)score+=45;
    if(score>bestScore){bestScore=score;best=e;}
  }
  return best;
}
function weakAlly(room,b){
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&p.hp<p.maxHp*.38&&dist(b,p)<300)
    .sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0]||null;
}
function objectiveCamp(room,b,now){
  const camps=(room.jungle||[]).filter(j=>j.alive);
  if(!camps.length)return null;
  return camps.sort((a,c)=>{
    const score=j=>{
      const priority=j.buff==='dragon'?100:j.buff==='red'||j.buff==='blue'?60:20;
      const nearby=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(p,j)<260).length;
      const enemy=room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,j)<260).length;
      const health=j.hp>0?j.hp/Math.max(1,j.maxHp||j.hp):1;
      const roleBonus=b.hero==='mage'&&j.buff==='blue'?16:b.hero==='warrior'&&j.buff==='red'?12:b.hero==='assassin'&&j.buff==='red'?20:0;
      return priority+nearby*24-enemy*35+roleBonus+(1-health)*18-dist(b,j)*.018;
    };
    return score(c)-score(a);
  })[0];
}
function objectiveEnemyNear(room,b,camp){
  if(!camp)return null;
  return room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,camp)<300)
    .sort((a,c)=>dist(a,camp)-dist(c,camp))[0]||null;
}
function objectiveAlliesNear(room,b,camp,radius){
  if(!camp)return 0;
  return room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(p,camp)<radius).length;
}
function pushLane(room,b){
  const lanes=[180,450,720];
  let best=lanes[0],bestScore=-Infinity;
  for(const lane of lanes){
    const towers=room.towers.filter(t=>t.alive&&t.team!==b.team&&t.laneY===lane);
    const towerHp=towers.reduce((s,t)=>s+t.hp/Math.max(1,t.maxHp||t.hp),0);
    const allied=room.minions.filter(m=>m.hp>0&&m.team===b.team&&m.laneY===lane).length;
    const enemy=room.minions.filter(m=>m.hp>0&&m.team!==b.team&&m.laneY===lane).length;
    const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&Math.abs(p.y-lane)<150).length;
    const enemyHeroes=room.players.filter(p=>p.alive&&p.team!==b.team&&Math.abs(p.y-lane)<150).length;
    const score=(towers.length?2.5-towerHp:0)+allied*7-enemy*3+allies*20-enemyHeroes*9;
    if(score>bestScore){bestScore=score;best=lane;}
  }
  return best;
}
function teamFightReady(room,b,target){
  if(!target)return false;
  const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(p,target)<280).length;
  const enemies=room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,target)<280).length;
  return allies>=2&&allies>=enemies;
}
function baseThreat(room,b){
  const base=room.bases?.find(x=>x.team===b.team);
  if(!base)return null;
  const enemyHero=room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,base)<260)
    .sort((a,c)=>dist(a,base)-dist(c,base))[0];
  if(enemyHero)return enemyHero;
  return room.minions.filter(m=>m.hp>0&&m.team!==b.team&&dist(m,base)<210)
    .sort((a,c)=>dist(a,base)-dist(c,base))[0]||null;
}
function siegeTower(room,b,lane){
  const towers=room.towers.filter(t=>t.alive&&t.team!==b.team&&t.laneY===lane);
  return towers.sort((a,c)=>a.hp/Math.max(1,a.maxHp||a.hp)-c.hp/Math.max(1,c.maxHp||c.hp))[0]||null;
}
function alliedWaveAt(room,b,tower){
  if(!tower)return 0;
  return room.minions.filter(m=>m.hp>0&&m.team===b.team&&m.laneY===tower.laneY&&Math.abs(m.x-tower.x)<125).length;
}
function recoveryState(room,b,low,allies,enemies){
  const home=b.team===1?125:875;
  const base=room.bases?.find(x=>x.team===b.team);
  const distHome=base?dist(b,base):Math.abs(b.x-home);
  const nearbyEnemies=enemies.filter(e=>dist(b,e)<260).length;
  const nearbyAllies=allies.filter(a=>dist(b,a)<260).length;
  const hp=b.hp/Math.max(1,b.maxHp||b.hp);
  const safe=nearbyEnemies===0||nearbyAllies>=nearbyEnemies+1;
  return {home,base,distHome,nearbyEnemies,nearbyAllies,hp,safe,retreat:!!(low&&(!safe||hp<.22)),recover:!!(hp<.58&&distHome<230&&nearbyEnemies===0)};
}
function counterTarget(room,b,enemies,allies){
  const localEnemies=enemies.filter(e=>e.alive&&dist(b,e)<300);
  const localAllies=allies.filter(a=>a.alive&&dist(b,a)<300).length;
  if(!localEnemies.length||localAllies<localEnemies.length)return null;
  return localEnemies.sort((a,c)=>a.hp/Math.max(1,a.maxHp||a.hp)-c.hp/Math.max(1,c.maxHp||c.hp))[0]||null;
}
function endgameState(room,b){
  const enemyBase=room.bases?.find(x=>x.team!==b.team);
  const ownBase=room.bases?.find(x=>x.team===b.team);
  const towers=room.towers.filter(t=>t.alive&&t.team!==b.team).length;
  const allies=room.players.filter(p=>p.alive&&p.team===b.team).length;
  const enemies=room.players.filter(p=>p.alive&&p.team!==b.team).length;
  const wave=enemyBase?room.minions.filter(m=>m.hp>0&&m.team===b.team&&Math.abs(m.x-enemyBase.x)<150).length:0;
  const hp=enemyBase?enemyBase.hp/Math.max(1,enemyBase.maxHp||enemyBase.hp):1;
  return {enemyBase,ownBase,towers,allies,enemies,wave,hp,finish:!!(enemyBase&&(hp<.35||towers===0)),ready:!!(enemyBase&&wave>0&&allies>=Math.max(2,enemies))};
}
`;
  if (!code.includes('function objectiveCamp(')) code = code.replace('const LANES=', inject+'const LANES=');

  code = code.replace(
    'const camp=room.jungle?.filter(j=>j.alive).sort((a,c)=>dist(b,a)-dist(b,c))[0];',
    'const camp=objectiveCamp(room,b,now);const objectiveEnemy=objectiveEnemyNear(room,b,camp);const objectiveAllies=objectiveAlliesNear(room,b,camp,320);const objectiveReady=!!(camp&&now>=b.botJungleAt&&b.hp>b.maxHp*.58);const objectiveContest=!!(objectiveEnemy&&dist(b,objectiveEnemy)<230&&(objectiveAllies>0||camp.buff==="dragon"));if(objectiveReady&&!low&&objectiveContest){target=objectiveEnemy;b.botFocusId=objectiveEnemy.id;}else if(objectiveReady&&!low&&(!danger||dist(b,danger)>280)&&(camp.buff==="dragon"||objectiveAllies>0)){target=null;if(objectiveEnemy)b.botFocusId=objectiveEnemy.id;}'
  );
  code = code.replace(
    'const wantsJungle=!target&&!danger&&camp&&now>=b.botJungleAt&&(b.gold<900||b.hp>b.maxHp*.65);',
    'const wantsJungle=!!(camp&&now>=b.botJungleAt&&b.hp>b.maxHp*.58&&!objectiveContest&&(!target||(!danger&&camp.buff!=="blue")||camp.buff==="dragon"));'
  );
  code = code.replace(
    'const lane=b.botLane||LANES[0],dir=b.team===1?1:-1;',
    'const coordinatedLane=pushLane(room,b);const lane=(now>=b.botLaneAt-1200&&room.players.filter(p=>p.alive&&p.team===b.team&&p.isBot&&Math.abs((p.botLane||LANES[0])-coordinatedLane)<1).length>=1)?coordinatedLane:(b.botLane||LANES[0]),dir=b.team===1?1:-1;'
  );
  code = code.replace(
    'const grouped=allies.filter(a=>dist(a,b)<300).length>=1;',
    'const grouped=allies.filter(a=>dist(a,b)<300).length>=1;const pushGroup=room.players.filter(p=>p.alive&&p.team===b.team&&Math.abs(p.y-lane)<140).length>=2;'
  );
  code = code.replace(
    'const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);',
    'const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);const fightTarget=teamFightFocus(room,b,enemies);if(fightTarget)b.botFocusId=fightTarget.id;'
  );
  code = code.replace(
    'const danger=chooseHeroTarget(enemies,b,210);',
    'const danger=chooseHeroTarget(enemies,b,210);const allyInDanger=weakAlly(room,b);if(allyInDanger&&b.hero!=="assassin"&&danger&&dist(allyInDanger,danger)<210)b.botFocusId=danger.id;const recovery=recoveryState(room,b,low,allies,enemies);const counter=counterTarget(room,b,enemies,allies);const endgame=endgameState(room,b);'
  );
  code = code.replace(
    'if(b.hero==="warrior"&&threat&&dist(b,threat)>150)target=threat;',
    'if(b.hero==="warrior"&&threat&&dist(b,threat)>150)target=threat;const focusedTeam=enemies.find(e=>e.id===b.botFocusId&&e.alive);if(focusedTeam&&teamFightReady(room,b,focusedTeam))target=focusedTeam;const homeThreat=baseThreat(room,b);if(homeThreat){target=homeThreat;b.botFocusId=homeThreat.id;}if(counter&&!homeThreat&&!recovery.retreat)target=counter;'
  );
  code = code.replace(
    'if(wantsJungle){',
    'if(endgame.finish&&endgame.ready&&!homeThreat&&!recovery.retreat){target=endgame.enemyBase;wantsJungle=false;}\nif(recovery.retreat){target=null;b.botTargetId=null;}\nif(wantsJungle&&!endgame.finish&&!recovery.retreat){'
  );
  code = code.replace(
    '}else if(low){',
    '}else if(low||recovery.retreat){'
  );
  code = code.replace(
    'const home=b.team===1?125:875;',
    'const home=recovery.home;'
  );
  code = code.replace(
    'if(b.hero==="warrior"&&danger&&dist(b,danger)<220){',
    'if(recovery.nearbyEnemies>0&&b.hero==="warrior"&&danger&&dist(b,danger)<220&&!recovery.retreat){'
  );
  code = code.replace(
    'const tower=siegeTower(room,b,lane);',
    'const tower=siegeTower(room,b,lane);'
  );
  code = code.replace(
    'const alliedWave=alliedWaveAt(room,b,tower);',
    'const alliedWave=alliedWaveAt(room,b,tower);\n  const finishBase=endgame.finish&&endgame.enemyBase&&Math.abs(endgame.enemyBase.x-b.x)<190&&Math.abs(endgame.enemyBase.y-b.y)<150;\n  if(endgame.finish&&endgame.enemyBase&&!homeThreat&&!recovery.retreat&&!finishBase){b.x+=(endgame.enemyBase.x-b.x)*.045;b.y+=(endgame.enemyBase.y-b.y)*.045;}'
  );
  code = code.replace(
    'if(tower&&alliedMinions&&now>=b.botAttackAt){',
    'if(!tower&&endgame.finish&&endgame.enemyBase&&endgame.wave>0&&Math.abs(endgame.enemyBase.x-b.x)<65&&Math.abs(endgame.enemyBase.y-b.y)<85&&!recovery.retreat&&!low&&now>=b.botAttackAt){const dealt=(5+b.damageBonus*.5)*(1+(b.damageBuff||0));const actual=Math.min(endgame.enemyBase.hp,dealt);endgame.enemyBase.hp=Math.max(0,endgame.enemyBase.hp-dealt);b.towerDamage=(b.towerDamage||0)+actual;b.botAttackAt=now+850;}\n  if(tower&&alliedMinions&&now>=b.botAttackAt){'
  );
  return code;
};

require('./server-launcher.js');
