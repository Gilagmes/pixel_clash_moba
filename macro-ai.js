const fs = require('fs');
const path = require('path');

// Macro AI 9.0: map-wide wave, siege and endgame orchestration layer.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installMacroAI(code) {
  if (typeof code !== 'string' || code.includes('PixelMacroAI90')) return code;
  const inject = `
/* PixelMacroAI90 */
function pixelMacroTower(room,team){
  const towers=(room.towers||[]).filter(t=>t.alive&&t.team!==team);
  let best=null,score=-Infinity;
  for(const t of towers){
    const allies=room.minions.filter(m=>m.hp>0&&m.team===team&&m.laneY===t.laneY).length;
    const enemies=room.minions.filter(m=>m.hp>0&&m.team!==team&&m.laneY===t.laneY).length;
    const hp=t.hp/Math.max(1,t.maxHp||t.hp);
    const s=allies*18-enemies*8+(1-hp)*100;
    if(s>score){score=s;best=t;}
  }
  return best;
}
function pixelMacroWave(room,b,lane){
  const allied=room.minions.filter(m=>m.hp>0&&m.team===b.team&&m.laneY===lane);
  const enemy=room.minions.filter(m=>m.hp>0&&m.team!==b.team&&m.laneY===lane);
  return {allied:allied.length,enemy:enemy.length,adv:allied.length-enemy.length};
}
function pixelMacroBase(room,team){
  const base=room.bases?.find(x=>x.team===team);
  if(!base)return null;
  return room.players.filter(p=>p.alive&&p.team!==team&&dist(p,base)<300)[0]||null;
}
function pixelMacroLane(room,team){
  const lanes=[180,450,720];
  let best=450,score=-Infinity;
  for(const lane of lanes){
    const w=pixelMacroWave(room,{team},lane);
    const tower=pixelMacroTower(room,team);
    const towerBonus=tower&&tower.laneY===lane?30:0;
    const s=w.adv*24+towerBonus;
    if(s>score){score=s;best=lane;}
  }
  return best;
}
function pixelMacroDirector(room){
  if(!room||room.finished)return;
  const now=Date.now();
  if(!room.pixelMacroState)room.pixelMacroState={};
  for(const team of [1,2]){
    const bots=room.players.filter(p=>p.alive&&p.team===team&&p.isBot);
    if(!bots.length)continue;
    const enemies=room.players.filter(p=>p.alive&&p.team!==team);
    const baseThreat=pixelMacroBase(room,team);
    const tower=pixelMacroTower(room,team);
    const lane=pixelMacroLane(room,team);
    const wave=pixelMacroWave(room,bots[0],lane);
    const alive=bots.length;
    const enemyCount=enemies.length;
    const strong=alive>=2&&alive>=enemyCount;
    let mode='LANE';
    let focus=null;
    if(baseThreat){
      mode='BASE_DEFENSE';
      focus=baseThreat;
    }else if(strong&&tower&&wave.adv>=1){
      mode='SIEGE';
    }else if(strong){
      mode='TEAM_HUNT';
      focus=enemies.slice().sort((a,b)=>(a.hp/Math.max(1,a.maxHp))-(b.hp/Math.max(1,b.maxHp)))[0]||null;
    }else{
      mode='FARM_REGROUP';
    }
    room.pixelMacroState[team]={mode,lane,focusId:focus?.id||null,towerId:tower?.id||null,at:now};
    for(const b of bots){
      b.botMacroMode=mode;
      b.botMacroLane=lane;
      b.botMacroTowerId=tower?.id||null;
      if(baseThreat){
        b.botLane=baseThreat.y||lane;
        b.botFocusId=baseThreat.id;
        b.botTeamTask=b.hero==='warrior'?'PEEL':b.hero==='mage'?'CONTROL':'INTERCEPT';
      }else if(mode==='SIEGE'){
        b.botLane=lane;
        if(tower)b.botFocusId=null;
        b.botTeamTask=b.hero==='warrior'?'FRONT':b.hero==='mage'?'SIEGE':'FLANK';
      }else if(mode==='TEAM_HUNT'&&focus){
        b.botFocusId=focus.id;
        b.botTeamTask=b.hero==='warrior'?'INITIATE':b.hero==='mage'?'CONTROL':'EXECUTE';
      }else if(mode==='FARM_REGROUP'){
        b.botLane=lane;
        b.botTeamTask=b.hero==='warrior'?'ANCHOR':b.hero==='mage'?'COVER':'SCOUT';
      }
    }
  }
}
const __pixelMacroOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{if(room)pixelMacroDirector(room);}catch(e){}
  return __pixelMacroOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installMacroAI(out);
};

require('./formation-ai.js');
