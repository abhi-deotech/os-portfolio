import React, { useId, useMemo } from 'react';
import { dayFraction } from '../../../wallpaper/time';

/**
 * "Chrono Sundial": a Braun-quiet astronomical dial carved into the plane, lit by the real sun.
 *
 * Three recessed wells — the 24-hour track, a machined 60-minute groove, the sanctuary — read as
 * depth from offset copies of their own outlines: a lit rim on the far wall (offset toward the light
 * by the bevel), a crease and a cast on the near wall (offset along the shadow). The same shapes
 * read as stepped paper in light mode, because relief.css makes --relief-cast a tone there.
 *
 * The 24-hour dial has midnight at the bottom and noon at the top, and runs counter-clockwise on
 * screen: solar.js lights the morning from the right, so the current hour always sits on the side
 * the light comes from, and the gnomon's shadow points away from it. The minute groove turns the
 * same way, so nothing on the dial runs against the rest.
 *
 * Static between minute ticks: every shape is a function of the light, the box and the minute.
 */

const TAU = Math.PI * 2;

/** Two decimals keep the markup short; a hundredth of a pixel is below anything a screen shows. */
const p = (n) => Math.round(n * 100) / 100;
const finite = (n, fallback) => (Number.isFinite(n) ? n : fallback);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const ROUNDED = 'ui-rounded, var(--sdl-font-title), system-ui, sans-serif';

/** At most this many agenda arcs; a day busier than that is a smear on a 24-hour ring anyway. */
const MAX_EVENTS = 12;
/** Shortest arc an event draws (about nine minutes), so a zero-length reminder still shows. */
const MIN_SPAN = 0.006;

/**
 * The wells as fractions of the composition radius. `wall` is the crease width in px at r = 312,
 * `cast` how much of the light's shadow length falls into the well (deeper wells take more).
 * Floors stay above --sdl-sunken so a light-mode cast (which IS sunken) is still a step down.
 */
const WELLS = [
  { key: 'track', outer: 1, inner: 0.8, wall: 2, cast: 0.45, tone: 'color-mix(in oklab, var(--relief-floor) 55%, var(--relief-wall-shade))' },
  { key: 'groove', outer: 0.7, inner: 0.6, wall: 2.5, cast: 0.3, tone: 'color-mix(in oklab, var(--relief-floor) 22%, var(--relief-wall-shade))' },
  { key: 'sanctum', outer: 0.42, inner: 0, wall: 3.5, cast: 0.7, tone: 'color-mix(in oklab, var(--relief-floor) 55%, var(--relief-wall-shade))' },
];

/** Fraction `f` of the day on a ring of radius `rho`: 0 at the bottom, 0.25 right, 0.5 top. */
const at = (cx, cy, rho, f) => [cx + rho * Math.sin(TAU * f), cy + rho * Math.cos(TAU * f)];

const circle = (x, y, rho) =>
  `M${p(x - rho)} ${p(y)}a${p(rho)} ${p(rho)} 0 1 0 ${p(2 * rho)} 0a${p(rho)} ${p(rho)} 0 1 0 ${p(-2 * rho)} 0Z`;

/**
 * Arc from `f1` to `f2` (f2 > f1). Rising f turns counter-clockwise on screen, which is SVG's
 * negative sweep. A whole turn is drawn as two halves, since one arc cannot end where it starts.
 */
function arc(cx, cy, rho, f1, f2) {
  const span = f2 - f1;
  if (span >= 0.999) return arc(cx, cy, rho, f1, f1 + 0.5) + arc(cx, cy, rho, f1 + 0.5, f1 + 0.9999);
  const [x1, y1] = at(cx, cy, rho, f1);
  const [x2, y2] = at(cx, cy, rho, f2);
  return `M${p(x1)} ${p(y1)}A${p(rho)} ${p(rho)} 0 ${span > 0.5 ? 1 : 0} 0 ${p(x2)} ${p(y2)}`;
}

/** Ring slice between radii `r1` < `r2`, from `f1` to `f2`. */
function sector(cx, cy, r1, r2, f1, f2) {
  const [ax, ay] = at(cx, cy, r2, f1);
  const [bx, by] = at(cx, cy, r2, f2);
  const [ix, iy] = at(cx, cy, r1, f2);
  const [jx, jy] = at(cx, cy, r1, f1);
  return `M${p(ax)} ${p(ay)}A${p(r2)} ${p(r2)} 0 0 0 ${p(bx)} ${p(by)}L${p(ix)} ${p(iy)}A${p(r1)} ${p(r1)} 0 0 1 ${p(jx)} ${p(jy)}Z`;
}

