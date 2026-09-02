const fs = require('fs');
const path = require('path');

// Objective AI layer: runs before server-launcher.js and augments the bot source
// without touching the heavily compressed original bots.js.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');
fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;

  let code = out;
  const inject = `
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

  return code;
};

require('./server-launcher.js');
