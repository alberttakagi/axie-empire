import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, drawBcPanel } from './UITheme.js';
import { playCoinSfx } from './Audio.js';
import { rewardLabel } from './Economy.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';
import { CLASS_STYLE, addClassBadge, classOfUnit } from './AXIE_CLASSES.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadLoadout } from './Loadout.js';
import { loadDojoBestScore } from './DojoProgress.js';
import {
  getWeeklyState, claimWeeklyTier, featuredEnemyRoles, counterClasses, CHALLENGE_BONUS, weekKey,
} from './WeeklyChallenge.js';
import { leaderboardAvailable, fetchDojoLeaderboard, cloudSync } from './Account.js';

// Sparring Grounds lobby: this week's featured Chimera class, which of your
// classes counter it (+challenge bonus), weekly reward tiers, your best runs
// and — with accounts on — the global weekly leaderboard. "Start" launches
// the same timed endless battle as before (GameScene mode 'dojo').
export default class DojoScene extends Phaser.Scene {
  constructor() {
    super('DojoScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    const { width, height } = LOGICAL_SIZE;
    addBackground(this, 'gauntletArena');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    createTitlePill(this, 24, 22, 'Sparring Grounds');
    createBackButton(this, () => this.scene.start('HomeScene'));
    this.content = this.add.container(0, 0);
    this.toast = this.add.text(width / 2, height - 18, '', { fontFamily: FONT, fontSize: '12px', color: '#ffdd33', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    createBcButton(this, width - 120, height - 52, 180, 44, 'Start! (3 min)', () => this.scene.start('GameScene', { mode: 'dojo' }), { fontSize: 15 });
    this.render();
    this.loadBoard();
  }

  add2(o) {
    this.content.add(o);
    return o;
  }

  render() {
    this.content.removeAll(true);
    const { width } = LOGICAL_SIZE;
    const st = getWeeklyState();
    const cls = st.featured;
    const style = CLASS_STYLE[cls];

    // Featured class panel
    this.add2(drawBcPanel(this, 205, 150, 360, 170, { fill: 0x2a1f3d }));
    this.add2(this.add.text(40, 78, `THIS WEEK (${st.week})`, { fontFamily: FONT, fontSize: '11px', color: '#cdb8ff' }));
    this.add2(addClassBadge(this, 58, 112, cls, 16));
    this.add2(this.add.text(84, 100, `${style.label} Chimeras invade!`, { fontFamily: FONT, fontSize: '17px', color: style.hex, stroke: '#000000', strokeThickness: 3 }));
    const names = featuredEnemyRoles(cls).map((id) => ENEMY_CONFIG[id].characterName || id);
    this.add2(this.add.text(40, 132, `Expect: ${names.join(', ')}`, { fontFamily: FONT, fontSize: '10px', color: '#ffffff', wordWrap: { width: 330 } }));
    const counters = counterClasses(cls);
    this.add2(this.add.text(40, 166, `Bring ${counters.map((c) => CLASS_STYLE[c].label).join(' / ')} Axies: +15% class edge and +${Math.round(CHALLENGE_BONUS * 100)}% challenge bonus`, {
      fontFamily: FONT, fontSize: '10px', color: '#7dff9a', wordWrap: { width: 330 },
    }));
    const formation = loadLoadout().filter((k) => k && UNIT_CONFIG[k]);
    const yours = formation.filter((k) => counters.includes(classOfUnit(UNIT_CONFIG[k])));
    this.add2(this.add.text(40, 200, yours.length ? `In your Formation: ${yours.map((k) => UNIT_CONFIG[k].characterName).join(', ')}` : 'None in your Formation yet — swap some in!', {
      fontFamily: FONT, fontSize: '10px', color: yours.length ? '#ffd27f' : '#ff9a8a', wordWrap: { width: 330 },
    }));

    // Weekly tiers
    this.add2(drawBcPanel(this, 205, 320, 360, 140));
    this.add2(this.add.text(40, 260, `Weekly rewards — best this week: ${st.best}`, { fontFamily: FONT, fontSize: '12px', color: BC.inkHex }));
    st.tiers.forEach((t, i) => {
      const y = 292 + i * 30;
      const label = `${t.label}  ${t.score}+  →  ${rewardLabel(t.reward)}${t.bonus ? ` + ${rewardLabel(t.bonus)}` : ''}`;
      this.add2(this.add.text(44, y, label, { fontFamily: FONT, fontSize: '11px', color: t.reached ? BC.inkHex : '#9a8c74' }).setOrigin(0, 0.5));
      if (t.claimed) {
        this.add2(this.add.text(330, y, 'Claimed ✓', { fontFamily: FONT, fontSize: '11px', color: '#3a8a4a' }).setOrigin(0.5));
      } else if (t.reached) {
        this.add2(createBcButton(this, 330, y, 76, 24, 'Claim', () => {
          if (claimWeeklyTier(t.id)) {
            playCoinSfx();
            this.say(`+${rewardLabel(t.reward)}${t.bonus ? ` + ${rewardLabel(t.bonus)}` : ''}`);
          }
          this.render();
          this.renderBoard();
        }, { fontSize: 11 }));
      }
    });

    // Board panel (filled by renderBoard)
    this.add2(drawBcPanel(this, 590, 220, 330, 310, { fill: 0x1b1330 }));
    this.add2(this.add.text(440, 78, 'Leaderboard', { fontFamily: FONT, fontSize: '14px', color: '#ffd27f' }));
    this.boardText = this.add2(this.add.text(440, 104, '', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', lineSpacing: 6, wordWrap: { width: 300 } }));
    this.renderBoard();
  }

  renderBoard() {
    if (!this.boardText?.active) return;
    const st = getWeeklyState();
    const lines = [];
    if (this.board?.length) {
      lines.push('Global — this week');
      this.board.forEach((r, i) => {
        const me = cloudSync.user && r.user_id === cloudSync.user.id;
        lines.push(`${String(i + 1).padStart(2, ' ')}. ${r.name}${me ? ' (you)' : ''} — ${r.score}`);
      });
      lines.push('');
    } else if (!leaderboardAvailable) {
      lines.push('Global board: coming with accounts.', '');
    } else if (!cloudSync.user) {
      lines.push('Sign in (Menu → Account & Save) to post your score to the global board.', '');
    } else if (this.boardError) {
      lines.push(this.boardError, '');
    }
    lines.push('Your best runs this week');
    if (!st.runs.length) lines.push('— none yet —');
    st.runs.forEach((r, i) => lines.push(`${i + 1}. ${r.score}`));
    lines.push('', `All-time best: ${loadDojoBestScore()}`);
    this.boardText.setText(lines.join('\n'));
  }

  async loadBoard() {
    if (!leaderboardAvailable) return;
    try {
      this.board = await fetchDojoLeaderboard(weekKey());
    } catch (e) {
      this.boardError = e.message;
    }
    if (this.sys.isActive()) this.renderBoard();
  }

  say(text) {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 2200, duration: 500 });
  }
}
