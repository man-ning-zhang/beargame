/**
 * Spaced repetition for the Chinese Corner tab.
 *
 * A tiny Anki: every player has their own deck progress, and the server decides
 * which cards come next. Pure logic + a read-only data file, so it can be
 * unit-tested without a socket.
 *
 * A deck is the HSK list for the chosen level, plus the player's own cards
 * (notes they marked "study this"). Both live in the same schedule, keyed by
 * `key` — the hanzi for HSK cards, `n:<id>` for personal ones.
 */

import fs from 'node:fs';

const HSK = JSON.parse(fs.readFileSync(new URL('./data/hsk.json', import.meta.url), 'utf8'));
const FRENCH = JSON.parse(fs.readFileSync(new URL('./data/french.json', import.meta.url), 'utf8'));

export const GRADES = ['again', 'hard', 'good'];
export const DAILY_NEW = 10;
export const DAILY_GOAL = 10;
/** 999 means "no daily cap" in the UI. */
export const NEW_PER_DAY_OPTIONS = [10, 20, 50, 999];

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const AGAIN_DELAY = 10 * MINUTE; // "again" comes back within the same sitting
const HARD_DELAY = 10 * MINUTE; // both map to 0 days, i.e. "in a few minutes"
const LEARNING_WINDOW = 20 * MINUTE;
const MAX_QUEUE = 24;
const MAX_DUE_IN_QUEUE = 14;
const MAX_LEARNING_IN_QUEUE = 4;
const MAX_INTERVAL_DAYS = 365;
const START_EASE = 2.4;
const MASTERED_DAYS = 21;
const MAX_TRACKED_CARDS = 8000;

// Day boundaries follow the people playing, not the server: Render runs in UTC,
// which would reset "today" at 8am in Beijing.
const DAY_OFFSET_MS = Number(process.env.STUDY_TZ_OFFSET_MINUTES ?? 480) * MINUTE;

export const LANGUAGES = ['zh', 'fr'];
export const DEFAULT_LANG = 'zh';

function compareLevels(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/** HSK keys stay bare (older saved progress keeps working); French is prefixed. */
function buildDeck(cards, lang) {
  const byLevel = new Map();
  const byKey = new Map();
  for (const card of cards) {
    card.key = lang === 'zh' ? card.w : `${lang}:${card.w}`;
    card.lang = lang;
    if (!byLevel.has(card.l)) byLevel.set(card.l, []);
    byLevel.get(card.l).push(card);
    byKey.set(card.key, card);
  }
  return { lang, byLevel, byKey, levels: Array.from(byLevel.keys()).sort(compareLevels) };
}

export const DECKS = { zh: buildDeck(HSK, 'zh'), fr: buildDeck(FRENCH, 'fr') };

const CARD_BY_KEY = new Map();
for (const lang of LANGUAGES) {
  for (const [key, card] of DECKS[lang].byKey) CARD_BY_KEY.set(key, card);
}

/** HSK levels, kept as a named export for older callers. */
export const STUDY_LEVELS = DECKS.zh.levels;

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function dayKey(now = Date.now()) {
  return new Date(now + DAY_OFFSET_MS).toISOString().slice(0, 10);
}

export function deckSize(lang, level) {
  return DECKS[lang]?.byLevel.get(level)?.length ?? 0;
}

export function levelsFor(lang) {
  return DECKS[lang]?.levels ?? DECKS[DEFAULT_LANG].levels;
}

export function createStudyState(lang = DEFAULT_LANG) {
  // Tolerate the old signature (a level number) so saved callers keep working.
  const safe = LANGUAGES.includes(lang) ? lang : DEFAULT_LANG;
  return {
    lang: safe,
    level: levelsFor(safe)[0],
    day: '',
    lastDay: '',
    streak: 0,
    reviewedToday: 0,
    newToday: 0,
    totalReviews: 0,
    newPerDay: DAILY_NEW,
    rev: 0,
    /** key → { ease, interval (days), due, reps, lapses, seen } */
    cards: {},
  };
}

/** Rebuild a study state from something a browser sent us. Never trust it. */
export function sanitizeStudyState(raw) {
  const study = createStudyState();
  if (!raw || typeof raw !== 'object') return study;

  const lang = LANGUAGES.includes(raw.lang) ? raw.lang : DEFAULT_LANG;
  study.lang = lang;
  const levels = levelsFor(lang);
  const level = lang === 'zh' ? Number(raw.level) : String(raw.level ?? '');
  if (levels.includes(level)) study.level = level;

  study.day = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.day ?? '')) ? String(raw.day) : '';
  study.lastDay = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.lastDay ?? '')) ? String(raw.lastDay) : '';
  study.streak = Math.round(clampNumber(raw.streak, 0, 100_000));
  study.reviewedToday = Math.round(clampNumber(raw.reviewedToday, 0, 100_000));
  study.newToday = Math.round(clampNumber(raw.newToday, 0, 100_000));
  study.totalReviews = Math.round(clampNumber(raw.totalReviews, 0, 1_000_000));
  study.newPerDay = NEW_PER_DAY_OPTIONS.includes(Number(raw.newPerDay))
    ? Number(raw.newPerDay)
    : DAILY_NEW;

  const entries = Object.entries(raw.cards ?? {}).slice(0, MAX_TRACKED_CARDS);
  for (const [key, rec] of entries) {
    if (!CARD_BY_KEY.has(key) && !key.startsWith('n:')) continue;
    if (!rec || typeof rec !== 'object') continue;
    study.cards[key] = {
      ease: clampNumber(rec.ease, 1.3, 3, START_EASE),
      interval: clampNumber(rec.interval, 0, MAX_INTERVAL_DAYS),
      due: clampNumber(rec.due, 0, Date.now() + 5 * 365 * DAY),
      reps: Math.round(clampNumber(rec.reps, 0, 100_000)),
      lapses: Math.round(clampNumber(rec.lapses, 0, 100_000)),
      seen: Math.round(clampNumber(rec.seen, 0, 100_000)),
      lastGrade: GRADES.includes(rec.lastGrade) ? rec.lastGrade : undefined,
      lastSeen: clampNumber(rec.lastSeen, 0, Date.now() + DAY) || undefined,
    };
  }

  return study;
}

