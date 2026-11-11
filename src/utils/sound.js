const MUTE_KEY = 'bearTogether.muted';

let audioContext = null;
let muted = readMuted();

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistMuted() {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Sound preference is nice-to-have; ignore storage failures.
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = Boolean(next);
  persistMuted();
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

function ensureContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function note(context, frequency, startAt, duration, options = {}) {
  const { type = 'sine', volume = 0.035, detune = 0 } = options;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.detune.setValueAtTime(detune, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

const SOUNDS = {
  pet: (context, at) => {
    note(context, 784, at, 0.12, { type: 'sine', volume: 0.025 });
    note(context, 988, at + 0.055, 0.14, { type: 'sine', volume: 0.02 });
  },
  feed: (context, at) => {
    note(context, 523.25, at, 0.16, { type: 'triangle', volume: 0.03 });
    note(context, 659.25, at + 0.08, 0.2, { type: 'triangle', volume: 0.028 });
  },
  play: (context, at) => {
    note(context, 659.25, at, 0.12, { type: 'square', volume: 0.018 });
    note(context, 880, at + 0.06, 0.14, { type: 'square', volume: 0.018 });
    note(context, 1046.5, at + 0.12, 0.2, { type: 'sine', volume: 0.022 });
  },
  hug: (context, at) => {
    note(context, 392, at, 0.5, { type: 'sine', volume: 0.028 });
    note(context, 493.88, at + 0.04, 0.5, { type: 'sine', volume: 0.025 });
    note(context, 587.33, at + 0.08, 0.5, { type: 'sine', volume: 0.022 });
  },
  sleep: (context, at) => {
    note(context, 392, at, 0.32, { type: 'sine', volume: 0.022 });
    note(context, 293.66, at + 0.22, 0.4, { type: 'sine', volume: 0.02 });
  },
  message: (context, at) => {
    note(context, 880, at, 0.1, { type: 'sine', volume: 0.02 });
    note(context, 1174.66, at + 0.06, 0.16, { type: 'sine', volume: 0.018 });
  },
  sent: (context, at) => {
    note(context, 880, at, 0.08, { type: 'sine', volume: 0.012 });
  },
  join: (context, at) => {
    note(context, 440, at, 0.18, { type: 'triangle', volume: 0.025 });
    note(context, 554.37, at + 0.09, 0.22, { type: 'triangle', volume: 0.022 });
    note(context, 659.25, at + 0.18, 0.28, { type: 'sine', volume: 0.02 });
  },
  win: (context, at) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      note(context, frequency, at + index * 0.09, 0.28, { type: 'triangle', volume: 0.026 });
    });
  },
  softWin: (context, at) => {
    note(context, 523.25, at, 0.22, { type: 'sine', volume: 0.018 });
    note(context, 659.25, at + 0.1, 0.32, { type: 'sine', volume: 0.016 });
  },
  error: (context, at) => {
    note(context, 220, at, 0.16, { type: 'sine', volume: 0.02 });
    note(context, 196, at + 0.1, 0.2, { type: 'sine', volume: 0.018 });
  },
  knock: (context, at) => {
    note(context, 196, at, 0.1, { type: 'sine', volume: 0.05 });
    note(context, 146.83, at + 0.02, 0.14, { type: 'sine', volume: 0.045 });
  },
};

export function playSound(name) {
  if (muted) return;
  const context = ensureContext();
  if (!context) return;
  const sound = SOUNDS[name];
  if (!sound) return;
  try {
    sound(context, context.currentTime + 0.01);
  } catch {
    // Audio is decorative only.
  }
}
