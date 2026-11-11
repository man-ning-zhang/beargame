import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  ACTIONS,
  SEAT_GRACE_MS,
  addChat,
  applyPersonal,
  changeNote,
  createRoom,
  detachSocket,
  joinRoom,
  makeRoomCode,
  normalizeCode,
  answerClozeFor,
  nextClozeFor,
  performAction,
  performStudyGrade,
  performStudyLangChange,
  performStudyLevelChange,
  performStudyLimitChange,
  placeMark,
  publicRoom,
  requestRematch,
  setOutfit,
  settleActivity,
  startActivity,
  systemChat,
  tickRoom,
  vacateSeat,
} from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const TICK_MS = 4000;
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ROOMS = 2000;

/** @type {Map<string, ReturnType<typeof createRoom>>} */
const rooms = new Map();
/** @type {Map<string, {count: number, resetAt: number}>} */
const ipHits = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function htmlResponse(res, status, body, headOnly = false) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(headOnly ? undefined : body);
}

function serveIndex(res, headOnly = false) {
  const file = path.join(DIST, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) {
      htmlResponse(
        res,
        503,
        `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
        <title>一起养只熊</title>
        <body style="font-family:system-ui;background:#141522;color:#fff8ec;display:grid;place-items:center;min-height:100vh;margin:0">
          <div style="max-width:460px;padding:32px;text-align:center">
            <div style="font-size:52px">🐻</div>
            <h1 style="font-family:Georgia,serif">一起养只熊</h1>
            <p style="line-height:1.8;color:#c9bfb4">前端还没有构建。<br>先运行 <code style="background:#2a2b3d;padding:2px 6px;border-radius:6px">npm run build</code>，再重启服务器。</p>
          </div>
        </body></html>`,
        headOnly,
      );
      return;
    }
    const cache = 'no-cache';
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': cache,
      'content-length': data.length,
    });
    res.end(headOnly ? undefined : data);
  });
}

