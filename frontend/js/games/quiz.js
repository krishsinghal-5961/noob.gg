/* ================================================================
   games/quiz.js — Quiz Battle Game Logic
================================================================ */
'use strict';

const QZ = {
  qs: [], ci: 0, scores: {}, timer: null, tLeft: 0, answered: false
};

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

function startQuiz() {
  const count   = S.quizQs || 5;
  const shuffled = [...QUIZ_BANK].sort(() => Math.random() - .5);
  QZ.qs      = shuffled.slice(0, count);
  QZ.ci      = 0;
  QZ.scores  = {};
  S.players.forEach(p => QZ.scores[p.name] = 0);

  showPage('pg-quiz');
  showQZ();
}

function showQZ() {
  QZ.answered = false;
  clearInterval(QZ.timer);
  QZ.tLeft = S.quizSecs;

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
  const pct = QZ.tLeft / S.quizSecs * 100;
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
    const bonus = Math.round(QZ.tLeft / S.quizSecs * 1000);
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