/**
 * The well's outline beside a copy of it moved by (ox, oy), as one even-odd path. Clipped to the
 * well, what is left is a crescent on the outer wall opposite the offset, plus one beside the island
 * (inner edge) on the offset's side — exactly where a wall shows when the light comes from -offset.
 */
function crescents(cx, cy, outer, inner, ox, oy) {
  let d = circle(cx, cy, outer) + circle(cx + ox, cy + oy, outer);
  if (inner > 0) d += circle(cx, cy, inner) + circle(cx + ox, cy + oy, inner);
  return d;
}

const ring = (cx, cy, outer, inner) => circle(cx, cy, outer) + (inner > 0 ? circle(cx, cy, inner) : '');

/** Today's timed events as dial fractions, clamped to the day, earliest first. */
function agendaSpans(events, dayStart, nextDay) {
  if (!Array.isArray(events)) return [];
  const frac = (t) => (t <= dayStart ? 0 : t >= nextDay ? 1 : dayFraction(new Date(t)));
  const spans = [];
  for (const e of events) {
    if (!e || e.allDay) continue;
    const start = Date.parse(e.start);
    if (!Number.isFinite(start)) continue;
    const parsedEnd = Date.parse(e.end);
    const end = Number.isFinite(parsedEnd) && parsedEnd >= start ? parsedEnd : start;
    if (end < dayStart || start >= nextDay) continue;
    const f1 = Math.min(frac(start), 1 - MIN_SPAN);
    spans.push({ f1, f2: Math.max(frac(end), f1 + MIN_SPAN), end });
  }
  return spans.sort((a, b) => a.f1 - b.f1).slice(0, MAX_EVENTS);
}

/**
 * A raised arc: its cast on the shadow side, the body, and a narrow bevel highlight nudged toward
 * the light (inside the body, so it reads as the lit shoulder wherever the arc turns).
 */
function raised(key, d, { width, color, cast, light, opacity = 1 }) {
  const hi = width * 0.24;
  return [
    <path
      key={`${key}c`}
      d={d}
      transform={`translate(${p(cast[0])} ${p(cast[1])})`}
      style={{ fill: 'none', stroke: 'var(--relief-cast)', opacity: `calc(var(--relief-cast-opacity) * ${p(0.8 * opacity)})` }}
      strokeWidth={p(width)}
      strokeLinecap="round"
    />,
    <path key={`${key}b`} d={d} style={{ fill: 'none', stroke: color }} opacity={opacity} strokeWidth={p(width)} strokeLinecap="round" />,
    <path
      key={`${key}h`}
      d={d}
      transform={`translate(${p(light[0] * hi)} ${p(light[1] * hi)})`}
      style={{ fill: 'none', stroke: 'var(--relief-rim)' }}
      opacity={opacity}
      strokeWidth={p(width * 0.28)}
      strokeLinecap="round"
    />,
  ];
}

const svgProps = (w, h) => ({
  width: w,
  height: h,
  viewBox: `0 0 ${w} ${h}`,
  style: { position: 'absolute', inset: 0 },
});

