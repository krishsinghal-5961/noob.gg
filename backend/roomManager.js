/* ================================================================
   roomManager.js — Room lifecycle backed by Redis
   
   Redis key schema:
     room:{code}          → JSON room object (TTL = ROOM_TTL_SECONDS)
     rooms:public         → Redis Set of public room codes
     player:{name}:room   → which room a player is in (TTL = ROOM_TTL_SECONDS)
================================================================ */
'use strict';

const { v4: uuidv4 } = require('uuid');

const ROOM_TTL   = parseInt(process.env.ROOM_TTL_SECONDS || '1800', 10);
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '8', 10);

/* ── CODE GENERATOR ── */
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ── REDIS HELPERS ── */
async function getRoom(redis, code) {
  const raw = await redis.get(`room:${code}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveRoom(redis, room) {
  await redis.set(`room:${room.code}`, JSON.stringify(room), 'EX', ROOM_TTL);
  // Refresh player→room mapping for all players
  for (const p of room.players) {
    await redis.set(`player:${p.name}:room`, room.code, 'EX', ROOM_TTL);
  }
}

async function deleteRoom(redis, code) {
  const room = await getRoom(redis, code);
  if (!room) return;
  await redis.del(`room:${code}`);
  await redis.srem('rooms:public', code);
  for (const p of room.players) {
    await redis.del(`player:${p.name}:room`);
  }
}

/* ── CREATE ── */
async function createRoom(redis, { hostName, game, roomType }) {
  // Make sure code is unique
  let code;
  do { code = genCode(); } while (await redis.exists(`room:${code}`));

  const room = {
    code,
    game,           // 'reflex' | 'wordbomb' | 'pattern' | 'typerace' | 'quiz'
    roomType,       // 'public' | 'private'
    hostName,
    status: 'waiting',   // 'waiting' | 'playing' | 'finished'
    createdAt: Date.now(),
    players: [
      {
        name:    hostName,
        color:   _pickColor(0),
        isHost:  true,
        ready:   false,
        score:   0,
      }
    ],
  };

  await saveRoom(redis, room);
  if (roomType === 'public') await redis.sadd('rooms:public', code);

  return room;
}

/* ── JOIN ── */
async function joinRoom(redis, { code, playerName }) {
  const room = await getRoom(redis, code);

  if (!room)                                return { error: 'Room not found' };
  if (room.status !== 'waiting')            return { error: 'Game already started' };
  if (room.players.length >= MAX_PLAYERS)   return { error: 'Room is full' };
  if (room.players.find(p => p.name === playerName)) return { error: 'Name already taken in this room' };

  room.players.push({
    name:   playerName,
    color:  _pickColor(room.players.length),
    isHost: false,
    ready:  false,
    score:  0,
  });

  await saveRoom(redis, room);
  return { room };
}

/* ── LEAVE ── */
async function leaveRoom(redis, { code, playerName }) {
  const room = await getRoom(redis, code);
  if (!room) return { deleted: true };

  room.players = room.players.filter(p => p.name !== playerName);
  await redis.del(`player:${playerName}:room`);

  if (room.players.length === 0) {
    await deleteRoom(redis, code);
    return { deleted: true };
  }

  // Pass host to next player if host left
  if (!room.players.find(p => p.isHost)) {
    room.players[0].isHost = true;
    room.hostName = room.players[0].name;
  }

  await saveRoom(redis, room);
  return { room };
}

/* ── SET READY ── */
async function setReady(redis, { code, playerName, ready }) {
  const room = await getRoom(redis, code);
  if (!room) return null;

  const player = room.players.find(p => p.name === playerName);
  if (player) player.ready = ready;

  await saveRoom(redis, room);
  return room;
}

/* ── GET PUBLIC ROOMS ── */
async function getPublicRooms(redis) {
  const codes = await redis.smembers('rooms:public');
  const rooms = [];
  for (const code of codes) {
    const room = await getRoom(redis, code);
    if (room && room.status === 'waiting') rooms.push(room);
    else await redis.srem('rooms:public', code); // prune stale
  }
  return rooms;
}

/* ── FIND PLAYER'S CURRENT ROOM ── */
async function getPlayerRoom(redis, playerName) {
  const code = await redis.get(`player:${playerName}:room`);
  if (!code) return null;
  return getRoom(redis, code);
}

/* ── UPDATE ROOM STATUS ── */
async function setRoomStatus(redis, code, status) {
  const room = await getRoom(redis, code);
  if (!room) return null;
  room.status = status;
  if (status === 'finished') await redis.srem('rooms:public', code);
  await saveRoom(redis, room);
  return room;
}

/* ── UPDATE SCORES ── */
async function updateScore(redis, code, playerName, score) {
  const room = await getRoom(redis, code);
  if (!room) return null;
  const player = room.players.find(p => p.name === playerName);
  if (player) player.score = score;
  await saveRoom(redis, room);
  return room;
}

/* ── COLOR PICKER ── */
function _pickColor(index) {
  const colors = ['#00e5ff','#ff3d6b','#ffe033','#39ff94','#c77dff','#ff8c42','#ff6b9d','#4cc9f0'];
  return colors[index % colors.length];
}

module.exports = {
  createRoom, joinRoom, leaveRoom, setReady,
  getPublicRooms, getPlayerRoom, setRoomStatus,
  updateScore, getRoom, saveRoom, deleteRoom,
};
