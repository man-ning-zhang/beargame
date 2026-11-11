/**
 * Pure data + helpers for Fishy's visits. No React in here on purpose: the
 * server test suite imports this file to make sure every interaction the UI
 * can offer also exists as a real server action.
 */

export const PERIODS = ['dawn', 'morning', 'noon', 'afternoon', 'night'];
const ALL = PERIODS;

/** The six little spaces that make up the cabin. */
export const ROOMS = [
  { id: 'living', icon: '🛋️', labelKey: 'house.living' },
  { id: 'kitchen', icon: '🍳', labelKey: 'house.kitchen' },
  { id: 'bath', icon: '🛁', labelKey: 'house.bath' },
  { id: 'garden', icon: '🌷', labelKey: 'house.garden' },
  { id: 'bedroom', icon: '🛏️', labelKey: 'house.bedroom' },
  { id: 'rooftop', icon: '🌌', labelKey: 'house.rooftop' },
];

export const DEFAULT_ROOM = 'living';

/** Quick cuddles. Three of these show up per visit, picked at random. */
export const GESTURES = [
  { id: 'fishHug', icon: '🫂' },
  { id: 'fishKiss', icon: '😙' },
  { id: 'fishHeart', icon: '💞' },
  { id: 'fishNuzzle', icon: '🥰' },
  { id: 'fishPinky', icon: '🤙' },
];

/**
 * Every date is a real server action (server/game.js ACTIONS).
 * - periods: which hours of the day Fishy would suggest it
 * - rooms: where the two of them go for it
 * - signature: gives that hour its own flavor
 * - rare: occasional little surprise
 * - prop: the emoji that floats between them while the date plays out
 */
export const DATE_CATALOG = [
  // Any time, anywhere in the cabin.
  { id: 'cook', icon: '🍳', prop: '🍲', periods: ALL, rooms: ['kitchen'] },
  { id: 'walk', icon: '🚶', prop: '🍃', periods: ALL, rooms: ['garden', 'living'] },
  { id: 'tv', icon: '📺', prop: '🍿', periods: ALL, rooms: ['living', 'bedroom'] },
  { id: 'sunset', icon: '🌅', prop: '🧡', periods: ['afternoon'], rooms: ['rooftop', 'garden'], signature: true },

  // Kitchen, from breakfast to a late supper.
  { id: 'breakfast', icon: '🥞', prop: '🍯', periods: ['dawn', 'morning'], rooms: ['kitchen'], signature: true },
  { id: 'lunch', icon: '🍜', prop: '🥢', periods: ['noon', 'afternoon'], rooms: ['kitchen'], signature: true },
  { id: 'supper', icon: '🍢', prop: '🍡', periods: ['night'], rooms: ['kitchen'], signature: true },
  { id: 'coffee', icon: '☕', prop: '🫖', periods: ['morning', 'afternoon'], rooms: ['kitchen', 'living'], signature: true },
  { id: 'tea', icon: '🍰', prop: '🍵', periods: ['noon', 'afternoon'], rooms: ['kitchen', 'garden', 'living'], signature: true },

  // Bathroom.
  { id: 'bubble', icon: '🛁', prop: '🫧', periods: ['dawn', 'night'], rooms: ['bath'], signature: true },
  { id: 'brush', icon: '🪥', prop: '✨', periods: ['dawn', 'night'], rooms: ['bath'], signature: true },

  // Garden.
  { id: 'plants', icon: '🪴', prop: '🌱', periods: ['morning', 'noon', 'afternoon'], rooms: ['garden'], signature: true },
  { id: 'picnic', icon: '🧺', prop: '🥪', periods: ['noon', 'afternoon'], rooms: ['garden'], signature: true },
  { id: 'bike', icon: '🚲', prop: '💨', periods: ['morning', 'afternoon'], rooms: ['garden'], signature: true },
  { id: 'sunrise', icon: '🌄', prop: '🌤️', periods: ['dawn'], rooms: ['rooftop', 'garden'], signature: true },

  // Bedroom.
  { id: 'nap', icon: '😴', prop: '💤', periods: ['noon', 'night'], rooms: ['bedroom'], signature: true },
  { id: 'story', icon: '📖', prop: '🌙', periods: ['night'], rooms: ['bedroom'], signature: true },
  { id: 'movie', icon: '🎬', prop: '🎞️', periods: ['afternoon', 'night'], rooms: ['bedroom', 'living'], signature: true },

  // Rooftop.
  { id: 'stargaze', icon: '✨', prop: '🔭', periods: ['night'], rooms: ['rooftop', 'garden'], signature: true },

  // Rare surprises, any hour.
  { id: 'flowers', icon: '💐', prop: '🌷', periods: ALL, rooms: ['living', 'garden', 'rooftop'], rare: true },
  { id: 'photo', icon: '📸', prop: '🖼️', periods: ALL, rooms: ['living', 'garden', 'rooftop', 'bedroom'], rare: true },
];

