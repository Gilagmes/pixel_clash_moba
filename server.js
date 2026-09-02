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
  warrior: { name: "Warrior", maxHp: 130, damage: 16, range: 150, speed: 1, q: 34, w: 42, e: 28 },
  mage: { name: "Mage", maxHp: 90, damage: 10, range: 180, speed: 1, q: 46, w: 28, e: 20 },
  assassin: { name: "Assassin", maxHp: 80, damage: 22, range: 140, speed: 1.18, q: 58, w: 20, e: 38 }
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
app.get("/health", (_req, res) => res.json({ ok: true, game: "Pixel Clash", version: "2.3.0" }));
app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

wss.on("connection", ws => {
  ws.roomId = null; ws.player = null; ws.isAlive = true; ws.lastAttack = 0; ws.cooldowns = {};
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", raw => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "join") {
      const mode = msg.mode === "5v5" ? "5v5" : "3v3";
      const maxPlayers = mode === "5v5" ? 10 : 6;
      let room = [...rooms.values()].find(r => r.mode === mode && !r.finished && r.players.length < r.maxPlayers);
      if (!room) {
        const id = Math.random().toString(36).slice(2, 9);
        room = { id, mode, maxPlayers, players: [], minions: [], towers: createTowers(), bases: createBases(), nextMinion: Date.now() + 1500, finished: false, winner: null };
        rooms.set(id, room);
      }
      const index = room.players.length;
      const team = index < maxPlayers / 2 ? 1 : 2;
      const heroKey = HEROES[msg.hero] ? msg.hero : "warrior";
      const hero = HEROES[heroKey];
      const player = { id: Math.random().toString(36).slice(2, 9), name: String(msg.name || "Player").slice(0, 18), hero: heroKey, heroName: hero.name, team, x: team === 1 ? 115 : 885, y: LANES[index % 3], hp: hero.maxHp, maxHp: hero.maxHp, alive: true, respawnAt: 0, gold: 500, kills: 0, deaths: 0, damageBonus: 0, speedBonus: 0, inventory: [], level: 1, xp: 0 };
      room.players.push(player); ws.roomId = room.id; ws.player = player; broadcastState(room); return;
    }
    if (!ws.roomId || !ws.player) return;
    const room = rooms.get(ws.roomId); if (!room || room.finished) return;
    const p = ws.player;
    if (msg.type === "move" && p.alive) {
      const tx = Number(msg.x), ty = Number(msg.y);
      const maxStep = 60 * (heroStat(p, "speed") + (p.speedBonus || 0));
      if (Number.isFinite(tx)) p.x = clamp(p.x + clamp(tx - p.x, -maxStep, maxStep), 80, 920);
      if (Number.isFinite(ty)) p.y = clamp(p.y + clamp(ty - p.y, -maxStep, maxStep), 80, 820);
      broadcastState(room); return;
    }
    if (msg.type === "attack" && p.alive) {
      if (Date.now() - ws.lastAttack < 450) return;
      ws.lastAttack = Date.now();
      damageNearest(room, p, heroStat(p, "range"), heroStat(p, "damage") + p.damageBonus);
      broadcast(room, { type: "combat", action: "attack", by: p.id }); broadcastState(room); return;
    }
    if ((msg.type === "skill" || msg.type === "ability") && p.alive) {
      useAbility(room, ws, String(msg.key || "q").toLowerCase()); return;
    }
    if (msg.type === "buy" && p.alive) {
      const key = String(msg.item || ""), item = ITEMS[key];
      if (!item || p.inventory.includes(key) || p.gold < item.cost) return;
      p.gold -= item.cost; p.inventory.push(key);
      if (item.damage) p.damageBonus += item.damage;
      if (item.hp) { p.maxHp += item.hp; p.hp += item.hp; }
      if (item.speed) p.speedBonus += item.speed;
      broadcast(room, { type: "purchase", item: item.name, by: p.id }); broadcastState(room);
    }
  });
  ws.on("close", () => {
    const room = rooms.get(ws.roomId); if (!room) return;
    room.players = room.players.filter(p => p.id !== ws.player?.id);
    if (!room.players.length) rooms.delete(room.id); else broadcastState(room);
  });
});

