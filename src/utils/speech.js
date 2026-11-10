import { isMuted } from './sound';

let cachedVoice = null;
let voicesRequested = false;

function supported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice() {
  if (!supported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  cachedVoice =
    voices.find((voice) => /^zh[-_]CN/i.test(voice.lang)) ||
    voices.find((voice) => /^zh/i.test(voice.lang)) ||
    null;
  voicesRequested = true;
  return cachedVoice;
}

export function speechSupported() {
  return supported();
}

/**
 * Read a word out loud with the browser's own Chinese voice. No network, no
 * extra download — and it respects the game's sound toggle.
 */
export function speakChinese(text) {
  if (!supported() || isMuted()) return false;
  const value = String(text ?? '').trim();
  if (!value) return false;

  const synth = window.speechSynthesis;
  const voice = cachedVoice ?? pickVoice();

  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  } catch {
    return false;
  }

  // Chrome loads the voice list asynchronously; ask once and cache it.
  if (!voicesRequested) {
    voicesRequested = true;
    synth.addEventListener?.('voiceschanged', () => pickVoice(), { once: true });
  }

  return true;
}
