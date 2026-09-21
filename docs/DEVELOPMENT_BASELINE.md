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
| Targeting | Gameplay ch. 15: nearest enemy, stable ID tie-break | **Resolved 2026-09-21**: user decided nearest-enemy. All four acquisition sites (player primary/blind-spot, enemy primary/blind-spot) now use a shared `findNearest` helper (same |x delta| metric other distance checks in GameScene.js already use) instead of `Array.find`. Same eligibility predicates, only the among-eligible tie-break changed. Stable tie-break on exact-distance ties is still whichever candidate iterated first at that distance — not yet a stable ID rule; revisit if ties turn out to matter in practice. |
| Knockback | Gameplay ch. 6/8: source-specific distance/invulnerability; one displacement when crossing several HP boundaries | **Partially resolved 2026-09-21**: the "no hitbox while sliding" half is fixed — a knockbackMs>0 entity can no longer be freshly targeted (all 4 findNearest acquisition sites) or take damage (applyResolvedDamage no-ops against it), closing the incoming-hit gap Codex's audit found. Cat Cannon's own direct damage is deliberately left able to hit/knock a sliding enemy — a separate prior decision, since its own comments already establish it as unconditional. Still open: source-specific distance/duration tuning (this build uses one shared KNOCKBACK_DURATION_MS/knockbackDistance-per-config rather than the guide's HP-KB-24F/cannon-11F split) and "one displacement across several HP boundaries" — resolve with tests, not a blanket constant swap. |
| Cannon | Gameplay ch. 8: wave immunity, propagation, source-specific KB, can push knockback-immune enemies | **Resolved 2026-09-21**: user decided base hits should be positionally gated like enemy hits — treated as a bug, not intended behavior. `fireCannonWave` now only calls `damageEnemyBase` when `blastCenterX` is within `blastHalfWidth` of `this.enemyBaseX`, same check already applied to enemies. Verified live: default Cannon Power/Range (no upgrades) still lands ~100 base damage on a fresh blast, so this closes a loophole (any blast, anywhere, always hit) without silently nerfing default pacing. Its F8/F14/F20 timing is still explicitly a reproduction choice, untouched here. |
| Pause | UI ch. 7: pause/resume; gameplay ch. 15: simulation owns timers | **Resolved 2026-09-21**: added setPaused(paused), the one place isPaused is now written, which also sets this.time.timeScale (0 while paused, restored to the active Speed Up setting on resume) — freezes every this.time.delayedCall (cannon wave sequencing, Dojo's self-rescheduling spawner, Surge Attack) alongside update()'s existing gate. Popup buttons (Options/tutorial/Quit confirm/Continue offer) are unaffected since they're driven by Phaser's own input events, not this.time. Verified live in Dojo: paused 5s, timer/spawns/wallet frozen; resumed normally. |
| Retry energy | UI screen data: Retry → deploy confirmation; gameplay ch. 3: energy on stage entry | **Resolved 2026-09-21**: user decided Restart should cost Energy, for consistency with map entry and Next Stage. `createEndScreenButtons`'s Restart handler now calls `trySpendEnergy(this.stage.energyCost)` and shows the same "not enough Energy" message Next Stage already had, before `scene.restart()`. Dojo Restart stays free (its synthetic `this.stage` has no `energyCost` field, mode check skips the charge) — Sparring Grounds is meant to be a free, endless mode. |
| Economy | Gameplay ch. 8: table assumes max facilities/treasures; fresh-account values explicitly unverified | Current worker +8/sec and other pacing assumptions are not justified by copying the maxed table. Preserve while establishing an explicit Axie balance baseline. |
| Growth/evolution | Gameplay ch. 6/9: growth breakpoint 60, evolved at 10, story/plus-level conditions | Game tapers growth at 10 and has separately purchased forms/materials. This is a material progression difference, not a safe numerical cleanup. |
| Treasure | UI ch. 11: regional sets activate after all pieces; 10 listed sets, two locations unconfirmed | Game has 36 sets (12 per saga), partial bonuses, own effects. Any replacement must preserve earned stage tiers and address migration/balance. |
| Gacha | Gameplay ch. 10/16: unit acquisition, seeded sequence, banners | Game intentionally grants currencies/materials. Keep existing pools/prices until a separately scoped ownership design. |
| Stage data | Gameplay ch. 14 notes JP/English-version disagreement on stage1's 50%-HP reinforcements | Current authored spawn table stays unchanged. Stage length and later-saga fidelity need separate verification. |

## Corrected handover claims

- Catalog already dims locked units and shows locked detail text.
- Ten player definitions include nine stage-gated lineages and the
  Guardian/Xia slot, which is not part of that stage-clear chain (mastery-
  gated instead, see "Next milestones" #0 below); do not describe all ten
  as unlocked the same way.
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

0. Done outside this milestone sequence, by explicit user decision or as a
   direct audit-finding fix (see the reconciliation table above for each):
   tutorial base-direction claims removed, Cat Cannon base-hit positional
   gating, Restart now spends Energy like any other stage entry, target
   acquisition switched from first-eligible-in-array to nearest, pause now
   freezes every this.time.delayedCall (not just update()), sliding
   (knocked-back) entities can no longer be targeted or damaged ("no
   hitbox"), Slow no longer touches attack speed (movement-only per the
   bible), Curse now actually suppresses applyStatusEffect/tryDodge/
   computeDamage's Strong-Against-Massive-Resistant bonuses (previously
   only 4 of 8 curse-suppressible sites checked it — applyStatusEffect,
   the single biggest gap, had no check at all), Dojo's
   roleUnlockTier now covers all 22 ENEMY_CONFIG roles instead of 13 (9
   were defaulting to tier 0, including 3 LEGENDARY late-campaign
   bosses), and Xia/Guardian — previously permanently unsatisfiable
   (`{ stageId: null }`) — now unlocks via a new `unlockRequirement`
   shape, `{ unitEvolved: 'basic' }`: reaching Tripp's (the real day-1
   Basic Cat lineage) True Form. User decision: tie the shelved
   Barrier-tank slot to mastering one of the 9 real basic-tier lineages
   rather than a stage clear, since it doesn't correspond to a real
   Basic-tier unit itself (see UNIT_CONFIG.js's own note on this).
   `isUnitUnlocked`, `LoadoutScene.describeLockedUnit`, and
   `CatalogScene.describeLockedUnit` all handle the new shape; verified
   live (locked with the default message, then auto-unlocks and
   auto-seats into Formation the moment Tripp's evolutionStage reaches
   2). All verified live except Slow/Curse specifically — no
   currently-deployed unit carries those abilities to force a live
   before/after, so those two rest on direct correspondence to the bug
   report rather than an observed repro (build + `npm test` still pass
   throughout regardless). Still open: knockback's own source-specific
   distance/duration tuning and simulation/timing work below.
1. ~~Pause/timer correctness~~ — done above. Scene-reuse protection for
   restart/retreat cycles specifically still worth a dedicated pass.
2. ~~Damage and status rules (slow, curse)~~ — done above. Characterize
   combat timing and knockback (source-specific tuning) still open;
   fix one rule at a time with explicit
   before/after checks.
3. Move combat positions and timers into simulation state incrementally, then
   introduce fixed steps and isolated deterministic RNG without a wholesale rewrite.
4. Battle UX/touch-target pass using normalized guide dimensions and the existing
   dual cameras, followed by contextual pre-battle formation if desired.
5. Progression/economy decisions and save-compatible implementation; Gamatoto only
   after the core loop and persistence are stable.
6. Original Axie-themed content and presentation; measured loading/performance work.

Outstanding verification includes full-campaign/boss coverage, advanced abilities,
audio listening, and malformed-data handling outside the Formation module.
