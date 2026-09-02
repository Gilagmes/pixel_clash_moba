const fs = require('fs');
const path = require('path');

// Dynamic Battle Director 10.0: match-state strategy layer above Macro AI.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installBattleDirector(code) {
  if (typeof code !== 'string' || code.includes('PixelBattleDirector100')) return code;
  const inject = `
/* PixelBattleDirector100 */
function pixelBattleDirectorState(room,team){
  const players=room.players||[];
  const allies=players.filter(p=>p.alive&&p.team===team);
  const enemies=players.filter(p=>p.alive&&p.team!==team);
  const alliedPower=allies.reduce((s,p)=>s+(p.hp/Math.max(1,p.maxHp))*(.7+(p.level||1)*.1),0);
  const enemyPower=enemies.reduce((s,p)=>s+(p.hp/Math.max(1,p.maxHp))*(.7+(p.level||1)*.1),0);
  const towers=room.towers||[];
  const allyT=towers.filter(t=>t.team===team&&t.alive).length;
  const enemyT=towers.filter(t=>t.team!==team&&t.alive).length;
  const base=room.bases?.find(b=>b.team===team);
  const enemyBase=room.bases?.find(b=>b.team!==team);
  const enemyNearBase=enemies.filter(e=>base&&dist(e,base)<340).length;
  const allyNearEnemyBase=allies.filter(a=>enemyBase&&dist(a,enemyBase)<360).length;
  const advantage=alliedPower-enemyPower+(allyT-enemyT)*.8;
  let phase='BALANCED';
  if(enemyNearBase>0)phase='DEFENSE';
  else if(advantage>=2.2||allyNearEnemyBase>=2)phase='WINNING';
  else if(advantage<=-2.2)phase='COMEBACK';
  else if(advantage<=-.9)phase='CAUTIOUS';
  return {phase,advantage,enemyNearBase,allyNearEnemyBase};
}
function pixelBattleDirector(room){
  if(!room||room.finished)return;
  const now=Date.now();
  if(!room.pixelBattleDirectorMemory)room.pixelBattleDirectorMemory={};
  for(const team of [1,2]){
    const s=pixelBattleDirectorState(room,team);
    const prev=room.pixelBattleDirectorMemory[team]||{};
    const mode=s.phase;
    room.pixelBattleDirectorMemory[team]={...s,at:now,previous:prev.phase||null};
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const focus=enemies.slice().sort((a,b)=>{
      const ah=a.hp/Math.max(1,a.maxHp),bh=b.hp/Math.max(1,b.maxHp);
      return ah-bh;
    })[0];
    const base=room.bases?.find(b=>b.team===team);
    const lanes=[180,450,720];
    let lane=450;
    if(mode==='COMEBACK'||mode==='CAUTIOUS'){
      lane=lanes.reduce((best,y)=>{
        const a=room.minions.filter(m=>m.hp>0&&m.team===team&&m.laneY===y).length;
        const e=room.minions.filter(m=>m.hp>0&&m.team!==team&&m.laneY===y).length;
        const score=(a-e)+(a>e?1:0);
        return score>best.score?{y,score}:best;
      },{y:450,score:-Infinity}).y;
    }else if(mode==='WINNING'){
      lane=lanes.reduce((best,y)=>{
        const e=room.towers.filter(t=>t.alive&&t.team!==team&&Math.abs(t.y-y)<35).reduce((s,t)=>s+t.hp/Math.max(1,t.maxHp||t.hp),0);
        return e<best.score?{y,score:e}:best;
      },{y:450,score:Infinity}).y;
    }
    for(const b of bots){
      b.botDirectorPhase=mode;
      b.botDirectorAdvantage=Math.round(s.advantage*10)/10;
      b.botDirectorLane=lane;
      b.botDirectorFocusId=focus?.id||null;
      if(mode==='DEFENSE'){
        b.botLane=base?.y||b.botLane||450;
        if(s.enemyNearBase&&focus)b.botFocusId=focus.id;
        b.botTeamTask=b.hero==='warrior'?'PEEL':b.hero==='mage'?'CONTROL':'INTERCEPT';
      }else if(mode==='COMEBACK'){
        b.botLane=lane;
        b.botTeamTask=b.hero==='warrior'?'FARM_FRONT':b.hero==='mage'?'SAFE_FARM':'PICKOFF';
        if(focus&&s.advantage>-4)b.botFocusId=focus.id;
      }else if(mode==='CAUTIOUS'){
        b.botLane=lane;
        b.botTeamTask=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'POKE':'FLANK';
      }else if(mode==='WINNING'){
        b.botLane=lane;
        b.botTeamTask=b.hero==='warrior'?'FRONT':b.hero==='mage'?'SIEGE':'EXECUTE';
        if(focus)b.botFocusId=focus.id;
      }else{
        b.botLane=lane;
        b.botTeamTask=b.hero==='warrior'?'FRONT':b.hero==='mage'?'POKE':'FLANK';
      }
    }
  }
}
const __pixelBattleDirectorOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{if(room)pixelBattleDirector(room);}catch(e){}
  return __pixelBattleDirectorOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installBattleDirector(out);
};

require('./macro-ai.js');
