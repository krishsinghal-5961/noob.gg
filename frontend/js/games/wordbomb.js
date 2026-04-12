/* ================================================================
   games/wordbomb.js — Word Bomb Game Logic
================================================================ */
'use strict';

const WB = {
  rnd: 0, cur: 0, tLeft: 0, total: 0,
  timer: null, players: [], syl: '',
  used: new Set(), done: false
};

function isValidWord(word, syl) {
  const w = word.toUpperCase();
  const s = syl.toUpperCase();
  if (!w.includes(s))          return { ok: false, reason: `Must contain "${s}"` };
  if (w.length < 3)            return { ok: false, reason: 'Too short (min 3 letters)' };
  if (!/^[A-Z]+$/.test(w))     return { ok: false, reason: 'Letters only!' };
  const known = SYLLABLE_VALID_WORDS[s] || [];
  if (known.includes(w))       return { ok: true };
  if (WORD_DICT.has(w.toLowerCase())) return { ok: true };
  if (w.length >= 7)           return { ok: true };
  return { ok: false, reason: `"${w}" not recognised as a valid word` };
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

function submitWBWord() {
  const inp  = document.getElementById('wb-inp');
  const word = inp.value.trim().toUpperCase();
  if (!word) return;

  if (WB.used.has(word)) {
    setWBFeedback(`"${word}" already used!`, 'err');
    flashWBInp('bad');
    return;
  }

  const check = isValidWord(word, WB.syl);
  if (!check.ok) {
    setWBFeedback(check.reason, 'err');
    flashWBInp('bad');
    inp.value = '';
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
    startWBTurn();
  }, 600);
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
