# 🎮 NOOB.gg — Real-Time Multiplayer Arena

> *Where noobs become legends*

A browser-based multiplayer party game platform with 5 mini-games, live chat, friends, and leaderboards. Built for a Software Engineering course project.

---

## 📁 Project Structure

```
noob-gg/
│
├── index.html              ← App shell + all page/screen HTML
│
├── css/
│   ├── base.css            ← CSS variables, reset, typography
│   ├── components.css      ← Buttons, inputs, cards, toasts, modals, tabs
│   ├── layout.css          ← Sidebar, main area, bottom nav, page system
│   ├── pages.css           ← Landing, Lobby, Room, Chat, Friends, Results
│   ├── games.css           ← Quiz, Reflex, Word Bomb, Memory Lock, Type Race
│   └── responsive.css      ← Media queries (tablet, phone, tiny, touch)
│
└── js/
    ├── config.js           ← App constants, bot data, word dict, quiz bank
    ├── state.js            ← Global state object (S)
    ├── websocket.js        ← WS client + inbound/outbound message handlers
    ├── results.js          ← Results screen + podium rendering
    ├── main.js             ← App init, keyboard shortcuts, entry point
    │
    ├── ui/
    │   ├── toast.js        ← Toast notification system
    │   ├── nav.js          ← Page switching, sidebar, bottom nav
    │   ├── modal.js        ← Overlay/modal open/close
    │   ├── leaderboard.js  ← Leaderboard grid rendering
    │   ├── room.js         ← Room creation, joining, player list
    │   ├── chat.js         ← Chat channels, messages, bot sim
    │   └── friends.js      ← Friends list, profile panel, add friend
    │
    └── games/
        ├── quiz.js         ← Quiz Battle (5–15 questions, live standings)
        ├── reflex.js       ← Reflex Arena (5 rounds, reaction time)
        ├── wordbomb.js     ← Word Bomb (syllable validation, lives)
        ├── memory.js       ← Memory Lock (pattern grid, 12 levels)
        └── typerace.js     ← Type Race (3 escalating rounds, WPM)
```

---

## 🎮 Games

| Game | Mode | Win Condition |
|------|------|---------------|
| 🎯 Reflex Arena | 5 rounds | Lowest reaction time (ms) |
| 💣 Word Bomb | Lives-based | Last player standing |
| 🧠 Memory Lock | 12 levels | Highest round reached |
| ⌨️ Type Race | 3 rounds | Highest average WPM |
| 📋 Quiz Battle | 5–15 questions | Most points (speed bonus) |

---

## 🔌 Backend Integration

All integration points are marked with `BACKEND INTEGRATION:` comments in the JS files.

### WebSocket Events

**Client → Server**
```json
{ "type": "AUTH",         "payload": { "name": "PlayerName" } }
{ "type": "CREATE_ROOM",  "payload": { "game": "reflex", "type": "public" } }
{ "type": "JOIN_ROOM",    "payload": { "code": "ABC123" } }
{ "type": "PLAYER_READY", "payload": { "ready": true } }
{ "type": "START_GAME",   "payload": { "game": "reflex" } }
{ "type": "LEAVE_ROOM",   "payload": { "code": "ABC123" } }
{ "type": "CHAT_MSG",     "payload": { "channel": "global", "author": "...", "text": "..." } }
{ "type": "REFLEX_SCORE", "payload": { "name": "...", "ms": 245 } }
{ "type": "TR_PROGRESS",  "payload": { "name": "...", "chars": 120 } }
{ "type": "QUIZ_SCORE",   "payload": { "name": "...", "score": 1800 } }
{ "type": "WB_WORD",      "payload": { "word": "STONE", "syl": "ST" } }
```

**Server → Client**
```json
{ "type": "ROOM_CREATED",   "payload": { "code": "ABC123" } }
{ "type": "ROOM_JOINED",    "payload": { "code": "...", "players": [...], "isHost": false } }
{ "type": "PLAYER_JOINED",  "payload": { "player": { "name": "...", "color": "..." } } }
{ "type": "PLAYER_LEFT",    "payload": { "name": "..." } }
{ "type": "PLAYER_READY",   "payload": { "name": "...", "ready": true } }
{ "type": "GAME_START",     "payload": {} }
{ "type": "CHAT_MSG",       "payload": { "channel": "...", "author": "...", "text": "..." } }
{ "type": "REFLEX_SCORE",   "payload": { "name": "...", "ms": 312 } }
{ "type": "TR_PROGRESS",    "payload": { "name": "...", "chars": 85 } }
{ "type": "QUIZ_SCORE",     "payload": { "name": "...", "score": 2400 } }
{ "type": "ERROR",          "payload": { "message": "Room not found" } }
```

### To Connect

1. Set `WS_URL` in `js/config.js` to your server URL
2. In `js/main.js`, uncomment:
   ```js
   ws.connect(WS_URL);
   ws.send('AUTH', { name: v });
   ```
3. Build your Node.js / Go / Python WebSocket server handling the events above

### Suggested Backend Stack
- **Node.js** + `ws` or `socket.io`
- **Redis** for room state (pub/sub across instances)
- **JWT** for auth tokens
- Deploy on **Railway**, **Render**, or **Fly.io**

---

## 🚀 Running Locally

```bash
# Just open in browser — no build step needed
open index.html

# Or serve with any static server:
npx serve .
python3 -m http.server 3000
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--c1` | `#00e5ff` | Cyan — primary accent |
| `--c2` | `#ff3d6b` | Red — danger / Reflex |
| `--c3` | `#ffe033` | Yellow — gold / Quiz |
| `--c4` | `#39ff94` | Green — success |
| `--c5` | `#b47fff` | Purple — Memory Lock |
| `--c6` | `#ff8c42` | Orange — Word Bomb |

Fonts: **Orbitron** (headings), **DM Sans** (body), **JetBrains Mono** (mono/data)

---

## 👨‍💻 Authors

Built for Software Engineering — Semester Project, 2026
