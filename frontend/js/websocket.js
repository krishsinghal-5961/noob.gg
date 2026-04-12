/* ================================================================
   websocket.js — WebSocket Client Layer
   
   BACKEND INTEGRATION POINT:
   Replace the mock functions below with real WS message handlers.
   All game modules should call ws.send() instead of directly
   mutating state for multiplayer events.
   
   Message format (JSON):
   { type: 'EVENT_TYPE', payload: { ...data } }
================================================================ */
'use strict';

const ws = {
  socket:      null,
  connected:   false,
  reconnectMs: 2000,
  _reconnectTimer: null,

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
  send(type, payload = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WS] Not connected — message dropped:', type);
    }
  },

  /* ── DISCONNECT ── */
  disconnect() {
    clearTimeout(this._reconnectTimer);
    if (this.socket) { this.socket.close(); this.socket = null; }
  },

  /* ── PRIVATE HANDLERS ── */
  _onOpen() {
    this.connected = true;
    console.log('[WS] Connected');
    this._setIndicator('connected', 'Online');
    toast('Connected to server 🟢', 'ok');
    // Authenticate after connect
    if (S.name) ws.send('AUTH', { name: S.name });
  },

  _onClose() {
    this.connected = false;
    this.socket = null;
    console.log('[WS] Disconnected — retrying in', this.reconnectMs, 'ms');
    this._setIndicator('connecting', 'Reconnecting...');
    this._reconnectTimer = setTimeout(() => ws.connect(WS_URL), this.reconnectMs);
    this.reconnectMs = Math.min(this.reconnectMs * 1.5, 15000); // exponential backoff
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

    /* ── INBOUND MESSAGE HANDLERS ──
       Wire these up as you build the backend.
       Each handler maps a server event to a UI update.
    ── */
    switch (type) {

      /* Room events */
      case 'ROOM_CREATED':
        S.code = payload.code;
        S.isHost = true;
        renderRoom();
        break;

      case 'ROOM_JOINED':
        S.code = payload.code;
        S.players = payload.players;
        S.isHost = payload.isHost;
        renderRoom();
        break;

      case 'PLAYER_JOINED':
        S.players.push(payload.player);
        renderRoom();
        toast(payload.player.name + ' joined! 👋', 'info');
        break;

      case 'PLAYER_LEFT':
        S.players = S.players.filter(p => p.name !== payload.name);
        renderRoom();
        toast(payload.name + ' left the room', 'warn');
        break;

      case 'PLAYER_READY':
        const rp = S.players.find(p => p.name === payload.name);
        if (rp) { rp.ready = payload.ready; renderRoom(); }
        break;

      /* Game events */
      case 'GAME_START':
        startGame();
        break;

      /* Chat */
      case 'CHAT_MSG':
        addBotMsg(payload.channel, payload.author, payload.text);
        break;

      /* Reflex */
      case 'REFLEX_SCORE':
        // Another player's reflex time — update bot tracking
        if (payload.name !== S.name) {
          (RF.bots[payload.name] = RF.bots[payload.name] || []).push(payload.ms);
          renderRFBoard();
        }
        break;

      /* Type Race progress */
      case 'TR_PROGRESS':
        if (payload.name !== S.name) {
          TR.prog[payload.name] = payload.chars;
          renderTRBars();
        }
        break;

      /* Quiz */
      case 'QUIZ_SCORE':
        if (payload.name !== S.name) {
          QZ.scores[payload.name] = payload.score;
          updateQZLB();
        }
        break;

      /* Error */
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

/**
 * Broadcast a reflex score to the server.
 * @param {number} ms - reaction time in milliseconds
 */
function wsSendReflexScore(ms) {
  ws.send('REFLEX_SCORE', { name: S.name, ms });
}

/**
 * Broadcast typing progress to the server.
 * @param {number} chars - characters typed so far
 */
function wsSendTypeProgress(chars) {
  ws.send('TR_PROGRESS', { name: S.name, chars });
}

/**
 * Broadcast a quiz answer score.
 * @param {number} score - current total score
 */
function wsSendQuizScore(score) {
  ws.send('QUIZ_SCORE', { name: S.name, score });
}

/**
 * Send a chat message to the server.
 * @param {string} channel
 * @param {string} text
 */
function wsSendChat(channel, text) {
  ws.send('CHAT_MSG', { channel, author: S.name, text });
}
