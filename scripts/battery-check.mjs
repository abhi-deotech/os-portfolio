#!/usr/bin/env node
/**
 * battery-check — the Battery widgets' logic (src/wallpaper/battery.js), against the charging rules in
 * ~/Projects/battery-optimization/README.md:
 *
 *   1. parseBattery on good, partial and hostile relay answers,
 *   2. batteryView at every band edge, on the adapter and on battery, plus heat and a broken cap,
 *   3. healthView: capacity and the routine that is due,
 *   4. powerChecklist from `pmset -g custom` values,
 *   5. the death clock: calendar maths, the trend, and the use-plus-age estimate on real numbers,
 *   6. the CPU and Memory widgets (src/wallpaper/system.js) on real and hostile relay answers.
 *
 *   npm run battery:check
 */
import {
  parseBattery, batteryView, healthView, powerChecklist, minutesText, tempText, DEFAULT_LIMITS,
  deathClock, ymdBetween, ymdParts, historyTrend,
} from '../src/wallpaper/battery.js';
import { parseSystem, cpuView, memoryView, busyFor, systemCadence, gbText, BUSY_FOR_MS } from '../src/wallpaper/system.js';

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
eq('real numbers: 94%, 187 of 1000', (({ maxPct, cycles, rated }) => [maxPct, cycles, rated])(health({})), [94, 187, 1000]);
eq('no capacity reported → no widget data', health({ nominalMah: null }), null);
eq('the seven-day median wins over one reading (5292 → 95%, not 5256 → 94%)', health({ nominalMahSmoothed: 5292 }).maxPct, 95);
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

/* ── 5. Death clock ─────────────────────────────────────────────────────────── */

const d = (y, m, day) => new Date(y, m - 1, day, 12);
const ymd = (a, b) => (({ y, m, d: dd }) => [y, m, dd])(ymdBetween(a, b));
eq('same day', ymd(d(2026, 11, 1), d(2026, 11, 1)), [0, 0, 0]);
eq('31 Jan → 1 Mar: one month (to 28 Feb) and one day', ymd(d(2026, 1, 31), d(2026, 3, 1)), [0, 1, 1]);
eq('31 Jan → 29 Feb in a leap year: one month exactly', ymd(d(2028, 1, 31), d(2028, 2, 29)), [0, 1, 0]);
eq('across a year with days left', ymd(d(2026, 11, 1), d(2028, 5, 9)), [1, 6, 8]);
eq('a day short of a month', ymd(d(2026, 11, 15), d(2026, 12, 14)), [0, 0, 29]);
eq('DST change (late March) does not lose a day', ymd(d(2027, 3, 20), d(2027, 4, 2)), [0, 0, 13]);
eq('parts drop zero leaders, keep inner zeros', [ymdParts({ y: 1, m: 0, d: 5 }), ymdParts({ y: 0, m: 0, d: 0 }), ymdParts({ y: 0, m: 3, d: 2 })].map((p) => p.map((x) => `${x.n}${x.u}`).join(' ')), ['1y 0m 5d', '0d', '3m 2d']);