function useAbility(room, ws, key) {
  const p = ws.player;
  if (!["q", "w", "e"].includes(key)) return;
  const cooldowns = { q: 3500, w: 6000, e: 8000 }, now = Date.now();
  if (now - (ws.cooldowns[key] || 0) < cooldowns[key]) return;
  ws.cooldowns[key] = now;
  let hits = 0;
  if (key === "q") {
    // Hero-specific signature attack.
    const range = p.hero === "mage" ? 280 : p.hero === "assassin" ? 190 : 170;
    const damage = heroStat(p, "q") + p.damageBonus;
    for (const target of room.players) if (target.team !== p.team && target.alive && dist(p, target) <= range) { applyDamage(room, target, damage, p); hits++; }
    for (const m of room.minions) if (m.team !== p.team && m.hp > 0 && dist(p, m) <= range) { applyDamage(room, m, damage, p); hits++; }
    for (const t of room.towers) if (t.alive && t.team !== p.team && dist(p, {x:t.x,y:t.laneY}) <= range) { damageTower(room, t, damage, p); hits++; }
  } else if (key === "w") {
    // Warrior shield/heal, Mage stronger heal, Assassin quick sustain.
    const heal = heroStat(p, "w") + Math.round(p.maxHp * (p.hero === "warrior" ? .18 : .12));
    p.hp = Math.min(p.maxHp, p.hp + heal);
  } else if (key === "e") {
    const dir = p.team === 1 ? 1 : -1;
    p.x = clamp(p.x + dir * (p.hero === "assassin" ? 150 : 100), 80, 920);
    const damage = heroStat(p, "e") + p.damageBonus;
    for (const target of room.players) if (target.team !== p.team && target.alive && dist(p, target) <= 90) { applyDamage(room, target, damage, p); hits++; }
  }
  broadcast(room, { type: "ability", key, hero: p.hero, by: p.id, hits });
  checkVictory(room); broadcastState(room);
}

