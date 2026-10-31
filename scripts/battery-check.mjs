#!/usr/bin/env node
/**
 * battery-check — the Battery widgets' logic (src/wallpaper/battery.js), against the charging rules in
 * ~/Projects/battery-optimization/README.md:
 *
 *   1. parseBattery on good, partial and hostile relay answers,
 *   2. batteryView at every band edge, on the adapter and on battery, plus heat and a broken cap,
 *   3. healthView: capacity, wear pace and the routine that is due,
 *   4. powerChecklist from `pmset -g custom` values.
 *
 *   npm run battery:check
 */
import { parseBattery, batteryView, healthView, powerChecklist, minutesText, tempText, DEFAULT_LIMITS } from '../src/wallpaper/battery.js';

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};

// The relay's real answer on 2026-10-31 (battery-guard --print), trimmed of nothing.
const REAL = {
  v: 1, at: '2026-10-31T06:40:41Z', pct: 70, ac: false, charging: false, full: false, minutes: 299, tempC: 31.6,
  thermal: 'nominal', cycles: 187, cyclesRated: 1000, nominalMah: 5256, fullMah: 5106, designMah: 5596, notChargingReason: 128,
  power: { ac: { lowpowermode: 1, powernap: 1 }, battery: { lowpowermode: 1, powernap: 1 } },
  limits: { cap: 80, capAlert: 82, floor: 20, hotC: 40, recharge: [30, 40] },
  routine: { below40: null, near20: null, since: null }, alerts: [], history: [],
};
const at = (patch) => parseBattery({ ...REAL, ...patch });
const view = (patch, unit) => { const v = batteryView(at(patch), unit); return [v.tone, v.line, v.sub]; };

/* ── 1. Parsing ─────────────────────────────────────────────────────────────── */

eq('real answer parses', at({}).pct, 70);
eq('limits kept', at({}).limits, { floor: 20, cap: 80, capAlert: 82, recharge: [30, 40], hotC: 40 });
eq('no answer / wrong version / no level', [parseBattery(null), parseBattery({ ...REAL, v: 2 }), parseBattery({ ...REAL, pct: undefined })], [null, null, null]);
eq('level out of range or fractional', [at({ pct: 101 }), at({ pct: -1 }), at({ pct: 50.5 }), at({ pct: '70' })], [null, null, null, null]);
eq('power state must be boolean', [at({ ac: 'yes' }), at({ charging: 1 })], [null, null]);
eq('optional fields fall back to null', (({ minutes, tempC, cycles, nominalMah }) => [minutes, tempC, cycles, nominalMah])(at({ minutes: -1, tempC: 'hot', cycles: 1e9, nominalMah: 0 })), [null, null, null, null]);
eq('missing limits → README defaults', at({ limits: undefined }).limits, DEFAULT_LIMITS);
eq('nonsense limits → defaults', at({ limits: { floor: 90, cap: 5, recharge: ['a'], hotC: 900 } }).limits, DEFAULT_LIMITS);
eq('capAlert below cap is repaired', at({ limits: { ...REAL.limits, capAlert: 70 } }).limits.capAlert, 82);
eq('routine dates checked', at({ routine: { below40: '2026-10-24', near20: 'yesterday', since: '<script>' } }).routine, { below40: '2026-10-24', near20: null, since: null });
eq('history rows checked and capped at 24', at({ history: [...Array(30)].map((_, i) => ({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, cycles: i, nominalMah: 5000, designMah: 5596 })).concat([{ date: 'x', cycles: 1, nominalMah: 1, designMah: 1 }]) }).history.length, 24);
eq('power flags only 0/1', at({ power: { battery: { powernap: 7, lowpowermode: 1 }, ac: 'x' } }).power, { battery: { powernap: null, lowpowermode: 1 }, ac: { powernap: null, lowpowermode: null } });

/* ── 2. The charging band ───────────────────────────────────────────────────── */

// On the adapter: holding from cap − 3, a broken cap at capAlert, charging below.
eq('adapter 81%, not charging', view({ ac: true, pct: 81 }), ['normal', 'Holding at 80%', 'On adapter']);
eq('adapter 80%, not charging', view({ ac: true, pct: 80 }), ['normal', 'Holding at 80%', 'On adapter']);
eq('adapter 79%, not charging', view({ ac: true, pct: 79 }), ['normal', 'Holding at 80%', 'On adapter']);
eq('adapter 76%, not charging', view({ ac: true, pct: 76 }), ['normal', 'Not charging', 'On adapter']);
eq('adapter 60%, charging', view({ ac: true, charging: true, pct: 60, minutes: 65 }), ['normal', 'Charging to 80%', '1 h 5 m to go']);
eq('adapter 81%, charging (below alert)', view({ ac: true, charging: true, pct: 81, minutes: null }), ['normal', 'Charging to 80%', 'Charging']);
eq('adapter 82%, charging: cap broken', view({ ac: true, charging: true, pct: 82 }), ['alert', 'Above 80% cap', 'Check Charge Limit']);
eq('adapter 100%, cap 100, full', view({ ac: true, pct: 100, full: true, limits: { ...REAL.limits, cap: 100, capAlert: 100 } }), ['normal', 'Charged', 'On adapter']);

