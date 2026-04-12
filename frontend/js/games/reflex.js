/* ================================================================
   games/reflex.js — Reflex Arena Game Logic
   
   BACKEND INTEGRATION:
   - After each hitRFTarget(), call wsSendReflexScore(ms)
   - Server collects scores from all players and can broadcast
     other players' times via REFLEX_SCORE event (websocket.js)
================================================================ */
'use strict';

const RF = {
  round: 0, max: 5, times: [], bots: {},
  canClick: false, t0: 0,
  showTid: null, penTid: null
};

function startReflex() {
  showPage('pg-reflex');
  RF.round = 0;
  RF.times = [];
  RF.bots  = {};
  S.players.forEach(p => RF.bots[p.name] = []);

  document.getElementById('r-best').textContent = '—';
  document.getElementById('r-avg').textContent  = '—';
  document.getElementById('r-rank').textContent = '—';

  renderRFBoard();
  setTimeout(nextRFRound, 700);
}

function renderRFBoard() {
  const container = document.getElementById('reflex-sboard');
  if (!container) return;

  const all = S.players.map(p => {
    const times = p.name === S.name ? RF.times : (RF.bots[p.name] || []);
    const best  = times.length ? Math.min(...times) : null;
    return { name: p.name, best };
  }).sort((a, b) => {
    if (!a.best && !b.best) return 0;
    if (!a.best) return 1;
    if (!b.best) return -1;
    return a.best - b.best;
  });

  container.innerHTML = all.map((p, i) => `
    <div class="r-pcard${i === 0 && p.best ? ' lead' : ''}">
      <div class="r-pname">${p.name}${p.name === S.name ? ' (You)' : ''}</div>
      <div class="r-pscore" style="color:${i === 0 ? 'var(--c3)' : 'var(--c1)'}">
        ${p.best !== null ? p.best : '—'}
      </div>
      <div class="r-punit">${p.best !== null ? 'ms best' : 'waiting...'}</div>
    </div>
  `).join('');

  // Update personal mini-stats
  if (RF.times.length) {
    const best = Math.min(...RF.times);
    const avg  = Math.round(RF.times.reduce((a, c) => a + c, 0) / RF.times.length);
    const allBests = S.players.map(p =>
      p.name === S.name ? best : Math.min(...(RF.bots[p.name] || [9999]))
    );
    document.getElementById('r-best').textContent = best + 'ms';
    document.getElementById('r-avg').textContent  = avg  + 'ms';
    document.getElementById('r-rank').textContent = '#' + (allBests.filter(x => x < best).length + 1);
  }
}

function nextRFRound() {
  if (RF.round >= RF.max) { endReflex(); return; }
  RF.round++;

  document.getElementById('r-round').textContent = RF.round + ' / ' + RF.max;
  document.getElementById('r-status').textContent = 'Round ' + RF.round + ' — Don\'t click early!';
  document.getElementById('r-last').innerHTML = '';

  const zone = document.getElementById('r-zone');
  zone.className = 'reflex-zone';
  zone.onclick   = () => earlyClick();
  zone.innerHTML = `<div class="r-idle">⬤ STANDBY</div>`;
  RF.canClick    = false;

  clearTimeout(RF.showTid);
  RF.showTid = setTimeout(showRFTarget, 1500 + Math.random() * 3000);
}

function earlyClick() {
  if (RF.canClick) return;
  clearTimeout(RF.showTid);
  RF.times.push(500);

  document.getElementById('r-status').textContent = '⚠️ Too early! +500ms penalty';
  document.getElementById('r-last').innerHTML = `<div class="r-ms" style="color:var(--c2)">+500ms</div>`;
  const zone = document.getElementById('r-zone');
  zone.className = 'reflex-zone early';
  zone.innerHTML = `<div class="r-idle">⬤ STANDBY</div>`;

  renderRFBoard();
  botRFRound();
  setTimeout(nextRFRound, 1400);
}

function showRFTarget() {
  RF.canClick = true;
  RF.t0       = performance.now();

  const zone = document.getElementById('r-zone');
  zone.className = 'reflex-zone ready';
  zone.innerHTML = '';

  document.getElementById('r-status').textContent = '🎯 CLICK NOW!';

  const colors = ['#ff3d6b','#00e5ff','#39ff94','#ffe033','#c77dff','#ff8c42'];
  const col    = colors[Math.floor(Math.random() * colors.length)];
  const target = document.createElement('div');
  target.className  = 'r-target';
  target.style.cssText = `border:3px solid ${col};background:${col}22;color:${col};left:${8 + Math.random() * 58}%;top:${8 + Math.random() * 55}%`;
  target.textContent = '⬤';
  target.onclick = e => { e.stopPropagation(); hitRFTarget(); };
  zone.appendChild(target);

  // Auto-miss timeout
  RF.penTid = setTimeout(() => {
    if (!RF.canClick) return;
    RF.canClick = false;
    zone.className = 'reflex-zone';
    zone.innerHTML = `<div class="r-idle">⬤ STANDBY</div>`;
    document.getElementById('r-last').innerHTML = `<div class="r-ms" style="color:var(--c2)">MISSED</div>`;
    document.getElementById('r-status').textContent = 'Missed! +1000ms';
    RF.times.push(1000);
    renderRFBoard();
    botRFRound();
    setTimeout(nextRFRound, 1400);
  }, 2000);
}

function hitRFTarget() {
  if (!RF.canClick) return;
  RF.canClick = false;
  clearTimeout(RF.penTid);

  const ms   = Math.round(performance.now() - RF.t0);
  RF.times.push(ms);

  const zone = document.getElementById('r-zone');
  zone.className = 'reflex-zone';
  zone.innerHTML = `<div class="r-idle">⬤ STANDBY</div>`;

  const rating = ms < 180 ? 'INSANE 🔥' : ms < 280 ? 'GREAT ⚡' : ms < 420 ? 'GOOD' : ms < 600 ? 'OK' : 'SLOW';
  const col    = ms < 280 ? 'var(--c4)' : ms < 450 ? 'var(--c3)' : 'var(--c2)';

  document.getElementById('r-last').innerHTML = `
    <div class="r-ms" style="color:${col}">
      ${ms}<span style="font-size:1.2rem;margin-left:.3rem">ms</span>
    </div>
  `;
  document.getElementById('r-status').textContent = rating;
  toast(ms + 'ms — ' + rating, 'ok');

  // Broadcast to server
  wsSendReflexScore(ms);

  renderRFBoard();
  botRFRound();
  setTimeout(nextRFRound, 1700);
}

function botRFRound() {
  S.players.forEach(p => {
    if (p.name === S.name) return;
    (RF.bots[p.name] = RF.bots[p.name] || []).push(Math.round(180 + Math.random() * 450));
  });
  renderRFBoard();
}

function endReflex() {
  const results = S.players.map(p => {
    const times = p.name === S.name ? RF.times : (RF.bots[p.name] || [999]);
    return { name: p.name + (p.name === S.name ? ' (You)' : ''), score: Math.min(...times) };
  }).sort((a, b) => a.score - b.score);

  // Update leaderboard
  const myBest = Math.min(...RF.times);
  LB.reflex.push({ name: S.name, score: myBest });
  LB.reflex.sort((a, b) => a.score - b.score);
  LB.reflex = LB.reflex.slice(0, 5);

  if (S.myStats) S.myStats.reflex = Math.min(S.myStats.reflex || 9999, myBest);

  showResults(results, 'ms', 'Reflex Arena');
}
