# Battle Cats Replica Pass — Roster Mapping, Decisions, Roadmap

Written during an overnight autonomous pass, driven by the user's own
"にゃんこ大戦争 完全解剖ガイド" guide (`nyanko_guide.html`, downloaded from a
Claude artifact — battlecats-db-sourced). Scope for this pass, per the
user's own explicit answers before going to sleep:

- **Roster scope:** Chapter 1 core roster only (the real Basic-tier
  lineages + Empire of Cats' early enemy roster) — not the full 700+ unit
  real game.
- **Stage fidelity:** rebuild the stage list to mirror real Empire of Cats
  pacing (not keep the old placeholder difficulty curve).
- **Roster expansion:** stick to the named starter Axies already in the
  asset kit (19 available — see
  `tools/axie-origins-asset-kit/Assets/OriginsKit/Catalogs/pve-starters.json`),
  one Axie per Battle Cats lineage, using that Axie's own 2 real art tiers
  (base/"bodyStage 0", evolved/"bodyStage 1") for that lineage's 3 real
  Forms: Form 1 = base art, no glow; Form 2 = evolved art + light-blue glow;
  Form 3 = the *same* evolved art + purple glow instead.
- **Assets:** needs-list only — no attempt to generate new art (no Blender/
  Godot access in this environment anyway).

## Roster mapping — the 9 real Chapter-1 Basic-tier lineages

| UNIT_CONFIG key | Real lineage (Form1→2→3) | Axie | Identity |
|---|---|---|---|
| `basic` | Cat / Macho Cat / Mohawk Cat | **Tripp** | cheap wall, fastest recharge |
| `tank` | Tank Cat / Wall Cat / Eraser Cat | **Olek** | high-HP wall, near-zero damage, AoE-typed |
| `swarm` | Axe Cat / Brave Cat / Dark Cat | **Shillin** | cheap melee attacker, **Strong vs Red** |
| `ranged` | Gross Cat / Sexy Legs Cat / Macho Leg Cat | **Puffy** | first mid-range attacker |
| `fast` | Cow Cat / Giraffe Cat / Lion Cat | **Buba** | ultra-fast rusher (unchanged from before — matches the user's own opening example) |
| `aoe` | Bird Cat / UFO Cat / The Flying Cat | **Noir** | area attacker |
| `sniper` | Fish Cat / Whale Cat / Island Cat | **Momo** | high HP/ATK bruiser, **Strong vs Red** |
| `support` | Lizard Cat / Dragon Cat / King Dragon Cat | **Mit** | true longest range in the roster |
| `titan` | Titan Cat / Mythical Titan Cat / Jamiera Cat | **Temujin** | huge AoE melee, barely staggers |

Real Battle Cats' 10th Basic-tier lineage, **Superfeline (ネコ超人)**, only
unlocks post-Cosmos-Chapter-3 — out of scope for a Chapter-1 pass, not
mapped this round.

**Shelved:** `guardian` (Xia) — a Barrier-tank identity that doesn't match
any real Basic-tier lineage. Left fully wired in `UNIT_CONFIG.js` (real
sprites, real stats structure) but excluded from the active roster —
`unlockRequirement: { stageId: null }` never resolves true, so it never
unlocks. Reclaim it for a real Rare/Super-Rare-tier unit once a future pass
covers the guide's Chapter 12 EX/Rare roster.

## Enemy mapping — 10 of the real early Empire of Cats enemies

| ENEMY_CONFIG key | Real enemy | Notes |
|---|---|---|
| `basic` | わんこ (Doge) | first enemy in the real game |
| `fast` | にょろ (Snache) | |
| `tank` | カバちゃん (Hippoe) | real early "wall boss" |
| `ranged` | パオン (Paon) | long-range artillery |
| `aoe` | ブタヤロウ (Piggeh) | first Red-attribute enemy |
| `swarm` | リッスントゥミー (Listen To Me) | cheap, extremely fast filler |
| `sniper` | ジャッキー・ペン (Jackie Penguin) | fast attacker |
| `guardian` | クマ先生 (Kuma-sensei) | long range, KB10 |
| `support` | ゴマさま (Gomasama) | fast, Red-attribute area attacker |
| `titan` | 悪の帝王ニャンダム (Emperor Nyandam) | **the real Empire of Cats Chapter 1 final boss** |

`zombie`/`colossus`/`behemoth` are dormant this pass (not used by any
rebuilt stage) — kept in place, reserved for an "Into the Future"-equivalent
saga later. The guide lists 24 real early enemies total; the other 14
aren't wired up yet (see Known Gaps).

## What changed, file by file

- **`UNIT_CONFIG.js`** — rebuilt: 9 real lineages + shelved `guardian`.
  Stats are the guide's real Lv1/no-treasure values (frames→ms via
  ×1000/30, yen used directly). Spatial fields (moveSpeed/radius/range/
  knockback distance) intentionally stay in this engine's own tuned pixel
  scale rather than the guide's raw distances (its reference battlefield is
  several thousand units long; this one is ~800px) — see the file's own
  header for the full reasoning. Added `unlockRequirement`.
- **`ENEMY_CONFIG.js`** — same conversion approach, 10 real early enemies
  swapped into the existing 10 slots; `zombie`/`colossus`/`behemoth` dormant.
- **`TRAIT_CONFIG.js`** — replaced the old invented beast/bug/bird/plant/mech
  rock-paper-scissors cycle with the real Battle Cats model: enemies carry
  an `attribute` (Red/Black/Floating/Metal/Zombie), units carry targeted
  `strongVs`/`massiveVs`/`resistantVs` abilities. `GameScene.computeDamage`
  and `UnitDescription.js` were rewired to match.
