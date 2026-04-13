/* ================================================================
   games/draw.js — Draw & Guess (Skribbl-style) Game Logic
================================================================ */
'use strict';

const DG = {
  round: 1,
  totalRounds: 3,
  drawingPlayer: null,   // name of who is drawing
  word: null,            // current word (only set for drawer)
  wordHint: '',          // underscores e.g. "_ _ _ _ _"
  guessedCorrectly: new Set(),
  scores: {},
  canvas: null,
  ctx: null,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  color: '#ffffff',
  brushSize: 6,
  tool: 'pen',           // 'pen' | 'eraser' | 'fill'
  roundTimer: null,
  roundSecs: 80,
  secsLeft: 80,
  phase: 'idle',         // 'idle' | 'drawing' | 'between'
  turnTimer: null,
};

/* ── WORD LIST ── */
const DG_WORDS = [
  'astronaut','bicycle','birthday','bridge','butterfly','camera','castle',
  'cloud','computer','crown','diamond','dinosaur','dragon','elephant','fire',
  'flower','galaxy','guitar','hamburger','helicopter','iceberg','island',
  'jungle','keyboard','lightning','lion','magic','mountain','mushroom',
  'ninja','ocean','penguin','piano','pirate','planet','rainbow','robot',
  'rocket','shark','skull','snowflake','spider','submarine','sun','sword',
  'tornado','treasure','tsunami','umbrella','unicorn','volcano','waterfall',
  'wizard','wolf','zebra','zombie','apple','banana','beach','book','bus',
  'cat','chair','cheese','city','clock','coffee','cookie','dog','door',
  'egg','fish','flag','house','key','lamp','moon','mouse','phone','pizza',
  'rain','star','table','tree','truck','window','angel','anvil','army',
  'arrow','balloon','band','bank','barn','barrel','basket','bat','beach',
  'bed','bell','belt','bench','bird','blanket','boat','bomb','bone','boot',
];

function dgPickWords(count = 3) {
  const pool = [...DG_WORDS];
  const picks = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

/* ── START GAME ── */
function startDrawGuess() {
  showPage('pg-draw');
  hideBottomNav();

  DG.round = 1;
  DG.totalRounds = 3;
  DG.guessedCorrectly = new Set();
  DG.scores = {};
  DG.phase = 'idle';
  DG.word = null;
  DG.wordHint = '';

  S.players.forEach(p => { DG.scores[p.name] = 0; });

  _dgSetupCanvas();
  _dgRenderScoreboard();
  _dgUpdateRoundInfo();
  _dgClearChat();

  // Host picks words for first turn
  if (S.isHost) {
    _dgBeginTurn();
  } else {
    _dgSetStatus('⏳ Waiting for host to pick a word...');
    _dgLockCanvas();
    _dgShowGuesser();
  }
}

/* ── CANVAS SETUP ── */
function _dgSetupCanvas() {
  DG.canvas = document.getElementById('dg-canvas');
  DG.ctx    = DG.canvas ? DG.canvas.getContext('2d') : null;
  if (!DG.canvas || !DG.ctx) return;

  _dgResizeCanvas();

  DG.canvas.addEventListener('mousedown',  _dgOnDown);
  DG.canvas.addEventListener('mousemove',  _dgOnMove);
  DG.canvas.addEventListener('mouseup',    _dgOnUp);
  DG.canvas.addEventListener('mouseleave', _dgOnUp);
  DG.canvas.addEventListener('touchstart', _dgOnTouchStart, { passive: false });
  DG.canvas.addEventListener('touchmove',  _dgOnTouchMove,  { passive: false });
  DG.canvas.addEventListener('touchend',   _dgOnUp);

  window.addEventListener('resize', _dgResizeCanvas);
}

function _dgResizeCanvas() {
  if (!DG.canvas) return;
  const wrap = DG.canvas.parentElement;
  const w = wrap.clientWidth;
  const h = Math.min(wrap.clientHeight, window.innerHeight * 0.45);
  // Save current drawing
  let saved = null;
  try { saved = DG.ctx.getImageData(0, 0, DG.canvas.width, DG.canvas.height); } catch(e) {}

  DG.canvas.width  = w;
  DG.canvas.height = h || 320;
  DG.ctx.fillStyle = '#1e2230';
  DG.ctx.fillRect(0, 0, DG.canvas.width, DG.canvas.height);
  if (saved) try { DG.ctx.putImageData(saved, 0, 0); } catch(e) {}
}

/* ── DRAWING EVENTS ── */
function _dgGetPos(e) {
  const rect = DG.canvas.getBoundingClientRect();
  const scaleX = DG.canvas.width  / rect.width;
  const scaleY = DG.canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY,
  };
}

