import React, { useState } from 'react';
import useOSStore from '../../store/osStore';
import ThemeScope from './ThemeScope';
import { MiniDashboard, SwatchLadder, ColorwayCard, AccentMeasure } from './Specimens';
import {
  LAWS, GLOBAL, COLORWAYS, THEMES, colorwaysByTheme, resolveColorway,
  SDL_VERSION, SDL_AUTHOR, accentBand,
} from '../../theme/registry';
import { DEVIATIONS } from '../../theme/overrides';

/* Recorded rejections. SDL's own practice is to keep these beside the locks — "passed: cobalt
   (accent too loud as chrome)" is knowledge, not clutter. Sourced from the skill's GRAMMAR.md and
   the colorways/typography CHANGELOGs. */
const REJECTIONS = [
  { what: 'Cobalt #5387ee as chrome', verdict: 'accent too loud as chrome', went: "Reborn as Carbon Vivid's bar channel — the same hex, promoted to data" },
  { what: 'Neon accents', verdict: 'rated 5.5–5.7; loudness fails', went: 'Preserved here as Lumina Neon (Legacy), and the reason this OS was relit' },
  { what: 'Hyper-yellow plane', verdict: '5.4 — "hurts eyes"', went: 'Became law 6, the brightness ceiling' },
  { what: 'Gill Sans for titles', verdict: '"bad title font change"', went: 'Washed pair took Palatino; body stays the system stack' },
  { what: 'Optima for numerals', verdict: 'bad numbers, poor readability', went: 'Display faces never set numerals — the body face renders all figures' },
  { what: 'Gradient-clipped page titles', verdict: 'rejected', went: 'Titles go SOLID accent tone; gradients live only on special buttons (law 9)' },
  { what: 'Pastel-fill status chips', verdict: "didn't register as status", went: 'Dot-chips: plane bg + accent dot + 50%-aInk hairline (law 5)' },
  { what: 'Bright outlined data bars', verdict: '"middle-school geometry"', went: 'Moss bars go solid two-tone instead' },
  { what: 'Neutral grey surfaces on Rose Dusk', verdict: '"too dull"', went: 'Wine-cast surfaces #261b21' },
  { what: 'Orchid Vivid (dark)', verdict: '"better executed fuchsia"', went: 'Discarded as redundant once Fuchsia locked' },
];

const Section = ({ title, sub, children }) => (
  <section className="mb-10">
    <h3 className="mb-1" style={{ color: 'var(--sdl-ink)', fontSize: 19, fontWeight: 650, letterSpacing: '-0.015em', fontFamily: 'var(--sdl-font-title)' }}>
      {title}
    </h3>
    {sub && <p className="text-[13px] mb-4" style={{ color: 'var(--sdl-sec)' }}>{sub}</p>}
    {children}
  </section>
);

const Card = ({ children, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'var(--sdl-glass-bg)', border: '1px solid var(--sdl-glass-border)',
      borderRadius: 'var(--sdl-radius-lg)', padding: 16,
    }}
  >
    {children}
  </div>
);

/* ── Overview + the credit ──────────────────────────────────────────────────── */

