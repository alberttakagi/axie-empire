# Axie Empire

**Play:** https://axie-empire.vercel.app · **Source:** https://github.com/alberttakagi/axie-empire · **Version:** 0.2.0 (Round 2)

## Pitch

Lunacia is under siege. Chimeras pour out of the corrupted lands, and the Axies must hold the line.

Axie Empire is a single-lane, Battle Cats-style tower defense game:
- Deploy a Formation of Axies and manage a wallet that refills during battle.
- Fire the Rune Cannon, and push the Chimeras back to their tower.
- Between battles, collect new Axies from the Lunacian Summons gacha, power them up, send them on Expeditions and spend Gems in the Lunacia Market.

The vision is a small, complete, replayable Axie game: quick 2–5 minute battles that add up to a long campaign. The campaign has 7 sagas and 336 stages, and every saga ends with a Werewolf finale.

- **Players:** 1 (single player).
- **Session length:** about 5–15 minutes.
- **First saga:** about 2–3 hours.
- **Full campaign:** 20+ hours.

## Controls and setup

| Action | Desktop | Phone / tablet |
|---|---|---|
| Deploy an Axie | Click its card in the bottom row | Tap |
| Unit info | Hover a card (about 0.6 s) | Long-press |
| Rune Cannon | Click the round button, bottom-right | Tap |
| Upgrade the Worker (wallet) | Click the bottom-left button | Tap |
| Rally, battle items | Buttons along the top | Tap |
| Pan / zoom the battlefield | Drag / mouse wheel | Drag / pinch |

- **Setup:** none. The game runs in the browser.
- **Supported devices:**
  - Desktop Chrome, Edge, Safari and Firefox.
  - iOS Safari and Android Chrome, in landscape.
- **Data:** progress is currently saved in the browser. Account sign-in with cloud save is in progress (see Known issues).

## Game loop

1. **Battle:** clear stages to earn XP, Gems on first clears, items and Treasures. Battle twists keep stages fresh:
   - Fog, frenzy and tight budgets.
   - Weather fronts.
   - Elite Chimeras and boss enrage.
   - Cannon-only treasure chests and a once-per-battle Rally.
2. **Grow:**
   - **Power Up:** spend XP on levels; True Form evolution uses Evo Shards and duplicates.
   - **Base Upgrades.**
   - **Formation** building.
3. **Collect:** the gacha has 9 summonable Axies (Rare, Super Rare, Uber). Duplicates raise level caps; maxed units convert duplicates to XP.
4. **Return:** daily login calendar, daily missions, Expeditions on a real-time clock, and milestone missions.

## Axie Core fit

- **Axie Lab, using the live Axie Mixer:**
  - Players design their own Axie by choosing a body class, a color and all six parts (each part with its own class and style).
  - The official `@axieinfinity/mixer` (v1.4.9) renders it **live in the browser**, with PixiJS and pixi-spine and part art streamed from Axie's CDN.
  - The same live frames are used in battle.
- **The parts decide how it fights.** These rules live in `src/AxieGenome.js` and are covered by unit tests:
  - **Body class:** sets the base stats (HP / Speed / Skill / Morale, Origins-style) and which enemy attribute it's strong against.
  - **Each part:** adds its own class's stat bonus.
  - **Back, Horn, Mouth and Tail:** the majority class among them picks the signature move. Ties go to the body class.
    - Beast: Savage Strike (crit).
    - Aquatic: Riptide (slow).
    - Plant: Bulwark (HP, resists knockback).
    - Bird: Gale Wave (lane wave).
    - Bug: Sap (weaken).
    - Reptile: Venom Surge (delayed burst).
  - **Purity:** +3% HP and damage for each part that matches the body class.
- **The rest of the cast:**
  - The roster Axies are rendered from Axie Spine skeletons (the Origins asset kit and the Mixer).
  - Enemies are Chimeras and corrupted beasts from Axie lore, ending with the Werewolf.
- **The world:** sagas, chapters and stage names come from public Lunacia lore.

## Mock economy

- **Currencies:**
  - **Gems:** premium-like, earned only through play.
  - **XP:** soft currency.
  - **Energy:** spent to enter stages; 1 point per minute.
  - **Materials:** Evo Shards and Growth Charms.
  - **Battle items.**
- **Sources:**
  - First clears.
  - Milestone missions.
  - Daily login, a 7-day streak that restarts if you miss a day.
  - Daily missions, plus a bonus for clearing all of them.
  - Cannon chests.
  - Expeditions.