// The relay's real answer on 2026-11-01 for the clock's inputs: 7-day median 5292 mAh, 1.266 cycles a
// day from the power log over 6.9 days, a battery from October 2021.
const LIVE = { nominalMah: 5292, nominalMahSmoothed: 5292, batterySince: '2021-10', usage: { cyclesPerDay: 1.266, source: 'log', days: 6.9 } };
const CLOCK_NOW = new Date(2026, 10, 1, 1, 0);
const clock = (patch, t = 80) => deathClock(at({ ...LIVE, ...patch }), t, CLOCK_NOW);
const c80 = clock({});
eq('parses the clock inputs', [at(LIVE).batterySince, at(LIVE).usage, at(LIVE).nominalMahSmoothed], ['2021-10', { cyclesPerDay: 1.266, source: 'log', days: 6.9 }, 5292]);
// 94.57% now; age loss 5.43 − 187 × 0.02 = 1.69% over 1857 days; + 0.02% × 1.266 a day → 9.57% a year.
eq('real numbers at 80%: use plus age, 555 days, 9 May 2028, 1y 6m 8d', [c80.status, c80.method, c80.days, c80.end.toDateString(), ymdParts(c80.ymd).map((x) => `${x.n}${x.u}`).join(' '), c80.perYear.toFixed(2)], ['counting', 'age', 555, 'Tue May 09 2028', '1y 6m 8d', '9.57']);
eq('every threshold, in days', [90, 85, 75, 70].map((t) => clock({}, t).days), [174, 365, 746, 937]);
eq('no start date → harsh: all loss blamed on cycles (1% per 34.4), earlier date', [clock({ batterySince: null }).method, clock({ batterySince: null }).days < c80.days], ['cycles', true]);
eq('battery under six months old → harsh estimate, not age', clock({ batterySince: '2026-08' }).method, 'cycles');
eq('worn better than rated → its own, gentler per-cycle rate', (() => { const c = clock({ nominalMahSmoothed: 5540, cycles: 187 }); return [c.method, c.days > 1000]; })(), ['age', true]);
eq('at or below the threshold → reached', [clock({ nominalMahSmoothed: 4476 }).status, clock({ nominalMahSmoothed: 4470 }).status], ['reached', 'reached']);
eq('no usage rate yet → learning', clock({ usage: null }).status, 'learning');
eq('idle battery, ancient age → never', clock({ usage: { cyclesPerDay: 0, source: 'ledger', days: 30 }, nominalMahSmoothed: 5590, cycles: 0, batterySince: null }).status, 'never');
eq('falls back to the raw reading without a median', clock({ nominalMahSmoothed: null }).days, 555);
eq('hostile usage ignored', [at({ usage: { cyclesPerDay: -1, source: 'log' } }).usage, at({ usage: { cyclesPerDay: 1, source: 'guess' } }).usage, at({ batterySince: '2021-13' }).batterySince], [null, null, null]);

const row = (date, nominalMah) => ({ date, cycles: 187, nominalMah, designMah: 5596 });
eq('trend needs 3 rows over 90 days and a 1% drop', [
  historyTrend([row('2026-11-01', 5292), row('2026-12-01', 5280)]),
  historyTrend([row('2026-11-01', 5292), row('2026-12-01', 5280), row('2027-01-01', 5270)]),
  historyTrend([row('2026-11-01', 5292), row('2027-01-01', 5285), row('2027-03-01', 5280)]),
], [null, null, null]);
const trendRows = [row('2026-11-01', 5292), row('2027-01-01', 5250), row('2027-03-01', 5210), row('2027-05-01', 5170)];
eq('a real drop over six months → trend, about 4.4% a year', [clock({ history: trendRows }).method, (historyTrend(trendRows) * 365).toFixed(1)], ['trend', '4.4']);

/* ── 6. CPU and memory ──────────────────────────────────────────────────────── */

// battery-guard's real /v1/system answer on 2026-11-01.
const SYS = {
  v: 1, at: '2026-10-31T19:14:18Z',
  cpu: { cores: [0.269, 0.28, 0.5, 0.375, 0.2, 0.08, 0.038, 0], kinds: ['E', 'E', 'P', 'P', 'P', 'P', 'P', 'P'], load: [3.5, 3.7, 4.1], total: 0.218, window: 0.25 },
  memory: { app: 5081776128, cached: 2661908480, compressed: 6301433856, freePct: 47, pressure: 'normal', swapoutsPerMin: null, swapTotal: 5368709120, swapUsed: 3925868544, total: 17179869184, used: 13719896064, wired: 2336686080 },
  power: { ac: true, lowPower: false, thermal: 'nominal' },
};
const sys = (patch) => parseSystem({ ...SYS, ...patch });
const cpuAt = (cpu, power) => sys({ cpu: { ...SYS.cpu, ...cpu }, power: { ...SYS.power, ...power } });

eq('real answer parses', [sys({}).cpu.cores.length, sys({}).memory.total], [8, 17179869184]);
eq('hostile answers', [parseSystem(null), parseSystem({ ...SYS, v: 2 }), parseSystem({ v: 1 }), sys({ cpu: { ...SYS.cpu, cores: [2] }, memory: null })], [null, null, null, null]);
eq('memory alone still parses', sys({ cpu: null }).cpu, null);
eq('used above total is rejected', sys({ memory: { ...SYS.memory, used: 2 ** 40 } }).memory, null);
eq('unknown kinds → all P', cpuAt({ kinds: ['X'] }).cpu.kinds.every((k) => k === 'P'), true);

