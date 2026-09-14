# THE BUILD BIBLE
### A Complete Systems Specification for Recreating "The Battle Cats" (にゃんこ大戦争) — For an Axie-Themed White-Label Rebuild

**How to use this document:** This is written so that someone who has *never played The Battle Cats* can read it and understand every system well enough to explain it out loud to an engineer, or build it directly with Claude Code. It is organized in two layers:

- **Part A** is the reference bible — every mechanic, formula, and system, explained in plain language with the numbers the community has reverse-engineered from the live game.
- **Part B** is the build order — a phased plan for what to implement first, second, third, referencing back into Part A section numbers so you never have to re-explain a mechanic twice.
- **Part C** is an appendix of data schemas (pseudo-JSON) an engineer can turn directly into database tables / config files.
- **Part D** is your Axie re-skin mapping — how to rename every noun in this document to your own IP without changing a single mechanic.
- **Part E** is a confidence/verification ledger — this game's exact numbers are community-reverse-engineered (Ponos has never published an official design doc), so every section below flags which numbers are rock-solid vs. which are "close enough to build a first version, verify later."

Sprites, music, and story text are intentionally **not** covered here — the brief was to nail mechanics and UI/UX first and slot art in later. Nothing below reproduces Battle Cats' actual art, story writing, or flavor text; unit/stage names from the source game appear only as illustrative citations for numeric examples (e.g. "Tank Cat has 1 knockback" is a fact about a rule, not creative content), and Part D shows you how to fully rename everything for your own build.

---

# PART A — THE MECHANICS BIBLE

## A.0 What Kind of Game This Is

The Battle Cats is a **single-lane, real-time, base-defense game** (often called a "tower-offense" or "auto-battler tug-of-war"). Picture a single horizontal street. Your base sits at the left edge, the enemy's base sits at the right edge. You don't move a cursor around a battlefield — your only two actions during a fight are:

1. **Tap a unit's icon to spend money and summon it at your base**, where it walks left automatically and fights whatever it runs into.
2. **Tap the special cannon button when it's charged** to fire a big area attack at everything currently near the enemy base.

Money accumulates on its own over time, like a ticking meter, and every unit you summon drains it. That's the entire real-time input surface. All of the *depth* comes from a huge roster of units with different costs, stats, timings, and situational counters (a "rock-paper-scissors" trait system), and from an enormous layer of meta-progression (leveling, evolving, equipping, and unlocking those units, plus base upgrades) that happens **between** battles, not during them.

This is why the game is so replicable in spirit while being deep in practice: the *real-time* system is almost trivially simple (one lane, one button, one summon-row), and the *complexity budget* is spent entirely on stats, timing curves, and unlock progression. That is exactly how you should sequence the build: nail the one-lane combat loop first (Part B, Phase 1), then layer in progression systems one at a time.

---

## A.1 Glossary (read this once, refer back forever)

| Term | Meaning |
|---|---|
| **Frame (f)** | The game's internal time unit. The simulation runs at **30 frames per second**. All animation/ability timings are specified in frames, not seconds. `1 second = 30 frames`. |
| **DU (Distance Unit)** | The game's internal distance unit for the battlefield's single horizontal axis. Stage length, unit range, and knockback distance are all measured in DU. |
| **Base** | Each side has one "Base" (a building with HP). Yours spawns units and can be attacked; the enemy's is the destroy-to-win objective. |
| **Foreswing** | The wind-up portion of an attack animation, *before* the hit lands. Can be instant or very long per unit. |
| **Backswing** | The follow-through portion of an attack animation, *after* the hit lands, before the unit is idle again. |
| **Attack Cooldown / TBA (Time Between Attacks)** | The full cycle length of one attack-to-next-attack loop, including foreswing + backswing + any additional hidden recovery. This is the number that actually determines DPS (§A.3.4). |
| **Recharge / Redeploy Cooldown** | The wait time after summoning a unit before you can summon another copy of that same unit again. |
| **Cost** | The money spent to summon one unit. |
| **Knockback (KB)** | (1) A unit-level *stat*: how many times a unit can be shoved backward by cumulative damage before the next big hit kills it outright instead. (2) An *ability* some units/enemies have: a chance to shove whatever they hit backward on every attack, independent of the HP-based version. |
| **Trait** | A tag on an enemy (Red, Floating, Black/Dark, Metal, Angel, Alien, Zombie, Relic, Aku, Colossus, Behemoth, White/Traitless) that certain player-unit abilities are strong or weak against. |
| **Ability** | A named special rule a unit or enemy has (Strong Against, Freeze, Slow, Weaken, Knockback, Critical, Wave Attack, Long Distance, Metal, Barrier, etc.) — see §A.3.8 for the full catalogue. |
| **Energy / Stamina** | The resource spent to *enter* a stage at all (separate from in-battle money). Regenerates slowly over real-world time. |
| **XP** | The single meta-currency used to level up units and base upgrades **between** battles. It is a distinct pool from in-battle money (below) — don't conflate them; the source game keeps them as two genuinely separate currencies with separate names, not just separate uses of one label. Capped at a large fixed ceiling (reference: 99,999,999); anything earned past the cap is simply lost. |
| **Cash / Money (in-battle only)** | A **separate currency from XP**, generated passively only during a battle and reset to nothing when the battle ends. This is what unit Cost is spent from (§A.3.10). Never carries between battles and never funds leveling. |
| **Cat Food** | The premium currency. Used for gacha pulls, continues, stamina refills, and slot/QoL purchases. |
| **NP** | A secondary currency earned by "feeding" duplicate units into the system, spent on upgrading Talents. |
| **Catseye** (rename for your build, see Part D) | An item that raises one specific unit's **level cap** by 1. Does not itself grant levels — you still need XP to climb to the new cap. |
| **Catfruit / Catfruit Seed** (rename in Part D) | Evolution materials required (with XP) to unlock a unit's 2nd evolution ("True Form"). 5 Seeds merge into 1 whole Fruit. |
| **Behemoth Stone** (rename in Part D) | A rarer evolution material required for the 3rd evolution ("Ultra Form") of a small subset of top-tier units. |
| **Talent Orb / Equipment Orb** | A per-unit equippable item that amplifies an *existing* trait-counter ability (it never grants a brand-new one). |
| **Treasure** | A per-stage collectible (bronze/silver/gold tier) that feeds a permanent, additive, account-wide stat-bonus bank once a whole themed set is completed. |
| **Cat Combo** (rename in Part D, e.g. "Squad Combo") | A passive team-synergy bonus that auto-activates when specific *sets* of owned units are present in your loadout, regardless of order. |
| **User Rank** | An overall account-level score (raised by leveling/evolving/owning units) that gates content and reward tiers. |

---

## A.2 The Core Battle Loop, Plain-English Walkthrough