- **Sinks:**
  - Gacha: 50 Gems per pull, 500 Gems for 11. The first pull is free and guarantees a new Axie.
  - Continues.
  - Axie Lab redesigns: 100 Gems; the first design is free.
  - Lunacia Market exchanges:
    - Energy: Snack 20 Gems, Full Refill 60.
    - Training Scroll (5,000 XP): 40.
    - Growth Charm: 80.
    - Evo Shard: 120.
    - Battle items: 35 each.
    - One half-price Daily Deal.
- **Why it helps players:**
  - Gems can always turn into progress the player chooses (Energy to keep playing, materials to finish an evolution), so players are never stuck.
  - Daily rewards give a reason to come back without punishing time away; Energy keeps regenerating.
- **Tracking:**
  - Every Gem earned or spent is logged by source (`src/Economy.js`).
  - The Market footer shows today's Gems earned and spent.
  - These logs feed the playtest notes below.

## Playtest notes

Format: *what we noticed → what we decided → what happened*.

1. **Saga 4 too easy:** the balance simulator (`src/dev/BalanceSim.js`) showed Sagas 5–7 were easier than Saga 4 for a player progressing at a normal pace → we retuned saga strength to 5 / 7.5 / 10.5 / 14 → each saga now ramps up, and Stage 191 is kept as a deliberate wall before the finale. Details in `docs/BALANCE_REPORT.md`.
2. **Generic gacha screen:** the gacha page read as a plain cream box → we built an animated showcase and a full-screen reveal for new Axies → *to be checked with testers.*
3. **Missing hit flash:** hits didn't visibly flash, because a white tint does nothing to a sprite → we switched to a red flash with a squash → *to be checked with testers.*

*More notes will be added after the Oct 24 playtest round.*

## Known issues

- **Account sign-in and cloud save** (Sky Mavis Account, with email as a fallback) are not in yet. Progress lives in browser storage, so clearing site data resets it.
- **The Axie Lab needs a connection to Axie's CDN.** If it can't be reached, the Lab shows a retry message and the Lab Axie falls back to placeholder art.
- **Long fights on low-end phones:** heavy Saga 6–7 battles can drop frames.

## Asset provenance and disclosures

- **Axie and Chimera art, animations and battle sounds:** rendered or trimmed from the *Axie Origins asset kit*, which is Vibeathon-licensed. The kit itself is **not included** in this repository and is not redistributed.
- **Music:**
  - Battle, saga and Origins tracks come from the kit.
  - The home theme (`bgm_forest_theme.mp3`) and the treasure chest art were supplied by the author.
- **Backgrounds:** full-HD battle and menu art (source to be confirmed by the author before submission).
- **Lore:** stage and saga names use public Axie lore terms only.
- **Tools:**
  - Built with Phaser 3 and Vite.
  - AI-assisted development with Claude Code.
- **No wallet, NFT or real payments.** All economy is simulated.

## Round 2 changes

- **Starting build for Round 2:** `cd296fa` (2026-10-11).
- **Main changes since then:**
  - Sagas 4–7 (192 new stages, 9 new enemy designs, 84 Treasure sets).
  - Battle twists, plus a balance simulator and retune.
  - Gacha duplicate cap-ups, the free first pull and the Lunacian Summons banner with new-Axie reveals.
  - Game-feel pass: special-move effects, the cannon sweep, tower crumble and slow motion, per-saga music, hit and attack motion, scene transitions, and wandering Axies on the home screen.
  - Lunacia Market (daily login, daily missions, Gem exchanges, Daily Deal, Gem ledger).
  - First-time battle tips and the home screen's "Next" goal pointer.
  - Axie Lab: design your own Axie, rendered live by the Axie Mixer; its parts set its stats and signature move.

---

## Development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build to dist/
npm test         # Node test runner, isolated in-memory storage
```

- **Dev unlock:** add `?devunlock` locally, or `?devunlock=lunacia` on the deployed site.
- **Balance simulator:** in a dev build, run `await window.runBalanceSim({ stages: ['stage145'], profile: 'onpace' })` in the browser console.

| Tool | Purpose |
|---|---|
| `tools/sprite-gen` | Renders Axie Spine skeletons to PNG frames (`npm --prefix tools/sprite-gen run dev`). |
| `tools/pack_sequence_atlases.py` | Packs run/idle frames into `public/sprites/atlas/` multiatlases. |
| `tools/prepare_sfx.py` | Trims Origins-kit battle SFX into one-shots in `public/audio/sfx/`. |
| `tools/import_fixed_frames.py` | Imports re-rendered frames at the shipped scale and foot position. |

Deeper docs: [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md) · [docs/ROADMAP_ROUND2.md](./docs/ROADMAP_ROUND2.md) · [docs/BALANCE_REPORT.md](./docs/BALANCE_REPORT.md)
