/* ================================================================
   games/typerace.js — Type Race Game Logic (3 Escalating Rounds)
   
   BACKEND INTEGRATION:
   - trInput() should call wsSendTypeProgress(TR.typed) on each keystroke
   - Server broadcasts other players' progress via TR_PROGRESS event
   - All players should receive same texts (server sends them)
================================================================ */
'use strict';

const TR = {
  round: 0, text: '', typed: 0, errors: 0,
  t0: 0, done: false, prog: {}, interval: null,
  roundScores: {}, totalWpm: 0
};

function startTypeRace() {
  showPage('pg-typerace');
  TR.round       = 0;
  TR.roundScores = {};
  TR.totalWpm    = 0;
  S.players.forEach(p => { TR.prog[p.name] = 0; p._trDone = false; });
  startTRRound();
}

function startTRRound() {
  const rd    = TR_ROUNDS[TR.round];
  TR.text     = rd.texts[Math.floor(Math.random() * rd.texts.length)];
  TR.typed    = 0;
  TR.errors   = 0;
  TR.t0       = Date.now();
  TR.done     = false;
  S.players.forEach(p => { TR.prog[p.name] = 0; p._trDone = false; });

  const badge = document.getElementById('tr-round-badge');
  if (badge) { badge.textContent = rd.label; badge.style.cssText = `color:${rd.color};border-color:${rd.borderColor}`; }

  const rndDisp = document.getElementById('tr-rnd-disp');
  if (rndDisp) rndDisp.textContent = (TR.round + 1) + '/3';

  renderTRText();
  renderTRBars();

  const inp = document.getElementById('tr-inp');
  inp.value   = '';
  inp.disabled = false;
  inp.style.display = 'block';
  inp.oninput = trInput;

  document.getElementById('tr-finish-btn').style.display = 'none';
  document.getElementById('tr-rt').style.display         = 'none';

  ['tr-wpm','tr-acc','tr-prog'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'tr-acc' ? '100%' : id === 'tr-prog' ? '0%' : '0';
  });
  const wpmHd = document.getElementById('tr-wpm-hd');
  if (wpmHd) wpmHd.textContent = '0';

  clearInterval(TR.interval);
  TR.interval = setInterval(() => {
    // Simulate bot progress
    S.players.forEach(p => {
      if (p.name === S.name) return;
      const speed = (45 + Math.random() * (TR.round === 0 ? 60 : TR.round === 1 ? 45 : 30)) / 60;
      TR.prog[p.name] = Math.min(TR.text.length, (TR.prog[p.name] || 0) + speed);
      if (TR.prog[p.name] >= TR.text.length && !p._trDone) {
        p._trDone = true;
        toast(p.name + ' finished Round ' + (TR.round + 1) + '!', 'info');
      }
    });
    renderTRBars();
    if (!TR.done) updateTRStats();
  }, 200);

  setTimeout(() => inp.focus(), 100);
}

function renderTRText() {
  const box = document.getElementById('tr-textbox');
  if (!box) return;
  box.innerHTML = TR.text.split('').map((ch, i) => {
    const cls = i < TR.typed ? 'ok' : i === TR.typed ? 'cur' : 'ahead';
    // Escape HTML special chars
    const safe = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
    return `<span class="ch ${cls}" id="tc-${i}">${safe}</span>`;
  }).join('');
}

function trInput() {
  if (TR.done) return;
  const inp = document.getElementById('tr-inp');
  const v   = inp.value;
  const ex  = TR.text[TR.typed];
  if (!ex) return;
  const ch = v[v.length - 1];
  if (!ch) { inp.value = ''; return; }

  if (ch === ex) {
    TR.typed++;
    TR.prog[S.name] = TR.typed;
    inp.value = '';
    inp.classList.remove('shake');

    const prev = document.getElementById('tc-' + (TR.typed - 1));
    if (prev) prev.className = 'ch ok';
    const cur  = document.getElementById('tc-' + TR.typed);
    if (cur)  { cur.className = 'ch cur'; cur.scrollIntoView({ block:'nearest', behavior:'smooth' }); }

    if (TR.typed >= TR.text.length) { trAutoFinish(); return; }
    if (TR.typed / TR.text.length > .88) {
      document.getElementById('tr-finish-btn').style.display = 'flex';
    }

    // Broadcast progress
    wsSendTypeProgress(TR.typed);

  } else {
    TR.errors++;
    inp.value = '';
    inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 250);
  }

  updateTRStats();
  renderTRBars();
}

