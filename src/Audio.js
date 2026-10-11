// Two independent volume controls (bible/reference-screenshot-confirmed
// in-battle Options popup: separate BGM note icon and SFX speaker icon),
// each a 4-level cycle — Off / Low / Medium / High — rather than a
// continuous slider, matching the reference UI's own discrete icon-cycle
// behavior. User feedback: the old 2-step Low/High (0.5/1) had no quiet
// option — old Low is now Medium, and the new Low is a genuinely quiet 0.15.
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

// Index = level (0 Off / 1 Low / 2 Medium / 3 High); value = gain multiplier.
// Shared by both SFX and BGM's own level cycles (see get/setSfxVolumeLevel
// vs get/setBgmVolumeLevel below) — SFX_MASTER_GAIN further below is the
// SFX-only attenuation, so changing THIS array would also quiet music.
export const VOLUME_LEVELS = [0, 0.15, 0.5, 1];
export const VOLUME_LEVEL_LABELS = ['Off', 'Low', 'Medium', 'High'];
const DEFAULT_VOLUME_LEVEL = 3; // High

// User feedback: sfx as a whole read too loud/busy, especially with several
// units attacking in the same frame. A flat extra attenuation applied only
// to sfx (every playTone/playSfxFile call below) rather than lowering
// VOLUME_LEVELS itself, which BGM's own volume also reads — this keeps
// every player's chosen Off/Low/Medium/High SFX level meaning the same
// relative thing to each other, just quieter overall, and leaves music
// untouched.
const SFX_MASTER_GAIN = 0.55;

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

// One-time migration for saves written under the old 3-level Off/Low/High
// scheme (max index 2): index 1 (old Low, 0.5 gain) now means Medium, so a
// bare re-read against the new 4-level range would silently reinterpret it
// as the new, quieter Low (0.15) — and old index 2 (High) would silently
// become Medium (0.5) — changing a real saved preference out from under the
// player. Remaps {1->2, 2->3} exactly once per key, flagged so it never
// re-applies to a level the player deliberately sets afterward.
function migrateLevel(key) {
  const migratedFlagKey = `${key}_migratedV2`;
  try {
    if (localStorage.getItem(migratedFlagKey) === 'true') return;
    const raw = localStorage.getItem(key);
    const oldLevel = raw === null ? null : Number(raw);
    if (Number.isInteger(oldLevel) && oldLevel >= 1 && oldLevel <= 2) {
      localStorage.setItem(key, String(oldLevel + 1));
    }
    localStorage.setItem(migratedFlagKey, 'true');
  } catch {
    // localStorage unavailable — nothing to migrate this run.
  }
}

