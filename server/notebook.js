/**
 * The personal notebook: words the players add themselves, with room for a
 * free-form note. Any entry can be marked as a flashcard, which puts it into
 * that player's spaced-repetition queue next to the HSK words.
 *
 * Personal data comes from the browser (localStorage), so everything here is
 * sanitized before it touches a room.
 */

export const MAX_NOTES = 200;

const MAX_HANZI = 12;
const MAX_PINYIN = 40;
const MAX_MEANING = 140;
const MAX_NOTE = 500;
const MAX_TAG = 16;

function stripControl(value) {
  return Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.codePointAt(0);
      return code > 31 && code !== 127;
    })
    .join('');
}

function text(value, max) {
  return Array.from(stripControl(value).trim()).slice(0, max).join('');
}

function idFor(now) {
  return `n${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** @returns {object|null} a clean note, or null when there is no word to learn. */
export function sanitizeNote(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;
  const hanzi = text(raw.w, MAX_HANZI);
  if (!hanzi) return null;

  const id = /^n[a-z0-9]{4,20}$/.test(String(raw.id ?? '')) ? String(raw.id) : idFor(now);
  return {
    id,
    lang: raw.lang === 'fr' ? 'fr' : 'zh',
    w: hanzi,
    p: text(raw.p, MAX_PINYIN),
    m: text(raw.m, MAX_MEANING),
    note: text(raw.note, MAX_NOTE),
    tag: text(raw.tag, MAX_TAG),
    study: Boolean(raw.study),
    at: Math.round(Number(raw.at)) || now,
    updatedAt: Math.round(Number(raw.updatedAt)) || now,
  };
}

export function sanitizeNotes(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const notes = [];
  for (const entry of raw.slice(0, MAX_NOTES)) {
    const note = sanitizeNote(entry);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    notes.push(note);
    if (notes.length >= MAX_NOTES) break;
  }
  return notes;
}

/** Create or update. `id` missing → create; unknown id → create as well. */
export function upsertNote(notes, input, now = Date.now()) {
  const clean = sanitizeNote(input, now);
  if (!clean) return { ok: false, error: 'empty' };

  const index = input?.id ? notes.findIndex((note) => note.id === input.id) : -1;
  if (index >= 0) {
    const updated = { ...notes[index], ...clean, id: notes[index].id, at: notes[index].at, updatedAt: now };
    const next = [...notes];
    next[index] = updated;
    return { ok: true, notes: next, note: updated, created: false };
  }

  if (notes.length >= MAX_NOTES) return { ok: false, error: 'full' };
  const created = { ...clean, id: idFor(now), at: now, updatedAt: now };
  return { ok: true, notes: [...notes, created], note: created, created: true };
}

export function removeNote(notes, id) {
  const next = notes.filter((note) => note.id !== id);
  if (next.length === notes.length) return { ok: false, error: 'not_found' };
  return { ok: true, notes: next };
}

export function toggleNoteStudy(notes, id, study, now = Date.now()) {
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) return { ok: false, error: 'not_found' };
  const next = [...notes];
  next[index] = { ...next[index], study: Boolean(study), updatedAt: now };
  return { ok: true, notes: next, note: next[index] };
}

/** Notes marked for study become cards in the player's own deck. */
export function noteCards(notes) {
  return notes
    .filter((note) => note.study)
    .map((note) => ({
      key: `n:${note.id}`,
      lang: note.lang ?? 'zh',
      w: note.w,
      p: note.p,
      m: note.m || '—',
      l: 0,
      custom: true,
      note: note.note,
      tag: note.tag,
    }));
}
