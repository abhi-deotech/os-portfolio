#!/usr/bin/env node
/**
 * Bakes src/data/githubSnapshot.json at build time.
 *
 * Why build time. The widget used to call api.github.com from the browser on every mount. That is
 * three unauthenticated requests against a 60/hour per-IP budget shared by every visitor, which is
 * why the component had to grow a rate-limit error path, a sessionStorage cache AND a separate
 * error cache. It also meant the profile could not show contribution counts at all: the
 * contribution calendar only exists on the GraphQL API, and GraphQL requires a token, and a token
 * cannot live in a client bundle. Fetching once per deploy fixes all of it — no rate limit, no
 * spinner, no error state, no secret in the bundle.
 *
 * Why this script is LENIENT where games-manifest.mjs is strict. That one fails the build on bad
 * input, because a silently-skipped game looks like the convention does not work. This one must
 * never fail the build: the input is a third-party network service, and GitHub being briefly
 * unreachable is not a reason to take the whole portfolio offline. Every failure path falls back
 * to the previous committed snapshot and exits 0. The snapshot records which path produced it, and
 * the UI labels a stale one rather than pretending it is live.
 *
 * Token. Reads GH_SYNC_TOKEN, then GITHUB_TOKEN. Needs no scopes — everything queried is public
 * data; the token is only there because GraphQL refuses anonymous callers. Without one the script
 * degrades to the REST endpoints, which still give profile, repos and events, but no calendar.
 *
 *   node scripts/github-sync.mjs                          # REST only
 *   GH_SYNC_TOKEN=$(gh auth token) node scripts/github-sync.mjs   # full, with contributions
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { streaks, thresholds, topLanguages, digestEvents } from './github-sync.lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'githubSnapshot.json');

const TOKEN = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN || '';
const UA = { 'User-Agent': 'os-portfolio-build', Accept: 'application/vnd.github+json' };

/** Read the login out of profile.js without importing JSX-adjacent module graph. */
const LOGIN = (() => {
  const src = readFileSync(join(ROOT, 'src', 'config', 'profile.js'), 'utf8');
  const m = src.match(/github:\s*'([^']+)'/);
  if (!m) throw new Error('github-sync: could not find handles.github in src/config/profile.js');
  return m[1];
})();

const log = (...a) => console.log('github-sync:', ...a);

/** Keep whatever is already on disk. Called on every failure path. */
function bail(reason) {
  log(`${reason} — keeping the committed snapshot.`);
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8'));
      prev.stale = true;
      prev.staleReason = reason;
      writeFileSync(OUT, `${JSON.stringify(prev, null, 2)}\n`);
    } catch {
      log('existing snapshot is unreadable; leaving it untouched.');
    }
  } else {
    log('no snapshot exists yet; writing an empty one so the import resolves.');
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify({ username: LOGIN, source: 'none', stale: true, staleReason: reason }, null, 2)}\n`);
  }
  process.exit(0);
}

const GQL = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login name bio avatarUrl location
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name description url stargazerCount forkCount pushedAt
        primaryLanguage { name }
        languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
      }
    }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount weekday } }
      }
    }
  }
}`;

