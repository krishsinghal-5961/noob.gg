/* ================================================================
   websocket.js — WebSocket Client Layer

   Message format (JSON):
   { type: 'EVENT_TYPE', payload: { ...data } }
================================================================ */
'use strict';

const ws = {
  socket:      null,
  connected:   false,   // true only after AUTH_OK received
  authed:      false,   // alias, same as connected
  reconnectMs: 2000,
  _reconnectTimer: null,
  _pendingQueue: [],    // messages queued before auth completes

  /* ── CONNECT ── */
  connect(url) {
    if (this.socket) return;
    try {
      this.socket = new WebSocket(url);
      this.socket.onopen    = () => this._onOpen();
      this.socket.onmessage = (e) => this._onMessage(e);
      this.socket.onclose   = () => this._onClose();
      this.socket.onerror   = (e) => this._onError(e);
      this._setIndicator('connecting', 'Connecting...');
    } catch (err) {
      console.warn('[WS] Cannot connect:', err.message);
      this._setIndicator('disconnected', 'Offline');
    }
  },

  /* ── SEND ── */
  /* If not yet authed, queue the message (except AUTH itself) */
  send(type, payload = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      if (!this.authed && type !== 'AUTH') {
        this._pendingQueue.push({ type, payload });
        console.log('[WS] Queued (awaiting AUTH_OK):', type);
        return;
      }
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WS] Not connected — message dropped:', type);
      toast('Not connected to server. Please wait…', 'warn');
    }
  },

  /* ── FLUSH pending queue after AUTH_OK ── */
  _flushQueue() {
    while (this._pendingQueue.length) {
      const { type, payload } = this._pendingQueue.shift();
      console.log('[WS] Flushing queued message:', type);
      this.socket.send(JSON.stringify({ type, payload }));
    }
  },

  /* ── DISCONNECT ── */
  disconnect() {
    clearTimeout(this._reconnectTimer);
    if (this.socket) { this.socket.close(); this.socket = null; }
  },

  /* ── PRIVATE HANDLERS ── */
  _onOpen() {
    console.log('[WS] Socket open — sending AUTH');
    this._setIndicator('connecting', 'Authenticating...');
    // Authenticate immediately on open
    if (S.name) {
      this.socket.send(JSON.stringify({ type: 'AUTH', payload: { name: S.name } }));
    }
  },

  _onClose() {
    this.connected = false;
    this.authed    = false;
    this.socket    = null;
    this._pendingQueue = [];
    console.log('[WS] Disconnected — retrying in', this.reconnectMs, 'ms');
    this._setIndicator('connecting', 'Reconnecting...');
    this._reconnectTimer = setTimeout(() => ws.connect(WS_URL), this.reconnectMs);
    this.reconnectMs = Math.min(this.reconnectMs * 1.5, 15000);
  },

  _onError(e) {
    console.warn('[WS] Error:', e);
    this._setIndicator('disconnected', 'Error');
  },

  _onMessage(event) {
    let msg;
    try { msg = JSON.parse(event.data); }
    catch { console.warn('[WS] Invalid JSON:', event.data); return; }

    const { type, payload } = msg;
    console.log('[WS] ←', type, payload);

    switch (type) {

      /* ── AUTH ── */
      case 'AUTH_OK':
        this.connected = true;
        this.authed    = true;
        this.reconnectMs = 2000; // reset backoff on success
        this._setIndicator('connected', 'Online');
        toast('Connected to server 🟢', 'ok');
        // Load global chat history if provided
        if (payload.chatHistory && payload.chatHistory.length) {
          payload.chatHistory.forEach(m => addChatMsg('global', m.author, m.text));
        }
        // Flush any messages queued while waiting for AUTH_OK
        this._flushQueue();
        break;

      /* ── ROOM EVENTS ── */
      case 'ROOM_CREATED':
        S.code   = payload.code;
        S.isHost = true;
        S.players = payload.room ? payload.room.players : [{ name: S.name, isHost: true, ready: false, color: '#00e5ff' }];
        if (typeof stopMatchmaking === 'function') stopMatchmaking();
        closeModals();
        showPage('pg-room');
        hideBottomNav();
        renderRoom();
        toast('Room created! Share code: ' + payload.code, 'ok');
        break;

      case 'ROOM_JOINED':
        S.code    = payload.code;
        S.players = payload.players || [];
        S.isHost  = payload.isHost || false;
        S.game    = payload.game || S.game;
        if (typeof stopMatchmaking === 'function') stopMatchmaking();
        closeModals();
        showPage('pg-room');
        hideBottomNav();
        renderRoom();
        toast('Joined room ' + payload.code + '!', 'ok');
        break;

      case 'CHAT_HISTORY':
        if (payload.messages) {
          const ch = payload.channel ? payload.channel.replace('room:', '') : 'global';
          payload.messages.forEach(m => addChatMsg(ch, m.author, m.text));
        }
        break;

      case 'PLAYER_JOINED':
        if (payload.player) S.players.push(payload.player);
        renderRoom();
        toast(payload.player.name + ' joined! 👋', 'info');
        break;

      case 'PLAYER_LEFT':
        S.players = S.players.filter(p => p.name !== payload.name);
        renderRoom();
        toast(payload.name + ' left the room', 'warn');
        break;

      case 'PLAYER_READY': {
        const rp = S.players.find(p => p.name === payload.name);
        if (rp) { rp.ready = payload.ready; renderRoom(); }
        break;
      }

      case 'LEFT_ROOM':
        S.code    = '';
        S.players = [];
        S.isHost  = false;
        break;

      /* ── GAME EVENTS ── */
      case 'GAME_START':
        if (S.game === 'quiz') {
          // Show quiz setup to all players; host configures, guests wait
          showPage('pg-quiz-setup');
          hideBottomNav();
          if (typeof renderQuizSetup === 'function') renderQuizSetup();
        } else {
          _launchGame(S.game);
        }
        break;

      case 'QUIZ_LAUNCH':
        // Host pressed Start Quiz — tell all players to begin
        if (payload.questions) QZ.qs = payload.questions;
        if (payload.secs) S.quizSecs = payload.secs;
        if (typeof _launchQuiz === 'function') _launchQuiz();
        break;

      /* ── CHAT ── */
      case 'CHAT_MSG':
        addChatMsg(payload.channel || 'global', payload.author, payload.text);
        break;

      /* ── SCORE EVENTS ── */
      case 'REFLEX_SCORE':
        if (payload.name !== S.name) {
          (RF.bots = RF.bots || {})[payload.name] = (RF.bots[payload.name] || []);
          RF.bots[payload.name].push(payload.ms);
          renderRFBoard && renderRFBoard();
        }
        break;

      case 'TR_PROGRESS':
        if (payload.name !== S.name) {
          TR.prog[payload.name] = payload.chars;
          renderTRBars && renderTRBars();
        }
        break;

      case 'TR_FINISHED':
        if (payload.name !== S.name) {
          toast(payload.name + ' finished! (' + payload.wpm + ' WPM)', 'info');
        }
        break;

      case 'QUIZ_SCORE':
        if (payload.name !== S.name) {
          QZ.scores[payload.name] = payload.score;
          updateQZLB && updateQZLB();
        }
        break;

      /* ── GAME RESULTS ── */
      case 'GAME_END':
        // Server sends final results
        break;

      /* ── DRAW & GUESS ── */
      case 'DG_TURN_START':
        if (typeof dgOnTurnStart === 'function') dgOnTurnStart(payload);
        break;

      case 'DG_WORD_CHOSEN':
        if (typeof dgOnWordChosen === 'function') dgOnWordChosen(payload);
        break;

      case 'DG_DRAW':
        if (typeof dgOnDrawData === 'function') dgOnDrawData(payload);
        break;

      case 'DG_GUESS_RESULT':
        if (typeof dgOnGuessResult === 'function') dgOnGuessResult(payload);
        break;

      case 'DG_ROUND_END':
        if (typeof dgOnRoundEnd === 'function') dgOnRoundEnd(payload);
        break;

      case 'DG_HINT':
        if (typeof dgOnHintUpdate === 'function') dgOnHintUpdate(payload);
        break;

      /* ── ERROR ── */
      case 'ERROR':
        toast('Server: ' + payload.message, 'err');
        break;

      default:
        console.log('[WS] Unknown message type:', type);
    }
  },

  _setIndicator(state, label) {
    const dot   = document.getElementById('ws-dot');
    const lbl   = document.getElementById('ws-label');
    const note  = document.getElementById('land-ws-status');
    if (dot) { dot.className = 'ws-dot ' + state; }
    if (lbl) { lbl.textContent = label; }
    if (note) {
      const icons = { connected: '🟢', connecting: '🟡', disconnected: '🔴' };
      note.textContent = (icons[state] || '⚫') + ' ' + label;
    }
  }
};

/* ── OUTBOUND HELPERS (called by game modules) ── */

function wsSendReflexScore(ms) {
  ws.send('REFLEX_SCORE', { name: S.name, ms });
}

function wsSendTypeProgress(chars) {
  ws.send('TR_PROGRESS', { name: S.name, chars });
}

function wsSendQuizScore(score) {
  ws.send('QUIZ_SCORE', { name: S.name, score });
}

function wsSendChat(channel, text) {
  ws.send('CHAT_MSG', { channel, author: S.name, text });
}