function _dgOnDown(e) {
  if (DG.phase !== 'drawing') return;
  if (DG.drawingPlayer !== S.name) return;
  const { x, y } = _dgGetPos(e);
  DG.isDrawing = true;
  DG.lastX = x; DG.lastY = y;
  if (DG.tool === 'fill') { _dgFloodFill(Math.round(x), Math.round(y)); return; }
  DG.ctx.beginPath();
  DG.ctx.arc(x, y, DG.brushSize / 2, 0, Math.PI * 2);
  DG.ctx.fillStyle = DG.tool === 'eraser' ? '#1e2230' : DG.color;
  DG.ctx.fill();
  _dgBroadcastDraw({ type: 'dot', x, y, color: DG.tool === 'eraser' ? '#1e2230' : DG.color, size: DG.brushSize });
}

function _dgOnMove(e) {
  if (!DG.isDrawing || DG.phase !== 'drawing') return;
  if (DG.drawingPlayer !== S.name) return;
  const { x, y } = _dgGetPos(e);
  if (DG.tool !== 'fill') {
    _dgDrawLine(DG.lastX, DG.lastY, x, y, DG.tool === 'eraser' ? '#1e2230' : DG.color, DG.brushSize);
    _dgBroadcastDraw({ type: 'line', x1: DG.lastX, y1: DG.lastY, x2: x, y2: y, color: DG.tool === 'eraser' ? '#1e2230' : DG.color, size: DG.brushSize });
  }
  DG.lastX = x; DG.lastY = y;
}

function _dgOnUp()    { DG.isDrawing = false; }

function _dgOnTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  _dgOnDown({ clientX: touch.clientX, clientY: touch.clientY });
}
function _dgOnTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  _dgOnMove({ clientX: touch.clientX, clientY: touch.clientY });
}

function _dgDrawLine(x1, y1, x2, y2, color, size) {
  DG.ctx.beginPath();
  DG.ctx.moveTo(x1, y1);
  DG.ctx.lineTo(x2, y2);
  DG.ctx.strokeStyle = color;
  DG.ctx.lineWidth   = size;
  DG.ctx.lineCap     = 'round';
  DG.ctx.lineJoin    = 'round';
  DG.ctx.stroke();
}

function _dgFloodFill(startX, startY) {
  const ctx   = DG.ctx;
  const w     = DG.canvas.width;
  const h     = DG.canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data  = imgData.data;
  const idx   = (startY * w + startX) * 4;

  const targetR = data[idx], targetG = data[idx+1], targetB = data[idx+2], targetA = data[idx+3];
  const [fillR, fillG, fillB] = _dgHexToRgb(DG.color);

  if (targetR === fillR && targetG === fillG && targetB === fillB) return;

  const stack = [[startX, startY]];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const i = cy * w + cx;
    if (visited[i]) continue;
    visited[i] = 1;
    const pi = i * 4;
    if (Math.abs(data[pi]-targetR)>30 || Math.abs(data[pi+1]-targetG)>30 || Math.abs(data[pi+2]-targetB)>30) continue;
    data[pi]=fillR; data[pi+1]=fillG; data[pi+2]=fillB; data[pi+3]=255;
    stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
  }
  ctx.putImageData(imgData, 0, 0);
  _dgBroadcastDraw({ type: 'fill', x: startX, y: startY, color: DG.color });
}

function _dgHexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

/* ── BROADCAST DRAW DATA ── */
function _dgBroadcastDraw(drawData) {
  ws.send('DG_DRAW', { drawData });
}

