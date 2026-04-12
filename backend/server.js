/* ================================================================
   server.js — NOOB.gg WebSocket + HTTP Server
   
   Architecture:
   - Express handles health check & REST endpoints (public rooms list)
   - ws handles all real-time game communication
   - Redis (via ioredis) stores room state & chat history
   - Each connected client is tracked in a Map: name → ws socket
================================================================ */
'use strict';

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const Redis      = require('ioredis');

const roomMgr  = require('./roomManager');
const gameMgr  = require('./gameManager');
const chatMgr  = require('./chatManager');

/* ── CONFIG ── */
const PORT         = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

/* ── REDIS ── */
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error',   (e) => console.error('[Redis] Error:', e.message));

/* ── EXPRESS ── */
const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Health check — Railway/Render ping this
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Public rooms list — frontend can show "join a game" lobby
app.get('/rooms', async (req, res) => {
  try {
    const rooms = await roomMgr.getPublicRooms(redis);
    res.json(rooms.map(r => ({
      code:       r.code,
      game:       r.game,
      players:    r.players.length,
      maxPlayers: parseInt(process.env.MAX_PLAYERS_PER_ROOM || '8'),
    })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

/* ── HTTP SERVER ── */
const server = http.createServer(app);

/* ── WEBSOCKET SERVER ── */
const wss = new WebSocketServer({ server });

/*
  clients Map: playerName → WebSocket
  Used to send targeted messages and broadcast to rooms.
*/
const clients = new Map(); // name → ws

/* ── BROADCAST HELPERS ── */

/** Send to one named player */
function sendTo(name, msg) {
  const sock = clients.get(name);
  if (sock && sock.readyState === WebSocket.OPEN) {
    sock.send(JSON.stringify(msg));
  }
}

/** Broadcast to all players in a room */
async function broadcastRoom(code, msg) {
  const room = await roomMgr.getRoom(redis, code);
  if (!room) return;
  for (const p of room.players) sendTo(p.name, msg);
}

/** Broadcast to everyone connected (e.g. global chat) */
function broadcastAll(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(sock => {
    if (sock.readyState === WebSocket.OPEN) sock.send(data);
  });
}

/* ── CONNECTION HANDLER ── */
wss.on('connection', (sock, req) => {
  let playerName = null; // set after AUTH

  console.log('[WS] New connection from', req.socket.remoteAddress);

  sock.on('message', async (raw) => {
    let msg;
    try   { msg = JSON.parse(raw); }
    catch { return sock.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid JSON' } })); }

    const { type, payload = {} } = msg;

    try {
      await handleMessage(sock, type, payload, () => playerName, (n) => { playerName = n; });
    } catch (err) {
      console.error(`[WS] Error handling ${type}:`, err.message);
      sock.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Server error' } }));
    }
  });

  sock.on('close', async () => {
    if (!playerName) return;
    console.log('[WS] Disconnected:', playerName);
    clients.delete(playerName);

    // Remove from room if in one
    const room = await roomMgr.getPlayerRoom(redis, playerName);
    if (room) {
      const result = await roomMgr.leaveRoom(redis, { code: room.code, playerName });
      if (!result.deleted) {
        broadcastRoom(room.code, { type: 'PLAYER_LEFT', payload: { name: playerName } });
        const sysMsg = await chatMgr.systemMessage(redis, `room:${room.code}`, `${playerName} left the room`);
        broadcastRoom(room.code, { type: 'CHAT_MSG', payload: sysMsg });
      }
    }
  });

  sock.on('error', (e) => console.error('[WS] Socket error:', e.message));
});

/* ── MESSAGE ROUTER ── */
async function handleMessage(sock, type, payload, getName, setName) {
  const send = (msg) => sock.send(JSON.stringify(msg));
  const err  = (message) => send({ type: 'ERROR', payload: { message } });

  switch (type) {

    /* ════════════════════════════════
       AUTH — first message after connect
    ════════════════════════════════ */
    case 'AUTH': {
      const name = (payload.name || '').trim().slice(0, 24);
      if (!name)               return err('Name required');
      if (clients.has(name))   return err('Name already taken — choose another');

      setName(name);
      clients.set(name, sock);
      console.log('[WS] Authenticated:', name);

      // Send global chat history on connect
      const history = await chatMgr.getHistory(redis, 'global', 30);
      send({ type: 'AUTH_OK', payload: { name, chatHistory: history } });
      break;
    }

    /* ════════════════════════════════
       ROOM — create / join / leave / ready
    ════════════════════════════════ */
    case 'CREATE_ROOM': {
      const name = getName();
      if (!name) return err('Not authenticated');

      const { game, roomType = 'public' } = payload;
      if (!game) return err('Game type required');

      const room = await roomMgr.createRoom(redis, { hostName: name, game, roomType });
      send({ type: 'ROOM_CREATED', payload: { code: room.code, room } });

      // Send room chat history (empty for new room)
      const history = await chatMgr.getHistory(redis, `room:${room.code}`, 30);
      send({ type: 'CHAT_HISTORY', payload: { channel: `room:${room.code}`, messages: history } });
      break;
    }

    case 'JOIN_ROOM': {
      const name = getName();
      if (!name) return err('Not authenticated');

      const code = (payload.code || '').toUpperCase().trim();
      if (!code) return err('Room code required');

      const result = await roomMgr.joinRoom(redis, { code, playerName: name });
      if (result.error) return err(result.error);

      const { room } = result;

      // Tell the joining player full room state
      send({
        type: 'ROOM_JOINED',
        payload: {
          code,
          room,
          players:  room.players,
          isHost:   false,
          game:     room.game,
        }
      });

      // Send room chat history to the new joiner
      const history = await chatMgr.getHistory(redis, `room:${code}`, 30);
      send({ type: 'CHAT_HISTORY', payload: { channel: `room:${code}`, messages: history } });

      // Tell everyone else someone joined
      broadcastRoom(code, { type: 'PLAYER_JOINED', payload: { player: room.players.find(p => p.name === name) } });

      // System message in room chat
      const sysMsg = await chatMgr.systemMessage(redis, `room:${code}`, `${name} joined the room`);
      broadcastRoom(code, { type: 'CHAT_MSG', payload: sysMsg });
      break;
    }

    case 'LEAVE_ROOM': {
      const name = getName();
      if (!name) return err('Not authenticated');

      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;

      const result = await roomMgr.leaveRoom(redis, { code: room.code, playerName: name });
      send({ type: 'LEFT_ROOM', payload: {} });

      if (!result.deleted) {
        broadcastRoom(room.code, { type: 'PLAYER_LEFT', payload: { name } });
        const sysMsg = await chatMgr.systemMessage(redis, `room:${room.code}`, `${name} left the room`);
        broadcastRoom(room.code, { type: 'CHAT_MSG', payload: sysMsg });
      }
      break;
    }

    case 'PLAYER_READY': {
      const name = getName();
      if (!name) return err('Not authenticated');

      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return err('Not in a room');

      const { ready } = payload;
      await roomMgr.setReady(redis, { code: room.code, playerName: name, ready });
      broadcastRoom(room.code, { type: 'PLAYER_READY', payload: { name, ready } });
      break;
    }

    /* ════════════════════════════════
       GAME — start / scores / finish
    ════════════════════════════════ */
    case 'START_GAME': {
      const name = getName();
      if (!name) return err('Not authenticated');

      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room)             return err('Not in a room');
      if (room.hostName !== name) return err('Only the host can start the game');

      const result = await gameMgr.startGame(redis, broadcastRoom, room.code);
      if (result.error) return err(result.error);
      break;
    }

    case 'REFLEX_SCORE': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      await gameMgr.handleScore(redis, broadcastRoom, room.code, { name, score: payload.ms, game: 'reflex' });
      break;
    }

    case 'TR_PROGRESS': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      await gameMgr.handleScore(redis, broadcastRoom, room.code, { name, score: payload.chars, game: 'typerace' });
      break;
    }

    case 'TR_FINISHED': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      broadcastRoom(room.code, { type: 'TR_FINISHED', payload: { name, wpm: payload.wpm } });
      await gameMgr.checkAllFinished(redis, broadcastRoom, room.code, name);
      break;
    }

    case 'QUIZ_SCORE': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      await gameMgr.handleScore(redis, broadcastRoom, room.code, { name, score: payload.score, game: 'quiz' });
      break;
    }

    case 'QUIZ_FINISHED': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      await gameMgr.checkAllFinished(redis, broadcastRoom, room.code, name);
      break;
    }

    case 'PAT_CLICK': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      await gameMgr.handleScore(redis, broadcastRoom, room.code, { name, score: payload.score, game: 'pattern' });
      break;
    }

    case 'WB_SCORE': {
      const name = getName();
      if (!name) return err('Not authenticated');
      const room = await roomMgr.getPlayerRoom(redis, name);
      if (!room) return;
      await gameMgr.handleScore(redis, broadcastRoom, room.code, { name, score: payload.score, game: 'wordbomb' });
      break;
    }

    /* ════════════════════════════════
       CHAT
    ════════════════════════════════ */
    case 'CHAT_MSG': {
      const name = getName();
      if (!name) return err('Not authenticated');

      const text    = (payload.text || '').trim();
      const channel = payload.channel || 'global';
      if (!text) return;

      // Validate room channel — sender must be in that room
      if (channel.startsWith('room:')) {
        const code = channel.replace('room:', '');
        const room = await roomMgr.getPlayerRoom(redis, name);
        if (!room || room.code !== code) return err('Not in this room');
      }

      const msg = await chatMgr.saveMessage(redis, { channel, author: name, text });

      if (channel === 'global') {
        broadcastAll({ type: 'CHAT_MSG', payload: msg });
      } else {
        const code = channel.replace('room:', '');
        broadcastRoom(code, { type: 'CHAT_MSG', payload: msg });
      }
      break;
    }

    /* ════════════════════════════════
       PING — keep-alive
    ════════════════════════════════ */
    case 'PING': {
      send({ type: 'PONG', payload: { ts: Date.now() } });
      break;
    }

    default:
      console.log('[WS] Unknown message type:', type);
  }
}

/* ── START SERVER ── */
server.listen(PORT, () => {
  console.log(`\n🎮 NOOB.gg backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Rooms:  http://localhost:${PORT}/rooms\n`);
});

/* ── GRACEFUL SHUTDOWN ── */
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down gracefully...');
  server.close(() => {
    redis.quit();
    process.exit(0);
  });
});
