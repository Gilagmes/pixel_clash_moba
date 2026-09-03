const fs=require('fs');
const original=fs.readFileSync;
fs.readFileSync=function(file,...args){let text=original.call(this,file,...args);if(String(file).endsWith('server.js')&&typeof text==='string'){
  text=text.replace(/skillPoints:0,skillLevels:/,'skillPoints:1,skillLevels:');
  const oldTick='setInterval(()=>{for(const r of rooms.values()){try{ensureBots(r);tickBots(r);broadcastState(r)}catch(e){console.error("[PixelClash tick]",e)}}},200);';
  const newTick='setInterval(()=>{for(const r of rooms.values()){try{const now=Date.now();for(const p of r.players||[]){if(p.alive===false&&p.respawnAt&&now>=p.respawnAt){const h=HEROES[p.hero]||HEROES.warrior;p.alive=true;p.hp=p.maxHp;const lane=LANES[(r.players.indexOf(p)||0)%LANES.length];p.x=p.team===1?115:885;p.y=lane;p.respawnAt=0;broadcast(r,{type:"respawn",by:p.id})}}ensureBots(r);tickBots(r);broadcastState(r)}catch(e){console.error("[PixelClash tick]",e)}}},200);';
  if(text.includes(oldTick))text=text.replace(oldTick,newTick);
  const oldConnection='wss.on("connection",ws=>{';
  const newConnection='wss.on("connection",ws=>{ws.on("error",err=>console.error("[PixelClash ws]",err?.message||err));';
  if(text.includes(oldConnection))text=text.replace(oldConnection,newConnection);
  text+='\n// Render WebSocket keepalive: prevent idle/stale connections from being dropped.\nconst pixelWsHeartbeat=setInterval(()=>{for(const ws of wss.clients){if(ws.readyState!==1)continue;if(ws.isAlive===false){try{ws.terminate()}catch{}continue}ws.isAlive=false;try{ws.ping()}catch{}}},15000);\n';
}
return text};
require('./bot-runtime');
