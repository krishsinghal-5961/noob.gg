/* ================================================================
   gameManager.js — Game lifecycle & score synchronisation
   
   Handles:
   - Starting a game (validates all ready, sets room status)
   - Receiving & broadcasting per-game score events
   - Detecting game-over conditions and finalising results
================================================================ */
'use strict';

const { setRoomStatus, updateScore, getRoom, saveRoom } = require('./roomManager');

/* ── HOW LONG EACH GAME RUNS (ms) ── */
const GAME_DURATIONS = {
  reflex:   60_000,   // 60s — multiple rounds
  wordbomb: 90_000,   // 90s
  pattern:  120_000,  // 2 min — up to 12 rounds
  typerace: 180_000,  // 3 min
  quiz:     200_000,  // 10 questions × ~20s
};

/* ── START GAME ── */
async function startGame(redis, broadcast, code) {
  const room = await getRoom(redis, code);
  if (!room)                    return { error: 'Room not found' };
  if (room.status !== 'waiting') return { error: 'Game already started' };

  const notReady = room.players.filter(p => !p.isHost && !p.ready);
  if (notReady.length > 0) {
    return { error: `${notReady.map(p => p.name).join(', ')} not ready yet` };
  }

  // Reset scores
  room.players.forEach(p => { p.score = 0; });
  room.status    = 'playing';
  room.startedAt = Date.now();
  await saveRoom(redis, room);

  // Broadcast game start to everyone in the room
  broadcast(code, { type: 'GAME_START', payload: { game: room.game } });

  // Auto-end game after max duration (safety net)
  const duration = GAME_DURATIONS[room.game] || 120_000;
  setTimeout(() => endGame(redis, broadcast, code), duration);

  return { room };
}

/* ── HANDLE SCORE UPDATE ── */
async function handleScore(redis, broadcast, code, { name, score, game }) {
  const room = await updateScore(redis, code, name, score);
  if (!room) return;

  // Broadcast updated score to everyone in the room
  const payload = { name, score };
  switch (game) {
    case 'reflex':   broadcast(code, { type: 'REFLEX_SCORE',  payload: { ...payload, ms: score } }); break;
    case 'typerace': broadcast(code, { type: 'TR_PROGRESS',   payload: { name, chars: score } });     break;
    case 'quiz':     broadcast(code, { type: 'QUIZ_SCORE',    payload }); break;
    case 'pattern':  broadcast(code, { type: 'PAT_SCORE',     payload }); break;
    case 'wordbomb': broadcast(code, { type: 'WB_SCORE',      payload }); break;
  }
}

/* ── END GAME ── */
async function endGame(redis, broadcast, code) {
  const room = await getRoom(redis, code);
  if (!room || room.status !== 'playing') return;

  await setRoomStatus(redis, code, 'finished');

  // Sort players by score descending
  const results = [...room.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, color: p.color }));

  broadcast(code, { type: 'GAME_OVER', payload: { results, game: room.game } });
}

/* ── CHECK IF ALL PLAYERS FINISHED (for type race / quiz) ── */
async function checkAllFinished(redis, broadcast, code, finishedName) {
  const room = await getRoom(redis, code);
  if (!room) return;

  if (!room.finished) room.finished = [];
  if (!room.finished.includes(finishedName)) room.finished.push(finishedName);
  await saveRoom(redis, room);

  if (room.finished.length >= room.players.length) {
    await endGame(redis, broadcast, code);
  }
}

module.exports = { startGame, handleScore, endGame, checkAllFinished };