function updateTRStats() {
  const elapsed = (Date.now() - TR.t0) / 1000 / 60;
  const wpm     = elapsed > 0 ? Math.round((TR.typed / 5) / elapsed) : 0;
  const acc     = TR.typed + TR.errors > 0 ? Math.round(TR.typed / (TR.typed + TR.errors) * 100) : 100;
  const prog    = Math.round(TR.typed / TR.text.length * 100);

  ['tr-wpm','tr-wpm-hd'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = wpm; });
  const accEl  = document.getElementById('tr-acc');  if (accEl)  accEl.textContent  = acc  + '%';
  const progEl = document.getElementById('tr-prog');  if (progEl) progEl.textContent = prog + '%';
}

function renderTRBars() {
  const cols = ['#00e5ff','#ff3d6b','#ffe033','#39ff94','#c77dff','#ff8c42'];
  const ents = Object.entries(TR.prog).sort((a, b) => b[1] - a[1]);
  const container = document.getElementById('tr-bars');
  if (!container) return;

  container.innerHTML = ents.map(([n, p], i) => {
    const pct = Math.round(p / TR.text.length * 100);
    const col = n === S.name ? cols[0] : cols[(i + 1) % cols.length];
    return `
      <div class="tr-bar-row">
        <span class="tr-bar-name" style="color:${col}">${n.substring(0,10)}${n === S.name ? ' ★' : ''}</span>
        <div class="tr-bar-track">
          <div class="tr-bar-fill" style="width:${pct}%;background:${col}"></div>
        </div>
        <span class="tr-bar-pct">${pct}%</span>
      </div>
    `;
  }).join('');
}

function trAutoFinish() {
  TR.done = true;
  document.getElementById('tr-inp').disabled = true;
  document.getElementById('tr-finish-btn').style.display = 'none';
  toast('🏁 Round ' + (TR.round + 1) + ' done!', 'ok');
  setTimeout(endTRRound, 900);
}

function trFinish() {
  TR.done = true;
  document.getElementById('tr-inp').disabled = true;
  document.getElementById('tr-finish-btn').style.display = 'none';
  toast('🏁 Submitted!', 'ok');
  setTimeout(endTRRound, 400);
}

function endTRRound() {
  clearInterval(TR.interval);
  S.players.forEach(p => p._trDone = false);

  const elapsed = (Date.now() - TR.t0) / 1000 / 60;
  const myWpm   = elapsed > 0 ? Math.round((TR.typed / 5) / elapsed) : 0;

  TR.roundScores[TR.round] = myWpm;
  TR.totalWpm += myWpm;
  TR.round++;

  if (TR.round >= 3) { endTypeRace(); return; }

  // Show round transition screen
  const inp = document.getElementById('tr-inp');
  const rt  = document.getElementById('tr-rt');
  inp.style.display = 'none';
  rt.style.display  = 'flex';

  document.getElementById('tr-rt-title').textContent = 'Round ' + TR.round + ' Complete! ' + myWpm + ' WPM';
  document.getElementById('tr-rt-sub').textContent   = TR_ROUNDS[TR.round].label + ' starts in 3s...';
  document.getElementById('tr-rt-info').textContent  = 'Difficulty increases! Brace yourself.';

  let countdown = 3;
  const ci = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(ci);
      rt.style.display  = 'none';
      inp.style.display = 'block';
      startTRRound();
    } else {
      document.getElementById('tr-rt-sub').textContent = TR_ROUNDS[TR.round].label + ' starts in ' + countdown + 's...';
    }
  }, 1000);
}

function endTypeRace() {
  const avg     = Math.round(TR.totalWpm / 3);
  const results = Object.entries(TR.prog)
    .map(([n]) => ({ name: n, score: n === S.name ? avg : Math.round(40 + Math.random() * 80) }))
    .sort((a, b) => b.score - a.score);

  LB.typerace.push({ name: S.name, score: avg, u: 'WPM' });
  LB.typerace.sort((a, b) => b.score - a.score);
  LB.typerace = LB.typerace.slice(0, 5);

  if (S.myStats) S.myStats.typerace = Math.max(S.myStats.typerace || 0, avg);

  showResults(results, 'WPM', 'Type Race');
}
