# Axie Empire

A single-lane tower-defense game, a mechanical clone of *The Battle Cats*, reskinned with Axie Infinity characters. Built with [Phaser 3](https://phaser.io) and [Vite](https://vitejs.dev). Formerly named "Axie Skirmish" (see git history/older docs for that name).

For full project documentation (architecture, systems, data, known issues, current status), see **[PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md)**.

For current guide reconciliation, stability work, and the next milestones, see
**[Development baseline](./docs/DEVELOPMENT_BASELINE.md)**. This updates the
historical handover where they differ.

## Round 2 (Vibeathon) status

See **[docs/ROADMAP_ROUND2.md](./docs/ROADMAP_ROUND2.md)** for what changed in the round-2 push and what's next, and **[docs/BALANCE_REPORT.md](./docs/BALANCE_REPORT.md)** for unit numbers and balance suggestions. Highlights: 19 units (9 gacha-only), unit-collection gacha, Expedition, stage twists, enemy intel and counters, boss intros, per-character Origins SFX, and sprite-sheet atlases for fast loading.

## Asset pipeline (dev-only tools)

| Tool | Purpose |
|---|---|
| `tools/sprite-gen` | Renders Axie Spine skeletons to PNG frames (`npm --prefix tools/sprite-gen run dev`). Starter sequences/stills use a tall headroom canvas, so tall poses are never clipped. |
| `tools/pack_sequence_atlases.py` | Packs run/idleanim frames into `public/sprites/atlas/` multiatlases. Re-run with `--delete-frames` after adding frame art. |
| `tools/prepare_sfx.py` | Trims Origins-kit battle SFX into short one-shots in `public/audio/sfx/`. |
| `tools/import_fixed_frames.py` | Imports re-rendered frames at the shipped scale and foot position. |

The Origins asset kit (`tools/axie-origins-asset-kit`) is Vibeathon-licensed and must not be redistributed outside approved programs.

## Requirements

- Node.js and npm

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts a Vite dev server (default `http://localhost:5173`) with hot module reload.

## Build

```bash
npm run build
```

Outputs a production build to `dist/`.

```bash
npm run preview
```

Serves the built `dist/` output locally.

## Tests / Lint / Typecheck

```bash
npm test
```

Runs formation/save, progression, unit-collection and expedition regression checks with Node's built-in test
runner and isolated in-memory storage. No browser saves are read or changed.
Manual browser checks are still required for scenes and combat.

Lint and typecheck are not configured.

## Project Structure

See [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md#project-structure) for a full breakdown of `src/`, `public/`, `docs/`, and `tools/`.
