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

  // Attempt WebSocket connection
  ws.connect(WS_URL);   // ← Uncomment when backend is ready
  ws.send('AUTH', { name: v });
}

function _initPlayerData() {
  S.myStats = {
    reflex:      Math.round(200 + Math.random() * 200),
    wordbomb:    Math.floor(5   + Math.random() * 10),
    pattern:     Math.floor(3   + Math.random() * 7),
    typerace:    Math.floor(60  + Math.random() * 60),
    quiz:        Math.floor(1000 + Math.random() * 4000),
    gamesPlayed: Math.floor(10  + Math.random() * 50),
    wins:        Math.floor(3   + Math.random() * 20),
  };

  S.friends = BOT_NAMES.slice(0, 4).map((n, i) => ({
    name:   n,
    online: Math.random() > .4,
    stats: {
      reflex:      Math.round(200 + Math.random() * 300),
      typerace:    Math.floor(50  + Math.random() * 80),
      quiz:        Math.floor(1000 + Math.random() * 5000),
      wins:        Math.floor(2   + Math.random() * 25),
      gamesPlayed: Math.floor(8   + Math.random() * 50),
    }
  }));

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
console.log('%cTo connect backend: uncomment ws.connect(WS_URL) in main.js and wire up your server.', 'color:#4e566e;font-family:monospace;font-size:11px');
