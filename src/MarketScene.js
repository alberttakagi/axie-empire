import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState, getMaxEnergy } from './Energy.js';
import { playCoinSfx } from './Audio.js';
import { logEvent } from './Playtest.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';
import {
  LOGIN_CALENDAR, DAILY_ALL_BONUS, MARKET_OFFERS,
  getDailyStatus, claimLoginReward, claimDailyMission, claimDailyBonus,
  getDailyDeal, buyOffer, rewardLabel, getLedgerSummary,
} from './Economy.js';

// Lunacia Market: the Round 2 mock-economy hub. Two tabs —
//   Daily:  7-day login calendar + today's missions (+ all-clear bonus)
//   Market: Gem exchanges for Energy, XP, materials and battle items, plus
//           a half-price Daily Deal.
// The footer shows today's Gem ledger (earned / spent) so playtesters and
// judges can see the economy moving. Logic lives in Economy.js.
const BUY_FAIL_TEXT = {
  gems: 'Not enough Gems — clear new stages or finish daily missions!',
  'energy-full': 'Energy is already full.',
  'sold-out': "Today's deal is sold out — come back tomorrow!",
};

export default class MarketScene extends Phaser.Scene {
  constructor() {
    super('MarketScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create(data = {}) {
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    const { width, height } = LOGICAL_SIZE;
    addBackground(this, 'metamorph');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
    createTitlePill(this, 24, 22, 'Lunacia Market');
    createBackButton(this, () => this.scene.start('HomeScene'));

    this.tab = data.tab || 'daily';
    this.tabButtons = [
      createBcButton(this, width / 2 - 70, 40, 120, 34, 'Daily', () => this.switchTab('daily'), { fontSize: 13 }),
      createBcButton(this, width / 2 + 70, 40, 120, 34, 'Market', () => this.switchTab('market'), { fontSize: 13 }),
    ];
    this.content = this.add.container(0, 0);
    this.toast = this.add.text(width / 2, height - 20, '', {
      fontFamily: FONT, fontSize: '12px', color: '#ffdd33', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.render();
  }

  switchTab(tab) {
    this.tab = tab;
    this.render();
  }

  say(text) {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 2200, duration: 500 });
  }

  render() {
    this.content.removeAll(true);
    this.tabButtons.forEach((b, i) => b.setAlpha((i === 0) === (this.tab === 'daily') ? 1 : 0.55));
    const progress = loadPlayerProgress();
    if (this.gemsBadge) this.gemsBadge.destroy();
    this.gemsBadge = createResourceBadge(this, LOGICAL_SIZE.width - 24, 26, 'GEM', progress.gems, { valueColor: '#ffd27f' });
    if (this.tab === 'daily') this.renderDaily();
    else this.renderMarket();
    const ledger = getLedgerSummary();
    const energy = getEnergyState().current;
    this.content.add(this.add.text(LOGICAL_SIZE.width - 30, LOGICAL_SIZE.height - 42,
      `Today: +${ledger.earned} / −${ledger.spent} Gems   ·   Energy ${energy}/${getMaxEnergy()}`, {
        fontFamily: FONT, fontSize: '10px', color: '#e8dcff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(1, 0.5));
  }

  add2(obj) {
    this.content.add(obj);
    return obj;
  }

  renderDaily() {
    const { width } = LOGICAL_SIZE;
    const s = getDailyStatus();

    // Login calendar
    this.add2(drawBcPanel(this, width / 2, 118, width - 70, 98, { fill: 0x2a1f3d }));
    this.add2(this.add.text(60, 78, `Daily Login — Day ${s.streak} of 7`, { fontFamily: FONT, fontSize: '13px', color: '#ffd27f' }));
    this.add2(this.add.text(width - 60, 78, 'Miss a day and the streak restarts', { fontFamily: FONT, fontSize: '9px', color: '#a996d6' }).setOrigin(1, 0));
    LOGIN_CALENDAR.forEach((reward, i) => {
      const x = 92 + i * 102;
      const day = i + 1;
      const past = day < s.streak || (day === s.streak && s.loginClaimed);
      const today = day === s.streak && !s.loginClaimed;
      const box = this.add2(this.add.rectangle(x, 128, 88, 54, today ? BC.gold : past ? 0x4a3d66 : 0x3a2d55).setStrokeStyle(2, today ? 0xffffff : 0x6a55a0));
      this.add2(this.add.text(x, 110, `Day ${day}`, { fontFamily: FONT, fontSize: '9px', color: today ? BC.goldInk : '#cdb8ff' }).setOrigin(0.5));
      this.add2(this.add.text(x, 132, rewardLabel(reward), { fontFamily: FONT, fontSize: '10px', color: today ? BC.goldInk : '#ffffff', align: 'center', wordWrap: { width: 80 } }).setOrigin(0.5));
      if (past) this.add2(this.add.text(x + 32, 108, '✓', { fontFamily: FONT, fontSize: '13px', color: '#7dff9a', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5));
      if (today) {
        this.tweens.add({ targets: box, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
        box.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          const r = claimLoginReward();
          if (r) {
            playCoinSfx();
            this.say(`Claimed ${rewardLabel(r)}!`);
          }
          this.render();
        });
      }
    });

    // Daily missions
    this.add2(drawBcPanel(this, width / 2, 270, width - 70, 176));
    this.add2(this.add.text(60, 190, "Today's Missions", { fontFamily: FONT, fontSize: '13px', color: BC.inkHex }));
    this.add2(this.add.text(width - 60, 190, `Clear all: +${rewardLabel(DAILY_ALL_BONUS)}`, { fontFamily: FONT, fontSize: '10px', color: '#7a5c1e' }).setOrigin(1, 0));
    s.missions.forEach((m, i) => {
      const y = 222 + i * 32;
      this.add2(this.add.text(64, y, m.text, { fontFamily: FONT, fontSize: '12px', color: BC.inkHex }).setOrigin(0, 0.5));
      const barX = 300;
      this.add2(this.add.rectangle(barX, y, 180, 12, 0xd9ccaa).setOrigin(0, 0.5));
      this.add2(this.add.rectangle(barX, y, (180 * m.progress) / m.target, 12, m.done ? 0x5ccf6a : 0x5ec1e8).setOrigin(0, 0.5));
      this.add2(this.add.text(barX + 90, y, `${m.progress}/${m.target}`, { fontFamily: FONT, fontSize: '9px', color: BC.inkHex }).setOrigin(0.5));
      this.add2(this.add.text(500, y, rewardLabel(m.reward), { fontFamily: FONT, fontSize: '11px', color: '#7a5c1e' }).setOrigin(0, 0.5));
      if (m.claimed) {
        this.add2(this.add.text(680, y, 'Claimed ✓', { fontFamily: FONT, fontSize: '11px', color: '#3a8a4a' }).setOrigin(0.5));
      } else {
        const btn = createBcButton(this, 680, y, 84, 26, m.done ? 'Claim' : 'In progress', () => {
          const r = claimDailyMission(m.id);
          if (r) {
            playCoinSfx();
            this.say(`+${rewardLabel(r)}`);
          }
          this.render();
        }, { fontSize: 10, ...(m.done ? {} : { fill: 0xcfc6ae, highlight: 0xe6dfc9 }) });
        if (!m.done) btn.setAlpha(0.6);
        this.add2(btn);
      }
    });
    if (s.bonusReady) {
      this.add2(createBcButton(this, width / 2, 350, 220, 30, `All done! Claim +${rewardLabel(DAILY_ALL_BONUS)}`, () => {
        if (claimDailyBonus()) playCoinSfx();
        this.render();
      }, { fontSize: 11 }));
    }
  }

  renderMarket() {
    const { width } = LOGICAL_SIZE;
    const deal = getDailyDeal();
    // Daily Deal banner
    this.add2(drawBcPanel(this, width / 2, 98, width - 70, 58, { fill: 0x2a1f3d }));
    this.add2(this.add.text(60, 86, "TODAY'S DEAL  −50%", { fontFamily: FONT, fontSize: '12px', color: '#ff8a65' }));
    this.add2(this.add.text(60, 104, `${deal.name} — ${deal.desc}`, { fontFamily: FONT, fontSize: '12px', color: '#ffffff' }));
    this.add2(createBcButton(this, width - 120, 98, 140, 36, deal.bought ? 'Sold out' : `${deal.price} Gems`, () => this.buy(deal.id, true), { fontSize: 12, fill: deal.bought ? 0x8a8a8a : BC.gold, textColor: BC.goldInk }));

    // Offer grid: 4 × 2
    MARKET_OFFERS.forEach((o, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 120 + col * 186;
      const y = 196 + row * 108;
      this.add2(drawBcPanel(this, x, y, 170, 96, { radius: 14 }));
      this.add2(this.add.text(x, y - 32, o.name, { fontFamily: FONT, fontSize: '13px', color: BC.inkHex }).setOrigin(0.5));
      this.add2(this.add.text(x, y - 12, o.desc, { fontFamily: FONT, fontSize: '10px', color: '#5a5a5a' }).setOrigin(0.5));
      this.add2(createBcButton(this, x, y + 22, 120, 32, `${o.price} Gems`, () => this.buy(o.id), { fontSize: 12 }));
    });
  }

  buy(id, deal = false) {
    const result = buyOffer(id, { deal });
    if (result.ok) {
      logEvent('market', { offer: result.offer.id, deal });
      playCoinSfx();
      this.say(`Bought ${result.offer.name}!`);
    } else {
      this.say(BUY_FAIL_TEXT[result.reason] || 'Could not buy that.');
    }
    this.render();
  }
}
