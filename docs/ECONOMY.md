# Axie Empire economy

## How it works

**Currencies:**
- **Gems:** premium-like, earned only by playing.
- **XP:** soft currency for levels.
- **Energy:** spent to enter stages; regenerates 1 point per minute.
- **Materials:** Evo Shards and Growth Charms.
- **Battle items.**

| Gem sources | Gem sinks |
|---|---|
| First clear of each stage | Gacha (50 per pull, 500 for 11) |
| Milestone missions | Lunacia Market (Energy, XP, materials, items, Daily Deal) |
| Daily login (7-day streak) | Continues (5 / 10 / 20) |
| Daily missions plus the all-clear bonus | Axie Lab redesigns (100) |
| Cannon treasure chests | |

**Why it helps players:**
- Every Gem converts into progress the player chooses: more play (Energy), a stronger Axie (materials or XP), or a shot at a new Axie (gacha).
- Daily rewards give a reason to come back, but missing a day costs nothing beyond the streak; Energy keeps regenerating.

**Tracking:** every Gem earned or spent is logged by source (`src/Economy.js`). The Market shows today's totals, and **Account & Save → Playtest report** summarizes them.

## What testing revealed: the Gem flood

`tools/economy_sim.mjs` simulates 30 days of three player types using the game's real tables:
- stage Energy costs and first-clear Gems
- missions, the login calendar and daily missions
- Market prices and gacha odds

| Player type | Light (1×15 min/day) | Regular (2×25 min/day) | Heavy (4×40 min/day) |
|---|---|---|---|
| **Before: pulls by day 7** | 297 | 935 | 3,630 |
| Before: gacha Axies owned by day 7 | 8 / 9 | 9 / 9 | 9 / 9 |
| Before: share of Gems from first clears | 93% | 98% | 98% |
| Before: share from daily login + missions | 4% | 1% | <1% |
| **After: pulls by day 7** | 77 | 143 | 385 |
| After: gacha Axies owned by day 7 | 7 / 9 | 5 / 9 | 9 / 9 |
| After: share from first clears | 56% | 81% | 86% |
| After: share from daily login + missions | 30% | 12% | 7% |

**What we noticed:** the original first-clear Gems (35 → 740 per stage in Saga 1, about 167,000 over the campaign) paid out about 3,350 gacha pulls. A 15-minute-a-day player owned almost every gacha Axie within a week. That made the gacha meaningless and the daily rewards pointless (1–4% of income).

**What we decided:**
- Scale first-clear Gems to ×0.12 (`FIRST_CLEAR_GEM_SCALE` in `src/STAGE_CONFIG.js`).
- Raise the daily missions:
  - Win 3: 20 → 30 Gems.
  - Defeat 60: 15 → 25 Gems.
  - All-clear bonus: 30 → 50 Gems.

**What happened, in the simulation:**
- **The campaign still pays most Gems,** so progress feels rewarding.
- **Pulls are earned:** about 20 per day for a regular player instead of about 130.
- **The two Ubers stay rare,** at roughly 1 in 400 pulls each.
- **Daily play matters:** it's about a quarter of income for light players, and the main income once the campaign is finished.
- **Buying Energy in the Market is a real choice,** about 16% of a regular player's spending.

**Next:** confirm the simulation against real playtesters with the Playtest report, comparing pulls per day and how fast they collect gacha Axies.

## Re-run the simulation

```bash
node tools/economy_sim.mjs 30        # as shipped
node tools/economy_sim.mjs 30 2      # try first-clear Gems ×2 on top of the shipped scale
```
