# NOOB.gg Backend

Node.js + WebSocket + Redis backend for NOOB.gg.

## Stack
- **Express** — HTTP server + REST endpoints
- **ws** — WebSocket server for real-time gameplay
- **ioredis** — Redis client for room state & chat history
- **Redis** — hosted on [Upstash](https://upstash.com) (free tier works)

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run Redis locally (optional — or use Upstash)
```bash
docker run -p 6379:6379 redis
# then set REDIS_URL=redis://localhost:6379 in .env
```

### 4. Start the server
```bash
npm run dev   # with nodemon (auto-restart)
npm start     # production
```

Server runs on `http://localhost:3001`

---

## Deploy to Railway

1. Push this `backend/` folder to GitHub (in your monorepo or separate repo)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **Redis** plugin inside Railway (free)
4. Set these environment variables in Railway dashboard:

| Variable | Value |
|---|---|
| `PORT` | `3001` (Railway sets this automatically) |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `REDIS_URL` | Auto-filled by Railway Redis plugin |
| `ROOM_TTL_SECONDS` | `1800` |
| `MAX_PLAYERS_PER_ROOM` | `8` |

5. Railway auto-deploys on every git push.

---

## Connect Frontend

In `js/config.js`, update:
```js
const WS_URL = 'wss://your-railway-app.up.railway.app/ws';
```

Then uncomment in `js/main.js`:
```js
ws.connect(WS_URL);
ws.send('AUTH', { name: v });
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check for Railway/Render |
| `GET` | `/rooms` | List public waiting rooms |

---

## WebSocket Message Reference

### Client → Server
| Type | Payload | Description |
|---|---|---|
| `AUTH` | `{ name }` | First message after connect |
| `CREATE_ROOM` | `{ game, roomType }` | Create a new room |
| `JOIN_ROOM` | `{ code }` | Join by 6-char code |
| `LEAVE_ROOM` | `{}` | Leave current room |
| `PLAYER_READY` | `{ ready }` | Toggle ready state |
| `START_GAME` | `{}` | Host starts the game |
| `CHAT_MSG` | `{ channel, text }` | Send chat message |
| `REFLEX_SCORE` | `{ ms }` | Reflex reaction time |
| `TR_PROGRESS` | `{ chars }` | Type Race chars typed |
| `TR_FINISHED` | `{ wpm }` | Type Race round complete |
| `QUIZ_SCORE` | `{ score }` | Quiz current score |
| `QUIZ_FINISHED` | `{}` | Quiz complete |
| `PAT_CLICK` | `{ score }` | Memory Lock score update |
| `WB_SCORE` | `{ score }` | Word Bomb score update |
| `PING` | `{}` | Keep-alive |

### Server → Client
| Type | Payload | Description |
|---|---|---|
| `AUTH_OK` | `{ name, chatHistory }` | Auth confirmed |
| `ROOM_CREATED` | `{ code, room }` | Room created |
| `ROOM_JOINED` | `{ code, room, players, isHost, game }` | Joined room |
| `LEFT_ROOM` | `{}` | Left room confirmed |
| `PLAYER_JOINED` | `{ player }` | Someone joined |
| `PLAYER_LEFT` | `{ name }` | Someone left |
| `PLAYER_READY` | `{ name, ready }` | Ready state changed |
| `GAME_START` | `{ game }` | Game is starting |
| `GAME_OVER` | `{ results, game }` | Game ended with rankings |
| `CHAT_MSG` | `{ id, channel, author, text, time }` | New chat message |
| `CHAT_HISTORY` | `{ channel, messages }` | History on join |
| `REFLEX_SCORE` | `{ name, ms }` | Another player's reflex |
| `TR_PROGRESS` | `{ name, chars }` | Another player's progress |
| `TR_FINISHED` | `{ name, wpm }` | Another player finished |
| `QUIZ_SCORE` | `{ name, score }` | Another player's quiz score |
| `PAT_SCORE` | `{ name, score }` | Another player's memory score |
| `WB_SCORE` | `{ name, score }` | Another player's word bomb score |
| `PONG` | `{ ts }` | Keep-alive response |
| `ERROR` | `{ message }` | Error message |
