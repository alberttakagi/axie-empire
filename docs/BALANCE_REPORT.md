# Unit Balance Report (Round 2)

Generated 2026-10-11 from `src/UNIT_CONFIG.js` and `src/PROGRESSION_CONFIG.js`, at level 1 and base form. **No stats were changed.** This report is for review only. ★ marks the 9 new gacha-only units.

How the numbers are worked out: DPS = damage ÷ (foreswing + backswing), multiplied by (1 + crit chance). Matchup bonuses (Strong/Massive/Resistant), area, wave, surge and status procs are listed as abilities and are **not** folded into DPS, so ranged and utility units read lower than their real value.

| Axie | Rarity | Cost | HP | DPS | Range | Recharge s | Speed | DPS per 100円 | HP per 100円 | Abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| Tripp | Normal | 50 | 100 | 6.5 | 14 | 5.3 | 55 | 12.98 | 200 | — |
| Olek | Normal | 100 | 400 | 0.9 | 26 | 8.3 | 44 | 0.9 | 400 | area |
| Shillin | Normal | 200 | 200 | 27.8 | 12 | 7.3 | 66 | 13.89 | 100 | strong:red |
| Puffy | Rare | 400 | 400 | 23.6 | 35 | 11.3 | 55 | 5.91 | 100 | — |
| Buba | Rare | 500 | 500 | 39 | 12 | 9.3 | 165 | 7.81 | 100 | — |
| Noir | Super Rare | 650 | 300 | 85.7 | 21 | 8.7 | 55 | 13.19 | 46 | strong:floating, area |
| Momo | Rare | 800 | 700 | 101.9 | 16 | 13.3 | 55 | 12.73 | 88 | strong:red, massive:zombie |
| Mit | Rare | 1000 | 800 | 81.4 | 40 | 19.3 | 55 | 8.14 | 80 | — |
| Temujin | Super Rare | 1300 | 1000 | 125.4 | 30 | 27.3 | 44 | 9.65 | 77 | area |
| Xia | Normal | 250 | 120 | 2.4 | 22 | 6 | 30 | 0.96 | 48 | barrier |
| Ena ★ | Rare | 450 | 380 | 26 | 38 | 10 | 55 | 5.78 | 84 | strong:floating, slow 30% |
| Venoki ★ | Rare | 300 | 260 | 31 | 12 | 7 | 62 | 10.34 | 87 | weaken 25% |
| Pomodoro ★ | Rare | 150 | 650 | 1.3 | 26 | 8 | 44 | 0.9 | 433 | resist:red |
| Bing ★ | Rare | 550 | 450 | 59.5 | 12 | 9 | 170 | 10.81 | 82 | crit 10% |
| Rouge ★ | Super Rare | 900 | 750 | 118.8 | 18 | 14 | 55 | 13.21 | 83 | massive:red, crit 5% |
| Machito ★ | Super Rare | 1100 | 900 | 84.2 | 18 | 16 | 50 | 7.66 | 82 | wave |
| Bard ★ | Super Rare | 1200 | 700 | 57.4 | 42 | 18 | 55 | 4.78 | 58 | stop 25% |
| Hope ★ | Uber Rare | 2200 | 1600 | 210 | 26 | 30 | 50 | 9.55 | 73 | strong:zombie, wave |
| Shufen ★ | Uber Rare | 2400 | 1300 | 221.7 | 30 | 32 | 55 | 9.24 | 54 | strong:floating, surge, crit 5% |

## Flags against the original 10-unit roster (median DPS per 100円 = 9.65, HP per 100円 = 100)

- **Ena** (Rare): DPS/cost 0.60× and HP/cost 0.84× the original-roster median.
- **Venoki** (Rare): DPS/cost 1.07× and HP/cost 0.87× the original-roster median.
- **Pomodoro** (Rare): DPS/cost 0.09× and HP/cost 4.33× the original-roster median — **high, likely overtuned**.
- **Bing** (Rare): DPS/cost 1.12× and HP/cost 0.82× the original-roster median.
- **Rouge** (Super Rare): DPS/cost 1.37× and HP/cost 0.83× the original-roster median.
- **Machito** (Super Rare): DPS/cost 0.79× and HP/cost 0.82× the original-roster median.
- **Bard** (Super Rare): DPS/cost 0.50× and HP/cost 0.58× the original-roster median — **low, likely undertuned**.
- **Hope** (Uber Rare): DPS/cost 0.99× and HP/cost 0.73× the original-roster median.
- **Shufen** (Uber Rare): DPS/cost 0.96× and HP/cost 0.54× the original-roster median.

## Read-through and suggestions (not applied)

1. **Pomodoro is fine.** The "4.3× HP" flag is the wall archetype: it matches Olek (400 HP per 100円) and does almost no damage, so no change is needed. It is the cheapest Red answer, and that is its job.
2. **Bard looks weak on paper.** It has the lowest DPS/cost of the new units, but it also has the longest reach in the game (42) and a 25% Stop. Suggestion: raise the Stop chance to 35%, or cut its cost from 1,200 to about 950, so it doesn't feel like a dud Super Rare pull.
3. **The Uber Rares don't feel premium.** Hope and Shufen are roughly median per yen, the same as Temujin. In Battle Cats, Ubers are clearly better per cost, and that is what makes a 0.5% pull exciting. Suggestion: give both about +25% damage, or cut their recharge from 30-32s to about 22s. Their wave/surge already add a lot of area value, so test before going further.
4. **Rouge is the efficiency outlier among the new units** at 1.37× DPS/cost, plus Massive vs Red. That's acceptable for a Super Rare, but watch Red-heavy stages (the saga 1 midgame), which it may trivialize.
5. **Ena is low on paper** (0.60× DPS/cost) but is the only ranged unit with Slow. Fine as a support pick.
6. **Gacha odds:** Rare 9% / Super Rare 2.5% / Uber 0.5% per pull, plus a guaranteed unit per 11x pull. At 500 Gems per 11x, the expected Uber rate is about 5.5% per 11x. Check how many Gems a normal campaign hands out before deciding whether that feels fair.

## Twist stages (STAGE_MODIFIERS.js), untested
- **Frenzy (+35% enemy speed)** hits early-saga stages hard (stage 14 is the first). If testers bounce, drop it to +25%.
- **Tight Budget** (wallet -30%, income -20%) stacks with the early money ramp. Watch stage 22 (the first one).