/** Reset the daily counters when the calendar day changes. */
export function rollStudyDay(study, now = Date.now()) {
  const today = dayKey(now);
  if (study.day === today) return false;
  study.day = today;
  study.reviewedToday = 0;
  study.newToday = 0;
  study.rev += 1;
  return true;
}

/** Streak counts study days; a day that is not over yet does not break it. */
export function currentStreak(study, now = Date.now()) {
  const today = dayKey(now);
  if (study.lastDay === today || study.lastDay === dayKey(now - DAY)) return study.streak;
  return 0;
}

function markStudiedToday(study, now) {
  const today = dayKey(now);
  if (study.lastDay === today) return;
  study.streak = study.lastDay === dayKey(now - DAY) ? study.streak + 1 : 1;
  study.lastDay = today;
}

/** Interval in days the next grade would move a card to (0 = within the hour). */
function nextInterval(rec, grade) {
  if (grade === 'again') return 0;
  if (grade === 'hard') {
    return rec.interval < 1 ? 0 : Math.max(1, Math.round(rec.interval * 1.2));
  }
  if (rec.reps === 0) return 1;
  if (rec.reps === 1) return 3;
  return Math.min(MAX_INTERVAL_DAYS, Math.round(rec.interval * rec.ease));
}

function publicCard(card, rec) {
  const base = rec ?? { ease: START_EASE, interval: 0, reps: 0 };
  const shaped = {
    key: card.key,
    w: card.w,
    m: card.m,
    l: card.l,
    // What the grade buttons will do, so the UI can show "记住了 · 3 天后".
    iv: [nextInterval(base, 'hard'), nextInterval(base, 'good')],
  };
  if (card.p) shaped.p = card.p;
  if (card.c) shaped.c = card.c;
  if (card.pos) shaped.pos = card.pos;
  if (card.custom) shaped.custom = true;
  if (rec) shaped.reps = rec.reps;
  return shaped;
}

/** Deck for the current language and level, plus the player's own cards in it. */
export function deckFor(study, extras = []) {
  const own = extras.filter((card) => (card.lang ?? 'zh') === study.lang);
  return [...(DECKS[study.lang]?.byLevel.get(study.level) ?? []), ...own];
}

function findCard(study, key, extras) {
  if (key.startsWith('n:')) return extras.find((card) => card.key === key) ?? null;
  const card = CARD_BY_KEY.get(key);
  if (!card || card.lang !== study.lang || card.l !== study.level) return null;
  return card;
}

