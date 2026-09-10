#!/usr/bin/env node
/**
 * profile-check — proves the Social widget is telling the truth.
 *
 * This exists because the widget's LinkedIn tab once shipped a location, three skills and a
 * connection count that appeared in no other source, plus a verification tick LinkedIn never
 * granted. None of that was visible as a bug: it rendered perfectly. The only thing that catches
 * that class of failure is an assertion that the rendered output matches the recorded facts.
 *
 * It also covers the arithmetic behind every number on the GitHub tab. A streak that is off by one
 * or a quartile table that collapses to a single level looks completely normal on screen.
 *
 * The Browser pane cannot help here — it reports 0 requestAnimationFrame callbacks (see
 * tasks/lessons.md), so the boot screen never advances and the widget is unreachable. These checks
 * render the real components through Vite's SSR loader instead.
 *
 *   npm run profile:check
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { streaks, thresholds, topLanguages, digestEvents } from './github-sync.lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};
const ok = (label, cond, detail = '') => {
  if (cond) pass++;
  else { fail++; console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`); }
};

/* ---------------------------------------------------------------------------------------------
 * 1. Streaks, buckets, language split, event digest
 * ------------------------------------------------------------------------------------------- */
const day = (date, contributionCount) => ({ date, contributionCount });

eq('empty calendar', streaks([], '2026-09-02'), { current: 0, longest: 0, activeDays: 0 });
eq('unbroken run to today', streaks([day('2026-08-31', 1), day('2026-09-01', 4), day('2026-09-02', 2)], '2026-09-02'),
  { current: 3, longest: 3, activeDays: 3 });
eq('an empty TODAY does not break the streak',
  streaks([day('2026-08-31', 1), day('2026-09-01', 4), day('2026-09-02', 0)], '2026-09-02'),
  { current: 2, longest: 2, activeDays: 2 });
eq('an empty YESTERDAY does break it',
  streaks([day('2026-08-31', 5), day('2026-09-01', 0), day('2026-09-02', 0)], '2026-09-02'),
  { current: 0, longest: 1, activeDays: 1 });
eq('longest is not the current run', streaks([
  day('2026-01-01', 3), day('2026-01-02', 3), day('2026-01-03', 3), day('2026-01-04', 3),
  day('2026-01-05', 0), day('2026-09-01', 9), day('2026-09-02', 9),
], '2026-09-02'), { current: 2, longest: 4, activeDays: 6 });
eq('future padding days are dropped',
  streaks([day('2026-09-02', 5), day('2026-09-03', 0)], '2026-09-02'), { current: 1, longest: 1, activeDays: 1 });
eq('unsorted input still works',
  streaks([day('2026-09-02', 1), day('2026-08-31', 1), day('2026-09-01', 1)], '2026-09-02'),
  { current: 3, longest: 3, activeDays: 3 });

eq('no activity falls back', thresholds([day('a', 0)]), [1, 2, 3]);
eq('flat activity is forced increasing', thresholds(Array.from({ length: 20 }, (_, i) => day(`d${i}`, 5))), [5, 6, 7]);
eq('zeros are excluded from the quartiles', thresholds([
  ...Array.from({ length: 100 }, (_, i) => day(`z${i}`, 0)),
  day('a', 10), day('b', 20), day('c', 30), day('d', 40),
]), [20, 30, 40]);

const repo = (edges) => ({ languages: { edges } });
const lang = (name, size) => ({ size, node: { name } });
eq('no repos', topLanguages([]), []);
eq('sums bytes across repos and sorts', topLanguages([
  repo([lang('Go', 100), lang('JavaScript', 300)]), repo([lang('Go', 500)]),
]), [{ name: 'Go', pct: 66.7 }, { name: 'JavaScript', pct: 33.3 }]);
eq('caps at five series',
  topLanguages([repo('abcdefgh'.split('').map((n, i) => lang(n, 100 - i)))]).length, 5);

