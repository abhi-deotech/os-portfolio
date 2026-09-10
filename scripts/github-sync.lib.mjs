/**
 * Pure transforms for github-sync.mjs, split out so a harness can assert on them without making a
 * network call. These four produce every number the widget displays, and each has a failure mode
 * that is invisible on screen: an off-by-one streak, a quartile table that collapses to one level,
 * a language split that double-counts forks, an event list that reads as less activity than it is.
 * lessons.md: verify with a numeric assertion, not by eyeballing the UI.
 */

/**
 * Consecutive-day runs over the contribution calendar.
 *
 * `current` deliberately tolerates an empty TODAY: a build can run at 06:00 before the day's first
 * commit, and reporting a 40-day streak as 0 for that reason would be wrong. A gap at YESTERDAY is
 * a real break. Days after today are dropped — GitHub pads the final week out to Saturday.
 */
export function streaks(days, todayISO) {
  const past = days
    .filter((d) => d.date <= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date));

  let longest = 0;
  let run = 0;
  for (const d of past) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].contributionCount > 0) current++;
    else if (i === past.length - 1) continue; // today hasn't started — not a break
    else break;
  }

  return { current, longest, activeDays: past.filter((d) => d.contributionCount > 0).length };
}

/**
 * GitHub-style quartile buckets over the NON-ZERO days, so a quiet year still shows shape rather
 * than one flat tone. Forced strictly increasing: with a low-variance year the raw quartiles can
 * tie, which silently collapses levels 2-4 into one colour.
 */
export function thresholds(days) {
  const nz = days.map((d) => d.contributionCount).filter((c) => c > 0).sort((a, b) => a - b);
  if (!nz.length) return [1, 2, 3];
  const at = (q) => nz[Math.min(nz.length - 1, Math.floor(nz.length * q))];
  const t = [at(0.25), at(0.5), at(0.75)];
  for (let i = 1; i < t.length; i++) if (t[i] <= t[i - 1]) t[i] = t[i - 1] + 1;
  return t;
}

/** Byte totals across repos -> top 5 with percentages. Callers pass non-fork repos only. */
export function topLanguages(repos) {
  const bytes = new Map();
  for (const r of repos) {
    for (const e of r.languages?.edges ?? []) {
      bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, size]) => ({ name, pct: +((size / total) * 100).toFixed(1) }));
}

/**
 * The old widget rendered "Pushed to os-portfolio" three times in a row, which reads as *less*
 * activity than one line saying nine commits. Collapse consecutive pushes to the same repo and
 * carry the commit count.
 */
export function digestEvents(events, limit = 4) {
  const KEEP = ['PushEvent', 'WatchEvent', 'CreateEvent', 'PullRequestEvent'];
  const out = [];
  for (const e of events) {
    if (!KEEP.includes(e.type)) continue;
    const repo = e.repo?.name?.split('/')[1];
    if (!repo) continue;
    const last = out[out.length - 1];
    if (e.type === 'PushEvent' && last?.type === 'PushEvent' && last.repo === repo) {
      last.commits += e.payload?.size ?? 1;
      continue;
    }
    out.push({
      type: e.type,
      repo,
      commits: e.type === 'PushEvent' ? (e.payload?.size ?? 1) : 0,
      at: e.created_at,
    });
    if (out.length === limit) break;
  }
  return out;
}
