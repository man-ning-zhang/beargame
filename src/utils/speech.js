import { isMuted } from './sound';

let cachedVoice = null;
let cachedLangPrefix = '';
let voicesRequested = false;

function supported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(lang) {
  if (!supported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefix = String(lang).slice(0, 2).toLowerCase();
  cachedLangPrefix = prefix;
  cachedVoice =
    voices.find((voice) => new RegExp(`^${prefix}[-_][A-Z]{2}`, 'i').test(voice.lang)) ||
    voices.find((voice) => new RegExp(`^${prefix}`, 'i').test(voice.lang)) ||
    null;
  voicesRequested = true;
  return cachedVoice;
}

export function speechSupported() {
  return supported();
}

/**
 * Read a word out loud with the browser's own voice. No network, no extra
 * download — and it respects the game's sound toggle.
 */
export function speak(text, lang = 'zh-CN') {
  if (!supported() || isMuted()) return false;
  const value = String(text ?? '').trim();
  if (!value) return false;

  const synth = window.speechSynthesis;
  const prefix = String(lang).slice(0, 2).toLowerCase();
  const voice = (cachedLangPrefix === prefix ? cachedVoice : null) ?? pickVoice(lang);

  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = lang;
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
    synth.addEventListener?.('voiceschanged', () => pickVoice(lang), { once: true });
  }

  return true;
}
