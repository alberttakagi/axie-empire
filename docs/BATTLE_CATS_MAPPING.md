# Battle Cats Replica Pass — Roster Mapping, Decisions, Roadmap

Written during an overnight autonomous pass, driven by the user's own
"にゃんこ大戦争 完全解剖ガイド" guide (`nyanko_guide.html`, downloaded from a
Claude artifact — battlecats-db-sourced). Scope for this pass, per the
user's own explicit answers before going to sleep:

## Update: full 48-stage saga1 (later same-day follow-up)

The user sent an UPDATED guide (`nyanko_guide (1).html`) adding a complete
real per-stage table for all 48 Empire of Cats Chapter 1 stages (real
prefecture names/order, energy cost, XP, castle HP, max-deployed, real
boss per stage, real enemy roster per stage) and asked for saga1 to be
rebuilt to the full 48 stages using it. See "Full 48-stage saga1" section
below for everything that changed in this follow-up — it supersedes some
of the original pass's own "known gaps" (saga1's stage count, Emperor
Nyandam being wrong about the final boss, several enemies still missing).

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

## Enemy mapping — all 19 real enemies that appear across Chapter 1

Corrected/expanded in the full-48-stage follow-up (see below) — the
original pass only had 10 of these and got the final boss wrong.

| ENEMY_CONFIG key | Real enemy | Notes |
|---|---|---|
| `basic` | わんこ (Doge) | first enemy in the real game |
| `fast` | にょろ (Snache) | |
| `thatguy` | 例のヤツ (That Guy) | KB1, doesn't retreat until beaten |
| `tank` | カバちゃん (Hippoe) | real stage-7 boss, early "wall boss" |
| `aoe` | ブタヤロウ (Piggeh) | real stage-10 boss, first Red-attribute enemy |
| `gory` | ゴリさん (Gory) | real stage-16 boss, fast AoE |
| `mehmeh` | メェメェ (Meh Meh) | plain filler |
| `support` | ゴマさま (Gomasama) | real stage-23 boss, fast Red area attacker |
| `wanikun` | ワニック (Wanikun) | weak but fast filler |
| `ranged` | パオン (Paon) | real stage-29 boss, long-range artillery |
| `usagin` | ウサ銀 (Usagin) | fast, Red-attribute |
| `kangaroo` | カ・ンガリュ (Kangaroo) | real stage-35/Tokyo boss |
| `swarm` | リッスントゥミー (Listen To Me) | cheap, extremely fast filler |
| `gagagaga` | ガガガガ (Gagagaga) | real stage-38 boss, Floating |
| `ikkaku` | 一角くん (Ikkaku-kun) | real stage-41 boss, ultra-close range, Red |
| `guardian` | クマ先生 (Kuma-sensei) | real stage-44 boss, long range, KB10 |
| `kanban` | カンバン娘 (Kanban Musume) | harmless "billboard" filler present in every real stage |
| `titan` | カオル君 (Kaoru-kun) | **the REAL Chapter 1 final boss** (stage 48, 西表島/Iriomote Island) — corrects the original pass's wrong guess of Emperor Nyandam, who never actually appears in the real 48-stage boss list |

`zombie`/`colossus`/`behemoth` are still dormant (not used by any rebuilt
stage) — kept in place, reserved for an "Into the Future"-equivalent saga
later; they have no real Chapter 1 data to port.

## Full 48-stage saga1 (follow-up pass, driven by the updated guide)

The updated guide added a complete real per-stage table for all 48 Empire
of Cats Chapter 1 stages. `STAGE_CONFIG.js`'s saga1 was rebuilt from it —
one-off generator kept at `tools/gen_saga1_stages.py` for future retuning.

- **Real per-stage data used directly**: prefecture name (translated to
  English — Nagasaki, Saga, Kagoshima, ... Iriomote Island), energy cost,
  XP, castle HP (→ `enemyBaseHp`), ~~max-deployed (→
  `restrictions.maxDeployed` when below 20 — see the bug-fix note
  below)~~ **the 出撃最大数 column (→ `maxEnemiesOnField`) — see the later,
  much bigger correction further down; every mention of "max-deployed" in
  this section and the two bug-fix notes right below it describes what
  this was WRONGLY believed to be at the time**, the real boss (→ a
  `baseHpPercentTrigger: 99` entry), and the real enemy roster per stage
  (in the real listed order).
- **Chapter 1 uses a flat 100% strength magnification on every enemy,
  every stage** — confirmed by the guide's own note. Every `statMultiplier`
  in the new saga1 is `1`; difficulty comes entirely from castle HP, stage
  composition, and the enemy field's own simultaneous-count cap, matching
  the real game exactly. (This corrects the original pass's own saga1,
  which had climbing `statMultiplier` across its 10 placeholder stages —
  not how real Chapter 1 actually works.)
