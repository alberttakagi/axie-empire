import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { getEnergyState, trySpendEnergy } from './Energy.js';
import { getStageTier } from './Treasure.js';
import { preloadSagaBackgrounds, addSagaBackground } from './Backdrop.js';
import { preloadSpriteRoster } from './SpriteIcon.js';
import { BC, FONT, createBackButton, createBcButton, createBcCircleButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';
import { playUiTapSfx, playLockedTapSfx, playMapArrivalSfx } from './Audio.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

const DIFFICULTY_COLOR = {
  Easy: 0x4caf50,
  Normal: BC.gold,
  Hard: BC.red,
  Boss: 0xa855f7,
};

const TREASURE_TIER_COLORS = [null, 0xcd7f32, 0xc0c0c0, 0xffd700]; // index 0 (none) never drawn

const INSUFFICIENT_ENERGY_MESSAGE_MS = 1600;

// Map view (guide Chapter 06's own マップ選択: stage icons strung along a
// path on a map, not a grid of cards) — a horizontally-scrollable strip of
// small dot markers connected by a dotted line in stage order, echoing the
// reference's own "red dots on a winding trail" look. No real Japan-map art
// exists in this repo, so the "map" is the saga backdrop itself; the path's
// gentle vertical wave (NODE_WAVE_*) is what reads as a trail rather than a
// flat row of icons.
const NODE_SPACING_X = 110; // widened alongside the bigger node radius below, so enlarged neighbors/labels still clear each other
const NODE_WAVE_AMPLITUDE = 46;
const NODE_WAVE_PERIOD = 6; // stages per full up/down cycle
const MAP_VIEWPORT_TOP = 64;
const MAP_VIEWPORT_BOTTOM = 396;
const MAP_CENTER_Y = (MAP_VIEWPORT_TOP + MAP_VIEWPORT_BOTTOM) / 2;
const DOT_TRAIL_STEP = 10; // px between each small dot of the connecting dotted line

// Drag-scroll physics (guide Chapter 06's スクロールの仕様): momentum that
// keeps coasting after the finger lifts, decaying a fixed % per frame until
// it's slow enough to just stop, plus a soft "rubber band" give at either
// end of the path instead of a hard stop. Real reference numbers are per
// real-frame (30fps); this game runs its own render loop at whatever the
// browser gives it, but the decay/threshold read fine applied per rendered
// frame rather than converted to a time-based rate — the difference is
// imperceptible at typical 60fps.
const SCROLL_INERTIA_DECAY = 0.92;
const SCROLL_INERTIA_MIN_VELOCITY = 0.4;
const RUBBER_BAND_FACTOR = 0.35; // how much of an over-drag past the edge actually moves the map
const RUBBER_BAND_SNAP_LERP = 0.22; // per-frame ease back to the real bound once released

// Extra scrollable empty space held past the very first and very last
// node, on top of whatever it already takes to center either one — without
// this, the scroll bound sits exactly at "the first/last node is centered"
// with zero room to spare, which both reads as an abrupt wall underfoot
// and (see Tripp's own centerNodeLocalIndex) never lets him fully settle
// on either end stage, since the viewport can get close to centered on it
// but never quite past a small margin.
const MAP_EDGE_PADDING = 220;

// Node visual states (guide Chapter 06's ノードの状態 table).
const LOCKED_NODE_COLOR = 0x777777;
const BOSS_NODE_SCALE = 1.4;
const BOSS_RING_COLOR = BC.red;
const NEXT_NODE_PULSE_COLOR = BC.gold;

// Tripp marker (guide Chapter 06's ネコアイコンの挙動, reinterpreted per the
// user's own call: not a progress indicator, just a fun running mascot that
// chases whichever node sits at the center of the viewport — see
// updateTrippTarget/runTrippTo). Tripp is UNIT_CONFIG's real starter Axie
// ('basic') — same idle/run art GameScene battles use, loaded standalone
// here since this scene has no reason to preload the rest of the roster.
const TRIPP_UNIT_ID = 'basic';
const TRIPP_DISPLAY_SIZE = 64; // user feedback: too small to see — was 40
// Gap between a node's own top edge and Tripp's sprite — must clear his
// own half-height (TRIPP_DISPLAY_SIZE/2 = 32) just to avoid overlapping
// the node's circle at all. The CURRENT node additionally stacks a name
// label and a status ("Cost"/"Best") callout above it (see the node-
// rendering loop below) — extra clearance there specifically, or Tripp
// sits on top of that text instead of above it. Both feed getTrippClearance,
// used by createTrippMarker/runTrippTo instead of each hand-rolling this.
const TRIPP_NODE_GAP = 40;
const TRIPP_CURRENT_NODE_EXTRA_CLEARANCE = 48;
// A NON-current node's own name label alternates above/below (see the
// node-rendering loop's labelUp) — found live: every even-localIndex node
// puts its label above, and TRIPP_NODE_GAP alone isn't enough clearance to
// stay above THAT too, so Tripp sat directly on top of the label on every
// other stage whenever it rested there (centerNodeLocalIndex tracks
// whatever's closest to the viewport center, not just the current stage).
const TRIPP_NON_CURRENT_LABEL_EXTRA_CLEARANCE = 32;
const TRIPP_IDLE_BOB_PX = 3;
const TRIPP_IDLE_BOB_MS = 900;
const TRIPP_RUN_SPEED_PX_PER_SEC = 320;
const TRIPP_RUN_DURATION_MIN_MS = 220;
const TRIPP_RUN_FRAME_MS = 160; // run_0/run_1 alternation while moving — same cadence GameScene's own updateRunCycle uses (its RUN_FRAME_PERIOD_MS / 2)

export default class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelectScene');
  }

  // Same saga backdrop art GameScene battles use (see Backdrop.js) —
  // loads all 3 rather than just this.sagaId's, since sagaId isn't known
  // until create() runs.
  preload() {
    preloadSagaBackgrounds(this);
    // Tripp marker (see createTrippMarker) — just the one roster entry,
    // not the whole UNIT_CONFIG (preloadSpriteRoster is guarded by
    // textures.exists, so this is a no-op on a scene reached after a
    // battle already loaded the full roster).
    preloadSpriteRoster(this, { [TRIPP_UNIT_ID]: UNIT_CONFIG[TRIPP_UNIT_ID] }, true);
  }

  create(data) {
    // Every scene's camera is zoomed by RENDER_SCALE so the game's
    // original 800x450-authored layout (LOGICAL_SIZE, see RenderConfig.js)
    // renders onto the real, bigger HD canvas at full pixel density.
    this.cameras.main.setZoom(RENDER_SCALE);
    // Without a camera bounds set (only GameScene has one — its own
    // setBounds happens to clamp scroll to this same point), Phaser's
    // scroll=0 default centers the viewport on world point
    // (viewport-width/2, viewport-height/2) using RAW viewport pixels —
    // i.e. (960, 540) on this 1920x1080 canvas — not on the logical
    // 800x450 layout's own center. centerOn corrects that so world
    // (0,0)-(800,450) actually maps onto the full canvas instead of a
    // small corner of it.
    this.cameras.main.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    // Phaser reuses this same scene INSTANCE across every scene.start —
    // it's registered as a class in main.js, so create() re-runs on the
    // same object rather than a fresh one each time. isLeavingScene (see
    // enterStage/onStageSelected) MUST be reset here for exactly that
    // reason: once set true by a successful Deploy!!, it would otherwise
    // stay true forever — permanently blocking every stage tap on any
    // later visit to this screen (e.g. quitting a battle and coming back)
    // — a real regression this pass's own re-entrancy guard introduced.
    this.isLeavingScene = false;
    // Same reused-instance reasoning: if a player ever left this screen
    // (e.g. tapped Back) while the deploy-confirm popup was still open,
    // showDeployPopup's own "if (this.deployPopupObjects) return" guard
    // would otherwise silently no-op forever on every later visit.
    this.deployPopupObjects = null;

    const { width, height } = LOGICAL_SIZE;
    const progress = loadStageProgress();

    // Saga expansion (bible §A.6.1): STAGE_CONFIG.js stays one flat array
    // (see its own header), so this screen just filters down to one saga's
    // slice of it for display — the game's own default (no data passed,
    // e.g. a stale deep-link) falls back to the very first saga rather than
    // erroring.
    this.sagaId = data?.sagaId || STAGE_CONFIG[0].saga;
    this.sagaStages = STAGE_CONFIG.filter((stage) => stage.saga === this.sagaId);

    // Backdrop matches the chosen saga (see Backdrop.js), dimmed by a flat
    // scrim for the stage grid's own text/contrast — mirrors HomeScene's
    // treatment for the same reason (most of this screen is small text-
    // bearing cards over open background, not one narrow lane).
    addSagaBackground(this, this.sagaId);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    // Map container is created (and populated) BEFORE the header — its own
    // geometry mask keeps it strictly inside MAP_VIEWPORT_TOP/BOTTOM, but a
    // scrolled-past-content bug previously let stage cards visually cover
    // the title/energy readout (added first, so the grid — added after —
    // painted over it once scrolled). Building the header last guarantees
    // it always draws on top regardless, and the mask is the real fix.
    this.createStageMap(progress);
    this.setupMapScroll();
    this.createTrippMarker();

    createTitlePill(this, 24, 26, 'Select Stage');
    createBackButton(this, () => this.scene.start('SagaSelectScene'));
    this.createEnergyDisplay();
    this.createMapArrows();
  }

  // Inertia + rubber-band-snap-back tick (see setupMapScroll) plus Tripp
  // re-targeting whenever scrolling changes which node sits at the
  // viewport's center (see updateTrippTarget) — the two reasons this scene
  // needs its own update() at all.
  update() {
    this.tickMapScroll();
    this.updateTrippTarget();
  }

  // Energy/Stamina (bible §A.9) — the one piece of the old header worth
  // repeating here even though HomeScene now owns the full status bar:
  // it's what actually gates whether a tap on a stage tile below will
  // succeed, so the player shouldn't have to go back to Home to check it.
  createEnergyDisplay() {
    const { width } = LOGICAL_SIZE;
    const { current, cap } = getEnergyState();
    createResourceBadge(this, width - 24, 26, 'ENERGY', `${current}/${cap}`, { valueColor: '#8fffb0' });
  }

  // A stage's position along the winding path — shared by node rendering
  // and the dotted connector so both agree exactly on where each stage is.
  nodePosition(localIndex) {
    const x = 60 + localIndex * NODE_SPACING_X;
    const y = MAP_CENTER_Y + Math.sin((localIndex / NODE_WAVE_PERIOD) * Math.PI * 2) * NODE_WAVE_AMPLITUDE;
    return { x, y };
  }

  // Real Battle Cats chapters run 48 stages long (see STAGE_CONFIG.js's
  // saga1) — far more than one screen could ever show as full-size cards.
  // Guide Chapter 06's own マップ選択 strings stage icons along a path on a
  // map instead of a card grid; this reproduces that shape — small dot
  // markers in stage order, connected by a dotted trail, laid out along a
  // gentle sine wave (see nodePosition) so it reads as a winding path
  // rather than a flat row — scrolled horizontally as one unit inside
  // `this.mapContainer`. A geometry mask clips the container strictly to
  // MAP_VIEWPORT_TOP/BOTTOM so scrolled content can never visually bleed
  // into the header or footer, regardless of scroll position (see
  // setupMapScroll's own note on the bug this replaces).
  createStageMap(progress) {
    const { width } = LOGICAL_SIZE;
    this.mapContainer = this.add.container(0, 0);

    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, MAP_VIEWPORT_TOP, width, MAP_VIEWPORT_BOTTOM - MAP_VIEWPORT_TOP);
    this.mapContainer.setMask(maskShape.createGeometryMask());

    // Dotted connector FIRST (so every node's own marker/label draws on
    // top of the line passing behind it, not the other way around).
    const positions = this.sagaStages.map((_, i) => this.nodePosition(i));
    const trailDots = this.add.graphics();
    trailDots.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < positions.length - 1; i += 1) {
      const a = positions[i];
      const b = positions[i + 1];
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      const steps = Math.max(1, Math.round(dist / DOT_TRAIL_STEP));
      for (let s = 1; s < steps; s += 1) {
        const t = s / steps;
        trailDots.fillCircle(Phaser.Math.Linear(a.x, b.x, t), Phaser.Math.Linear(a.y, b.y, t), 2);
      }
    }
    this.mapContainer.add(trailDots);
    this.nodePositions = positions; // reused by createTrippMarker/centerNodeLocalIndex/runTrippTo

    // The first unlocked-but-not-yet-cleared stage is "current" — the one
    // node that gets the bigger highlighted marker and an always-visible
    // name card, matching the reference's own single enlarged stage tile.
    const currentLocalIndex = this.sagaStages.findIndex((stage) => {
      const globalIndex = STAGE_CONFIG.indexOf(stage);
      const previousStage = STAGE_CONFIG[globalIndex - 1];
      const isUnlocked = globalIndex === 0 || progress[previousStage.id]?.cleared === true;
      return isUnlocked && progress[stage.id]?.cleared !== true;
    });
    this.currentLocalIndex = currentLocalIndex === -1 ? this.sagaStages.length - 1 : currentLocalIndex;

    this.sagaStages.forEach((stage, localIndex) => {
      const { x, y } = positions[localIndex];

      // Unlock state is resolved against STAGE_CONFIG's GLOBAL flat index,
      // not this screen's per-saga local index — this is what keeps a saga
      // boundary working as a plain continuation of the same sequential
      // chain (this saga's stage 1 unlocks only once the PREVIOUS saga's
      // final stage is cleared), with zero changes to the unlock logic
      // itself.
      const globalIndex = STAGE_CONFIG.indexOf(stage);
      const previousStage = STAGE_CONFIG[globalIndex - 1];
      const isUnlocked = globalIndex === 0 || progress[previousStage.id]?.cleared === true;
      const stageProgress = progress[stage.id];
      const isCleared = stageProgress?.cleared === true;
      const isCurrent = localIndex === this.currentLocalIndex;

      // Boss/chapter-final nodes (guide's ノードの状態 table) read as bigger
      // with a red ring regardless of their other states — the one node
      // shape that overrides the normal size/ring rules below.
      const isBoss = stage.difficulty === 'Boss';
      // User feedback: nodes/text were too small to read comfortably — was
      // 9/16 (non-current/current). Every badge/star/label below already
      // sizes itself off `radius`, so this one change scales the whole node.
      const baseRadius = isCurrent ? 26 : 16;
      const radius = isBoss ? Math.round(baseRadius * BOSS_NODE_SCALE) : baseRadius;

      const nodeObjects = [];
      const fill = !isUnlocked ? LOCKED_NODE_COLOR : DIFFICULTY_COLOR[stage.difficulty];
      const ringColor = isBoss ? BOSS_RING_COLOR : isCleared ? BC.gold : BC.ink;

      nodeObjects.push(this.add.circle(x, y + 3, radius, 0x000000, 0.3)); // drop shadow
      const dot = this.add.circle(x, y, radius, fill).setStrokeStyle(isCurrent ? 4 : 2.5, ringColor);
      nodeObjects.push(dot);
      if (isCleared) {
        nodeObjects.push(this.add.text(x, y, '★', { fontFamily: FONT, fontSize: `${radius}px`, color: '#fff7cc' }).setOrigin(0.5));
      }

      // Unreached node: a plain padlock silhouette instead of the star/
      // difficulty fill, so "not selectable yet" reads at a glance without
      // needing to tap it first.
      if (!isUnlocked) {
        // Scaled off radius (was a fixed size drawn for the old 9px base
        // radius alone) so it grows with the now-bigger node instead of
        // reading as a tiny fleck on it.
        const lockScale = radius / 9;
        const lock = this.add.graphics();
        lock.fillStyle(0x2a2a2a, 1);
        lock.fillRoundedRect(x - 5 * lockScale, y - 2 * lockScale, 10 * lockScale, 9 * lockScale, 1.5 * lockScale);
        lock.lineStyle(2 * lockScale, 0x2a2a2a, 1);
        lock.strokeCircle(x, y - 3 * lockScale, 4.5 * lockScale);
        nodeObjects.push(lock);
      }

      // Next-to-play node (guide: 45F-cycle blinking yellow border) — a
      // separate ring pulsing outward from the node, looping for as long as
      // this node stays "current." isCurrent already implies unlocked and
      // not yet cleared (see currentLocalIndex above), so this and the
      // padlock branch above are mutually exclusive.
      if (isCurrent) {
        const pulse = this.add.circle(x, y, radius, 0x000000, 0).setStrokeStyle(3, NEXT_NODE_PULSE_COLOR, 1);
        this.tweens.add({
          targets: pulse, radius: radius + 8, alpha: 0,
          duration: 900, repeat: -1, ease: 'Sine.easeOut',
        });
        nodeObjects.push(pulse);
      }

      // Treasure tier dot (bible §A.6.3) once a tier has actually been
      // obtained; otherwise, on a stage that's cleared but still has no
      // treasure at all, a small unlit chest hints one is still there for
      // the taking (guide's お宝未入手 badge) — the two never show together.
      const tier = getStageTier(stage.id);
      if (isUnlocked && tier > 0) {
        nodeObjects.push(
          this.add.circle(x + radius - 2, y - radius, 7, TREASURE_TIER_COLORS[tier]).setStrokeStyle(1.5, BC.ink),
        );
      } else if (isUnlocked && isCleared) {
        const chest = this.add.graphics();
        chest.fillStyle(0x8a5a2b, 1);
        chest.fillRoundedRect(x + radius - 8, y - radius - 5, 11, 8, 1.5);
        chest.lineStyle(1, 0x4a2f14, 1);
        chest.strokeRoundedRect(x + radius - 8, y - radius - 5, 11, 8, 1.5);
        nodeObjects.push(chest);
      }
      // Restriction Stage badge (bible §A.6.5) — small red "!" badge
      // above-left, mirroring the treasure dot. Full details show in the
      // deploy-confirmation popup (see showDeployPopup).
      if (isUnlocked && stage.restrictions) {
        nodeObjects.push(this.add.circle(x - radius + 2, y - radius, 7, BC.red).setStrokeStyle(1.5, 0xffffff));
        nodeObjects.push(this.add.text(x - radius + 2, y - radius, '!', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' }).setOrigin(0.5));
      }

      // Name label — alternates above/below the path per node so
      // consecutive close-together labels don't collide, same idea a real
      // hand-drawn map's own place-names use. Offsets grown alongside the
      // bigger radius/font above so labels keep clear of the node itself.
      const labelUp = this.isLabelAboveNode(localIndex);
      const labelY = isCurrent ? y - radius - 46 : y + (labelUp ? -radius - 16 : radius + 16);
      nodeObjects.push(
        this.add
          .text(x, labelY, `${localIndex + 1}. ${stage.displayName}`, {
            fontFamily: FONT, fontSize: isCurrent ? '16px' : '13px',
            color: isUnlocked ? '#ffffff' : '#aaaaaa',
            align: 'center',
            stroke: '#000000', strokeThickness: 3,
            wordWrap: { width: NODE_SPACING_X + 20 },
          })
          .setOrigin(0.5, labelUp || isCurrent ? 1 : 0),
      );

      // The current node gets an always-visible little callout card
      // (cost/best-score) — every other node relies on the deploy popup
      // for that detail, same as the reference's own single enlarged tile.
      if (isCurrent) {
        const statusLabel = isCleared ? `Best: ${stageProgress.bestScore}` : `Cost: ${stage.energyCost} Energy`;
        nodeObjects.push(
          this.add
            .text(x, y - radius - 26, statusLabel, { fontFamily: FONT, fontSize: '12px', color: '#ffe58a', stroke: '#000000', strokeThickness: 3 })
            .setOrigin(0.5, 1),
        );
      }

      if (isUnlocked) {
        const hit = this.add.circle(x, y, radius + 10, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          playUiTapSfx();
          this.onStageSelected(stage);
        });
        nodeObjects.push(hit);
      } else {
        // Guide's own spec: tapping a still-locked node plays a low "bu"
        // cue and otherwise does nothing — no popup, no vibration.
        const hit = this.add.circle(x, y, radius + 10, 0x000000, 0.001).setInteractive();
        hit.on('pointerdown', () => playLockedTapSfx());
        nodeObjects.push(hit);
      }

      this.mapContainer.add(nodeObjects);
    });

    // Leftmost/rightmost node positions, used by setupMapScroll to derive
    // how far the container can scroll in either direction.
    this.mapContentLeft = positions[0].x;
    this.mapContentRight = positions[positions.length - 1].x;
  }

  // Same radius math as the node-rendering loop above (isCurrent/isBoss ->
  // baseRadius -> BOSS_NODE_SCALE) — factored out here specifically for
  // getTrippClearance, since Tripp's own resting height needs to know it
  // too and duplicating the literal numbers would drift if one changed
  // without the other.
  getNodeRadius(localIndex) {
    const stage = this.sagaStages[localIndex];
    const isCurrent = localIndex === this.currentLocalIndex;
    const isBoss = stage.difficulty === 'Boss';
    const baseRadius = isCurrent ? 26 : 16;
    return isBoss ? Math.round(baseRadius * BOSS_NODE_SCALE) : baseRadius;
  }

  // Same labelUp alternation the node-rendering loop uses for its own name
  // label — factored out here too so getTrippClearance can stay in sync
  // with it, the same reasoning as getNodeRadius above. The current node
  // always shows its label above regardless of parity (see that loop).
  isLabelAboveNode(localIndex) {
    return localIndex === this.currentLocalIndex || localIndex % 2 === 0;
  }

  // How far above a node's CENTER Tripp should rest — see TRIPP_NODE_GAP's
  // own comment for why this has to account for the node's actual radius (a
  // boss node is much bigger), whether it's the current node (which stacks
  // extra text above it), and otherwise whether THIS node's own name label
  // lands above it too.
  getTrippClearance(localIndex) {
    const isCurrent = localIndex === this.currentLocalIndex;
    const extra = isCurrent
      ? TRIPP_CURRENT_NODE_EXTRA_CLEARANCE
      : this.isLabelAboveNode(localIndex)
        ? TRIPP_NON_CURRENT_LABEL_EXTRA_CLEARANCE
        : 0;
    return this.getNodeRadius(localIndex) + TRIPP_NODE_GAP + extra;
  }

  // Tripp (see TRIPP_* constants' header) starts parked on whichever node
  // the initial centerOnCurrentStage() scroll left in the viewport's
  // center — called after setupMapScroll runs that scroll, so this reads
  // its real final resting position rather than the pre-scroll default.
  createTrippMarker() {
    const tripp = this.add.image(0, 0, `unit_${TRIPP_UNIT_ID}_idle`, '__BASE');
    tripp.setScale(TRIPP_DISPLAY_SIZE / Math.max(tripp.width, tripp.height));
    this.tripp = tripp;
    this.mapContainer.add(tripp);

    this.trippTargetIndex = this.centerNodeLocalIndex();
    const { x, y } = this.nodePositions[this.trippTargetIndex];
    tripp.setPosition(x, y - this.getTrippClearance(this.trippTargetIndex));
    this.startTrippIdleBob();
  }

  // The local index of whichever node currently sits closest to the
  // viewport's horizontal center — recomputed continuously (see
  // updateTrippTarget), not tied to stage progress at all.
  centerNodeLocalIndex() {
    const { width } = LOGICAL_SIZE;
    const centerWorldX = -this.mapContainer.x + width / 2;
    let closestIndex = 0;
    let closestDist = Infinity;
    this.nodePositions.forEach((pos, i) => {
      const dist = Math.abs(pos.x - centerWorldX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    return closestIndex;
  }

  // Runs every frame (see update()): whenever scrolling changes which node
  // is centered, Tripp runs there — repeatedly, so scrolling back and
  // forth sends him running back and forth right along with it. Purely a
  // fun follow-the-viewport gimmick, not a progress indicator — his
  // resting spot means nothing about which stage is actually unlocked.
  updateTrippTarget() {
    if (!this.tripp) return;
    const centerIndex = this.centerNodeLocalIndex();
    if (centerIndex === this.trippTargetIndex) return;
    this.trippTargetIndex = centerIndex;
    this.runTrippTo(centerIndex);
  }

  startTrippIdleBob() {
    this.tweens.add({
      targets: this.tripp, y: `-=${TRIPP_IDLE_BOB_PX}`,
      duration: TRIPP_IDLE_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // Runs Tripp from wherever he currently is to `toLocalIndex`'s own node —
  // interrupts any run/idle-bob already in progress, swaps to the
  // run_0/run_1 cycle for the trip (same real art/cadence GameScene's own
  // battle units use — see its updateRunCycle), and faces the direction
  // he's actually travelling (the source art faces left by default, same
  // convention GameScene's own player-side sprites flip from).
  runTrippTo(toLocalIndex) {
    const to = this.nodePositions[toLocalIndex];
    const targetX = to.x;
    const targetY = to.y - this.getTrippClearance(toLocalIndex);

    this.tweens.killTweensOf(this.tripp);
    this.tripp.setFlipX(targetX > this.tripp.x);

    if (this.trippRunFrameEvent) this.trippRunFrameEvent.remove();
    this.tripp.setTexture(`unit_${TRIPP_UNIT_ID}_run_0`, '__BASE');
    let runFrame = 0;
    this.trippRunFrameEvent = this.time.addEvent({
      delay: TRIPP_RUN_FRAME_MS,
      loop: true,
      callback: () => {
        runFrame = runFrame === 0 ? 1 : 0;
        this.tripp.setTexture(`unit_${TRIPP_UNIT_ID}_run_${runFrame}`, '__BASE');
      },
    });

    const distance = Phaser.Math.Distance.Between(this.tripp.x, this.tripp.y, targetX, targetY);
    const duration = Math.max(TRIPP_RUN_DURATION_MIN_MS, (distance / TRIPP_RUN_SPEED_PX_PER_SEC) * 1000);

    this.tweens.add({
      targets: this.tripp,
      x: targetX, y: targetY,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.trippRunFrameEvent) {
          this.trippRunFrameEvent.remove();
          this.trippRunFrameEvent = null;
        }
        this.tripp.setTexture(`unit_${TRIPP_UNIT_ID}_idle`, '__BASE');
        playMapArrivalSfx();
        this.startTrippIdleBob();
      },
    });
  }

  // Auto-scroll (on load only) to center the current/next stage in the
  // viewport, so a returning player sees their actual progress immediately
  // instead of the saga's very first stage every time.
  centerOnCurrentStage() {
    const { width } = LOGICAL_SIZE;
    const { x } = this.nodePosition(this.currentLocalIndex);
    this.mapContainer.x = Phaser.Math.Clamp(width / 2 - x, this.mapScrollMin, this.mapScrollMax);
  }

  // Mouse-wheel + drag-to-scroll for the stage map (see createStageMap's
  // own header for why this exists — 48 real stages don't fit one screen).
  // Horizontal-only, matching the reference's own left/right map scroll —
  // unlike GameScene's zoom+pan battle camera, this is a single scrollable
  // path, not a 2D battlefield. A drag past either end gives a little
  // rubber-band while held (see applyRubberBand) and releasing it, or just
  // flicking mid-map, keeps coasting under its own momentum until
  // tickMapScroll's per-frame decay settles it — see that method and
  // update() for the actual physics tick.
  //
  // Bounds are symmetric around "either end node is centered" plus
  // MAP_EDGE_PADDING of genuine empty scrollable space beyond it — mapping
  // container.x = width/2 - worldX centers worldX, so the most this can
  // ever be is centering the FIRST node (mapScrollMax, a positive offset)
  // and the least is centering the LAST node (mapScrollMin, a large
  // negative offset), each pushed further out by the padding.
  setupMapScroll() {
    const { width } = LOGICAL_SIZE;
    this.mapScrollMax = width / 2 - this.mapContentLeft + MAP_EDGE_PADDING;
    this.mapScrollMin = width / 2 - this.mapContentRight - MAP_EDGE_PADDING;
    const clamp = (x) => Phaser.Math.Clamp(x, this.mapScrollMin, this.mapScrollMax);
    this.mapScrollClamp = clamp;
    this.mapScrollVelocity = 0;
    this.isDraggingMap = false;

    this.centerOnCurrentStage();

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.mapContainer.x = clamp(this.mapContainer.x - (deltaX || deltaY));
      this.mapScrollVelocity = 0; // a wheel nudge shouldn't also keep coasting afterward
    });

    // pointer.x/y are raw canvas-pixel coordinates, not world coordinates —
    // the two only coincided by accident back when every camera sat at
    // zoom 1. Now that this scene's camera is zoomed by RENDER_SCALE (see
    // create()), they need converting via the camera before comparing
    // against world-space values like MAP_VIEWPORT_TOP or mapContainer.x.
    let dragStartX = 0;
    let containerStartX = 0;
    this.input.on('pointerdown', (pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (world.y < MAP_VIEWPORT_TOP || world.y > MAP_VIEWPORT_BOTTOM) return;
      this.isDraggingMap = true;
      dragStartX = world.x;
      containerStartX = this.mapContainer.x;
      this.mapScrollVelocity = 0;
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.isDraggingMap || !pointer.isDown) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const next = this.applyRubberBand(containerStartX + (world.x - dragStartX));
      this.mapScrollVelocity = next - this.mapContainer.x; // px/frame, decayed by tickMapScroll after release
      this.mapContainer.x = next;
    });
    const endDrag = () => { this.isDraggingMap = false; };
    this.input.on('pointerup', endDrag);
    this.input.on('pointerupoutside', endDrag);
  }

  // Compresses how far a drag can actually push the map past either end,
  // rather than hard-clamping it — see SCROLL constants' own header.
  applyRubberBand(x) {
    const min = this.mapScrollMin;
    const max = this.mapScrollMax;
    if (x > max) return max + (x - max) * RUBBER_BAND_FACTOR;
    if (x < min) return min + (x - min) * RUBBER_BAND_FACTOR;
    return x;
  }

  // Runs every frame (see update()): while dragging, does nothing (the
  // pointermove handler above already owns mapContainer.x); once released,
  // either eases an over-dragged position back to the real bound, or lets
  // any remaining fling velocity keep coasting, decaying it a fixed % per
  // frame until it's slow enough to just stop.
  tickMapScroll() {
    if (!this.mapContainer || this.isDraggingMap) return;

    const min = this.mapScrollMin;
    const max = this.mapScrollMax;
    const x = this.mapContainer.x;
    if (x < min || x > max) {
      this.mapContainer.x = Phaser.Math.Linear(x, Phaser.Math.Clamp(x, min, max), RUBBER_BAND_SNAP_LERP);
      this.mapScrollVelocity = 0;
      return;
    }

    if (Math.abs(this.mapScrollVelocity) > SCROLL_INERTIA_MIN_VELOCITY) {
      this.mapContainer.x = this.mapScrollClamp(this.mapContainer.x + this.mapScrollVelocity);
      this.mapScrollVelocity *= SCROLL_INERTIA_DECAY;
    } else {
      this.mapScrollVelocity = 0;
    }
  }

  // Left/right arrow buttons at the map viewport's own edges (reference:
  // big triangular arrows flanking the map) — a discoverable alternative
  // to drag-scrolling, one "page" (a handful of stages) per tap.
  createMapArrows() {
    const { width } = LOGICAL_SIZE;
    const y = MAP_CENTER_Y;
    const pageStep = NODE_SPACING_X * 3;

    createBcCircleButton(this, 16, y, 20, '◀', () => {
      this.mapScrollVelocity = 0;
      this.mapContainer.x = this.mapScrollClamp(this.mapContainer.x + pageStep);
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb });
    createBcCircleButton(this, width - 16, y, 20, '▶', () => {
      this.mapScrollVelocity = 0;
      this.mapContainer.x = this.mapScrollClamp(this.mapContainer.x - pageStep);
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb });
  }

  // Deploy-confirmation popup (guide Chapter 06's 出撃確認ポップアップ) — every
  // stage tap opens this now, not just Restriction Stages: it shows the
  // stage name/difficulty, the Energy cost, any restrictions, and the
  // real game's own two-button choice ("とじる"/Close vs "いざ出陣!!"/Deploy!).
  // Previously only Restriction Stages got a popup at all; a normal stage
  // skipped straight into battle with no confirmation step.
  onStageSelected(stage) {
    // Guard against re-opening the popup (or worse, stacking a second
    // enterStage) while a previous Deploy!! is already mid-fade-out below —
    // a node tap during that ~267ms window used to be able to fire a
    // second fadeOut + a second queued 'camerafadeoutcomplete' listener,
    // so BOTH eventually called scene.start('GameScene', ...) back to back
    // (once for each stage), which Phaser's scene manager doesn't expect
    // and could leave the transition stuck rather than actually entering
    // either stage.
    if (this.isLeavingScene) return;
    this.showDeployPopup(stage);
  }

  enterStage(stage) {
    if (this.isLeavingScene) return;
    if (!trySpendEnergy(stage.energyCost)) {
      this.showInsufficientEnergyMessage();
      return;
    }
    this.isLeavingScene = true;

    // 戦闘開始！！ transition (guide Chapter 10's own transition table, the
    // one confirmed real value in that row): fade to black over 8F
    // (≈267ms @30fps), THEN load the battle scene — replaces the old
    // instant hard cut straight into GameScene. GameScene.js's own create()
    // handles the matching fade back in (and the "settled before input"
    // half of the same guide row) on the other side of this transition.
    this.cameras.main.fadeOut(267, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { stageId: stage.id });
    });
  }

  formatRestrictionLines(restrictions) {
    const lines = [];
    if (restrictions.maxDeployed) {
      lines.push(`Max ${restrictions.maxDeployed} units deployed at once`);
    }
    if (restrictions.bannedUnitTypes) {
      const names = restrictions.bannedUnitTypes.map((key) => UNIT_CONFIG[key]?.displayName || key);
      lines.push(`Banned: ${names.join(', ')}`);
    }
    if (restrictions.costRange) {
      lines.push(`Units must cost ${restrictions.costRange.min}-${restrictions.costRange.max}円`);
    }
    return lines;
  }

  showDeployPopup(stage) {
    if (this.deployPopupObjects) return;

    const { width, height } = LOGICAL_SIZE;
    const objects = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setInteractive();
    objects.push(overlay);

    const panelWidth = 340;
    const panelHeight = stage.restrictions ? 230 : 190;
    const panelY = height / 2;
    objects.push(drawBcPanel(this, width / 2, panelY, panelWidth, panelHeight));

    objects.push(
      this.add
        .text(width / 2, panelY - panelHeight / 2 + 26, stage.displayName, { fontFamily: FONT, fontSize: '18px', color: BC.inkHex })
        .setOrigin(0.5),
    );
    objects.push(
      this.add
        .text(width / 2, panelY - panelHeight / 2 + 52, `${stage.difficulty}  ·  Cost: ${stage.energyCost} Energy`, {
          fontFamily: FONT, fontSize: '12px', color: '#7a5c1e',
        })
        .setOrigin(0.5),
    );

    if (stage.restrictions) {
      const lines = ['Restriction Stage:', ...this.formatRestrictionLines(stage.restrictions)];
      objects.push(
        this.add
          .text(width / 2, panelY - 20, lines.join('\n'), { fontFamily: FONT, fontSize: '11px', color: BC.inkHex, align: 'center', lineSpacing: 6 })
          .setOrigin(0.5),
      );
    }

    const buttonY = panelY + panelHeight / 2 - 40;
    objects.push(
      createBcButton(this, width / 2 - 84, buttonY, 130, 48, 'Close', () => this.hideDeployPopup(), {
        fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 14,
      }),
    );
    objects.push(
      createBcButton(this, width / 2 + 84, buttonY, 130, 48, 'Deploy!!', () => {
        this.hideDeployPopup();
        this.enterStage(stage);
      }, { fontSize: 14 }),
    );

    this.deployPopupObjects = objects;
  }

  hideDeployPopup() {
    if (!this.deployPopupObjects) return;
    this.deployPopupObjects.forEach((obj) => obj.destroy());
    this.deployPopupObjects = null;
  }

  showInsufficientEnergyMessage() {
    if (this.insufficientEnergyText) this.insufficientEnergyText.destroy();

    const { width, height } = LOGICAL_SIZE;
    const text = this.add
      .text(width / 2, height - 20, 'Not enough Energy!', {
        fontFamily: FONT, fontSize: '14px',
        color: '#ff6666',
        stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.insufficientEnergyText = text;

    this.time.delayedCall(INSUFFICIENT_ENERGY_MESSAGE_MS, () => {
      // Compare against the specific instance THIS call created, not just
      // "is there currently a message showing" — tapping a second locked
      // stage within this delay replaces this.insufficientEnergyText with
      // a newer Text before this timer fires; without this check, this
      // timer would destroy that newer message and null the property out
      // from under its own (still-pending) delayedCall.
      if (this.insufficientEnergyText === text) {
        text.destroy();
        this.insufficientEnergyText = null;
      }
    });
  }
}
