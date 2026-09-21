# treasure-gen

Generates bronze/silver/gold duotone versions of a treasure charm icon.
Each pixel's luminance is remapped onto a per-tier shadow→base→highlight
gradient (alpha untouched) instead of a flat color multiply, so the result
looks like the same icon cast in a different material rather than just
darkened — see `gen-tiers.js`'s header comment for why.

## Usage

```bash
cd tools/treasure-gen
npm install
# drop source charm PNGs into input/, one file per treasure set
npm run gen
# bronze/silver/gold PNGs land in output/, named <basename>_<tier>.png
```

Then copy the tier PNGs you want to keep into `public/treasures/` (create
that folder if it doesn't exist yet) so the game can load them — `input/`
and `output/` are gitignored working directories, not shipped assets.