/* ── RECEIVE REMOTE DRAW DATA ── */
function dgApplyRemoteDraw(drawData) {
  if (!DG.ctx) return;
  const { type, color, size } = drawData;
  if (type === 'dot') {
    DG.ctx.beginPath();
    DG.ctx.arc(drawData.x, drawData.y, size/2, 0, Math.PI*2);
    DG.ctx.fillStyle = color;
    DG.ctx.fill();
  } else if (type === 'line') {
    _dgDrawLine(drawData.x1, drawData.y1, drawData.x2, drawData.y2, color, size);
  } else if (type === 'fill') {
    DG.color = color;
    _dgFloodFill(Math.round(drawData.x), Math.round(drawData.y));
    DG.color = document.getElementById('dg-color-pick')?.value || DG.color;
  } else if (type === 'clear') {
    _dgClearBoard();
  }
}

/* ── TURN MANAGEMENT ── */
function _dgBeginTurn() {
  // If it's our turn to draw (host manages turn order)
  const turnPlayer = _dgGetCurrentDrawer();
  if (!turnPlayer) { _dgEndGame(); return; }

  DG.drawingPlayer = turnPlayer;
  DG.guessedCorrectly = new Set();
  DG.phase = 'idle';

  if (turnPlayer === S.name) {
    // We draw — show word picker
    const words = dgPickWords(3);
    ws.send('DG_TURN_START', { drawer: S.name, round: DG.round });
    _dgShowWordPicker(words);
  }
}

function _dgGetCurrentDrawer() {
  if (!S.players.length) return null;
  const totalTurns  = DG.totalRounds * S.players.length;
  const turnIndex   = (DG.round - 1); // simplified: host advances rounds
  const playerIdx   = turnIndex % S.players.length;
  return S.players[playerIdx]?.name || null;
}

function _dgShowWordPicker(words) {
  const overlay = document.getElementById('dg-word-picker');
  const list    = document.getElementById('dg-word-list');
  if (!overlay || !list) return;
  list.innerHTML = words.map(w =>
    `<button class="dg-word-btn" onclick="dgPickWord('${w}')">${w}</button>`
  ).join('');
  overlay.style.display = 'flex';
}

function dgPickWord(word) {
  const overlay = document.getElementById('dg-word-picker');
  if (overlay) overlay.style.display = 'none';

  DG.word = word;
  DG.phase = 'drawing';

  const hint = word.split('').map(c => c === ' ' ? ' ' : '_').join(' ');
  DG.wordHint = hint;

  ws.send('DG_WORD_CHOSEN', {
    drawer:  S.name,
    hint,
    _word:   word,          // secret — server stores it, never rebroadcasts
    wordLen: word.length,
    round:   DG.round,
  });

  _dgShowDrawer(word);
  _dgStartRoundTimer();
  _dgRenderScoreboard();
}

function _dgShowDrawer(word) {
  const wordEl = document.getElementById('dg-word-display');
  if (wordEl) wordEl.textContent = '🎨 Draw: ' + word.toUpperCase();
  _dgSetStatus('You are drawing! Others are guessing...');
  _dgUnlockCanvas();
  _dgShowDrawerTools();
}

function _dgShowGuesser() {
  _dgLockCanvas();
  _dgHideDrawerTools();
  const wordEl = document.getElementById('dg-word-display');
  if (wordEl) wordEl.textContent = DG.wordHint || '_ _ _ _ _';
}

function _dgLockCanvas() {
  if (DG.canvas) DG.canvas.style.cursor = 'default';
  const tools = document.getElementById('dg-toolbar');
  if (tools) tools.style.opacity = '0.3';
}

function _dgUnlockCanvas() {
  if (DG.canvas) DG.canvas.style.cursor = 'crosshair';
  const tools = document.getElementById('dg-toolbar');
  if (tools) tools.style.opacity = '1';
}

function _dgShowDrawerTools() {
  const inp = document.getElementById('dg-guess-row');
  if (inp) inp.style.display = 'none';
  const toolbar = document.getElementById('dg-toolbar');
  if (toolbar) toolbar.style.display = 'flex';
}

function _dgHideDrawerTools() {
  const inp = document.getElementById('dg-guess-row');
  if (inp) inp.style.display = 'flex';
  const toolbar = document.getElementById('dg-toolbar');
  if (toolbar) toolbar.style.display = 'none';
}

