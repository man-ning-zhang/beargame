/**
 * Pure room / bear / tic-tac-toe logic.
 * No networking lives here so it can be unit-tested directly.
 */

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SEAT_GRACE_MS = 5 * 60 * 1000;

export const ACTIONS = {
  feed: {
    label: '喂蜂蜜',
    cooldown: 10_000,
    verb: '喂了小熊一勺蜂蜜 🍯',
    effects: { fullness: 26, mood: 5, energy: 1, bond: 2 },
  },
  play: {
    label: '玩毛线',
    cooldown: 14_000,
    verb: '陪小熊滚起了毛线球 🧶',
    effects: { fullness: -5, mood: 20, energy: -12, bond: 3 },
  },
  hug: {
    label: '抱抱',
    cooldown: 25_000,
    verb: '把小熊抱进了怀里 🫂',
    effects: { fullness: -2, mood: 12, energy: 2, bond: 4 },
  },
  sleep: {
    label: '哄睡',
    cooldown: 60_000,
    verb: '轻轻哄小熊睡了一觉 🌙',
    effects: { fullness: -4, mood: 3, energy: 35, bond: 1 },
  },
  pet: {
    label: '摸摸头',
    cooldown: 3_000,
    verb: '摸了摸小熊的脑袋 🤎',
    effects: { mood: 4, bond: 1 },
  },
};

export const BOND_LEVELS = [
  { min: 0, name: '初次见面' },
  { min: 30, name: '慢慢熟悉' },
  { min: 90, name: '亲密无间' },
  { min: 180, name: '心有灵犀' },
  { min: 320, name: '命中注定' },
];

const MAX_LOG = 24;
const MAX_CHAT = 60;
const MAX_NAME = 12;
const MAX_CHAT_TEXT = 120;

const GAME_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function stripControlCharacters(value) {
  return Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.codePointAt(0);
      return code > 31 && code !== 127;
    })
    .join('');
}

export function sanitizeName(raw) {
  const text = Array.from(stripControlCharacters(raw).trim()).slice(0, MAX_NAME).join('');
  return text || '小熊朋友';
}

export function normalizeCode(raw) {
  const text = String(raw ?? '').trim();
  const linkMatch = text.match(/[?&]room=([A-Za-z0-9]{4,10})/i);
  if (!linkMatch && (text.includes('/') || text.includes('?') || text.includes(':'))) {
    return '';
  }
  const candidate = (linkMatch ? linkMatch[1] : text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (candidate.length < 4) return '';
  const code = candidate.slice(0, 4);
  if (!Array.from(code).every((char) => ROOM_CODE_ALPHABET.includes(char))) return '';
  return code;
}

export function makeToken(provided) {
  if (typeof provided === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(provided)) {
    return provided;
  }
  return globalThis.crypto.randomUUID().replaceAll('-', '');
}

export function makeRoomCode(isTaken) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let code = '';
    for (let i = 0; i < 4; i += 1) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not allocate a room code');
}

function freshGame(starter = 'host', round = 1, scores = { host: 0, guest: 0 }) {
  return {
    board: Array(9).fill(null),
    starter,
    turn: starter,
    winner: null,
    line: [],
    lastMove: null,
    round,
    scores: { ...scores },
  };
}

export function createRoom(code, now = Date.now()) {
  return {
    code,
    createdAt: now,
    lastActive: now,
    lastTick: now,
    seats: { host: null, guest: null },
    stats: { fullness: 72, mood: 76, energy: 70, bond: 0 },
    cooldowns: {},
    log: [],
    chat: [],
    game: freshGame(),
    seq: 1,
  };
}

export function opponentOf(seat) {
  return seat === 'host' ? 'guest' : 'host';
}

function findSeatByToken(room, token) {
  for (const seat of ['host', 'guest']) {
    if (room.seats[seat]?.token === token) return seat;
  }
  return null;
}

function seatIsFree(room, seat, now) {
  const player = room.seats[seat];
  if (!player) return true;
  return !player.online && now - player.lastSeen > SEAT_GRACE_MS;
}

function addSystemChat(room, text, now) {
  room.chat.push({
    id: room.seq++,
    at: now,
    seat: 'system',
    name: '小熊',
    text,
    emote: '',
    kind: 'system',
  });
  if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
}

export function systemChat(room, text, now = Date.now()) {
  addSystemChat(room, text, now);
}

