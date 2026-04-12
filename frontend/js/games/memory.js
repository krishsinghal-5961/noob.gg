/* ================================================================
   games/memory.js — Memory Lock (Pattern) Game Logic
   
   BACKEND INTEGRATION:
   - Each correct patClick() should ws.send('PAT_CLICK', { idx })
   - Server validates sequence and broadcasts scores
   - nextPATRound() should wait for SERVER to send next sequence
================================================================ */
'use strict';

const PAT = {
  seq: [], inp: [], round: 1,
  showing: false, canInput: false,
  scores: {}, size: 3, intervalMs: 600
};

const PAT_CELL_COLORS = [
  '#00e5ff','#ff3d6b','#ffe033','#39ff94','#c77dff','#ff8c42',
  '#ff6b9d','#00b4d8','#90e0ef','#c77dff','#f72585','#4361ee',
  '#4cc9f0','#7209b7','#3a0ca3','#f77f00'
];
const PAT_EMOJIS = [
  '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⬛',
  '🔶','💜','❤️','💙','💚','💛','🧡','🖤'
];

function startPattern() {
  showPage('pg-pattern');
  PAT.seq        = [];
  PAT.inp        = [];
  PAT.round      = 1;
  PAT.size       = 3;
  PAT.intervalMs = 600;
  PAT.scores     = {};
  S.players.forEach(p => PAT.scores[p.name] = 0);

  buildPATGrid();
  renderPATScores();
  updatePATSpeedBadge();
  nextPATRound();
}

function buildPATGrid() {
  const grid    = document.getElementById('pat-grid');
  if (!grid) return;
  const availW  = Math.min(window.innerWidth - 40, 440);
  const gap     = Math.max(4, 8 - PAT.size);
  const cellSz  = Math.floor((availW - gap * (PAT.size - 1)) / PAT.size);
  const clamped = Math.max(48, Math.min(88, cellSz));

  grid.style.cssText = `grid-template-columns:repeat(${PAT.size},1fr);gap:${gap}px`;
  grid.innerHTML = '';

  for (let i = 0; i < PAT.size * PAT.size; i++) {
    const cell       = document.createElement('div');
    cell.className   = 'pcell showing';
    cell.id          = 'pc-' + i;
    cell.style.cssText = `--cell-color:${PAT_CELL_COLORS[i % PAT_CELL_COLORS.length]};width:${clamped}px;height:${clamped}px;font-size:${Math.max(.85, clamped * .28)}rem`;
    cell.textContent = PAT_EMOJIS[i % PAT_EMOJIS.length];
    cell.onclick     = () => patClick(i);
    grid.appendChild(cell);
  }
}

function updatePATSpeedBadge() {
  const b = document.getElementById('pat-speed-badge');
  if (!b) return;
  if      (PAT.round <= 3)  b.textContent = 'Normal';
  else if (PAT.round <= 6)  b.textContent = 'Fast ⚡';
  else if (PAT.round <= 9)  b.textContent = 'Faster 🔥';
  else                      b.textContent = 'INSANE 💀';
}

function renderPATScores() {
  const container = document.getElementById('pat-scores');
  if (!container) return;
  container.innerHTML = Object.entries(PAT.scores).map(([n, s]) => `
    <div class="psc">
      <div class="psc-name">${n}${n === S.name ? ' ★' : ''}</div>
      <div class="psc-val">${s}</div>
    </div>
  `).join('');
}

function nextPATRound() {
  PAT.inp      = [];
  PAT.canInput = false;

  document.getElementById('pat-rnd').textContent    = PAT.round;
  document.getElementById('pat-status').textContent = 'Watch the sequence (' + PAT.seq.length + '→' + (PAT.seq.length + 1) + ' steps)';
  document.getElementById('pat-hint').textContent   = '';

  // Increase grid size at milestones
  if (PAT.round === 5 && PAT.size < 4) { PAT.size = 4; buildPATGrid(); }
  if (PAT.round === 9 && PAT.size < 5) { PAT.size = 5; buildPATGrid(); }

  // Speed up
  PAT.intervalMs = Math.max(200, 600 - PAT.round * 35);
  updatePATSpeedBadge();

  PAT.seq.push(Math.floor(Math.random() * PAT.size * PAT.size));
  showPATSeq(0);
}