- **`PROGRESSION_CONFIG.js`** — every unit's level-growth curve now uses the
  real formula shape (+20%/level, +10%/level past the rate-switch point),
  replacing the old per-rarity-varied placeholder rates.
- **`PlayerProgress.js` / `Loadout.js` / `GameScene.js` / `LoadoutScene.js`**
  — added real unit-unlock gating (`isUnitUnlocked`): a brand-new save
  starts with only Cat; every other lineage requires clearing the stage
  named in its `unlockRequirement`. Verified live with a cleared
  localStorage save.
- **`STAGE_CONFIG.js`** — saga1 (10 stages) fully rebuilt: real economy
  numbers (6000¥ wallet/170¥-sec income, both guide-confirmed/stated real
  values), enemies introduced in the guide's own rough order, one lineage
  unlock per early stage, real Empire of Cats final boss at stage10.
- **`BASE_UPGRADE_CONFIG.js`** — Base Defense and Research upgrades now use
  their real guide values (+1000 HP/level, +200ms recharge reduction/level).
- **`GameScene.js`** — evolution glow now reads `evolutionStage` (light
  blue at Evolved, purple at True) instead of a single fixed gold, and only
  shows once a unit has actually been evolved (not just reached level 10).

## Known gaps / explicit follow-up work

1. **Saga2/saga3 (stage11-30) are NOT rebalanced.** They still reference the
   same `ENEMY_CONFIG` keys, whose stats are now dramatically different
   (e.g. old `titan` enemy hp 260 → real Emperor Nyandam 99999). Nothing
   crashes, but every `statMultiplier` in those 20 stages is now wildly
   miscalibrated. This needs the same rebalancing pass saga1 just got.
2. **Only 10 of the guide's 24 early enemies are wired up.** Adding the
   other 14 (にょろ's cousins, 例のヤツ, メェメェ, ワニック, ウサ銀,
   一角くん, 赤羅我王, カオル君, カンバン娘, ガガガガ, ぶんぶん先生, etc.)
   just needs new `ENEMY_CONFIG` entries following the same conversion
   approach — no architecture changes needed.
3. **Trickle/spawn timing per stage is hand-tuned, not derived from real
   per-stage data.** The guide's own data doesn't include full stage-by-
   stage spawn tables for all 48 real Chapter 1 stages (only the schema +
   roster + formulas) — this pass's 10 stages are a faithful
   *reconstruction* of real pacing/order, not a byte-exact dump.
4. **Fish Cat's real 3rd-form "2% Critical Hit" ability** and **Titan Cat's
   real 3rd-form "30% Knockback all enemies" ability** aren't modeled —
   both are per-evolution-stage ability grants the current
   `PROGRESSION_CONFIG` evolution-bonus system could support with a small
   addition (see `critChanceBonus` for a precedent), just not done tonight.
5. **The economy still starts every battle at full wallet, not real Battle
   Cats' 0¥-at-battle-start.** This predates tonight's pass (pre-existing
   `this.money = this.getWalletCap() * ...` in `GameScene.js`) — flagged
   here since it's directly relevant to economy fidelity, not something
   introduced tonight.
6. **CatalogScene.js** wasn't updated with lock/unlock visuals (LoadoutScene
   was) — browsing a locked unit's info there isn't harmful, just not
   labeled "Locked" yet.
7. **Real Cannon mechanics** (guide: 0%→100% in 50s base, -50F/level,
   floor 31.7s) weren't ported — this build's cannon still uses its own
   older rate-based charge model (`SPECIAL_CHARGE_PER_SEC`), not the real
   time-based one. Left alone given how much the Cat Cannon button itself
   was already debugged this session.

## Asset needs list (if this pass continues toward full fidelity)

Nothing NEW was required for tonight's pass — all 9 active lineages and all
10 enemies reuse existing Origins Asset Kit sprites. For a deeper pass:

- **More named Axies** if Rare/Super-Rare-tier real units get mapped next
  (Xia/guardian's slot is a natural first reclaim) — 19 named starters are
  already available in the kit, only 9 used so far.
- **New enemy sprites** for the 14 not-yet-wired-up early enemies (whatever
  the closest-fitting existing PvE Chimera silhouette is per enemy, same as
  this pass's `characterName` picks — e.g. a boss-scaled sprite for 悪の
  帝王ニャンダム's true final-boss presentation, currently reusing "Daddy
  Bear").
- **VFX for Wave Attack / Surge Attack** if those abilities get restored to
  any lineage that keeps them as a "modern addition" once the faithful
  foundation is solid (per the user's stated long-term plan).
- **A boss-warning banner + boss music swap already exist** (built earlier
  this session) — no new work needed there.

## Verified live (this session)

- Fresh save → only Cat unlocked, default loadout = `['basic']`.
- Clearing stage1 → Tank Cat (`tank`) unlocks; nothing else does yet.
- Cat's real stats (hp100/dmg8/cost75/recharge5333ms) confirmed in a live
  spawn.
- Strong Against Red confirmed BOTH directions: Axe Cat deals 37.5 (25×1.5)
  to a Red enemy and only 25 to a plain one; Axe Cat takes 60 (120×0.5) from
  a Red attacker and the attacker's full 8 from a plain one.
- A full combat tick (move → target-acquire → attack → damage) runs
  end-to-end with the new stats with no thrown errors.
- No console errors through a fresh boot → stage start → combat cycle.

(One unrelated finding during verification: the long-running Vite dev
server — up since the start of this multi-hour session — had degraded into
a state where its asset loader silently stalled partway through. This was
NOT a code bug; restarting the dev server process fixed it immediately. If
anything looks stuck loading again, restart the dev server first.)