function ChronoRelief({ light, ctx, now, box }) {
  const uid = useId().replace(/[^\w-]/g, '');
  const { w, h, cx, cy, r } = box;

  const lx = finite(light?.dx, 0);
  const ly = finite(light?.dy, -1);
  const len = Math.hypot(lx, ly) || 1;
  // Unit vector away from the light; the shadow vector's length is the sun's height.
  const ux = -lx / len;
  const uy = -ly / len;
  const sx = finite(light?.shadowDx, ux * 12);
  const sy = finite(light?.shadowDy, uy * 12);
  const elev = clamp(finite(light?.elevation, 0.5), 0, 1);
  const isDay = light?.isDay !== false;

  const minute = now.getMinutes();
  const dayFrac = dayFraction(now);
  const nowMs = now.getTime();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

  // Pixel sizes were tuned at r = 312 (a 14" MacBook's work area); larger screens scale them up.
  const k = clamp(r / 312, 0.8, 2);

  /* ── The carved dial: wells, ticks, minute groove, gnomon shadow ───────────────────────────── */
  const dial = useMemo(() => {
    const wells = WELLS.map((well) => {
      const outer = well.outer * r;
      const inner = well.inner * r;
      const wallX = ux * well.wall * k;
      const wallY = uy * well.wall * k;
      const castX = wallX + sx * well.cast * k;
      const castY = wallY + sy * well.cast * k;
      return {
        key: well.key,
        tone: well.tone,
        outline: ring(cx, cy, outer, inner),
        cast: crescents(cx, cy, outer, inner, castX, castY),
        wall: crescents(cx, cy, outer, inner, wallX, wallY),
        // Bevel = (dx, dy) * 1.5 px, as solar.js stamps --bevel-x/--bevel-y.
        rim: crescents(cx, cy, outer, inner, lx * 1.5, ly * 1.5),
      };
    });

    // Hour ticks engraved in the track floor; the four cardinal hours run longer.
    let ticks = '';
    for (let hr = 0; hr < 24; hr += 1) {
      const major = hr % 6 === 0;
      const [x1, y1] = at(cx, cy, r * (major ? 0.948 : 0.963), hr / 24);
      const [x2, y2] = at(cx, cy, r * 0.984, hr / 24);
      ticks += `M${p(x1)} ${p(y1)}L${p(x2)} ${p(y2)}`;
    }

    // The machined groove: sixty segments whose sheen follows the light like brushed steel turned
    // on a lathe — brightest along the line through the centre toward the light, on both sides.
    const minutes = [];
    const gap = 0.0018;
    for (let m = 0; m < 60; m += 1) {
      const f1 = 0.5 + m / 60;
      const f2 = f1 + 1 / 60;
      const mid = TAU * (f1 + 1 / 120);
      const facing = Math.abs(Math.sin(mid) * lx + Math.cos(mid) * ly);
      minutes.push({
        d: sector(cx, cy, r * 0.612, r * 0.688, f1 + gap, f2 - gap),
        sheen: p((0.1 + 0.8 * facing ** 5) * (isDay ? 1 : 0.6)),
      });
    }

    const numerals = [0, 6, 12, 18].map((hr) => {
      const [x, y] = at(cx, cy, r * 0.75, hr / 24);
      return { hr, x: p(x), y: p(y), label: String(hr).padStart(2, '0') };
    });

    // The gnomon's shadow on the sanctuary floor: longer as the sun (or moon) sinks.
    const g = clamp(r * 0.05, 9, 30);
    const reach = g + r * (0.06 + 0.3 * (1 - elev));
    const tipX = cx + ux * reach;
    const tipY = cy + uy * reach;
    const shadow = [
      [cx - uy * g, cy + ux * g],
      [tipX - uy * g * 0.55, tipY + ux * g * 0.55],
      [tipX + uy * g * 0.55, tipY - ux * g * 0.55],
      [cx + uy * g, cy - ux * g],
    ]
      .map(([x, y]) => `${p(x)},${p(y)}`)
      .join(' ');

    return {
      wells, ticks, minutes, numerals, shadow, tip: [p(tipX), p(tipY)],
      fontSize: p(clamp(r * 0.042, 10, 22)),
      tickWidth: p(Math.max(1, r * 0.0042)),
    };
  }, [cx, cy, r, k, lx, ly, ux, uy, sx, sy, elev, isDay]);

  /* ── Data: the day, today's agenda, or the to-do list ──────────────────────────────────────── */
  const spans = useMemo(() => agendaSpans(ctx?.agenda, dayStart, nextDay), [ctx?.agenda, dayStart, nextDay]);
  const todoRatio = ctx?.todoRatio;

  const data = useMemo(() => {
    const marks = [];
    const toLight = [lx / len, ly / len];

    // Day progress, bevelled in the accent, from midnight round to now.
    if (dayFrac > 0.002) {
      marks.push(
        ...raised('day', arc(cx, cy, r * 0.918, 0, dayFrac), {
          width: r * 0.032, color: 'var(--sdl-accent)', light: toLight,
          cast: [ux + sx * 0.18 * k, uy + sy * 0.18 * k],
        }),
      );
    }

    if (spans.length) {
      // Raised blocks for the day's meetings; the ones already over sit back a little.
      spans.forEach((s, i) => {
        marks.push(
          ...raised(`ev${i}`, arc(cx, cy, r * 0.85, s.f1, s.f2), {
            width: r * 0.048,
            color: i % 2 ? 'var(--sdl-bar-b)' : 'var(--sdl-bar-a)',
            light: toLight,
            cast: [ux * 1.5 + sx * 0.26 * k, uy * 1.5 + sy * 0.26 * k],
            opacity: s.end <= nowMs ? 0.5 : 1,
          }),
        );
      });
    } else if (typeof todoRatio === 'number' && Number.isFinite(todoRatio)) {
      // No meetings: the to-do list on its own slim track across the island, from the bottom like
      // the day, so the two can be read against each other.
      const tw = r * 0.034;
      const track = circle(cx, cy, r * 0.51);
      // The crease is the track's near wall, which faces away from the light: a shadow, not a mark.
      marks.push(
        <path
          key="todo-track"
          d={track}
          style={{ fill: 'none', stroke: 'color-mix(in oklab, var(--relief-floor) 30%, var(--relief-wall-shade))' }}
          strokeWidth={p(tw)}
        />,
        <path
          key="todo-crease"
          d={track}
          transform={`translate(${p(toLight[0] * tw * 0.36)} ${p(toLight[1] * tw * 0.36)})`}
          style={{ fill: 'none', stroke: 'var(--relief-crease)' }}
          opacity={0.6}
          strokeWidth={p(tw * 0.28)}
        />,
      );
      const ratio = clamp(todoRatio, 0, 1);
      if (ratio > 0.002) {
        marks.push(
          ...raised('todo', arc(cx, cy, r * 0.51, 0, ratio), {
            width: tw * 0.62, color: 'var(--sdl-bar-a)', light: toLight,
            cast: [ux + sx * 0.16 * k, uy + sy * 0.16 * k],
          }),
        );
      }
    }

    // Now: a hairline across the track and a small pip on the plane just outside it.
    const [ax, ay] = at(cx, cy, r * 0.8, dayFrac);
    const [bx, by] = at(cx, cy, r * 0.995, dayFrac);
    const [px, py] = at(cx, cy, r * 1.045, dayFrac);
    const pip = clamp(r * 0.011, 2.5, 6);
    marks.push(
      <path
        key="now-line"
        d={`M${p(ax)} ${p(ay)}L${p(bx)} ${p(by)}`}
        style={{ fill: 'none', stroke: 'var(--sdl-ink)' }}
        opacity={0.28}
        strokeWidth={p(Math.max(1, r * 0.0035))}
        strokeLinecap="round"
      />,
      <circle
        key="now-cast"
        cx={p(px + ux + sx * 0.12 * k)}
        cy={p(py + uy + sy * 0.12 * k)}
        r={p(pip)}
        style={{ fill: 'var(--relief-cast)', opacity: 'calc(var(--relief-cast-opacity) * 0.7)' }}
      />,
      <circle key="now-pip" cx={p(px)} cy={p(py)} r={p(pip)} style={{ fill: 'var(--sdl-accent)' }} />,
    );
    return marks;
  }, [cx, cy, r, k, lx, ly, len, ux, uy, sx, sy, dayFrac, spans, todoRatio, nowMs]);

  /* ── The gnomon pin, nearest of all ────────────────────────────────────────────────────────── */
  const g = clamp(r * 0.05, 9, 30);
  const lift = clamp(r * 0.012, 2, 6);
  const glowAt = [p(cx + (lx / len) * r * 0.18), p(cy + (ly / len) * r * 0.18)];
  const id = (name) => `${uid}-${name}`;

  return (
    <>
      <div className="relief-layer" style={{ '--depth': 0 }}>
        <svg {...svgProps(w, h)}>
          <defs>
            <radialGradient id={id('glow')} gradientUnits="userSpaceOnUse" cx={glowAt[0]} cy={glowAt[1]} r={p(r * 1.9)}>
              <stop offset="0" style={{ stopColor: 'var(--relief-lit)', stopOpacity: isDay ? 0.6 : 0.35 }} />
              <stop offset="1" style={{ stopColor: 'var(--relief-lit)', stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          <rect width={w} height={h} style={{ fill: `url(#${id('glow')})` }} />
        </svg>
      </div>

      <div className="relief-layer" style={{ '--depth': 4 }}>
        <svg {...svgProps(w, h)}>
          <defs>
            {dial.wells.map((well) => (
              <clipPath key={well.key} id={id(well.key)}>
                <path d={well.outline} clipRule="evenodd" />
              </clipPath>
            ))}
            <linearGradient
              id={id('gnomon')}
              gradientUnits="userSpaceOnUse"
              x1={cx}
              y1={cy}
              x2={dial.tip[0]}
              y2={dial.tip[1]}
            >
              <stop offset="0" style={{ stopColor: 'var(--relief-cast)', stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: 'var(--relief-cast)', stopOpacity: 0.2 }} />
            </linearGradient>
          </defs>

          {dial.wells.map((well) => (
            <g key={well.key}>
              <path d={well.outline} fillRule="evenodd" style={{ fill: well.tone }} />
              {well.key === 'groove' &&
                dial.minutes.map((seg, m) => (
                  <path
                    key={m}
                    d={seg.d}
                    style={{ fill: m === minute ? 'var(--relief-mark)' : 'var(--relief-rim)' }}
                    opacity={m === minute ? 1 : seg.sheen}
                  />
                ))}
              {well.key === 'track' && (
                <>
                  <path
                    d={dial.ticks}
                    transform={`translate(${p(ux)} ${p(uy)})`}
                    style={{ fill: 'none', stroke: 'var(--relief-rim)' }}
                    strokeWidth={dial.tickWidth}
                    strokeLinecap="round"
                  />
                  <path d={dial.ticks} style={{ fill: 'none', stroke: 'var(--relief-tick)' }} strokeWidth={dial.tickWidth} strokeLinecap="round" />
                </>
              )}
              {well.key === 'sanctum' && (
                <polygon
                  points={dial.shadow}
                  clipPath={`url(#${id('sanctum')})`}
                  style={{ fill: `url(#${id('gnomon')})`, opacity: 'var(--relief-cast-opacity)' }}
                />
              )}
              <path
                d={well.cast}
                fillRule="evenodd"
                clipPath={`url(#${id(well.key)})`}
                style={{ fill: 'var(--relief-cast)', opacity: 'calc(var(--relief-cast-opacity) * 0.5)' }}
              />
              <path d={well.wall} fillRule="evenodd" clipPath={`url(#${id(well.key)})`} style={{ fill: 'var(--relief-crease)' }} />
              <path d={well.rim} fillRule="evenodd" clipPath={`url(#${id(well.key)})`} style={{ fill: 'var(--relief-rim)' }} />
              <path d={well.outline} style={{ fill: 'none', stroke: 'var(--relief-hairline)' }} strokeWidth={1} />
            </g>
          ))}

          {dial.numerals.map((n) => (
            <text
              key={n.hr}
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: 'var(--relief-tick)', fontFamily: ROUNDED, fontSize: dial.fontSize, fontWeight: 600, letterSpacing: '0.04em' }}
            >
              {n.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="relief-layer" style={{ '--depth': 8 }}>
        <svg {...svgProps(w, h)}>{data}</svg>
      </div>

      <div className="relief-layer" style={{ '--depth': 12 }}>
        <svg {...svgProps(w, h)}>
          <defs>
            <radialGradient id={id('cap')} cx="50%" cy="50%" r="50%" fx={`${p(50 + (lx / len) * 30)}%`} fy={`${p(50 + (ly / len) * 30)}%`}>
              <stop offset="0" style={{ stopColor: 'var(--relief-cap)', stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: 'var(--relief-plateau)', stopOpacity: 1 }} />
            </radialGradient>
          </defs>
          {/* The pin's side, showing on the shadow side below its cap; the cap brightens toward the light. */}
          <circle cx={p(cx + ux * lift)} cy={p(cy + uy * lift)} r={p(g)} style={{ fill: 'var(--relief-wall-shade)' }} />
          <circle cx={cx} cy={cy} r={p(g)} style={{ fill: `url(#${id('cap')})`, stroke: 'var(--relief-hairline)' }} strokeWidth={1} />
          <circle cx={cx} cy={cy} r={p(g * 0.22)} style={{ fill: 'var(--relief-tick)' }} />
        </svg>
      </div>
    </>
  );
}

export default React.memo(ChronoRelief);