1. Player enters a stage. Energy is deducted immediately on entry.
2. The screen shows a single horizontal battlefield. **Your base is on the left edge of the map, the enemy base is on the right edge** — units you summon walk rightward; enemy units walk leftward toward you. (Confirmed directly from in-game screenshots — an earlier pass through this document had this backwards based on a wiki-text extraction that turned out to be wrong; screenshots are the higher-confidence source here.)
3. **Money starts ticking up automatically** the instant the battle begins, at a rate that itself grows over the course of the fight (see §A.3.10).
4. Along the bottom of the screen is a row of icons — one per unit in your pre-chosen loadout ("Formation," §A.6.3). Tapping an icon, if you can afford its Cost, spawns one copy of that unit at your base's edge and drains the Cost from your money pool. That unit then enters its own **Recharge** timer before you can summon it again.
5. Units walk automatically toward the enemy side. When a unit's detection box touches an enemy, it **stops moving and starts its attack animation** (foreswing → hit → backswing loop) instead of continuing to advance. Combat is fully automatic from here — there is no manual targeting.
6. Enemies spawn from the enemy base on triggers that are partly time-based and partly tied to how much of the enemy's own "spawn budget" has been consumed (§A.3.11) — practically, the wave gets harder and more frequent as the fight goes on.
7. A separate meter — the **Cat Cannon** charge — fills passively over time (independent of money). Once full, tapping the Cannon button fires a big area attack that damages and knocks back everything within its blast, useful for clearing chokepoint clumps, then the meter resets.
8. The battle ends when either base's HP hits 0. Destroying the enemy base = win. Your own base hitting 0 = loss (some special stages disallow the normal "watch an ad or spend Cat Food to continue" bail-out, see §A.6.5).
9. On win: rewards resolve — a Treasure roll (§A.6.3), money/XP payout (scaled by every passive bonus you've earned), and — on a stage's very first clear ever — a distinct one-time bonus.

That's the entire moment-to-moment game. Everything else in this document is either (a) precisely defining the numbers behind steps 4–8, or (b) describing the huge *between-battle* meta layer that decides which units you have access to and how strong they are when you bring them in.

---

## A.3 Combat System — Full Technical Detail

### A.3.1 Battlefield Model

- One axis only. No lanes, no rows to switch between, no vertical movement.
- Player base: left edge. Enemy base: right edge. Player units move right; enemy units move left. (Confirmed from screenshots — see the note in §A.2.)
- Distances measured in **DU**; there is no single fixed battlefield length — it's authored per stage (build your stage schema with an explicit `length_du` field per stage rather than a global constant).
- Every unit has a **detection box** that is what actually triggers "stop and attack" — for a typical melee/short-range unit this detection reaches roughly 320 DU *behind* the unit's front edge in addition to its stated Range in front, so units start attacking a little before an enemy is exactly at their nominal Range. Units with Long Distance or Omni Strike (§A.3.8) override this default detection shape with an explicit min/max window instead.

### A.3.2 Per-Unit Stat Schema

Every deployable unit (and every enemy) is defined by this stat block. Build this as your core `Unit` data table from day one:

| Field | Description |
|---|---|
| `hp` | Damage the unit can take before being removed from the field. |
| `attack_power` | Damage dealt per hit. Some units hit multiple times per attack cycle (see multi-hit note in §A.3.4). |
| `movement_speed` | Governs DU moved per frame while walking (unobstructed). Formula: **DU per frame ≈ speed ÷ 2**. E.g. Speed 10 → 5 DU/frame → 150 DU/second at 30fps. Speed 0 = stationary (used for base-defense-only units). |
| `knockback_count` (KB) | How many times cumulative damage can knock this unit back before the next qualifying hit kills it outright. See §A.3.5. |
| `attack_range` | Distance at which the unit halts and begins its attack animation. |
| `attack_shape` | `single_target` (hits only the nearest enemy in range; ties broken randomly) or `area` (hits every enemy currently in range). |
| `cost` | Money required to summon one copy. **Does not change with the unit's level** — it only scales per-stage/chapter (a global stage cost multiplier, commonly ×1 in early content, up to ×1.5–×2 in later chapters) and can be reduced by a "Cost Down" talent/orb. |
| `recharge_time` | Frames before this unit can be summoned again after being deployed. Hard floor across the whole game: **60 frames (2.0s)**. Cheap rush units start around 240 frames (8s) at base level; rarer/stronger units recharge much slower. Reduced by the "Research" base upgrade (§A.7.1) and by Treasure bonuses (§A.6.3), never by the unit's own level. |
| `foreswing_frames` | Wind-up time before the hit(s) land, per hit if multi-hit. |
| `backswing_frames` | Recovery time after the (final) hit lands. |
| `attack_cooldown_frames` | Hidden additional recovery baked into the full cycle — see the DPS formula below; don't skip this field or your DPS math won't reconcile against reference numbers. |
| `traits` | Tags this unit *counters* (see §A.3.8) — Strong Against X, Resistant to X, Massive Damage vs X, etc. |
| `abilities` | Any of the special ability list in §A.3.8 this unit has (Freeze, Slow, Weaken, Critical, Wave Attack, Long Distance, etc.), each with its own chance/magnitude/duration sub-fields. |
| `rarity` | Normal / Special / Rare / Super Rare / Uber Rare / Legend Rare — governs its own separate stat-growth curve, see §A.4.2. |

### A.3.3 Movement & Range

- A unit walks at its `movement_speed`-derived DU/frame rate until an enemy enters its detection box, then stops completely and begins attacking. It does **not** resume walking until it has killed everything currently in range or those enemies have retreated/died from other sources.
- **Long Distance** units define an explicit *minimum* effective range (a "blind spot" — enemies closer than this can't be hit even though the unit is stationary and could otherwise reach them) plus a maximum effective range further than their stopping distance. Example pattern: a unit stops walking (i.e., "stands") at 1200 DU from an enemy, but its attack actually reaches out to 1500 DU — it just can't hit anything inside some minimum floor near itself.
- **Omni Strike** is the same idea as Long Distance but with the minimum floor fixed at (effectively) zero — no blind spot at all, and almost always paired with an Area attack shape, letting the unit hit everything in a wide window both immediately in front of and behind its stopping point.

### A.3.4 Attack Cycle Timing & the DPS Formula

This is the single most important formula in the whole combat system — build it exactly right and every unit "just feels correct" relative to its reference stats.

```
one full attack cycle (frames) = foreswing + max(backswing, 2 × attack_cooldown − 1)
DPS = (attack_power × 30) / cycle_length_in_frames
```

Worked check against two real reference units (used here purely as a numeric sanity check, not to copy content):

- A basic low-tier melee unit: attack power 96, full cycle 37 frames → `96 × 30 / 37 ≈ 78 DPS`.
- A basic tanky low-tier unit: attack power 24, full cycle 67 frames → `24 × 30 / 67 ≈ 11 DPS`.

Both check out exactly against community-measured DPS values, so implement the formula as written — **do not** naively sum `foreswing + backswing` and expect it to equal DPS's implied cycle length; the hidden `attack_cooldown` term is real and necessary, or your numbers will run roughly 30–50% too fast.

**Multi-hit units:** some units strike more than once per cycle (e.g., a 3-hit combo). For these, your data model needs a *list* of foreswing offsets — one entry per hit — rather than a single foreswing value, e.g. `[5, 10, 20]` meaning hit 1 lands at frame 5, hit 2 at frame 10, hit 3 at frame 20, and only *then* does backswing begin. When you show a "foreswing" stat in a unit inspector UI, show only the time to the *first* hit, matching the source game's convention.

**Interruption rule:** if a unit is knocked back or otherwise displaced mid-foreswing, the wind-up is wasted entirely (no partial credit / no damage) and the attack animation restarts from the beginning next time the unit is stationary and in range again. This is a deliberate skill-expression lever late-game (killing a slow, huge-foreswing boss mid-windup denies its whole attack) — keep it, don't "round up" to a free hit.

### A.3.5 Knockback

Two unrelated systems share the name "Knockback" — implement them as two separate boolean/derived behaviors, not one:

1. **HP-based stagger (the core survivability stat).** Every unit has a `knockback_count` (KB) stat. Conceptually: `endurance = hp / knockback_count`. Every time a unit's *cumulative* damage taken crosses another multiple of its endurance, it gets shoved backward (a "knockback event") instead of just losing HP silently. Once a unit has already been knocked back `knockback_count` times, the *next* qualifying hit kills it outright rather than knocking it back again. Worked example: 5,000 HP, KB count 5 → endurance 1,000 → the unit is shoved back once every 1,000 cumulative damage, and dies outright on what would have been its 6th shove.
2. **Ability-based knockback (a per-attack chance).** Independent of the above, a unit/enemy can carry a "Knockback" *ability* — a chance, on any attack that connects, to shove the target back regardless of the HP-stagger math. If both would fire off the same hit, the HP-stagger version takes precedence (it overwrites the ability version for that hit).

During the shove animation the unit has **no hitbox** (can't be hit, can't hit anything) and any in-progress attack foreswing is canceled (see §A.3.4). Distance shoved and animation length both vary by *source* of the knockback (build these as separate constants, don't hardcode one number): a typical ability-sourced shove is shorter (~155–160 DU, ~12 frames) than a typical HP-stagger shove (~325–350 DU, ~24 frames); your special Cannon-sourced knockback (§A.3.9) is shorter still (~100 DU, ~11 frames) but more frequent/reliable.

### A.3.6 Critical Hits

- A **flat 2× damage multiplier** on proc — this part is universal.
- The **chance to proc is per-unit, not a single global constant** — real reference values range roughly 5%–15%+ depending on the specific unit; don't hardcode "5% for everyone," expose it as a per-unit tunable field instead.
- Uniquely among all damage-boosting effects, Critical Hit **ignores the Metal trait's damage cap** (§A.3.8) — it's the primary way players are expected to punish stalling-out against Metal enemies without a dedicated Metal-counter unit.
- A closely related, separately-tunable ability, "Savage Blow," works the same way (a per-unit % chance for bonus damage) but at a bigger multiplier (commonly 3×, with rare 6× outliers) — and, in deliberate contrast to Critical, **does not** bypass Metal's damage cap. Treat Critical and Savage Blow as two independent optional abilities a unit can carry, each with its own chance/multiplier fields.

### A.3.7 Cost & Recharge Economy (per-battle)

- `cost` is fixed per unit and does not scale with unit level. It *does* scale per stage/chapter — model this as a `stage_cost_multiplier` field on your Stage schema (commonly 1.0× in the earliest content, rising to ~1.5×–2.0× in later chapters) applied at summon time, not baked into the unit's base stat.
- `recharge_time` likewise never changes with unit level. It's reduced only by (a) a dedicated base-upgrade line that shaves a small fixed amount off every unit's recharge per upgrade level, and (b) permanent Treasure-bank bonuses (§A.6.3). Both should reduce toward, but never below, the global 60-frame floor.
- A "Cost Down" ability/equipment effect exists as a late-game upgrade lever — model it as a % reduction that applies every *N*th deployment rather than every single one (the reference implementation applies it every 2nd summon of that unit, non-stacking with other Cost Down sources).

### A.3.8 Special Abilities & Trait Counters — The Full Catalogue

This trait/ability system is the entire strategic depth of the game — get this list right and unit design "just works." Build every entry below as an optional structured field on the `Unit`/`Enemy` schema (chance %, magnitude, duration where applicable), not as free-text.

**Traits an enemy can carry** (a unit's abilities key off these): Red, Floating, Black/Dark, Metal, Angel, Alien (unstarred and "Starred," a stronger late-game variant), Zombie, Relic, Aku, White/Traitless, plus two special "super-classes" layered on top of a normal trait: **Colossus** and **Behemoth** (see below).

**Damage-multiplier abilities (offense vs. a trait):**
| Ability | Effect |
|---|---|
| Strong Against [Trait] | **1.5× damage dealt, 0.5× damage taken** vs. that trait (both halves always come as a pair). Amplified to 1.8×/0.4× by the account-wide Treasure bonus system once unlocked. |
| Massive Damage vs [Trait] | **3× damage dealt** vs. that trait (offense-only, no defensive half). Amplified to 4× by Treasures. |
| Insane Damage vs [Trait] | A rarer, stronger tier above Massive Damage: **5× damage dealt**, amplified to 6× by Treasures. |
| Colossus Slayer | vs. the Colossus super-class specifically: **1.6× dealt / 0.6× taken**. |
| Behemoth Slayer | vs. the Behemoth super-class specifically: **2.5× dealt / 0.6× taken**, *plus* a separate % chance to dodge a Behemoth's attack outright (own chance/duration fields). |
| Base Destroyer | **4× damage** specifically against enemy Bases (not regular enemies). |

**Damage-reduction (pure defense) abilities:**
| Ability | Effect |
|---|---|
| Resistant to [Trait] | Take **25%** damage from that trait (amplified to **20%** by Treasures). |
| Insanely Tough vs [Trait] | A stronger tier: take **~16.7% (1/6)** damage, amplified to **~14.3% (1/7)** by Treasures. Not affected by Combo bonuses or Talent Orbs (unlike plain Resistant). |

**Crowd control / status abilities (each carries its own per-unit chance % and duration in frames — never hardcode one universal value):**
| Ability | Effect |
|---|---|
| Weaken | Reduces the target's attack power (commonly to ~50% of its base, though the exact % is unit-specific) for a duration. Does not touch movement speed. |
| Slow | Reduces the target's movement speed to a fixed slowed value for a duration. Does not touch attack power. |
| Freeze (a.k.a. "Stop") | Fully halts the target's movement *and* attack animation for a duration. Does not block other status effects from also landing. |
| Curse | Disables the *target's* anti-trait/status abilities for a duration — suppresses Weaken, Freeze, Slow, Strong Against, Resistant, Insanely Tough, Massive/Insane Damage, Knockback (ability), Dodge, Warp, Curse itself, and Toxic/Poison on whatever it hits. Does **not** suppress Talent Orb effects or non-trait-based neutral abilities. |
| Poison / Toxic | An attack that also deals bonus damage equal to a percentage of the target's *current max HP*, on top of normal damage. Has no effect on Bases. Bypasses the Metal damage cap. Can itself be suppressed by Curse. |
| Warp | On proc, removes the target from the field for a duration, then respawns it a set distance forward or backward from where it vanished. Warped units still count against the battlefield's total-unit cap. A "Warp Blocker" immunity can fully negate this. |
| Dodge (Attack/Wave/Knockback) | A % chance to take **zero damage and ignore all attack-attached effects** for a short window after triggering; cannot re-trigger while already active, but has no separate cooldown once the window ends. Typical baseline in reference data is low single digits, with some specialized units far higher. |
| Surge Attack | A secondary, delayed area effect that fires from the attacker's *own* position (not the target's) after a normal hit lands — hits everything within a band around the attacker for the same damage as the triggering hit. Duration/hit-count both scale with the ability's own internal "level." |
| Barrier Breaker | Instantly destroys a target's Barrier shield (see below) regardless of whether the raw hit would normally be enough, via its own success chance, then that same hit's full damage/effects apply normally afterward. |
| Zombie Killer | If this unit lands the *finishing* blow on a Zombie-trait enemy, that enemy will not revive (Zombies otherwise have a limited or unlimited revive counter — see Zombie handling below). Purely an anti-revival flag, not an extra damage multiplier by itself. |
| Soulstrike | Lets a unit damage a Zombie's temporarily-dead "remains" during its revive window; damage dealt during that window carries over and reduces the HP the Zombie revives with. |
| Metal Killer | Overrides the normal Metal damage cap (see below): deals a % of the Metal enemy's *current* HP per hit, in addition to whatever base damage applies. |

**Attack-shape / targeting modifiers:**
| Ability | Effect |
|---|---|
| Area Attack | Hits every enemy currently in range, instead of only the closest one. |
| Single Target | Hits only the single closest enemy in range (default for most units); ties broken randomly. |
| Long Distance | Defines an explicit min/max effective-range window with a genuine blind spot closer than the minimum (§A.3.3). |
| Omni Strike | Same idea with the minimum effectively at/below zero — no blind spot, hits both ahead of and slightly behind its stopping point; almost always paired with Area. |
| Wave Attack | A ground-traveling attack that hits every enemy along a band of range (does not affect Bases), inheriting whatever effect the triggering attack had. Starting range differs by source (enemy-sourced waves start wider than player-sourced ones) and increases with the ability's own level. Countered by the "Wave Shield" immunity, which also cancels the wave on contact, protecting anything standing behind the shield-bearer. |

**Special enemy trait behaviors to encode as rules, not abilities:**
- **Metal**: takes a flat 1 damage from any normal attack regardless of the attacker's actual power. Bypassed only by Critical Hits (full damage), a dedicated "true damage vs Metal" base-upgrade ability, Metal Killer (see above), and Toxic/Poison.
- **Barrier**: an enemy trait that must be "cracked" by cumulative hits before it starts taking real damage, visualized as a shattering shell; Barrier Breaker (above) skips this entirely.
- **Colossus** and **Behemoth** are "super-class" tags layered on top of an enemy's normal primary trait (so a Behemoth enemy is still also, say, Red or Angel underneath) — implement as an additional tag array on the Enemy schema, not a replacement for the primary trait, so both sets of counters (Strong Against Red *and* Behemoth Slayer) can apply simultaneously and multiply together.

### A.3.9 Base Mechanics & Win/Loss

- Each side has exactly one Base with its own HP pool. Reference default for the **player** base: **1,000 HP** at baseline, raised via the Base Defense upgrade line (§A.7.1). **Enemy** base HP is not a global constant at all — it's authored per-stage and varies enormously with progression (reference examples found: as low as 30,000 HP on an easy stage, into the 500,000–1,000,000+ range on late-game/event content). Model `base_hp` as a required per-side, per-stage field, never a hardcoded constant.
- Win condition: reduce the enemy Base's HP to 0.
- Loss condition: your own Base's HP reaches 0. Ordinarily the player can pay Cat Food (or watch a rewarded ad) to refill and continue; a subset of harder/special stages explicitly disable this "continue" option (flag this per-stage as a boolean, e.g. `allow_continue: false`). There is no separate battle-length timeout/draw condition in the reference game — a stage runs until one base dies, full stop (a small number of "timed score" stages award a *bonus* for finishing quickly, but don't force a loss on a clock running out).
- Enemy spawns key off three trigger types, confirmed directly from the reference game's own stage-data field format — build your spawn-entry schema around exactly these three, and nothing else:
  1. **Time trigger** — a fixed frame offset from battle start (optionally repeating on a random min/max interval).
  2. **Base-HP% trigger** — the enemy becomes eligible to spawn once the enemy base's remaining HP crosses a given percentage. This is also the mechanism for **boss spawns**: bosses conventionally trigger at **99% enemy base HP** (i.e., almost immediately), and if the base would otherwise be destroyed before that threshold is reached, implement a failsafe that clamps the base at 1 HP just long enough for the boss to spawn (unless the field's enemy-count cap is already full) — this guarantees a scripted boss always appears rather than being skippable by a fast burst of damage.
  3. **Kill-count trigger** — the enemy becomes eligible only after N of the player's units have been defeated so far this battle.
  Waves scripted to fire relative to a boss's appearance (rather than from absolute battle start) are common in the late-game reference data — support a `relative_to: "battle_start" | "boss_spawn"` field per wave entry.
- A boss's arrival should trigger a distinct **shockwave** that knocks back every currently-deployed player unit (longer, slower knockback than a normal hit — reference: ~24× a normal knockback's distance, over roughly double the no-hitbox duration) as a "reset the board" moment, plus an optional screen-shake flag for extra-dramatic bosses.
- The player's own special **Cannon** ability: a meter that fills passively over battle-time (independent of the money economy), typically rendered as a fixed number of discrete segments (commonly ten) that light up as it charges. Firing it (tap) deals a lump area attack + knockback to everything currently within its blast radius near the enemy base, then resets to empty and starts recharging again. Cannon damage, range, and recharge rate are all separately upgradable in the meta-progression base-upgrade menu (§A.7.1) and can additionally be swapped for entirely different themed effects via the deeper cannon-customization system (§A.7.2) — e.g., a version that Freezes instead of damaging, one that spawns a temporary blocking wall unit, one that instantly shatters Barriers, etc. Build the Cannon as a *pluggable effect* system from the start rather than a single hardcoded "damage + knockback," since the meta-game expects you to unlock and choose between several cannon "heads."