- **Not real data**: per-enemy spawn TIMING. The guide gives one fully
  worked example (stage 35/Tokyo) and confirms enemies appear in their
  listed order, but not exact first-appearance/repeat frames for the
  other 47 stages. The generator staggers each stage's real enemy list
  ~2.6s apart with one repeat wave per type, ending on whichever enemy
  the real data lists last — the engine's existing `scheduleTrickleWave`
  fallback then keeps that one coming once the script ends, approximating
  the real "無制限" (unlimited) repeat behavior.
- **Unit costs corrected to the real Chapter 1 baseline**: `UNIT_CONFIG.js`
  previously used Chapter-2-basis prices (the original guide's own stated
  convention); the updated guide's real per-chapter cost table confirmed
  Chapter 1's actual baseline is exactly costs÷1.5. Fixed directly in
  `UNIT_CONFIG.js` — `STAGE_CONFIG.js`'s existing `SAGA_COST_MULTIPLIERS`
  (1.0/1.5/2.0) now reproduces the real per-chapter prices exactly instead
  of double-applying the Chapter 2 markup to Chapter 1 stages.
- **Unit unlocks remapped to the real prefectures** named in the roster
  table's own unlock notes: Tank Cat→real stage1 (Nagasaki), Axe Cat→
  stage3 (Kagoshima), Gross Cat→stage6 (Oita), Fish Cat→stage16 (Tottori),
  Bird Cat→stage12 (Yamaguchi — corrected from an earlier guide revision's
  vague "unlocked through progression," originally guessed at stage9).
  Cow Cat's real note stays vague — placed at stage5 for even pacing.
  Lizard Cat's real note *was* stage20 (Kyoto), but a later guide revision
  retracted that as unconfirmed — kept at stage20 anyway as a pacing
  placeholder, same treatment as Cow Cat. Titan Cat's real note ("unlocked
  in the final stretch") — placed at stage43.
- **saga2/saga3 renumbered** from stage11-30/21-30 to stage49-58/59-68 to
  make room for saga1's now-48 stages — `TREASURE_CONFIG.js`'s matching
  `stageIds` were updated too, and saga1's own treasure sets were expanded
  from 2 sets of 5 to 12 sets of 4 (stage1-48), matching real Battle Cats'
  actual "~dozen sets per 48-stage chapter" shape.
- **StageSelectScene now scrolls**: a fixed 5-column, non-scrolling grid
  only fit ~13 stages on the 800x450 canvas — 48 stages need 10 rows
  (~870px). All stage cards now live in a `gridContainer` that scrolls
  vertically (mouse wheel + drag, clamped to the grid's real content
  height) while the header (Back/Energy) stays fixed — same "click ends
  up in ~0 movement" tradeoff GameScene's own drag-to-pan already accepts.
  Verified live: all 48 stages, including stage 48, are reachable by
  scrolling to the bottom of the list.
- **`SAGA_CONFIG.js` descriptions updated** to stop claiming a "10-stage
  campaign" and to correctly note that saga2/saga3 (still the older,
  smaller 10-stage approximation) haven't had their own real-data pass yet.

Verified live: all 48 stage IDs unique and correctly tagged `saga1`,
Fukuoka's (stage7) real 2400 castle HP loads correctly, damaging it to 98%
correctly triggers its real boss (Hippoe) via the 99% threshold, saga2/3's
renumbered stage49/stage68 both load cleanly, and unit-unlock gating
resolves correctly against the new stage IDs (e.g. Fish Cat's locked
message now reads `Clear "Tottori" to unlock!`).

## Bug fix: max-deployed threshold silently dropped 17 stages' real restriction