/**
 * The cards for this sitting: overdue reviews first, then the ones that are
 * still being learned, then a few new words (commonest first).
 */
export function buildQueue(study, now = Date.now(), extras = []) {
  rollStudyDay(study, now);
  const due = [];
  const learning = [];
  const freshHsk = [];
  const freshMine = [];

  for (const card of deckFor(study, extras)) {
    const rec = study.cards[card.key];
    if (!rec) {
      // A word you picked yourself matters more than the next HSK entry.
      (card.custom ? freshMine : freshHsk).push(card);
      continue;
    }
    if (rec.due <= now) due.push({ card, rec });
    else if (rec.due - now <= LEARNING_WINDOW) learning.push({ card, rec });
  }

  due.sort((a, b) => a.rec.due - b.rec.due);
  learning.sort((a, b) => a.rec.due - b.rec.due);

  const newSlots = Math.max(0, (study.newPerDay ?? DAILY_NEW) - study.newToday);
  const fresh = [...freshMine, ...freshHsk].slice(0, newSlots);
  const picked = [
    ...due.slice(0, MAX_DUE_IN_QUEUE).map((item) => item.card),
    ...learning.slice(0, MAX_LEARNING_IN_QUEUE).map((item) => item.card),
    ...fresh,
  ].slice(0, MAX_QUEUE);

  return picked.map((card) => publicCard(card, study.cards[card.key]));
}

export function gradeCard(study, key, grade, now = Date.now(), extras = []) {
  if (!GRADES.includes(grade)) return { ok: false, error: 'invalid_grade' };

  const card = findCard(study, String(key ?? ''), extras);
  if (!card) return { ok: false, error: 'unknown_card' };

  rollStudyDay(study, now);
  markStudiedToday(study, now);

  const isNew = !study.cards[card.key];
  const rec = study.cards[card.key] ?? {
    ease: START_EASE,
    interval: 0,
    due: now,
    reps: 0,
    lapses: 0,
    seen: 0,
  };

  if (grade === 'again') {
    rec.ease = Math.max(1.3, rec.ease - 0.2);
    rec.interval = 0;
    rec.reps = 0;
    rec.lapses += 1;
    rec.due = now + AGAIN_DELAY;
  } else if (grade === 'hard') {
    rec.ease = Math.max(1.3, rec.ease - 0.05);
    rec.interval = nextInterval(rec, 'hard');
    rec.reps += 1;
    rec.due = rec.interval ? now + rec.interval * DAY : now + HARD_DELAY;
  } else {
    rec.ease = Math.min(3, rec.ease + 0.05);
    rec.interval = nextInterval(rec, 'good');
    rec.reps += 1;
    rec.due = now + rec.interval * DAY;
  }

  rec.seen += 1;
  rec.lastGrade = grade;
  rec.lastSeen = now;
  study.cards[card.key] = rec;
  study.reviewedToday += 1;
  study.totalReviews += 1;
  study.rev += 1;
  if (isNew) study.newToday += 1;

  return { ok: true, card: publicCard(card, rec), interval: rec.interval, wasNew: isNew };
}

/** How many new words the player wants to meet per day. */
export function setStudyLimit(study, value) {
  const next = Number(value);
  if (!NEW_PER_DAY_OPTIONS.includes(next)) return { ok: false, error: 'invalid_limit' };
  if (study.newPerDay !== next) {
    study.newPerDay = next;
    study.rev += 1;
  }
  return { ok: true, limit: next };
}

export function setStudyLevel(study, level) {
  const next = study.lang === 'zh' ? Number(level) : String(level ?? '');
  if (!levelsFor(study.lang).includes(next)) return { ok: false, error: 'invalid_level' };
  if (study.level !== next) {
    study.level = next;
    study.rev += 1;
  }
  return { ok: true, level: next };
}

/** Each player may study a different language; switching resets to its first level. */
export function setStudyLang(study, lang) {
  if (!LANGUAGES.includes(lang)) return { ok: false, error: 'invalid_lang' };
  if (study.lang === lang) return { ok: true, lang };
  study.lang = lang;
  study.level = levelsFor(lang)[0];
  study.rev += 1;
  return { ok: true, lang };
}

