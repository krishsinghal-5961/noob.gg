/* ================================================================
   ui/chat.js — Chat System (Channels, Messages)
================================================================ */
'use strict';

let chatInited = false;

function initChat() {
  if (chatInited) return;
  chatInited = true;

  CHAT_CHANNELS.forEach(ch => { S.chatMessages[ch.id] = []; });
  renderChatRooms();
  switchChatChannel('global');

  // Allow sending with Enter key
  const inp = document.getElementById('chat-inp');
  if (inp) {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
  }
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
 * Add a message from another player.
 * Called by websocket.js on CHAT_MSG event.
 */
function addChatMsg(ch, author, text) {
  // Normalize: strip "room:" prefix so keys match S.chatChannel values
  ch = ch.replace(/^room:/, '');
  const now = new Date();
  const t   = now.getHours().toString().padStart(2, '0') + ':' +
              now.getMinutes().toString().padStart(2, '0');
  (S.chatMessages[ch] = S.chatMessages[ch] || []).push({ author, text, time: t });
  if (ch === S.chatChannel) renderChatMsgs();
  else document.getElementById('chat-notif')?.classList.add('on');
}

/* Keep backward compat alias (websocket.js calls addBotMsg) */
function addBotMsg(ch, author, text) { addChatMsg(ch, author, text); }

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

  // For room channels, send the full "room:{code}" key the server expects.
  // For global sub-channels (gaming, off-topic) and global itself, send as-is.
  const serverChannel = (S.chatChannel !== 'global' &&
                         S.chatChannel !== 'gaming' &&
                         S.chatChannel !== 'off-topic' &&
                         S.code)
    ? `room:${S.chatChannel}`
    : S.chatChannel;

  wsSendChat(serverChannel, v);
}
