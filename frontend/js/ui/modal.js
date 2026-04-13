/* ================================================================
   ui/modal.js — Modal / Overlay System
   Includes: Quick Match matchmaking, Create Room, Join Room
================================================================ */
'use strict';

/* ── MATCHMAKING STATE ── */
const MM = {
  searching: false,
  pollTimer: null,
  dotTimer:  null,
  attempts:  0,
  MAX_ATTEMPTS: 12,   // ~24 seconds polling
};

function openModal(game) {
  S.game = game;
  const names = {
    reflex:   '🎯 Reflex Arena',
    wordbomb: '💣 Word Bomb',
    pattern:  '🧠 Memory Lock',
    typerace: '⌨️ Type Race',
    quiz:     '📋 Quiz Battle',
  };
  document.getElementById('modal-title').textContent = names[game] || 'Join Game';
  switchTab('quick');
  document.getElementById('modal-room').classList.add('on');
}

function closeModals() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on'));
  stopMatchmaking();
}

/* ── TAB SWITCHER ── */
function switchTab(tab) {
  ['quick', 'create', 'join'].forEach(t => {
    const btn  = document.getElementById('tab-' + t);
    const body = document.getElementById('tab-' + t + '-body');
    if (btn)  btn.classList.toggle('on', t === tab);
    if (body) body.style.display = t === tab ? '' : 'none';
  });
  if (tab !== 'quick') stopMatchmaking();
}

/* ── ROOM TYPE ── */
function setRoomType(type) {
  S.roomType = type;
  const pub = document.getElementById('tp-pub');
  const pvt = document.getElementById('tp-pvt');
  if (!pub || !pvt) return;
  pub.style.background = type === 'public' ? 'rgba(57,255,148,.1)' : '';
  pub.style.color       = type === 'public' ? 'var(--c4)' : '';
  pub.style.border      = type === 'public' ? '1px solid rgba(57,255,148,.3)' : '';
  pvt.className = type === 'private' ? 'btn btn-full btn-cyan' : 'btn btn-full btn-muted';
}

/* ══════════════════════════════════════════
   QUICK MATCH — find / create a public room
══════════════════════════════════════════ */
function startQuickMatch() {
  if (!S.name) { toast('Enter your name first!', 'err'); return; }
  if (!ws.socket || ws.socket.readyState !== WebSocket.OPEN) {
    toast('Not connected to server — please wait…', 'err'); return;
  }

  MM.searching = true;
  MM.attempts  = 0;
  _setMMStatus('searching');
  document.getElementById('mm-cancel-btn').style.display = '';
  document.getElementById('mm-start-btn').style.display  = 'none';

  // Server will find an open room or create one, then respond with ROOM_CREATED or ROOM_JOINED
  ws.send('QUICK_MATCH', { game: S.game });

  // Close modal automatically when server responds (handled in websocket.js)
  // Fallback: if no response in 8s, stop searching
  MM.pollTimer = setTimeout(() => {
    if (MM.searching) {
      stopMatchmaking();
      _setMMStatus('idle');
      toast('Could not connect — try again!', 'err');
    }
  }, 8000);
}

/* QUICK_MATCH is handled by the backend — it finds/creates a room server-side.
   The response comes back as ROOM_CREATED or ROOM_JOINED via websocket.js.
   We just need to show the searching UI and then close the modal on response. */
function _pollForRoom() {
  // Nothing to poll — backend handles it via QUICK_MATCH message.
  // websocket.js will trigger closeModals() indirectly via ROOM_CREATED/ROOM_JOINED.
}

function stopMatchmaking() {
  MM.searching = false;
  clearTimeout(MM.pollTimer);
  clearInterval(MM.dotTimer);
  const startBtn  = document.getElementById('mm-start-btn');
  const cancelBtn = document.getElementById('mm-cancel-btn');
  if (startBtn)  startBtn.style.display  = '';
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function cancelMatchmaking() {
  stopMatchmaking();
  _setMMStatus('idle');
}

function _setMMStatus(state) {
  const el = document.getElementById('mm-status');
  if (!el) return;
  const msgs = {
    idle:     '',
    searching:'🔍 Searching for players',
    found:    '✅ Match found! Joining...',
    creating: '🏠 No room found — creating one for you...',
  };
  el.textContent = msgs[state] || '';

  // Animate dots while searching
  clearInterval(MM.dotTimer);
  if (state === 'searching') {
    let dots = 0;
    MM.dotTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      el.textContent = '🔍 Searching for players' + '.'.repeat(dots);
    }, 500);
  }
}
