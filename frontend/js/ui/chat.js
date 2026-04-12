/* ================================================================
   ui/chat.js — Chat System (Channels, Messages, Bot Simulation)
   
   BACKEND INTEGRATION:
   - sendChat() should call wsSendChat() after local insert
   - addBotMsg() is already called by websocket.js on CHAT_MSG event
   - Remove the bot simulation interval once real WS is live
================================================================ */
'use strict';

let chatInited = false;

function initChat() {
  if (chatInited) return;
  chatInited = true;

  CHAT_CHANNELS.forEach(ch => { S.chatMessages[ch.id] = []; });
  renderChatRooms();
  switchChatChannel('global');

  // Seed some initial messages
  setTimeout(() => addBotMsg('global',    BOT_NAMES[0], "hey everyone! 👋"), 500);
  setTimeout(() => addBotMsg('global',    BOT_NAMES[1], "who's ready to play?"), 1500);
  setTimeout(() => addBotMsg('gaming',    BOT_NAMES[2], "word bomb is too hard lmao"), 800);

  // Periodic bot messages — REMOVE when real WebSocket is live
  setInterval(() => {
    const ch  = CHAT_CHANNELS[Math.floor(Math.random() * CHAT_CHANNELS.length)].id;
    const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const pool = BOT_MSGS[ch] || BOT_MSGS.global;
    addBotMsg(ch, bot, pool[Math.floor(Math.random() * pool.length)]);
    if (ch !== S.chatChannel) {
      document.getElementById('chat-notif').classList.add('on');
    }
  }, 8000 + Math.random() * 12000);
}

function renderChatRooms() {
  const list = document.getElementById('chat-room-list');
  if (!list) return;
  list.innerHTML = CHAT_CHANNELS.map(ch => `
    <div class="chat-room-item${ch.id === S.chatChannel ? ' active' : ''}"
         onclick="switchChatChannel('${ch.id}')">
      <span class="chat-room-icon">${ch.icon}</span>
      <span>${ch.name}</span>
    </div>
  `).join('');
}

function switchChatChannel(id) {
  S.chatChannel = id;
  const ch = CHAT_CHANNELS.find(c => c.id === id);
  if (!ch) return;

  const icon = document.getElementById('chat-ch-icon');
  const name = document.getElementById('chat-ch-name');
  const sub  = document.getElementById('chat-ch-sub');
  if (icon) icon.textContent = ch.icon;
  if (name) name.textContent = ch.name;
  if (sub)  sub.textContent  = ch.sub;

  renderChatRooms();
  renderChatMsgs();
}

function renderChatMsgs() {
  const msgs = S.chatMessages[S.chatChannel] || [];
  const container = document.getElementById('chat-msgs');
  if (!container) return;

  if (!msgs.length) {
    container.innerHTML = `<div class="msg-system">No messages yet. Say hi! 👋</div>`;
    return;
  }

  container.innerHTML = msgs.map(m => {
    if (m.system) return `<div class="msg-system">${m.text}</div>`;
    const me = m.author === S.name;
    const av = m.author[0].toUpperCase();
    return `
      <div class="msg${me ? ' me' : ''}">
        <div class="msg-av" style="background:${me
          ? 'linear-gradient(135deg,var(--c1),var(--c5))'
          : 'linear-gradient(135deg,#ff3d6b,#c77dff)'}">
          ${av}
        </div>
        <div class="msg-body">
          <div class="msg-name">${m.author}</div>
          <div class="msg-bubble">${m.text}</div>
          <div class="msg-time">${m.time}</div>
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

/**
 * Add a message from another player (or bot).
 * Called by websocket.js on CHAT_MSG event.
 */
function addBotMsg(ch, author, text) {
  const now = new Date();
  const t   = now.getHours().toString().padStart(2, '0') + ':' +
              now.getMinutes().toString().padStart(2, '0');
  (S.chatMessages[ch] = S.chatMessages[ch] || []).push({ author, text, time: t });
  if (ch === S.chatChannel) renderChatMsgs();
}

/**
 * Send a chat message (local + broadcast to server).
 */
function sendChat() {
  const inp = document.getElementById('chat-inp');
  const v   = inp.value.trim();
  if (!v)       { toast('Type a message first!', 'err'); return; }
  if (!S.name)  { toast('Enter your name first!', 'err'); return; }

  const now = new Date();
  const t   = now.getHours().toString().padStart(2, '0') + ':' +
              now.getMinutes().toString().padStart(2, '0');

  (S.chatMessages[S.chatChannel] = S.chatMessages[S.chatChannel] || [])
    .push({ author: S.name, text: v, time: t });

  inp.value = '';
  renderChatMsgs();

  // Broadcast to server (no-op if not connected)
  wsSendChat(S.chatChannel, v);

  // Local bot reply simulation — remove when real WS is live
  if (Math.random() > .6) {
    const pool = BOT_MSGS[S.chatChannel] || BOT_MSGS.global;
    setTimeout(() => addBotMsg(
      S.chatChannel,
      BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
      pool[Math.floor(Math.random() * pool.length)]
    ), 1500 + Math.random() * 3000);
  }
}
