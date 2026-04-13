/* ================================================================
   main.js — App Initialisation & Global Event Handlers
   This is the entry point. All modules are already loaded above.
================================================================ */
'use strict';

/* ── LANDING / ENTRY ── */

function enterLobby() {
  const v = document.getElementById('name-inp').value.trim();
  if (!v) { toast('Enter your gamer tag!', 'err'); return; }

  // Blur to dismiss mobile keyboard / iOS autocomplete
  const inp = document.getElementById('name-inp');
  inp.blur();
  document.getElementById('pg-landing').style.display = 'none';

  S.name = v;
  document.getElementById('nav-uname').textContent     = v;
  document.getElementById('nav-av').textContent         = v[0].toUpperCase();

  _initPlayerData();
  renderLB();
  showPage('pg-lobby');

  document.getElementById('app').classList.remove('pre-login');

  navTo('lobby');
  toast('Welcome, ' + v + '! 🎮', 'ok');

  // Connect to WebSocket server and authenticate
  ws.connect(WS_URL);
}

function _initPlayerData() {
  S.myStats = {
    reflex:      0,
    wordbomb:    0,
    pattern:     0,
    typerace:    0,
    quiz:        0,
    draw:        0,
    gamesPlayed: 0,
    wins:        0,
  };

  S.friends = [];
  renderFriendsList();
}

/* ── CLEANUP (called before switching game) ── */
function resetGames() {
  clearInterval(QZ.timer);
  clearTimeout(RF.showTid);
  clearTimeout(RF.penTid);
  RF.canClick = false;
  clearInterval(WB.timer);
  WB.done = true;
  clearInterval(TR.interval);
  S.players.forEach(p => { p._trDone = false; });
  // Draw & Guess cleanup
  if (typeof DG !== 'undefined') {
    clearInterval(DG.roundTimer);
    DG.phase = 'idle';
    DG.isDrawing = false;
  }
}

function goLobby() {
  resetGames();
  showPage('pg-lobby');
  showBottomNav();
  renderLB();
}

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const landing = document.getElementById('pg-landing');
    if (landing && landing.classList.contains('on')) enterLobby();
  }
  if (e.key === 'Escape') closeModals();
});

/* ── INPUT NORMALIZATION ── */
document.addEventListener('input', e => {
  if (e.target.id === 'join-code-inp') {
    e.target.value = e.target.value.toUpperCase();
  }
});

/* ── CHAT ENTER KEY ── */
const chatInpEl = document.getElementById('chat-inp');
if (chatInpEl) chatInpEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

/* ── INITIAL STATE ── */
// Hide sidebar & bottom nav until user enters name via CSS class
document.getElementById('app').classList.add('pre-login');

console.log(`%c🎮 ${APP_NAME} v${APP_VERSION} ready`, 'color:#00e5ff;font-family:monospace;font-weight:bold;font-size:14px');
