/**
 * The wardrobe's ids, shared by the WebSocket gateway and the game logic.
 * This file stays dependency-free on purpose: the production image only ships
 * `server/` and `dist/`, so the server cannot import anything from `src/`.
 * The visual catalog in src/utils/wardrobe.js is checked against this list by
 * server/game.test.js, so a new outfit can never exist on only one side.
 */

export const OUTFIT_IDS = {
  bear: ['cozy', 'rain', 'knit', 'tux'],
  fish: ['skater', 'chef', 'pjs', 'date'],
};

export const DEFAULT_OUTFITS = { bear: 'cozy', fish: 'skater' };

export function isValidOutfit(who, id) {
  const ids = OUTFIT_IDS[who];
  return Array.isArray(ids) && ids.includes(id);
}

/** Older rooms (created before the wardrobe existed) fall back to the defaults. */
export function sanitizeOutfits(raw) {
  const outfits = { ...DEFAULT_OUTFITS };
  for (const who of Object.keys(DEFAULT_OUTFITS)) {
    const value = raw?.[who];
    if (typeof value === 'string' && isValidOutfit(who, value)) outfits[who] = value;
  }
  return outfits;
}