// On battery: over 40 fine, 30–40 recharge point, under 30 soon, floor and below now.
eq('battery 41%', view({ pct: 41 }), ['normal', 'On battery', '4 h 59 m left']);
eq('battery 40%', view({ pct: 40 }), ['normal', 'Good time to plug in', '4 h 59 m left']);
eq('battery 31%', view({ pct: 31 }), ['normal', 'Good time to plug in', '4 h 59 m left']);
eq('battery 30%', view({ pct: 30 }), ['normal', 'Good time to plug in', '4 h 59 m left']);
eq('battery 29%', view({ pct: 29 }), ['warn', 'Plug in soon', '4 h 59 m left']);
eq('battery 21%', view({ pct: 21 }), ['warn', 'Plug in soon', '4 h 59 m left']);
eq('battery 20%', view({ pct: 20 }), ['alert', 'Plug in now', '4 h 59 m left']);
eq('battery 10%', view({ pct: 10 }), ['alert', 'Plug in now', '4 h 59 m left']);
eq('battery 9%', view({ pct: 9, minutes: 40 }), ['alert', 'Plug in now', 'Very low · 40 m left']);
eq('battery, macOS still estimating', view({ pct: 55, minutes: null }), ['normal', 'On battery', 'Estimating time left']);

// Heat overrides everything; warm only tints the temperature.
eq('hot at 40.0 °C', view({ pct: 62, tempC: 40 }), ['alert', 'Hot · 40.0°', 'Give it air or pause']);
eq('hot beats holding', view({ ac: true, pct: 80, tempC: 43.2 }), ['alert', 'Hot · 43.2°', 'Give it air or pause']);
eq('hot in °F', view({ pct: 62, tempC: 41 }, 'f')[1], 'Hot · 106°');
eq('warm 35 °C: warn tint only', (({ tone, tempTone, temp }) => [tone, tempTone, temp])(batteryView(at({ pct: 70, tempC: 35 }))), ['normal', 'warn', '35.0°']);
eq('cool: no tint', batteryView(at({})).tempTone, null);
eq('no temperature reported', batteryView(at({ tempC: null })).temp, null);
eq('custom floor 25 moves the edges', [view({ pct: 25, limits: { ...REAL.limits, floor: 25 } })[0], view({ pct: 26, limits: { ...REAL.limits, floor: 25 } })[0]], ['alert', 'warn']);

/* ── 3. Health ──────────────────────────────────────────────────────────────── */

const NOW = new Date(2026, 10, 20, 12, 0); // 20 Nov 2026, local time
const health = (patch) => healthView(at(patch), NOW);
eq('real numbers: 94%, 187 of 1000, 1% per 31, Apple 1% per 50', (({ maxPct, cycles, rated, pace, applePace }) => [maxPct, cycles, rated, pace, applePace])(health({})), [94, 187, 1000, 31, 50]);
eq('no capacity reported → no widget data', health({ nominalMah: null }), null);
eq('pace since the first log row once 20+ cycles apart', (({ pace, paceSince }) => [pace, paceSince])(health({ cycles: 237, nominalMah: 5200, history: [{ date: '2026-10-31', cycles: 187, nominalMah: 5256, designMah: 5596 }] })), [50, '2026-10-31']);
eq('under 20 cycles of history → lifetime pace', health({ cycles: 197, history: [{ date: '2026-10-31', cycles: 187, nominalMah: 5256, designMah: 5596 }] }).paceSince, null);
eq('guard never ran → no routine line', health({}).due, null);
eq('fresh install: nothing due yet', health({ routine: { since: '2026-11-15', below40: null, near20: null } }).due.line, 'Routines up to date');
eq('run-down due after 14 days', (({ line, sub }) => [line, sub])(health({ routine: { since: '2026-10-31', below40: '2026-11-05', near20: '2026-11-05' } }).due), ['Run it down to ~35% this week', 'Last time 15 days ago']);
eq('run-down never seen since start', health({ routine: { since: '2026-11-01', below40: null, near20: '2026-11-10' } }).due.sub, 'Not seen since battery-guard started');
eq('calibration due after 30 days beats run-down', health({ routine: { since: '2026-09-01', below40: '2026-11-18', near20: '2026-10-15' } }).due.line, 'Let it reach ~20% once this month');
eq('both recent → up to date', health({ routine: { since: '2026-09-01', below40: '2026-11-18', near20: '2026-11-02' } }).due, { line: 'Routines up to date', last: null, done: true });

/* ── 4. Power settings ──────────────────────────────────────────────────────── */

eq('real pmset values: Power Nap and AC Low Power Mode need fixing', powerChecklist(at({})).map((i) => [i.id, i.ok, i.fix]), [
  ['powernap', false, 'sudo pmset -b powernap 0'], ['lpm-battery', true, 'sudo pmset -b lowpowermode 1'], ['lpm-ac', false, 'sudo pmset -c lowpowermode 0'],
]);
eq('all set', powerChecklist(at({ power: { battery: { powernap: 0, lowpowermode: 1 }, ac: { powernap: 1, lowpowermode: 0 } } })).every((i) => i.ok), true);
eq('unknown values are left out', powerChecklist(at({ power: { battery: { powernap: 0 } } })).map((i) => i.id), ['powernap']);
eq('no power block → empty list', powerChecklist(at({ power: null })), []);

/* ── Formatting ─────────────────────────────────────────────────────────────── */

eq('minutes', [minutesText(45), minutesText(60), minutesText(299)], ['45 m', '1 h', '4 h 59 m']);
eq('temperature', [tempText(31.6, 'c'), tempText(31.6, 'f')], ['31.6°', '89°']);

console.log(`\nbattery-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