function createTowers() {
  const towers=[];
  for (const team of [1,2]) for (const laneY of LANES) {
    towers.push({id:`t-${team}-${laneY}-1`,team,laneY,x:team===1?245:755,hp:180,maxHp:180,tier:1,alive:true,lastShot:0});
    towers.push({id:`t-${team}-${laneY}-2`,team,laneY,x:team===1?390:610,hp:220,maxHp:220,tier:2,alive:true,lastShot:0});
  }
  return towers;
}
function createBases(){return [{id:"base-1",team:1,x:90,y:450,hp:600,maxHp:600},{id:"base-2",team:2,x:910,y:450,hp:600,maxHp:600}];}
function heroStat(p,key){return HEROES[p.hero]?.[key] ?? HEROES.warrior[key];}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function damageTower(room,tower,damage,attacker){tower.hp=Math.max(0,tower.hp-damage);if(tower.hp===0)rewardTower(room,tower,attacker);}
function damageNearest(room,attacker,range,damage){
  let target=null,best=Infinity;
  for(const p of room.players) if(p.alive&&p.team!==attacker.team&&dist(attacker,p)<=range&&dist(attacker,p)<best){target=p;best=dist(attacker,p);}
  if(!target) for(const m of room.minions) if(m.hp>0&&m.team!==attacker.team&&dist(attacker,m)<=range&&dist(attacker,m)<best){target=m;best=dist(attacker,m);}
  if(!target) for(const t of room.towers) if(t.alive&&t.team!==attacker.team&&dist(attacker,{x:t.x,y:t.laneY})<=range&&dist(attacker,{x:t.x,y:t.laneY})<best){target=t;best=dist(attacker,{x:t.x,y:t.laneY});}
  if(!target)return;
  if(target.id?.startsWith("m-"))applyDamage(room,target,damage,attacker);else if(target.id?.startsWith("t-"))damageTower(room,target,damage,attacker);else applyDamage(room,target,damage,attacker);
  checkVictory(room);
}
function gainXp(p,amount){p.xp+=amount;const needed=p.level*100;if(p.xp>=needed){p.xp-=needed;p.level++;p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);p.damageBonus+=2;}}
function applyDamage(room,target,damage,attacker){
  target.hp=Math.max(0,target.hp-damage);
  if(target.hp>0||target.alive===false)return;
  if(target.id?.startsWith("m-")){target.hp=0;if(attacker?.gold!=null){attacker.gold+=15;gainXp(attacker,25);}return;}
  target.alive=false; target.deaths=(target.deaths||0)+1;
  if(attacker?.id&&attacker.id!==target.id){attacker.kills=(attacker.kills||0)+1;attacker.gold=(attacker.gold||0)+100;gainXp(attacker,100);}
  target.respawnAt=Date.now()+5000;
}
function rewardTower(room,tower,attacker){if(!tower.alive)return;tower.alive=false;tower.hp=0;for(const p of room.players)if(p.team===attacker.team){p.gold+=75;gainXp(p,50);}}
function spawnMinions(room){for(const team of [1,2])for(let i=0;i<3;i++){const laneY=LANES[i];room.minions.push({id:`m-${Math.random().toString(36).slice(2,8)}`,team,laneY,x:team===1?125:875,y:laneY,hp:45,maxHp:45,speed:18,lastAttack:0});}}
function nearestHero(room,source,range){let target=null,best=Infinity;for(const p of room.players)if(p.alive&&p.team!==source.team&&dist(source,p)<=range&&Math.abs(p.y-source.y)<48&&dist(source,p)<best){target=p;best=dist(source,p);}return target;}
function tickRoom(room){
  const now=Date.now();
  if(now>=room.nextMinion&&room.players.length){spawnMinions(room);room.nextMinion=now+6500;}
  for(const p of room.players)if(!p.alive&&p.respawnAt&&now>=p.respawnAt){p.alive=true;p.hp=p.maxHp;p.x=p.team===1?115:885;p.y=LANES[Math.floor(Math.random()*3)];p.respawnAt=0;}
  for(const m of room.minions){
    if(m.hp<=0)continue;
    const dir=m.team===1?1:-1, enemyHero=nearestHero(room,m,42), enemyMinion=room.minions.find(e=>e.hp>0&&e.team!==m.team&&e.laneY===m.laneY&&Math.abs(e.x-m.x)<34);
    if(enemyHero||enemyMinion){if(now-m.lastAttack>=900){m.lastAttack=now;if(enemyHero)applyDamage(room,enemyHero,4,m);else applyDamage(room,enemyMinion,6,m);}}
    else {m.x+=dir*(m.speed/10);const tower=room.towers.find(t=>t.alive&&t.team!==m.team&&t.laneY===m.laneY&&Math.abs(t.x-m.x)<20);if(tower&&now-m.lastAttack>=900){m.lastAttack=now;damageTower(room,tower,5,m);}const base=room.bases.find(b=>b.team!==m.team&&Math.abs(b.x-m.x)<28&&Math.abs(b.y-m.y)<60);if(base)base.hp=Math.max(0,base.hp-2);}
  }
  for(const tower of room.towers){if(!tower.alive||now-tower.lastShot<1100)continue;const target=nearestHero(room,{team:tower.team,x:tower.x,y:tower.laneY},155);if(target){tower.lastShot=now;applyDamage(room,target,10,tower);}}
  room.minions=room.minions.filter(m=>m.hp>0&&m.x>55&&m.x<945);
  checkVictory(room);
}
function checkVictory(room){
  if(room.finished)return;
  const deadBase=room.bases.find(b=>b.hp<=0);
  if(!deadBase)return;
  room.finished=true;room.winner=deadBase.team===1?2:1;
  broadcast(room,{type:"victory",winner:room.winner});
}
function broadcastState(room){broadcast(room,{type:"state",mode:room.mode,players:room.players,minions:room.minions,towers:room.towers,bases:room.bases,lanes:LANES,finished:room.finished,winner:room.winner});}
function broadcast(room,data){const text=JSON.stringify(data);wss.clients.forEach(c=>{if(c.readyState===WebSocket.OPEN&&c.roomId===room.id)c.send(text);});}
const tick=setInterval(()=>{for(const room of rooms.values())if(!room.finished){tickRoom(room);broadcastState(room);}},100);
const heartbeat=setInterval(()=>wss.clients.forEach(ws=>{if(ws.isAlive===false)return ws.terminate();ws.isAlive=false;ws.ping();}),30000);
wss.on("close",()=>{clearInterval(heartbeat);clearInterval(tick);});
app.use((_req,res)=>res.status(404).send("Not Found"));
server.listen(PORT,"0.0.0.0",()=>console.log(`Pixel Clash server listening on ${PORT}`));
