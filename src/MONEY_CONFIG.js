// Money economy knobs (formerly the "energy" system). Shared by both
// endless and stage mode — stage mode overrides startingMoney/
// moneyAccrualPerSec per stage via STAGE_CONFIG.js, everything else here
// (kill bonus, cap-upgrade curve) is global across modes.
//
// Currency switched from an invented "$" scale to yen, matching Battle
// Cats' own denomination directly — unit costs in UNIT_CONFIG.js are now
// literal real prices (no conversion factor needed), which is what
// resolved the earlier confusion around comparing rebalanced costs against
// an arbitrary dollar-scale cap.

export const MONEY_CONFIG = {
  // Endless-mode defaults; stage mode uses STAGE_CONFIG's startingMoney instead.
  //
  // 1000 matches the real game's well-known "start every stage with 1000¥"
  // convention directly (not derived/scaled — this is the actual value).
  startingCap: 1000,
  // Not a sourced real value (no exact datamined accrual rate found, same
  // gap flagged during the earlier dollar-scale rebalance) — kept at the
  // same relative pace as before: ~5% of the cap per second, so a fully
  // spent wallet refills in ~20s, same feel as pre-conversion.
  accrualPerSec: 50,

  // Killing an enemy grants enemy.config.threat * killBonusMultiplier yen.
  // `threat` itself isn't a real Battle Cats stat (see ENEMY_CONFIG.js) so
  // this multiplier is still just reasoned proportionally: same ~11% of a
  // basic unit's cost per basic-enemy kill as before the yen conversion.
  killBonusMultiplier: 3,

  // "Upgrade Cap" button: first purchase costs capUpgradeBaseCost, each
  // subsequent purchase costs capUpgradeCostMultiplier times the last one,
  // and each purchase raises the cap by a flat capUpgradeAmount.
  //
  // This mechanic doesn't exist in the real game (it's our own pacing
  // guardrail) so these stay reasoned, not sourced. capUpgradeBaseCost
  // MUST stay below the lowest moneyCap it'll be checked against — money
  // can never exceed moneyCap (both accrual and kill-bonus gains clamp to
  // it in GameScene), so a cost at/above the cap is a permanent soft-lock.
  // Set to 75% of startingCap (same margin used before), which also clears
  // every per-stage cap in STAGE_CONFIG.js, including Hard tier's 800.
  capUpgradeBaseCost: 750,
  capUpgradeCostMultiplier: 1.5,
  capUpgradeAmount: 500,
};