async function graphql(from, to) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...UA, Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GQL, variables: { login: LOGIN, from, to } }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((e) => e.message).join('; ')}`);
  if (!body.data?.user) throw new Error(`GraphQL returned no user for "${LOGIN}"`);
  return body.data.user;
}

async function rest(path) {
  const headers = TOKEN ? { ...UA, Authorization: `bearer ${TOKEN}` } : UA;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`REST ${path} -> HTTP ${res.status}`);
  return res.json();
}

const now = new Date();
const todayISO = now.toISOString().slice(0, 10);
const from = new Date(now.getTime() - 364 * 864e5);

let snapshot;

try {
  // Events are REST-only and public; fetch them on both paths, and never let them sink the run.
  const events = await rest(`/users/${LOGIN}/events/public?per_page=60`).catch((e) => {
    log(`events unavailable (${e.message}); continuing without them.`);
    return [];
  });

  if (TOKEN) {
    const u = await graphql(from.toISOString(), now.toISOString());
    const repos = u.repositories.nodes ?? [];
    const cal = u.contributionsCollection.contributionCalendar;
    const days = cal.weeks.flatMap((w) => w.contributionDays);
    const s = streaks(days, todayISO);

    snapshot = {
      username: u.login,
      name: u.name,
      bio: u.bio,
      avatar: u.avatarUrl,
      followers: u.followers.totalCount,
      repos: u.repositories.totalCount,
      stars: repos.reduce((a, r) => a + r.stargazerCount, 0),
      contributions: {
        total: cal.totalContributions,
        commits: u.contributionsCollection.totalCommitContributions,
        pullRequests: u.contributionsCollection.totalPullRequestContributions,
        issues: u.contributionsCollection.totalIssueContributions,
        reposContributedTo: u.contributionsCollection.totalRepositoriesWithContributedCommits,
        ...s,
      },
      calendar: {
        from: from.toISOString().slice(0, 10),
        to: todayISO,
        thresholds: thresholds(days),
        // [date, count] pairs only for days with activity; the component fills the rest of the
        // grid from the date range. A dense 365-entry array would trebles the payload for zeroes.
        active: days
          .filter((d) => d.contributionCount > 0 && d.date <= todayISO)
          .map((d) => [d.date, d.contributionCount]),
      },
      languages: topLanguages(repos),
      topRepos: repos
        .slice()
        .sort((a, b) => b.stargazerCount - a.stargazerCount || b.pushedAt.localeCompare(a.pushedAt))
        .slice(0, 3)
        .map((r) => ({
          name: r.name,
          description: r.description,
          url: r.url,
          stars: r.stargazerCount,
          language: r.primaryLanguage?.name ?? null,
        })),
      recentEvents: digestEvents(events),
      source: 'graphql',
      generatedAt: now.toISOString(),
      stale: false,
    };
  } else {
    log('no GH_SYNC_TOKEN / GITHUB_TOKEN — falling back to REST (no contribution calendar).');
    const [user, repos] = await Promise.all([
      rest(`/users/${LOGIN}`),
      rest(`/users/${LOGIN}/repos?sort=pushed&per_page=100&type=owner`),
    ]);
    const own = repos.filter((r) => !r.fork);
    snapshot = {
      username: user.login,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar_url,
      followers: user.followers,
      repos: user.public_repos,
      stars: own.reduce((a, r) => a + (r.stargazers_count ?? 0), 0),
      contributions: null,
      calendar: null,
      languages: [],
      topRepos: own.slice(0, 3).map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        stars: r.stargazers_count ?? 0,
        language: r.language ?? null,
      })),
      recentEvents: digestEvents(events),
      source: 'rest',
      generatedAt: now.toISOString(),
      stale: false,
    };

    // REST must never DOWNGRADE a richer snapshot. Contributions, the calendar and the language
    // split only exist on the GraphQL path, so a token-less build — which is what a fresh CI or a
    // deploy host without GH_SYNC_TOKEN configured looks like — would otherwise silently replace a
    // full year of committed data with nulls, and the widget would fall back to the stars and
    // followers this rebuild exists to stop leading with. Carry the GraphQL fields forward and
    // label them, refreshing only what REST can actually see.
    const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
    if (prev?.contributions) {
      snapshot.contributions = prev.contributions;
      snapshot.calendar = prev.calendar;
      snapshot.languages = prev.languages ?? [];
      snapshot.source = 'rest+cached-graphql';
      snapshot.stale = true;
      snapshot.staleReason = 'no token this run; contribution data carried over from the last authenticated sync';
      snapshot.contributionsAsOf = prev.generatedAt;
      log('preserved contribution data from the previous authenticated sync.');
    }
  }
} catch (err) {
  bail(err.message);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);

const c = snapshot.contributions;
log(
  `wrote ${OUT.replace(ROOT + '/', '')} via ${snapshot.source} —`,
  c
    ? `${c.total} contributions, ${c.activeDays} active days, streak ${c.current} (best ${c.longest})`
    : `${snapshot.repos} repos (no calendar without a token)`,
);
