# Axie Skirmish

A single-lane tower-defense game — a mechanical clone of *The Battle Cats*, reskinned with Axie Infinity characters. Built with [Phaser 3](https://phaser.io) and [Vite](https://vitejs.dev).

For full project documentation (architecture, systems, data, known issues, current status), see **[PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md)**.

For current guide reconciliation, stability work, and the next milestones, see
**[Development baseline](./docs/DEVELOPMENT_BASELINE.md)**. This updates the
historical handover where they differ.

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

Runs formation/save and progression regression checks with Node's built-in test
runner and isolated in-memory storage. No browser saves are read or changed.
Manual browser checks are still required for scenes and combat.

Lint and typecheck are not configured.

## Project Structure

See [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md#project-structure) for a full breakdown of `src/`, `public/`, `docs/`, and `tools/`.
