/**
 * The little wardrobe. Pure data, no React, so the swatches, the two SVG
 * characters and the server-side id check can all read from the same place.
 * The ids here must match server/outfits.js (verified in server/game.test.js).
 */

export const WHO = ['bear', 'fish'];

/** The bear's first outfit is the scarf he has always worn. */
export const BEAR_OUTFITS = [
  {
    id: 'cozy',
    icon: '🧣',
    labelKey: 'wardrobe.bear.cozy',
    shape: 'scarf',
    colors: { light: '#e88a72', dark: '#c95e49', trim: '#f4b7a4' },
    headwear: null,
    charm: 'heart',
  },
  {
    id: 'rain',
    icon: '☂️',
    labelKey: 'wardrobe.bear.rain',
    shape: 'raincoat',
    colors: { light: '#f8d477', dark: '#dfa746', trim: '#fff0bd' },
    headwear: 'hood',
    accent: '#6f97c4',
  },
  {
    id: 'knit',
    icon: '🧶',
    labelKey: 'wardrobe.bear.knit',
    shape: 'sweater',
    colors: { light: '#b6ddc9', dark: '#6fae97', trim: '#e6f5ec' },
    headwear: 'beanie',
    accent: '#e8795f',
  },
  {
    id: 'tux',
    icon: '🎩',
    labelKey: 'wardrobe.bear.tux',
    shape: 'tux',
    colors: { light: '#4a557d', dark: '#2b3557', trim: '#7d8bb5' },
    headwear: 'tophat',
    accent: '#e8795f',
  },
];

/** Fishy's first outfit is the tee, denim shorts and backwards cap he came in. */
export const FISH_OUTFITS = [
  {
    id: 'skater',
    icon: '🛹',
    labelKey: 'wardrobe.fish.skater',
    shape: 'tee',
    top: { light: '#fbf0df', dark: '#ecd9bf', edge: '#e0c9a6', print: 'star', printColor: '#e8795f' },
    bottom: { light: '#6f97c4', dark: '#456a99', edge: '#3c5f8c', shape: 'shorts' },
    hat: { shape: 'cap', light: '#6f97c4', dark: '#4f769f' },
  },
  {
    id: 'chef',
    icon: '🍳',
    labelKey: 'wardrobe.fish.chef',
    shape: 'tee',
    top: { light: '#fffdf8', dark: '#efe9db', edge: '#d9d3c2', print: 'none', printColor: '#e8795f' },
    bottom: { light: '#4a5570', dark: '#333c55', edge: '#2b3350', shape: 'pants' },
    hat: { shape: 'toque', light: '#fffdf8', dark: '#e3ddd0' },
    extra: 'apron',
  },
  {
    id: 'pjs',
    icon: '🌙',
    labelKey: 'wardrobe.fish.pjs',
    shape: 'tee',
    top: { light: '#c6d8f2', dark: '#9db8e2', edge: '#87a4d4', print: 'stars', printColor: '#f6d47b' },
    bottom: { light: '#b3c9ec', dark: '#8ea9d8', edge: '#7b96c9', shape: 'shorts' },
    hat: { shape: 'nightcap', light: '#c6d8f2', dark: '#8ea9d8' },
  },
  {
    id: 'date',
    icon: '💐',
    labelKey: 'wardrobe.fish.date',
    shape: 'shirt',
    top: { light: '#fff7f2', dark: '#f1dbd5', edge: '#e0c0ba', print: 'none', printColor: '#cf5e46' },
    bottom: { light: '#7c648c', dark: '#574267', edge: '#483657', shape: 'pants' },
    hat: { shape: 'beret', light: '#cd7f83', dark: '#a35f66' },
    extra: 'bowtie',
  },
];

export const OUTFITS = { bear: BEAR_OUTFITS, fish: FISH_OUTFITS };

export const DEFAULT_OUTFITS = { bear: 'cozy', fish: 'skater' };

export function outfitsFor(who) {
  return OUTFITS[who] ?? [];
}

/** Unknown ids fall back to the character's everyday clothes. */
export function outfitFor(who, id) {
  const list = outfitsFor(who);
  return list.find((outfit) => outfit.id === id) ?? list[0];
}

export function isValidOutfit(who, id) {
  return outfitsFor(who).some((outfit) => outfit.id === id);
}

export function sanitizeOutfits(raw) {
  const outfits = { ...DEFAULT_OUTFITS };
  for (const who of WHO) {
    const value = raw?.[who];
    if (typeof value === 'string' && isValidOutfit(who, value)) outfits[who] = value;
  }
  return outfits;
}