export const DATE_BY_ID = Object.fromEntries(DATE_CATALOG.map((date) => [date.id, date]));

/** Shared little moments that play in the middle of any date. */
export const DATE_BEATS = [
  'fish.dateBeat.1',
  'fish.dateBeat.2',
  'fish.dateBeat.3',
  'fish.dateBeat.4',
  'fish.dateBeat.5',
  'fish.dateBeat.6',
];

/** Shared endings so the same date never finishes quite the same way twice. */
export const DATE_ENDS = [
  'fish.dateEnd.1',
  'fish.dateEnd.2',
  'fish.dateEnd.3',
  'fish.dateEnd.4',
  'fish.dateEnd.5',
];

/** Things Fishy murmurs while he hangs around, tuned to the hour. */
export const MOMENT_LINES = {
  dawn: ['fish.moment.dawn.1', 'fish.moment.dawn.2'],
  morning: ['fish.moment.morning.1', 'fish.moment.morning.2'],
  noon: ['fish.moment.noon.1', 'fish.moment.noon.2'],
  afternoon: ['fish.moment.afternoon.1', 'fish.moment.afternoon.2'],
  night: ['fish.moment.night.1', 'fish.moment.night.2'],
};

export const PEEK_LINES = ['fish.peek1', 'fish.peek2', 'fish.peek3'];

export function shuffled(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom(list) {
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

export function periodKey(period) {
  return `house.period.${MOMENT_LINES[period] ? period : 'night'}`;
}

export function momentLine(period) {
  return pickRandom(MOMENT_LINES[period] ?? MOMENT_LINES.night);
}

/** A date plays out in three beats: what they do, a small moment, a goodbye. */
export function dateProgression(id) {
  return [`fish.dateLine.${id}`, pickRandom(DATE_BEATS), pickRandom(DATE_ENDS)];
}

export function buildGestureMenu(size = 3) {
  return shuffled(GESTURES).slice(0, size);
}

/**
 * Pick four dates for this visit. The room you are standing in and the hour
 * of the day both weight the draw, then a rare surprise sometimes slips in.
 * `ready(id)` lets us favor actions that are off cooldown.
 */
export function buildDateMenu({ period = 'morning', roomId = DEFAULT_ROOM, ready = () => true, size = 4 } = {}) {
  const allowed = DATE_CATALOG.filter((date) => date.periods.includes(period));
  const free = (list) => shuffled(list.filter((date) => ready(date.id)));
  const inRoom = free(allowed.filter((date) => date.rooms.includes(roomId) && !date.rare));
  const signature = free(allowed.filter((date) => date.signature && !date.rare));
  const general = free(allowed.filter((date) => !date.signature && !date.rare));
  const rare = free(allowed.filter((date) => date.rare));

  const picked = [];
  const add = (date) => {
    if (date && !picked.some((entry) => entry.id === date.id) && picked.length < size) picked.push(date);
  };

  inRoom.slice(0, Math.random() < 0.5 ? 2 : 1).forEach(add);
  signature.slice(0, Math.random() < 0.5 ? 2 : 1).forEach(add);
  if (Math.random() < 0.3) add(rare[0]);
  [...general, ...signature, ...inRoom, ...rare].forEach(add);

  // Cooldowns can leave too few ready actions; top up from the full pool so the
  // dock is never half empty (those buttons simply show their countdown).
  if (picked.length < size) shuffled(allowed).forEach(add);
  if (picked.length < size) shuffled(DATE_CATALOG).forEach(add);

  const items = shuffled(picked).slice(0, size);
  return { items, suggested: pickRandom(items)?.id ?? null };
}

/** Where the pair heads when a date starts; stay put if the room already fits. */
export function roomForDate(id, currentRoom = DEFAULT_ROOM) {
  const date = DATE_BY_ID[id];
  if (!date) return currentRoom;
  return date.rooms.includes(currentRoom) ? currentRoom : date.rooms[0];
}
