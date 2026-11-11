/**
 * Display-only view of the chore / recipe data. Durations, ingredients and
 * rewards come straight from server/activities.js, a pure module with no Node
 * APIs, so the browser and the gateway can never disagree about a recipe.
 */
import {
  DISH_BY_ID,
  INGREDIENTS,
  ROOM_TASKS,
  activityDuration,
  parseActivityId,
} from '../../server/activities.js';

export { GROCERY_BATCH } from '../../server/activities.js';

const INGREDIENT_META = {
  ribs: { icon: '🥩', labelKey: 'pantry.ribs' },
  vinegar: { icon: '🫙', labelKey: 'pantry.vinegar' },
  sugar: { icon: '🍬', labelKey: 'pantry.sugar' },
  chicken: { icon: '🍗', labelKey: 'pantry.chicken' },
  peanut: { icon: '🥜', labelKey: 'pantry.peanut' },
  chili: { icon: '🌶️', labelKey: 'pantry.chili' },
  tomato: { icon: '🍅', labelKey: 'pantry.tomato' },
  egg: { icon: '🥚', labelKey: 'pantry.egg' },
  pumpkin: { icon: '🎃', labelKey: 'pantry.pumpkin' },
  milk: { icon: '🥛', labelKey: 'pantry.milk' },
};

const DISH_META = {
  sweetSourRibs: { icon: '🍖' },
  kungPaoChicken: { icon: '🌶️' },
  tomatoEgg: { icon: '🍳' },
  pumpkinSoup: { icon: '🥣' },
};

const TASK_META = {
  tidy: { icon: '🧹' },
  puzzle: { icon: '🧩' },
  bathTime: { icon: '🛁' },
  laundry: { icon: '🧺' },
  water: { icon: '🚿' },
  plantSeed: { icon: '🌱' },
  napTime: { icon: '😴' },
  changeSheets: { icon: '🛏️' },
  meteor: { icon: '🌠' },
  tryOn: { icon: '👕' },
};

export const PANTRY_ITEMS = INGREDIENTS.map((id) => ({ id, ...INGREDIENT_META[id] }));

export const DISHES = Object.values(DISH_BY_ID).map((dish) => ({
  ...dish,
  icon: DISH_META[dish.id]?.icon ?? '🍲',
  labelKey: `dish.${dish.id}`,
}));

export const DISHES_BY_ID = Object.fromEntries(DISHES.map((dish) => [dish.id, dish]));

/** Helper data for the chore buttons in one room. */
export function tasksForRoom(roomId) {
  return (ROOM_TASKS[roomId] ?? []).map((task) => ({
    ...task,
    icon: TASK_META[task.id]?.icon ?? '✨',
    labelKey: `task.${task.id}`,
    seconds: Math.round(activityDuration(task.id) / 1000),
  }));
}

export function dishOptions(kind) {
  return DISHES.map((dish) => ({
    id: `${kind}:${dish.id}`,
    dish,
    seconds: Math.round(activityDuration(`${kind}:${dish.id}`) / 1000),
  }));
}

export function ingredientMeta(id) {
  return INGREDIENT_META[id] ?? { icon: '🧺', labelKey: 'pantry.unknown' };
}

/** What to call the running chore in the progress strip. */
export function activityTitleKey(id) {
  const parsed = parseActivityId(id);
  if (!parsed) return 'activity.unknown';
  if (parsed.kind === 'task') return `task.${parsed.taskId}`;
  // The dish name is appended separately, so cooking needs a verb phrase here
  // instead of repeating the dish twice in the progress strip.
  if (parsed.kind === 'cook') return 'activity.cooking';
  return `activity.groceryTitle`;
}

export function activityIcon(id) {
  const parsed = parseActivityId(id);
  if (!parsed) return '✨';
  if (parsed.kind === 'task') return TASK_META[parsed.taskId]?.icon ?? '✨';
  return DISH_META[parsed.dishId]?.icon ?? '🍲';
}

export function pantryHasEnough(pantry, needs) {
  return Object.entries(needs).every(([id, amount]) => (pantry?.[id] ?? 0) >= amount);
}

/** The dish a grocery run or a cooking session is about, if there is one. */
export function activityDetailKey(id) {
  const parsed = parseActivityId(id);
  return parsed && parsed.kind !== 'task' ? `dish.${parsed.dishId}` : null;
}

/** Which room a running chore belongs to, for the "they're in the kitchen" note. */
export function activityRoom(id) {
  return parseActivityId(id)?.room ?? null;
}

export function activitySeconds(id) {
  return Math.round(activityDuration(id) / 1000);
}
