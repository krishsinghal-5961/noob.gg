/* ================================================================
   ui/room.js — Room Creation, Joining, Player List
   
   BACKEND INTEGRATION: Replace createRoom() / joinRoom() to call
   ws.send('CREATE_ROOM', ...) and ws.send('JOIN_ROOM', ...).
   The server responds with ROOM_CREATED / ROOM_JOINED events
   (handled in websocket.js).
================================================================ */
'use strict';

function createRoom() {
  if (!S.name) { toast('Enter your name first!', 'err'); return; }
  closeModals();

  // Generate a local room code (server will override this in real multiplayer)
  S.code = Math.random().toString(36).substring(2, 8).toUpperCase();
  S.isHost = true;

  // Simulate bot players joining
  const botCount = 1 + Math.floor(Math.random() * 3);
  S.players = [
    { name: S.name, color: BOT_COLS[0], isMe: true, ready: false }
  ];
  BOT_NAMES.slice(0, botCount).forEach((n, i) => {
    S.players.push({ name: n, color: BOT_COLS[i + 1], isMe: false, ready: true });
  });

  // In multiplayer, send this instead:
  // ws.send('CREATE_ROOM', { game: S.game, type: S.roomType, name: S.name });

  showPage('pg-room');
  renderRoom();
  toast('Room created! Code: ' + S.code, 'ok');
}

function joinRoom() {
  const code = document.getElementById('join-code-inp').value.trim().toUpperCase();
  if (!code || code.length !== 6) { toast('Enter a valid 6-letter code!', 'err'); return; }
  if (!S.name) { toast('Enter your name first!', 'err'); return; }
  closeModals();

  S.code = code;
  S.isHost = false;
  S.players = [
    { name: BOT_NAMES[0], color: BOT_COLS[0], isMe: false, ready: true },
    { name: S.name,       color: BOT_COLS[1], isMe: true,  ready: false },
  ];

  // In multiplayer, send this instead:
  // ws.send('JOIN_ROOM', { code, name: S.name });

  showPage('pg-room');
  renderRoom();
  toast('Joined room ' + code + '!', 'ok');
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
        <span style="flex:1;font-weight:600">${p.name}${p.isMe ? ' <span style="font-size:.7rem;color:var(--muted)">(You)</span>' : ''}</span>
        ${p.isMe && S.isHost ? '<span class="badge b-host">HOST</span>' : ''}
        ${p.isMe && !S.isHost ? '<span class="badge b-wait" id="my-ready-badge">Not Ready</span>' : ''}
        ${!p.isMe ? `<span class="badge ${p.ready ? 'b-ready' : 'b-wait'}">${p.ready ? 'Ready ✓' : 'Waiting...'}</span>` : ''}
      </div>
    `).join('');
  }

  // Show host controls or guest wait
  const hostControls = document.getElementById('host-controls');
  const guestWait    = document.getElementById('guest-wait');
  if (hostControls) hostControls.style.display = S.isHost ? 'block' : 'none';
  if (guestWait)    guestWait.style.display    = S.isHost ? 'none'  : 'flex';
}

function toggleReady() {
  const me = S.players.find(p => p.isMe);
  if (!me) return;
  me.ready = !me.ready;
  const btn   = document.getElementById('ready-btn');
  const badge = document.getElementById('my-ready-badge');
  if (btn)   btn.textContent   = me.ready ? '✅ Ready' : '⏳ Not Ready';
  if (badge) badge.textContent = me.ready ? 'Ready ✓'  : 'Not Ready';

  // In multiplayer: ws.send('PLAYER_READY', { ready: me.ready });
}

function copyRoomCode() {
  navigator.clipboard.writeText(S.code)
    .then(() => toast('Code copied! 📋', 'ok'))
    .catch(() => toast('Code: ' + S.code, 'info'));
}

function leaveRoom() {
  resetGames();
  // ws.send('LEAVE_ROOM', { code: S.code });
  showPage('pg-lobby');
  showBottomNav();
}

function startGame() {
  if (!S.game) return;
  // ws.send('START_GAME', { game: S.game });
  _launchGame(S.game);
}

/** Called either from host button OR by WS GAME_START event */
function _launchGame(game) {
  if (game === 'quiz')     { showPage('pg-quiz-setup'); }
  else if (game === 'reflex')   startReflex();
  else if (game === 'wordbomb') startWordBomb();
  else if (game === 'pattern')  startPattern();
  else if (game === 'typerace') startTypeRace();
}
