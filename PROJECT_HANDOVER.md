# Project Handover — Axie Skirmish

Prepared for handover to another AI coding agent (ChatGPT Codex). This document is the primary orientation reference — read it before making changes.

## Project Overview

**Axie Skirmish** is a single-lane tower-defense / lane-pusher game — a mechanical clone of *The Battle Cats* (にゃんこ大戦争), reskinned with Axie Infinity characters and an original light lore. Built from a detailed from-scratch systems spec (`battle-cats-clone-bible.md`) plus a later UI-fidelity pass logged in `docs/BATTLE_CATS_MAPPING.md`.

**Status:** playable end-to-end. The full main loop (opening → title → home → saga/stage select → deploy → battle → results) works across a complete 3-saga, 144-stage campaign, plus a Dojo endless mode, Gacha, Treasure Sets, Missions, unit leveling/evolution, and base upgrades. Client-only: no backend, no network calls except a Google Fonts CDN link, save data is 100% `localStorage`.

**What currently works:** everything in the Feature Matrix below marked Complete — verified live in a running browser this session, not just read from source.

**What is incomplete:**
- **Gamatoto** hub icon is a stub — shows a "coming soon" toast, no real system behind it.
- `CatalogScene.js` (Unit/Enemy Guide) has no locked/unlocked visual treatment (cosmetic gap only; `LoadoutScene.js` already has this).
- No automated tests, lint, or typecheck configured.
- One config value is explicitly flagged unconfirmed (see Data and Configuration).

## Technology Stack