`tools/gen_saga1_stages.py`'s generator only emitted a `restrictions.
maxDeployed` override when the real 出撃最大数 was below **10**, on the
(wrong) assumption that anything ≥10 didn't need capping. `GameScene.js`'s
actual fallback when no restriction is set is `DEFAULT_MAX_DEPLOYED = 20`,
not 10 — so any real value in `[10, 19]` was silently replaced by the wrong
default of 20 instead of its real, tighter cap. Real Battle Cats'
出撃最大数 range is stated as 2–20 by the guide itself, so only a real value
of exactly 20 needs no override at all.

Fixed the generator's condition to `max_units < 20` and regenerated/spliced
saga1 back into `STAGE_CONFIG.js`. This restored the real restriction on 17
stages that were previously unrestricted by mistake: stage9 (Ehime, 10),
stage13 (Hiroshima, 12), stage17 (Hyogo, 10), stage18 (Wakayama, 10),
stage19 (Osaka, 10), stage20 (Kyoto, 10), stage21 (Nara, 10), stage29
(Shizuoka, 10), stage30 (Yamanashi, 10), stage31 (Nagano, 10), stage34
(Chiba, 10), stage35 (Tokyo, 10), stage36 (Saitama, 10), stage40
(Fukushima, 10), stage41 (Miyagi, 10), stage43 (Iwate, 10), stage46
(Hokkaido, 10). Stage1's (Nagasaki) 3-unit cap was already correct real
data and is unaffected. Stage26 (Aichi) has a real 出撃最大数 of 20 and
correctly has no restriction at all.

Verified live: `STAGE_CONFIG` for stage1/stage9/stage26 matches the
expected `{maxDeployed:3}` / `{maxDeployed:10}` / no-restriction values
after the fix.

## Bug fix: Kanban Musume permanently walled off every single stage

Follow-up to a player report that stage1 (Nagasaki) "feels almost
impossible" despite being tagged Easy. Root cause was much bigger than
stage1: `GameScene.js`'s lane model never lets a player unit advance past
ANY live enemy ahead of it (`updatePlayerUnits`'s `maxAdvanceX` clamp) —
correct for every real combat threat, but fatal for `kanban` (カンバン娘/
Kanban Musume), whose real HP is an intentionally absurd **10000** (a
"never actually meant to be killed" joke value in real Battle Cats,
already described that way in `ENEMY_CONFIG.js`'s own comment: "a harmless
recurring background filler"). Because every single real Chapter 1-3 stage
lists her in its enemy roster, and no early-game unit can output 10000
damage in a stage's lifetime, the instant she spawned she became a
permanent, unbreakable wall between the player's units and the enemy
base — on literally all 48 stages, not just stage1.

Compounding it: `scheduleStageScript`'s endless-trickle fallback always
re-spawns whichever spawnScript entry has the LARGEST `spawnDelayMs` once
the script ends, and because every real stage's enemy list happens to
list カンバン娘 last, she was also always picked as the eternal repeat
target — spawning a fresh unkillable 10000 HP wall every
`TRICKLE_INTERVAL_MS` (7s) forever, on top of the first one.

Fix: added a `nonBlocking: true` flag to `ENEMY_CONFIG.kanban` (see that
file's header for the full rationale), and taught `GameScene.js` to
respect it in the three places that mattered — the player-side
advance-blocking clamp, both player-side target-acquisition lookups, and
the trickle-anchor selection in `scheduleStageScript`. She still spawns,
still animates, still (harmlessly) attacks per her own real stats — she
just can no longer block a unit's path to the castle or become the
thing an endless wave keeps re-arming.

Verified live: after the fix, player units and other (killable) enemies
both walk straight through her position; the endless trickle now
correctly re-spawns the stage's real filler enemy (`basic`/Doge for
stage1) instead of another Kanban Musume.

## Rebuild: real per-stage spawn timing for all 48 saga1 stages

Follow-up to the two bug fixes above, once the user supplied a further-
updated guide (`nyanko_guide (2).html`) that quoted battlecats-db.com's
own real spawn-table schema and two fully-worked examples (stage1/
Nagasaki, stage35/Tokyo) — `enemy, strength%, count, castleHpBelow%,
firstFrame, repeatFrame`. Cross-checking that against `STAGE_CONFIG.js`
confirmed the previous pass's saga1 spawn timing (a generator-invented
"stagger each enemy ~2.6s apart, one repeat wave, then loop the last
enemy forever" shape) was never real data — it just happened to produce
a plausible-looking stage. The real mechanism is a set of independent,
continuously-re-evaluated rules per enemy (see the guide's own Chapter 14
pseudocode), several of which run **forever** in parallel once introduced,
not "one wave, then the next."

**Real data acquisition**: `battlecats-db.com/stage/s03000-NN.html` (the
same source the guide cites) turned out to be directly fetchable, so
rather than approximate the other 46 stages, all 48 real spawn tables
were fetched and transcribed into `tools/gen_saga1_stages.py`'s new
`SPAWNS1` dict — every stage's real `firstFrame`/`repeatFrame`/`count`/
`castleHpBelow` for every enemy, not just the 2 the guide worked through
by hand. `カンバン娘`'s real spawn data is especially important: `firstFrame:
27000` (900 real seconds / 15 minutes), confirmed by the guide's own
dedicated section as a harmless "time limit signal," never intended as a
threat — the previous pass had her arriving in the first few seconds of
EVERY stage and then repeating forever (see the two bug-fix sections
above), which is now understood to be doubly wrong: wrong timing on top
of the wrong role.

**Engine rewrite (`GameScene.js`)**: the old model (`time.delayedCall` per
scripted entry, plus a single global "guess the last entry and repeat it
forever" trickle fallback — see the Kanban bug-fix section above for why
that guess was unsound) is replaced by a unified per-tick spawn engine
(`updateSpawns`, driven off `this.elapsedMs` every frame, matching the
guide's own pseudocode almost line for line): every `spawnScript` entry
normalizes (`normalizeSpawnEntry`) to `{firstMs, repeatMs:[min,max]|null,
maxCount:number|null, castleHpBelowPercent}`, and is independently
re-checked every frame against the current castle HP% and elapsed battle
time — a rule fires once `elapsedMs>=firstMs` AND `castleHp% <=
castleHpBelowPercent`, immediately re-arms if `repeatMs` is set (picking a
fresh random delay in that range, exactly matching real Battle Cats'
"re-roll a random re-appearance interval"), and stops forever once
`maxCount` is reached. This single mechanism naturally covers every real
shape found in the data with no special-casing: endless per-enemy-type
trickle, a one-time reinforcement burst gated at a specific castle-HP%
(e.g. stage1's "8 more Doge once the castle drops to 50%"), and
multi-phase bosses (several real stages — e.g. stage42/Yamagata,
stage43/Iwate — have the SAME boss enemy ambush 2-3 times at different
HP thresholds, which `STAGE_CONFIG.js`'s old single-boss-column data
never captured at all).

**Backward compatibility**: saga2/saga3/Sparring Grounds still use the
older, simpler one-shot shape (`spawnDelayMs` / `baseHpPercentTrigger`) —
`normalizeSpawnEntry` translates those into the same normalized rule
shape (`firstMs`/`repeatMs:null`/`maxCount:1`) rather than needing a
second spawn engine, and a small compatibility shim reproduces the old
"repeat the last (non-`nonBlocking`) scripted entry forever, unlimited"
fallback specifically for stages built entirely from old-shape entries —
saga2/3 haven't had their own real-data pass yet (see Known Gaps) and
shouldn't have their existing, already-tuned difficulty change as a side
effect of this saga1-focused rebuild.

**Boss-ambush detection**: real per-entry "is this a boss shockwave" data
turned out to be more complete than `STAGES1`'s own single "ボス" column
(e.g. stage22/Mie, stage26/Aichi, stage42/Yamagata, stage43/Iwate all have
a real boss-flagged entry despite an empty guide boss column) — the
generator's new `BOSS_INDICES` maps each stage to the specific spawn-entry
indices confirmed boss-flagged from the actual DB pages, since neither the
guide's single-boss summary nor plain enemy identity (the same enemy is
ordinary reinforcement in most stages and a boss ambush in others) is
sufficient on its own.

Verified live: stage1 (Nagasaki) now paces exactly per its real table —
one Doge at battle start, silence until 20s, then an endless Doge trickle
every 6-10s, with a real reinforcement burst of 8 more once the castle
drops to 50% — and is genuinely winnable with continuous, ordinary play
(tested destroying the castle from 1000 HP to 0 over ~150 real seconds).
saga2's stage49 (old-format) confirmed still gets its legacy endless-
trickle fallback after its scripted list ends, unchanged from before.

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

1. ~~Saga2/saga3 (stage11-30) are NOT rebalanced.~~ **Done in a follow-up
   pass the same night, then renumbered to stage49-68 in the full-48-stage
   follow-up**: saga2/saga3 reuse saga1's own real enemies at climbing
   `statMultiplier` (real Battle Cats repeats the identical map across
   Chapters 1-3, just raising enemy strength — matched here), same
   constant real economy, with the `titan` slot's boss (now correctly
   Kaoru-kun, not Emperor Nyandam — see the Enemy mapping table above)
   re-fought, stronger each time, as both Chapter 2's and Chapter 3's final
   boss. `zombie`/`colossus`/`behemoth` were dropped from these stages'
   spawn scripts (still dormant, no real data) rather than left in at
   miscalibrated strength. Saga2/saga3 STILL haven't had their own
   real-per-stage-data pass (still the smaller 10-stage-per-chapter
   approximation, just renumbered) — that's its own remaining gap below.
2. ~~Only 10 of the guide's 24 early enemies are wired up.~~ **Resolved for
   Chapter 1 specifically** in the full-48-stage follow-up: all 19 enemies
   that actually appear across the real 48-stage Chapter 1 (per the
   updated guide's own stage-by-stage table) are now in `ENEMY_CONFIG.js`.
   The original guide's broader ~24-enemy list included a few that turned
   out NOT to be part of Chapter 1 at all (ブラックマ/Blackma, 赤羅我王/Red
   Rag'oh, 悪の帝王ニャンダム/Emperor Nyandam, ぶんぶん先生/Bun Bun
   Sensei) — presumably later-chapter or event content, not wired up
   since they'd need their own real per-stage data to place correctly.
3. ~~Saga2/saga3 (stage49-68) still don't have their own real per-stage
   data.~~ **Done** — see the "Rebuild: saga2/saga3 as the real 48-stage
   chapters at flat magnification" section further down: real Chapter 2/3
   don't have their own distinct per-stage data at all, they replay
   saga1's exact 48 maps at a flat 150%/400% magnification, so saga1's own
   real data was already everything needed.
4. ~~Trickle/spawn timing per stage is hand-tuned, not derived from real
   per-stage data.~~ **Done** — see the "Rebuild: real per-stage spawn
   timing for all 48 saga1 stages" section further down: every stage's
   real `firstFrame`/`repeatFrame`/`count`/`castleHpBelow` was fetched
   directly from battlecats-db.com, not reconstructed/approximated.
5. ~~Fish Cat's real 3rd-form "2% Critical Hit" and Titan Cat's real 3rd-form
   "30% Knockback all enemies" aren't modeled.~~ **Done in a follow-up
   pass**: `PROGRESSION_CONFIG.js` evolutions now support a generic
   `abilityGrant` field (merged in by `UnitStats.getEffectiveUnitConfig`,
   same additive-per-reached-stage treatment as `critChanceBonus`) — Fish
   Cat's True Form `critChanceBonus` was corrected from the generic +5%
   every other unit's True Form gets to the real 2%, and Titan Cat's True
   Form grants `knockbackOnHit: { chance: 0.3 }`, resolved by
   `GameScene.tryKnockbackOnHit` (unconditional knockback — bypasses the
   normal HP-threshold stagger gate — on every living, non-immune member of
   the target pool, same pattern as the Cat Cannon's own burst knockback).
   Verified live both ways: the effective config carries the grant only
   once evolutionStage reaches 2, and a live `dealDamage` against a target
   tough enough to survive the hit shows knockback firing at roughly the
   right rate.
6. ~~The economy still starts every battle at full wallet, not real Battle
   Cats' 0¥-at-battle-start.~~ **Fixed** — see the Economy fixes section
   below.
7. **CatalogScene.js** wasn't updated with lock/unlock visuals (LoadoutScene
   was) — browsing a locked unit's info there isn't harmful, just not
   labeled "Locked" yet.

## Economy fixes: 0¥ battle start, real per-enemy kill money, real Base Defense tiers

Follow-up to a player question ("is the 6000¥ starting cap / 1000 tower HP /
enemy HP all still correct?"). Cross-checking against the newest guide
(`nyanko_guide (3).html`, which added a real Worker Cat income/wallet table)
and a wiki lookup for the player's own Cat Base HP turned up three real,
fixable gaps:

- **Battle no longer starts with a full wallet.** Real Battle Cats always
  starts a battle at 0¥ regardless of Worker Cat level or wallet cap (the
  guide's own "1プレイの流れ": "バトル開始：お金0円...から始まる") — this
  was a pre-existing gap (Known Gap #6 above), not something introduced by
  the saga1 rebuild, but directly relevant to economy fidelity so fixed
  here. `GameScene.js`'s starting-money line now reads
  `this.getWalletCap() * (comboStartingMoneyPercent / 100)` instead of
  `* (1 + comboStartingMoneyPercent / 100)` — with no "Starting Money Up"
  combo active this is exactly 0, and that combo's bonus is now a genuine
  up-front amount rather than a top-up of an already-full pool.
- **Kill money now uses the real per-enemy payout** (guide Chapter 14's own
  list: Doge 15¥, Snache 30¥, That Guy 75¥, Hippoe/Piggeh 400¥, Jackie
  Penguin 450¥, Gory 550¥, Meh Meh 150¥, Gomasama 650¥, Wanikun 50¥, Usagin
  180¥, Paon 1,300¥, Kangaroo 1,400¥, Ikkaku-kun 2,500¥, Kuma-sensei 2,000¥,
  Listen To Me 100¥, Gagagaga 1,800¥, Kaoru-kun 4,000¥, Kanban Musume 1¥)
  instead of the old invented `threat * killBonusMultiplier` formula.
  `ENEMY_CONFIG.js`'s 19 active enemies each carry a real `money` field now;
  `GameScene.js`'s `onEnemyKilled` reads it directly, falling back to the
  old formula only for the 3 still-dormant enemies with no real data.
  Verified live: killing a Doge now pays out exactly 15¥.
- **Base Defense's real HP growth is tiered, not flat.** A wiki lookup
  (battlecats.miraheze.org, since neither guide states this) confirmed the
  player's own Cat Base HP is exactly 1,000 by default — matching
  `STAGE_CONFIG.js`'s existing `baseHp: 1000` exactly, so that value turned
  out already correct — but each upgrade level's real HP gain isn't a flat
  +1,000: real Lv2-4 add 1,000/level, Lv5-8 add 2,000/level, Lv9-30 add
  3,000/level (up to 78,000 at Lv30). `BASE_UPGRADE_CONFIG.js`'s
  `baseDefense` now uses a `perLevelTiers` array instead of a flat
  `perLevelEffect`, and `GameScene.js`'s `getBaseUpgradeEffect` sums
  however many tiers the current level has reached — this build's own
  10-level cap now tops out at +20,000 (real Lv11-equivalent) instead of
  the old flat formula's +10,000. Verified the tier math directly
  (level 10 → 20,000).

Not fixed (no real number exists to fix it to): the enemy **castle** HP
per stage (`enemyBaseHp`) is confirmed real, stage-specific data throughout
saga1 — but neither guide nor the wiki lookup states what governs a fresh
account's real Worker Cat income/wallet numbers before any Base Upgrades or
treasures (the newest guide explicitly says this "couldn't be confirmed
from public data"), so `STAGE_CONFIG.js`'s `moneyAccrualPerSec: 170`/
`startingMoney: 6000` (the Worker Cat Lv1 income rate and wallet cap) stay
the existing reasoned baseline rather than being swapped for an equally
unconfirmed alternative.
8. ~~Real Cannon mechanics weren't ported.~~ **Done in a follow-up pass**:
   the Cat Cannon now charges on the real fixed TIME budget (guide Chapter
   08 — 50s base, -50F/≈1,667ms per Cannon Charge Base Upgrade level, hard
   floor 31.7s/31,667ms — see `SPECIAL_CHARGE_DURATION_MS`/
   `CANNON_CHARGE_FLOOR_MS` in `GameScene.js`), replacing the old flat
   rate-per-second model. `BASE_UPGRADE_CONFIG.js`'s `cannonCharge` line is
   now a real ms-per-level reduction rather than an invented rate bump.
   Verified live: charge rate over a real 3s window matched the 50s-fill
   formula almost exactly, and a simulated high upgrade level correctly
   clamped at the real floor instead of charging faster than it should.

## Bug fix: enemies could spawn already past a deeply-parked player unit

Follow-up to a player report ("enemies just walk right past my units," and
engaged pairs visibly fighting back-to-back instead of facing each other).
Root cause: `createEnemy`'s spawn position was a fixed
`enemyBaseX - BASE_WIDTH/2 - config.radius`, independent of where player
units actually were. A unit parked attacking the enemy base sits at
roughly `enemyBaseX - BASE_WIDTH/2 - unit.range` — so any time a spawning
enemy's own radius is SMALLER than that parked unit's range (a common
case: Cat's range is only 14, well under many enemies' 16-32 radius), the
enemy's fixed spawn point landed to the LEFT of (already past) the unit,
with no movement clamp able to correct it after the fact (the per-frame
advance-clamp only stops future movement, it can't retroactively fix a
bad spawn). The "back-to-back" look is the same bug, not a separate one:
each sprite's facing is fixed by side (player always flipped to face
right, enemy always to face left, set once at creation — see
`createEntityVisual`) and never recomputed from relative position, so an
enemy landing on the wrong side of a unit renders both of them facing
away from each other.

Fix: `createEnemy` now computes the same kind of blocking boundary the
per-frame advance-clamp already uses (the frontmost live player unit's own
`x + range + radius`) and refuses to spawn to the left of it, capped at
the base's own center so a very deeply-parked long-range unit can't push
a spawn past the base sprite entirely. Verified live: a unit parked at the
enemy base's engagement boundary no longer gets a fresh same-radius-or-
smaller enemy spawning behind it (spawn now correctly lands ahead of the
unit in every tested case — small enemy behind a parked unit, large enemy
behind a parked unit, and the normal unblocked case, which is unaffected).

## Major correction: 出撃最大数 is the ENEMY field cap, not a player restriction

The single biggest correction of this whole saga1 effort. The user
directly asked "is it intended that stage1 has a 3-unit limit?" earlier in
this project, and — going only off the guide's phrasing at the time
("出撃最大数は場に同時に出せる味方の数" — "the number of ALLIES you can
have on the field at once") — the answer given was yes, treated as
confirmed real per-stage data, and implemented as `restrictions.maxDeployed`
on 47 of the 48 saga1 stages (the two prior bug-fix sections above, about
a `<10` threshold and about Kanban Musume, both describe fixes made
*within* that wrong framing). The user later independently verified this
against battlecats-db.com and the game itself, and corrected the guide:
**出撃最大数 is the ENEMY side's own simultaneous-on-field cap** (how many
enemies can be alive on screen at once for that stage) — it has nothing to
do with how many units the player may deploy. Real Japan Chapter 1 has no
per-stage player deploy restriction at all; the player's own cap is a flat
**50** everywhere, because "Restriction Stages" (条件付きステージ, the
real mechanic that DOES limit player deploy count on specific stages) are
a later addition that doesn't exist anywhere in Chapter 1.

This means stage1's real "3" was never a player-facing restriction — a
brand-new account with just the starter Cat was never actually limited to
3 simultaneous Cats on Nagasaki; the real constraint is that Nagasaki
never has more than 3 enemies on the field at once (matching its
`knownSpawns` table: one Doge, a slow trickle from 20s, an 8-Doge burst at
50% castle HP — genuinely never more than 3 alive given that pacing).

Fix, across three files:
- **`tools/gen_saga1_stages.py`**: `STAGES1`'s 7th column now emits
  `maxEnemiesOnField` on every stage (never skipped/omitted, unlike the
  old buggy `restrictions.maxDeployed` logic that dropped it below a
  threshold) instead of `restrictions.maxDeployed`.
- **`STAGE_CONFIG.js`**: all 48 saga1 stages regenerated — none carry
  `restrictions.maxDeployed` anymore; all 48 carry a top-level
  `maxEnemiesOnField` (e.g. stage1/Nagasaki: 3, stage26/Aichi: 20,
  stage45/Aomori: 2).
- **`GameScene.js`**: `DEFAULT_MAX_DEPLOYED` raised from the old guessed
  placeholder (20) to the real confirmed universal value (50).
  `updateSpawns` now tracks how many enemies are currently alive and skips
  (without consuming/rerolling) any otherwise-due spawn rule once the
  stage's `maxEnemiesOnField` is reached — the rule fires the instant a
  slot opens back up (an enemy dies), matching real behavior rather than
  possibly missing a whole extra repeat interval. saga2/saga3's own two
  genuine Restriction-Stage `restrictions.maxDeployed` gimmicks (real
  mechanic, just not real Chapter-1 data — see Known Gaps) are untouched.

Verified live on stage1: 10 player Cats can now be deployed simultaneously
(previously hard-blocked at 3), while the enemy field itself never
exceeded 3 enemies alive at once over a sustained test, exactly matching
the real per-stage cap now applied to the correct side.

## Rebuild: saga2/saga3 as the real 48-stage chapters at flat magnification

The user's guide update added the real per-chapter enemy strength table
(Chapter 04): Chapter 1 = 100%, Chapter 2 = 150%, Chapter 3 = 400% — a
FLAT multiplier applied uniformly across each chapter's identical 48 maps,
not a per-stage climbing curve. saga2/saga3 had been the project's
original pre-real-data approximation (10 stages each, `statMultiplier`
climbing stage-by-stage within each saga) — now replaced with the real
shape, which turned out to be simple to produce correctly since saga1's
`SPAWNS1`/`STAGES1` real data already covers the identical map both later
chapters reuse.

- **`tools/gen_saga1_stages.py`**: `gen_stage` now takes `saga`,
  `stage_offset`, and `multiplier` parameters; `main()` emits saga1
  (offset 0, ×1), saga2 (offset 48, ×1.5), and saga3 (offset 96, ×4) from
  the exact same real per-stage spawn data, renumbering stage1-48 into
  stage49-96 and stage97-144 respectively. The project's own "at least one
  visible Restriction Stage" design flourish (not real data — see Known
  Gaps below) is preserved via `EXTRA_RESTRICTIONS`, re-anchored onto
  stage95 (saga2) and stage143 (saga3) — both originally stage47/Okinawa,
  the second-to-last stage before each chapter's own Kaoru-kun rematch,
  matching the flourish's original "gauntlet before the chapter boss"
  intent.
- **`STAGE_CONFIG.js`**: now 144 total stages (48 per saga), all sharing
  saga1's real per-stage data at their chapter's own flat multiplier.
- **`TREASURE_CONFIG.js`**: saga2/saga3 regenerated from the old 2-sets-
  of-5 approximation to the same real 12-sets-of-4 shape saga1 already
  uses, `valueAtMax` continuing to climb (32→78) across all 36 sets.
- **`SAGA_CONFIG.js`**: saga2/saga3 descriptions now state the real 150%/
  400% figures instead of vague "hitting harder" language.
- **Bug fix, `GameScene.js`'s `spawnScriptedEnemy`**: `statMultiplier` was
  only ever applied to `hp`, never `damage` — invisible on saga1 (whose
  magnification is always exactly 1) but silently undertuning every
  saga2/saga3 enemy's real damage output. Real Battle Cats magnification
  scales both (guide Chapter 13: "敵の実効体力/攻撃力 = 初期値 ×
  強さ倍率"). Now `damage: Math.round(base.damage * entry.statMultiplier)`
  alongside the existing `hp` line.

Verified live: stage97 (saga3's Nagasaki-equivalent) spawns a Doge at
360 HP / 32 damage — exactly real 90 HP / 8 damage × the real 400% Chapter
3 magnification, on both stats.

## UI naming convention (added in a follow-up pass)

Per user feedback: the in-battle spawn buttons and Character Formation
cards now show **`CharacterName (AbilityLabel)`** — e.g. "Tripp (Basic
Melee)" — not the real Battle Cats lineage name. `UNIT_CONFIG.js` gained a
third distinct name field to make this possible:
- `characterName` — the Axie (WHO) — shown first, primary.
- `abilityLabel` — a short functional role tag (HOW IT PLAYS) — shown in
  parens, restoring the at-a-glance clarity this roster's pre-rebuild
  `displayName` values used to carry (e.g. "Fast Melee", "Long Range").
- `displayName` — the real Battle Cats lineage name (WHAT, in BC terms)
  — still used wherever a screen names a unit's real BC identity on its
  own (e.g. the "Clear ... to unlock!" Character Formation message), just
  not paired with the character name in these two compact card views
  anymore. `CatalogScene.js` was updated the same way (falls back to
  `displayName` for enemies, which have no `abilityLabel`).

Also: `LoadoutScene`'s "not unlocked yet" message now names the exact stage
that unlocks a locked lineage (`Clear "Empire of Axies IV" to unlock!`) via
a new `describeLockedUnit` helper, reading `UNIT_CONFIG`'s
`unlockRequirement` against `STAGE_CONFIG` — the shelved Guardian/Xia slot
(a permanently unsatisfiable requirement) gets its own "Not available yet!"
message instead of naming a stage that doesn't actually grant it.

## Rebuild: real Cat Cannon damage/charge/wave-count mechanics

The guide's Chapter 08 revision added the real Cat Cannon formulas that
were previously only described qualitatively. This build's Cat Cannon had
three separate inaccuracies once compared against them:

- **Damage was two invented flat values** (`SPECIAL_BURST_DAMAGE=30` for
  hitting enemies, `SPECIAL_BURST_BASE_DAMAGE=25` for hitting the enemy
  base) instead of the real single formula, `攻撃力 = 100 +
  50×(Cannon Power Lv−1)` — real data never distinguishes a separate
  unit-damage and base-damage number; it's one number the wave deals to
  whatever it hits.
- **Cannon Power was a pure buff** (flat +5 damage/level with no downside)
  instead of the real trade-off: it also SLOWS the charge by the same
  1,666.67ms/level that Cannon Charge speeds it up by, so raising both to
  the same level exactly cancels out back to the 50s baseline — a real,
  deliberate build-around choice ("the fastest cannon" strategy: max
  Charge, leave Power at Lv1) that this build had no way to express before.
- **The real Cat Cannon fires multiple discrete "waves"** (3 at baseline,
  +1 per Cannon Range Base Upgrade level — a category this project had
  previously skipped entirely as "no adjustable range concept in this
  build") — this build fired one single instantaneous hit no matter what.

Fix, in `GameScene.js` and `BASE_UPGRADE_CONFIG.js`:
- `CANNON_BASE_DAMAGE = 100` and `CANNON_BASE_WAVE_COUNT = 3` replace the
  old two-value split; `triggerSpecialBurst` now fires
  `CANNON_BASE_WAVE_COUNT + cannonWaveBonus` waves via a new
  `fireCannonWave` method, `CANNON_WAVE_STAGGER_MS` (150ms — no real
  per-wave timing data exists, this is a reasoned "read as separate hits"
  value) apart, each dealing the real formula's damage to every living
  enemy AND the enemy base directly (unifying what used to be two
  separate numbers).
- `BASE_UPGRADE_CONFIG.cannonPower`'s `perLevelEffect` changed from an
  invented flat 5 to the real +50/level; `GameScene.js`'s charge-duration
  calc now also reads `cannonPowerLevel` directly and adds
  `cannonPowerLevel * 1666.67ms` as a charge-time penalty, on top of (not
  replacing) Cannon Charge's own existing reduction.
- New `BASE_UPGRADE_CONFIG.cannonRange` category (its real range-extension
  effect has no equivalent in this build's already-whole-lane-sweep
  cannon, so only its wave-count effect is reproduced), read into
  `cannonWaveBonus` at battle start.
- A `waveImmune` config flag is now checked (and skipped) per hit, even
  though no current enemy sets it — real Cat Cannon damage is itself a
  wave attack that deals zero to a wave-immune enemy, so this is here for
  whenever one is added rather than silently missing the interaction.

Verified live: a full-meter cannon shot against a very-high-HP dummy
enemy landed exactly 3 separate 100-damage hits, staggered as expected;
simulating Cannon Power Lv5 alone measured a charge time of ~58.3s
(50,000 + 5×1,666.67, matching the real formula almost exactly), and
Cannon Power Lv5 + Cannon Charge Lv5 together measured back to ~50.0s,
confirming the real equal-and-opposite cancellation.

## Chimera inventory (asset kit survey, added in a follow-up pass)

The Origins Asset Kit (`tools/axie-origins-asset-kit`) is the ONLY asset kit
in this repo — no Classic Axie or other-game assets exist locally to pull
from. It has **20 unique PvE chimera creatures** total (`pve-chimeras.json`
— most of its 73 catalog entries are just `_lv_1/_lv_2/_lv_3` reskin tiers
of these same 20, not distinct creatures). 13 are already used across
`ENEMY_CONFIG.js`'s active + dormant slots; **7 remain unused**:
AquaticWolf (plain, not the Alpha variant already used), ElderAquaticWolf,
MothershipSlime, DryadFighter, FloweringForestSlime, TreantFighter, and
MamaBear — available for whenever more enemy slots get wired up (e.g. the
guide's other 14 early enemies, or the dormant zombie/colossus/behemoth
slots once those get real data).

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
