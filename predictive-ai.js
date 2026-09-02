const fs = require('fs');
const path = require('path');

// Predictive AI 7.0: lightweight trajectory prediction and pre-positioning layered before the existing AI.
const originalRead = fs.readFileSync;
const botsPath = path.resolve(__dirname, 'bots.js');

function installPredictiveAI(code) {
  if (typeof code !== 'string' || code.includes('PixelPredictiveAI70')) return code;
  const inject = `
/* PixelPredictiveAI70 */
function pixelPredictObserve(room){
  if(!room||room.finished)return;
  if(!room.pixelPredictMemory)room.pixelPredictMemory={};
  const now=Date.now();
  for(const p of room.players.filter(x=>x.alive)){
    const prev=room.pixelPredictMemory[p.id];
    const dt=prev?Math.max(.05,Math.min(1.5,(now-prev.at)/1000)):0;
    const vx=prev&&dt?(p.x-prev.x)/dt:0;
    const vy=prev&&dt?(p.y-prev.y)/dt:0;
    room.pixelPredictMemory[p.id]={x:p.x,y:p.y,vx:Math.max(-260,Math.min(260,vx)),vy:Math.max(-260,Math.min(260,vy)),at:now};
  }
}
function pixelPredictEnemy(room,b){
  const enemies=room.players.filter(p=>p.alive&&p.team!==b.team);
  let best=null,bestScore=-Infinity;
  for(const e of enemies){
    const m=room.pixelPredictMemory?.[e.id]||{};
    const distance=dist(b,e);
    if(distance>460)continue;
    const hp=e.hp/Math.max(1,e.maxHp||e.hp);
    let score=(1-hp)*120+(460-distance)*.28;
    if(e.hero==='mage')score+=30;
    if(e.hero==='assassin')score+=18;
    if(e.id===b.botFocusId)score+=55;
    if(score>bestScore){bestScore=score;best={enemy:e,m};}
  }
  return best;
}
function pixelPredictPoint(room,e,seconds){
  const m=room.pixelPredictMemory?.[e.id]||{};
  const t=Math.max(.25,Math.min(1.25,seconds));
  return {x:e.x+(m.vx||0)*t,y:e.y+(m.vy||0)*t};
}
function pixelPredictLane(y){
  const lanes=[180,450,720];
  return lanes.reduce((best,l)=>Math.abs(l-y)<Math.abs(best-y)?l:best,lanes[0]);
}
function pixelPredictApply(room,b){
  if(!room||!b)return;
  const pick=pixelPredictEnemy(room,b);
  if(!pick)return;
  const e=pick.enemy;
  const distance=dist(b,e);
  const travel=Math.max(.35,Math.min(1.15,distance/240));
  const point=pixelPredictPoint(room,e,travel);
  b.botPredictX=Math.round(point.x);
  b.botPredictY=Math.round(point.y);
  b.botPredictTargetId=e.id;
  b.botPredictAt=Date.now();

  // Pre-position by the predicted escape lane rather than the enemy's current lane.
  if(distance>150&&distance<430){
    const lane=pixelPredictLane(point.y);
    if(Math.abs(point.y-(b.botLane||lane))>70)b.botLane=lane;
  }

  // Intercept fleeing enemies: keep the shared focus, but bias the lane toward where
  // the target is going. This does not mutate the real enemy position.
  const fleeing=(pick.m.vx||0)*(e.team===1?1:-1)<-35 || Math.abs(pick.m.vy||0)>75;
  if(fleeing&&distance<360)b.botFocusId=e.id;
}
const __pixelPredictOriginalTickBots = tickBots;
tickBots = function(...args){
  const room=args[0];
  try{
    if(room){
      pixelPredictObserve(room);
      for(const b of room.players.filter(p=>p.alive&&p.isBot))pixelPredictApply(room,b);
    }
  }catch(e){}
  return __pixelPredictOriginalTickBots.apply(this,args);
};
`;
  return code + inject;
}

fs.readFileSync = function(file, encoding) {
  const out = originalRead.call(fs, file, encoding);
  if (path.resolve(String(file)) !== botsPath || typeof out !== 'string') return out;
  return installPredictiveAI(out);
};

require('./adaptive-counter.js');
