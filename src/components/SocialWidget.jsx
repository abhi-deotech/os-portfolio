import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink, Users, GitPullRequest, GitCommit, Flame, CalendarDays,
  Quote, Award, MapPin, Briefcase, GraduationCap, Activity,
} from 'lucide-react';

import useOSStore from '../store/osStore';
import snapshot from '../data/githubSnapshot.json';
import { buildGrid } from '../utils/contributionGrid';
import {
  identity, positions, education, certifications, skills, awards,
  recommendations, endorsements, record, profileUrls,
  tenure, formatMonth, totalExperienceMonths, humanizeMonths,
} from '../config/profile';

const GithubIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const LinkedinIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

/* ---------------------------------------------------------------------------------------------
 * Contribution heatmap.
 *
 * Replaces an <img> from ghchart.rshah.org that had to sit on a hardcoded WHITE panel, because a
 * third party's PNG cannot be retinted to the active colorway — the old comment in this file
 * admitted as much and kept the slab. Drawing the grid ourselves removes the third-party
 * dependency, the light-on-dark slab, and the `width:200%; marginLeft:-100%` crop hack that was
 * showing only half a year while the label claimed six months.
 *
 * SDL: heatmaps use SEQUENTIAL only (dataviz/SKILL.md), and sequential is the accent family. The
 * five steps are the live accent at rising alpha, so the map re-tints with every colorway instead
 * of being locked to one green. Level 0 is `veil`, not a faint accent — an empty day must read as
 * absence, not as a little activity.
 * ------------------------------------------------------------------------------------------- */
const CELL = 10;
const GAP = 2;
const PITCH = CELL + GAP;
const LABEL_H = 14;

const LEVEL_FILL = [
  'rgb(var(--sdl-veil-rgb) / 0.06)',
  'rgb(var(--os-primary-rgb) / 0.22)',
  'rgb(var(--os-primary-rgb) / 0.45)',
  'rgb(var(--os-primary-rgb) / 0.70)',
  'rgb(var(--os-primary-rgb) / 1)',
];

