require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 10000;
const PUBLIC_DIR = path.join(__dirname, "public");
const LANES = [180, 450, 720];
const HEROES = {
  warrior: { name: "Warrior", maxHp: 130, damage: 16, range: 150, skillDamage: 34, skillRange: 190, speed: 1 },
  mage: { name: "Mage", maxHp: 90, damage: 10, range: 180, skillDamage: 46, skillRange: 260, speed: 1 },
  assassin: { name: "Assassin", maxHp: 80, damage: 22, range: 140, skillDamage: 58, skillRange: 170, speed: 1.18 }
};
const ITEMS = {
  blade: { name: "Клинок", cost: 250, damage: 6 },
  armor: { name: "Броня", cost: 250, hp: 35 },
  boots: { name: "Сапоги", cost: 300, speed: 0.22 }
};
const rooms = new Map();

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(express.static(PUBLIC_DIR));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Pixel Clash", version: "2.2.0" }));
app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

wss.on("connection", (ws) => {
  ws.roomId = null; ws.player = null; ws.isAlive = true; ws.lastAttack = 0; ws.lastSkill = 0; ws.cooldowns = {};
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "join") {
      const mode = msg.mode === "5v5" ? "5v5" : "3v3";
      const maxPlayers = mode === "5v5" ? 10 : 6;
      let room = [...rooms.values()].find(r => r.mode === mode && !r.finished && r.players.length < r.maxPlayers);
      if (!room) {
        const id = Math.random().toString(36).slice(2, 9);
        room = { id, mode, maxPlayers, players: [], minions: [], towers: createTowers(), bases: createBases(), nextMinion: Date.now() + 2500, finished: false, winner: null };
        rooms.set(id, room);
      }
      const index = room.players.length;
      const team = index < maxPlayers / 2 ? 1 : 2;
      const heroKey = HEROES[msg.hero] ? msg.hero : "warrior";
      const hero = HEROES[heroKey];
      const player = { id: Math.random().toString(36).slice(2, 9), name: String(msg.name || "Player").slice(0, 18), hero: heroKey, heroName: hero.name, team, x: team === 1 ? 115 : 885, y: LANES[index % 3], hp: hero.maxHp, maxHp: hero.maxHp, alive: true, respawnAt: 0, gold: 500, kills: 0, deaths: 0, damageBonus: 0, speedBonus: 0, inventory: [] };
      room.players.push(player); ws.roomId = room.id; ws.player = player; broadcastState(room); return;
    }
    if (!ws.roomId || !ws.player) return;
    const room = rooms.get(ws.roomId); if (!room || room.finished) return;
    if (msg.type === "move" && ws.player.alive) {
      const x = Number(msg.x), y = Number(msg.y);
      const maxStep = 60 * (heroStat(ws.player, "speed") + (ws.player.speedBonus || 0));
      if (Number.isFinite(x)) ws.player.x = clamp(x, 80, 920);
      if (Number.isFinite(y)) ws.player.y = clamp(y, 80, 820);
      if (Number.isFinite(x) && Math.abs(x - ws.player.x) > maxStep) ws.player.x = clamp(ws.player.x + Math.sign(x - ws.player.x) * maxStep, 80, 920);
      if (Number.isFinite(y) && Math.abs(y - ws.player.y) > maxStep) ws.player.y = clamp(ws.player.y + Math.sign(y - ws.player.y) * maxStep, 80, 820);
      broadcastState(room); return;
    }
    if (msg.type === "attack" && ws.player.alive) {
      if (Date.now() - ws.lastAttack < 450) return; ws.lastAttack = Date.now();
      damageNearest(room, ws.player, heroStat(ws.player, "range"), heroStat(ws.player, "damage") + (ws.player.damageBonus || 0));
      broadcast(room, { type: "combat", action: "attack", by: ws.player.id }); broadcastState(room); return;
    }
    if (msg.type === "skill" && ws.player.alive) {
      useAbility(room, ws, "q"); return;
    }
    if (msg.type === "ability" && ws.player.alive) {
      const key = String(msg.key || "").toLowerCase(); if (["q", "w", "e"].includes(key)) useAbility(room, ws, key); return;
    }
    if (msg.type === "buy" && ws.player.alive) {
      const key = String(msg.item || ""); const item = ITEMS[key];
      if (!item || ws.player.inventory.includes(key) || ws.player.gold < item.cost) return;
      ws.player.gold -= item.cost; ws.player.inventory.push(key);
      if (item.damage) ws.player.damageBonus += item.damage;
      if (item.hp) { ws.player.maxHp += item.hp; ws.player.hp += item.hp; }
      if (item.speed) ws.player.speedBonus += item.speed;
      broadcast(room, { type: "purchase", item: item.name, by: ws.player.id }); broadcastState(room); return;
    }
  });
  ws.on("close", () => {
    const room = rooms.get(ws.roomId); if (!room) return;
    room.players = room.players.filter(p => p.id !== ws.player?.id);
    if (!room.players.length) rooms.delete(room.id); else broadcastState(room);
  });
});

