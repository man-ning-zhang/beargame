export const ACTIONS = [
  {
    id: 'feed',
    icon: '🍯',
    label: '喂蜂蜜',
    effect: '饱腹 +26',
    tone: 'amber',
    cooldown: 10,
  },
  {
    id: 'play',
    icon: '🧶',
    label: '玩毛线',
    effect: '心情 +20',
    tone: 'coral',
    cooldown: 14,
  },
  {
    id: 'hug',
    icon: '🫂',
    label: '抱一抱',
    effect: '亲密 +4',
    tone: 'pink',
    cooldown: 25,
  },
  {
    id: 'sleep',
    icon: '🌙',
    label: '哄它睡',
    effect: '精力 +35',
    tone: 'sky',
    cooldown: 60,
  },
];

export const QUICK_EMOJIS = ['❤️', '😘', '🐻', '✨', '🥺', '😴'];

export const ACTION_LABELS = Object.fromEntries(ACTIONS.map((action) => [action.id, action]));

export function symbolFor(seat) {
  return seat === 'host' ? 'X' : 'O';
}

export function otherSeat(seat) {
  return seat === 'host' ? 'guest' : 'host';
}

export function formatClock(timestamp) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
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
