const fs = require('fs');
const path = require('path');

// Team Coordination 3.1: shared objective assignments + role-specific team tasks.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installTeamDirector(code) {
  if (typeof code !== 'string' || code.includes('PixelTeamDirector31')) return code;
  const inject = `
/* PixelTeamDirector31 */
function pixelTeamObjective(room,team,now){
  const camps=(room.jungle||[]).filter(j=>j.alive);
  if(!camps.length)return null;
  return camps.sort((a,b)=>{
    const score=j=>{
      const base=j.buff==='dragon'?100:j.buff==='red'||j.buff==='blue'?60:20;
      const allies=room.players.filter(p=>p.alive&&p.team===team&&p.isBot&&dist(p,j)<300).length;
      const enemies=room.players.filter(p=>p.alive&&p.team!==team&&dist(p,j)<300).length;
      return base+allies*28-enemies*48-dist({x:j.x,y:j.y},{x:team===1?150:850,y:j.y})*.01;
    };
    return score(b)-score(a);
  })[0]||null;
}
function pixelTeamThreat(room,team){
  const base=room.bases?.find(x=>x.team===team);
  if(!base)return null;
  return room.players.filter(p=>p.alive&&p.team!==team&&dist(p,base)<280)
    .sort((a,b)=>dist(a,base)-dist(b,base))[0]||room.minions?.filter(m=>m.hp>0&&m.team!==team&&dist(m,base)<220)
    .sort((a,b)=>dist(a,base)-dist(b,base))[0]||null;
}
function pixelTeamFocus(room,team){
  const enemies=room.players.filter(p=>p.alive&&p.team!==team);
  const allies=room.players.filter(p=>p.alive&&p.team===team);
  let best=null,score=-Infinity;
  for(const e of enemies){
    const nearby=allies.filter(a=>dist(a,e)<300).length;
    const guards=enemies.filter(x=>dist(x,e)<190).length;
    const hp=e.hp/Math.max(1,e.maxHp||e.hp);
    let s=nearby*85-guards*25+(1-hp)*120+(e.hero==='mage'?25:0);
    if(e.hero==='assassin')s+=15;
    if(s>score){score=s;best=e;}
  }
  return best;
}
function pixelTeamLane(room,team){
  const lanes=[180,450,720];
  let best=lanes[0],score=-Infinity;
  for(const y of lanes){
    const enemyTower=room.towers.filter(t=>t.alive&&t.team!==team&&t.laneY===y);
    const enemyHp=enemyTower.reduce((s,t)=>s+t.hp/Math.max(1,t.maxHp||t.hp),0);
    const allied=room.minions.filter(m=>m.hp>0&&m.team===team&&m.laneY===y).length;
    const enemy=room.minions.filter(m=>m.hp>0&&m.team!==team&&m.laneY===y).length;
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot&&Math.abs(p.y-y)<160).length;
    const s=allied*7-enemy*4+bots*24+(enemyTower.length?3-enemyHp:0);
    if(s>score){score=s;best=y;}
  }
  return best;
}
function pixelAssignTask(b,mode,focus,objective,threat){
  if(mode==='DEFEND'){
    b.botTeamTask=b.hero==='warrior'?'PEEL':b.hero==='mage'?'CONTROL':'INTERCEPT';
    return;
  }
  if(mode==='OBJECTIVE'){
    b.botTeamTask=b.hero==='warrior'?'SECURE':b.hero==='mage'?'GUARD':'FLANK';
    return;
  }
  if(mode==='FINISH'){
    b.botTeamTask=b.hero==='warrior'?'FRONT':b.hero==='mage'?'SIEGE':'EXECUTE';
    return;
  }
  if(mode==='FIGHT'){
    b.botTeamTask=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'BACKLINE':'FLANK';
    return;
  }
  if(mode==='REGROUP'){
    b.botTeamTask=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'COVER':'SCOUT';
    return;
  }
  b.botTeamTask=b.hero==='warrior'?'FRONT':b.hero==='mage'?'POKE':'FLANK';
}
function pixelTeamDirector(room){
  if(!room||room.finished)return;
  const now=Date.now();
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const threat=pixelTeamThreat(room,team);
    const objective=pixelTeamObjective(room,team,now);
    const focus=pixelTeamFocus(room,team);
    const lane=pixelTeamLane(room,team);
    const alive=bots.length;
    const enemyCount=enemies.length;
    const enemyBase=room.bases?.find(x=>x.team!==team);
    const enemyTowers=room.towers.filter(t=>t.alive&&t.team!==team).length;
    const late=!!(enemyBase&&(enemyTowers===0||enemyBase.hp<(enemyBase.maxHp||enemyBase.hp)*.35));
    let mode='PUSH';
    if(threat)mode='DEFEND';
    else if(late&&alive>=Math.max(2,enemyCount))mode='FINISH';
    else if(objective&&now>=Math.min(...bots.map(b=>b.botJungleAt||0))&&alive>=2)mode='OBJECTIVE';
    else if(focus&&alive>=2&&alive>=enemyCount)mode='FIGHT';
    else if(alive<enemyCount)mode='REGROUP';

    const captain=bots.slice().sort((a,b)=>{
      const ar=a.hero==='warrior'?1:0,br=b.hero==='warrior'?1:0;
      return br-ar||(b.level||1)-(a.level||1)||(b.hp||0)-(a.hp||0);
    })[0];
    for(const b of bots){
      b.botTeamMode=mode;
      b.botCaptainId=captain.id;
      pixelAssignTask(b,mode,focus,objective,threat);
      if(mode==='DEFEND'&&threat){b.botFocusId=threat.id; b.botLane=threat.laneY||b.botLane; continue;}
      if(mode==='OBJECTIVE'&&objective){
        b.botFocusId=null;
        b.botLane=objective.y||b.botLane;
        b.botObjectiveId=objective.id||null;
        b.botJungleAt=Math.min(b.botJungleAt||now,now+250);
        continue;
      }
      if(mode==='FINISH'&&enemyBase){
        b.botFocusId=focus?.id||null;
        b.botLane=enemyBase.y||b.botLane;
        b.botObjectiveId=null;
        continue;
      }
      if(mode==='FIGHT'&&focus){
        b.botFocusId=focus.id;
        b.botLane=Math.abs(focus.y-b.y)<190?focus.y:lane;
        b.botObjectiveId=null;
        continue;
      }
      if(mode==='REGROUP'){
        b.botFocusId=null;
        b.botObjectiveId=null;
        b.botLane=lane;
        continue;
      }
      b.botObjectiveId=null;
      b.botLane=lane;
      if(b.hero==='assassin'&&focus&&focus.hp<focus.maxHp*.45)b.botFocusId=focus.id;
      else if(b.hero!=='assassin'&&focus)b.botFocusId=focus.id;
    }
  }
}
const __pixelOriginalTickBots = tickBots;
tickBots = function(...args){
  try{ pixelTeamDirector(args[0]); }catch(e){ /* coordination must never break the bot loop */ }
  return __pixelOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installTeamDirector(out);
};

require('./objective-ai.js');
