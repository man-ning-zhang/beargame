/**
 * Pure room / bear / tic-tac-toe logic.
 * No networking lives here so it can be unit-tested directly.
 */

import {
  DAILY_GOAL,
  createStudyState,
  gradeCard,
  rollStudyDay,
  sanitizeStudyState,
  setStudyLevel,
  studySummary,
  studyView,
} from './study.js';
import {
  noteCards,
  removeNote,
  sanitizeNotes,
  toggleNoteStudy,
  upsertNote,
} from './notebook.js';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SEAT_GRACE_MS = 5 * 60 * 1000;

// Labels, verbs and system-message copy live on the client so each player can
// read the room in their own language. The server only stores structured data.
export const ACTIONS = {
  feed: {
    cooldown: 10_000,
    effects: { fullness: 26, mood: 5, energy: 1, bond: 2 },
  },
  play: {
    cooldown: 14_000,
    effects: { fullness: -5, mood: 20, energy: -12, bond: 3 },
  },
  hug: {
    cooldown: 25_000,
    effects: { fullness: -2, mood: 12, energy: 2, bond: 4 },
  },
  sleep: {
    cooldown: 60_000,
    effects: { fullness: -4, mood: 3, energy: 35, bond: 1 },
  },
  pet: {
    cooldown: 3_000,
    effects: { mood: 4, bond: 1 },
  },
};

export const BOND_LEVELS = [0, 30, 90, 180, 320].map((min) => ({ min }));

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
  return text || '🐻';
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

/**
 * Everything that belongs to one player and survives a redeploy: study
 * progress, their own cards, and their notes. The browser keeps the master copy
 * in localStorage; the room only holds it while they are here.
 */
export function createPersonal() {
  return { savedAt: 0, rev: 0, updatedAt: 0, study: createStudyState(), notes: [] };
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
    // Each player studies at their own pace; progress lives with the seat.
    personal: { host: createPersonal(), guest: createPersonal() },
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

function addSystemChat(room, event, data = {}, now = Date.now()) {
  room.chat.push({
    id: room.seq++,
    at: now,
    seat: 'system',
    kind: 'system',
    event,
    data,
  });
  if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
}

export function systemChat(room, event, data = {}, now = Date.now()) {
  addSystemChat(room, event, data, now);
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
    // Someone else is sitting here now, so the old deck progress goes too.
    room.personal[seat] = createPersonal();
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
    addSystemChat(room, 'join', { name: cleanName }, nowMs);
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
  room.personal[seat] = createPersonal();
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

/**
 * Grade a flashcard. Each player's deck progress is their own, but crossing the
 * daily goal warms the bear — learning together is part of looking after it.
 */
export function performStudyGrade(room, seat, key, grade, now = Date.now()) {
  const player = room.seats[seat];
  const personal = room.personal?.[seat];
  if (!player || !player.online || !personal) return { ok: false, error: 'invalid' };

  const study = personal.study;
  const extras = noteCards(personal.notes);
  rollStudyDay(study, now);
  const before = study.reviewedToday;
  const result = gradeCard(study, key, grade, now, extras);
  if (!result.ok) return result;

  bumpPersonal(personal, now);

  if (before < DAILY_GOAL && study.reviewedToday >= DAILY_GOAL) {
    room.stats.bond = clamp(room.stats.bond + 2, 0, 999);
    addSystemChat(room, 'studyGoal', { name: player.name }, now);

    const partnerPersonal = room.personal[opponentOf(seat)];
    if (partnerPersonal) rollStudyDay(partnerPersonal.study, now);
    if (partnerPersonal && partnerPersonal.study.reviewedToday >= DAILY_GOAL) {
      room.stats.bond = clamp(room.stats.bond + 2, 0, 999);
      addSystemChat(room, 'studyTogether', {}, now);
    }
  }

  room.lastActive = now;
  return result;
}

export function performStudyLevelChange(room, seat, level, now = Date.now()) {
  const personal = room.personal?.[seat];
  if (!room.seats[seat]?.online || !personal) return { ok: false, error: 'invalid' };
  const result = setStudyLevel(personal.study, level);
  if (result.ok) {
    bumpPersonal(personal, now);
    room.lastActive = now;
  }
  return result;
}

function bumpPersonal(personal, now) {
  personal.rev += 1;
  personal.updatedAt = now;
}

/**
 * Adopt a browser's saved copy of a player's own data (study progress, own
 * cards, notes). Newer wins, so a stale tab cannot roll progress back.
 */
export function applyPersonal(room, seat, payload, now = Date.now()) {
  const personal = room.personal?.[seat];
  if (!room.seats[seat]?.online || !personal) return { ok: false, error: 'invalid' };
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'invalid' };

  const savedAt = Math.round(Number(payload.savedAt)) || 0;
  if (personal.savedAt > 0 && savedAt <= personal.savedAt) {
    return { ok: true, adopted: false };
  }

  personal.study = sanitizeStudyState(payload.study);
  personal.notes = sanitizeNotes(payload.notes);
  personal.savedAt = savedAt || now;
  bumpPersonal(personal, now);
  room.lastActive = now;
  return { ok: true, adopted: true, notes: personal.notes.length };
}

/** Add / edit / delete a note, or flip it into the flashcard queue. */
export function changeNote(room, seat, action, payload, now = Date.now()) {
  const personal = room.personal?.[seat];
  if (!room.seats[seat]?.online || !personal) return { ok: false, error: 'invalid' };

  let result;
  if (action === 'add' || action === 'update') {
    result = upsertNote(personal.notes, payload, now);
  } else if (action === 'remove') {
    result = removeNote(personal.notes, String(payload?.id ?? ''));
  } else if (action === 'study') {
    result = toggleNoteStudy(personal.notes, String(payload?.id ?? ''), payload?.study, now);
  } else {
    return { ok: false, error: 'invalid_action' };
  }

  if (!result.ok) return result;
  personal.notes = result.notes;
  bumpPersonal(personal, now);
  room.lastActive = now;
  return result;
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
    points: Math.round(points),
    next: next ? next.min : null,
    progress: next ? clamp((points - current.min) / span, 0, 1) : 1,
  };
}

