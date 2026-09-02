const menu = document.getElementById("menu");
const game = document.getElementById("game");
const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const modeLabel = document.getElementById("modeLabel");
const tg = window.Telegram?.WebApp;

let mode = "3v3";
let ws = null;
let me = null;
let players = [];
let reconnectTimer = null;
const pressed = new Set();

if (tg) {
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
  document.getElementById("coins").textContent = "1000";
}

function playerName() {
  const user = tg?.initDataUnsafe?.user;
  if (!user) return "Player";
  return (user.first_name || user.username || "Player").slice(0, 18);
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll(".mode").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.getElementById("play").addEventListener("click", () => {
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  modeLabel.textContent = mode === "5v5" ? "5 × 5" : "3 × 3";
  connect();
});

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  statusEl.textContent = "Подключение...";
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    statusEl.textContent = "Поиск игроков...";
    ws.send(JSON.stringify({ type: "join", mode, name: playerName() }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== "state") return;
      players = Array.isArray(message.players) ? message.players : [];
      if (me) me = players.find((p) => p.id === me.id) || null;
      if (!me) me = players[players.length - 1] || null;
      statusEl.textContent = `Игроков: ${players.length}/${mode === "5v5" ? 10 : 6}`;
      draw();
    } catch {
      statusEl.textContent = "Ошибка данных";
    }
  };

  ws.onerror = () => {
    statusEl.textContent = "Ошибка соединения";
  };

  ws.onclose = () => {
    ws = null;
    if (!game.classList.contains("hidden")) {
      statusEl.textContent = "Переподключение...";
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 1500);
    }
  };
}

function move(dx, dy) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !me) return;
  ws.send(JSON.stringify({ type: "move", x: me.x + dx, y: me.y + dy }));
}

const directions = {
  up: [0, -45], down: [0, 45], left: [-45, 0], right: [45, 0]
};

function press(key) {
  if (pressed.has(key)) return;
  pressed.add(key);
  move(...directions[key]);
}

function release(key) {
  pressed.delete(key);
}

document.querySelectorAll("[data-key]").forEach((button) => {
  const key = button.dataset.key;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    press(key);
  });
  button.addEventListener("pointerup", () => release(key));
  button.addEventListener("pointercancel", () => release(key));
});

document.addEventListener("keydown", (event) => {
  const map = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
  const key = map[event.key];
  if (key) {
    event.preventDefault();
    press(key);
  }
  if (event.key.toLowerCase() === "q") useSkill();
});

document.addEventListener("keyup", (event) => {
  const map = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
  if (map[event.key]) release(map[event.key]);
});

function useSkill() {
  statusEl.textContent = "⚡ Способность активирована!";
  setTimeout(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      statusEl.textContent = `Игроков: ${players.length}/${mode === "5v5" ? 10 : 6}`;
    }
  }, 900);
}

document.getElementById("skill").addEventListener("click", useSkill);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#315d3a";
  ctx.fillRect(0, 0, 1000, 900);
  ctx.fillStyle = "#3f7547";
  for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 125, 1000, 70);
  ctx.fillStyle = "#8d815c";
  ctx.fillRect(0, 410, 1000, 80);
  ctx.fillStyle = "#23283a";
  ctx.fillRect(0, 0, 70, 900);
  ctx.fillRect(930, 0, 70, 900);
  ctx.fillStyle = "#d8c99a";
  ctx.fillRect(35, 380, 55, 140);
  ctx.fillRect(910, 380, 55, 140);

  players.forEach((player) => {
    ctx.fillStyle = player.id === me?.id ? "#ffd34d" : player.team === 1 ? "#55b9ff" : "#ff5b6e";
    ctx.fillRect(player.x - 14, player.y - 14, 28, 28);
    ctx.fillStyle = "#111";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(player.name, player.x, player.y - 20);
  });
}

draw();