const ContributionHeatmap = ({ calendar }) => {
  const { weeks, months } = useMemo(() => buildGrid(calendar), [calendar]);
  if (!weeks.length) return null;

  const w = weeks.length * PITCH - GAP;
  const h = LABEL_H + 7 * PITCH - GAP;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={`${calendar.active.length} days with contributions between ${calendar.from} and ${calendar.to}`}
      className="block overflow-visible"
    >
      {months.map((m) => (
        <text
          key={`${m.label}-${m.column}`}
          x={m.column * PITCH}
          y={LABEL_H - 5}
          className="font-bold"
          style={{ fontSize: 9, fill: 'rgb(var(--sdl-sec-rgb) / 0.75)', letterSpacing: '0.08em' }}
        >
          {m.label}
        </text>
      ))}
      {weeks.map((week, wi) =>
        week.map((day, di) => {
          if (!day) return null;
          return (
            <rect
              key={day.date}
              x={wi * PITCH}
              y={LABEL_H + di * PITCH}
              width={CELL}
              height={CELL}
              rx={2}
              fill={LEVEL_FILL[day.level]}
            >
              {/* Native tooltip, no JS. Only on days that happened — 269 titles instead of 365. */}
              {day.count > 0 && (
                <title>{`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}</title>
              )}
            </rect>
          );
        }),
      )}
    </svg>
  );
};

/** Stacked share bar. Language share is a magnitude, so SDL says sequential, not categorical. */
const LanguageBar = ({ languages }) => {
  if (!languages?.length) return null;
  const total = languages.reduce((a, l) => a + l.pct, 0) || 1;
  return (
    <div className="space-y-2.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-veil/[0.06]">
        {languages.map((l, i) => (
          <div
            key={l.name}
            style={{
              width: `${(l.pct / total) * 100}%`,
              background: `rgb(var(--os-primary-rgb) / ${(1 - i * 0.17).toFixed(2)})`,
            }}
            title={`${l.name} ${l.pct}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {languages.map((l, i) => (
          <span key={l.name} className="flex items-center gap-1.5 text-[10px] font-bold text-sdl-sec">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `rgb(var(--os-primary-rgb) / ${(1 - i * 0.17).toFixed(2)})` }}
            />
            {l.name}
            <span className="text-sdl-sec/60">{l.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const StatTile = ({ icon: Icon, value, label }) => (
  <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-hairline/5 bg-veil/[0.03] p-4 transition-colors hover:bg-veil/[0.05]">
    <Icon size={18} className="text-os-primary" />
    <span className="text-sm font-black tabular-nums text-sdl-ink">{value}</span>
    <span className="text-[10px] font-bold uppercase tracking-widest text-sdl-sec">{label}</span>
  </div>
);

const SectionLabel = ({ children, aside }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-xs font-black uppercase tracking-[0.15em] text-sdl-sec">{children}</span>
    {aside && (
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-os-primary/60">{aside}</span>
    )}
  </div>
);

/** "3d ago" / "2mo ago". Coarse on purpose — a build-time snapshot cannot be minute-accurate. */
const ago = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const EVENT_VERB = {
  PushEvent: 'Pushed to',
  PullRequestEvent: 'Pull request on',
  WatchEvent: 'Starred',
  CreateEvent: 'Created',
};

/* ---------------------------------------------------------------------------------------- *
 * GITHUB — machine proof. Baked at build time by scripts/github-sync.mjs, so there is no
 * fetch, no spinner, no rate-limit branch and no error state to render here any more.
 * ---------------------------------------------------------------------------------------- */
export const GithubPanel = () => {
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const c = snapshot.contributions;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-5 py-2">
        <div className="relative">
          <img
            src={snapshot.avatar}
            alt=""
            className="pointer-events-none h-16 w-16 rounded-2xl border-2 border-os-primary/20 p-0.5"
          />
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg border border-hairline/10 bg-sdl-plane">
            <GithubIcon size={12} className="text-os-primary" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-base font-black tracking-tight text-sdl-ink">@{snapshot.username}</span>
          <span className="mt-1 truncate text-xs font-bold uppercase tracking-widest text-sdl-sec">
            {snapshot.bio || `${snapshot.repos} public repos`}
          </span>
        </div>
        <a
          href={profileUrls.github}
          target="_blank"
          rel="noreferrer"
          onClick={() => unlockAchievement('socialite')}
          aria-label="Open GitHub profile"
          className="ml-auto rounded-xl bg-veil/5 p-2.5 text-sdl-sec transition-all hover:bg-os-primary/10 hover:text-os-primary"
        >
          <ExternalLink size={18} />
        </a>
      </div>

      {/* Stars and followers used to be two of the three headline numbers, and both were 0 —
          they measure popularity, which is not what this profile is optimised for. Effort
          metrics tell the true story and none of them can read zero for someone who codes. */}
      {c ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Activity} value={c.total.toLocaleString()} label="Contribs" />
            <StatTile icon={CalendarDays} value={c.activeDays} label="Active Days" />
            <StatTile icon={Flame} value={c.longest} label="Best Streak" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-bold text-sdl-sec">
            <span className="flex items-center gap-1.5"><GitCommit size={12} className="text-os-primary/70" />{c.commits.toLocaleString()} commits</span>
            <span className="flex items-center gap-1.5"><GitPullRequest size={12} className="text-os-primary/70" />{c.pullRequests} PRs</span>
            <span className="flex items-center gap-1.5"><Users size={12} className="text-os-primary/70" />{c.reposContributedTo} repos</span>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Activity} value={snapshot.repos} label="Repos" />
          <StatTile icon={Users} value={snapshot.followers} label="Followers" />
          <StatTile icon={GitCommit} value={snapshot.stars} label="Stars" />
        </div>
      )}

      {snapshot.calendar && (
        <div className="space-y-3">
          <SectionLabel aside="52 Weeks">Contribution Matrix</SectionLabel>
          <div className="rounded-2xl border border-hairline/10 bg-sdl-chart p-4">
            <ContributionHeatmap calendar={snapshot.calendar} />
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <span className="mr-1 text-[9px] font-bold uppercase tracking-widest text-sdl-sec">Less</span>
              {LEVEL_FILL.map((fill, i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: fill }} />
              ))}
              <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-sdl-sec">More</span>
            </div>
          </div>
        </div>
      )}

      {snapshot.languages?.length > 0 && (
        <div className="space-y-3">
          <SectionLabel aside="By Bytes">Language Mix</SectionLabel>
          <LanguageBar languages={snapshot.languages} />
        </div>
      )}

      {snapshot.recentEvents?.length > 0 && (
        <div className="space-y-3 overflow-hidden">
          <SectionLabel>Recent Pulses</SectionLabel>
          <div className="flex flex-col gap-2">
            {snapshot.recentEvents.map((e) => (
              <div
                key={`${e.type}-${e.repo}-${e.at}`}
                className="flex items-center gap-3 rounded-xl border border-hairline/5 bg-veil/[0.03] p-3 text-sm"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-os-primary shadow-[0_0_8px_rgb(var(--os-primary-rgb))]" />
                <span className="shrink-0 font-bold text-sdl-sec">{EVENT_VERB[e.type] ?? e.type}</span>
                <span className="truncate font-black text-sdl-ink">{e.repo}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] font-bold text-sdl-sec/70">
                  {e.commits > 1 ? `${e.commits} commits · ` : ''}{ago(e.at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ---------------------------------------------------------------------------------------- *
 * LINKEDIN — human proof.
 *
 * This tab used to be a worse LinkedIn: invented skills, an invented location, a verification
 * tick LinkedIn never granted, "500+ connections", and the GitHub avatar wearing a LinkedIn
 * ring. It competed with linkedin.com and lost, while adding nothing AboutMe did not already
 * say better.
 *
 * It now carries what GitHub structurally cannot: named humans vouching for the work, a dated
 * career record, and endorsement counts. Every fact comes from src/config/profile.js, and the
 * panel is labelled as a verified record rather than dressed up as a live feed. Sections whose
 * data has not been imported yet do not render — a "0 recommendations" empty state would be
 * worse than no section at all.
 * ---------------------------------------------------------------------------------------- */
export const LinkedinPanel = () => {
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const experience = useMemo(() => humanizeMonths(totalExperienceMonths()), []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-4 border-b border-hairline/5 pb-4">
        {/* A monogram, not the GitHub avatar. Honest placeholder until identity.photo exists. */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-os-primary/20 bg-gradient-to-br from-os-primary/25 to-os-primary/5">
          <span className="text-lg font-black tracking-tight text-os-primary">
            {identity.given[0]}{identity.family[0]}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black tracking-tight text-sdl-ink">{identity.name}</h2>
          <p className="mt-0.5 text-sm text-sdl-sec">{identity.headline}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sdl-sec">
            <MapPin size={12} />
            <span>{identity.location}</span>
            <span aria-hidden>·</span>
            <span className="font-bold text-os-primary/80">{experience} experience</span>
          </div>
        </div>

        <a
          href={profileUrls.linkedin}
          target="_blank"
          rel="noreferrer"
          onClick={() => unlockAchievement('socialite')}
          aria-label="Open LinkedIn profile"
          className="shrink-0 rounded-xl bg-veil/5 p-2.5 text-sdl-sec transition-all hover:bg-os-primary/10 hover:text-os-primary"
        >
          <LinkedinIcon size={18} />
        </a>
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-3">
          <SectionLabel aside={`${recommendations.length}`}>Recommendations</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {recommendations.map((r) => (
              <figure key={`${r.author}-${r.date}`} className="rounded-2xl border border-hairline/5 bg-veil/[0.03] p-4">
                <Quote size={14} className="mb-2 text-os-primary/60" />
                <blockquote className="text-xs leading-relaxed text-sdl-ink/90">{r.text}</blockquote>
                <figcaption className="mt-3 border-t border-hairline/5 pt-2.5">
                  <p className="text-xs font-black text-sdl-ink">{r.author}</p>
                  <p className="text-[10px] font-bold text-sdl-sec">{r.title}</p>
                  {r.relationship && (
                    <p className="mt-1 text-[10px] italic text-sdl-sec/70">{r.relationship}</p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <SectionLabel aside={experience}>Career</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {positions.map((p) => (
            <div key={`${p.company}-${p.start}`} className="rounded-2xl border border-hairline/5 bg-veil/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-os-primary/20 bg-os-primary/10">
                  <Briefcase size={16} className="text-os-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight text-sdl-ink">{p.title}</p>
                  <p className="text-xs font-bold text-os-primary/80">{p.company}</p>
                  {/* Dates are stored; the duration is computed, so it cannot go stale. */}
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-sdl-sec">
                    {formatMonth(p.start)} – {formatMonth(p.end)} · {tenure(p)}
                  </p>
                  <p className="text-[10px] text-sdl-sec/70">{p.location}</p>
                </div>
                {!p.end && (
                  <span className="shrink-0 rounded-md bg-os-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-os-primary">
                    Now
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionLabel aside={endorsements.length ? 'Endorsed' : 'From Résumé'}>Skills</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {endorsements.length > 0
            ? endorsements.map((e) => (
                <span
                  key={e.skill}
                  className="flex items-center gap-1.5 rounded-lg border border-hairline/5 bg-veil/5 px-2.5 py-1 text-xs text-sdl-ink/80"
                >
                  {e.skill}
                  <span className="font-mono text-[10px] font-black text-os-primary">{e.count}</span>
                </span>
              ))
            : [...skills.languages, ...skills.tools].map((s) => (
                <span key={s} className="rounded-lg border border-hairline/5 bg-veil/5 px-2.5 py-1 text-xs text-sdl-ink/80">
                  {s}
                </span>
              ))}
        </div>
      </div>

      {awards.length > 0 && (
        <div className="space-y-3">
          <SectionLabel>Recognition</SectionLabel>
          <div className="flex flex-col gap-2">
            {awards.map((a) => (
              <div key={a.title} className="flex items-start gap-3 rounded-xl border border-hairline/5 bg-veil/[0.03] p-3">
                <Award size={14} className="mt-0.5 shrink-0 text-os-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-sdl-ink">
                    {a.title} <span className="font-bold text-sdl-sec">· {a.org}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-sdl-sec/80">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <SectionLabel>Education</SectionLabel>
        <div className="flex flex-col gap-2">
          {[...education, ...certifications].map((e) => (
            <div key={e.title} className="flex items-start gap-3 rounded-xl border border-hairline/5 bg-veil/[0.03] p-3">
              <GraduationCap size={14} className="mt-0.5 shrink-0 text-os-primary" />
              <div className="min-w-0">
                <p className="text-xs font-black text-sdl-ink">{e.title}</p>
                <p className="text-[10px] font-bold text-sdl-sec">
                  {e.school}{e.location ? ` · ${e.location}` : ''} · {e.year}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/** `initialTab` lets an embedder open straight onto either panel — SystemDashboard and the desktop
 *  widget grid have different reasons to lead. It also makes the shell's footer renderable in a
 *  headless check, which matters here because the preview pane cannot composite frames. */
const SocialWidget = ({ initialTab = 'github' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const isGithub = activeTab === 'github';

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-hairline/5 bg-gradient-to-br from-sdl-surface to-sdl-plane p-5 md:p-6">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-os-primary/5 blur-3xl transition-all duration-pane" />

      <div className="relative z-10 mx-auto mb-4 flex w-fit items-center gap-2 rounded-2xl border border-hairline/5 bg-veil/[0.03] p-1.5">
        {[
          { id: 'github', label: 'GitHub', Icon: GithubIcon },
          { id: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black uppercase tracking-widest transition-all duration-hover ${
              activeTab === id
                ? 'bg-os-primary text-sdl-onAccent shadow-lg shadow-os-primary/20'
                : 'text-sdl-sec hover:text-sdl-ink'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto pr-1">
        {isGithub ? <GithubPanel /> : <LinkedinPanel />}
      </div>

      {/* The two panels are different KINDS of claim, and the footer says which is which rather
          than letting a static record pass itself off as a live feed. */}
      <div className="mt-5 flex items-center justify-between border-t border-hairline/5 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-sdl-sec">
        <span>{isGithub ? 'Machine Proof' : 'Human Proof'}</span>
        <span className="flex items-center gap-1.5">
          {isGithub ? (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${snapshot.stale ? 'bg-sdl-warn' : 'bg-os-primary'}`} />
              {snapshot.stale ? 'Cached' : `Synced ${ago(snapshot.generatedAt)}`}
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-os-primary" />
              Verified {record.verifiedAt}
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default SocialWidget;