function useAbility(room, ws, key) {
  const now = Date.now();
  const p = ws.player;
  const cds = { q: 3500, w: 6000, e: 8000 };
  if (now - (ws.cooldowns[key] || 0) < cds[key]) return;
  ws.cooldowns[key] = now;
  let hits = 0;
  if (key === "q") {
    for (const target of room.players) if (target.team !== p.team && target.alive && dist(p, target) <= heroStat(p, "skillRange")) { applyDamage(room, target, heroStat(p, "skillDamage") + (p.damageBonus || 0), p); hits++; }
    for (const m of room.minions) if (m.team !== p.team && m.hp > 0 && dist(p, m) <= heroStat(p, "skillRange")) { applyDamage(room, m, heroStat(p, "skillDamage"), p); hits++; }
    for (const t of room.towers) if (t.alive && t.team !== p.team && dist(p, {x:t.x,y:t.laneY}) <= heroStat(p, "skillRange")) { t.hp = Math.max(0, t.hp - heroStat(p, "skillDamage")); if (t.hp === 0) rewardTower(room, t, p); hits++; }
  } else if (key === "w") {
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.28));
  } else if (key === "e") {
    const dir = p.team === 1 ? 1 : -1; p.x = clamp(p.x + dir * 110, 80, 920);
    for (const target of room.players) if (target.team !== p.team && target.alive && dist(p, target) <= 100) { applyDamage(room, target, heroStat(p, "damage") + 20 + (p.damageBonus || 0), p); hits++; }
  }
  broadcast(room, { type: "ability", key, by: p.id, hits }); checkVictory(room); broadcastState(room);
}
function createTowers() { const towers=[]; for(const team of [1,2]) for(const laneY of LANES){ towers.push({id:`t-${team}-${laneY}-1`,team,laneY,x:team===1?245:755,hp:180,maxHp:180,tier:1,alive:true,lastShot:0}); towers.push({id:`t-${team}-${laneY}-2`,team,laneY,x:team===1?390:610,hp:220,maxHp:220,tier:2,alive:true,lastShot:0}); } return towers; }
function createBases(){return [{team:1,x:90,y:450,hp:600,maxHp:600},{team:2,x:910,y:450,hp:600,maxHp:600}];}
function heroStat(p,key){return HEROES[p.hero]?.[key]??HEROES.warrior[key];}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function damageNearest(room,attacker,range,damage){let target=null,best=Infinity; for(const p of room.players)if(p.alive&&p.team!==attacker.team&&dist(attacker,p)<=range&&dist(attacker,p)<best){target=p;best=dist(attacker,p);} if(!target)for(const m of room.minions)if(m.hp>0&&m.team!==attacker.team&&dist(attacker,m)<=range&&dist(attacker,m)<best){target=m;best=dist(attacker,m);} if(!target)for(const t of room.towers)if(t.alive&&t.team!==attacker.team&&dist(attacker,{x:t.x,y:t.laneY})<=range&&dist(attacker,{x:t.x,y:t.laneY})<best){target=t;best=dist(attacker,{x:t.x,y:t.laneY});} if(target){if(target.id?.startsWith("m-"))applyDamage(room,target,damage,attacker);else if(target.id?.startsWith("t-")){target.hp=Math.max(0,target.hp-damage);if(target.hp===0)rewardTower(room,target,attacker);checkVictory(room);}else applyDamage(room,target,damage,attacker);}}
function applyDamage(room,target,damage,attacker){target.hp=Math.max(0,target.hp-damage);if(target.hp>0||target.alive===false)return;target.alive=false;if(target.id&&target.id.startsWith("m-")){if(attacker?.gold!=null)attacker.gold+=15;return;}target.deaths=(target.deaths||0)+1;if(attacker?.id&&attacker.id!==target.id){attacker.kills=(attacker.kills||0)+1;attacker.gold=(attacker.gold||0)+100;}target.respawnAt=Date.now()+5000;}
function rewardTower(room,tower,attacker){tower.alive=false;tower.hp=0;for(const p of room.players)if(p.team===attacker.team)p.gold=(p.gold||0)+75;}
function spawnMinions(room){for(const team of [1,2])for(let i=0;i<3;i++){const laneY=LANES[i];room.minions.push({id:`m-${Math.random().toString(36).slice(2,8)}`,team,laneY,x:team===1?125:875,y:laneY,hp:45,maxHp:45,speed:18,lastAttack:0});}}
function nearestEnemy(room,source,range,predicate=()=>true){let target=null,best=Infinity;for(const p of room.players)if(p.alive&&p.team!==source.team&&predicate(p)&&dist(source,p)<=range&&dist(source,p)<best){target=p;best=dist(source,p);}return target;}
function tickRoom(room){const now=Date.now();if(now>=room.nextMinion&&room.players.length){spawnMinions(room);room.nextMinion=now+6500;} for(const p of room.players)if(!p.alive&&p.respawnAt&&now>=p.respawnAt){p.alive=true;p.hp=p.maxHp;p.x=p.team===1?115:885;p.y=LANES[Math.floor(Math.random()*3)];p.respawnAt=0;} for(const m of room.minions){if(m.hp<=0)continue;const dir=m.team===1?1:-1;const enemyHero=nearestEnemy(room,m,34);const enemyMinion=room.minions.find(e=>e.hp>0&&e.team!==m.team&&e.laneY===m.laneY&&Math.abs(e.x-m.x)<32);if(enemyHero||enemyMinion){if(now-m.lastAttack>=900){m.lastAttack=now;if(enemyHero)applyDamage(room,enemyHero,4,m);else applyDamage(room,enemyMinion,6,m);}}else{m.x+=dir*(m.speed/10);const tower=room.towers.find(t=>t.alive&&t.team!==m.team&&t.laneY===m.laneY&&Math.abs(t.x-m.x)<18);if(tower&&now-(m.lastAttack||0)>=900){m.lastAttack=now;tower.hp=Math.max(0,tower.hp-5);if(tower.hp===0)rewardTower(room,tower,m);}const base=room.bases.find(b=>b.team!==m.team&&Math.abs(b.x-m.x)<22&&Math.abs(b.y-m.y)<55);if(base)base.hp=Math.max(0,base.hp-2);}} for(const tower of room.towers){if(!tower.alive||now-tower.lastShot<1100)continue;const target=nearestEnemy(room,{team:tower.team,x:tower.x,y:tower.laneY},155,p=>Math.abs(p.y-tower.laneY)<48);if(target){tower.lastShot=now;applyDamage(room,target,10,tower);}} room.minions=room.minions.filter(m=>m.hp>0&&m.x>55&&m.x<945);checkVictory(room);}
const tick=setInterval(()=>{for(const room of rooms.values())if(!room.finished){tickRoom(room);broadcastState(room);}},100);
const heartbeat=setInterval(()=>wss.clients.forEach(ws=>{if(ws.isAlive===false)return ws.terminate();ws.isAlive=false;ws.ping();}),30000);
wss.on("close",()=>{clearInterval(heartbeat);clearInterval(tick);});
function broadcastState(room){broadcast(room,{type:"state",mode:room.mode,players:room.players,minions:room.minions,towers:room.towers,bases:room.bases,lanes:LANES,finished:room.finished,winner:room.winner});}
function broadcast(room,data){const text=JSON.stringify(data);wss.clients.forEach(c=>{if(c.readyState===WebSocket.OPEN&&c.roomId===room.id)c.send(text);});}
app.use((_req,res)=>res.status(404).send("Not Found"));
server.listen(PORT,"0.0.0.0",()=>console.log(`Pixel Clash server listening on ${PORT}`));
