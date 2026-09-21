# Axie Vibeathon 2026 submission — copy-paste ready

Everything below is drafted, under every character limit, and has no
em dashes anywhere. The three items I could NOT do for you (they need
your own accounts/login) are marked **MANUAL STEP** with exact instructions.

---

## Project title

```
Axie Empire
```

---

## Short description (0/5,000)

```
Axie Empire is a single lane tower defense game where you deploy a roster of Axie characters to defend your base while pushing back waves of Chimera enemies. Collect Treasure charms, level up your Axies, evolve them into stronger forms, and roll the Gacha for XP, Evo Shards and Growth Charms. Command nine unique unit types, each with a distinct role such as tank, ranged, area attacker and titan, and face escalating bosses across three campaign chapters plus an endless Sparring Grounds mode. Built with Phaser 3 and Vite, Axie Empire is a fast, satisfying base defense loop wrapped in original Axie themed art, music and lore.
```
(630 characters)

---

## Product vision (0/2,000)

```
Axie Empire aims to become a full featured base defense game that turns the Axie Infinity universe into an approachable, replayable arcade experience. The vision is a complete multi chapter campaign, a deep roster of collectible Axie units with real progression, a meaningful economy and treasure system, and a presentation that feels distinctly Axie: original art, music and lore built around the Empire of Axies setting. Beyond the current single player campaign and endless Sparring Grounds mode, the goal is to grow this into a live, evolving game with real Axie ownership at its core, so Axie holders can see their own Axies represented as units with real, lasting value both in and out of the game.
```
(704 characters)

---

## How is Axie Core integrated in the game? (0/3,000)

```
Axie Empire does not yet integrate Axie Core, and this is the clearest opportunity for the next phase of the project. The current build is a complete, playable base defense game with an original roster, progression system and economy built to be a natural foundation for real Axie integration. The planned integration:

Axie NFTs as units. A player's own Axie NFTs could be brought in as playable units, with each class and each body part combination granting its own unique abilities and fighting style, so no two players' rosters play exactly alike.

Real Axie stats in battle. An Axie's actual level could be reflected in the game and directly increase its stats in battle, so progressing an Axie outside the game has a real, visible effect inside it.

AXS powered Gacha. The current Gacha, which rolls for XP, Evo Shards and Growth Charms, could be rolled using AXS instead of an in game currency, tying the reward loop directly to the Axie Infinity token economy.

AXP instead of XP. The game's XP system could be replaced with AXP, so progress earned in game feeds back into a player's real Axie Infinity account.

Evo Shard to Memento. The Evo Shard material earned from the Gacha and from battles could be replaced with Memento, aligning the game's own evolution material with Axie Infinity's real item economy.

True Axie lore. The story, world and stage narrative could be rewritten to reflect real, true Axie Infinity lore in place of the current original Empire of Axies narrative, tying the campaign directly into the Axie universe.

PvP. A player versus player mode could let players battle each other's real Axie rosters directly, turning the single player base defense loop into a competitive, ongoing game.

Together, these would turn Axie Empire from a self contained arcade game into a genuine extension of the Axie Infinity ecosystem, where a player's real Axies, real progression and real tokens all have a place inside the game.
```
(1,950 characters)

---

## Project thumbnail

**File: `axie_empire_thumbnail.png`** (also sent to you separately) — 800x450,
16:9, 428 KB, well under the 8 MiB limit. A real screenshot (not staged
art) of the Sparring Grounds mode: all 9 player unit types lined up
against a mixed enemy wave, with the Mythic-rarity Behemoth ("Werewolf"
boss) towering over everything on the right.

---

## Demo video (optional field)

**File: `axie_empire_demo_silent.webm`** (also sent to you separately) —
31 seconds, 800x450, a real recorded walkthrough (opening lore, title,
Character Formation roster, Treasure Sets, the Gacha screen, a live
Sparring Grounds battle).

**One honest limitation:** it has no audio track. I have no way in this
environment to capture the game's Web Audio output in sync with a screen
recording, so I could not deliver "with audio" as asked. If you want
audio, the fastest path is: open the game yourself, use QuickTime's
"New Screen Recording" (captures system audio too), and re-record a
similar ~40 second tour, or just narrate over this silent clip in any
video editor. The video field is also a URL, not a file upload, so
either way you will need to upload the final file somewhere (YouTube
unlisted, Google Drive, etc.) and paste that link in.

---

## Run requirements

**Devices:** Desktop, Mobile, Tablet (all three, recommended)
**Inputs:** Keyboard + mouse, Touch
**Access:** No extra access needed

*Why Mobile/Touch too:* this session added real landscape mobile support
(a rotate-to-landscape prompt in portrait, verified touch input, verified
drag-and-drop). It is genuinely playable on a touch device in landscape,
so it is honest to check these.

**Run notes (0/500):**
```
Landscape orientation is required. On a narrow phone screen in portrait mode the game shows a rotate prompt instead of the play area. Best experienced in a modern desktop browser (Chrome, Edge, Firefox or Safari); mobile browsers work in landscape with touch input, though a few stat tooltips that appear on hover are desktop only and are not required to play. No login or account is needed.
```
(391 characters)

---

## MANUAL STEP 1: Playable builds / Platforms

This repo has never been deployed anywhere public, only run locally via
`npm run dev`. I cannot create a hosting account for you (that needs your
own login), so I could not fill in a build link.

Fastest options (pick one), from the project root:
```bash
npm run build
```
This outputs a static site to `dist/`. Then either:
- **Vercel/Netlify**: drag the `dist/` folder onto their web dashboard, or
  `npx vercel --prod` / `npx netlify deploy --prod` if you have an account.
- **GitHub Pages**: once you push to GitHub (see Manual Step 2), enable
  Pages on the repo, pointing at a `gh-pages` branch or `dist/` via Actions.
- **itch.io**: zip the contents of `dist/` and upload as an HTML5 project.

Once you have a URL, check **Browser** under Platforms and paste that URL
in as the build link.

---

## MANUAL STEP 2: Private source review (GitHub repo + commit SHA)

This project has never been pushed to GitHub, no `git remote` is
configured at all. I cannot create a GitHub repo or push to your account
(needs your login), so this needs you:

1. Create a new GitHub repo (public or private, your call).
2. From the project root:
   ```bash
   git remote add origin <your-new-repo-url>
   git push -u origin main
   ```
3. Invite GitHub user **jaatster** to the repo (or confirm they already
   have access), per the form's own checkbox.
4. **GitHub repository URL**: paste your new repo's URL.
5. **Full review commit SHA**: use this exact 40-character SHA, since it
   is the last commit made this session and nothing has changed since:
   ```
   5bba08c398c337c9283d44764e1beaeeb09f05e4
   ```
   (If you make any further commits before submitting, run `git rev-parse HEAD`
   again and use that instead, so the SHA actually matches what reviewers see.)
6. Check both boxes once the invite and push are done.

---

## Everything else already done this session (context, not a form field)

The game itself was renamed from "Axie Skirmish" to "Axie Empire" on your
request, including the title screen (subtitle removed entirely), browser
tab title, and README. All of this is already committed.