export function levelProgress(study) {
  const levels = levelsFor(study.lang);
  const learned = new Map(levels.map((level) => [level, 0]));
  for (const [key, rec] of Object.entries(study.cards)) {
    if (rec.interval < 1) continue;
    const card = CARD_BY_KEY.get(key);
    if (card && card.lang === study.lang && learned.has(card.l)) {
      learned.set(card.l, learned.get(card.l) + 1);
    }
  }
  return levels.map((level) => ({
    level,
    total: deckSize(study.lang, level),
    learned: learned.get(level),
  }));
}

export function studyStats(study, now = Date.now(), extras = []) {
  rollStudyDay(study, now);
  const deck = deckFor(study, extras);
  let learned = 0;
  let mastered = 0;
  let due = 0;

  for (const card of deck) {
    const rec = study.cards[card.key];
    if (!rec) continue;
    if (rec.interval >= 1) learned += 1;
    if (rec.interval >= MASTERED_DAYS) mastered += 1;
    if (rec.due <= now) due += 1;
  }

  return {
    level: study.level,
    total: deck.length,
    learned,
    mastered,
    due,
    reviewedToday: study.reviewedToday,
    newToday: study.newToday,
    goal: DAILY_GOAL,
    doneToday: study.reviewedToday >= DAILY_GOAL,
    streak: currentStreak(study, now),
  };
}

/** Everything one player needs to render the Chinese Corner panel. */
export function studyView(study, now = Date.now(), extras = []) {
  const stats = studyStats(study, now, extras);
  return {
    lang: study.lang,
    level: stats.level,
    levels: levelProgress(study),
    today: {
      reviewed: stats.reviewedToday,
      goal: stats.goal,
      done: stats.doneToday,
      newCards: stats.newToday,
      newLimit: study.newPerDay ?? DAILY_NEW,
    },
    streak: stats.streak,
    total: stats.total,
    learned: stats.learned,
    mastered: stats.mastered,
    due: stats.due,
    myCards: extras.length,
    rev: study.rev,
    queue: buildQueue(study, now, extras),
  };
}

/** Public lookup used by the cloze flow to check an answer. */
export function cardByKey(study, key, extras = []) {
  return findCard(study, String(key ?? ''), extras);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * A fill-in-the-blank question from the cards that are due or new. Options are
 * pulled from words of a similar length so the shape of the answer is not a
 * giveaway.
 */
export function nextCloze(study, now = Date.now(), extras = []) {
  rollStudyDay(study, now);
  const withSentence = deckFor(study, extras).filter((card) => card.s);
  if (!withSentence.length) return null;

  const ready = withSentence.filter((card) => {
    const rec = study.cards[card.key];
    if (!rec) return true;
    return rec.due <= now || rec.due - now <= LEARNING_WINDOW;
  });
  const pool = ready.length ? ready : withSentence;
  const card = pool[Math.floor(Math.random() * pool.length)];

  const size = Array.from(card.w).length;
  const sameShape = withSentence.filter(
    (other) => other.key !== card.key && Math.abs(Array.from(other.w).length - size) <= 1,
  );
  const source = sameShape.length >= 3 ? sameShape : withSentence.filter((other) => other.key !== card.key);
  const options = shuffle([card.w, ...shuffle(source).slice(0, 3).map((other) => other.w)]);

  const rec = study.cards[card.key];
  const base = rec ?? { ease: START_EASE, interval: 0, reps: 0 };

  const question = {
    key: card.key,
    prompt: card.s,
    answer: card.w,
    options,
    m: card.m,
    l: card.l,
    iv: [nextInterval(base, 'hard'), nextInterval(base, 'good')],
  };
  if (card.p) question.p = card.p;
  return question;
}

/** Answering a cloze is a real review: right → "good", wrong → "again". */
export function gradeCloze(study, key, choice, now = Date.now(), extras = []) {
  const card = findCard(study, String(key ?? ''), extras);
  if (!card) return { ok: false, error: 'unknown_card' };
  const correct = String(choice) === card.w;
  const graded = gradeCard(study, card.key, correct ? 'good' : 'again', now, extras);
  if (!graded.ok) return graded;
  return { ok: true, correct, answer: card.w, interval: graded.interval, iv: graded.card.iv };
}

/** The other player only gets a headline — enough to cheer them on. */
export function studySummary(study, now = Date.now(), extras = []) {
  const stats = studyStats(study, now, extras);
  return {
    level: stats.level,
    reviewed: stats.reviewedToday,
    goal: stats.goal,
    done: stats.doneToday,
    streak: stats.streak,
    learned: stats.learned,
    myCards: extras.length,
  };
}
