const menu = document.getElementById("menu");
const game = document.getElementById("game");
const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const modeLabel = document.getElementById("modeLabel");
const deathEl = document.getElementById("death");
const tg = window.Telegram?.WebApp;
let mode = "3v3", hero = "warrior", ws = null, me = null, players = [], minions = [], towers = [], bases = [], reconnectTimer = null;
const pressed = new Set();
if (tg) { tg.ready(); tg.expand(); tg.disableVerticalSwipes?.(); document.getElementById("coins").textContent = "1000"; }
function playerName() { const u = tg?.initDataUnsafe?.user; return (u?.first_name || u?.username || "Player").slice(0, 18); }
function setMode(next) { mode = next; document.querySelectorAll(".mode").forEach(b => b.classList.toggle("active", b.dataset.mode === mode)); }
function setHero(next) { hero = next; document.querySelectorAll(".hero").forEach(b => b.classList.toggle("active", b.dataset.hero === hero)); }
document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll(".hero").forEach(b => b.addEventListener("click", () => setHero(b.dataset.hero)));
document.getElementById("play").addEventListener("click", () => { menu.classList.add("hidden"); game.classList.remove("hidden"); modeLabel.textContent = mode === "5v5" ? "5 × 5" : "3 × 3"; connect(); });
function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  const proto = location.protocol === "https:" ? "wss" : "ws"; statusEl.textContent = "Подключение..."; ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = () => { statusEl.textContent = "Поиск игроков..."; me = null; ws.send(JSON.stringify({ type: "join", mode, name: playerName(), hero })); };
  ws.onmessage = event => { try { const m = JSON.parse(event.data); if (m.type === "combat") { statusEl.textContent = m.action === "skill" ? `⚡ Q: попаданий ${m.hits}` : "⚔️ Удар!"; setTimeout(updateStatus, 650); } if (m.type !== "state") return; players = Array.isArray(m.players) ? m.players : []; minions = Array.isArray(m.minions) ? m.minions : []; towers = Array.isArray(m.towers) ? m.towers : []; bases = Array.isArray(m.bases) ? m.bases : []; if (me) me = players.find(p => p.id === me.id) || null; if (!me) me = players[players.length - 1] || null; updateStatus(); draw(); } catch { statusEl.textContent = "Ошибка данных"; } };
  ws.onerror = () => { statusEl.textContent = "Ошибка соединения"; };
  ws.onclose = () => { ws = null; if (!game.classList.contains("hidden")) { statusEl.textContent = "Переподключение..."; clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connect, 1500); } };
}
function updateStatus() { if (!me) return; const max = mode === "5v5" ? 10 : 6; const hp = Math.max(0, Math.round(me.hp ?? 0)); statusEl.textContent = `Игроков: ${players.length}/${max} • ${me.heroName || hero} • HP ${hp}`; deathEl.classList.toggle("hidden", me.alive !== false); }
function move(dx, dy) { if (ws?.readyState !== WebSocket.OPEN || !me?.alive) return; ws.send(JSON.stringify({ type: "move", x: me.x + dx, y: me.y + dy })); }
function attack() { if (ws?.readyState === WebSocket.OPEN && me?.alive) ws.send(JSON.stringify({ type: "attack" })); }
function useSkill() { if (ws?.readyState === WebSocket.OPEN && me?.alive) ws.send(JSON.stringify({ type: "skill" })); }
const directions = { up:[0,-45], down:[0,45], left:[-45,0], right:[45,0] };
function press(k) { if (pressed.has(k)) return; pressed.add(k); move(...directions[k]); }
function release(k) { pressed.delete(k); }
document.querySelectorAll("[data-key]").forEach(b => { const k=b.dataset.key; b.addEventListener("pointerdown",e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);press(k)}); b.addEventListener("pointerup",()=>release(k)); b.addEventListener("pointercancel",()=>release(k)); });
document.addEventListener("keydown", e => { const map={ArrowUp:"up",w:"up",ArrowDown:"down",s:"down",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"}; if(map[e.key]){e.preventDefault();press(map[e.key]);} if(e.key.toLowerCase()==="q")useSkill(); if(e.key===" "||e.key.toLowerCase()==="e"){e.preventDefault();attack();} });
document.addEventListener("keyup", e => { const map={ArrowUp:"up",w:"up",ArrowDown:"down",s:"down",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"}; if(map[e.key])release(map[e.key]); });
document.getElementById("attack").addEventListener("click",attack); document.getElementById("skill").addEventListener("click",useSkill);
function bar(x,y,w,h,value,max,label) { ctx.fillStyle="#111"; ctx.fillRect(x-w/2,y,w,h); ctx.fillStyle="#45d483"; ctx.fillRect(x-w/2,y,w*Math.max(0,value/max),h); if(label){ctx.fillStyle="#fff";ctx.font="10px monospace";ctx.textAlign="center";ctx.fillText(label,x,y-4);} }
function draw() {
  ctx.clearRect(0,0,1000,900); ctx.fillStyle="#2f633b"; ctx.fillRect(0,0,1000,900);
  for(let i=0;i<9;i++){ctx.fillStyle=i%2?"#315f39":"#3d7547";ctx.fillRect(0,i*100,1000,55);}
  ctx.fillStyle="#23283a";ctx.fillRect(0,0,85,900);ctx.fillRect(915,0,85,900);
  // Three lanes and river/jungle areas
  [180,450,720].forEach(y=>{ctx.fillStyle="#8d815c";ctx.fillRect(85,y-32,830,64);ctx.fillStyle="#b5a77a";ctx.fillRect(85,y-2,830,4);});
  ctx.fillStyle="#315b86";ctx.fillRect(470,0,60,900); ctx.fillStyle="#24486b"; for(let y=20;y<900;y+=45)ctx.fillRect(470,y,60,20);
  // bases
  bases.forEach(b=>{ctx.fillStyle=b.team===1?"#2477b9":"#a83c4c";ctx.fillRect(b.x-32,b.y-55,64,110);ctx.fillStyle="#e7d99c";ctx.fillRect(b.x-18,b.y-42,36,84);bar(b.x,b.y-68,70,6,b.hp,b.maxHp);});
  // towers
  towers.forEach(t=>{if(!t.alive)return;ctx.fillStyle=t.team===1?"#55b9ff":"#ff5b6e";ctx.fillRect(t.x-16,t.laneY-26,32,52);ctx.fillStyle="#e8d79d";ctx.fillRect(t.x-7,t.laneY-35,14,12);bar(t.x,t.laneY-42,52,5,t.hp,t.maxHp);});
  // minions
  minions.forEach(m=>{if(m.hp<=0)return;ctx.fillStyle=m.team===1?"#78c8ff":"#ff7180";ctx.fillRect(m.x-7,m.y-7,14,14);bar(m.x,m.y-13,22,3,m.hp,m.maxHp);});
  // heroes
  players.forEach(p=>{if(!p.alive)return; const mine=p.id===me?.id; ctx.fillStyle=mine?"#ffd34d":p.team===1?"#55b9ff":"#ff5b6e";ctx.beginPath();ctx.arc(p.x,p.y,16,0,Math.PI*2);ctx.fill();ctx.fillStyle="#151923";ctx.font="10px monospace";ctx.textAlign="center";ctx.fillText((p.heroName||p.hero||"").toUpperCase(),p.x,p.y+31);bar(p.x,p.y-28,46,5,p.hp,p.maxHp);ctx.fillText(p.name,p.x,p.y-35);});
  ctx.fillStyle="#ffffff99";ctx.font="12px system-ui";ctx.textAlign="left";ctx.fillText("TOP",95,25);ctx.fillText("MID",95,425);ctx.fillText("BOT",95,695);
}
draw();
