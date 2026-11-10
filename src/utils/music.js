/**
 * Background sound for the cabin.
 *
 * Everything here is synthesised in the browser with Web Audio — there are no
 * audio files to download, and nothing is copied from a recording. That matters
 * for the "Ghibli" request: those pieces are still in copyright, so the piano
 * station is an original, slow arpeggio in the same spirit rather than a
 * cover.
 *
 * Stations: off · rain · fire · lofi · piano
 */

let ctx = null;
let master = null;
let reverb = null;
let station = 'off';
let volume = 0.45;
let muted = false;

let ambienceNodes = [];
const voices = new Set();
let audio = null;
let crackleTimer = null;
let schedulerTimer = null;
let nextBarTime = 0;
let bar = 0;

/**
 * Public-domain recordings, transcoded to ~96 kbps and served from /music.
 * Satie: Michael Laucke (Wikimedia Commons, PD).
 * Mozart: Vadim Chaimovich / Musopen (Wikimedia Commons, PD).
 */
const TRACKS = {
  satie: { src: '/music/gymnopedie.m4a', title: 'Gymnopédie No. 1', composer: 'Erik Satie' },
  mozart: { src: '/music/mozart-k330-3.m4a', title: 'Piano Sonata K.330 · III', composer: 'W. A. Mozart' },
};

const STATIONS = ['off', 'rain', 'fire', 'lofi', 'piano', ...Object.keys(TRACKS)];

const PROGRESSION = [
  { bass: 38, chord: [53, 57, 60, 64] }, // Dm9
  { bass: 43, chord: [53, 57, 59, 64] }, // G13
  { bass: 36, chord: [52, 55, 59, 62] }, // Cmaj9
  { bass: 45, chord: [55, 61, 64, 70] }, // A7b9
];

const BPM = 72;
const BEAT = 60 / BPM;

function mtof(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Track every scheduled voice so a station change can cut the old one short. */
function keep(node) {
  voices.add(node);
  node.onended = () => voices.delete(node);
  return node;
}

function stopVoices() {
  for (const node of voices) {
    try {
      node.stop();
      node.disconnect();
    } catch {
      // Already finished.
    }
  }
  voices.clear();
}

function ensureContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    const compressor = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(compressor);
    compressor.connect(ctx.destination);

    // Handy for debugging: lets us attach an analyser and check audio flow.
    window.__bearAudio = {
      get ctx() {
        return ctx;
      },
      get master() {
        return master;
      },
      get audio() {
        return audio;
      },
      get station() {
        return station;
      },
    };

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.4, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet);
    wet.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return impulse;
}

