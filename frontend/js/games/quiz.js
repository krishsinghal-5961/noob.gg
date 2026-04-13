/* ================================================================
   games/quiz.js — Quiz Battle Game Logic
   Includes: custom question editor (host), matchmaking-ready
================================================================ */
'use strict';

const QZ = {
  qs: [], ci: 0, scores: {}, timer: null, tLeft: 0, answered: false,
  customQuestions: [],  // host's custom questions
  useCustom: false,
};

/* ── SETTINGS ── */
function setQCount(n, btn) {
  S.quizQs = n;
  document.querySelectorAll('.q-opt-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function setQTime(t, btn) {
  S.quizSecs = t;
  document.querySelectorAll('.q-time-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

/* ── QUESTION SOURCE ── */
function setQSource(source) {
  QZ.useCustom = source === 'custom';

  const bankBtn   = document.getElementById('qs-bank-btn');
  const customBtn = document.getElementById('qs-custom-btn');
  const editor    = document.getElementById('quiz-editor-panel');

  // Style toggle
  if (bankBtn) {
    bankBtn.style.background = source === 'bank' ? 'rgba(0,229,255,.1)' : '';
    bankBtn.style.color      = source === 'bank' ? 'var(--c1)' : '';
    bankBtn.style.border     = source === 'bank' ? '1px solid rgba(0,229,255,.3)' : '';
  }
  if (customBtn) {
    customBtn.className = source === 'custom' ? 'btn btn-full btn-cyan' : 'btn btn-full btn-muted';
  }

  // Show/hide editor (host only)
  if (editor) editor.style.display = (source === 'custom' && S.isHost) ? '' : 'none';

  // If custom selected and no questions yet, add one starter
  if (source === 'custom' && QZ.customQuestions.length === 0) {
    addCustomQuestion();
  }
}

/* ── QUIZ SETUP PAGE — HOST VS GUEST ── */
function renderQuizSetup() {
  const startBtn   = document.getElementById('quiz-start-btn');
  const settingsCard = document.querySelector('#pg-quiz-setup .card');
  const guestWait  = document.getElementById('quiz-guest-wait');

  if (S.isHost) {
    if (startBtn)    startBtn.style.display = '';
    if (guestWait)   guestWait.style.display = 'none';
  } else {
    // Guest: hide start button and editor, show wait message
    if (startBtn)    startBtn.style.display = 'none';
    const editor = document.getElementById('quiz-editor-panel');
    if (editor)  editor.style.display = 'none';
    if (guestWait)   guestWait.style.display = '';
  }
}

/* ══════════════════════════════════════════
   CUSTOM QUESTION EDITOR
══════════════════════════════════════════ */

function addCustomQuestion() {
  const idx = QZ.customQuestions.length;
  QZ.customQuestions.push({
    q: '',
    opts: ['', '', '', ''],
    correct: 0,
  });
  renderCustomQuestions();
  // Scroll to new card
  setTimeout(() => {
    const cards = document.querySelectorAll('.cq-card');
    if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function removeCustomQuestion(idx) {
  QZ.customQuestions.splice(idx, 1);
  renderCustomQuestions();
}

function updateCustomQ(idx, field, value) {
  if (field === 'q') {
    QZ.customQuestions[idx].q = value;
  } else if (field === 'correct') {
    QZ.customQuestions[idx].correct = parseInt(value);
  } else if (field.startsWith('opt')) {
    const optIdx = parseInt(field.replace('opt', ''));
    QZ.customQuestions[idx].opts[optIdx] = value;
  }
}

function renderCustomQuestions() {
  const list = document.getElementById('custom-q-list');
  if (!list) return;

  if (!QZ.customQuestions.length) {
    list.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--muted);text-align:center;padding:.75rem 0">No questions yet. Click "Add Question" below.</div>`;
    return;
  }

  list.innerHTML = QZ.customQuestions.map((cq, i) => `
    <div class="cq-card" style="
      background:var(--ink3);
      border:1px solid var(--border2);
      border-radius:12px;
      padding:1rem;
      margin-bottom:.875rem;
      position:relative;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
        <span style="font-family:'Orbitron',monospace;font-size:.68rem;font-weight:700;color:var(--c3);letter-spacing:.1em">Q ${i + 1}</span>
        <button onclick="removeCustomQuestion(${i})" style="
          background:rgba(255,61,107,.12);color:var(--c2);border:1px solid rgba(255,61,107,.25);
          border-radius:6px;padding:.25rem .6rem;font-size:.72rem;cursor:pointer;
        ">✕ Remove</button>
      </div>

      <textarea
        placeholder="Enter your question here..."
        oninput="updateCustomQ(${i}, 'q', this.value)"
        style="
          width:100%;background:var(--ink4);border:1px solid var(--border2);border-radius:8px;
          padding:.65rem .8rem;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.85rem;
          resize:vertical;min-height:56px;margin-bottom:.75rem;box-sizing:border-box;
        "
      >${cq.q}</textarea>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.75rem">
        ${['A','B','C','D'].map((lbl, oi) => `
          <div style="display:flex;align-items:center;gap:.4rem">
            <span style="
              font-family:'Orbitron',monospace;font-size:.65rem;font-weight:700;
              color:${cq.correct === oi ? 'var(--c4)' : 'var(--muted)'};
              min-width:1rem;
            ">${lbl}</span>
            <input
              type="text"
              placeholder="Option ${lbl}"
              value="${cq.opts[oi] || ''}"
              oninput="updateCustomQ(${i}, 'opt${oi}', this.value)"
              style="
                flex:1;background:var(--ink4);border:1px solid ${cq.correct === oi ? 'rgba(57,255,148,.4)' : 'var(--border2)'};
                border-radius:7px;padding:.5rem .65rem;color:var(--text);
                font-family:'DM Sans',sans-serif;font-size:.8rem;
              "
            />
          </div>
        `).join('')}
      </div>

      <div style="display:flex;align-items:center;gap:.6rem">
        <span style="font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted)">Correct answer:</span>
        <div style="display:flex;gap:.35rem">
          ${['A','B','C','D'].map((lbl, oi) => `
            <button
              onclick="updateCustomQ(${i}, 'correct', ${oi}); renderCustomQuestions()"
              style="
                width:2rem;height:2rem;border-radius:6px;border:1px solid ${cq.correct === oi ? 'rgba(57,255,148,.6)' : 'var(--border2)'};
                background:${cq.correct === oi ? 'rgba(57,255,148,.15)' : 'var(--ink4)'};
                color:${cq.correct === oi ? 'var(--c4)' : 'var(--muted)'};
                font-family:'Orbitron',monospace;font-size:.65rem;font-weight:700;cursor:pointer;
              "
            >${lbl}</button>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function _validateCustomQuestions() {
  for (let i = 0; i < QZ.customQuestions.length; i++) {
    const cq = QZ.customQuestions[i];
    if (!cq.q.trim()) {
      toast(`Q${i + 1}: Question text is empty!`, 'err'); return false;
    }
    for (let j = 0; j < 4; j++) {
      if (!cq.opts[j].trim()) {
        toast(`Q${i + 1}: Option ${['A','B','C','D'][j]} is empty!`, 'err'); return false;
      }
    }
  }
  return true;
}

/* ══════════════════════════════════════════
   GAME START
══════════════════════════════════════════ */

function startQuiz() {
  if (!S.isHost) return;

  // Build question pool
  let pool;
  if (QZ.useCustom) {
    if (!QZ.customQuestions.length) { toast('Add at least one question!', 'err'); return; }
    if (!_validateCustomQuestions()) return;
    pool = QZ.customQuestions.map(cq => ({
      q: cq.q.trim(),
      opts: cq.opts.map(o => o.trim()),
      correct: cq.correct,
    }));
  } else {
    pool = [...QUIZ_BANK].sort(() => Math.random() - .5);
  }

  const count = S.quizQs || 5;
  QZ.qs     = pool.slice(0, Math.min(count, pool.length));
  QZ.ci     = 0;
  QZ.scores = {};
  S.players.forEach(p => QZ.scores[p.name] = 0);

  // Broadcast questions + settings to all players so everyone plays the same set
  ws.send('QUIZ_LAUNCH', { questions: QZ.qs, secs: S.quizSecs || 20 });

  // Launch locally for the host too
  _launchQuiz();
}

/* Called when server sends GAME_START */
function _launchQuiz() {
  QZ.ci     = 0;
  QZ.scores = {};
  S.players.forEach(p => QZ.scores[p.name] = 0);

  // If no questions preloaded (guest), use default bank
  if (!QZ.qs.length) {
    const count = S.quizQs || 5;
    QZ.qs = [...QUIZ_BANK].sort(() => Math.random() - .5).slice(0, count);
  }

  showPage('pg-quiz');
  showQZ();
}

/* ── QUESTION DISPLAY ── */
function showQZ() {
  QZ.answered = false;
  clearInterval(QZ.timer);
  QZ.tLeft = S.quizSecs || 20;

  const q    = QZ.qs[QZ.ci];
  const syms = ['A', 'B', 'C', 'D'];

  document.getElementById('quiz-qnum').textContent        = `Q ${QZ.ci + 1} / ${QZ.qs.length}`;
  document.getElementById('quiz-qtext').textContent       = q.q;
  document.getElementById('quiz-my-score').textContent    = QZ.scores[S.name] || 0;
  document.getElementById('quiz-pts-display').textContent = QZ.scores[S.name] || 0;

  document.getElementById('quiz-opts').innerHTML = q.opts.map((o, i) => `
    <button class="qopt" onclick="pickQZ(${i})">
      <div class="qopt-sym">${syms[i]}</div>
      <span>${o}</span>
    </button>
  `).join('');

  updateQZLB();
  tickQZ();
}

function tickQZ() {
  updateQZTimer();
  QZ.timer = setInterval(() => {
    QZ.tLeft--;
    updateQZTimer();
    if (QZ.tLeft <= 0) {
      clearInterval(QZ.timer);
      if (!QZ.answered) {
        toast('⏰ Time\'s up!', 'warn');
        revealQZ();
        setTimeout(nextQZ, 3000);
      }
    }
  }, 1000);
}

function updateQZTimer() {
  const pct = QZ.tLeft / (S.quizSecs || 20) * 100;
  const cl  = document.getElementById('quiz-clock');
  const bar = document.getElementById('quiz-tbar');
  if (cl)  { cl.textContent = QZ.tLeft; cl.classList.toggle('warn', QZ.tLeft <= 5); cl.classList.toggle('crit', QZ.tLeft <= 3); }
  if (bar) { bar.style.width = pct + '%'; bar.classList.toggle('warn', pct < 40 && pct >= 15); bar.classList.toggle('crit', pct < 15); }
}

function pickQZ(idx) {
  if (QZ.answered) return;
  QZ.answered = true;
  clearInterval(QZ.timer);
  document.querySelectorAll('.qopt').forEach(o => o.classList.add('locked'));

  const q = QZ.qs[QZ.ci];
  if (idx === q.correct) {
    const bonus = Math.round(QZ.tLeft / (S.quizSecs || 20) * 1000);
    const pts   = 1000 + bonus;
    QZ.scores[S.name] = (QZ.scores[S.name] || 0) + pts;
    document.getElementById('quiz-my-score').textContent    = QZ.scores[S.name];
    document.getElementById('quiz-pts-display').textContent = QZ.scores[S.name];
    toast('✓ Correct! +' + pts + ' pts ⚡', 'ok');
    wsSendQuizScore(QZ.scores[S.name]);
  } else {
    toast('✗ Wrong answer!', 'err');
  }

  revealQZ();
  setTimeout(nextQZ, 3000);
}

function revealQZ() {
  const q = QZ.qs[QZ.ci];
  document.querySelectorAll('.qopt').forEach((o, i) => {
    o.classList.add('locked');
    o.classList.add(i === q.correct ? 'correct' : 'wrong');
  });
  updateQZLB();
}

function updateQZLB() {
  const lb = document.getElementById('quiz-lb');
  if (!lb) return;
  const sorted = Object.entries(QZ.scores).sort((a, b) => b[1] - a[1]).slice(0, 5);
  lb.innerHTML = `<div class="quiz-lb-title">Live Standings</div>` +
    sorted.map(([n, sc], i) => `
      <div class="qlb-row">
        <span class="qlb-r">#${i + 1}</span>
        <span style="flex:1;font-weight:600;${n === S.name ? 'color:var(--c3)' : ''}">${n}${n === S.name ? ' ★' : ''}</span>
        <span class="qlb-s">${sc}</span>
      </div>
    `).join('');
}

function nextQZ() {
  QZ.ci++;
  if (QZ.ci >= QZ.qs.length) endQuiz();
  else showQZ();
}

function endQuiz() {
  clearInterval(QZ.timer);

  const results = Object.entries(QZ.scores)
    .map(([n, s]) => ({ name: n, score: s }))
    .sort((a, b) => b.score - a.score);

  LB.quiz.push({ name: S.name, score: QZ.scores[S.name] || 0 });
  LB.quiz.sort((a, b) => b.score - a.score);
  LB.quiz = LB.quiz.slice(0, 5);

  if (S.myStats) S.myStats.quiz = Math.max(S.myStats.quiz || 0, QZ.scores[S.name] || 0);

  ws.send('QUIZ_FINISHED', {});
  showResults(results, 'pts', 'Quiz Battle');
}
