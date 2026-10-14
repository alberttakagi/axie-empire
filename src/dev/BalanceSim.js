// Dev-only balance simulator (loaded by main.js only in `vite dev`).
// Plays real GameScene battles headlessly-ish: the scene runs normally, but
// the sim steps its update() + timer clock with a fixed delta in a tight
// loop (no rendering needed), driven by a simple bot:
//   - levels the Worker early, fires the cannon when ready,
//   - deploys every affordable, off-cooldown Formation unit (cheap units
//     act as meat shields, expensive ones as they become affordable).
// Profiles set up the save to model a player at a given point:
//   'maxed'  — everything maxed (dev unlock).
//   'onpace' — a player who reached this saga at a reasonable pace.
// Usage (browser console on the dev server):
//   await window.runBalanceSim({ stages: ['stage145','stage192'], profile: 'onpace' })
import { applyDevUnlock } from '../DevMode.js';
import { STAGE_CONFIG } from '../STAGE_CONFIG.js';
import { UNIT_CONFIG } from '../UNIT_CONFIG.js';
import { PROGRESSION_CONFIG } from '../PROGRESSION_CONFIG.js';
import { BASE_UPGRADE_CONFIG } from '../BASE_UPGRADE_CONFIG.js';
import { autoEquipActiveSlot } from '../Loadout.js';
import { _resetUnitCollectionCache } from '../UnitCollection.js';

const STEP_MS = 50;
const MAX_BATTLE_MS = 240000;
const BOT_EVERY_MS = 400;

function sagaIndexOf(stageId) {
  const n = parseInt(stageId.replace('stage', ''), 10);
  return Math.floor((n - 1) / 48); // 0..6
}

function setupProfile(profile, sagaIdx) {
  applyDevUnlock(); // start from a fully unlocked save, then dial down for 'onpace'
  if (profile === 'onpace') {
    const s = sagaIdx + 1;
    const level = Math.min(50, 10 + 7 * (s - 1));
    const evo = s >= 4 ? 2 : s >= 2 ? 1 : 0;
    const plus = Math.min(10, 2 * (s - 1));
    const progress = JSON.parse(localStorage.getItem('axieSkirmishPlayerProgress'));
    for (const key of Object.keys(UNIT_CONFIG)) {
      const maxEvo = PROGRESSION_CONFIG[key]?.evolutions?.length || 0;
      progress.units[key] = { level, extraCap: Math.max(0, level - 20), evolutionStage: Math.min(evo, maxEvo), plusLevels: plus };
    }
    for (const key of Object.keys(BASE_UPGRADE_CONFIG)) {
      progress.baseUpgrades[key] = Math.round((BASE_UPGRADE_CONFIG[key].maxLevel * s) / 7);
    }
    localStorage.setItem('axieSkirmishPlayerProgress', JSON.stringify(progress));
    // Treasure: previous sagas gold, current saga untouched.
    const treasure = {};
    for (const st of STAGE_CONFIG) if (sagaIndexOf(st.id) < sagaIdx) treasure[st.id] = 3;
    localStorage.setItem('axieSkirmishTreasure', JSON.stringify(treasure));
    // Collection: Rares from saga 2, Super Rares from 4, Ubers from 6.
    const owned = Object.keys(UNIT_CONFIG).filter((k) => {
      if (!UNIT_CONFIG[k].unlockRequirement?.gacha) return false;
      const r = PROGRESSION_CONFIG[k].rarity;
      return (r === 'Rare' && s >= 2) || (r === 'Super Rare' && s >= 4) || (r === 'Uber Rare' && s >= 6);
    });
    localStorage.setItem('axieSkirmishOwnedUnits', JSON.stringify(owned));
  }
  _resetUnitCollectionCache();
  autoEquipActiveSlot();
}

// Pumps Phaser's main loop by hand while waiting: a hidden/background tab
// gets no requestAnimationFrame, so scene start + loading would otherwise
// never progress.
async function waitFor(pred, timeoutMs = 90000) {
  const game = window.__game;
  const t0 = performance.now();
  while (!pred()) {
    if (performance.now() - t0 > timeoutMs) return false;
    game.step(performance.now(), 16);
    await new Promise((r) => setTimeout(r, 30));
  }
  return true;
}

async function simulateStage(game, stageId) {
  for (const s of game.scene.getScenes(true)) game.scene.stop(s.sys.settings.key);
  game.scene.start('GameScene', { stageId });
  const gs = game.scene.getScene('GameScene');
  await new Promise((r) => setTimeout(r, 300));
  const ready = await waitFor(() => gs.sys.settings.status === 5 && gs.unitCooldowns && !gs.load.isLoading() && gs.stage?.id === stageId);
  if (!ready) return { stageId, result: 'load-timeout' };
  (gs.tutorialObjects || []).forEach((o) => o.destroy());
  gs.tutorialObjects = null;
  gs.setPaused(false);
  gs.sys.pause(); // take over the loop: no real-time updates while we step

  const keys = Object.keys(gs.unitCooldowns).filter((k) => UNIT_CONFIG[k]);
  let t = 0;
  let botMs = 0;
  let result = 'timeout';
  while (t < MAX_BATTLE_MS) {
    gs.time.preUpdate(t, STEP_MS);
    gs.time.update(t, STEP_MS);
    gs.update(t, STEP_MS);
    t += STEP_MS;
    botMs += STEP_MS;
    if (gs.enemyBaseHp <= 0) { result = 'win'; break; }
    if (gs.baseHp <= 0 || gs.continueOfferObjects) { result = 'loss'; break; }
    if (gs.isGameOver) { result = gs.enemyBaseHp <= 0 ? 'win' : 'loss'; break; }
    if (botMs >= BOT_EVERY_MS) {
      botMs = 0;
      if (t < 90000 && gs.workerCatLevel < 6) gs.tryUpgradeWorkerCat();
      if (gs.enemies.length) gs.tryTriggerSpecialBurst();
      for (const k of keys.sort(() => Math.random() - 0.5)) gs.trySpawnUnit(k);
    }
    // Yield to the browser now and then so the tab stays responsive.
    if (t % 5000 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const out = {
    stageId,
    name: gs.stage.displayName,
    result,
    seconds: Math.round(t / 1000),
    baseHpLeft: Math.round((100 * gs.baseHp) / gs.baseMaxHp),
    enemyBaseHpLeft: Math.round((100 * gs.enemyBaseHp) / gs.enemyBaseMaxHp),
  };
  gs.sys.resume();
  return out;
}

window.runBalanceSim = async function runBalanceSim({ stages, profile = 'onpace' }) {
  const game = window.__game;
  const results = [];
  let lastSaga = -1;
  for (const stageId of stages) {
    const sagaIdx = sagaIndexOf(stageId);
    if (sagaIdx !== lastSaga) {
      setupProfile(profile, sagaIdx);
      lastSaga = sagaIdx;
    }
    try {
      results.push(await simulateStage(game, stageId));
    } catch (e) {
      results.push({ stageId, result: 'error', error: String(e) });
    }
    window.__simProgress = { done: results.length, total: stages.length, last: results[results.length - 1] };
  }
  window.__simResults = results;
  return results;
};
