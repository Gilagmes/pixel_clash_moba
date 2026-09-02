const fs = require('fs');
const path = require('path');

// Objective AI layer: augments the compressed bots.js at runtime.
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

  // Team push coordination: bots periodically converge on the same vulnerable lane.
  code = code.replace(
    'const lane=b.botLane||LANES[0],dir=b.team===1?1:-1;',
    'const coordinatedLane=pushLane(room,b);const lane=(now>=b.botLaneAt-1200&&room.players.filter(p=>p.alive&&p.team===b.team&&p.isBot&&Math.abs((p.botLane||LANES[0])-coordinatedLane)<1).length>=1)?coordinatedLane:(b.botLane||LANES[0]),dir=b.team===1?1:-1;'
  );

  // If two or more allies are already near the selected lane, bots become more willing to push it.
  code = code.replace(
    'const grouped=allies.filter(a=>dist(a,b)<300).length>=1;',
    'const grouped=allies.filter(a=>dist(a,b)<300).length>=1;const pushGroup=room.players.filter(p=>p.alive&&p.team===b.team&&Math.abs(p.y-lane)<140).length>=2;'
  );

  // Teamfight coordination: refresh a shared focus target and protect a wounded ally.
  code = code.replace(
    'const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);',
    'const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);const fightTarget=teamFightFocus(room,b,enemies);if(fightTarget)b.botFocusId=fightTarget.id;'
  );
  code = code.replace(
    'const danger=chooseHeroTarget(enemies,b,210);',
    'const danger=chooseHeroTarget(enemies,b,210);const allyInDanger=weakAlly(room,b);if(allyInDanger&&b.hero!=="assassin"&&danger&&dist(allyInDanger,danger)<210)b.botFocusId=danger.id;'
  );
  code = code.replace(
    'if(b.hero==="warrior"&&threat&&dist(b,threat)>150)target=threat;',
    'if(b.hero==="warrior"&&threat&&dist(b,threat)>150)target=threat;const focusedTeam=enemies.find(e=>e.id===b.botFocusId&&e.alive);if(focusedTeam&&room.players.filter(p=>p.alive&&p.team===b.team&&dist(p,focusedTeam)<280).length>=2)target=focusedTeam;'
  );

  return code;
};

require('./server-launcher.js');
