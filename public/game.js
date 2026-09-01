const menu = document.getElementById("menu");
const game = document.getElementById("game");
const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const modeLabel = document.getElementById("modeLabel");

let mode = "3v3";
let ws = null;
let me = null;
let players = [];

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
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    statusEl.textContent = "Поиск игроков...";
    ws.send(JSON.stringify({ type: "join", mode, name: "Player" }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== "state") return;
      players = message.players || [];
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
    statusEl.textContent = "Соединение потеряно";
  };
}

function move(dx, dy) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !me) return;
  ws.send(JSON.stringify({ type: "move", x: me.x + dx, y: me.y + dy }));
}

document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => {
    const directions = {
      up: [0, -45],
      down: [0, 45],
      left: [-45, 0],
      right: [45, 0]
    };
    move(...directions[button.dataset.key]);
  });
});

document.getElementById("skill").addEventListener("click", () => {
  statusEl.textContent = "Способность активирована!";
  setTimeout(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      statusEl.textContent = `Игроков: ${players.length}/${mode === "5v5" ? 10 : 6}`;
    }
  }, 900);
});

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
