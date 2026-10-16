// Lightweight playtest log: what testers actually do, kept with the save
// (so it follows the account once CloudSync has a real backend) and
// summarized in-game by the Playtest Report (Menu → Account & Save).
// No personal data, no network calls — just gameplay events.
import { getLedgerSummary, todayKey } from './Economy.js';

const LOG_KEY = 'axieEmpirePlaytestLog';
const MAX_EVENTS = 1500;

function load() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch {
    return [];
  }
}

export function logEvent(type, data = {}) {
  const log = load();
  log.push({ t: Date.now(), type, ...data });
  if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // Storage full — the playtest log is the first thing we let go of.
  }
}

export function getPlaytestLog() {
  return load();
}

export function clearPlaytestLog() {
  try {
    localStorage.setItem(LOG_KEY, '[]');
  } catch {
    // ignore
  }
}

export function logSessionStart() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  logEvent('session', { mobile, w: window.innerWidth, h: window.innerHeight });
}

// ---- Summary ----
export function summarize(log = load()) {
  const s = {
    sessions: 0, mobileSessions: 0, dojoRuns: 0, battles: 0, wins: 0, losses: 0, quits: 0,
    battleSeconds: 0, byStage: {}, gachaPulls: 0, newAxies: 0, marketBuys: {}, labSaves: 0,
    screens: {}, firstAt: log[0]?.t || null, lastAt: log[log.length - 1]?.t || null, tipsSeen: 0,
  };
  for (const e of log) {
    switch (e.type) {
      case 'session': s.sessions += 1; if (e.mobile) s.mobileSessions += 1; break;
      case 'battle_end': {
        if (e.result === 'dojo') { s.dojoRuns += 1; break; }
        s.battles += 1;
        if (e.result === 'win') s.wins += 1;
        else if (e.result === 'loss') s.losses += 1;
        else s.quits += 1;
        s.battleSeconds += e.seconds || 0;
        const st = (s.byStage[e.stage] ||= { name: e.name, win: 0, loss: 0, quit: 0 });
        st[e.result === 'win' ? 'win' : e.result === 'loss' ? 'loss' : 'quit'] += 1;
        break;
      }
      case 'gacha': s.gachaPulls += e.count || 0; s.newAxies += e.newAxies || 0; break;
      case 'market': s.marketBuys[e.offer] = (s.marketBuys[e.offer] || 0) + 1; break;
      case 'lab_save': s.labSaves += 1; break;
      case 'screen': s.screens[e.scene] = (s.screens[e.scene] || 0) + 1; break;
      case 'tip': s.tipsSeen += 1; break;
      default: break;
    }
  }
  s.hardest = Object.entries(s.byStage)
    .map(([id, v]) => ({ id, ...v, fails: v.loss + v.quit }))
    .filter((v) => v.fails > 0)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 5);
  return s;
}

export function reportText() {
  const s = summarize();
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  const today = getLedgerSummary(todayKey());
  const lines = [
    `Axie Empire playtest report (${new Date().toLocaleString()})`,
    `Sessions: ${s.sessions} (${s.mobileSessions} on mobile)`,
    `Battles: ${s.battles} — wins ${s.wins} (${pct(s.wins, s.battles)}), losses ${s.losses}, quits ${s.quits}`,
    `Sparring Grounds runs: ${s.dojoRuns}`,
    `Avg battle: ${s.battles ? Math.round(s.battleSeconds / s.battles) : 0}s`,
    `Hardest stages: ${s.hardest.map((h) => `${h.name || h.id} (${h.fails} fails, ${h.win} wins)`).join('; ') || 'none yet'}`,
    `Gacha: ${s.gachaPulls} pulls, ${s.newAxies} new Axies`,
    `Market buys: ${Object.entries(s.marketBuys).map(([k, v]) => `${k}×${v}`).join(', ') || 'none'}`,
    `Axie Lab designs saved: ${s.labSaves}`,
    `Gems today: +${today.earned} / −${today.spent} (${Object.entries(today.bySource).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ') || 'no activity'})`,
    `Most visited: ${Object.entries(s.screens).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k.replace('Scene', '')} ${v}`).join(', ')}`,
  ];
  return lines.join('\n');
}