function serveStatic(req, res) {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    jsonResponse(res, 405, { error: 'method_not_allowed' });
    return;
  }
  const headOnly = method === 'HEAD';
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    jsonResponse(res, 400, { error: 'bad_request' });
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    serveIndex(res, headOnly);
    return;
  }

  const relative = pathname.replace(/^\/+/, '');
  const filePath = path.resolve(DIST, relative);
  if (!filePath.startsWith(DIST + path.sep)) {
    jsonResponse(res, 403, { error: 'forbidden' });
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      // The app lives at "/" with a ?room= query; anything else is a 404.
      jsonResponse(res, 404, { error: 'not_found' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const immutable = /\/assets\//.test(filePath) && /-[A-Za-z0-9_-]{8,}\./.test(filePath);
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      'content-length': stat.size,
      'x-content-type-options': 'nosniff',
    });
    if (headOnly) {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

const MUSIC_CACHE = new Map();
const MUSIC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function fetchMusic(kind, id) {
  const endpoint =
    kind === 'album'
      ? `https://music.163.com/api/album/${id}`
      : kind === 'playlist'
        ? `https://music.163.com/api/playlist/detail?id=${id}`
        : `https://music.163.com/api/song/detail?ids=%5B${id}%5D`;

  const response = await fetch(endpoint, {
    headers: { 'user-agent': MUSIC_UA, referer: 'https://music.163.com/' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const data = await response.json();

  if (kind === 'album' && data.album) {
    return {
      title: data.album.name,
      subtitle: data.album.artist?.name ?? '',
      cover: data.album.picUrl ?? '',
    };
  }
  if (kind === 'playlist' && data.playlist) {
    return {
      title: data.playlist.name,
      subtitle: `${data.playlist.trackCount ?? 0} 首`,
      cover: data.playlist.coverImgUrl ?? '',
    };
  }
  const song = data.songs?.[0];
  if (!song) return null;
  return {
    title: song.name,
    subtitle: (song.artists ?? []).map((artist) => artist.name).join(' / '),
    cover: song.album?.picUrl ?? '',
  };
}

const STROKE_CACHE = new Map();
const STROKE_DATA_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

async function fetchStroke(char) {
  const response = await fetch(`${STROKE_DATA_URL}/${encodeURIComponent(char)}.json`, {
    headers: { 'user-agent': 'bear-together/1.0 (personal flashcard project)' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  return response.json();
}

const server = http.createServer((req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('x-frame-options', 'DENY');

  if (req.url === '/healthz') {
    jsonResponse(res, 200, { ok: true, rooms: rooms.size, uptime: Math.round(process.uptime()) });
    return;
  }

  // Stroke-order data for one Chinese character, proxied so the browser never
  // has to reach a CDN (which can be slow or blocked in China).
  if (req.url.startsWith('/api/stroke/')) {
    const char = decodeURIComponent(req.url.slice('/api/stroke/'.length)).trim();
    if (!/^[\u3400-\u9fff]$/.test(char)) {
      jsonResponse(res, 400, { ok: false });
      return;
    }
    const cached = STROKE_CACHE.get(char);
    if (cached) {
      jsonResponse(res, 200, cached);
      return;
    }
    fetchStroke(char)
      .then((data) => {
        if (!data) {
          jsonResponse(res, 502, { ok: false });
          return;
        }
        if (STROKE_CACHE.size > 4000) STROKE_CACHE.clear();
        STROKE_CACHE.set(char, data);
        jsonResponse(res, 200, data);
      })
      .catch(() => jsonResponse(res, 502, { ok: false }));
    return;
  }

  // Song metadata for shared NetEase links. NetEase has no public API and
  // blocks browser CORS, so the server looks it up and caches the answer.
  if (req.url.startsWith('/api/music')) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const kind = ['song', 'album', 'playlist'].includes(params.get('kind'))
      ? params.get('kind')
      : 'song';
    const id = String(params.get('id') ?? '');
    if (!/^\d{1,20}$/.test(id)) {
      jsonResponse(res, 400, { ok: false });
      return;
    }
    const key = `${kind}:${id}`;
    const cached = MUSIC_CACHE.get(key);
    if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
      jsonResponse(res, 200, { ok: true, ...cached.data });
      return;
    }
    fetchMusic(kind, id)
      .then((data) => {
        if (!data) {
          jsonResponse(res, 502, { ok: false });
          return;
        }
        if (MUSIC_CACHE.size > 400) MUSIC_CACHE.clear();
        MUSIC_CACHE.set(key, { at: Date.now(), data });
        jsonResponse(res, 200, { ok: true, ...data });
      })
      .catch(() => jsonResponse(res, 502, { ok: false }));
    return;
  }

  serveStatic(req, res);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

function send(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(room) {
  // The room snapshot is shared, but flashcard progress is per player, so each
  // seat gets its own view of the same state. A seat can have several device
  // sockets (phone + computer), and each one tracks whether it has the latest
  // personal blob independently. The raw personal copy only rides along when it
  // changed for that device, so the browser can mirror it into localStorage.
  const now = Date.now();
  for (const seat of ['host', 'guest']) {
    const player = room.seats[seat];
    if (!player) continue;
    const personal = room.personal?.[seat];
    for (const ws of player.sockets) {
      if (!ws || ws.readyState !== 1) continue;
      const includePersonal = Boolean(personal) && ws.personalRev !== personal.rev;
      const payload = JSON.stringify({
        type: 'state',
        room: publicRoom(room, now, seat, { includePersonal }),
      });
      ws.send(payload);
      if (includePersonal) ws.personalRev = personal.rev;
    }
  }
}

function currentRoom(ws) {
  if (!ws.roomCode) return null;
  return rooms.get(ws.roomCode) ?? null;
}

function sendError(ws, code, message) {
  send(ws, { type: 'error', code, message });
}

function allowSocketMessage(ws) {
  const now = Date.now();
  if (now - ws.rateStart > 1000) {
    ws.rateStart = now;
    ws.rateCount = 0;
  }
  ws.rateCount += 1;
  return ws.rateCount <= 25;
}

function allowJoinAttempt(ip) {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 40;
}

function bindSocket(ws, room, seat, token, extra = {}) {
  const player = room.seats[seat];
  if (!player) return false;

  // A person may connect from more than one device (phone + computer). Keep
  // every live socket on the seat instead of replacing the previous one, and
  // prune any that are no longer open so a refresh cannot leave zombies behind.
  player.sockets = player.sockets.filter((sock) => sock === ws || (sock && sock.readyState === 1));
  if (!player.sockets.includes(ws)) player.sockets.push(ws);
  player.online = true;
  player.lastSeen = Date.now();
  ws.roomCode = room.code;
  ws.seat = seat;
  ws.token = token;

  send(ws, { type: 'joined', code: room.code, seat, token, ...extra });
  broadcast(room);
  return true;
}

function leaveCurrentRoom(ws, reason, now = Date.now()) {
  const room = currentRoom(ws);
  const seat = ws.seat;
  if (!room || !seat) {
    ws.roomCode = null;
    ws.seat = null;
    return;
  }
  const player = room.seats[seat];
  const name = player?.name ?? '🐻';
  // Remove just this device from the seat; the other sockets (if any) stay.
  const idx = player?.sockets.indexOf(ws);
  if (idx !== -1) player.sockets.splice(idx, 1);

  const otherSeat = seat === 'host' ? 'guest' : 'host';
  if (player && player.sockets.length === 0) {
    // The last device for this person left: free the seat entirely.
    vacateSeat(room, seat, now);
    if (room.seats[otherSeat]) {
      systemChat(room, reason === 'leave' ? 'leave' : 'expired', { name }, now);
    }
  } else if (player) {
    // Other devices of the same person are still here; keep the seat warm.
    player.lastSeen = now;
  }
  broadcast(room);
  ws.roomCode = null;
  ws.seat = null;
}

function handleCreate(ws, msg) {
  if (!allowJoinAttempt(ws.ip)) {
    sendError(ws, 'rate_limited', '慢一点点，小熊有点跟不上了。');
    return;
  }
  if (ws.roomCode) leaveCurrentRoom(ws, 'leave');

  if (rooms.size >= MAX_ROOMS) {
    sendError(ws, 'busy', '小屋太多了，等一会儿再试试。');
    return;
  }

  const code = makeRoomCode((candidate) => rooms.has(candidate));
  const room = createRoom(code);
  const result = joinRoom(room, { name: msg.name, token: msg.token, now: Date.now() });
  if (!result.ok) {
    sendError(ws, 'full', '这间小屋已经有两个人啦。');
    return;
  }
  rooms.set(code, room);
  bindSocket(ws, room, result.seat, result.token);
  console.log(`[room] ${code} created by ${room.seats[result.seat].name}`);
}

function handleJoin(ws, msg) {
  if (!allowJoinAttempt(ws.ip)) {
    sendError(ws, 'rate_limited', '慢一点点，小熊有点跟不上了。');
    return;
  }
  const code = normalizeCode(msg.code);
  if (!code) {
    sendError(ws, 'invalid_code', '房间号是 4 位字母或数字。');
    return;
  }
  // The code is the relationship's address: if the server forgot the room
  // (redeploy, free-tier sleep), re-light it under the same code instead of
  // sending the player back to the lobby.
  let room = rooms.get(code);
  let reborn = false;
  if (!room) {
    if (rooms.size >= MAX_ROOMS) {
      sendError(ws, 'busy', '小屋太多了，等一会儿再试试。');
      return;
    }
    room = createRoom(code);
    rooms.set(code, room);
    reborn = true;
  }
  if (ws.roomCode && ws.roomCode !== code) {
    leaveCurrentRoom(ws, 'leave');
  }

  const result = joinRoom(room, { name: msg.name, token: msg.token, now: Date.now() });
  if (!result.ok) {
    sendError(ws, 'room_full', '这间小屋已经有两个人啦。');
    return;
  }
  if (reborn) systemChat(room, 'reborn', { code: room.code }, Date.now());
  bindSocket(ws, room, result.seat, result.token, { reborn });
  console.log(
    `[room] ${code} ${result.reconnected ? 'rejoined' : 'joined'} by ${room.seats[result.seat].name} (${result.seat})${reborn ? ' · re-lit' : ''}`,
  );
}

function handleMessage(ws, raw) {
  if (!allowSocketMessage(ws)) {
    send(ws, { type: 'toast', code: 'socket_slow' });
    return;
  }

  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }
  if (!msg || typeof msg.type !== 'string') return;

  switch (msg.type) {
    case 'create': {
      handleCreate(ws, msg);
      return;
    }
    case 'join': {
      handleJoin(ws, msg);
      return;
    }
    case 'leave': {
      leaveCurrentRoom(ws, 'leave');
      ws.roomCode = null;
      ws.seat = null;
      send(ws, { type: 'left' });
      return;
    }
    case 'ping': {
      send(ws, { type: 'pong', at: Date.now() });
      return;
    }
    default:
      break;
  }

  const room = currentRoom(ws);
  const seat = ws.seat;
  const player = room?.seats[seat];
  if (!room || !seat || !player || !player.sockets.includes(ws)) {
    sendError(ws, 'not_in_room', '先进到一间小屋里吧。');
    return;
  }

  const now = Date.now();
  // A chore may have just finished between ticks; settle it before handling
  // this message so the next click is never blocked by a stale timer.
  if (settleActivity(room, now)) broadcast(room);

  if (msg.type === 'action') {
    if (!Object.hasOwn(ACTIONS, msg.action)) {
      sendError(ws, 'invalid_action', '小熊不知道这个动作。');
      return;
    }
    const result = performAction(room, seat, msg.action, now);
    if (result.ok) {
      broadcast(room);
    } else if (result.error === 'cooldown') {
      const wait = Math.max(1, Math.ceil((result.readyAt - now) / 1000));
      send(ws, { type: 'toast', code: 'action_cooldown', wait });
    } else if (result.error === 'busy') {
      send(ws, { type: 'toast', code: 'activity_busy' });
    }
    return;
  }

  if (msg.type === 'activity') {
    const result = startActivity(room, seat, String(msg.id ?? ''), String(msg.room ?? ''), now);
    if (result.ok) {
      broadcast(room);
    } else {
      const code =
        result.error === 'busy'
          ? 'activity_busy'
          : result.error === 'missing_ingredients'
            ? 'activity_ingredients'
            : 'invalid_action';
      send(ws, { type: 'toast', code });
    }
    return;
  }

  if (msg.type === 'outfit') {
    const result = setOutfit(room, seat, String(msg.who ?? ''), String(msg.outfit ?? ''), now);
    if (result.changed) broadcast(room);
    else if (!result.ok) sendError(ws, 'invalid_action', '这套衣服不在衣柜里。');
    return;
  }

  if (msg.type === 'chat') {
    const result = addChat(room, seat, { text: msg.text, emote: msg.emote }, now);
    if (result.ok) {
      broadcast(room);
    } else if (result.error === 'slow') {
      send(ws, { type: 'toast', code: 'chat_slow' });
    }
    return;
  }

  if (msg.type === 'move') {
    const result = placeMark(room, seat, Number(msg.index), now);
    if (result.ok) {
      broadcast(room);
    } else if (result.error === 'waiting') {
      send(ws, { type: 'toast', code: 'game_waiting' });
    } else if (result.error === 'not_turn') {
      send(ws, { type: 'toast', code: 'game_not_turn' });
    }
    return;
  }

  if (msg.type === 'rematch') {
    const result = requestRematch(room, seat, now);
    if (result.ok) {
      broadcast(room);
    } else if (result.error === 'in_progress') {
      send(ws, { type: 'toast', code: 'game_in_progress' });
    }
    return;
  }

  if (msg.type === 'study') {
    if (msg.action === 'cloze') {
      send(ws, { type: 'cloze', question: nextClozeFor(room, seat, now) });
      return;
    }

    if (msg.action === 'clozeAnswer') {
      const result = answerClozeFor(room, seat, msg.key, msg.choice, now);
      if (result.ok) {
        broadcast(room);
        send(ws, {
          type: 'clozeResult',
          correct: result.correct,
          answer: result.answer,
          interval: result.interval,
          iv: result.iv,
        });
      } else {
        send(ws, { type: 'toast', code: 'study_invalid' });
      }
      return;
    }

    const result =
      msg.action === 'level'
        ? performStudyLevelChange(room, seat, msg.level, now)
        : msg.action === 'lang'
          ? performStudyLangChange(room, seat, String(msg.lang ?? ''), now)
          : msg.action === 'limit'
            ? performStudyLimitChange(room, seat, Number(msg.limit), now)
            : performStudyGrade(room, seat, msg.key ?? msg.word, msg.grade, now);
    if (result.ok) {
      broadcast(room);
    } else {
      send(ws, {
        type: 'toast',
        code: msg.action === 'level' ? 'level_invalid' : 'study_invalid',
      });
    }
    return;
  }

  if (msg.type === 'personal') {
    const result = applyPersonal(room, seat, msg.data, now);
    if (result.ok) broadcast(room);
    return;
  }

  if (msg.type === 'note') {
    const result = changeNote(room, seat, msg.action, msg.payload, now);
    if (result.ok) {
      broadcast(room);
      send(ws, { type: 'noteOk', action: msg.action, id: result.note?.id ?? msg.payload?.id });
    } else {
      send(ws, { type: 'toast', code: msg.error === 'full' ? 'note_full' : 'note_invalid' });
    }
  }
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.roomCode = null;
  ws.seat = null;
  ws.token = null;
  ws.rateStart = Date.now();
  ws.rateCount = 0;
  ws.ip = req.socket.remoteAddress || 'unknown';

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => handleMessage(ws, data));

  ws.on('close', () => {
    const room = currentRoom(ws);
    const seat = ws.seat;
    if (room && seat) {
      detachSocket(room, seat, ws, Date.now());
      broadcast(room);
    }
    ws.roomCode = null;
    ws.seat = null;
  });

  ws.on('error', () => {
    // The close handler performs the cleanup.
  });
});

server.on('upgrade', (req, socket, head) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    socket.destroy();
    return;
  }
  if (pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

const tickTimer = setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (tickRoom(room, now)) broadcast(room);
  }
}, TICK_MS);

const cleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [code, room] of rooms) {
    let changed = false;
    for (const seat of ['host', 'guest']) {
      const player = room.seats[seat];
      if (player && !player.online && now - player.lastSeen > SEAT_GRACE_MS) {
        vacateSeat(room, seat, now);
        changed = true;
      }
    }
    if (changed) {
      systemChat(room, 'expired', {}, now);
      broadcast(room);
    }
    if (!room.seats.host && !room.seats.guest && now - room.lastActive > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }

  for (const [ip, hit] of ipHits) {
    if (now > hit.resetAt) ipHits.delete(ip);
  }
}, 30_000);

const heartbeatTimer = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

function shutdown(signal) {
  console.log(`\n[bear] ${signal} received, closing up the cabin.`);
  clearInterval(tickTimer);
  clearInterval(cleanupTimer);
  clearInterval(heartbeatTimer);
  for (const ws of wss.clients) ws.close(1001, 'server shutting down');
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[bear] Port ${PORT} is already in use. Stop the other server or set PORT=...`);
  } else {
    console.error('[bear] Server error:', error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`\n🐻  Bear Together server`);
  console.log(`    Local:   http://localhost:${PORT}`);
  console.log(`    Health:  http://localhost:${PORT}/healthz`);
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('    Frontend not built yet — run `npm run build` (or use `npm run dev`).');
  }
  console.log('');
});
