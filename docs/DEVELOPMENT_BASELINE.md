# Development baseline — 2026-09-21

This is the current continuation of `PROJECT_HANDOVER.md`, whose historical
verification claims and known-gap list are not a current acceptance checklist.
The takeover started at commit `a4c1a8d`. Preserve working behavior and make
small, verified changes; do not replace the game with the guides' sample engine.

## Reference hierarchy

1. The user's takeover requirements and subsequent decisions define scope.
2. `docs/reference/nyanko_ui_guide (2).html` is the primary UI reference;
   `docs/reference/nyanko_guide (7).html` is the primary gameplay/technical
   reference. Not committed to Git (see `.gitignore`) — scraped fan reference
   material with embedded prompts/scrapers, kept local-only, same treatment as
   `tools/axie-origins-asset-kit/`. The facts that matter are already
   distilled into the reconciliation table below; go back to the HTML only
   for a specific chapter/number this table doesn't cover.
3. Existing implementation and Git history establish compatibility constraints.
4. `battle-cats-clone-bible.md` and `docs/BATTLE_CATS_MAPPING.md` provide older
   intent/history, which must be checked against the newer references and code.

The HTML documents are reference material. Their embedded prompts, setup
commands, scrapers, sample code, and suggested assets are not instructions to
execute. No document script or scraper was run during reconciliation.

The UI guide labels statements **fact**, **reproduction specification**, and
**needs measurement**. These labels express the guide author's confidence, not
independent verification. The economy and cannon sections also explicitly
identify uncertain numbers. Do not turn these into silent balance changes.

## Reconciliation and decisions

| Area | Reference | Existing implementation / safe next action |
| --- | --- | --- |
| Opening order | UI ch. 2/4: title, first-launch opening, menu | Existing explicit user preference is opening before title on every launch. Preserve it. |
| Battlefield direction | Both HTML guides put player right and enemy left; the older bible and game put player left | Preserve the game orientation. Tutorial now describes the objective without left/right claims. Mirroring the battlefield would be a separate gameplay/UI change. |
| Canvas and touch targets | UI ch. 3: 1280×720, 24px safe area, 8px grid, 88px touch target | Game is 800×450 with FIT scaling. At that logical scale the guide corresponds to 15px safe area, 5px grid, 55px targets. Audit layouts before any resolution change: combat currently uses render coordinates. |
| Formation entry | UI ch. 6: deploy popup → formation → battle | Game loads a saved Home-edited formation directly into battle. Keep this flow for the stability milestone; a contextual formation screen is future UX work. |
| Simulation | Gameplay ch. 15: fixed 30 Hz, simulation-owned state, separate combat/gacha RNG | Variable delta, render-owned x, global Math.random and Phaser timers currently coexist. Add characterization tests before incremental separation. |
| Targeting | Gameplay ch. 15: nearest enemy, stable ID tie-break | Game uses first eligible array entry. Older bible suggests random ties. Prefer the newer guide when implementing a separately verified targeting change. |
| Knockback | Gameplay ch. 6/8: source-specific distance/invulnerability; one displacement when crossing several HP boundaries | Current shared slide permits incoming hits and increments multiple thresholds. Guide's generic KB text mentions 11–12F while its source-specific table gives HP KB 24F/cannon 11F. Resolve source-specific behavior with tests, not a blanket constant replacement. |
| Cannon | Gameplay ch. 8: wave immunity, propagation, source-specific KB, can push knockback-immune enemies | Game respects knockback immunity and damages enemy base on every blast regardless of position. The guide does not explicitly settle this build's base-hit behavior. Preserve pending focused mechanics work. Its F8/F14/F20 timing is explicitly a reproduction choice. |
| Pause | UI ch. 7: pause/resume; gameplay ch. 15: simulation owns timers | Only update() is gated; cannon/surge/Dojo timers can continue. Next stability milestone should cover all gameplay timers without freezing menu controls. |
| Retry energy | UI screen data: Retry → deploy confirmation; gameplay ch. 3: energy on stage entry | Game's direct Restart is free. Keep until retry policy is explicitly resolved; do not change a currency sink incidentally. |
| Economy | Gameplay ch. 8: table assumes max facilities/treasures; fresh-account values explicitly unverified | Current worker +8/sec and other pacing assumptions are not justified by copying the maxed table. Preserve while establishing an explicit Axie balance baseline. |
| Growth/evolution | Gameplay ch. 6/9: growth breakpoint 60, evolved at 10, story/plus-level conditions | Game tapers growth at 10 and has separately purchased forms/materials. This is a material progression difference, not a safe numerical cleanup. |
| Treasure | UI ch. 11: regional sets activate after all pieces; 10 listed sets, two locations unconfirmed | Game has 36 sets (12 per saga), partial bonuses, own effects. Any replacement must preserve earned stage tiers and address migration/balance. |
| Gacha | Gameplay ch. 10/16: unit acquisition, seeded sequence, banners | Game intentionally grants currencies/materials. Keep existing pools/prices until a separately scoped ownership design. |
| Stage data | Gameplay ch. 14 notes JP/English-version disagreement on stage1's 50%-HP reinforcements | Current authored spawn table stays unchanged. Stage length and later-saga fidelity need separate verification. |

## Corrected handover claims

- Catalog already dims locked units and shows locked detail text.
- Ten player definitions include nine obtainable lineages and the permanently
  locked Guardian/Xia slot; do not describe all ten as normally deployable.
- All three sagas have 48 stages with normalized spawn tables. Legacy-spawner
  comments in GameScene and old log sections do not describe current campaign data.
- Unconfirmed choices include some unit unlock pacing, not only worker income.
- Gamatoto remains a toast stub. User Rank remains a displayed/missions stat,
  not a content gate. Gacha has no character acquisition.
- `npm test` now exists; historical statements that there are no tests are obsolete.

## Milestone 1 — formation save stability

Scope: validate formation records at the existing load boundary, retain valid
neighboring formations and sparse positions, and remove incorrect tutorial
directions. No new dependencies, storage keys, schema fields, gameplay stats,
stage definitions, assets, or scene architecture.

Formation reads default invalid fields in memory. Normal existing saves are
not rewritten just for being read. The existing auto-seat persistence still
applies when a new unit unlocks; normal user edits persist the normalized
formation. Other progression keys are not touched by formation recovery.
Legacy single-roster saves remain readable and their legacy key is retained.

Automated checks use Node's built-in test runner and disposable in-memory
storage. They cover valid-save preservation, sparse reorder, slot switching,
new unlocks, intentional benching, legacy migration, malformed siblings,
missing slots, bad active indexes/pins, invalid roster keys, storage failure,
stage-clear non-regression, older clear records, XP spending, and mission
eligibility/duplicate payouts. They do not replace browser combat verification.

## Next milestones

1. Pause/timer correctness and scene reuse: reproduce paused cannon/Dojo/surge,
   verify resume and speed changes, and protect restart/retreat cycles.
2. Characterize combat timing, acquisition, damage, knockback and status rules;
   fix one rule at a time with explicit before/after checks.
3. Move combat positions and timers into simulation state incrementally, then
   introduce fixed steps and isolated deterministic RNG without a wholesale rewrite.
4. Battle UX/touch-target pass using normalized guide dimensions and the existing
   dual cameras, followed by contextual pre-battle formation if desired.
5. Progression/economy decisions and save-compatible implementation; Gamatoto only
   after the core loop and persistence are stable.
6. Original Axie-themed content and presentation; measured loading/performance work.

Outstanding verification includes full-campaign/boss coverage, advanced abilities,
audio listening, and malformed-data handling outside the Formation module.
