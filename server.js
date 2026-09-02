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

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => {
  res.json({ ok: true, game: "Pixel Clash", version: "1.1.0" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const rooms = new Map();

wss.on("connection", (ws) => {
  ws.roomId = null;
  ws.player = null;
  ws.isAlive = true;

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      const mode = msg.mode === "5v5" ? "5v5" : "3v3";
      const maxPlayers = mode === "5v5" ? 10 : 6;
      let room = [...rooms.values()].find(
        (r) => r.mode === mode && r.players.length < r.maxPlayers
      );

      if (!room) {
        const id = Math.random().toString(36).slice(2, 9);
        room = { id, mode, maxPlayers, players: [] };
        rooms.set(id, room);
      }

      const half = room.maxPlayers / 2;
      const player = {
        id: Math.random().toString(36).slice(2, 9),
        name: String(msg.name || "Player").slice(0, 18),
        team: room.players.length < half ? 1 : 2,
        x: room.players.length < half ? 180 : 820,
        y: 450
      };

      room.players.push(player);
      ws.roomId = room.id;
      ws.player = player;
      broadcast(room, { type: "state", mode: room.mode, players: room.players });
      return;
    }

    if (!ws.roomId || !ws.player) return;
    const room = rooms.get(ws.roomId);
    if (!room) return;

    if (msg.type === "move") {
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (Number.isFinite(x)) ws.player.x = Math.max(40, Math.min(960, x));
      if (Number.isFinite(y)) ws.player.y = Math.max(40, Math.min(860, y));
      broadcast(room, { type: "state", mode: room.mode, players: room.players });
    }
  });

  ws.on("close", () => {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== ws.player?.id);
    if (!room.players.length) rooms.delete(room.id);
    else broadcast(room, { type: "state", mode: room.mode, players: room.players });
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

function broadcast(room, data) {
  const text = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === room.id) {
      client.send(text);
    }
  });
}

app.use((_req, res) => res.status(404).send("Not Found"));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Pixel Clash server listening on ${PORT}`);
});
