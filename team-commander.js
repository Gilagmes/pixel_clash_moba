const fs = require('fs');
const path = require('path');

// Full Team Commander 11.0: assign concrete jobs to each bot from live combat state.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installCommander(code) {
  if (typeof code !== 'string' || code.includes('PixelTeamCommander110')) return code;
  const inject = `
/* PixelTeamCommander110 */
function pixelCommander(room){
  if(!room||room.finished)return;
  const now=Date.now();
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const base=room.bases?.find(x=>x.team===team);
    const enemyBase=room.bases?.find(x=>x.team!==team);
    const threat=enemies.filter(e=>base&&dist(e,base)<320).sort((a,b)=>dist(a,base)-dist(b,base))[0]||null;
    const weak=enemies.slice().sort((a,b)=>(a.hp/Math.max(1,a.maxHp))-(b.hp/Math.max(1,b.maxHp)))[0]||null;
    const allyCount=bots.length;
    const enemyCount=enemies.length;
    const grouped=bots.filter(b=>bots.some(a=>a.id!==b.id&&dist(a,b)<260)).length;
    const winning=(room.towers||[]).filter(t=>t.alive&&t.team===team).length>(room.towers||[]).filter(t=>t.alive&&t.team!==team).length;
    const finish=enemyBase&&bots.filter(b=>dist(b,enemyBase)<430).length>=2;
    const captain=bots.slice().sort((a,b)=>(b.level||1)-(a.level||1)||(b.hp-a.hp))[0];
    const objective=room.jungle?.camps?.filter(c=>c.hp>0).sort((a,b)=>(b.buff==='dragon'?100:0)-(a.buff==='dragon'?100:0))[0]||null;
    for(const b of bots){
      b.botCommanderCaptainId=captain?.id||null;
      b.botCommanderAt=now;
      let task='HOLD';
      if(threat){
        task=b.hero==='warrior'?'PEEL':b.hero==='mage'?'CONTROL':'INTERCEPT';
        b.botFocusId=threat.id;
      }else if(finish||winning){
        task=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'SIEGE':'EXECUTE';
        if(weak)b.botFocusId=weak.id;
      }else if(enemyCount>=allyCount+2){
        task=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'COVER':'SCOUT';
      }else if(objective&&grouped>=2){
        task=b.hero==='warrior'?'SECURE':b.hero==='mage'?'GUARD':'FLANK';
      }else if(enemyCount>0&&grouped>=2){
        task=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'BACKLINE':'FLANK';
        if(weak)b.botFocusId=weak.id;
      }
      b.botCommanderTask=task;
      b.botTeamTask=task;
      if(task==='FLANK'||task==='INTERCEPT'){
        const target=weak||threat;
        if(target){b.botCommanderTargetX=Math.round(target.x);b.botCommanderTargetY=Math.round(target.y);}
      }
      if(task==='SECURE'&&objective){b.botCommanderObjectiveId=objective.id;b.botJungleAt=Math.min(b.botJungleAt||now,now+500);}
    }
  }
}
const __pixelCommanderOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{if(room)pixelCommander(room);}catch(e){}
  return __pixelCommanderOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installCommander(out);
};

require('./battle-director.js');