### A.3.10 In-Battle Economy

- Money (using the same currency as leveling-XP, per the glossary note — keep them as separate runtime pools even though they share a name/icon in the source game) begins accumulating automatically the instant a battle starts, at a rate that itself **ramps up over the course of the battle** rather than staying flat — i.e., early-battle income is slow, and it accelerates the longer the fight goes on, up to a cap.
- A base-upgrade line and several items (see §A.7.1 "Worker Cat" and §A.8) directly raise this generation rate and/or the wallet cap it can bank up to before overflowing.
- Every unit summon subtracts its Cost from the current money pool immediately; you simply cannot summon a unit you can't currently afford (no partial/queued summons).

### A.3.11 Spawn / Wave Escalation

- Enemy spawns are driven by a mix of straightforward timers (a wave enters at a scripted time offset) and escalating "pressure" triggers (further waves become available to spawn once enough time has passed and/or enough of the enemy's own budget has been consumed by prior waves) — build your Stage schema's enemy list as a sequence of `{ enemy_id, spawn_trigger, repeat_count, repeat_interval }` entries so you can express both flat scripted waves and escalating repeating ones from the same data structure.
- Total simultaneously-alive-on-field units (both sides, but overwhelmingly relevant to the player) is capped by a **global deploy limit** — treat this as a per-battle counter with a wide default ceiling, further reduced on specific Restriction Stages (§A.6.5) down to much smaller numbers (5/10/15, etc.) to force lineup discipline.

---

## A.4 Units — Rarity, Leveling, and Evolution

### A.4.1 Rarity Tiers

| Tier | How obtained |
|---|---|
| Normal | Freely purchasable with basic currency, no gacha needed. |
| Special | Earned from story milestones, events, or login rewards — not gacha. |
| Rare | Gacha only (standard pool). |
| Super Rare | Gacha only (standard pool, lower odds than Rare). |
| Uber Rare | Gacha only (lower odds still; the tier most players are chasing). |
| Legend Rare | Gacha only, lowest odds of all standard pulls; also the exclusive reward tier for a specific late-game campaign track. |

Each tier gets its **own leveling growth curve** (below) and its own level cap — don't share one curve across all rarities.

### A.4.2 Leveling & the Growth Curve

- Level 1 → 30 (approximately) is reached purely by spending XP; no special item required.
- **Growth rate is not a flat "+10%/level" as commonly assumed** — the best-corroborated model is a per-unit authored curve of "% stat increase per level," stored in ~10-level brackets, that **steps down** as level rises. A common shape: **+20% of the unit's level-1 base stat per level for an early bracket, dropping to +10%/level for a middle bracket, dropping again to +5%/level for a late bracket** — with the exact breakpoints varying per rarity tier (Normal/Special tends to taper earliest, around level 60; Rare tends to taper around level 70–90; Super Rare/Uber/Legend around level 60–80). Build this as a **per-unit list of `{ level_range, percent_per_level }` entries** rather than a single global formula, so designers can author faster- or slower-scaling units deliberately.
- `attack_power` and `hp` scale together off the same per-level curve; every other stat (`cost`, `recharge_time`, `attack_range`, etc.) is **level-invariant** — leveling a unit only ever makes it hit harder and survive longer, never cheaper or faster to redeploy.
- Leveling a unit at all also increments the player's overall **User Rank** by a small fixed amount per level-up, feeding the separate account-progression track (§A.7.4).

### A.4.3 Level Cap Extension ("Catseye" items)

- The ordinary level cap via pure XP tops out around level 30 for most units.
- A dedicated consumable item (one variant per rarity tier) raises a **specific unit's** level cap by exactly 1 per item consumed — it does not grant the level itself, just permission to spend XP to reach it.
- Cost of raising the cap escalates the further past the base cap you go: an early band costs 1 item per additional level, a later band costs 2 items per additional level. This is a deliberate diminishing-returns lever late-game (both the stat-growth-per-level *and* the cost-per-level-cap-increase get worse simultaneously past a certain point) — implement both curves so the "law of diminishing returns" feel is intact, not just one of them.
- A separate account-wide unlock (tied to reaching a User Rank threshold) is required before this item type becomes usable at all.

### A.4.4 Evolution: Normal → Evolved → True Form → Ultra Form

| Stage | Unlock condition | Material cost |
|---|---|---|
| **Evolved Form** (1st evolution) | Reach a moderate total level (reference: level 10). | XP only — no special material. |
| **True Form** (2nd evolution) | Reach a higher total level (reference: level 30). | XP **plus** a themed evolution-material currency ("Catfruit" in the source game — rename freely, see Part D) — cost is unit-specific, generally an order of magnitude more XP than the 1st evolution plus several units of one or two specific material *colors*, with a unit's material-color affinity tending to match whatever trait it counters (e.g., a unit strong against Angels wants more of the "Angel-flavored" material color). |
| **Ultra Form** (3rd evolution — a small minority of top-tier units only) | Reach a still-higher total level (reference: level 60). | XP, the same evolution-material currency as True Form, **plus** a separate, rarer tier of material ("Behemoth Stone" in the source game) obtainable only from a dedicated rotating high-difficulty game mode. |

- The evolution-material economy is built around **five to six base colors**, each farmed from its own themed stage (historically one color per weekday, though the source game has since consolidated these into a single rotating stage — either pattern is valid to build, a single combined "farm any color" stage is simpler to implement and just as functional), plus rarer "Epic"/"Elder"/"Gold" tiers sourced from harder or rate-limited content (secret stage variants, tower-mode floor rewards, and big lump donation-style sinks).
- **5 partial "Seed" units of a color merge into 1 whole unit of that material color** — model both a `seed` and `whole` quantity per color in the player's inventory, with an explicit merge action.
- Evolving a unit typically also improves or adds to its ability set (e.g., its Strong Against magnitude may increase, or it may gain a wholly new ability at True Form that it didn't have before) — don't treat evolution as a pure stat-multiplier pass; give your data schema a `granted_abilities` diff per evolution stage.

### A.4.5 Talents & Equipment Orbs (Late-Game Power Layer)

Two related but distinct systems, unlocked once a unit is at least True Form and has reached a fairly high level (reference: level 30 for base Talents, level 60 for a rarer "Ultra Talent" tier restricted to the top rarity):

1. **Talent Trees.** Each eligible unit gets its own small tree of talent nodes (reference cap: roughly 6 base nodes + up to 3 "Ultra" nodes for top-tier units), each independently levelable (reference cap: level 10 per node), paid for with a dedicated currency earned by "feeding" duplicate/unwanted units and items into the system (higher-rarity duplicates are worth proportionally more of this currency). Talent nodes come in a few flavors:
   - **Stat buffs** (flat % Attack or Defense increase per node level, or flat Movement Speed / cooldown-reduction increases).
   - **Resistance buffs** (reduce the duration/severity of enemy status effects like Weaken/Slow/Curse/Wave/Surge/Toxic against this specific unit).
   - **Trait-damage buffs** (bonus damage vs. a specific enemy trait, layered on top of — not replacing — any innate Strong Against the unit already has).
   - **New-ability unlocks** (a small number of talent trees grant an entirely new ability at high node level, e.g. unlocking a Dodge chance the unit didn't start with).
2. **Equipment/Talent Orbs.** A separate equippable item slot (reference: 1 slot for most units, 2 slots for top-rarity units once they hit a level threshold) that **amplifies an existing trait-matchup** rather than granting a new one — e.g. an "Attack Up vs Metal" orb only helps a unit that already has some kind of anti-Metal ability or is just generally attacking Metal enemies; it doesn't grant Strong-Against-Metal out of nothing. Orbs come in five escalating quality grades (reference: D → C → B → A → S) and can be merged (several of one grade → one of the next grade up) as well as earned directly from a dedicated rotating "vault"-style stage category. A small separate family of *non-trait-locked* orbs also exists (cost refund %, universal status-resist %, cannon-charge-on-kill, etc.) sourced from its own distinct reward track.

---

## A.5 Currencies & Gacha

### A.5.1 Currency List

| Currency | Source | Sink |
|---|---|---|
| XP (leveling pool) | Stage-clear rewards; a dedicated always-available "XP farming" stage whose reward doesn't diminish on repeat clears; big lump sums from meta-milestones (e.g., fully completing a region's Treasure set). | Leveling units; selling surplus evolution materials back into XP at a fixed conversion rate. |
| Money (in-battle only) | Passive tick-up during battle (§A.3.10); never carries between battles. | Summoning units mid-battle. |
| Premium currency ("Cat Food") | Daily login, first-time stage clears, ranked-mode/event rewards, optional purchase. | Gacha pulls, stamina refills, continues, cosmetic/QoL slot purchases. |
| Guaranteed-pull tickets | Login streaks, monthly calendar bonuses, event rewards. | A single guaranteed roll on a standard gacha pool (no 11-roll bulk option for tickets — that's premium-currency only). |
| Talent currency (NP) | Feeding duplicate/unwanted units and orbs into the system. | Leveling Talent tree nodes. |
| Evolution materials (Catfruit-equivalent, Behemoth-Stone-equivalent) | Dedicated farming stages, rare drop chances from harder content, milestone rewards. | True Form / Ultra Form evolutions. |
| Level-cap items (Catseye-equivalent) | Drops from harder/late content, once account-unlocked. | Raising a specific unit's level cap. |
| Stamina/Energy | Passive real-time regen (capped, upgradable cap); daily/weekly login and milestone top-ups. | Entering any stage (flat cost per stage, occasionally reduced on repeat clears of the same stage). |

### A.5.2 Gacha Mechanics

- Two pull sizes: a single pull, and an 11-pull bundle at a bulk discount, both costing premium currency (ticket-based pulls are single-only).
- Rotating **banners** (some standard/always-up, many time-limited/thematic) each with their own weighted pool and rarity-odds table.
- A **periodic "guaranteed top-rarity" campaign** exists (not a permanent feature): during such a campaign, an 11-pull's *11th slot specifically* is guaranteed to be the top rarity tier, while pulls 1–10 still resolve at normal odds — model this as a per-banner flag + a "final slot override" rule, not a universal pity system.
- A separate **rate-up banner type** exists that boosts top-rarity odds across the board (not just guaranteeing one slot) — keep this as a second, independent banner flag so you can run either or both kinds of promotion.
- Reference standard-tier odds (illustrative, tune to your own economy rather than copying exactly): roughly Rare ~65%, Super Rare ~26%, Uber Rare ~9%, Legend Rare ~0.3%. Build your odds table as fully data-driven per banner rather than hardcoding a global split.

---

## A.6 World Structure & Stage Systems

### A.6.1 Main Story Sagas

- The core single-player campaign is organized as **three sequential saga tiers**, each split into **3 chapters of roughly 48 stages**, strictly gated: you must fully clear chapter *N* of a saga to unlock chapter *N+1* of that same saga, and clearing chapter 1 of one saga is itself the unlock condition for chapter 1 of the *next* saga (so sagas partially overlap/braid rather than being purely sequential end-to-end).
- Clearing progressively deeper chapters is also the account-wide unlock gate for major *systems*, not just more levels — e.g., the gacha itself, the evolution-material economy, and the Talent system are all gated behind specific campaign milestones rather than being available from minute one. Sequence your own build's unlock gates the same way: **tie feature unlocks to story-progress milestones**, don't just dump every system on the player from the start screen.
- A fourth, harder "endgame saga" (reference: The Aku Realms) exists as a single long escalating chapter with no Treasure system at all and its own unique enemy trait, gated behind a small chain of prerequisite special stages.

### A.6.2 Legend Stages (Parallel Endgame Track)

- A separate, much longer-running side campaign unlocked early (after saga-1's first chapter), organized as its own succession of "Legend campaigns," each notably harder than the last, with the newest one generally being the current difficulty frontier.
- Most Legend sub-chapters can be replayed at increasing **"Crown" difficulty tiers** (reference: up to 4), each crown unlocked sequentially by clearing the previous one, each raising enemy stat multipliers and often adding rarity/lineup restrictions at the very top tier.
- A **separate, orthogonal 1–12 star difficulty label** is displayed on every stage (main story and Legend alike) purely as a difficulty-communication UI element — don't conflate this with the Crown system; they're two independent difficulty axes.

### A.6.3 The Treasure System (Core Meta-Progression Loop)

This is one of the most important systems to replicate faithfully, since it's the game's primary "why keep replaying stages" hook:

1. Every main-story stage has an associated collectible ("Treasure") with **three quality tiers** (bronze/Inferior, silver/Normal, gold/Superior).
2. On any clear, there's a chance (reference: ~35% baseline, doubled during periodic "festival" windows) to receive a Treasure at all, weighted toward the lower tiers (reference split ~45/30/25 bronze/silver/gold among successful drops).
3. Once you've obtained a given tier for a stage, replays can only ever match or upgrade it — never downgrade (a monotonic ratchet per stage).
4. A dedicated consumable item exists purely to bypass this RNG and guarantee the top tier on one specific clear, at a real cost — the game's primary "buy your way past a grind" catch-up mechanic.
5. Stages within a chapter are grouped into several **named Treasure sets** (reference: roughly a dozen per saga-chapter). A set's completion % = the average of (tier value ÷ 3) across every stage in that set, where bronze=1/normal=2/gold=3.
6. Each set, once partially or fully completed, grants a **permanent, additive, account-wide passive bonus** — and critically, this bonus **stacks separately per chapter** of the saga (so maxing the same named set in all 3 chapters of a saga triples that bonus). Concrete bonus categories worth replicating: income-rate boosts, wallet-cap boosts, XP-gain boosts, base-HP boosts, unit HP/ATK boosts, cannon damage/recharge boosts, stamina cap/regen-rate boosts, and specific "reduce this saga's toughest enemy category's stat inflation" debuff-style bonuses that make later replays of early-game content progressively trivial as you complete more of the game.
7. Fully gold-completing an entire chapter additionally grants a single large one-time XP lump sum, separate from the passive bonus bank.

Build the Treasure system as its own module from the start: `TreasureSet { stages: [], per_chapter_bonus_table }` feeding into a single global `PlayerBonusBank` that every other system (battle economy, unit stats, stamina regen) reads from at run time.

### A.6.4 Special Game Modes (Structural Summary)

Build each as its own lightweight "stage container" reusing the same core battle engine, differentiated mainly by entry rules and scoring:

- **Dojo mode**: a free (no stamina cost), fixed-time (reference ~3–5 minutes), score-attack mode against your own invincible base and unlimited waves — used for damage-testing units, not for rewards.
- **Ranked arena mode**: the same idea but stamina-gated, leaderboard-scored, with a shorter fixed timer and real rewards tied to your percentile rank at event close.
- **A rotating high-difficulty daily-window mode** (reference: Behemoth Culling) with a small number of maps that are only enterable during specific time-of-day windows and reset daily — the primary source for the rarer evolution material tier.
- **A drop-then-decode side-currency mode** (reference: Enigma Stages) where clearing regular high-end content has a chance to award a "fragment" that takes real time to decode into a one-shot bonus stage, itself the primary source of Talent/Equipment Orbs.
- **A forced-random-lineup roguelite variant** (reference: Legend Quest) that draws both stage and your available units randomly from your existing unlocks — a good "make old content feel fresh" mode to build once you already have the core engine and full unit roster.
- **Restriction Stages** as a cross-cutting modifier usable on *any* of the above: rarity-only bans, a hard cap on simultaneous deployed units (much lower than the global default), a min/max cost-per-unit band, "front-row units only," and named unit ban-lists. A restricted-out unit can still ride along in your loadout for team-synergy-bonus credit even though it can't actually be summoned that stage.

### A.6.5 Stage Metadata (per-stage fields to track)

`stamina_cost`, `star_difficulty (1–12)`, `treasure_tier_obtained`, `restriction_rules[]`, `allow_continue (bool)`, `enemy_waves[]`, `stage_cost_multiplier`, `first_clear_reward`, `repeat_clear_reward`.

---

## A.7 Meta-Progression: The Home Base

### A.7.1 Upgrade Menu (XP-funded, account-wide, level 1–~30 each)

| Upgrade line | Effect |
|---|---|
| Cannon Power | Raises Cannon damage (trades off against a recharge-time penalty). |
| Cannon Range | Raises Cannon blast radius (small level cap, e.g. 10). |
| Cannon Charge Speed | Reduces Cannon recharge time. |
| Worker/Income Rate | Raises the in-battle passive money generation rate. |
| Worker/Wallet Cap | Raises the ceiling your in-battle money pool can bank up to. |
| Base Defense | Raises your Base's HP pool (front-loaded gains, flattening at high levels). |
| Research | Reduces every unit's redeploy Recharge time by a small fixed amount per level, toward the global floor. |
| Accounting | Increases money earned from defeated enemies. |
| Study | Increases XP earned from stage clears. |
| Stamina Cap | Increases max Energy. |

### A.7.2 Base-Building / Cannon Customization Tree

- A second, deeper meta layer (unlocked once the basic Cannon upgrades above are maxed) where a slow-drip resource loop (a handful of "engineer" workers consuming one of several themed raw materials, each tied to a specific enemy trait) funds long-real-time-duration projects (reference: 12–24 hours each, speedable with a dedicated time-skip consumable).
- This tree unlocks **alternate Cannon "heads"** — entirely different Cannon effects you can swap between per-loadout, not just bigger numbers on the default one: a slow/CC-focused beam, a temporary-wall-summoning beam, a % of Metal-enemy-current-HP beam, a Zombie-specific % HP + anti-revive beam, a Barrier-shattering + Wave-immune-piercing beam, and a Curse-inflicting beam. Also unlocks passive, always-on "Foundation" (damage reduction vs. one trait, applies to your whole team) and "Style" (status-resistance vs. one effect type, applies to your whole team) bonuses, each independently leveled.
- Treat this whole tree as an optional Phase-4+ system in your build order (Part B) — it's a long-tail whale-retention system, not core-loop critical.

### A.7.3 Team Synergy Bonuses ("Cat Combos")

- A passive bonus system layered entirely on top of loadout *composition*, independent of which order units are in: owning a specific *set* of related units (as few as 2, as many as 5+) and having all of them present in your current loadout auto-activates a named bonus for that battle, with multiple sets able to stack simultaneously and the same unit able to count toward more than one set at once.
- Bonus categories mirror the base-upgrade menu (attack/defense/speed %, cannon start-charge %, starting money, worker-cat start-level, base-HP, income/XP-rate %) plus **trait-specific ability amplifiers** (boost your own units' Strong Against/Resistant/Freeze/Slow/Weaken/Critical-chance magnitude specifically).
- Implementation is simple and cheap: at battle start, check the current loadout's owned-unit-ID set against a lookup table of `{ required_unit_ids: [], bonus }` entries, and sum every match additively.

### A.7.4 User Rank

- A single account-wide score, incremented by leveling units, evolving them, and clearing content.
- Gates: which stages/difficulties are unlocked, level-cap-extension item usability, and equipment/orb slot thresholds.

---

## A.8 Battle Items (Consumables)

Core store-purchasable set (six items is the right target scope for a v1 build):

| Item | Effect |
|---|---|
| Speed Up | Doubles battle simulation speed for the rest of the fight (toggle). |
| Treasure Radar | Guarantees the top Treasure tier on this specific clear. |
| Rich Cat | Your Worker/income-rate meter starts the battle already maxed. |
| Auto-Clear Ticket | Auto-plays a previously-cleared stage without manual input; a stronger variant can instantly resolve a previously-cleared stage's rewards without re-simulating combat at all, usable a limited number of times per day. |
| XP Boost | Increases the XP reward from this specific stage clear. |
| Support Strike | A periodic automatic knockback/damage tick against enemies (can't target the Base directly), useful as a passive assist rather than a core-loop item. |

Each is earned in small free quantities from a themed daily-rotation stage (one item type strongly favored per day of the week is a clean, simple pattern to build) as well as purchasable outright with premium currency.

---

## A.9 Stamina/Energy, Login, and Retention Systems

- **Stamina/Energy** (JP term confirmed from screenshots: **統率力**, literally "command/leadership power" — shown on the stage-select map as a per-stage cost like `統率力 -30` and as a running pool with its own upgrade line in the meta Upgrade Menu, both matching this section's model exactly): regenerates at a slow constant rate (reference: ~1 point/minute baseline, improvable via Treasure bonuses), capped by an upgradable max value; deducted in full on stage entry.
- **Daily login ladder**: a long, one-time-per-account sequential reward track (escalating XP/item grants, capped by a big unlock at the very end) that only progresses on days the account is played, distinct from a **separate short re-engagement ladder** that only activates after a long absence.
- **Weekday-themed farming stages**: assign one Battle Item and/or one evolution-material color to each day of the week as a simple, predictable "there's always something worth logging in for today" pattern; a separate always-available "XP stage" (reward doesn't diminish with repeats) should exist as the primary steady-state grinding venue once a player has burned through story content.
- **A monthly "everything is better today" calendar day** (reference: the 22nd of each month) doubling Treasure drop rates account-wide and granting bonus login rewards is a good lightweight retention hook to include.
- **Optional rewarded-ad integration**: offer a bonus stamina top-up (gated to only appear when the player is below some threshold, e.g. 80% of max) — purely optional for a personal-project build.

---

## A.10 UI/UX Specification

> **Confidence note:** most of the layouts below have since been cross-checked directly against in-game screenshots (§A.10.1, §A.10.4, and §A.10.6 in particular are now screenshot-confirmed, not just reconstructed from documented behavior — see the inline "confirmed" flags in those sections). Sections without that flag (Stage Select, Loadout, Results, Gacha) are still reconstructed from functional-behavior documentation rather than pixel-perfect screenshots. Treat exact pixel coordinates as a design-freedom area you should feel free to make your own regardless (this is a reskin anyway) — it's the information architecture and element positions that matter for fidelity.

### A.10.1 Home / Base Screen

This is the actual home screen — there's no separate static title screen with a "Play" button; your base scene itself **is** the menu, and you pan across it horizontally to reach different functional areas.

- **Persistent top status bar**: premium currency count top-left with a small calendar/login-bonus icon beside it; a time-limited banner (e.g. a collab pack with a "N days remaining" countdown) can occupy the top-right when active.
- **Center-lower stack of three primary action buttons**, confirmed exact labels from screenshots (this vertical arrangement is the single most load-bearing piece of layout to keep): top = **"Start Battle!!"** (opens stage-select), middle = **"Power Up"** (opens the base-upgrade categories screen, §A.10.6(b)), bottom = **"Character Formation"** (opens loadout selection, §A.10.3).
- **Secondary icon row** below/beside the main stack, confirmed: a book-icon **Menu** (general settings/info), a pickaxe-icon **Gamatoto** (the passive/idle side-activity for base-building materials, sometimes flagged with a "!" badge when something's ready to collect), and a clipboard-icon **Missions** (quest objectives, also badge-flagged when one's newly available).
- **Gacha buttons are directly reachable from this home screen**, not nested behind another menu — confirmed as their own small button row (e.g. a "Nyanko Gacha" and a "Rare Gacha" button, each showing a small badge count of free/discounted rolls currently available) sitting near the bottom of this screen, alongside a "storage/vault" button for previously-rolled duplicates.
- **Horizontal pan** reveals a second base area purely for the Cannon-customization tree (§A.7.2) — keep this as a distinct, separately-scrollable zone rather than a modal popup.

### A.10.2 Stage Select

- **Outer layer**: a world/region map per saga, tapped into from the home screen's Play button.
- **Inner layer**: a horizontally-flickable list of individual stage tiles within the chosen chapter. Each tile shows: lit/unlit star-difficulty icons (1–12 scale), a small Treasure-tier icon once any tier has been earned for that stage, the stamina cost, and — where applicable — a distinct "Restriction/Conditions" badge that opens a detail popup listing the specific restriction rules for that stage.
- A **dedicated per-chapter Treasure summary screen** (reachable from a star/circle icon on the region map, main-story chapters only) shows every named Treasure set's current completion % and per-tier status at a glance.

### A.10.3 Pre-Battle Loadout ("Equip") Screen

- A scrollable grid/list of every owned unit; tapping adds/removes it from the current Formation.
- **Multiple saved Formation slots** (reference: expandable well past a dozen) so players can maintain separate loadouts for different content without manually rebuilding each time.
- An **Auto-Equip** convenience action that fills the loadout based on the currently-selected stage's known enemy composition, plus a **Pin** toggle per unit so Auto-Equip won't swap out a player's favorites.
- Show each unit's current level and a running total-cost/summary indicator for the loadout as a whole.

### A.10.4 In-Battle HUD (the highest-priority screen to get exactly right)

> **Confirmed directly from screenshots** (superseding the earlier "reconstructed from documented behavior" confidence note above for this section specifically): every element below is now a verified layout, not an inference.

**Top bar:**
- **Top-left**: a pause icon plus the current stage's name (e.g. a Japanese prefecture name in the source game — use your own stage name here).
- **Top-right**: a single combined **wallet readout** in the format `current/cap` followed by the currency unit (the source game appends the yen kanji directly after the number, no separator) — e.g. `2231/9000円`. This is one fused reading, not a separate "current" display plus a smaller "cap" caption elsewhere.
- **Speed Up** toggle button sits just below/beside the wallet readout, top-right (2×, upgradable to 3× via a subscription-style perk).
- Enemy Base HP and player Base HP are each shown as their own `current/max` numeric readout positioned above their respective base sprite (left side for the player base, right side for the enemy base) — plain numbers, no visible health-bar graphic in the reference screenshots.
- **Camera**: side-scrolling with pinch-to-zoom; there is **no minimap** in the reference game — the single-lane layout makes one unnecessary, so don't build one.
- **No visible score/kill-counter appears anywhere in the in-battle HUD.** If your build tracks a score-like metric for its own meta-progression purposes (e.g. a stage-select "best run" stat), compute it silently and surface it only on the results screen / stage-select screen — never as a live on-screen readout during the fight itself, which would be a deviation from the reference UI.

**Bottom bar:**
- A **row of tappable unit-deploy icons** (confirmed as two stacked rows of five in the reference screenshots, all visible simultaneously — not a single row requiring a flick, at least at this roster size), each showing its Cost underneath and a visual **cooldown fill overlay** while its Recharge timer is running — tapping a ready icon spawns it instantly. If a loadout has more units than fit in the visible grid, support a flick/scroll to reveal more (reference also offers an alternate two-column layout as a display-preference toggle).
- **Worker Cat icon, bottom-left**: a round icon showing the current level as a badge, with the ¥ cost to upgrade to the next level displayed underneath — tapping it spends money (mid-battle) to level Worker Cat up, capped at level 8. **Confirmed real per-level numbers** (read directly off three screenshots at Worker Cat levels 1/2/4, all the same stage): the wallet cap climbs by **exactly +1,500 per level**, and the upgrade cost is **exactly `440 × current level`** (440 at Lv1→2, 880 at Lv2→3, 1,760 at Lv4→5). Both are confirmed formulas/values, not placeholders — implement them exactly.
- **Cat Cannon button, bottom-right**: a dedicated circular icon, separate from the base itself (tapping the base does nothing in the reference game — the cannon has its own icon). Its charge is shown as a **radial/circular fill sweeping around the icon** (confirmed from screenshots — not a horizontal segmented bar as an earlier pass through this document guessed). Only tappable once fully charged; firing resets it to empty and deals area damage + knockback per §A.3.9.

### A.10.5 Results Screen

- A distinct popup for any Treasure obtained (showing its tier icon), separate from a distinct popup for any scripted item/unit drop, separate again from a distinct **first-clear-only bonus** banner the very first time a stage/chapter is beaten.
- Standard elements: rewards summary (XP/money/drops), Retry, Next Stage, Return-to-map.

### A.10.6 Upgrade Menu

There are two distinct screens sharing the "Upgrade" label — don't conflate them:

**(a) Per-unit leveling screen**: scrollable roster; select a unit to open its stat panel (HP / Attack / Recharge shown together) with a single "Upgrade!" action button, its XP cost shown live, and level-cap/evolution-eligibility indicated visually once reached (e.g. the Upgrade button changes state/color when an evolution is available instead of a plain level-up). A distinct confirmation screen for evolutions, showing a before/after stat comparison and the full material cost, with explicit Confirm/Cancel actions.

**(b) Base-upgrade categories screen** (the §A.7.1 upgrade lines — Cannon Power/Range/Charge, Worker Rate/Wallet, Base Defense, Research, Accounting, Study, Stamina Cap — confirmed screenshot layout): a **horizontally-scrollable carousel of cards**, one per category, grouped under a named tab (e.g. "Worker Cat," "Cat Cannon," "Special Abilities"). The focused card shows the category's icon/name, its level as `MAX レベル 20 +N` (a base cap of 20 plus N bonus levels unlocked via account-progression milestones — matching this document's User Rank-gated cap-extension pattern, §A.7.4), and a plain-language one-to-two-line effect description underneath (e.g. "Increases Worker Cat's efficiency; money increases faster"). A row of small colored orb icons with counts sits top-right of this screen — these are the Catseye-equivalent level-cap items (§A.4.3), one icon per rarity/type, each showing how many the player is currently holding.

### A.10.7 Gacha Screen

- Banner carousel at the top; roll-cost buttons for both single and 11-bundle pulls clearly priced.
- Reveal flow: capsule/egg opens → a brief silhouette/anticipation beat → a color-coded flash keyed to the rarity tier obtained (a distinct top-tier "rainbow" flourish is worth keeping as a moment of celebration) → final portrait + name reveal.

### A.10.8 Art & Audio Direction (system-level notes, not asset specs)

- Bright, high-saturation primary-color palette; bold rounded typography with a thick outline/drop-shadow treatment reads as "playful" rather than "serious" — lean into that regardless of your reskin's specific IP, since it's core to the genre feel.
- Short, distinct audio stingers for: unit deploy, victory, defeat, and a Cannon-fire cue, plus an upbeat looping battle music bed — cheap to build and disproportionately important for game-feel.

---

## A.11 Confidence Ledger (What to Verify Before Hard-Coding)

The community has reverse-engineered this game for over a decade with no official design doc, so most of the above is extremely solid — but a few specific areas had conflicting sources during research and should be verified against actual extracted game files (see Part D's tooling list) before you treat them as gospel in a shipped economy:

- Exact Metal Killer bonus-damage percentage (confirmed to exist and to be "a % of current HP," exact number not pinned down).
- Whether Toxic/Poison has a "cannot reduce below 1 HP" floor (unconfirmed either way).
- The precise historical evolution of the True-Form unlock mechanic (irrelevant to a fresh build — just implement the current-state rule from §A.4.4).
- Exact frame-length breakdown of knockback by source (a flat "12 frames" figure and a more granular per-source 11/12/24/47-frame breakdown both appear in community sources — the granular version is more specific and is what's reproduced in §A.3.5, but treat the exact numbers as tunable design knobs, not physics constants).
- Exact Talent Orb grade-merge NP costs (two inconsistent figures found; pick your own economy rather than copying either).
- Exact Worker Cat base income rate and its curve (two mutually-inconsistent figures turned up in research — $170/sec base with +5%/level, vs. a much smaller flat per-second figure elsewhere on the same wiki family; don't hardcode either, tune it by playtest instead).
- Exact player-Base HP-per-level curve past level 1 (a flat +1,000/level reading and a front-loaded non-linear reading both appear in sources; §A.7.1 and this section's base-HP note use the simpler flat reading as the safer default to implement).
- Max stamina/energy cap "ceiling" — the reference game doesn't really have one; it keeps growing every time new story content, Treasure sets, and account milestones ship. Don't hardcode a max — build the cap as `base + sum(all unlocked bonus sources)`, openendedly.

None of these gaps block building a fully playable, feel-right version of the game — they only matter if you're trying to match the source game's exact numbers to the decimal, which isn't necessary for a reskinned personal project. Two things earlier drafts of this research *assumed* but which turned out **not to exist** in the reference game, worth actively avoiding in your own design: a money-spent-based enemy spawn trigger (real triggers are time / base-HP% / kill-count only, see §A.3.9), and any mechanic letting duplicate high-rarity units or NP substitute for level-cap-extension items (duplicates instead feed a wholly separate "bonus level" track from gacha pulls — fine to include as its own optional system, but don't wire it into the Catseye-equivalent economy).

---

# PART B — THE BUILD ORDER

Build in this sequence. Each phase is playable/testable on its own before moving to the next, and each references the Part A section that fully specifies it.

### Phase 1 — Single-Lane Combat Prototype (no meta-progression at all)
1. Implement the battlefield model, one lane, two bases (§A.3.1, §A.3.9).
2. Implement the core `Unit` stat schema and the attack-cycle/DPS formula exactly as specified (§A.3.2, §A.3.4) — build 3–5 placeholder units (a cheap fast melee unit, a slow tank, a ranged single-target unit, an area-attack unit) with primitive rectangle art so you can validate feel before any art exists.
3. Implement movement, range/detection, and the attack loop (§A.3.3).
4. Implement knockback (both HP-stagger and ability variants) exactly as two separate systems (§A.3.5).
5. Implement the in-battle money economy (ticking generation, cost deduction) and the bottom-bar deploy row with cooldown overlays (§A.3.10, §A.10.4).
6. Implement a basic enemy-wave scripting format and 2–3 test stages (§A.3.11, §A.6.5).
7. Implement win/loss conditions and a bare-bones results screen (§A.3.9, §A.10.5).
8. **Milestone check**: you should have a fully playable, if visually placeholder, tower-defense loop — one map, a handful of units, a clear win/lose state.

### Phase 2 — Trait/Ability Depth
1. Implement the full trait tag system on enemies (§A.3.8 trait list).
2. Implement Strong Against / Resistant / Massive Damage / Critical Hit as data-driven per-unit fields, then layer in Freeze/Slow/Weaken/Curse/Poison, then Wave Attack/Long Distance/Omni Strike, then the rarer late-game abilities (Warp, Surge, Barrier/Barrier Breaker, Zombie mechanics, Metal/Metal Killer) roughly in that order of implementation complexity.
3. Build 10–15 more units and enemies that meaningfully exercise these counters against each other, and 5–10 more stages that force the player to actually swap loadouts to win (this is where the game's real strategic depth lives — don't skip straight to meta-progression before this feels good).

### Phase 3 — Unit Progression
1. Implement rarity tiers and per-rarity growth curves (§A.4.1, §A.4.2).
2. Implement the Upgrade Menu screen and leveling flow (§A.10.6).
3. Implement level-cap-extension items (§A.4.3).
4. Implement the evolution chain (Evolved/True/Ultra) with material costs and ability-diffs per stage (§A.4.4).
5. Implement Talents and Equipment Orbs (§A.4.5) — this can slip to Phase 5 if you want a leaner v1; it's genuinely late-game-only content in the source game too.

### Phase 4 — World & Progression Wrapper
1. Build the saga/chapter/stage data structure and the sequential unlock gating (§A.6.1).
2. Build the Treasure system in full, including the per-chapter stacking bonus bank (§A.6.3) — this is high-value and relatively cheap to build; prioritize it.
3. Build the Stage Select and per-chapter Treasure-summary screens (§A.10.2).
4. Build the Home/Base screen and Loadout/Equip screen (§A.10.1, §A.10.3).
5. Build stamina/energy and basic daily-login systems (§A.9).

### Phase 5 — Economy & Retention Layer
1. Build the gacha system and currency sinks/sources end-to-end (§A.5).
2. Build the Battle Items shop and weekday-rotation farming stages (§A.8, §A.9).
3. Build Cat-Combo-equivalent team-synergy bonuses (§A.7.3).
4. Build the Upgrade Menu's account-wide base-upgrade lines (§A.7.1).

### Phase 6 — Endgame Content
1. Build one or two of the special modes (§A.6.4) — recommend starting with the free-play Dojo/score-attack mode, since it reuses your core combat engine with almost no new systems, then the rotating daily-window high-difficulty mode if you want a reason for the rarer evolution-material tier to exist.
2. Build the deeper Cannon-customization/base-building tree (§A.7.2) — genuinely optional for a personal project; it's the source game's whale-retention system and adds very little to core gameplay feel.
3. Build Restriction Stages as a modifier layer over your existing stage system (§A.6.5).

### Phase 7 — Art & Polish Pass
Only now, once every system above is functional with placeholder art, bring in your Axie-themed sprites, portraits, icons, and audio (Part D). Building art-last is deliberate: every system above is fully testable and tunable with rectangles and numbers, and reskinning a finished, feel-good game is dramatically faster and lower-risk than trying to hit a moving target while systems are still being designed.

---

# PART C — DATA SCHEMA APPENDIX (pseudo-JSON, ready to translate into your engine/DB of choice)

```jsonc
Unit {
  id, name, rarity, // Normal | Special | Rare | SuperRare | UberRare | LegendRare
  forms: [ // one entry per evolution stage
    {
      form_name, // Base | Evolved | True | Ultra
      unlock_level,
      material_cost: { xp, material_color, qty, seed_qty },
      hp_base, attack_power_base,
      movement_speed, knockback_count, attack_range,
      attack_shape, // single_target | area
      cost, recharge_time_frames,
      foreswing_frames: [ ... ], backswing_frames, attack_cooldown_frames,
      traits_countered: [ { trait, ability_type, magnitude } ],
      abilities: [ { type, chance_pct, magnitude, duration_frames } ]
    }
  ],
  growth_curve: [ { level_range: [a,b], percent_per_level } ],
  talents: [ { node_id, type, per_level_effect, max_level, np_cost_curve } ],
  combo_membership: [ combo_id, ... ]
}

Enemy {
  id, name, hp, attack_power, movement_speed, knockback_count,
  attack_range, attack_shape, foreswing_frames, backswing_frames, attack_cooldown_frames,
  traits: [ "Red" | "Floating" | "Black" | "Metal" | "Angel" | "Alien" | "Zombie" | "Relic" | "Aku" | "White" ],
  super_class: null | "Colossus" | "Behemoth",
  abilities: [ { type, chance_pct, magnitude, duration_frames } ]
}

Stage {
  id, saga, chapter, index, star_difficulty, stamina_cost, stage_cost_multiplier,
  allow_continue, restriction_rules: [ ... ],
  enemy_waves: [ { enemy_id, trigger_type, trigger_value, repeat_count, repeat_interval } ],
  base_hp, enemy_base_hp,
  treasure_set_id, treasure_drop_table: { chance, tier_weights: [bronze, silver, gold] },
  first_clear_reward, repeat_clear_reward
}

TreasureSet {
  id, saga, chapter, stage_ids: [...],
  per_chapter_bonus: { type, value_at_100pct } // stacks additively per chapter of the saga
}

Combo {
  id, required_unit_ids: [...], bonus: { type, magnitude }
}

PlayerBonusBank { // aggregated from every completed TreasureSet
  income_rate_pct, wallet_cap_flat, xp_gain_pct, base_hp_flat,
  unit_hp_pct, unit_attack_pct, cannon_attack_flat, cannon_recharge_flat,
  unit_recharge_flat, stamina_cap_flat, stamina_regen_rate
}

GachaBanner {
  id, active_window, pool: [ { unit_id, rarity, weight } ],
  guarantee_top_rarity_on_slot_11: bool,
  rate_up: bool
}
```

---

# PART D — AXIE RESKIN MAPPING

Every noun below can be swapped 1:1 without touching a single mechanic. Suggested mapping (adjust freely to your own Axie universe/lore):

| Source concept | Suggested Axie-themed rename |
|---|---|
| Cat unit | Axie |
| Cat Base | Lunacia Base / Axie Camp |
| Cat Cannon | (a signature Axie-lore superweapon name of your choosing) |
| Worker Cat | Runestone Miner / Land Worker |
| Cat Food (premium currency) | AXS-style premium gem currency (a purely cosmetic soft-currency name — do not imply real on-chain tokens unless you actually intend a blockchain integration, which is a separate legal/technical decision from anything in this document) |
| XP | Same concept, rename the icon/flavor only |
| Catfruit / Catfruit Seed | Runestone / Rune Shard, themed per Axie class (Beast/Bird/Bug/Plant/Aquatic/Reptile) instead of per enemy trait color |
| Behemoth Stone | Origin Rune / Ascension Core |
| Catseye | Growth Charm |
| Cat Combo | Squad Synergy / Tribe Bonus |
| Rarity tiers (Normal/Special/Rare/SR/UR/Legend) | Keep a parallel 6-tier ladder; Axie already has its own class/part-rarity language (Common/Rare/Epic/Legendary/Origin/Mystic) you can map onto this same 6-slot structure directly |
| Enemy traits (Red/Floating/Black/Metal/Angel/Alien/Zombie/Relic/Aku) | Map onto Axie's existing class system (Beast/Bug/Bird/Plant/Aquatic/Reptile/Dusk/Dawn/Mech) — you already have 9 classes, a near-perfect fit for a 9-trait counter system |
| Talent Orb | Rune / Charm |
| Treasure | Relic Cache |
| User Rank | Trainer/Ronin Rank |

Because every mechanic in Part A is described in trait/ability/currency-generic terms rather than by the source game's proper nouns, this rename pass is purely a content/localization exercise — no formula or system in Part A needs to change.

---

# PART E — TOOLING & FURTHER VERIFICATION

The links below (shared during research) are useful if you want to verify any specific number against the actual extracted game data rather than community wiki write-ups, before finalizing your own economy:

- **fieryhenry/BCData** (GitHub) — raw extracted game data packs (unit stats, stage data, treasure tables) across game versions/regions; the ground-truth source if you want exact numbers rather than reconstructed ones.
- **battlecatsultimate/BCU-java-PC** and **battlecatsultimate/PackPack** (GitHub) — desktop tools for browsing/editing the extracted data packs above; useful for inspecting exact per-unit stat tables directly rather than via wiki pages.
- **bcsfe** (PyPI) — a save-file editor; not needed for building your own game, but useful if you want to poke at real save-state structure for schema inspiration.
- **battlecatsinfo.github.io** and **jarjarblink.github.io/JDB** — community stat lookup/database sites; good for spot-checking specific unit numbers.
- **xirba13/battle-cats-gacha-explorer** (GitHub) — a gacha-rate simulator/explorer; useful reference if you want to validate your own gacha odds table feels right before shipping it.

Recommended next step if you want numeric precision beyond what's in this document: point a Claude Code session at the `BCData` repository's extracted pack files directly and have it parse the raw per-unit stat tables into your own `Unit` schema (Part C) — that closes every gap flagged in §A.11 with authoritative source data instead of reconstructed community estimates.

---

*End of document. This bible covers every system needed to build a fully playable, mechanically faithful base-defense game — sprites, story text, and specific numeric tuning are the only things deliberately left for you to fill in with your own Axie-themed content and design judgment.*
