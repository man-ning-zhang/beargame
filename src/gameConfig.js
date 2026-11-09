export const ACTIONS = [
  {
    id: 'feed',
    icon: '🍯',
    labelKey: 'action.feed.label',
    effectKey: 'action.feed.effect',
    tone: 'amber',
    cooldown: 10,
  },
  {
    id: 'play',
    icon: '🧶',
    labelKey: 'action.play.label',
    effectKey: 'action.play.effect',
    tone: 'coral',
    cooldown: 14,
  },
  {
    id: 'hug',
    icon: '🫂',
    labelKey: 'action.hug.label',
    effectKey: 'action.hug.effect',
    tone: 'pink',
    cooldown: 25,
  },
  {
    id: 'sleep',
    icon: '🌙',
    labelKey: 'action.sleep.label',
    effectKey: 'action.sleep.effect',
    tone: 'sky',
    cooldown: 60,
  },
];

export const QUICK_EMOJIS = ['❤️', '😘', '🐻', '✨', '🥺', '😴'];

export function symbolFor(seat) {
  return seat === 'host' ? 'X' : 'O';
}

export function otherSeat(seat) {
  return seat === 'host' ? 'guest' : 'host';
}

export function formatClock(timestamp) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function initialOf(name) {
  return Array.from(String(name || '?'))[0] || '?';
}