function noiseBuffer(seconds, kind) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
  } else {
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function stopAmbience() {
  for (const node of ambienceNodes) {
    try {
      node.stop?.();
      node.disconnect();
    } catch {
      // Already gone.
    }
  }
  ambienceNodes = [];
  if (crackleTimer) {
    clearTimeout(crackleTimer);
    crackleTimer = null;
  }
}

function startRain() {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(3, 'white');
  source.loop = true;

  const high = ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 700;

  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 7000;

  const gain = ctx.createGain();
  gain.gain.value = 0.09;

  // Slow gusts, so it does not sound like a static hiss.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.035;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  source.connect(high).connect(low).connect(gain).connect(master);
  source.start();
  lfo.start();
  ambienceNodes.push(source, lfo);
}

function startFire() {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(3, 'brown');
  source.loop = true;

  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 520;

  const gain = ctx.createGain();
  gain.gain.value = 0.16;

  source.connect(low).connect(gain).connect(master);
  source.start();
  ambienceNodes.push(source);

  // Random little pops: what makes it read as a fire instead of a hum.
  const crackle = () => {
    if (station !== 'fire' || !ctx) return;
    const burst = ctx.createBufferSource();
    burst.buffer = noiseBuffer(0.05, 'white');
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900 + Math.random() * 1400;
    band.Q.value = 1.2;
    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    burst.connect(band).connect(env).connect(master);
    burst.start(now);
    burst.stop(now + 0.12);
    crackleTimer = setTimeout(crackle, 90 + Math.random() * 320);
  };
  crackleTimer = setTimeout(crackle, 200);
}

function rhodes(time, midi, duration, level = 0.075) {
  const frequency = mtof(midi);
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = frequency;

  const overtone = ctx.createOscillator();
  overtone.type = 'triangle';
  overtone.frequency.value = frequency * 2;
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.18;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(level, time + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2400;

  carrier.connect(env);
  overtone.connect(overtoneGain).connect(env);
  env.connect(tone);
  tone.connect(master);
  tone.connect(reverb);

  carrier.start(time);
  overtone.start(time);
  carrier.stop(time + duration + 0.05);
  overtone.stop(time + duration + 0.05);
  keep(carrier);
  keep(overtone);
}

function pluck(time, midi, level = 0.05) {
  const frequency = mtof(midi);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(level, time + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 2.6);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  osc.connect(env).connect(tone);
  tone.connect(master);
  tone.connect(reverb);
  osc.start(time);
  osc.stop(time + 2.7);
  keep(osc);
}

function kick(time) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(0.35, time + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
  osc.connect(env).connect(master);
  osc.start(time);
  osc.stop(time + 0.3);
  keep(osc);
}

function snare(time) {
  const burst = ctx.createBufferSource();
  burst.buffer = noiseBuffer(0.2, 'white');
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1600;
  band.Q.value = 0.8;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(0.12, time + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
  burst.connect(band).connect(env).connect(master);
  burst.start(time);
  burst.stop(time + 0.2);
  keep(burst);
}

function hat(time, level = 0.05) {
  const burst = ctx.createBufferSource();
  burst.buffer = noiseBuffer(0.06, 'white');
  const high = ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 7000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(level, time + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  burst.connect(high).connect(env).connect(master);
  burst.start(time);
  burst.stop(time + 0.08);
  keep(burst);
}

function scheduleLoFiBar(startTime, index) {
  const chord = PROGRESSION[index % PROGRESSION.length];

  kick(startTime);
  kick(startTime + BEAT * 2);
  snare(startTime + BEAT);
  snare(startTime + BEAT * 3);

  for (let step = 0; step < 8; step += 1) {
    // Swing the off-beats a touch.
    const swing = step % 2 === 1 ? 0.055 : 0;
    hat(startTime + (step * BEAT) / 2 + swing, step % 2 === 0 ? 0.05 : 0.032);
  }

  for (const note of chord.chord) {
    rhodes(startTime + 0.02, note, BEAT * 2.4, 0.06);
  }
  rhodes(startTime + BEAT * 2.5, chord.chord[1], BEAT * 1.2, 0.035);
  rhodes(startTime + BEAT * 2.5, chord.chord[3], BEAT * 1.2, 0.03);

  pluck(startTime, chord.bass, 0.06);
  pluck(startTime + BEAT * 2, chord.bass + 7, 0.045);
}

function schedulePianoBar(startTime, index) {
  const chord = PROGRESSION[index % PROGRESSION.length];
  const tones = [...chord.chord, chord.chord[0] + 12];

  tones.forEach((note, step) => {
    pluck(startTime + (step * BEAT) / 2 + 0.02, note, 0.05);
  });
  // A second, softer pass an octave up — like a music box far away.
  tones.forEach((note, step) => {
    if (step % 2 === 0) pluck(startTime + (step * BEAT) / 2 + 0.28, note + 12, 0.022);
  });
  pluck(startTime, chord.bass, 0.07);
}

function startSequencer(kind) {
  const runBar = kind === 'piano' ? schedulePianoBar : scheduleLoFiBar;
  nextBarTime = ctx.currentTime + 0.15;
  bar = 0;

  const tick = () => {
    if (station !== 'lofi' && station !== 'piano') return;
    while (nextBarTime < ctx.currentTime + 0.6) {
      runBar(nextBarTime, bar);
      bar += 1;
      nextBarTime += BEAT * 4;
    }
  };
  tick();
  schedulerTimer = setInterval(tick, 120);
}

function stopSequencer() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  // Anything already scheduled would otherwise keep sounding after the switch.
  stopVoices();
}

function stopAudio() {
  if (!audio) return;
  try {
    audio.pause();
  } catch {
    // Already stopped.
  }
  audio.src = '';
  audio = null;
}

function playTrack(id) {
  const track = TRACKS[id];
  if (!track) return;
  audio = new Audio(track.src);
  audio.loop = true;
  audio.volume = muted ? 0 : volume;
  audio.play().catch(() => {
    // Autoplay blocked: the next click will retry.
  });
}

export function getStation() {
  return station;
}

export function getStations() {
  return STATIONS;
}

export function setMusicVolume(next) {
  volume = Math.min(1, Math.max(0, Number(next) || 0));
  if (master && !muted) master.gain.value = volume;
  if (audio) audio.volume = muted ? 0 : volume;
}

export function setMusicMuted(next) {
  muted = Boolean(next);
  if (master) master.gain.value = muted ? 0 : volume;
  if (audio) audio.volume = muted ? 0 : volume;
}

/** Switch station. Everything is created lazily on the first user gesture. */
export function setStation(next) {
  if (!STATIONS.includes(next)) return station;

  const context = ensureContext();
  if (!context) return station;

  if (next === station) return station;

  const FADE = 0.12;
  const faded = master && station !== 'off';

  // Fade out first: notes already scheduled would otherwise bleed into the
  // next station for a couple of seconds.
  if (faded) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + FADE);
  }

  station = next;

  const swap = () => {
    stopAmbience();
    stopSequencer();
    stopAudio();

    if (next === 'rain') startRain();
    else if (next === 'fire') startFire();
    else if (next === 'lofi' || next === 'piano') startSequencer(next);
    else if (TRACKS[next]) playTrack(next);

    if (master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(muted ? 0 : volume, now + 0.25);
    }
  };

  if (faded) window.setTimeout(swap, FADE * 1000 + 20);
  else swap();

  return station;
}

export function stopMusic() {
  stopAmbience();
  stopSequencer();
  stopAudio();
  station = 'off';
}
