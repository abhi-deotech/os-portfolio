/**
 * The terminal's neofetch text, from a facts snapshot.
 *
 * Kept out of facts.js because only the lazy Terminal (and scripts/facts-check.mjs) needs it, while
 * facts.js is reached at first paint.
 *
 * PURE: no React, no store, no `import.meta.env`. Plain Node imports this, so relative imports carry
 * explicit `.js` extensions and reach only other pure modules.
 */
import { fmt, unavailableText } from './facts.js';

const lower = (s) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
const keepCase = (s) => (/^[A-Z]{2}/.test(s) ? s : lower(s));

/**
 * The terminal's neofetch, from a snapshot. An unavailable line reads "label: not exposed by {Browser}"
 * and carries no digits.
 *
 * @param {object} snap  getSnapshot()
 * @param {{ browser, openWindows, uptimeMs, network }} ctx
 */
export function renderNeofetch(snap, ctx = {}) {
  const browser = ctx.browser ?? { name: 'this browser', version: '', engine: 'unknown' };
  const line = (label, fact) => `${label}: ${fact?.source === 'reported' ? fact.text : keepCase(unavailableText(fact, browser.name))}`;
  const count = Array.isArray(ctx.openWindows) ? ctx.openWindows.length : 0;
  const uptime = fmt.duration(ctx.uptimeMs);
  return [
    `guest@lumina`,
    `------------`,
    `OS: Lumina Desktop 1.0.0 (runs in the browser)`,
    line('Host OS', snap.os),
    `Browser: ${`${browser.name} ${browser.version}`.trim()} (${browser.engine})`,
    `Uptime: ${uptime ? `${uptime} (this session)` : 'this session'}`,
    line('Resolution', snap.display),
    line('CPU', snap.cores),
    line('CPU pressure', snap.pressure),
    line('Memory (JS heap)', snap.jsHeap),
    line('Device memory', snap.deviceMemory),
    line('GPU', snap.gpu),
    line('Storage', snap.storage),
    line('Battery', snap.battery),
    `Network: ${fmt.networkText(ctx.network)}`,
    line('Locale', snap.locale),
    `Windows: ${count} open`,
  ].join('\n');
}