/**
 * @param {object} room
 * @param {number} [now]
 * @param {'host'|'guest'} [seat] when given, include that player's private view
 *   (their flashcard queue and progress) instead of a shared snapshot.
 * @param {{includePersonal?: boolean}} [options] also ship the raw personal
 *   state, so the browser can keep the master copy in localStorage.
 */
export function publicRoom(room, now = Date.now(), seat = null, options = {}) {
  const publicSeat = (seatName) => {
    const player = room.seats[seatName];
    return player ? { name: player.name, online: Boolean(player.online) } : null;
  };
  const cooldowns = {};
  for (const action of Object.keys(ACTIONS)) {
    cooldowns[action] = room.cooldowns[action] ?? 0;
  }

  const partnerSeat = seat ? opponentOf(seat) : null;
  const personal = seat ? room.personal?.[seat] : null;
  const partnerPersonal = partnerSeat ? room.personal?.[partnerSeat] : null;
  const extras = personal ? noteCards(personal.notes) : [];
  const partnerExtras = partnerPersonal ? noteCards(partnerPersonal.notes) : [];

  const study = personal
    ? {
        ...studyView(personal.study, now, extras),
        partner:
          room.seats[partnerSeat] && partnerPersonal
            ? {
                name: room.seats[partnerSeat].name,
                ...studySummary(partnerPersonal.study, now, partnerExtras),
              }
            : null,
      }
    : null;

  if (study && options.includePersonal && personal) {
    study.personal = {
      rev: personal.rev,
      savedAt: personal.savedAt,
      study: personal.study,
      notes: personal.notes,
    };
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
    study,
    together: Boolean(room.seats.host?.online && room.seats.guest?.online),
    serverTime: now,
  };
}