const cv = cpuView(sys({}));
eq('real CPU: 22%, E×2 then P×6, load line', [cv.pct, cv.groups.map((g) => `${g.kind}${g.cores.length}`).join(' '), cv.line, cv.tone], [22, 'E2 P6', 'Load 3.5 · 8 cores', 'normal']);
const run = (n, total, step = 3000) => Array.from({ length: n }, (_, i) => ({ at: i * step, total }));
eq('busy needs an unbroken run above 70%', [busyFor(run(12, 0.9)), busyFor([...run(11, 0.9), { at: 33_000, total: 0.2 }]), busyFor([])], [33_000, 0, 0]);
eq('a long gap (page hidden) ends the run', busyFor([{ at: 0, total: 0.9 }, { at: 60_000, total: 0.9 }, { at: 63_000, total: 0.9 }]), 3000);
eq('busy line after 30 s, minutes after one, warn after five', [
  cpuView(sys({}), run(10, 0.9)).line,
  cpuView(sys({}), run(12, 0.9)).line,
  cpuView(sys({}), run(41, 0.9, 3000)).line,
  cpuView(sys({}), run(101, 0.9, 3000)).tone,
], ['Load 3.5 · 8 cores', 'Busy for 33 s', 'Busy for 2 min', 'warn']);
eq('heat beats busy', [cpuView(cpuAt({}, { thermal: 'serious' }), run(20, 0.9)).line, cpuView(cpuAt({}, { thermal: 'serious' })).tone, cpuView(cpuAt({}, { thermal: 'critical' })).tone], ['Hot · slowing down', 'warn', 'alert']);
eq('BUSY_FOR_MS is 30 s', BUSY_FOR_MS, 30_000);

const mv = memoryView(sys({}));
eq('real memory: 12.8 of 16 GB, normal, split and detail', [mv.used, mv.total, mv.pressure, mv.tone, mv.split, mv.detail], ['12.8', '16', 'Normal', 'normal', 'App 4.7 · Wired 2.2', 'Compressed 5.9']);
eq('parts add up to used', Math.abs(mv.parts.reduce((s2, p) => s2 + p.share, 0) - SYS.memory.used / SYS.memory.total) < 1e-9, true);
const mem = (patch) => memoryView(sys({ memory: { ...SYS.memory, ...patch } }));
eq('warning: warn tone, swap line takes the detail', [mem({ pressure: 'warning' }).tone, mem({ pressure: 'warning' }).detail], ['warn', 'Swap 3.7 GB']);
eq('swapping now → "rising"', [mem({ pressure: 'critical', swapoutsPerMin: 120 }).detail, mem({ pressure: 'critical' }).tone], ['Swap 3.7 GB, rising', 'alert']);
eq('normal but swapping now → swap shows', mem({ swapoutsPerMin: 40 }).detail, 'Swap 3.7 GB, rising');
eq('under pressure with no swap', mem({ pressure: 'warning', swapUsed: 0 }).detail, 'No swap in use');
eq('cadence: adapter 3 s, battery 10 s, Low Power Mode 15 s, unknown 3 s', [systemCadence({ ac: true, lowPower: false }), systemCadence({ ac: false, lowPower: false }), systemCadence({ ac: false, lowPower: true }), systemCadence(null)], [3000, 10_000, 15_000, 3000]);
eq('GB text', [gbText(17179869184), gbText(3925868544), gbText(2 ** 30 * 128), gbText(2 ** 30 * 5, { part: true })], ['16', '3.7', '128', '5.0']);
eq('a whole part keeps its decimal', mem({ compressed: 2 ** 30 * 5 }).detail, 'Compressed 5.0');

/* ── Formatting ─────────────────────────────────────────────────────────────── */

eq('minutes', [minutesText(45), minutesText(60), minutesText(299)], ['45 m', '1 h', '4 h 59 m']);
eq('temperature', [tempText(31.6, 'c'), tempText(31.6, 'f')], ['31.6°', '89°']);

console.log(`\nbattery-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