function readLevel(key) {
  migrateLevel(key);
  try {
    const raw = localStorage.getItem(key);
    const level = raw === null ? DEFAULT_VOLUME_LEVEL : Number(raw);
    return Number.isInteger(level) && level >= 0 && level <= 3 ? level : DEFAULT_VOLUME_LEVEL;
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
  gain.gain.linearRampToValueAtTime(peakGain * volume * SFX_MASTER_GAIN, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
  // Real bug, found live: neither node was ever disconnected once its one
  // shot finished — harmless on most browsers (GC reclaims an unreferenced
  // node once nothing's holding it), but WebKit/Safari is documented to
  // keep a connected node's whole audio-graph chain alive until it's
  // EXPLICITLY disconnected, GC or not. playTone is the single
  // highest-frequency sound call in the game (every UI tap, every hit —
  // "many can overlap in a single frame," per this function's own
  // callers), so on an iOS Safari/WKWebView session (notably a link
  // opened from X's in-app browser — see index.html's own note) a long
  // battle's worth of un-disconnected nodes piling up is a real,
  // compounding memory leak with nothing to do with scene transitions or
  // the texture cache — exactly the kind of thing that would show up as
  // "still crashes mid-game" after those were already fixed. `ended`
  // fires once playback genuinely finishes; disconnecting there tears the
  // whole node down immediately instead of leaving it for a GC pass
  // WebKit isn't reliably making.
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

// Shared white-noise buffer for impact layers (explosions, thuds, debris).
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function sfxGainScale() {
  if (isMuted()) return 0;
  return VOLUME_LEVELS[getSfxVolumeLevel()] * SFX_MASTER_GAIN;
}

// Filtered noise burst — the "body" of an explosion/impact that pure
// oscillators can't produce. `filterFrom`→`filterTo` sweeps a lowpass so a
// blast starts bright and rolls off into rumble.
function playNoise({ startOffset = 0, duration = 0.3, peakGain = 0.2, filterFrom = 4000, filterTo = 200, q = 0.7 }) {
  const scale = sfxGainScale();
  if (scale <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + startOffset;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(filterFrom, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), start + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGain * scale, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

// Oscillator with a pitch glide — sub-bass "drops" and charge-up whines.
function playSweep({ from, to, startOffset = 0, duration = 0.4, type = 'sine', peakGain = 0.2, attack = 0.01 }) {
  const scale = sfxGainScale();
  if (scale <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGain * scale, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
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

// ±6% pitch jitter so a wall of identical hits doesn't fatigue the ear.
const jitter = () => 0.94 + Math.random() * 0.12;

// Hit layers fire once per damage instance — an AoE or a crowd can land
// dozens in one frame (measured: 118 overlapping). One shared limiter: at
// most one normal hit every 45ms, one crit every 70ms.
let lastHitAt = 0;
let lastCritAt = 0;

export function playHitSfx() {
  const now = performance.now();
  if (now - lastHitAt < 45) return;
  lastHitAt = now;
  const j = jitter();
  playTone({ freq: 220 * j, duration: 0.06, type: 'square', peakGain: 0.07 });
  playNoise({ duration: 0.06, peakGain: 0.08, filterFrom: 2500 * j, filterTo: 400 });
}

// Brighter/higher two-tone version for a Critical Hit landing, so a crit
// reads as distinct from a normal hit by ear as well as by the bigger
// floating number (see CombatFeedback.js).
export function playCritSfx() {
  const now = performance.now();
  if (now - lastCritAt < 70) return;
  lastCritAt = now;
  playNoise({ duration: 0.12, peakGain: 0.14, filterFrom: 6000, filterTo: 600 });
  playTone({ freq: 660, duration: 0.05, type: 'square', peakGain: 0.13 });
  playTone({ freq: 990, startOffset: 0.04, duration: 0.07, type: 'square', peakGain: 0.1 });
}

// Layered cannon blast: a short rising "charge" zip, then a bright noise
// crack rolling off into rumble, a falling sub-bass drop for weight, and a
// scatter of small debris ticks afterward.
export function playCannonSfx() {
  playSweep({ from: 300, to: 1400, duration: 0.12, type: 'sawtooth', peakGain: 0.06, attack: 0.1 });
  playNoise({ startOffset: 0.1, duration: 0.9, peakGain: 0.32, filterFrom: 7000, filterTo: 120 });
  playSweep({ from: 140, to: 32, startOffset: 0.1, duration: 0.8, type: 'sine', peakGain: 0.42 });
  playTone({ freq: 90, startOffset: 0.1, duration: 0.25, type: 'sawtooth', peakGain: 0.12 });
  for (let i = 0; i < 5; i++) {
    playNoise({ startOffset: 0.35 + i * 0.07 + Math.random() * 0.04, duration: 0.05, peakGain: 0.05, filterFrom: 3500, filterTo: 1500, q: 4 });
  }
}

export function playBossShockwaveSfx() {
  playSweep({ from: 90, to: 28, duration: 1.2, type: 'sawtooth', peakGain: 0.22 });
  playNoise({ duration: 1.1, peakGain: 0.25, filterFrom: 900, filterTo: 60 });
  playTone({ freq: 55, startOffset: 0.05, duration: 0.9, type: 'sine', peakGain: 0.3 });
}

// Bright two-note "ka-ching" for kill payouts. Throttled: a swarm dying
// at once would otherwise stack into noise.
let lastCoinAt = 0;
export function playCoinSfx() {
  const now = performance.now();
  if (now - lastCoinAt < 90) return;
  lastCoinAt = now;
  const j = jitter();
  playTone({ freq: 1320 * j, duration: 0.06, type: 'triangle', peakGain: 0.07 });
  playTone({ freq: 1980 * j, startOffset: 0.05, duration: 0.12, type: 'triangle', peakGain: 0.06 });
}

// Soft "poof" for a unit/enemy defeat (pairs with GameScene.playDeathPop).
export function playDefeatPoofSfx() {
  playNoise({ duration: 0.22, peakGain: 0.07, filterFrom: 1800, filterTo: 200 });
  playSweep({ from: 500, to: 180, duration: 0.18, type: 'triangle', peakGain: 0.05 });
}

// Gacha reveal sequence (GachaScene) — a rising 4-note arpeggio for the
// "something's about to happen" suspense beat before any reward shows,
// then one reveal stinger per rarity tier, escalating in note count/pitch/
// gain so a rarer pull reads as a bigger deal by ear, not just by color.
export function playGachaChargeSfx() {
  [440, 554, 659, 880].forEach((freq, i) => {
    playTone({ freq, startOffset: i * 0.09, duration: 0.16, type: 'triangle', peakGain: 0.1 });
  });
}

const GACHA_REVEAL_SFX = {
  common: () => {
    playTone({ freq: 700, duration: 0.08, type: 'sine', peakGain: 0.12 });
  },
  rare: () => {
    playTone({ freq: 700, duration: 0.06, type: 'sine', peakGain: 0.13 });
    playTone({ freq: 1050, startOffset: 0.05, duration: 0.1, type: 'sine', peakGain: 0.12 });
  },
  epic: () => {
    playTone({ freq: 660, duration: 0.06, type: 'sine', peakGain: 0.13 });
    playTone({ freq: 880, startOffset: 0.05, duration: 0.08, type: 'sine', peakGain: 0.13 });
    playTone({ freq: 1320, startOffset: 0.1, duration: 0.14, type: 'sine', peakGain: 0.13 });
  },
  legendary: () => {
    playTone({ freq: 70, duration: 0.5, type: 'sawtooth', peakGain: 0.2 }); // low fanfare rumble underneath
    [660, 880, 1100, 1320, 1760].forEach((freq, i) => {
      playTone({ freq, startOffset: i * 0.07, duration: 0.22, type: 'triangle', peakGain: 0.16 });
    });
  },
};

export function playGachaRevealSfx(rarity) {
  (GACHA_REVEAL_SFX[rarity] || GACHA_REVEAL_SFX.common)();
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
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data)),
    );
    // Don't cache a failure forever — one mobile network blip used to
    // silence that sound for the rest of the session.
    bufferCache.get(url).catch(() => bufferCache.delete(url));
  }
  return bufferCache.get(url);
}

// One-shot real sound file (a unit's real attack clip, a status-effect
// stinger, ...) — scaled by SFX volume, same gating as playTone. `gain`
// (0-1) lets a caller balance an individually loud/quiet source file
// against the rest without re-encoding it.
// Voice limiting (Round 2): per-character attack sounds used to turn a big
// fight into noise. A `group` caps how many of its clips can sound at once
// (`maxVoices`), and the same url can't retrigger within `minIntervalMs` —
// a crowd of identical units reads as one rhythmic hit instead of a smear.
// `detune` (cents, random ±) keeps repeats from sounding machine-gunned.
const groupVoices = new Map(); // group -> active count
const lastPlayedAt = new Map(); // url -> ms

export function playSfxFile(url, { gain = 0.8, group = null, maxVoices = 4, minIntervalMs = 0, detune = 0 } = {}) {
  if (isMuted()) return;
  const volume = VOLUME_LEVELS[getSfxVolumeLevel()];
  if (volume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Suspended context (iOS before a gesture, backgrounded tab): sources
  // wouldn't end, so a group's voices would stay "taken" and mute it.
  if (group && ctx.state !== 'running') return;
  const now = performance.now();
  if (minIntervalMs && now - (lastPlayedAt.get(url) ?? -Infinity) < minIntervalMs) return;
  if (group && (groupVoices.get(group) ?? 0) >= maxVoices) return;
  lastPlayedAt.set(url, now);
  if (group) groupVoices.set(group, (groupVoices.get(group) ?? 0) + 1);
  const releaseVoice = () => {
    if (group) groupVoices.set(group, Math.max(0, (groupVoices.get(group) ?? 1) - 1));
  };

  loadBuffer(ctx, url)
    .then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (detune) source.detune.value = (Math.random() * 2 - 1) * detune;
      const gainNode = ctx.createGain();
      gainNode.gain.value = gain * volume * SFX_MASTER_GAIN;
      source.connect(gainNode).connect(ctx.destination);
      source.start();
      // See playTone's own comment on why this matters on WebKit/Safari
      // specifically — every per-unit attack clip and status stinger in
      // the game goes through this same one-shot path.
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        releaseVoice();
      };
    })
    .catch(releaseVoice); // missing file / decode failure — no sound, no crash
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

let musicToken = 0;

export function playMusic(url) {
  if (musicUrl === url && musicSource) return; // already the active track
  musicUrl = url;
  stopMusicNodes();
  // Token, not just a url compare: two pending loads of the SAME url (e.g.
  // stop + replay before the first decode finished) both passed the url
  // check and each started a looping source — the orphan could never be
  // stopped and played over every later scene.
  const token = ++musicToken;

  const ctx = getCtx();
  if (!ctx) return;

  loadBuffer(ctx, url)
    .then((buffer) => {
      if (token !== musicToken || musicUrl !== url) return; // superseded by a later playMusic/stopMusic while this was loading
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
  musicToken++;
  stopMusicNodes();
}