| Item | Value |
|---|---|
| Engine | [Phaser](https://phaser.io) 3.90.0 (WebGL/Canvas 2D) |
| Language | Vanilla JavaScript (ES modules) — no TypeScript |
| Build tool | Vite 8.2.2 |
| Package manager | npm (`package-lock.json` present) |
| Runtime deps | `phaser` only |
| Dev deps | `vite` only |
| Fonts | Google Fonts "Rowdies", loaded via `<link>` in `index.html` (external network dependency for the intended typeface; canvas text still renders with a fallback font if offline) |
| Audio | Native Web Audio API, hand-rolled in `src/Audio.js` — not Phaser's built-in sound manager |

No React/Vue/other UI framework — the entire UI is drawn with Phaser GameObjects.

## How to Run

All commands run from the repo root (`axie-skirmish/`).

| Command | Purpose | Verified |
|---|---|---|
| `npm install` | Install dependencies | **PASS** — 19 packages, 0 vulnerabilities |
| `npm run dev` | Start Vite dev server (default port 5173, HMR) | **PASS** — confirmed working throughout this session |
| `npm run build` | Production build → `dist/` | **PASS** — 966ms, 56 modules. See warning below |
| `npm run preview` | Serve the built `dist/` output | **NOT independently re-verified this pass** (standard Vite command, low risk) |
| Tests | — | **NOT CONFIGURED** — no test framework, no test files anywhere in the repo |
| Lint | — | **NOT CONFIGURED** — no ESLint/Prettier config |
| Typecheck | — | **NOT CONFIGURED** — plain JS, no `tsconfig.json` |

**Build warning (non-fatal):** the single output bundle is 1.49 MB / 372 KB gzip, over Vite's 500 KB chunk-size warning threshold. No code-splitting is configured. Doesn't block the build.

A secondary, unrelated dev tool exists at `tools/sprite-gen/` (`npm --prefix tools/sprite-gen run dev`, port 5180) — a small PixiJS app used to *generate* the sprite PNGs checked into `public/`. It is not part of the shipped game and was not re-verified this pass (see `.claude/launch.json` for its launch config).

## Project Structure

```
src/                 All game source. Flat — 51 files, no subfolders.
  main.js              Phaser.Game bootstrap + the 13-scene registration list
  *Scene.js            One file per screen/scene (13 total, see Game Flow)
  *_CONFIG.js          Static data tables (units, enemies, stages, sagas,
                        battle items, traits, status effects, progression
                        curves, base upgrades, combos, missions, VFX)
  Audio.js             WebAudio SFX/music player + volume/mute persistence
  PlayerProgress.js, StageProgress.js, Loadout.js, Energy.js, Treasure.js,
  BattleItems.js, LifetimeStats.js, UserRank.js, DojoProgress.js, Tutorial.js
                        localStorage-backed save modules, one concern each
  UnitStats.js, Combo.js, PartEvolution.js
                        Shared derived-stat calculators (level/evolution/combo math)
  UITheme.js, Backdrop.js, SpriteIcon.js, AttackVfx.js, CombatFeedback.js
                        Shared rendering/UI helpers reused across scenes
public/              Static assets served as-is: audio/, backgrounds/,
                     sprites/{units,enemies,structures}/, vfx/, icons/
docs/                docs/BATTLE_CATS_MAPPING.md — running dev log of the
                     reskin/fidelity pass; also documents known gaps
tools/               Dev-only tooling, not shipped:
  sprite-gen/          PixiJS app that generates the PNGs in public/sprites
  axie-origins-asset-kit/  Cloned reference asset kit (gitignored — has its
                            own restrictive LICENSE.md, do not redistribute)
battle-cats-clone-bible.md   Original systems-design spec this was built from
.claude/launch.json          Dev-server launch config (Claude Code tool)
index.html                   Vite entry HTML (loads src/main.js as a module)
```

## Application/Game Flow

```
Boot (main.js → new Phaser.Game)
 → OpeningScene     scrolling lore text; boots first, plays on every launch
 → TitleScene       "AXIE SKIRMISH" logo, "Game Start" button
 → HomeScene        hub: Start Battle!! / Power Up / Character Formation /
                     Sparring Grounds / Menu (Unit Guide, Enemy Guide,
                     Settings) / Gamatoto* / Missions / Gacha / Treasure
     → SagaSelectScene    choose Saga 1/2/3 (2 & 3 locked until prior saga fully cleared)
         → StageSelectScene   scrollable map, 48 stages/saga, tap → Deploy popup
             → GameScene (mode: 'stage')   the battle itself
                 → results panel: Restart / Next Stage / Menu → StageSelectScene
                 → Retreat mid-battle → Quit confirm → StageSelectScene
     → LoadoutScene        Character Formation: edit/reorder the deploy roster
     → UpgradeScene         Power Up: per-unit leveling/evolution
         → BaseUpgradeScene     Cannon/Base/Research/Economy upgrades
     → GachaScene, TreasureScene, MissionsScene
     → CatalogScene         Unit Guide / Enemy Guide (read-only roster browse)
     → GameScene (mode: 'dojo')   Sparring Grounds — endless timed mode, no saga context, quitting goes to HomeScene
```

`*` Gamatoto: icon present and clickable, shows a "coming soon" toast only — no scene/system behind it.

Every node above was reached and exercised live this session except Gamatoto (confirmed stub) and boss-stage content (not reached — see Feature Matrix).

## Major Systems

| System | Files | What it does | Status |
|---|---|---|---|
| Scene bootstrap | `main.js` | Registers all 13 scenes as classes on one `Phaser.Game`; **scenes are reused, not recreated** — see Architectural Decisions | Working |
| Combat simulation | `GameScene.js` (3,955 lines) | The whole battle loop: spawning, movement, attack cycles, damage/knockback/crit, base HP, Cat Cannon, HUD, in-battle popups, tutorial | Working |
| Unit/enemy data | `UNIT_CONFIG.js` (10 units), `ENEMY_CONFIG.js` (22 enemies) | Base stats, sprite keys, abilities, traits per unit/enemy | Working |
| Stat scaling | `UnitStats.js`, `PROGRESSION_CONFIG.js`, `PartEvolution.js` | Computes a unit's effective (leveled/evolved) stats; shared by `GameScene` and `UpgradeScene` so they can't drift apart | Working |
| Stage/saga data | `STAGE_CONFIG.js` (144 stages), `SAGA_CONFIG.js` (3 sagas) | Per-stage enemy spawn scripts, rewards, restrictions, difficulty | Working |
| Formation (deploy roster) | `Loadout.js`, `LoadoutScene.js` | Which units ride into battle and in what order. Sparse fixed-slot model — see Architectural Decisions. 3 saved Formation slots, Auto-Equip, Pin, drag-to-reorder | Working |
| Traits/combos/status | `TRAIT_CONFIG.js`, `COMBO_CONFIG.js` (5 combos), `STATUS_CONFIG.js`, `Combo.js` | Elemental-style trait matchups, squad synergy bonuses, on-hit status effects (slow/etc.) | Working |
| Progression/save | `PlayerProgress.js`, `StageProgress.js`, `Energy.js`, `UserRank.js`, `LifetimeStats.js`, `Tutorial.js` | All `localStorage`-backed player state — see Save/Load | Working |
| Economy | `MONEY_CONFIG.js`, in-battle wallet logic in `GameScene.js` | Per-battle money accrual, Worker Cat leveling, unit costs | Working (one flagged placeholder value — see Data section) |
| Rewards | `Gacha.js`/`GachaScene.js`, `Treasure.js`/`TreasureScene.js` (36 sets), `BattleItems.js`, `MISSIONS_CONFIG.js`/`Missions.js` (18 missions) | XP/reward-tier gacha (adapted — no unowned-unit concept in this build), stage treasure collection meta-bonuses, consumable battle items, achievement-style missions | Working |
| Audio | `Audio.js` | WebAudio music/SFX player, independent SFX/BGM volume (3-level) + master mute, all persisted | Working (fixed a real mute-regression this session — see git history) |
| Shared UI kit | `UITheme.js`, `Backdrop.js`, `SpriteIcon.js`, `CombatFeedback.js`, `AttackVfx.js`/`VFX_CONFIG.js` | Buttons/panels/fonts, backdrop art, sprite-icon helpers, floating damage text, attack VFX flipbooks — reused across every scene | Working |

## Data and Configuration

All static game data lives in flat `src/*_CONFIG.js` files (plain exported JS objects/arrays, no external DB or JSON fetch — everything is bundled at build time).

| File | Rows | Contains |
|---|---|---|
| `UNIT_CONFIG.js` | 10 | Player unit stats, abilities, sprite keys, unlock requirements |
| `ENEMY_CONFIG.js` | 22 | Enemy stats, sprite keys, abilities |
| `STAGE_CONFIG.js` | 144 | Per-stage spawn scripts, rewards, restrictions (largest data file, 3,621 lines) |
| `SAGA_CONFIG.js` | 3 | Saga metadata + enemy strength multiplier per saga |
| `PROGRESSION_CONFIG.js` | — | Per-unit level curves, evolution thresholds |
| `TRAIT_CONFIG.js` | — | Trait multiplier table |
| `TREASURE_CONFIG.js` | 36 | Treasure sets and their meta bonuses |
| `BATTLE_ITEMS_CONFIG.js` | 3 | Consumable battle items |
| `MISSIONS_CONFIG.js` | 18 | Mission definitions |
| `COMBO_CONFIG.js` | 5 | Squad synergy combos |
| `BASE_UPGRADE_CONFIG.js` | 8 | Cannon/Base/Research/Economy upgrade tiers |
| `MONEY_CONFIG.js` | — | Wallet cap/accrual formulas. **`accrualPerLevel: 8` is explicitly commented "placeholder, unconfirmed"** — the one flagged-uncertain balance value found in the codebase |
| `DOJO_CONFIG.js` | — | Sparring Grounds escalation/pacing |
| `VFX_CONFIG.js` | — | Attack VFX clip mapping per unit/role |

Loaded via plain ES module `import` — no runtime config fetching, no environment variables used anywhere in `src/`.

## Assets

- **`public/sprites/units/`, `public/sprites/enemies/`, `public/sprites/structures/`** — pre-rendered PNG sprite sheets (idle/run/attack/hit poses, some with evolved variants), referenced by texture-key convention in `SpriteIcon.js`/`GameScene.js` (`unit_<role>_<pose>`, `enemy_<role>_<pose>`, etc.)
- **`public/backgrounds/`** — one PNG per saga/scene backdrop, loaded via `Backdrop.js`
- **`public/vfx/`** — pre-rendered attack-effect flipbooks (sprite sequences), loaded via `AttackVfx.js`/`VFX_CONFIG.js`
- **`public/icons/status/`** — status-effect icon set
- **Generation process:** all sprite/VFX PNGs were produced by `tools/sprite-gen` (a separate PixiJS compositing tool) from the gitignored `tools/axie-origins-asset-kit/` reference clone, then copied into `public/`. The generator itself is not part of the shipped game and does not need to run again unless new art is needed.
- No placeholder/programmer-art was found in `public/` — everything is real generated sprite art.

## Audio

- Real files: `public/audio/bgm_*.{mp3,wav}` for music (home/battle/boss/victory/defeat + 3 PvE tracks), real per-unit attack/hit/status WAV files loaded via `playSfxFile`.
- Short UI/combat stingers (tap, deploy, hit, crit, cannon) are **synthesized via oscillators** (`playTone`/`playCannonSfx`/etc. in `Audio.js`) rather than sampled — a deliberate design choice, not a placeholder.
- Two independent 3-level (Off/Low/High) volume controls (SFX, BGM) plus a separate master Mute flag — all in Settings (`HomeScene.showSettingsPopup`, also present in `TitleScene`/`GameScene`'s own Options popups minus the master mute, which lives only in `HomeScene`).
- No missing audio identified.

## Save/Load

- **Mechanism:** `localStorage` only. No server, no account system, no cloud save.
- **Format:** JSON, one key per concern (no single monolithic save blob).
- **Keys in use** (14 total): `axieSkirmishPlayerProgress`, `axieSkirmishStageProgress`, `axieSkirmishFormations` (+ legacy `axieSkirmishLoadout`), `axieSkirmishEnergy`, `axieSkirmishTreasure`, `axieSkirmishBattleItems`, `axieSkirmishMissionsClaimed`, `axieSkirmishLifetimeStats`, `axieSkirmishUserRank`, `axieSkirmishDojoBestScore`, `axieSkirmishTutorialCompleted`, `axieSkirmishMuted`, `axieSkirmishSfxVolumeLevel`, `axieSkirmishBgmVolumeLevel`.
- **Known limitation:** no schema-version field. `Loadout.js` has one ad-hoc legacy-key migration path (old single-Formation save → new multi-slot format); other modules assume their stored shape never changes. A future save-shape change needs its own migration or old saves will silently reset/self-heal to defaults.

## Testing

None. No test framework is installed, no test files exist anywhere in the repository. All verification this session (and presumably prior sessions, per commit messages like "Verified live...") was done by manually driving the running game in a browser.

## Known Bugs

**No open bugs identified during this handover pass.** Everything exercised in the Feature Matrix below worked as expected with a clean browser console (no errors).

Note for context: this session fixed several real bugs before this handover task began (stage-selection getting permanently stuck after certain flows, a mid-battle retreat dialog breaking on reuse, deploy-bar order desyncing from Formation, a muted-audio regression). See git log for details — they are not re-listed here since the task is to document *current* state, not history.

## TODO / Incomplete Work

No `TODO`/`FIXME`/`XXX`/`HACK` comments exist anywhere in `src/` (searched explicitly — zero matches). This codebase instead flags uncertainty inline with plain-English labels ("placeholder", "unconfirmed", "out of scope", "deliberately NOT modeled") rather than TODO markers. The important ones:

- **Gamatoto** — `src/HomeScene.js` (~line 20-30, 296): icon-only stub, "coming soon" toast, no backing scene or data.
- **`src/CatalogScene.js`** — no locked/unlocked visual treatment (per `docs/BATTLE_CATS_MAPPING.md`'s own "Known gaps" item 7, still open).
- **`src/Energy.js`** (~line 14): Leadership-style full-refill items and ad-based partial refills "deliberately NOT modeled... out of scope for this pass."
- **`src/MONEY_CONFIG.js`** (line 40): `accrualPerLevel: 8` explicitly commented "placeholder, unconfirmed."
- **`src/UserRank.js`**: tracked but deliberately not wired into any content gate (saga/stage progression already gates content independently).

## Technical Debt

- **`GameScene.js` is 3,955 lines** — one monolithic scene class owns HUD, combat sim, spawning, cannon, VFX hookups, popups, and tutorial. Functional, but any change here has a large blast radius; read carefully before editing.
- **`STAGE_CONFIG.js` is 3,621 lines** of generated per-stage data. Fine as a data file, but large enough that reviewing a diff to it is unwieldy.
- **No automated tests** — every behavioral claim in this repo's history was verified by manually running the game. Any agent continuing this project should do the same rather than trusting a code read alone.
- **No code-splitting** — single 1.49 MB JS bundle (Vite's own build warning). Not yet addressed.
- **Two unit-naming schemes coexist by design**: `UNIT_CONFIG`'s `characterName` (Axie names — Tripp, Olek, Shillin, ...) is shown in Character Formation and the in-battle deploy bar; `displayName` (real Battle Cats names — Cat, Tank Cat, Axe Cat, ...) is shown in Power Up/Unit Guide. Intentional (see bible Part D's reskin mapping), but easy to misread as a bug.
- **`localStorage` is the entire persistence layer**, no versioning beyond one legacy-key migration in `Loadout.js` (see Save/Load).

## Important Architectural Decisions

- **Reference material:** `battle-cats-clone-bible.md` is the original from-scratch systems spec. `docs/BATTLE_CATS_MAPPING.md` is a running dev log from a later UI-fidelity pass measured against an external screenshot-sourced reference ("the guide", cited in many code comments as "guide Chapter NN") that is **not included in this repo** — treat those citations as historically-sourced, not independently re-verifiable from the repo alone.
- **Everything is an Axie Infinity reskin** of real Battle Cats systems — `UNIT_CONFIG`/`ENEMY_CONFIG` map real roles onto Axie characters (bible Part D). The opening lore is an intentional **original** narrative, explicitly NOT a retelling of real Axie Infinity lore — a standing user preference documented in `OpeningScene.js`'s own comment.
- **Phaser scene reuse (important gotcha):** scenes are registered as classes in `main.js`, and Phaser instantiates each **once**, reusing that same JS object for every later `scene.start()` call — `create()` re-runs, but any custom `this.x` instance field is **not** automatically reset. The established convention (see `isGameOver`/`isPaused`/`continuesUsed` in `GameScene.js`) is to explicitly reset every such field at the top of `create()`. **Any new state flag added to a scene must follow this convention** — two real bugs from violating it were found and fixed this session (`StageSelectScene.isLeavingScene`/`deployPopupObjects`, `GameScene.quitConfirmObjects`/`settingsPopupObjects`/`tutorialObjects`).
- **Dual-camera HUD:** `GameScene` uses `cameras.main` (pannable/zoomable battlefield) and a separate `this.uiCamera` (fixed HUD) — see `setupZoomControls`. Every UI element must be added to `cameras.main.ignore([...])` or it will incorrectly pan/zoom with the battlefield.
- **Formation is a sparse, fixed-slot array**, not a compacted list: `Loadout.js`'s `this.slots[i]` is whichever unit permanently occupies deploy-bar slot `i`, or `null`. Both `GameScene` and `LoadoutScene` read this exact same array/index directly, which is what keeps the in-battle deploy-bar order and the Character Formation screen's order in sync by construction.
- **Audio is hand-rolled WebAudio**, not Phaser's Sound Manager — real sampled files for music/attack sounds, synthesized oscillator tones for short UI/combat stingers (deliberate mix, see Audio section).
- **No backend** — 100% client-side, `localStorage`-only persistence, no auth/network/analytics beyond the Google Fonts CDN link.

## Things That Should Not Be Changed Casually

- The Phaser scene-reuse reset convention (above) — breaking it reintroduces silent, hard-to-reproduce bugs that only show up on a *second* visit to a scene.
- `Loadout.js`'s sparse fixed-slot Formation model — reverting to a compacted list desyncs the deploy-bar from the Formation screen (this was itself a real bug, now fixed).
- `STAGE_CONFIG.js`'s 144-stage data — sourced from real Battle Cats per-stage data per `docs/BATTLE_CATS_MAPPING.md`; hand-editing individual entries risks drifting from that source without the same verification process.
- `GameScene`'s dual-camera setup — any new UI element needs the `cameras.main.ignore(...)` treatment.
- The opening lore's original (non-real-lore) tone — a standing, explicit user preference, not an oversight.

## Current Development Priorities

Based on current state only — not implemented as part of this handover:

1. Build a real Gamatoto system, or remove the icon if it's staying out of scope long-term (currently a dead-end toast).
2. Add locked/unlocked visuals to `CatalogScene.js` (matches `LoadoutScene.js`'s existing treatment) — the one open item in `docs/BATTLE_CATS_MAPPING.md`'s own gap list.
3. Resolve `MONEY_CONFIG.js`'s flagged placeholder (`accrualPerLevel`) against real source data.
4. Add at least a minimal automated smoke test — all verification today is manual browser-driving, which doesn't scale.
5. Consider code-splitting if the bundle keeps growing (Vite's own build warning).

## Feature Matrix

Verified live in a running browser this session unless noted. "Partial" = structurally verified but not exhaustively/visually confirmed. "Unknown" = not reached/exercised this session.

| Feature | Status | Evidence / Location |
|---|---|---|
| Boot | Complete | Dev server boots to OpeningScene with no console errors |
| Title | Complete | "Game Start" reaches HomeScene |
| Main Menu | Complete | HomeScene hub, all icons functional except Gamatoto (confirmed stub) |
| Map | Complete | SagaSelectScene — saga locking, saga cleared-count display |
| Stage Selection | Complete | StageSelectScene — node states, drag-scroll, Deploy popup, energy cost/insufficient-energy path |
| Formation | Complete | LoadoutScene — toggle include/exclude, drag-to-reorder, Pin, Auto-Equip, 3 saved slots |
| Battle | Complete | Multiple full battles played to both Victory and Defeat |
| Units | Complete | 10 units deployed/leveled; `UNIT_CONFIG.js` |
| Enemies | Complete | Multiple enemy types observed spawning/fighting in battle |
| Spawning | Complete | Per-stage spawn scripts produced real waves over time, observed live |
| Economy | Complete | Wallet accrual, Worker Cat, unit costs all changed correctly live |
| Deployment | Complete | Spawn buttons, cost gating (insufficient-funds no-op) verified |
| Cooldowns | Partial | Redeploy gating implied by working deploy loop; cooldown-overlay visual not explicitly isolated this pass |
| Combat | Complete | Units vs. enemies fighting, base HP dropping, observed live |
| Damage | Complete | Floating damage numbers observed live |
| Range | Unknown | Implemented in `GameScene.js`; not visually isolated/verified this session |
| Knockback | Unknown | Implemented in `GameScene.js`; not visually isolated/verified this session |
| Abilities | Partial | Trait tooltip text observed live (e.g. "Strong Against Red: 1.5x damage"); differential combat outcome by trait not isolated |
| Bosses | Unknown | Boss enemy config + boss-music swap exist in code; no boss stage reached this session |
| Cannon | Partial | Rune Cannon charge-arc UI observed live; firing not explicitly tested this session |
| Victory | Complete | "STAGE CLEAR" panel, XP/reward reveal, treasure card observed live |
| Defeat | Complete | "GAME OVER" panel observed live (twice) |
| Results | Complete | Score/XP/rewards + Restart/Next Stage/Menu all clicked and functional |
| Progression | Complete | Rank/XP increased correctly across sessions |
| XP | Complete | Numeric XP changes observed repeatedly (battles, gacha, leveling) |
| Gacha | Complete | Rolled a pull live — gems deducted, XP reward granted |
| Treasure | Complete | TreasureScene showing real earned set progress |
| Save/Load | Complete | `localStorage` inspected directly; state persists across reloads |
| Audio | Partial | System verified structurally (controls work, values persist, no errors); actual sound output not verifiable via automated browser testing |
| Animation/VFX | Partial | Unit sprites/poses rendered and observed live; dedicated attack-VFX flipbooks not isolated/verified this session |
