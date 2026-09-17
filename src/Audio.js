// Placeholder audio (bible §A.10.8: "short, distinct audio stingers... cheap
// to build and disproportionately important") — synthesized directly via the
// Web Audio API rather than shipped sound files, the audio equivalent of this
// build's colored-shape placeholder sprites (see UNIT_CONFIG.js's `sprite`
// field): real deploy/victory/defeat/cannon/music assets can replace these
// functions wholesale later without touching any call site that plays them.
//
// Two independent volume controls (bible/reference-screenshot-confirmed
// in-battle Options popup: separate BGM note icon and SFX speaker icon),
// each a 3-level cycle — Off / Low / High — rather than a continuous
// slider, matching the reference UI's own discrete icon-cycle behavior.
// A separate master `isMuted` flag (HomeScene's own quick toggle) overrides
// both outright, checked first in every play function below.

const SFX_VOLUME_KEY = 'axieSkirmishSfxVolumeLevel';
const BGM_VOLUME_KEY = 'axieSkirmishBgmVolumeLevel';
const MUTED_KEY = 'axieSkirmishMuted';

// Index = level (0 Off / 1 Low / 2 High); value = gain multiplier.
export const VOLUME_LEVELS = [0, 0.5, 1];
export const VOLUME_LEVEL_LABELS = ['Off', 'Low', 'High'];
const DEFAULT_VOLUME_LEVEL = 2; // High

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

function readLevel(key) {
  try {
    const raw = localStorage.getItem(key);
    const level = raw === null ? DEFAULT_VOLUME_LEVEL : Number(raw);
    return Number.isInteger(level) && level >= 0 && level <= 2 ? level : DEFAULT_VOLUME_LEVEL;
  } catch {
    return DEFAULT_VOLUME_LEVEL;
  }
}

function writeLevel(key, level) {
  try {
    localStorage.setItem(key, String(level));
  } catch {
    // localStorage unavailable — the preference just won't persist this run.
  }
}

export function getSfxVolumeLevel() {
  return readLevel(SFX_VOLUME_KEY);
}

export function setSfxVolumeLevel(level) {
  writeLevel(SFX_VOLUME_KEY, level);
}

// Cycles Off -> Low -> High -> Off and returns the new level, so a caller
// (the in-battle Settings popup) can just re-render off the return value.
export function cycleSfxVolumeLevel() {
  const next = (getSfxVolumeLevel() + 1) % VOLUME_LEVELS.length;
  setSfxVolumeLevel(next);
  return next;
}

export function getBgmVolumeLevel() {
  return readLevel(BGM_VOLUME_KEY);
}

export function setBgmVolumeLevel(level) {
  writeLevel(BGM_VOLUME_KEY, level);
  // Raising it back above 0 mid-battle should resume playing without
  // GameScene needing to call startMusic() again — see tryStartMusicTimer.
  // Dropping to 0 needs no explicit stop: the running timer's own playStep
  // already checks the live level every note and just skips silently.
  if (level > 0) tryStartMusicTimer();
}

export function cycleBgmVolumeLevel() {
  const next = (getBgmVolumeLevel() + 1) % VOLUME_LEVELS.length;
  setBgmVolumeLevel(next);
  return next;
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // localStorage unavailable — the preference just won't persist this run.
  }
  if (!muted) tryStartMusicTimer(); // see setBgmVolumeLevel's comment — same resume logic
}

// One short envelope-shaped tone: a fast linear attack into an exponential
// decay toward (near-)silence, which avoids the audible "click" a hard
// on/off would produce. Every sfx below is just one or a few of these,
// scheduled at different offsets/frequencies, each scaled by the current
// SFX volume level.
function playTone({ freq, startOffset = 0, duration = 0.15, type = 'sine', peakGain = 0.18 }) {
  if (isMuted()) return;
  const volume = VOLUME_LEVELS[getSfxVolumeLevel()];
  if (volume <= 0) return;

  const ctx = getCtx();
  if (!ctx) return;

  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGain * volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playDeploySfx() {
  playTone({ freq: 520, duration: 0.09, type: 'square', peakGain: 0.12 });
}

// A generic UI "tock" for menu navigation/confirm taps (Home's primary
// buttons, a Mission claim, a Gacha roll) — distinct from Deploy's own sfx
// above so an in-battle spawn still reads as its own, busier sound.
export function playUiTapSfx() {
  playTone({ freq: 340, duration: 0.05, type: 'triangle', peakGain: 0.1 });
}

// A short, low-gain percussive "thwack" for a normal hit landing — kept
// quiet/short on purpose since many can overlap in a single frame (an AoE
// hit, several units attacking at once), unlike the rarer stingers below.
export function playHitSfx() {
  playTone({ freq: 220, duration: 0.06, type: 'square', peakGain: 0.09 });
}

// Brighter/higher two-tone version for a Critical Hit landing, so a crit
// reads as distinct from a normal hit by ear as well as by the bigger
// floating number (see CombatFeedback.js).
export function playCritSfx() {
  playTone({ freq: 660, duration: 0.05, type: 'square', peakGain: 0.13 });
  playTone({ freq: 990, startOffset: 0.04, duration: 0.07, type: 'square', peakGain: 0.1 });
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
// accurate timing. Volume is read fresh every note, so cycling the BGM
// level mid-battle takes effect on the very next note rather than needing
// a restart.
const MUSIC_PATTERN = [130.81, 130.81, 164.81, 146.83]; // C3 C3 E3 D3
const MUSIC_NOTE_MS = 380;
const MUSIC_BASE_GAIN = 0.06;

// `battleActive` (a battle is in progress, between GameScene's own
// startMusic()/stopMusic() calls) is deliberately a SEPARATE concept from
// `musicTimer` (whether the interval is actually ticking right now): a
// battle can be active with the timer never started at all (BGM was
// muted/Off from the very first note), and cycling the BGM level back up
// mid-battle needs to (re)create that timer — see tryStartMusicTimer,
// called from both startMusic and the volume setters above. Earlier drafts
// of this conflated the two and broke resuming BGM after muting it
// mid-battle; keep them separate.
let battleActive = false;
let musicStep = 0;

function tryStartMusicTimer() {
  if (musicTimer) return; // already ticking
  if (!battleActive) return; // no battle wants music right now
  if (isMuted() || getBgmVolumeLevel() === 0) return; // battle wants it, but the volume says silence

  const playStep = () => {
    if (isMuted() || getBgmVolumeLevel() === 0) return; // skip this note rather than tearing the timer down
    playMusicNote(MUSIC_PATTERN[musicStep % MUSIC_PATTERN.length]);
    musicStep += 1;
  };
  playStep();
  musicTimer = setInterval(playStep, MUSIC_NOTE_MS);
}

export function startMusic() {
  battleActive = true;
  musicStep = 0;
  tryStartMusicTimer();
}

// A tone scaled by the BGM volume level instead of the SFX one — playTone
// itself always scales by SFX volume, which would make BGM incorrectly
// follow the SFX knob, so music notes bypass it and talk to the
// AudioContext directly.
function playMusicNote(freq) {
  const ctx = getCtx();
  if (!ctx) return;
  const volume = VOLUME_LEVELS[getBgmVolumeLevel()];
  if (volume <= 0) return;

  const start = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(MUSIC_BASE_GAIN * volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.32);
}

export function stopMusic() {
  battleActive = false;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