function showPATSeq(idx) {
  document.querySelectorAll('.pcell').forEach(c => { c.className = 'pcell showing'; });

  if (idx >= PAT.seq.length) {
    setTimeout(() => {
      PAT.canInput = true;
      document.getElementById('pat-status').textContent = 'Your turn! Repeat ' + PAT.seq.length + ' step' + (PAT.seq.length > 1 ? 's' : '');
      document.getElementById('pat-hint').textContent   = 'Click the cells in order';
      document.querySelectorAll('.pcell').forEach(c => {
        c.classList.remove('showing');
        c.classList.add('player-turn');
      });
    }, 400);
    return;
  }

  const ci   = PAT.seq[idx];
  const cell = document.getElementById('pc-' + ci);

  setTimeout(() => {
    if (cell) cell.classList.add('lit');
    setTimeout(() => {
      if (cell) cell.classList.remove('lit');
      showPATSeq(idx + 1);
    }, Math.max(120, PAT.intervalMs - 80));
  }, idx === 0 ? 300 : PAT.intervalMs);
}

function patClick(idx) {
  if (!PAT.canInput) return;
  PAT.inp.push(idx);
  const cell = document.getElementById('pc-' + idx);

  if (idx === PAT.seq[PAT.inp.length - 1]) {
    // Correct click
    if (cell) { cell.classList.add('ok-press'); setTimeout(() => cell.classList.remove('ok-press'), 200); }

    if (PAT.inp.length === PAT.seq.length) {
      // Full sequence matched!
      PAT.canInput = false;
      PAT.scores[S.name] = (PAT.scores[S.name] || 0) + PAT.round;

      // Bots succeed with some probability
      S.players.forEach(p => {
        if (p.name !== S.name && Math.random() > .28) {
          PAT.scores[p.name] = (PAT.scores[p.name] || 0) + PAT.round;
        }
      });

      renderPATScores();
      document.getElementById('pat-status').textContent = '✓ Correct! Round ' + (PAT.round + 1) + ' coming...';
      document.getElementById('pat-hint').textContent   = '';
      PAT.round++;
      document.querySelectorAll('.pcell').forEach(c => c.classList.add('showing'));

      if (PAT.round > 12) { endPattern(); return; }
      setTimeout(nextPATRound, 1300);
    }
  } else {
    // Wrong click
    if (cell) cell.classList.add('bad-press');
    PAT.canInput = false;
    document.getElementById('pat-status').textContent = '✗ Wrong! Sequence broken.';
    document.getElementById('pat-hint').textContent   = 'You reached round ' + PAT.round;
    toast('Wrong! You reached round ' + PAT.round, 'err');

    // Bots continue scoring
    S.players.forEach(p => {
      if (p.name !== S.name) {
        PAT.scores[p.name] = (PAT.scores[p.name] || 0) + Math.floor(Math.random() * (PAT.round + 3));
      }
    });
    renderPATScores();
    setTimeout(endPattern, 1600);
  }
}

function endPattern() {
  const results = Object.entries(PAT.scores)
    .map(([n, s]) => ({ name: n + (n === S.name ? ' (You)' : ''), score: s }))
    .sort((a, b) => b.score - a.score);

  LB.pattern.push({ name: S.name, score: PAT.scores[S.name] || 0 });
  LB.pattern.sort((a, b) => b.score - a.score);
  LB.pattern = LB.pattern.slice(0, 5);

  if (S.myStats) S.myStats.pattern = Math.max(S.myStats.pattern || 0, PAT.scores[S.name] || 0);

  showResults(results, 'pts', 'Memory Lock');
}
