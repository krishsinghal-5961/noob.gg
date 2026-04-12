/* ================================================================
   chatManager.js — Chat with history stored in Redis
   
   Redis key schema:
     chat:{channel}   → Redis List of last 50 messages (JSON)
   
   Channels:
     global           — everyone on the site
     room:{code}      — room-specific chat
================================================================ */
'use strict';

const MAX_HISTORY = 50;

/* ── SAVE & RETURN MESSAGE ── */
async function saveMessage(redis, { channel, author, text }) {
  const msg = {
    id:      Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    channel,
    author,
    text:    text.slice(0, 300), // cap message length
    time:    Date.now(),
  };

  const key = `chat:${channel}`;
  await redis.lpush(key, JSON.stringify(msg));
  await redis.ltrim(key, 0, MAX_HISTORY - 1); // keep last 50
  await redis.expire(key, 86400);             // 24h TTL on chat history

  return msg;
}

/* ── GET HISTORY ── */
async function getHistory(redis, channel, limit = 50) {
  const key  = `chat:${channel}`;
  const raw  = await redis.lrange(key, 0, limit - 1);
  // lrange returns newest-first (lpush), reverse for chronological order
  return raw.map(r => JSON.parse(r)).reverse();
}

/* ── SYSTEM MESSAGE (server-generated) ── */
async function systemMessage(redis, channel, text) {
  return saveMessage(redis, { channel, author: 'SYSTEM', text });
}

module.exports = { saveMessage, getHistory, systemMessage };
