const fs = require('fs');
const path = require('path');

// Team Memory 4.0: keeps short-lived strategic memory across bot ticks,
// while remaining completely isolated from the core game loop.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installTeamMemory(code) {
  if (typeof code !== 'string' || code.includes('PixelTeamMemory40')) return code;
  const inject = `
/* PixelTeamMemory40 */
function pixelRememberTeam(room){
  if(!room||room.finished)return;
  if(!room.pixelTeamMemory)room.pixelTeamMemory={};
  const now=Date.now();
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const mode=bots[0].botTeamMode||'PUSH';
    const focus=bots.map(b=>b.botFocusId).find(Boolean)||null;
    const objective=bots.map(b=>b.botObjectiveId).find(Boolean)||null;
    const lane=bots.map(b=>b.botLane).filter(v=>v!=null)[0]||null;
    const previous=room.pixelTeamMemory[team]||{};
    const alive=bots.length;
    const enemyCount=enemies.length;
    const fightLoss=previous.mode==='FIGHT'&&mode!=='FIGHT'&&enemyCount>alive;
    const objectiveLost=previous.objectiveId&&!objective&&previous.mode==='OBJECTIVE';
    room.pixelTeamMemory[team]={
      mode,focusId:focus,objectiveId:objective,lane,
      at:now,alive,enemyCount,
      lastFightAt:fightLoss?now:(previous.lastFightAt||0),
      lastObjectiveAt:objective?now:(previous.lastObjectiveAt||0),
      lostFight:fightLoss||!!previous.lostFight&&now-(previous.lastFightAt||0)<9000,
      lostObjective:objectiveLost||!!previous.lostObjective&&now-(previous.lastObjectiveAt||0)<12000
    };
  }
}
function pixelApplyTeamMemory(room,b){
  if(!room||!b)return;
  const m=room.pixelTeamMemory?.[b.team];
  if(!m)return;
  const now=Date.now();
  const freshFight=m.lostFight&&now-(m.lastFightAt||0)<9000;
  const freshObjective=m.lostObjective&&now-(m.lastObjectiveAt||0)<12000;
  b.botMemoryMode=m.mode;
  b.botMemoryFocusId=m.focusId||null;
  b.botMemoryObjectiveId=m.objectiveId||null;
  b.botMemoryLane=m.lane||null;
  b.botFightRecoveryUntil=freshFight?(m.lastFightAt+9000):0;
  b.botObjectiveCooldownUntil=freshObjective?(m.lastObjectiveAt+12000):0;
  if(freshFight&&b.hero!=='assassin')b.botFocusId=null;
  if(freshFight&&m.lane!=null)b.botLane=m.lane;
  if(freshObjective&&b.hero==='assassin')b.botFocusId=null;
}
const __pixelMemoryOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room){
      for(const b of room.players.filter(p=>p.alive&&p.isBot))pixelApplyTeamMemory(room,b);
    }
  }catch(e){}
  const result=__pixelMemoryOriginalTickBots.apply(this,args);
  try{pixelRememberTeam(room);}catch(e){}
  return result;
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installTeamMemory(out);
};

require('./team-coordination.js');
