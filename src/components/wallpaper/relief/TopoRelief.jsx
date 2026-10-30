import React, { memo, useId, useMemo } from 'react';
import { dayOfYear, dayFraction } from '../../../wallpaper/time';
import { describeCode } from '../../../wallpaper/weather';

/**
 * "Weather Contours": a layered topographic relief across the whole stage, lit by the sun's real
 * position. Twenty-four ridges are painted back (top) to front (bottom), each filled down to the
 * stage's bottom edge, so the ridges in front occlude the ones behind — plain painter's algorithm,
 * no 3D. The weather shapes the land: calm skies give wide, slow swells; wind leans and tightens
 * them; cloud flattens them and dims the highlights; rain drops ripple rings on the front contours.
 *
 * The land is a function of the box, the day, the ten-minute bucket and the weather; the light is
 * quantized to 3° steps. So the picture changes every ten minutes or so, not on every minute tick.
 * No filters: softness comes from stepped bands.
 */

const RIDGES = 24;
const FAR = 12; // ridges [0, FAR) sit on the far plane, the rest on the near one
const POINTS = 56; // samples per ridge; midpoint quadratics smooth them
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
const f1 = (n) => String(Math.round(n * 10) / 10);
/** A fixed pseudo-random fraction for (a, b): the day's variation, never Math.random. */
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Cloud cover when the weather carries only a WMO code (the widget's Open-Meteo shape). */
const cloudFromCode = (code) => {
  if (!Number.isFinite(code) || code <= 0) return 0;
  if (code === 1) return 0.25;
  if (code === 2) return 0.5;
  return 0.9;
};

/** Ripple rings per drop for rain codes; 0 below drizzle and for snow (the widget's own Snow class). */
const ringsFor = (code) => {
  if (!(code >= 51) || describeCode(code).label === 'Snow') return 0;
  if (code <= 57) return 2; // drizzle
  if (code >= 80) return 4; // showers, thunderstorms
  return 3;
};

/* ── Paths ─────────────────────────────────────────────────────────────────── */

/** Midpoint-quadratic continuation through `pts`, starting with a line to the first point. */
const smoothTail = (pts) => {
  let d = `L${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    d += `Q${f1(x)} ${f1(y)} ${f1((x + pts[i + 1][0]) / 2)} ${f1((y + pts[i + 1][1]) / 2)}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${f1(last[0])} ${f1(last[1])}`;
};

const smooth = (pts) => `M${smoothTail(pts).slice(1)}`;

/* ── Terrain ───────────────────────────────────────────────────────────────── */

/**
 * The ridge lines for this box, day, ten-minute bucket and weather. Weather in, shape out:
 *   calm (null or code ≤ 2) → low, wide harmonics; otherwise a busier mix;
 *   windSpeed → higher frequency and a skewed (leaning) wave; windDir → which way it leans and drifts;
 *   cloudCover → flatter swells.
 * The focal centre gets a gentle valley: ridges near (cx, cy) sag and quieten, so the work area
 * stays the calmest part of the picture.
 */
function buildTerrain({ w, h, cx, cy, r }, weather, doy, dayT) {
  const code = weather ? num(weather.code, 0) : null;
  const calm = code === null || code <= 2;
  const windT = clamp(num(weather?.windSpeed, 0), 0, 60) / 60;
  // Meteorological windDir is where the wind comes FROM; the land leans the way it blows.
  const toward = Math.sin((num(weather?.windDir, 270) + 180) * DEG);
  const lean = Math.abs(toward) > 0.05 ? Math.sign(toward) : hash(doy, 9) > 0.5 ? 1 : -1;
  const skew = toward * windT * 0.75; // |skew| < 1 keeps the wave single-valued
  const cloud = weather ? clamp(num(weather.cloudCover, cloudFromCode(code)), 0, 1) : 0;

  const freqScale = 1 + windT * 1.3;
  const harmonics = calm
    ? [[0.85, 1], [1.9, 0.28], [3.1, 0.07]]
    : [[1.15, 1], [2.4, 0.45], [4.0, 0.22]];
  const ampSum = harmonics.reduce((s, [, a]) => s + a, 0);
  const seeds = harmonics.map((_, k) => hash(doy, k) * TAU);
  const perRidge = (0.14 + 0.32 * windT) * lean; // phase step back to front: the lean
  const tide = dayT * Math.PI * lean; // half a swell of drift across the day, with the wind

  const top = h * 0.11;
  const front = h * 0.965;
  const pad = 40; // past the edges, so parallax never shows a ridge's end
  const ampBase = h * 0.085 * (1 - 0.5 * cloud);
  const sag = r * 0.2;
  const spread = Math.max(r, 1); // a 0×0 box (r = 0) must not divide 0 by 0

  const ridges = [];
  for (let i = 0; i < RIDGES; i++) {
    const t = i / (RIDGES - 1);
    const baseY = top + (front - top) * (0.35 * t + 0.65 * t ** 1.6);
    const amp = ampBase * (0.3 + 0.7 * t) * (0.8 + 0.2 * Math.sin(i * 1.3 + seeds[0]));
    const gy = Math.exp(-(((baseY - cy) / (spread * 1.1)) ** 2));
    const pts = [];
    for (let p = 0; p < POINTS; p++) {
      const x = -pad + ((w + pad * 2) * p) / (POINTS - 1);
      const u = w > 0 ? x / w : 0;
      let hgt = 0;
      harmonics.forEach(([f, a], k) => {
        const th = TAU * f * freqScale * u + seeds[k] + perRidge * i * (1 + 0.3 * k) - tide;
        hgt += a * Math.sin(th + skew * Math.sin(th));
      });
      const focal = Math.exp(-(((x - cx) / (spread * 1.6)) ** 2)) * gy;
      pts.push([x, baseY - amp * (1 - 0.4 * focal) * (hgt / ampSum) + sag * focal]);
    }
    ridges.push({ i, t, baseY, amp, pts, crest: smooth(pts), haze: t < 0.34 ? 0 : t < 0.67 ? 1 : 2 });
  }
  // Each body only needs to reach below the next ridge's lowest point: the next body covers the
  // rest. That keeps every body's bounding box close to its visible band, so a few shared
  // objectBoundingBox gradients shade all 24. The far plane's last ridge reaches further, so
  // parallax between the two planes (6px apart at full tilt) never opens a gap.
  ridges.forEach((rd) => {
    const next = ridges[rd.i + 1];
    const floor = next ? Math.max(...next.pts.map(([, y]) => y)) + (rd.i === FAR - 1 ? 16 : 3) : h + pad;
    rd.body = `${rd.crest}L${f1(w + pad)} ${f1(floor)}L${f1(-pad)} ${f1(floor)}Z`;
  });
  return { ridges, cloud, rings: ringsFor(code), pad };
}

/* ── Light ─────────────────────────────────────────────────────────────────── */

/**
 * What the light does to each ridge: the slopes facing it (two strengths) and the cast band under
 * the crest. A crest's upward normal is (y′, −1)/|·|; its dot with the light vector says how
 * squarely the slope faces the sun. "Lit" is measured against a flat crest under the same light,
 * so the overhead noon sun lights the tops and a low sun picks out the slopes turned toward it.
 */
function buildLighting(terrain, { dx, dy, shadowDx, shadowDy }, h) {
  const flat = Math.max(-dy, 0.25);
  const soft = flat * 0.97;
  const strong = soft + 0.04 + 0.12 * Math.abs(dx);
  const mid = (soft + strong) / 2;

  return terrain.ridges.map(({ t, pts }) => {
    const dots = pts.map((_, p) => {
      const a = pts[Math.max(0, p - 1)];
      const b = pts[Math.min(pts.length - 1, p + 1)];
      const slope = (b[1] - a[1]) / (b[0] - a[0]);
      return (slope * dx - dy) / Math.sqrt(1 + slope * slope);
    });
    const runs = (limit) => {
      let d = '';
      let run = [];
      const flush = () => {
        if (run.length >= 2) d += smooth(run);
        run = [];
      };
      pts.forEach((pt, p) => (dots[p] > limit ? run.push(pt) : flush()));
      flush();
      return d;
    };

    // The cast band: the crest, shifted along the shadow, kept below the crest it hangs from.
    const band = (scale, base) => {
      const sx = shadowDx * scale;
      const sy = shadowDy * scale + base;
      const lower = pts.map(([x, y], p) => {
        const q = clamp(Math.round(p - (sx / (pts[1][0] - pts[0][0]))), 0, pts.length - 1);
        return [x, Math.min(h + 60, Math.max(y + 0.4, pts[q][1] + sy))];
      });
      return `${smooth(pts)}${smoothTail(lower.reverse())}Z`;
    };
    const reach = 0.35 + 0.65 * t; // near ridges stand taller, so they cast further

    return {
      // Three nested runs, each shorter and brighter: a highlight that ramps in, not a dash.
      soft: runs(soft),
      mid: runs(mid),
      strong: runs(strong),
      cast: band(reach * 0.45, 0.6 + 1.4 * t),
      castSoft: band(reach, 1.5 + 3 * t),
    };
  });
}

/* ── Ripples ───────────────────────────────────────────────────────────────── */

/** Drop sites on the front ridges, from the day; flattened ("isometric") ring radii. */
function buildRipples(terrain, { w, r }, doy) {
  if (!terrain.rings) return [];
  const drops = terrain.rings >= 3 ? 3 : 2;
  return Array.from({ length: drops }, (_, j) => {
    const ridge = terrain.ridges[16 + Math.floor(hash(doy, 30 + j) * 6)];
    const x = w * (0.12 + 0.76 * ((hash(doy, 20 + j) + j / drops) % 1));
    const { pts } = ridge;
    const step = pts[1][0] - pts[0][0];
    const p = clamp(Math.floor((x - pts[0][0]) / step), 0, pts.length - 2);
    const k = (x - pts[p][0]) / step;
    const y = pts[p][1] + (pts[p + 1][1] - pts[p][1]) * k + ridge.amp * 0.6;
    const rings = Array.from({ length: terrain.rings }, (_, n) => {
      const rx = r * (0.09 + 0.1 * n) * (0.8 + 0.4 * ridge.t);
      return { rx, ry: rx * 0.34, fade: 1 - (0.6 * n) / terrain.rings };
    });
    return { x, y, t: ridge.t, rings };
  });
}

/* ── Scene ─────────────────────────────────────────────────────────────────── */

const svgProps = (box) => ({
  width: box.w,
  height: box.h,
  viewBox: `0 0 ${box.w} ${box.h}`,
  style: { position: 'absolute', inset: 0, overflow: 'visible' },
});

/** The crest stroke's gradient: leeward side of the stage → sunward side, rotated to the light. */
const SunGradient = ({ id, box, angle, contrast }) => {
  const half = Math.hypot(box.w, box.h) / 2;
  const mx = box.w / 2;
  const my = box.h / 2;
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={f1(mx)} y1={f1(my + half)} x2={f1(mx)} y2={f1(my - half)}
      gradientTransform={`rotate(${f1(angle)} ${f1(mx)} ${f1(my)})`}
    >
      <stop offset="0" style={{ stopColor: 'var(--sdl-sec)', stopOpacity: 0.14 }} />
      <stop offset="0.55" style={{ stopColor: 'var(--relief-rim)', stopOpacity: 1 }} />
      <stop offset="1" style={{ stopColor: 'var(--sdl-accent)', stopOpacity: +(0.85 * contrast).toFixed(2) }} />
    </linearGradient>
  );
};

/**
 * A ridge body's tone, top to bottom of its band: a lit crest stepping down to the shaded wall.
 * Three haze tiers: far ridges' crests lean toward the floor tone.
 */
const HAZE = [50, 75, 100];
const BodyGradient = ({ id, tier }) => {
  const mix = HAZE[tier];
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style={{ stopColor: `color-mix(in oklab, var(--relief-lit) ${mix}%, var(--relief-floor))`, stopOpacity: 1 }} />
      <stop offset="0.4" style={{ stopColor: 'var(--relief-floor)', stopOpacity: 1 }} />
      <stop offset="1" style={{ stopColor: 'var(--relief-wall-shade)', stopOpacity: 1 }} />
    </linearGradient>
  );
};

const TopoRelief = ({ light, ctx, now, box }) => {
  const uid = `topo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const weather = ctx?.weather ?? null;
  const doy = dayOfYear(now);
  // Ten-minute buckets: the tide drifts the crests about 2px a bucket, so the land is rebuilt at
  // most six times an hour, not on every minute tick for a sub-pixel move.
  const bucket = Math.floor(dayFraction(now) * 144);
  const dayT = bucket / 144;
  const { code, windSpeed, windDir, cloudCover } = weather ?? {};
  const hasWeather = weather !== null;

  const { w, h, cx, cy, r } = box;

  const terrain = useMemo(
    () => buildTerrain({ w, h, cx, cy, r }, hasWeather ? { code, windSpeed, windDir, cloudCover } : null, doy, dayT),
    [w, h, cx, cy, r, hasWeather, code, windSpeed, windDir, cloudCover, doy, dayT],
  );
  // The light is quantized coarsely rather than held: 3° steps (the sun turns about 0.25° a minute,
  // so a step every ~12 minutes), whole 2px shadow steps and 0.05 of elevation. The values make
  // stable memo deps between steps, yet a real change — a new place, the switch to clock-only —
  // shows at once, as it does in the other scenes. `+ 0` turns a rounded -0 into 0.
  const angle = (Math.round(light.angleDeg / 3) * 3) % 360;
  const dx = Math.round(Math.sin(angle * (Math.PI / 180)) * 100) / 100 + 0;
  const dy = Math.round(-Math.cos(angle * (Math.PI / 180)) * 100) / 100 + 0;
  const shadowLen = Math.round(Math.hypot(light.shadowDx, light.shadowDy) / 2) * 2;
  const shadowDx = Math.round(-dx * shadowLen) + 0;
  const shadowDy = Math.round(-dy * shadowLen) + 0;
  const elevation = Math.round(light.elevation * 20) / 20;
  const lit = useMemo(
    () => buildLighting(terrain, { dx, dy, shadowDx, shadowDy }, h),
    [terrain, dx, dy, shadowDx, shadowDy, h],
  );
  const ripples = useMemo(() => buildRipples(terrain, { w, r }, doy), [terrain, w, r, doy]);

  // Cloud and night both lower the highlight contrast; the low sun of morning and evening raises it.
  const contrast = (1 - 0.55 * terrain.cloud) * (light.isDay ? 1 : 0.65) * (1.1 - 0.2 * elevation);
  const drawRidge = (rd, tag) => {
    const L = lit[rd.i];
    return (
      <React.Fragment key={rd.i}>
        <path d={rd.body} fill={`url(#${uid}-body-${tag}-${rd.haze})`} />
        <path d={L.castSoft} fill="var(--relief-cast)" style={{ opacity: 'calc(var(--relief-cast-opacity) * 0.35)' }} />
        <path d={L.cast} fill="var(--relief-cast)" style={{ opacity: 'var(--relief-cast-opacity)' }} />
        <path d={rd.crest} fill="none" stroke={`url(#${uid}-sun-${tag})`} strokeWidth={f1(1 + 0.6 * rd.t)} strokeOpacity={+((0.35 + 0.65 * rd.t) * Math.min(1, contrast)).toFixed(2)} strokeLinecap="round" />
        {L.soft && <path d={L.soft} fill="none" stroke="var(--relief-rim)" strokeWidth={f1(1.4 + 1.6 * rd.t)} strokeOpacity="0.6" strokeLinecap="round" />}
        {L.mid && <path d={L.mid} fill="none" stroke="var(--relief-rim)" strokeWidth={f1(1.4 + 1.6 * rd.t)} strokeLinecap="round" />}
        {L.strong && (
          <path d={L.strong} fill="none" stroke="var(--sdl-accent)" strokeWidth={f1(1 + 1.2 * rd.t)} strokeOpacity={+((0.2 + 0.4 * rd.t) * contrast).toFixed(2)} strokeLinecap="round" />
        )}
      </React.Fragment>
    );
  };

  const plane = (from, to, tag) => {
    const set = terrain.ridges.slice(from, to);
    return (
      <svg {...svgProps(box)}>
        <defs>
          <SunGradient id={`${uid}-sun-${tag}`} box={box} angle={angle} contrast={contrast} />
          {[...new Set(set.map((rd) => rd.haze))].map((tier) => (
            <BodyGradient key={tier} id={`${uid}-body-${tag}-${tier}`} tier={tier} />
          ))}
        </defs>
        {set.map((rd) => drawRidge(rd, tag))}
      </svg>
    );
  };

  // Ripple rings are raised: the edge toward the light catches it, the far edge falls into shade.
  const bevel = (t) => 1.2 + 0.8 * t;

  return (
    <>
      <div className="relief-layer" style={{ '--depth': 2 }}>{plane(0, FAR, 'far')}</div>
      <div className="relief-layer" style={{ '--depth': 8 }}>{plane(FAR, RIDGES, 'near')}</div>
      {ripples.length > 0 && (
        <div className="relief-layer" style={{ '--depth': 12 }}>
          <svg {...svgProps(box)}>
            {ripples.map((drop, j) =>
              drop.rings.map((ring, n) => (
                <React.Fragment key={`${j}-${n}`}>
                  <ellipse
                    cx={f1(drop.x - dx * bevel(drop.t))} cy={f1(drop.y - dy * bevel(drop.t))} rx={f1(ring.rx)} ry={f1(ring.ry)}
                    fill="none" stroke="var(--relief-cast)" strokeWidth="1.6"
                    style={{ opacity: `calc(var(--relief-cast-opacity) * ${(0.5 * ring.fade).toFixed(2)})` }}
                  />
                  <ellipse
                    cx={f1(drop.x + dx * bevel(drop.t))} cy={f1(drop.y + dy * bevel(drop.t))} rx={f1(ring.rx)} ry={f1(ring.ry)}
                    fill="none" stroke="var(--relief-rim)" strokeWidth="1.2"
                    strokeOpacity={+(ring.fade * Math.min(1, 0.6 + contrast * 0.4)).toFixed(2)}
                  />
                </React.Fragment>
              )),
            )}
          </svg>
        </div>
      )}
    </>
  );
};

export default memo(TopoRelief);
