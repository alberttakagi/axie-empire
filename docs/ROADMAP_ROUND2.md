# Axie Empire — Round 2 Roadmap (Vibeathon)

Written 2026-10-11 after a full audit. The goal is to go from "a solid Battle Cats clone" to "a game judges want to keep playing". Work top to bottom: **P0** gets done before the round-2 demo, **P1** is what makes it feel like a real game, and **P2** is post-hackathon.

## Where it stands today

- The whole loop works: opening → title → home → 3 sagas × 48 stages → battle → results. Also in: Dojo endless mode, Gacha, Treasure, Missions, leveling and evolution, base upgrades, and save data in localStorage.
- Phaser 3.90 + Vite, vanilla JS. Renders at 1920×1080, deploys to Vercel, has a mobile auto-rotate.
- 14 regression tests pass and the build is clean. `GameScene.js` is a 4.4k-line monolith, which is where most risk sits.
- The weakest areas are **game feel** (impact, juice, audio), **meta depth** (no unit collection, the gacha only hands out currencies), and **content identity** (backgrounds and enemies get reused a lot).

## Fixed in this pass

| Area | Fix |
|---|---|
| **Invisible crop line** | The real cause was the sprite generator, not the camera. `tools/sprite-gen` rendered every Axie onto a fixed 512px canvas, and tall poses (the axe on Xia's hop, Temujin's shell, Tripp-evolved's acorn, Mit-evolved) rose past the top edge, so they were cut off inside the PNG itself. The generator now renders on a taller canvas and warns if anything still touches an edge. 9 sequences (276 frames) were re-rendered and imported with `tools/import_fixed_frames.py` at the same pixel scale and foot position, so in-game size is unchanged. See `docs/qa/sprite_crop_fix_before_after.png`. |
| Audio | A battle track could start twice and never stop (stop + replay before the first decode finished). A failed sound download was cached forever, which kept that sound silent for the rest of the session. |
| Battle | Options/Retreat could open on the results screen and freeze the victory reveal. Double-tapping Restart/Next charged Energy twice. An old message timer cut newer warnings short. Wallet cap re-parsed localStorage twice per frame (now cached). The wallet text was re-rendered every frame. Reused-scene fields are now reset. |
| Stage map | Swiping on a node opened Deploy instead of scrolling. The map scrolled behind the open popup. |
| Formation | Tap-to-remove was swallowed on touch screens (drag threshold was 0, now 8px). |
| Home | The dead "Excavation" (Gamatoto stub) button is hidden. The coming-soon toast no longer clears itself early. |
| Misc | `?devunlock` can no longer black-screen in Safari private mode. The "Claimed" mission button is no longer pressable. |

**Second pass (P0 progress):** boss entrance card (dim + WARNING stripes + name plate), top-center boss HP bar, death pop (squash → spin → fade + dust puff), floating "+N円" kill payouts, a pulsing ring and "READY!" stamp when the cannon is charged, a battle loading progress bar, and layered Web Audio SFX: a cannon blast (charge zip, noise crack, sub-bass drop, debris), a boss rumble, hits and crits with pitch jitter, a coin ka-ching and a defeat poof. Real sampled audio (ElevenLabs or Kenney) is still the recommended upgrade over synthesis.

Still open from the audit: a few **still** poses (idle/attack/hit) still have 3–12px of top clipping on some units and enemies (Temujin, Mit, a few chimeras). It's minor because battles mostly show the animated sequences. The fix is to re-render them with the same `STARTER_SEQ_CANVAS` approach once the pose fraction used for each still has been confirmed.

---

## P0: before the round-2 demo (about 3–5 days)

**1. Game feel / "juice". This is the single biggest gap versus Battle Cats.**
- Hit-stop: freeze both sprites for 40–60ms on crits and kills.
- Camera shake on cannon fire, boss steps, and base hits. Use Phaser `cameras.main.shake`, scaled by damage.
- White hit-flash on damage (`setTintFill(0xffffff)` for 1 frame). Knockback gets a dust puff and a short squash-and-stretch.
- Death: the unit pops, coin particles fly to the wallet, and a "+¥" number floats up.
- Bigger damage numbers with pop-in. Crits get color plus a "CRITICAL!" stamp.
- Deploy: the unit drops in from above with a landing puff, and the button gets a flash and a cooldown sweep.

**2. Cannon (Rune Cannon) spectacle**
- Charge-up glow builds on the tower. At full charge the button pulses with a "READY!" stamp.
- On fire: screen flash → beam/shockwave sprite sweeps the lane → enemies knocked back in sequence → heavy shake.
- Layered SFX: charge whine, then a boom with a sub-bass tail, then debris.

**3. Audio overhaul (see the tools section below)**
- Replace the oscillator-synth UI and cannon stingers with real samples: tap, deploy, coin, cannon, base hit, victory/defeat stingers.
- Three hit variants per attack class (melee, ranged, magic), with random pitch ±5% to avoid repetition fatigue.
- Ducking: drop BGM 30% for 400ms under the cannon and boss entrance.

**4. Boss moments**
- Boss intro: the screen dims, a name card slides in ("WEREWOLF — Saga 1 Finale"), there's a warning siren, then the boss walks in.
- Boss HP bar at the top of the screen.

**5. First 60 seconds (judges decide here)**
- Make the title → first battle path take ≤3 taps. Skip the opening crawl on repeat visits ("tap to skip" is already partly there).
- Stage 1 should be winnable with obvious feedback, and the first unit unlock should come right after it, with a celebration.

**6. Polish and stability**
- Run a full browser QA pass on mobile Safari and Chrome Android, the real judging devices.
- Add a loading screen with a progress bar (battle preload can take seconds on mobile).
- Check that the deployed Vercel build has no console errors.

## P1: make it a real game like Battle Cats (2–4 weeks)

**Core depth**
- **Unit collection gacha.** Battle Cats' hook is collecting units. Add unowned units and rarity tiers (Normal/Rare/Super/Uber), with Axie characters as the collectibles. Today's gacha only gives currencies.
- **More units.** 10 isn't enough. Aim for 25–30 across rarities, with distinct roles: anti-air-style "trait killers", wave units, freeze/slow, long-range snipers, cheap meat shields.
- **Third forms** (True Form) with new art. The asset kit's `-1` awakened skeletons cover the second form.
- **Enemy traits that matter.** Battle Cats is about counters (Red/Floating/Black/Angel). Map these to Axie classes (Beast/Aquatic/Plant/Bird/Bug/Reptile…) with real 1.5×/0.5× matchups, and show each stage's enemy classes before battle.
- **Stage variety.** Stage gimmicks (fog, fast enemies, limited units, budget caps, boss rush) and unique backgrounds per sub-region, not per saga.
- **Gamatoto → "Expedition".** Send Axies out while offline and get materials back. It's an easy retention loop.
- **Events and daily stages.** Rotating weekly stages that drop evolution materials.

**Game-feel and presentation**
- **Real Spine animation in-game instead of PNG flipbooks.** The project already has `pixi-spine` and the skeletons in the tool. Phaser has an official Spine plugin (`@esotericsoftware/spine-phaser`). That gives real attack animations, smooth blending, a far smaller download (one atlas instead of ~2,400 PNGs, about 50MB), and no cropping ever again. **This is the most impactful technical upgrade.** Check the asset-kit license before shipping skeletons publicly.
- Parallax backgrounds: 3–4 layers (sky, far mountains, mid, ground) that scroll slightly with the camera pan.
- Weather and ambient particles per saga (dust, leaves, snow, embers).
- Pre-battle formation screen from the Deploy popup (guide UI ch. 6).

**Tech health**
- Split `GameScene.js` into `BattleHUD`, `CombatSystem`, `SpawnSystem`, `CannonSystem`, and `BattleResults` modules.
- Fixed-timestep simulation (30Hz) with seeded RNG. This enables replays and fair leaderboards.
- Texture atlases (TexturePacker or `free-tex-packer`) to cut ~2,400 HTTP requests down to a handful. This is the biggest mobile load-time win.
- Save versioning plus migration, and an export/import save code.

## P2: post-hackathon / Ronin and Axie integration

- Ronin wallet login. Owned Axies (by class/parts) unlock cosmetic skins or bonus units.
- Cloud save and leaderboards (Dojo high score, speedrun times).
- PvP "Arena": async attack on another player's tower setup.
- Localization (JP/EN, since the lore is Japan-flavored), plus haptics on mobile.
- Analytics on stage-fail points to tune difficulty.

---

## Tools and plugins to connect

| Need | Recommended | Why / how |
|---|---|---|
| **SFX (cannon, attacks, UI)** | **ElevenLabs Sound Effects** (API, and its official MCP server works with Claude Code) | Text-to-SFX like "heavy fantasy cannon blast with stone debris, 1.5s". Generate 3–5 variants of each, then trim and normalize. Fastest path to pro-sounding audio. |
| SFX library (free) | **Kenney.nl audio packs** (CC0), **Freesound.org** (check each license), **Sonniss GDC bundles** (royalty-free) | Reliable UI clicks, coins, and impacts with no generation randomness. |
| SFX tweaking | **jsfxr / ChipTone** (browser) | Quick retro stingers if you want to keep the synth vibe. |
| Music | **Suno / Udio** (check commercial terms), or **Soundraw** | Saga-themed battle loops and a boss theme. |
| **Animation** | **Spine runtime for Phaser** (`@esotericsoftware/spine-phaser`) | Use the real skeletal animations already in the asset kit instead of flipbooks. |
| VFX sprites | **Phaser particle emitters** (built-in), **Effekseer** → sprite sheets, **JuhaniJunkala/Kenney particle packs** | Cannon beams, explosions, hit sparks. |
| **Backgrounds** | **Image generation** (Midjourney / GPT-image / Imagen / Flux) with a fixed style prompt, then **split into parallax layers** in Photoshop or Photopea | Keep one style reference image so every saga matches. Generate at 3840×1080 for panning. |
| Background cleanup | **Upscayl** (free upscaler), **remove.bg / Photoshop** | Upscale and separate foreground layers. |
| Texture packing | **free-tex-packer** or **TexturePacker** | Atlases for load time. |
| Playtesting | **Claude in Chrome** or the built-in browser, plus **Vercel previews** for each branch | Share preview links with testers. |

Inside Claude Code, the only connector you need for audio is an ElevenLabs MCP/API key. Everything else is files you drop into `public/audio`, `public/backgrounds`, and `public/vfx`. If you connect it, I can generate, trim, and wire every SFX into `Audio.js` directly.

## Suggested order for the next session

1. Connect ElevenLabs (or download a Kenney pack), then replace the synth stingers and add cannon and attack layers. (half a day)
2. Juice pass: hit-stop, shake, flash, death pop, coin fly, cannon charge/fire sequence. (1 day)
3. Boss intro card and boss HP bar. (half a day)
4. Parallax background for Saga 1 as a showcase. (half a day)
5. Mobile QA on a real device, then re-record the demo video. (half a day)
6. Start the Spine-runtime spike on a branch (P1).