const Overview = () => {
  const cw = resolveColorway(useOSStore((s) => s.colorway));
  const density = useOSStore((s) => s.density);
  return (
    <>
      <Card className="mb-8">
        {/* Law 9: solid accent tone, never gradient-clipped. Clipping THIS title would be a
            violation on the one surface that must not violate. */}
        <h2 style={{ color: 'var(--sdl-title-ink)', fontSize: 34, fontWeight: 650, letterSpacing: '-0.02em', fontFamily: 'var(--sdl-font-title)' }}>
          Sarva Design Language
        </h2>
        <p className="mb-4" style={{ color: 'var(--sdl-sec)', fontSize: 16, fontWeight: 600 }}>
          <span className="tabular-nums">{SDL_VERSION}</span> — by {SDL_AUTHOR}
        </p>
        <p className="max-w-[62ch] mb-3" style={{ color: 'var(--sdl-sec)', fontSize: 15, lineHeight: 1.6 }}>
          Every colour, weight, tempo and rule in this section is {SDL_AUTHOR}&rsquo;s work: ten laws,
          five theme grammars, fifteen locked colorways, distilled through 35 rated combinations and
          five review rounds.
        </p>
        <p className="max-w-[62ch]" style={{ color: 'var(--sdl-sec)', fontSize: 15, lineHeight: 1.6 }}>
          Lumina OS is a portfolio by Abhimanyu Saxena. It does not own this design language — it
          implements it. Where the two disagree, SDL wins and the deviation is logged.
        </p>
      </Card>

      <Section title="What your OS is running" sub="This table changes as you theme the desktop.">
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
            {[
              ['Colorway', `${cw.name}${cw.suffix ? ' ' + cw.suffix : ''}`],
              ['Theme', `${cw.themeName} — ${cw.mode}, ${cw.grammar === 'depth' ? 'lifted' : 'paper-flat'}`],
              ['Tempo', `${cw.tempo.hover} / ${cw.tempo.press} / ${cw.tempo.pane} ms · ${cw.tempo.ease}`],
              ['Radius', `${cw.radius}px`],
              ['Title face', cw.titleFace],
              ['Density', density],
            ].map(([k, v]) => (
              <React.Fragment key={k}>
                <dt style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>{k}</dt>
                <dd style={{ color: 'var(--sdl-ink)' }} className="tabular-nums">{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </Card>
      </Section>

      <Section title="The Ten Laws" sub="Global. Never broken.">
        <ol className="space-y-2">
          {LAWS.map((law, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="shrink-0 tabular-nums text-[11px] font-bold rounded flex items-center justify-center"
                style={{ background: 'var(--sdl-sunken)', color: 'var(--sdl-aink)', width: 22, height: 22 }}
              >
                {i + 1}
              </span>
              <span className="text-[13px] leading-relaxed" style={{ color: 'var(--sdl-ink)' }}>{law}</span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
};

/* ── Colorways & roles ──────────────────────────────────────────────────────── */

const Colorways = () => {
  const active = useOSStore((s) => s.colorway);
  const setColorway = useOSStore((s) => s.setColorway);
  const groups = colorwaysByTheme();
  const [family, setFamily] = useState('all');
  const shown = family === 'all' ? groups : groups.filter((g) => g.id === family);

  return (
    <>
      <Section
        title="Colorways & roles"
        sub={`${COLORWAYS.length} colorways across ${THEMES.length} SDL theme grammars, plus the preserved legacy pack. Applying is instant — the whole OS repaints beneath this window.`}
      >
        <div className="flex flex-wrap gap-2 mb-5">
          {[{ id: 'all', name: `All ${COLORWAYS.length}` }, ...groups].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setFamily(g.id)}
              className="text-[12px] px-3 py-1.5 rounded-full transition-colors duration-hover ease-sdl"
              style={{
                background: family === g.id ? 'var(--sdl-soft)' : 'var(--sdl-sunken)',
                color: family === g.id ? 'var(--sdl-aink)' : 'var(--sdl-sec)',
                fontWeight: 600,
                boxShadow: family === g.id ? 'var(--sdl-hairline)' : 'none',
              }}
            >
              {g.name}{g.colorways ? ` · ${g.colorways.length}` : ''}
            </button>
          ))}
        </div>

        {shown.map((g) => (
          <div key={g.id} className="mb-8">
            <h4 className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>
              {g.name} · {g.mode}
            </h4>
            {Array.isArray(g.grammar) && (
              <p
                className="text-[12px] leading-relaxed mb-3"
                style={{ color: 'var(--sdl-sec)', background: 'var(--sdl-sunken)', padding: 10, borderRadius: 'var(--sdl-radius-sm)' }}
              >
                {g.grammar.join(' · ')}
              </p>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {g.colorways.map((cw) => (
                <ColorwayCard key={cw.id} cw={cw} active={active === cw.id} onApply={setColorway} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Role vocabulary" sub="The eleven roles every colorway must supply, in the active pack.">
        <Card><SwatchLadder cw={resolveColorway(active)} /></Card>
      </Section>

      <Section
        title="Against the ceiling"
        sub={`SDL's locked accents run ${accentBand.sat.min}–${accentBand.sat.max}% saturation at ${accentBand.lum.min}–${accentBand.lum.max} relative luminance. Cobalt #5387ee was passed as chrome at ${accentBand.cobaltPassedAt} and demoted to a data bar.`}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {['lumina-neon', active].filter((v, i, a) => a.indexOf(v) === i).map((id) => {
            const cw = resolveColorway(id);
            return (
              <Card key={id}>
                <div className="mb-2 text-[13px]" style={{ color: 'var(--sdl-ink)', fontWeight: 650 }}>
                  {cw.name} {cw.suffix || ''}
                </div>
                <AccentMeasure cw={cw} />
              </Card>
            );
          })}
        </div>
      </Section>
    </>
  );
};

/* ── Type ───────────────────────────────────────────────────────────────────── */

const WEIGHTS = [
  [550, 'nav'], [600, 'buttons / labels'], [620, 'primary buttons'],
  [650, 'section titles / chart labels'], [700, 'KPI values / row leads'], [750, 'display'],
];

const Typography = () => {
  const [collapsed, setCollapsed] = useState(false);
  const t = GLOBAL.type;
  return (
    <>
      <Section title="The scale" sub={`hero ${t.hero} · title ${t.title} · h2 ${t.h2} · h3 ${t.h3} · body ${t.body} · small ${t.small} · label ${t.label}`}>
        <Card>
          {[['Hero', t.hero], ['Title', t.title], ['H2', t.h2], ['H3', t.h3], ['Body', t.body], ['Small', t.small]].map(([label, size]) => (
            <div key={label} className="flex items-baseline gap-4 py-1 border-b" style={{ borderColor: 'var(--sdl-glass-border)' }}>
              <span className="w-12 shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--sdl-sec)' }}>{size}px</span>
              <span style={{ color: 'var(--sdl-ink)', fontSize: Math.min(size, 40), letterSpacing: size >= 24 ? '-0.02em' : 0, fontFamily: 'var(--sdl-font-title)' }}>
                {label}
              </span>
            </div>
          ))}
        </Card>
      </Section>

      <Section
        title="Micro-stepped weights"
        sub="The SDL signature. Never jump 400 → 700; the in-between steps ARE the voice."
      >
        <Card>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="mb-3 text-[11px] px-3 py-1.5 rounded-full"
            style={{ background: collapsed ? 'var(--sdl-soft)' : 'var(--sdl-sunken)', color: collapsed ? 'var(--sdl-aink)' : 'var(--sdl-sec)', fontWeight: 600 }}
          >
            {collapsed ? 'Showing 400 / 700 only — restore the ladder' : 'Collapse to 400 / 700'}
          </button>
          {WEIGHTS.map(([w, role]) => (
            <div key={w} className="flex items-baseline gap-4 py-1">
              <span className="w-10 shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--sdl-sec)' }}>{collapsed ? (w >= 650 ? 700 : 400) : w}</span>
              <span style={{ color: 'var(--sdl-ink)', fontSize: 17, fontWeight: collapsed ? (w >= 650 ? 700 : 400) : w }}>
                Sarva Design Language
              </span>
              <span className="text-[11px] ml-auto" style={{ color: 'var(--sdl-sec)' }}>{role}</span>
            </div>
          ))}
          <p className="mt-3 text-[12px] leading-relaxed" style={{ color: 'var(--sdl-sec)' }}>
            Before this release Lumina OS shipped 73 <code>font-bold</code> and 52 <code>font-black</code>{' '}
            declarations against a three-weight import. All 125 rendered identically.
          </p>
        </Card>
      </Section>

      <Section title="Numerals" sub="tabular-nums wherever data lives — tables, KPIs, timestamps.">
        <Card>
          <div className="grid grid-cols-2 gap-6 text-[15px]" style={{ color: 'var(--sdl-ink)' }}>
            <div>
              <div className="text-[11px] mb-1" style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>TABULAR</div>
              <div className="tabular-nums">{new Date().toLocaleTimeString()}</div>
              <div className="tabular-nums">1,481,209</div>
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>PROPORTIONAL</div>
              <div>{new Date().toLocaleTimeString()}</div>
              <div>1,481,209</div>
            </div>
          </div>
        </Card>
      </Section>
    </>
  );
};

/* ── Motion ─────────────────────────────────────────────────────────────────── */

const EasingCurve = ({ ease, size = 84 }) => {
  const m = String(ease).match(/cubic-bezier\(([^)]+)\)/);
  const [x1, y1, x2, y2] = m ? m[1].split(',').map((n) => parseFloat(n)) : [0.4, 0, 0.2, 1];
  const px = (v) => v * size;
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <rect x="0" y="0" width={size} height={size} fill="var(--sdl-chart)" rx="4" />
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} y1={px(g)} x2={size} y2={px(g)} stroke="var(--sdl-sec)" strokeOpacity="0.15" />
      ))}
      <path
        d={`M 0 ${size} C ${px(x1)} ${size - px(y1)}, ${px(x2)} ${size - px(y2)}, ${size} 0`}
        fill="none" stroke="var(--sdl-bar-a)" strokeWidth="2"
      />
    </svg>
  );
};

const Motion = () => {
  const binding = GLOBAL.motion.binding;
  const activeTheme = resolveColorway(useOSStore((s) => s.colorway)).theme;
  const CHARACTER = {
    'steel-night': 'snaps', 'carbon-day': 'snaps', 'hearth-light': 'settles',
    'botanical-day': 'a beat slower', 'jewel-night': 'silk',
  };
  return (
    <Section title="Tempo bindings" sub="One tempo per theme. Press = hover ÷ 2 · pane = hover × 1.4 · never mix inside a theme.">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {Object.entries(binding).filter(([k]) => k !== 'rule').map(([theme, val]) => {
          const [hover, press, pane, ease] = val;
          const isActive = theme === activeTheme;
          return (
            <Card key={theme}>
              <div className="flex gap-3">
                <EasingCurve ease={ease} />
                <div className="min-w-0">
                  <div className="text-[13px] mb-0.5" style={{ color: 'var(--sdl-ink)', fontWeight: 650 }}>
                    {THEMES.find((t) => t.id === theme)?.name || theme}
                  </div>
                  <div className="text-[12px] tabular-nums mb-1" style={{ color: 'var(--sdl-aink)' }}>
                    {hover} / {press} / {pane} ms
                  </div>
                  <div className="text-[11px] mb-1 truncate" style={{ color: 'var(--sdl-sec)' }}>{ease}</div>
                  <div className="text-[11px] italic" style={{ color: 'var(--sdl-sec)' }}>{CHARACTER[theme]}</div>
                  {isActive && (
                    <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--sdl-aink)', fontWeight: 700 }}>
                      Active
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
};

/* ── Rejections + deviations ────────────────────────────────────────────────── */

const Rejections = () => (
  <>
    <Section
      title="What was passed, and why"
      sub="SDL records rejections beside its locks. A system that only shows its wins can't teach — and half of what's below became something else rather than nothing."
    >
      <div className="space-y-2">
        {REJECTIONS.map((r) => (
          <Card key={r.what}>
            <div className="flex items-start gap-3">
              <span
                className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
                style={{ background: 'var(--sdl-sunken)', color: 'var(--sdl-sec)' }}
              >
                Passed
              </span>
              <div className="min-w-0">
                <div className="text-[13px]" style={{ color: 'var(--sdl-ink)', fontWeight: 650 }}>{r.what}</div>
                <div className="text-[12px] italic" style={{ color: 'var(--sdl-aink)' }}>&ldquo;{r.verdict}&rdquo;</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--sdl-sec)' }}>{r.went}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>

    <Section
      title="This project's deviations"
      sub="Proposed, not locked. Recorded in sdl-notes.md for the next SDL consolidation pass."
    >
      <div className="space-y-2">
        {DEVIATIONS.map((d) => (
          <Card key={d.id}>
            <div className="text-[13px] mb-1" style={{ color: 'var(--sdl-ink)', fontWeight: 650 }}>{d.title}</div>
            <div className="text-[12px] leading-relaxed" style={{ color: 'var(--sdl-sec)' }}>{d.detail}</div>
          </Card>
        ))}
      </div>
    </Section>
  </>
);

/* ── router ─────────────────────────────────────────────────────────────────── */

const RENDERERS = {
  'dl-overview': Overview,
  'dl-colorways': Colorways,
  'dl-type': Typography,
  'dl-motion': Motion,
  'dl-rejections': Rejections,
};

/** Renders one Design Language board. Section metadata lives in ./sections.js. */
const DesignLanguage = ({ section }) => {
  const Board = RENDERERS[section];
  return Board ? <Board /> : null;
};

export default DesignLanguage;
