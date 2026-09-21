// Two independent volume controls (bible/reference-screenshot-confirmed
// in-battle Options popup: separate BGM note icon and SFX speaker icon),
// each a 3-level cycle — Off / Low / High — rather than a continuous
// slider, matching the reference UI's own discrete icon-cycle behavior.
// A separate master `isMuted` flag (HomeScene's own quick toggle) overrides
// both outright, checked first in every play function below.
//
// Sound is a mix of two sources, both going through the same shared
// AudioContext (see getCtx): most one-shot event stingers (UI tap, deploy,
// hit, crit, cannon, victory, defeat) are still synthesized directly via
// oscillators — cheap, distinct, and nothing in the bundled asset kit is a
// closer match for "menu tock" or "cannon whump" than a purpose-tuned tone
// is. Real per-unit attack sounds, status-effect stingers, and all music
// (see playSfxFile/playMusic below) instead play real WAV files from the
// Origins Asset Kit's own bundled `Audio/`/`PvE/Music/` sets (copied into
// public/audio/ — see docs/BATTLE_CATS_MAPPING.md), the same "reuse the
// kit's own real assets over inventing a placeholder" approach already
// used for sprites/VFX.

const SFX_VOLUME_KEY = 'axieSkirmishSfxVolumeLevel';
const BGM_VOLUME_KEY = 'axieSkirmishBgmVolumeLevel';
const MUTED_KEY = 'axieSkirmishMuted';

// Index = level (0 Off / 1 Low / 2 High); value = gain multiplier.
export const VOLUME_LEVELS = [0, 0.5, 1];
export const VOLUME_LEVEL_LABELS = ['Off', 'Low', 'High'];
const DEFAULT_VOLUME_LEVEL = 2; // High

let audioCtx = null;

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
  refreshMusicGain(); // live-updates whatever's already playing — see playMusic
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
  refreshMusicGain();
}

// One short envelope-shaped tone: a fast linear attack into an exponential
// decay toward (near-)silence, which avoids the audible "click" a hard
// on/off would produce. Every synthesized sfx below is just one or a few of
// these, scheduled at different offsets/frequencies, each scaled by the
// current SFX volume level.
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

// A generic UI "tock" for menu navigation/confirm taps (Home's primary
// buttons, a Mission claim, a Gacha roll) — distinct from Deploy's own sfx
// below so an in-battle spawn still reads as its own, busier sound.
// A crisp two-tone "click" (a quick bright tick, then a softer low thock
// right on its heels) rather than the old single flat triangle blip — see
// UITheme.js's pressFeedback, which is now the ONE place this actually
// fires from for every createBcButton/createBcCircleButton in the game,
// instead of a handful of individual scenes remembering to call it
// themselves (most didn't, which is exactly why most of the game's
// buttons played nothing at all on tap).
export function playUiTapSfx() {
  playTone({ freq: 780, duration: 0.035, type: 'sine', peakGain: 0.14 });
  playTone({ freq: 480, startOffset: 0.02, duration: 0.05, type: 'sine', peakGain: 0.08 });
}

// A short, low-gain percussive "thwack" for a normal hit landing — kept
// quiet/short on purpose since many can overlap in a single frame (an AoE
// hit, several units attacking at once), unlike the rarer stingers below.
// Plays alongside (not instead of) a real per-attacker sound where one
// exists (see AttackVfx.js's fireAttackVfx) — this is the universal
// baseline every hit gets regardless of attacker, the real sound is the
// character-specific flavor layered on top.
// A dull, muted thud for tapping a still-locked stage node on the map
// (guide Chapter 06: low "bu" cue, no vibration) — deliberately the
// opposite character from playUiTapSfx's bright "tock" so a locked tap
// reads as a non-event rather than a normal confirm.
export function playLockedTapSfx() {
  playTone({ freq: 110, duration: 0.08, type: 'sine', peakGain: 0.08 });
}

// A short bright "pon" for the map screen's walking cat marker landing on
// its new stage after a clear (guide Chapter 06's ネコアイコンの挙動).
export function playMapArrivalSfx() {
  playTone({ freq: 700, duration: 0.05, type: 'sine', peakGain: 0.14 });
  playTone({ freq: 1050, startOffset: 0.05, duration: 0.09, type: 'sine', peakGain: 0.12 });
}

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