/* ── TIMER ── */
function _dgStartRoundTimer() {
  clearInterval(DG.roundTimer);
  DG.secsLeft = DG.roundSecs;
  _dgUpdateTimer();
  DG.roundTimer = setInterval(() => {
    DG.secsLeft--;
    _dgUpdateTimer();
    if (DG.secsLeft <= 0) {
      clearInterval(DG.roundTimer);
      if (DG.drawingPlayer === S.name) {
        ws.send('DG_ROUND_END', { word: DG.word, round: DG.round });
      }
    }
  }, 1000);
}

function _dgUpdateTimer() {
  const el = document.getElementById('dg-timer');
  if (!el) return;
  el.textContent = DG.secsLeft + 's';
  el.style.color = DG.secsLeft <= 10 ? 'var(--c2)' : DG.secsLeft <= 20 ? 'var(--c3)' : 'var(--c4)';
}

/* ── GUESSING ── */
function dgSubmitGuess() {
  const inp = document.getElementById('dg-guess-inp');
  if (!inp) return;
  const guess = inp.value.trim();
  if (!guess) return;
  inp.value = '';

  if (DG.drawingPlayer === S.name) return; // drawer can't guess
  if (DG.guessedCorrectly.has(S.name)) { _dgAddChat('', '✅ You already guessed it!', 'system'); return; }

  ws.send('DG_GUESS', { guess });
  _dgAddChat(S.name, guess, 'guess');
}

