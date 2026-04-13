/* ================================================================
   games/wordbomb.js — Word Bomb Game Logic
================================================================ */
'use strict';

const WB = {
  rnd: 0, cur: 0, tLeft: 0, total: 0,
  timer: null, players: [], syl: '',
  used: new Set(), done: false,
  dictCache: new Map()   // word (lowercase) → true | false
};

/**
 * Quick synchronous checks before hitting the network.
 * Returns { ok: false, reason } if the word fails a local rule,
 * or null to mean "needs dictionary lookup".
 */
function quickCheck(word, syl) {
  const w = word.toUpperCase();
  const s = syl.toUpperCase();
  if (!/^[A-Z]+$/.test(w))  return { ok: false, reason: 'Letters only!' };
  if (w.length < 3)          return { ok: false, reason: 'Too short (min 3 letters)' };
  if (!w.includes(s))        return { ok: false, reason: `Must contain "${s}"` };
  return null; // passed local checks — needs real dictionary validation
}

/**
 * Looks up a word against the free DictionaryAPI.dev.
 * Results are cached in WB.dictCache so repeat lookups are instant.
 * Returns true if the word is real, false if not found / gibberish.
 */
async function lookupWord(word) {
  const key = word.toLowerCase();
  if (WB.dictCache.has(key)) return WB.dictCache.get(key);
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
    const valid = res.ok; // 200 = real word, 404 = not found
    WB.dictCache.set(key, valid);
    return valid;
  } catch {
    // Network error — fail open so a connection hiccup doesn't kill the game
    WB.dictCache.set(key, true);
    return true;
  }
}

function startWordBomb() {
  showPage('pg-wordbomb');
  WB.rnd     = 1;
  WB.cur     = 0;
  WB.used    = new Set();
  WB.done    = false;
  WB.players = S.players.map(p => ({ name: p.name, lives: 3, alive: true, isMe: p.name === S.name }));

  const inp   = document.getElementById('wb-inp');
  inp.onkeydown = e => { if (e.key === 'Enter') submitWBWord(); };

  renderWBPlayers();
  newWBSyl();
  startWBTurn();
}

function renderWBPlayers() {
  const container = document.getElementById('wb-players');
  if (!container) return;
  container.innerHTML = WB.players.map((p, i) => `
    <div class="wb-pcard${!p.alive ? ' dead' : WB.cur === i ? ' myturn' : ''}">
      <div class="wb-pname">${p.name}${p.isMe ? ' ★' : ''}</div>
      <div class="wb-hearts">${'❤️'.repeat(p.lives)}${'🖤'.repeat(3 - p.lives)}</div>
    </div>
  `).join('');
}

function newWBSyl() {
  const keys = Object.keys(SYLLABLE_VALID_WORDS);
  WB.syl     = keys[Math.floor(Math.random() * keys.length)];
  const el   = document.getElementById('wb-syl');
  if (el) el.textContent = WB.syl;
}

function startWBTurn() {
  if (WB.done) return;
  WB.rnd++;
  document.getElementById('wb-rnd').textContent = WB.rnd;

  const p    = WB.players[WB.cur];
  if (!p)    return;
  const isMe = p.isMe;
  const inp  = document.getElementById('wb-inp');
  inp.value         = '';
  inp.style.display = isMe ? 'block' : 'none';

  setWBFeedback(isMe ? `Your turn! Contains "${WB.syl}"` : p.name + ' is typing...', '');

  // My turn: full 12 seconds. Other real players: show waiting state, no fake timer
  WB.total  = 12;
  WB.tLeft  = WB.total;

  clearInterval(WB.timer);
  const bomb = document.getElementById('wb-bomb');

  if (isMe) {
    WB.timer = setInterval(() => {
      WB.tLeft -= 0.1;
      const pct  = Math.max(0, WB.tLeft / WB.total * 100);
      const tbar = document.getElementById('wb-tbar');
      if (tbar) tbar.style.width = pct + '%';
      if (bomb) bomb.className = 'wb-bomb ' + (WB.tLeft > WB.total * .6 ? 'slow' : WB.tLeft > WB.total * .25 ? 'med' : 'fast');
      if (WB.tLeft <= 0) {
        clearInterval(WB.timer);
        bombExplodes();
      }
    }, 100);
    setTimeout(() => inp.focus(), 100);
  }
  // For other players, their answer comes via WS WB_WORD event from server

  renderWBPlayers();
}

function setWBFeedback(msg, type) {
  const el = document.getElementById('wb-fb');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'wb-feedback ' + (type || '');
}

