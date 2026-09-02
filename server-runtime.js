const fs=require("fs");
const path=require("path");
const Module=require("module");

const target=path.join(__dirname,"server.js");
let source=fs.readFileSync(target,"utf8");
const broken='function broadcast(r,msg){for(const p of r.players){const c=r._clients?.get(p.id);if(c&&c.readyState===1)c.send(JSON.stringify(msg))}}';
const fixed='function broadcast(r,msg){for(const c of wss.clients){if(c.readyState!==1||c.roomId!==r.id)continue;c.send(JSON.stringify(msg))}}';

if(!source.includes(broken)){
  console.error("[PixelClash runtime] broadcast signature not found; starting original server");
}else{
  source=source.replace(broken,fixed);
  console.log("[PixelClash runtime] WebSocket broadcast safety patch active");
}

const mod=new Module(target,module);
mod.filename=target;
mod.paths=Module._nodeModulePaths(__dirname);
mod._compile(source,target);
