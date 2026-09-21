# treasure-gen

Generates bronze/silver/gold GLOW versions of a treasure charm icon: the
original art is left untouched, with a colored rim + soft halo drawn
around its silhouette (built from the icon's own alpha channel) —
see `gen-tiers.js`'s header comment for how.

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