async function submitWBWord() {
  const inp  = document.getElementById('wb-inp');
  const word = inp.value.trim().toUpperCase();
  if (!word) return;

  if (WB.used.has(word)) {
    setWBFeedback(`"${word}" already used!`, 'err');
    flashWBInp('bad');
    return;
  }

  // Step 1 — instant local checks (no network)
  const local = quickCheck(word, WB.syl);
  if (local && !local.ok) {
    setWBFeedback(local.reason, 'err');
    flashWBInp('bad');
    inp.value = '';
    return;
  }

  // Step 2 — real dictionary lookup (pause timer so network lag doesn't cost the player)
  setWBFeedback('Checking…', '');
  inp.disabled = true;
  clearInterval(WB.timer);
  const isReal = await lookupWord(word);
  inp.disabled = false;

  if (!isReal) {
    setWBFeedback(`"${word}" isn't a real word!`, 'err');
    flashWBInp('bad');
    inp.value = '';
    inp.focus();
    // Resume the timer so the turn keeps ticking
    WB.timer = setInterval(() => {
      WB.tLeft -= 0.1;
      const pct  = Math.max(0, WB.tLeft / WB.total * 100);
      const tbar = document.getElementById('wb-tbar');
      if (tbar) tbar.style.width = pct + '%';
      const bomb = document.getElementById('wb-bomb');
      if (bomb) bomb.className = 'wb-bomb ' + (WB.tLeft > WB.total * .6 ? 'slow' : WB.tLeft > WB.total * .25 ? 'med' : 'fast');
      if (WB.tLeft <= 0) { clearInterval(WB.timer); bombExplodes(); }
    }, 100);
    return;
  }

  clearInterval(WB.timer);
  WB.used.add(word);
  setWBFeedback(`"${word}" ✓ Nice!`, 'ok');
  flashWBInp('ok');
  inp.value = '';

  ws.send('WB_WORD', { word, syl: WB.syl });
  newWBSyl();
  passWBBomb();
}

function flashWBInp(type) {
  const inp = document.getElementById('wb-inp');
  inp.className = 'wb-inp ' + type;
  setTimeout(() => inp.className = 'wb-inp', 400);
}

function bombExplodes() {
  clearInterval(WB.timer);
  const p    = WB.players[WB.cur];
  const bomb = document.getElementById('wb-bomb');
  if (bomb) bomb.textContent = '💥';

  toast('💥 ' + p.name + ' exploded! -1 ❤️', 'err');
  p.lives--;
  if (p.lives <= 0) { p.alive = false; toast(p.name + ' is eliminated! 💀', 'warn'); }

  renderWBPlayers();
  const alive = WB.players.filter(x => x.alive);
  if (alive.length <= 1) { setTimeout(endWordBomb, 900); return; }

  setTimeout(() => {
    if (bomb) bomb.textContent = '💣';
    newWBSyl();
    passWBBomb();
  }, 1100);
}

function passWBBomb() {
  if (WB.done) return;
  setTimeout(() => {
    let nxt   = (WB.cur + 1) % WB.players.length;
    let tries = 0;
    while (!WB.players[nxt].alive && tries++ < WB.players.length) {
      nxt = (nxt + 1) % WB.players.length;
    }
    WB.cur = nxt;
    // Broadcast the new turn so all other clients sync — include lives so hearts stay correct
    const lives = WB.players.map(p => ({ name: p.name, lives: p.lives, alive: p.alive }));
    ws.send('WB_TURN', { cur: WB.cur, syl: WB.syl, lives });
    startWBTurn();
  }, 600);
}

/**
 * Called by websocket.js when a WB_TURN event arrives from the server.
 * Updates this client's turn state to match the sender's.
 */
function wbOnTurn(cur, syl, lives) {
  if (WB.done) return;
  WB.cur = cur;
  if (syl) {
    WB.syl = syl;
    const el = document.getElementById('wb-syl');
    if (el) el.textContent = WB.syl;
  }
  // Sync lives/alive state so hearts and eliminations display correctly
  if (lives && Array.isArray(lives)) {
    lives.forEach(({ name, lives: l, alive }) => {
      const p = WB.players.find(p => p.name === name);
      if (p) { p.lives = l; p.alive = alive; }
    });
  }
  startWBTurn();
}

function endWordBomb() {
  clearInterval(WB.timer);
  WB.done = true;

  const results = WB.players
    .map(p => ({ name: p.name + (p.isMe ? ' (You)' : ''), score: p.lives }))
    .sort((a, b) => b.score - a.score);

  LB.wordbomb.push({ name: S.name, score: WB.rnd });
  LB.wordbomb.sort((a, b) => b.score - a.score);
  LB.wordbomb = LB.wordbomb.slice(0, 5);

  ws.send('WB_SCORE', { score: WB.rnd });
  showResults(results, '❤️', 'Word Bomb');
}