const push = (r, size, at) => ({ type: 'PushEvent', repo: { name: `x/${r}` }, payload: { size }, created_at: at });
eq('collapses consecutive pushes to one repo',
  digestEvents([push('p', 2, 't3'), push('p', 3, 't2'), push('p', 4, 't1')]),
  [{ type: 'PushEvent', repo: 'p', commits: 9, at: 't3' }]);
eq('does not collapse across repos', digestEvents([push('a', 1, 't2'), push('b', 1, 't1')]).length, 2);
eq('survives a malformed repo field', digestEvents([{ type: 'PushEvent', created_at: 't' }]), []);

/* ---------------------------------------------------------------------------------------------
 * 2. Boot Vite once; everything below renders the real modules.
 * ------------------------------------------------------------------------------------------- */
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const { buildGrid, levelFor, flattenDays } = await vite.ssrLoadModule('/src/utils/contributionGrid.js');
const profile = await vite.ssrLoadModule('/src/config/profile.js');
const widget = await vite.ssrLoadModule('/src/components/SocialWidget.jsx');
const snap = JSON.parse(readFileSync(join(ROOT, 'src/data/githubSnapshot.json'), 'utf8'));

/* --- grid densification --------------------------------------------------------------------- */
eq('missing calendar yields an empty grid', buildGrid(null), { weeks: [], months: [] });
eq('level 0 is reserved for zero', levelFor(0, [3, 7, 11]), 0);
eq('level boundaries are inclusive',
  [levelFor(1, [3, 7, 11]), levelFor(3, [3, 7, 11]), levelFor(7, [3, 7, 11]), levelFor(12, [3, 7, 11])], [1, 1, 2, 4]);
{
  const g = buildGrid({ from: '2026-01-04', to: '2026-01-17', thresholds: [1, 2, 3], active: [['2026-01-05', 4]] });
  eq('two whole weeks -> two columns', g.weeks.length, 2);
  eq('every column has seven slots', g.weeks.every((w) => w.length === 7), true);
  eq('a day with no entry is a real zero, not a null', g.weeks[0][0].count, 0);
  eq('the active day lands on the right cell', g.weeks[0][1].date, '2026-01-05');
}
{
  const g = buildGrid({ from: '2026-01-07', to: '2026-01-17', thresholds: [1, 2, 3], active: [] });
  eq('pre-range days are null padding, not zeroes', g.weeks[0].slice(0, 3), [null, null, null]);
  eq('the range starts on the correct weekday', g.weeks[0][3].date, '2026-01-07');
}

/* --- dates are computed, never stored --------------------------------------------------------- */
const AT = (s) => new Date(`${s}T00:00:00Z`);
eq('LendFoundry full run', profile.monthsBetween('2021-09', '2024-07'), 34);
eq('reversed dates clamp to 0', profile.monthsBetween('2025-07', '2024-07'), 0);
eq('open-ended uses now', profile.monthsBetween('2025-07', null, AT('2026-09-03')), 14);
eq('exact year has no month part', profile.humanizeMonths(12), '1 yr');
eq('year + months', profile.humanizeMonths(38), '3 yr 2 mo');
eq('January is not off-by-one', profile.formatMonth('2021-01'), 'Jan 2021');
eq('December is not off-by-one', profile.formatMonth('2024-12'), 'Dec 2024');
eq('null is Present', profile.formatMonth(null), 'Present');
ok('total experience sums tenures rather than spanning the gap',
  profile.totalExperienceMonths(AT('2026-09-03')) === 48);

/* --- the shipped snapshot re-derives from its own stored calendar ----------------------------- */
if (snap.calendar) {
  const grid = buildGrid(snap.calendar);
  const days = flattenDays(grid);
  const redone = streaks(days, snap.calendar.to);
  ok('grid covers a year of columns', grid.weeks.length >= 52 && grid.weeks.length <= 54, `weeks=${grid.weeks.length}`);
  eq('densified activeDays matches the snapshot', redone.activeDays, snap.contributions.activeDays);
  eq('densified longest streak matches the snapshot', redone.longest, snap.contributions.longest);
  eq('densified current streak matches the snapshot', redone.current, snap.contributions.current);
  eq('densified total matches the snapshot',
    days.reduce((a, d) => a + d.contributionCount, 0), snap.contributions.total);
} else {
  console.warn('  note: snapshot has no calendar (token-less sync); skipping calendar assertions.');
}

