/**
 * Long, room-bound chores and the kitchen's recipes. This is the server's
 * source of truth (durations, ingredients, rewards); the browser has a matching
 * display catalog in src/utils/activityCatalog.js, checked by the test suite.
 * Kept dependency-free so the production image only needs `server/` + `dist/`.
 */

export const INGREDIENTS = [
  'ribs', 'vinegar', 'sugar', 'chicken', 'peanut', 'chili',
  'tomato', 'egg', 'pumpkin', 'milk',
];

export const DISHES = [
  {
    id: 'sweetSourRibs',
    needs: { ribs: 1, vinegar: 1, sugar: 1 },
    duration: 38_000,
    effects: { fullness: 22, mood: 12, bond: 9 },
  },
  {
    id: 'kungPaoChicken',
    needs: { chicken: 1, peanut: 1, chili: 1 },
    duration: 38_000,
    effects: { fullness: 20, mood: 12, bond: 9 },
  },
  {
    id: 'tomatoEgg',
    needs: { tomato: 1, egg: 2 },
    duration: 30_000,
    effects: { fullness: 16, mood: 9, bond: 7 },
  },
  {
    id: 'pumpkinSoup',
    needs: { pumpkin: 1, milk: 1 },
    duration: 32_000,
    effects: { fullness: 15, mood: 10, bond: 7 },
  },
];

export const DISH_BY_ID = Object.fromEntries(DISHES.map((dish) => [dish.id, dish]));

/** A grocery run buys enough for two helpings of the chosen dish. */
export const GROCERY_MS = 26_000;
export const GROCERY_BATCH = 2;

/**
 * One slow little chore for each room. While any of these is running the bear
 * is busy, so instant care actions and other chores are held back on both
 * devices. The durations are short enough to watch the progress bar move.
 */
export const ROOM_TASKS = {
  living: [
    { id: 'tidy', room: 'living', duration: 26_000, effects: { mood: 8, bond: 3 } },
    { id: 'puzzle', room: 'living', duration: 34_000, effects: { mood: 10, bond: 5 } },
  ],
  kitchen: [],
  bath: [
    { id: 'bathTime', room: 'bath', duration: 42_000, effects: { mood: 12, energy: 10, bond: 3 } },
    { id: 'laundry', room: 'bath', duration: 30_000, effects: { mood: 6, energy: 5, bond: 3 } },
  ],
  garden: [
    { id: 'water', room: 'garden', duration: 30_000, effects: { mood: 8, bond: 3 } },
    { id: 'plantSeed', room: 'garden', duration: 36_000, effects: { mood: 10, bond: 4 } },
  ],
  bedroom: [
    { id: 'napTime', room: 'bedroom', duration: 48_000, effects: { energy: 26, mood: 4, bond: 2 } },
    { id: 'changeSheets', room: 'bedroom', duration: 28_000, effects: { mood: 8, energy: 4, bond: 3 } },
  ],
  rooftop: [
    { id: 'meteor', room: 'rooftop', duration: 44_000, effects: { mood: 12, bond: 5 } },
  ],
  closet: [
    { id: 'tryOn', room: 'closet', duration: 24_000, effects: { mood: 6, bond: 3 } },
  ],
  market: [],
};

export const TASK_BY_ID = Object.fromEntries(
  Object.values(ROOM_TASKS).flat().map((task) => [task.id, task]),
);

export function emptyPantry() {
  return Object.fromEntries(INGREDIENTS.map((id) => [id, 0]));
}

/** Recognise `cook:<dish>`, `grocery:<dish>` and plain room chore ids. */
export function parseActivityId(raw) {
  const id = String(raw ?? '');
  if (id.startsWith('cook:')) {
    const dishId = id.slice('cook:'.length);
    return DISH_BY_ID[dishId] ? { kind: 'cook', dishId, room: 'kitchen' } : null;
  }
  if (id.startsWith('grocery:')) {
    const dishId = id.slice('grocery:'.length);
    return DISH_BY_ID[dishId] ? { kind: 'grocery', dishId, room: 'market' } : null;
  }
  const task = TASK_BY_ID[id];
  return task ? { kind: 'task', taskId: id, room: task.room } : null;
}

export function activityStartKey(id) {
  const parsed = parseActivityId(id);
  if (!parsed) return null;
  if (parsed.kind === 'task') return `activity.${id}.start`;
  return `activity.${parsed.kind}.${parsed.dishId}.start`;
}

export function activityDoneKey(id) {
  const parsed = parseActivityId(id);
  if (!parsed) return null;
  if (parsed.kind === 'task') return `activity.${id}.done`;
  return `activity.${parsed.kind}.${parsed.dishId}.done`;
}

export function activityDuration(id) {
  const parsed = parseActivityId(id);
  if (!parsed) return 0;
  if (parsed.kind === 'task') return TASK_BY_ID[parsed.taskId].duration;
  if (parsed.kind === 'grocery') return GROCERY_MS;
  return DISH_BY_ID[parsed.dishId].duration;
}