/**
 * Join or reconnect a player.
 * @returns {{ok: true, seat: string, token: string, reconnected: boolean, replaced: boolean}
 *          | {ok: false, error: 'full'}}
 */
export function joinRoom(room, { name, token, now = Date.now() } = {}) {
  const cleanName = sanitizeName(name);
  const safeToken = makeToken(token);
  const nowMs = now;

  const existingSeat = findSeatByToken(room, safeToken);
  if (existingSeat) {
    const player = room.seats[existingSeat];
    player.name = cleanName;
    player.online = true;
    player.lastSeen = nowMs;
    room.lastActive = nowMs;
    return { ok: true, seat: existingSeat, token: safeToken, reconnected: true, replaced: false };
  }

  const otherOnlineBefore = ['host', 'guest'].some((seat) => room.seats[seat]?.online);
  let seat = null;
  if (seatIsFree(room, 'host', nowMs)) seat = 'host';
  else if (seatIsFree(room, 'guest', nowMs)) seat = 'guest';
  if (!seat) return { ok: false, error: 'full' };

  const replaced = Boolean(room.seats[seat]);
  if (replaced) {
    // A different pair is now in the room; start their scoreboard from scratch.
    room.game = freshGame('host');
  }
  room.seats[seat] = {
    token: safeToken,
    name: cleanName,
    online: true,
    lastSeen: nowMs,
    lastChatAt: 0,
    joinedAt: nowMs,
    ws: null,
  };
  room.lastActive = nowMs;

  if (otherOnlineBefore) {
    addSystemChat(room, `${cleanName} 推门进来啦，小熊开心地转了个圈。`, nowMs);
  }

  return { ok: true, seat, token: safeToken, reconnected: false, replaced };
}

/** Mark a socket as gone but keep the seat warm for a quick reconnect. */
export function markOffline(room, seat, now = Date.now()) {
  const player = room.seats[seat];
  if (!player) return false;
  player.online = false;
  player.lastSeen = now;
  player.ws = null;
  room.lastActive = now;
  return true;
}

/** Explicitly leave / expire a seat. */
export function vacateSeat(room, seat, now = Date.now()) {
  if (!room.seats[seat]) return false;
  room.seats[seat] = null;
  room.game = freshGame('host');
  room.lastActive = now;
  return true;
}

export function touchRoom(room, now = Date.now()) {
  room.lastActive = now;
}

/** Advance hunger / mood / energy. Decay pauses while nobody is online. */
export function tickRoom(room, now = Date.now()) {
  const hostOnline = Boolean(room.seats.host?.online);
  const guestOnline = Boolean(room.seats.guest?.online);
  const anyoneOnline = hostOnline || guestOnline;
  const elapsed = clamp((now - room.lastTick) / 1000, 0, 30);
  room.lastTick = now;

  if (!anyoneOnline || elapsed <= 0) return false;

  const stats = room.stats;
  stats.fullness = clamp(stats.fullness - 0.05 * elapsed, 0, 100);
  stats.energy = clamp(stats.energy - 0.03 * elapsed, 0, 100);

  let moodDelta = -0.02 * elapsed;
  if (stats.fullness < 25) moodDelta -= 0.03 * elapsed;
  if (hostOnline && guestOnline) moodDelta += 0.012 * elapsed;
  stats.mood = clamp(stats.mood + moodDelta, 0, 100);

  if (hostOnline && guestOnline) {
    stats.bond = clamp(stats.bond + 0.01 * elapsed, 0, 999);
  }

  room.lastActive = now;
  return true;
}

function pushLog(room, entry) {
  room.log.unshift(entry);
  if (room.log.length > MAX_LOG) room.log = room.log.slice(0, MAX_LOG);
  return entry;
}

export function performAction(room, seat, actionId, now = Date.now()) {
  const config = ACTIONS[actionId];
  const player = room.seats[seat];
  if (!config || !player || !player.online) {
    return { ok: false, error: 'invalid' };
  }

  const readyAt = room.cooldowns[actionId] ?? 0;
  if (now < readyAt) {
    return { ok: false, error: 'cooldown', readyAt };
  }

  for (const [stat, delta] of Object.entries(config.effects)) {
    if (stat === 'bond') {
      room.stats.bond = clamp(room.stats.bond + delta, 0, 999);
    } else {
      room.stats[stat] = clamp(room.stats[stat] + delta, 0, 100);
    }
  }

  room.cooldowns[actionId] = now + config.cooldown;
  const entry = pushLog(room, {
    id: room.seq++,
    at: now,
    seat,
    name: player.name,
    action: actionId,
    text: `${player.name} ${config.verb}`,
  });
  room.lastActive = now;
  return { ok: true, entry };
}