/* --- the rendered widget matches the recorded facts ------------------------------------------- */
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const ghHtml = renderToStaticMarkup(createElement(widget.GithubPanel));
const liHtml = renderToStaticMarkup(createElement(widget.LinkedinPanel));
const shellGh = renderToStaticMarkup(createElement(widget.default));
const shellLi = renderToStaticMarkup(createElement(widget.default, { initialTab: 'linkedin' }));
const gh = strip(ghHtml);
const li = strip(liHtml);

if (snap.contributions) {
  ok('renders the real contribution total', gh.includes(snap.contributions.total.toLocaleString()));
  ok('renders real active days', gh.includes(String(snap.contributions.activeDays)));
  ok('renders the real longest streak', gh.includes(String(snap.contributions.longest)));
  ok('renders the real PR count', gh.includes(String(snap.contributions.pullRequests)));
}
ok('renders the real username', gh.includes(snap.username));
for (const l of snap.languages) ok(`renders language ${l.name}`, gh.includes(l.name));

if (snap.calendar) {
  const rects = (ghHtml.match(/<rect/g) || []).length;
  ok('heatmap drew a full year of cells', rects >= 360 && rects <= 372, `rects=${rects}`);
  ok('heatmap tracks the live accent rather than a fixed green',
    ghHtml.includes('--os-primary-rgb') && !/#22c55e/i.test(ghHtml));
  ok('no third-party chart image remains', !ghHtml.includes('ghchart'));
  ok('tooltips appear only on days that happened',
    (ghHtml.match(/<title>/g) || []).length === snap.calendar.active.length);
}

// The specific fabrications this rebuild removed. Each one shipped, and each one looked fine.
ok('"Noida" is gone', !/Noida/i.test(liHtml));
ok('"500+ connections" is gone', !/500\+/.test(liHtml));
ok('unsupported AWS skill is gone', !/\bAWS\b/.test(liHtml));
ok('unsupported MongoDB skill is gone', !/MongoDB/i.test(liHtml));
ok('hardcoded LinkedIn brand hex is gone', !/0077b5/i.test(liHtml));
ok('the GitHub avatar is not reused as the LinkedIn photo', !liHtml.includes(snap.avatar));

ok('real name present', li.includes(profile.identity.name));
ok('real location present', li.includes(profile.identity.location));
ok('current employer present', li.includes(profile.positions[0].company));
ok('previous employer present', li.includes(profile.positions[1].company));
ok('résumé skill Golang present', li.includes('Golang'));
ok('résumé skill C++ present', li.includes('C++'));
ok('award present', li.includes(profile.awards[0].title));
ok('education present', li.includes(profile.education[0].school));
ok('computed total experience is rendered',
  li.includes(profile.humanizeMonths(profile.totalExperienceMonths())));
ok('computed tenure is rendered', li.includes(profile.tenure(profile.positions[0])));

ok('recommendations section stays hidden while the array is empty',
  profile.recommendations.length > 0 || !/Recommendations/i.test(li));
ok('skills are labelled as résumé-sourced while endorsements are empty',
  profile.endorsements.length > 0 || /From R/i.test(li));

ok('GitHub tab is labelled machine proof', shellGh.includes('Machine Proof'));
ok('LinkedIn tab is labelled human proof', shellLi.includes('Human Proof'));
ok('verification date shows on the LinkedIn tab', shellLi.includes(profile.record.verifiedAt));
ok('the GitHub tab does not claim record verification', !shellGh.includes(profile.record.verifiedAt));

// The dead address that shipped in AboutMe's social row.
ok('no mailto to the placeholder address anywhere',
  !/contact@abhi\.dev/.test(liHtml + ghHtml + shellGh + shellLi));

await vite.close();
console.log(`\nprofile-check: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
