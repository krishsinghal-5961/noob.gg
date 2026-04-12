/* ================================================================
   ui/room.js — Room Creation, Joining, Player List
   Fully wired to backend via WebSocket.
================================================================ */
'use strict';

function createRoom() {
  if (!S.name) { toast('Enter your name first!', 'err'); return; }
  if (!ws.connected) { toast('Not connected to server!', 'err'); return; }
  closeModals();
  ws.send('CREATE_ROOM', { game: S.game, roomType: S.roomType || 'public' });
  // Server responds with ROOM_CREATED → handled in websocket.js
}

function joinRoom() {
  const code = document.getElementById('join-code-inp').value.trim().toUpperCase();
  if (!code || code.length !== 6) { toast('Enter a valid 6-letter code!', 'err'); return; }
  if (!S.name) { toast('Enter your name first!', 'err'); return; }
  if (!ws.connected) { toast('Not connected to server!', 'err'); return; }
  closeModals();
  ws.send('JOIN_ROOM', { code });
  // Server responds with ROOM_JOINED → handled in websocket.js
}

function renderRoom() {
  const gameNames = {
    reflex:   '🎯 Reflex Arena',
    wordbomb: '💣 Word Bomb',
    pattern:  '🧠 Memory Lock',
    typerace: '⌨️ Type Race',
    quiz:     '📋 Quiz Battle',
  };
  const titleEl = document.getElementById('room-game-title');
  if (titleEl) titleEl.textContent = gameNames[S.game] || 'Game Room';

  const codeEl = document.getElementById('room-code-display');
  if (codeEl) codeEl.textContent = S.code;

  const list = document.getElementById('players-list');
  if (list) {
    list.innerHTML = S.players.map(p => `
      <div class="p-row">
        <div class="p-av" style="border-color:${p.color};background:${p.color}22;color:${p.color}">
          ${p.name[0].toUpperCase()}
        </div>
        <span style="flex:1;font-weight:600">${p.name}${p.name === S.name ? ' <span style="font-size:.7rem;color:var(--muted)">(You)</span>' : ''}</span>
        ${p.isHost ? '<span class="badge b-host">HOST</span>' : ''}
        ${!p.isHost && p.name === S.name
          ? `<span class="badge b-wait" id="my-ready-badge">${p.ready ? 'Ready ✓' : 'Not Ready'}</span>`
          : ''}
        ${p.name !== S.name
          ? `<span class="badge ${p.ready ? 'b-ready' : 'b-wait'}">${p.ready ? 'Ready ✓' : 'Waiting...'}</span>`
          : ''}
      </div>
    `).join('');
  }

  const hostControls = document.getElementById('host-controls');
  const guestWait    = document.getElementById('guest-wait');
  if (hostControls) hostControls.style.display = S.isHost ? 'block' : 'none';
  if (guestWait)    guestWait.style.display    = S.isHost ? 'none'  : 'flex';
}

function toggleReady() {
  const me = S.players.find(p => p.name === S.name);
  if (!me) return;
  me.ready = !me.ready;
  const btn   = document.getElementById('ready-btn');
  const badge = document.getElementById('my-ready-badge');
  if (btn)   btn.textContent   = me.ready ? '✅ Ready' : '⏳ Not Ready';
  if (badge) badge.textContent = me.ready ? 'Ready ✓'  : 'Not Ready';
  ws.send('PLAYER_READY', { ready: me.ready });
}

function copyRoomCode() {
  navigator.clipboard.writeText(S.code)
    .then(() => toast('Code copied! 📋', 'ok'))
    .catch(() => toast('Code: ' + S.code, 'info'));
}

function leaveRoom() {
  resetGames();
  ws.send('LEAVE_ROOM', {});
  showPage('pg-lobby');
  showBottomNav();
}

function startGame() {
  if (!S.game) return;
  ws.send('START_GAME', {});
  // Server broadcasts GAME_START to all players in room → _launchGame() called via websocket.js
}

/** Called by WS GAME_START event in websocket.js */
function _launchGame(game) {
  if (game === 'quiz')          showPage('pg-quiz-setup');
  else if (game === 'reflex')   startReflex();
  else if (game === 'wordbomb') startWordBomb();
  else if (game === 'pattern')  startPattern();
  else if (game === 'typerace') startTypeRace();
}