export function addChat(room, seat, { text, emote } = {}, now = Date.now()) {
  const player = room.seats[seat];
  if (!player || !player.online) return { ok: false, error: 'invalid' };
  if (now - player.lastChatAt < 450) return { ok: false, error: 'slow' };

  const cleanText = Array.from(stripControlCharacters(text).trim()).slice(0, MAX_CHAT_TEXT).join('');
  const cleanEmote = typeof emote === 'string' && emote.length <= 8 ? emote : '';
  if (!cleanText && !cleanEmote) return { ok: false, error: 'empty' };

  player.lastChatAt = now;
  const message = {
    id: room.seq++,
    at: now,
    seat,
    name: player.name,
    text: cleanText,
    emote: cleanEmote,
    kind: 'chat',
  };
  room.chat.push(message);
  if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
  room.lastActive = now;
  return { ok: true, message };
}

function scanBoard(board) {
  for (const line of GAME_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
}

export function placeMark(room, seat, index, now = Date.now()) {
  const player = room.seats[seat];
  const otherSeat = opponentOf(seat);
  const other = room.seats[otherSeat];
  const game = room.game;

  if (!player || !player.online) return { ok: false, error: 'invalid' };
  if (!other || !other.online) return { ok: false, error: 'waiting' };
  if (game.winner) return { ok: false, error: 'finished' };
  if (game.turn !== seat) return { ok: false, error: 'not_turn' };
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return { ok: false, error: 'invalid' };
  }
  if (game.board[index]) return { ok: false, error: 'taken' };

  game.board[index] = seat === 'host' ? 'X' : 'O';
  game.lastMove = { index, seat };
  const result = scanBoard(game.board);

  if (result.winner === 'draw') {
    game.winner = 'draw';
    game.line = [];
  } else if (result.winner) {
    const winningSeat = result.winner === 'X' ? 'host' : 'guest';
    game.winner = winningSeat;
    game.line = result.line;
    game.scores[winningSeat] += 1;
  } else {
    game.turn = otherSeat;
  }

  room.lastActive = now;
  return { ok: true, game };
}

export function requestRematch(room, seat, now = Date.now()) {
  if (!room.seats[seat]?.online) return { ok: false, error: 'invalid' };
  if (!room.game.winner) return { ok: false, error: 'in_progress' };
  const nextStarter = opponentOf(room.game.starter);
  const scores = { ...room.game.scores };
  room.game = freshGame(nextStarter, room.game.round + 1, scores);
  room.lastActive = now;
  return { ok: true, game: room.game };
}

export function bondInfo(points) {
  let index = 0;
  for (let i = 1; i < BOND_LEVELS.length; i += 1) {
    if (points >= BOND_LEVELS[i].min) index = i;
  }
  const current = BOND_LEVELS[index];
  const next = BOND_LEVELS[index + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  return {
    level: index + 1,
    name: current.name,
    points: Math.round(points),
    next: next ? next.min : null,
    progress: next ? clamp((points - current.min) / span, 0, 1) : 1,
  };
}

export function publicRoom(room, now = Date.now()) {
  const publicSeat = (seat) => {
    const player = room.seats[seat];
    return player ? { name: player.name, online: Boolean(player.online) } : null;
  };
  const cooldowns = {};
  for (const action of Object.keys(ACTIONS)) {
    cooldowns[action] = room.cooldowns[action] ?? 0;
  }

  return {
    code: room.code,
    players: { host: publicSeat('host'), guest: publicSeat('guest') },
    stats: {
      fullness: Math.round(room.stats.fullness * 10) / 10,
      mood: Math.round(room.stats.mood * 10) / 10,
      energy: Math.round(room.stats.energy * 10) / 10,
      bond: Math.round(room.stats.bond * 10) / 10,
    },
    bond: bondInfo(room.stats.bond),
    cooldowns,
    log: room.log.slice(0, 16),
    chat: room.chat.slice(-50),
    game: {
      ...room.game,
      board: [...room.game.board],
      line: [...room.game.line],
      scores: { ...room.game.scores },
    },
    together: Boolean(room.seats.host?.online && room.seats.guest?.online),
    serverTime: now,
  };
}