/* ── CHAT ── */
function _dgAddChat(author, text, type = 'normal') {
  const msgs = document.getElementById('dg-msgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'dg-msg' + (type === 'system' ? ' dg-msg-sys' : type === 'correct' ? ' dg-msg-ok' : '');
  div.innerHTML = author
    ? `<span class="dg-msg-author">${author}:</span> <span>${text}</span>`
    : `<span>${text}</span>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function _dgClearChat() {
  const msgs = document.getElementById('dg-msgs');
  if (msgs) msgs.innerHTML = '';
}

/* ── STATUS ── */
function _dgSetStatus(text) {
  const el = document.getElementById('dg-status');
  if (el) el.textContent = text;
}

/* ── SCOREBOARD ── */
function _dgRenderScoreboard() {
  const el = document.getElementById('dg-scores');
  if (!el) return;
  const sorted = S.players.map(p => ({ name: p.name, score: DG.scores[p.name] || 0 }))
    .sort((a, b) => b.score - a.score);
  el.innerHTML = sorted.map(p => `
    <div class="dg-score-row ${p.name === DG.drawingPlayer ? 'dg-drawing' : ''}">
      <span class="dg-sname">${p.name === S.name ? '★ ' : ''}${p.name}${p.name === DG.drawingPlayer ? ' 🎨' : ''}</span>
      <span class="dg-sval">${p.score}</span>
    </div>
  `).join('');
}

/* ── ROUND INFO ── */
function _dgUpdateRoundInfo() {
  const el = document.getElementById('dg-round-info');
  if (el) el.textContent = `Round ${DG.round} / ${DG.totalRounds}`;
}

/* ── CLEAR BOARD ── */
function _dgClearBoard() {
  if (!DG.ctx) return;
  DG.ctx.fillStyle = '#1e2230';
  DG.ctx.fillRect(0, 0, DG.canvas.width, DG.canvas.height);
}

function dgClearCanvas() {
  if (DG.drawingPlayer !== S.name) return;
  _dgClearBoard();
  _dgBroadcastDraw({ type: 'clear' });
}

/* ── TOOLBAR CONTROLS ── */
function dgSetColor(color) {
  DG.color = color;
  DG.tool  = 'pen';
  document.querySelectorAll('.dg-color-swatch').forEach(s => s.classList.remove('active'));
}

function dgSetTool(tool) {
  DG.tool = tool;
  document.querySelectorAll('.dg-tool-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('dg-tool-' + tool);
  if (btn) btn.classList.add('active');
}

function dgSetBrush(size) {
  DG.brushSize = parseInt(size);
}

/* ── END GAME ── */
function _dgEndGame() {
  clearInterval(DG.roundTimer);
  DG.phase = 'idle';
}

/* ── WS EVENT HANDLERS (called from websocket.js) ── */

function dgOnTurnStart(payload) {
  // A new turn is starting
  DG.drawingPlayer = payload.drawer;
  DG.phase = 'idle';
  DG.guessedCorrectly = new Set();
  DG.round = payload.round || DG.round;
  _dgUpdateRoundInfo();
  _dgRenderScoreboard();

  _dgClearBoard();
  _dgClearChat();

  if (payload.drawer === S.name) {
    _dgSetStatus('Your turn to draw! Pick a word...');
  } else {
    _dgSetStatus(`🎨 ${payload.drawer} is choosing a word...`);
    _dgShowGuesser();
    _dgHideDrawerTools();
  }
}

function dgOnWordChosen(payload) {
  // Guesser side: update hint display and start timer
  if (DG.drawingPlayer !== S.name) {
    DG.wordHint = payload.hint;
    const wordEl = document.getElementById('dg-word-display');
    if (wordEl) wordEl.textContent = payload.hint;
    _dgSetStatus(`🎨 ${payload.drawer} is drawing! Start guessing!`);
    _dgStartRoundTimer();
    DG.phase = 'drawing';
    _dgShowGuesser();
  }
}

function dgOnGuessResult(payload) {
  const { name, correct, hint, points } = payload;
  if (correct) {
    DG.guessedCorrectly.add(name);
    if (hint) {
      DG.wordHint = hint;
      const wordEl = document.getElementById('dg-word-display');
      if (wordEl && DG.drawingPlayer !== S.name) wordEl.textContent = hint;
    }
    if (points) {
      DG.scores[name] = (DG.scores[name] || 0) + points;
    }
    _dgRenderScoreboard();
    if (name === S.name) {
      _dgAddChat('', `🎉 You guessed it! +${points} pts`, 'correct');
      const inp = document.getElementById('dg-guess-inp');
      if (inp) inp.disabled = true;
    } else {
      _dgAddChat('', `✅ ${name} guessed correctly! +${points} pts`, 'correct');
    }
  } else if (name !== S.name) {
    _dgAddChat(name, payload.guess, 'normal');
  }
}

function dgOnDrawData(payload) {
  if (DG.drawingPlayer !== S.name) {
    dgApplyRemoteDraw(payload.drawData);
  }
}

function dgOnRoundEnd(payload) {
  clearInterval(DG.roundTimer);
  DG.phase = 'between';
  const { word, scores, nextDrawer, nextRound } = payload;

  // Show word reveal
  _dgSetStatus(`⏱️ Time's up! The word was: ${word ? word.toUpperCase() : '?'}`);
  const wordEl = document.getElementById('dg-word-display');
  if (wordEl) wordEl.textContent = word ? word.toUpperCase() : '';

  _dgAddChat('', `🔍 The word was: ${word}`, 'system');

  if (scores) {
    Object.assign(DG.scores, scores);
  }
  _dgRenderScoreboard();

  // Advance to next turn after 3s
  setTimeout(() => {
    if (nextRound > DG.totalRounds * S.players.length) {
      // Game over - handled by GAME_OVER from server
      return;
    }
    DG.round = nextRound || DG.round + 1;
    DG.drawingPlayer = nextDrawer;
    DG.guessedCorrectly = new Set();
    _dgClearBoard();
    _dgClearChat();
    const inp = document.getElementById('dg-guess-inp');
    if (inp) inp.disabled = false;

    if (nextDrawer === S.name) {
      const words = dgPickWords(3);
      _dgShowWordPicker(words);
      _dgSetStatus('Your turn! Pick a word to draw.');
      _dgShowDrawerTools();
      _dgUnlockCanvas();
    } else {
      _dgSetStatus(`⏳ ${nextDrawer} is choosing a word...`);
      _dgShowGuesser();
    }
    _dgUpdateRoundInfo();
    _dgRenderScoreboard();
  }, 3000);
}

function dgOnHintUpdate(payload) {
  if (!payload.hint) return;
  DG.wordHint = payload.hint;
  if (DG.drawingPlayer !== S.name) {
    const wordEl = document.getElementById('dg-word-display');
    if (wordEl) wordEl.textContent = payload.hint;
  }
}
