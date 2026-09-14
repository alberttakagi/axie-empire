// Placeholder audio (bible §A.10.8: "short, distinct audio stingers... cheap
// to build and disproportionately important") — synthesized directly via the
// Web Audio API rather than shipped sound files, the audio equivalent of this
// build's colored-shape placeholder sprites (see UNIT_CONFIG.js's `sprite`
// field): real deploy/victory/defeat/cannon/music assets can replace these
// functions wholesale later without touching any call site that plays them.
//
// A mute preference persists across sessions (localStorage) and is checked
// before anything plays; HomeScene exposes the toggle.

const STORAGE_KEY = 'axieSkirmishMuted';

let audioCtx = null;
let musicTimer = null;

function getCtx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null; // no Web Audio support — sfx silently no-op
    audioCtx = new AudioContextClass();
  }
  // Browsers start a fresh AudioContext 'suspended' until a user gesture
  // fires; every playback call tries to resume it, a harmless no-op once
  // it's already running.
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

export function isMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // localStorage unavailable — the preference just won't persist this run.
  }
  if (muted) stopMusic();
}

// One short envelope-shaped tone: a fast linear attack into an exponential
// decay toward (near-)silence, which avoids the audible "click" a hard
// on/off would produce. Every sfx below is just one or a few of these,
// scheduled at different offsets/frequencies.
function playTone({ freq, startOffset = 0, duration = 0.15, type = 'sine', peakGain = 0.18 }) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playDeploySfx() {
  playTone({ freq: 520, duration: 0.09, type: 'square', peakGain: 0.12 });
}

export function playCannonSfx() {
  // A quick two-tone descending "whump" rather than a single flat tone.
  playTone({ freq: 180, duration: 0.35, type: 'sawtooth', peakGain: 0.22 });
  playTone({ freq: 90, startOffset: 0.05, duration: 0.3, type: 'sawtooth', peakGain: 0.18 });
}

export function playBossShockwaveSfx() {
  playTone({ freq: 70, duration: 0.6, type: 'sawtooth', peakGain: 0.25 });
}

export function playVictorySfx() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    playTone({ freq, startOffset: i * 0.11, duration: 0.25, type: 'triangle', peakGain: 0.2 });
  });
}

export function playDefeatSfx() {
  [392, 349.23, 293.66, 261.63].forEach((freq, i) => {
    playTone({ freq, startOffset: i * 0.13, duration: 0.3, type: 'sawtooth', peakGain: 0.18 });
  });
}

// Battle music (§A.10.8: "an upbeat looping battle music bed") — a plain
// repeating 4-note bassline, deliberately understated (low gain, simple
// waveform) since it has to loop indefinitely without becoming grating.
// Scheduled with setInterval rather than pre-queued on the AudioContext
// clock — acceptable drift for a placeholder loop, not a claim of sample-
// accurate timing.
const MUSIC_PATTERN = [130.81, 130.81, 164.81, 146.83]; // C3 C3 E3 D3
const MUSIC_NOTE_MS = 380;

export function startMusic() {
  if (musicTimer) return; // already running — never stack multiple loops

  let step = 0;
  const playStep = () => {
    playTone({ freq: MUSIC_PATTERN[step % MUSIC_PATTERN.length], duration: 0.3, type: 'triangle', peakGain: 0.06 });
    step += 1;
  };
  playStep();
  musicTimer = setInterval(playStep, MUSIC_NOTE_MS);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
