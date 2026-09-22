// Every scene positions everything in this original 800x450 space (the
// game's whole layout was authored against it) — that never changes.
// RENDER_SCALE is purely an output-sharpness multiplier: main.js boots the
// real Phaser canvas at LOGICAL_WIDTH*RENDER_SCALE x LOGICAL_HEIGHT*RENDER_SCALE
// (2.4x = exactly 1920x1080, true Full HD), and every scene's camera is
// zoomed by RENDER_SCALE so that same 800x450 layout simply lands on more
// actual pixels. Scenes read LOGICAL_SIZE instead of this.scale (which now
// reports the bigger real canvas) so none of their existing math changes.
export const LOGICAL_WIDTH = 800;
export const LOGICAL_HEIGHT = 450;
export const RENDER_SCALE = 2.4;
export const CANVAS_WIDTH = LOGICAL_WIDTH * RENDER_SCALE;
export const CANVAS_HEIGHT = LOGICAL_HEIGHT * RENDER_SCALE;
export const LOGICAL_SIZE = { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT };
