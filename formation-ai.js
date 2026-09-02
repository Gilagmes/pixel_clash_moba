const fs = require('fs');
const path = require('path');

// Formation AI 8.0: lightweight formation, trap and escape-cutting layer.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installFormationAI(code) {
  if (typeof code !== 'string' || code.includes('PixelFormationAI80')) return code;
  const inject = `
/* PixelFormationAI80 */
function pixelFormationPlan(room,b){
  if(!room||!b)return null;
  const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.isBot&&p.id!==b.id);
  const enemies=room.players.filter(p=>p.alive&&p.team!==b.team);
  const target=enemies.find(e=>e.id===b.botFocusId)||enemies.slice().sort((a,c)=>dist(b,a)-dist(b,c))[0]||null;
  if(!target)return null;
  const nearby=allies.filter(a=>dist(a,target)<300);
  const teamReady=nearby.length>=1;
  const dx=target.x-b.x,dy=target.y-b.y,len=Math.max(1,Math.hypot(dx,dy));
  const nx=dx/len,ny=dy/len;
  const perpX=-ny,perpY=nx;
  let offset=0;
  if(b.hero==='warrior')offset=0;
  else if(b.hero==='mage')offset=85;
  else offset=-85;
  const slotX=target.x-nx*105+perpX*offset;
  const slotY=target.y-ny*105+perpY*offset;
  const escapeX=target.x+nx*150;
  const escapeY=target.y+ny*150;
  return {target,teamReady,slotX,slotY,escapeX,escapeY};
}
function pixelFormationApply(room,b){
  if(!room||!b)return;
  const p=pixelFormationPlan(room,b);
  b.botFormationMode='NONE';
  b.botFormationTargetId=null;
  if(!p)return;
  b.botFormationTargetId=p.target.id;
  const allies=room.players.filter(x=>x.alive&&x.team===b.team&&x.isBot&&x.id!==b.id);
  const enemyNear=room.players.filter(x=>x.alive&&x.team!==b.team&&dist(x,b)<320).length;
  if(p.teamReady){
    b.botFormationMode=b.hero==='warrior'?'FRONT':b.hero==='mage'?'BACKLINE':'FLANK';
    const delta=dist(b,{x:p.slotX,y:p.slotY});
    if(delta>55&&enemyNear<3){
      b.x+=(p.slotX-b.x)*.12;
      b.y+=(p.slotY-b.y)*.12;
    }
    if(b.hero==='assassin'&&allies.length){
      b.botFormationCutX=p.escapeX;
      b.botFormationCutY=p.escapeY;
    }
  }
  const wounded=room.players.filter(x=>x.alive&&x.team===b.team&&x.hp<x.maxHp*.32&&dist(x,b)<240)[0];
  if(wounded&&b.hero==='warrior'){
    b.botFormationMode='PEEL';
    b.botFocusId=room.players.filter(x=>x.alive&&x.team!==b.team&&dist(x,wounded)<230)
      .sort((a,c)=>dist(a,wounded)-dist(c,wounded))[0]?.id||b.botFocusId;
  }
}
const __pixelFormationOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room){
      for(const b of room.players.filter(p=>p.alive&&p.isBot))pixelFormationApply(room,b);
    }
  }catch(e){}
  return __pixelFormationOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installFormationAI(out);
};

require('./adaptive-counter.js');
