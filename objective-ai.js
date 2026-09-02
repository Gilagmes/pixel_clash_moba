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
      const hp=j.hp>0?Math.max(0,1-j.hp/Math.max(1,j.maxHp||j.hp)):0;
      const nearby=room.players.filter(p=>p.alive&&p.team===b.team&&dist(p,j)<260).length;
      return priority+nearby*18-hp*12-dist(b,j)*.015;
    };
    return score(c)-score(a);
  })[0];
}
function objectiveEnemyNear(room,b,camp){
  if(!camp)return null;
  return room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,camp)<260)
    .sort((a,c)=>dist(a,camp)-dist(c,camp))[0]||null;
}
`;
  if (!code.includes('function objectiveCamp(')) code = code.replace('const LANES=', inject+'const LANES=');

  code = code.replace(
    'const camp=room.jungle?.filter(j=>j.alive).sort((a,c)=>dist(b,a)-dist(b,c))[0];',
    'const camp=objectiveCamp(room,b,now);const objectiveEnemy=objectiveEnemyNear(room,b,camp);const objectiveReady=!!(camp&&now>=b.botJungleAt&&b.hp>b.maxHp*.58);if(objectiveReady&&!low&&(!danger||dist(b,danger)>280)){target=null;if(objectiveEnemy)b.botFocusId=objectiveEnemy.id;}'
  );

  code = code.replace(
    'const wantsJungle=!target&&!danger&&camp&&now>=b.botJungleAt&&(b.gold<900||b.hp>b.maxHp*.65);',
    'const wantsJungle=!!(camp&&now>=b.botJungleAt&&b.hp>b.maxHp*.58&&(!target||(!danger&&camp.buff!=="blue")||camp.buff==="dragon"));'
  );

  return code;
};

require('./server-launcher.js');
