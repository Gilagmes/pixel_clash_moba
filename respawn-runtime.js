const fs=require("fs");
const Module=require("module");

const originalCompile=Module.prototype._compile;
Module.prototype._compile=function patchedCompile(content,filename){
  if(filename.endsWith("/server.js")||filename.endsWith("\\server.js")){
    const marker='const rooms=new Map();';
    const fix=`const rooms=new Map();
// Respawn safety layer: guarantees dead human players return to the arena.
setInterval(()=>{
  const now=Date.now();
  for(const room of rooms.values()){
    if(!room||room.finished)continue;
    let changed=false;
    for(const p of room.players||[]){
      if(p.isBot||p.alive)continue;
      if(!p.__pixelDeadSince)p.__pixelDeadSince=now;
      if(now-p.__pixelDeadSince<5000)continue;
      p.alive=true;
      p.hp=p.maxHp;
      p.respawnAt=0;
      p.__pixelDeadSince=0;
      p.x=p.team===1?115:885;
      const lanes=[180,450,720];
      p.y=lanes[(room.players.indexOf(p))%3];
      p.buffs=[];
      p.buffUntil=0;
      changed=true;
      try{broadcast(room,{type:"respawn",by:p.id,x:p.x,y:p.y})}catch{}
    }
    if(changed)try{broadcastState(room)}catch{}
  }
},250);`;
    if(content.includes(marker)&&!content.includes("Respawn safety layer"))content=content.replace(marker,fix);
  }
  return originalCompile.call(this,content,filename);
};

require("./bot-runtime");