// --- Real audio files (one-shot sfx + looping music) ---------------------
//
// Both share one small in-memory cache of decoded buffers, keyed by URL, so
// a sound reused often (a unit's own attack clip, the currently-looping
// track) is only fetched/decoded once per page load. A missing/failed file
// just silently doesn't play — never worth surfacing to the player over a
// sound effect.
const bufferCache = new Map(); // url -> Promise<AudioBuffer>

function loadBuffer(ctx, url) {
  if (!bufferCache.has(url)) {
    bufferCache.set(
      url,
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data)),
    );
  }
  return bufferCache.get(url);
}

// One-shot real sound file (a unit's real attack clip, a status-effect
// stinger, ...) — scaled by SFX volume, same gating as playTone. `gain`
// (0-1) lets a caller balance an individually loud/quiet source file
// against the rest without re-encoding it.
export function playSfxFile(url, { gain = 0.8 } = {}) {
  if (isMuted()) return;
  const volume = VOLUME_LEVELS[getSfxVolumeLevel()];
  if (volume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;

  loadBuffer(ctx, url)
    .then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = gain * volume;
      source.connect(gainNode).connect(ctx.destination);
      source.start();
    })
    .catch(() => {}); // missing file / decode failure — no sound, no crash
}

// Looping real music track — one playing at a time. `musicUrl` is what the
// CALLER currently wants playing (set synchronously); `musicSource`/
// `musicGainNode` are the actual live nodes once decoding finishes. Calling
// playMusic again with the SAME url while it's already the active track is
// a no-op (covers e.g. re-entering HomeScene, which would otherwise restart
// its own bgm from frame 0 every time); a DIFFERENT url stops whatever's
// playing and starts loading the new one, discarding the old load if it
// was still in flight (see the `musicUrl !== url` check after the promise
// resolves — a slow-loading track that got superseded before it finished
// must not clobber whatever's playing by the time it arrives).
let musicUrl = null;
let musicSource = null;
let musicGainNode = null;

function currentMusicGain() {
  return isMuted() ? 0 : VOLUME_LEVELS[getBgmVolumeLevel()];
}

// Live-updates the currently playing track's own gain node (called from
// setBgmVolumeLevel/setMuted) — unlike Phaser's own Sound objects (which
// snapshot `volume` once at `.add()` time), this take immediate effect on
// whatever's already looping, no restart needed.
function refreshMusicGain() {
  if (musicGainNode) musicGainNode.gain.value = currentMusicGain();
}

function stopMusicNodes() {
  if (musicSource) {
    try {
      musicSource.stop();
    } catch {
      // Already stopped/never started — fine either way.
    }
    musicSource.disconnect();
    musicSource = null;
  }
  if (musicGainNode) {
    musicGainNode.disconnect();
    musicGainNode = null;
  }
}

// Warms the decoded-buffer cache for a track without playing it — call this
// for any music that might need to start INSTANTLY later (victory/defeat
// stings triggered by a game-over event) so the fetch+decode round trip
// (only ever paid once per URL per page load — see bufferCache) has
// already happened well before that moment, instead of playMusic() only
// starting it then and the player hearing a beat of silence first.
export function preloadMusic(url) {
  const ctx = getCtx();
  if (!ctx) return;
  loadBuffer(ctx, url).catch(() => {});
}

export function playMusic(url) {
  if (musicUrl === url && musicSource) return; // already the active track
  musicUrl = url;
  stopMusicNodes();

  const ctx = getCtx();
  if (!ctx) return;

  loadBuffer(ctx, url)
    .then((buffer) => {
      if (musicUrl !== url) return; // superseded by a later playMusic/stopMusic while this was loading
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gainNode = ctx.createGain();
      gainNode.gain.value = currentMusicGain();
      source.connect(gainNode).connect(ctx.destination);
      source.start();
      musicSource = source;
      musicGainNode = gainNode;
    })
    .catch(() => {});
}

export function stopMusic() {
  musicUrl = null;
  stopMusicNodes();
}
