import { memo, useId, useMemo } from 'react';
import { dayFraction } from '../../../wallpaper/time';

/**
 * "Focus Monolith": an axonometric monument in the work area, after Monument Valley — a stepped
 * plinth with a stair and a door, a spire that grows through the day, and two collars that turn
 * into line with the grid as the day goes on. Light channels cut into the walls fill with the
 * to-do list: none lit with no tasks, all of them (and a beacon on the apex) when everything's done.
 * With a focus line set for today, the door takes a quiet accent tone.
 *
 * Pure SVG in a 30° isometric projection. Every block is drawn as three tonal faces: the top in
 * --relief-plateau, the wall facing the sun (picked by light.dx) in --relief-wall-lit, the other in
 * --relief-wall-shade, hairline edges and a rim on the lit top edge. Blocks are coaxial, so drawing
 * them bottom to top is the painter's order. The cast shadow is the union of each block's hull,
 * slid along (shadowDx, shadowDy) in proportion to its height. The hulls go in ONE path per shadow
 * group: hull() always winds the same way, so the nonzero fill paints their union once and the
 * translucent fade never darkens twice where they overlap. No filters: the halo round a lit channel
 * is a radial gradient.
 *
 * Geometry is in units of box.r and only changes with the minute, the box, or the light's side and
 * shadow, so it is memoised on those.
 */

const C30 = Math.cos(Math.PI / 6);
const CHANNELS = 8;

/* Plinth tiers and spire, in units of box.r. */
const TIERS = [
  { hx: 0.42, z0: 0, z1: 0.09 },
  { hx: 0.31, z0: 0.09, z1: 0.17 },
  { hx: 0.21, z0: 0.17, z1: 0.23 },
];
const STAIR = { w: 0.07, depth: 0.045, steps: 3 };
const SPIRE = { hx: 0.075, min: 0.32, grow: 0.5, cap: 0.16 };
const COLLAR = { hx: 0.135, t: 0.03 };
/** Where each collar sits on the spire, how far out of line it starts, and the day window it locks in. */
const COLLARS = [
  { at: 0.36, turn: 28, from: 0.25, to: 0.5 },
  { at: 0.68, turn: -20, from: 0.375, to: 0.75 },
];
/** Shadow px per px of height at shadowDx/Dy = 1, so 28px (a low sun) throws 1.75× the height. */
const SHADOW_PER_PX = 1 / 16;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ramp = (v, a, b) => smooth(clamp01((v - a) / (b - a)));
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
/** Several polygons as one path's subpaths, so a nonzero fill paints their union once. */
const union = (polys) => polys.map((p) => `M${pts(p).replace(/ /g, 'L')}Z`).join('');
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Andrew's monotone chain: the convex hull of screen points, for shadow outlines. */
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half(p.reverse())];
}

/** A block's footprint corners in world units: +x face first (k = 0), then +y (k = 1). */
function footprint({ x = 0, y = 0, hx, hy = hx, rot = 0 }) {
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  return [[hx, -hy], [hx, hy], [-hx, hy], [-hx, -hy]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
}

/**
 * The faces of a block standing from z0 to z1: its top, the walls that face the viewer (normal
 * toward +x+y) each marked lit or not, and the lit walls' top edges for the rim.
 */
function block(b, iso, litSign) {
  const foot = footprint(b);
  const top = foot.map(([x, y]) => iso(x, y, b.z1));
  const walls = [];
  foot.forEach(([x0, y0], k) => {
    const [x1, y1] = foot[(k + 1) % 4];
    const nx = (x0 + x1) / 2 - (b.x ?? 0);
    const ny = (y0 + y1) / 2 - (b.y ?? 0);
    if (nx + ny <= 1e-9) return; // faces away from the viewer
    // A wall faces the sun when its normal points the same way across the screen as the light.
    const lit = (nx - ny >= 0 ? 1 : -1) === litSign;
    walls.push({ k, lit, pts: [iso(x0, y0, b.z0), iso(x1, y1, b.z0), top[(k + 1) % 4], top[k]] });
  });
  const rim = walls.filter((w) => w.lit).map((w) => [w.pts[3], w.pts[2]]);
  return { top, walls, rim };
}

/** A quad on wall k of block b: u along the wall (0..1 from its first corner), z in world units. */
function slot(b, k, u0, u1, z0, z1, iso) {
  const foot = footprint(b);
  const [a, c] = [foot[k], foot[(k + 1) % 4]];
  const [p0, p1] = [lerp2(a, c, u0), lerp2(a, c, u1)];
  return [iso(p0[0], p0[1], z0), iso(p1[0], p1[1], z0), iso(p1[0], p1[1], z1), iso(p0[0], p0[1], z1)];
}

/** The same quad grown by `g` of its own size on every side, for a halo. */
function grow(q, g) {
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
  const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  return q.map(([x, y]) => [cx + (x - cx) * (1 + g), cy + (y - cy) * (1 + g)]);
}

function buildMonolith({ w, h, cx, cy, r }, df, litSign, sdx, sdy) {
  const s = r;
  const spireH = SPIRE.min + SPIRE.grow * df;
  const plinthTop = TIERS[TIERS.length - 1].z1;
  // Centre the tallest the spire gets (not today's height), so the base never drifts.
  const peak = plinthTop + SPIRE.min + SPIRE.grow + SPIRE.cap;
  const by = cy + ((peak - TIERS[0].hx) / 2) * s;
  const iso = (x, y, z) => [cx + (x - y) * C30 * s, by + (x + y) * 0.5 * s - z * s];

  // Plinth: tiers, then the stair on the front-left (+y) face of the lowest tier, tallest step last.
  const tiers = TIERS.map((t) => ({ ...t }));
  const stair = Array.from({ length: STAIR.steps }, (_, i) => {
    const hy = ((STAIR.steps - i) * STAIR.depth) / 2;
    return { x: 0, y: TIERS[0].hx + hy, hx: STAIR.w, hy, z0: 0, z1: ((i + 1) * TIERS[0].z1) / STAIR.steps };
  });

  // Spire: segments between the collars, the collars themselves, then the cap.
  const spire = [];
  const collars = [];
  let z = plinthTop;
  COLLARS.forEach((c) => {
    const zc = plinthTop + spireH * c.at;
    spire.push({ hx: SPIRE.hx, z0: z, z1: zc - COLLAR.t / 2 });
    collars.push({ hx: COLLAR.hx, z0: zc - COLLAR.t / 2, z1: zc + COLLAR.t / 2, rot: c.turn * (1 - ramp(df, c.from, c.to)) });
    z = zc + COLLAR.t / 2;
  });
  const spireTop = plinthTop + spireH;
  spire.push({ hx: SPIRE.hx, z0: z, z1: spireTop });
  const apexZ = spireTop + SPIRE.cap;
  const apex = iso(0, 0, apexZ);

  const solids = [...tiers, ...stair, ...spire, ...collars];

  // Cap: the two front faces of a steep pyramid (steeper than 45°, so its back faces stay hidden).
  const capFoot = footprint({ hx: SPIRE.hx }).map(([x, y]) => iso(x, y, spireTop));
  const cap = [0, 1].map((k) => ({ lit: (k === 0 ? 1 : -1) === litSign, pts: [capFoot[k], capFoot[k + 1], apex] }));

  // Light channels in the order they fill: lowest first, so progress climbs the monument. Each is
  // drawn right after the block it is cut into, so the blocks above still occlude it.
  const band = (b, f0, f1) => [b.z0 + (b.z1 - b.z0) * f0, b.z0 + (b.z1 - b.z0) * f1];
  const channels = [
    { on: tiers[0], q: slot(tiers[0], 0, 0.12, 0.88, ...band(tiers[0], 0.42, 0.58), iso) },
    { on: tiers[1], q: slot(tiers[1], 0, 0.15, 0.85, ...band(tiers[1], 0.4, 0.58), iso) },
    { on: tiers[1], q: slot(tiers[1], 1, 0.1, 0.36, ...band(tiers[1], 0.4, 0.58), iso) },
    { on: tiers[1], q: slot(tiers[1], 1, 0.64, 0.9, ...band(tiers[1], 0.4, 0.58), iso) },
    ...[spire[0], spire[1]].flatMap((b) => [0, 1].map((k) => ({ on: b, q: slot(b, k, 0.4, 0.6, ...band(b, 0.18, 0.82), iso) }))),
  ];
  // Door above the stair, in the middle tier's +y face.
  const door = slot(tiers[1], 1, 0.44, 0.56, tiers[1].z0, tiers[1].z0 + 0.055, iso);

  /** Draw list for one layer: each block's faces, then whatever is cut into it. */
  const drawList = (list) =>
    list.flatMap((b) => [
      { kind: 'block', f: block(b, iso, litSign) },
      ...(b === tiers[1] ? [{ kind: 'door', q: door }] : []),
      ...channels.flatMap((c, i) => (c.on === b ? [{ kind: 'channel', i, q: c.q }] : [])),
    ]);

  // Shadow: per block, the hull of its footprint slid along the shadow by its base and top heights.
  const cast = (mult) => {
    const off = (zw) => [sdx * zw * s * SHADOW_PER_PX * mult, sdy * zw * s * SHADOW_PER_PX * mult];
    const onFloor = (x, y, zw) => {
      const [fx, fy] = iso(x, y, 0);
      const [ox, oy] = off(zw);
      return [fx + ox, fy + oy];
    };
    const polys = solids.map((b) => hull(footprint(b).flatMap(([x, y]) => [onFloor(x, y, b.z0), onFloor(x, y, b.z1)])));
    const capPts = footprint({ hx: SPIRE.hx }).map(([x, y]) => onFloor(x, y, spireTop));
    polys.push(hull([...capPts, onFloor(0, 0, apexZ)]));
    return polys;
  };

  // The shadow fades along its length (a gradient, not a blur): from the base to past the apex's
  // shadow, kept at least 0.3r long so a high sun's short shadow never collapses the gradient.
  const base = iso(0, 0, 0);
  const reach = Math.hypot(sdx, sdy) * apexZ * s * SHADOW_PER_PX * 1.2;
  const len = Math.max(reach, 0.3 * s);
  const [ux, uy] = reach > 0.5 ? [sdx / Math.hypot(sdx, sdy), sdy / Math.hypot(sdx, sdy)] : [0, 1];

  return {
    w,
    h,
    court: [0.62, 0.52].map((hx) => footprint({ hx }).map(([x, y]) => iso(x, y, 0))),
    penumbra: cast(1.2),
    umbra: cast(1),
    fade: { x1: base[0], y1: base[1], x2: base[0] + ux * len, y2: base[1] + uy * len },
    plinth: drawList([tiers[0], ...stair, ...tiers.slice(1)]),
    spire: drawList(spire.flatMap((seg, i) => (collars[i] ? [seg, collars[i]] : [seg]))),
    cap,
    apex,
    beacon: SPIRE.hx * 1.6 * s,
  };
}

const HAIRLINE = { stroke: 'var(--relief-hairline)', strokeWidth: 1, strokeLinejoin: 'round' };
const SVG_STYLE = { position: 'absolute', inset: 0 };

/** One block's faces: walls, top, then the rim on its lit top edge. */
const Block = ({ f, litFill }) => (
  <>
    {f.walls.map((wall) => (
      <polygon
        key={wall.k}
        points={pts(wall.pts)}
        style={{ ...HAIRLINE, fill: wall.lit ? litFill : 'var(--relief-wall-shade)' }}
      />
    ))}
    <polygon points={pts(f.top)} style={{ ...HAIRLINE, fill: 'var(--relief-plateau)' }} />
    {f.rim.length > 0 && (
      <path
        d={f.rim.map(([a, b]) => `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`).join('')}
        style={{ fill: 'none', stroke: 'var(--relief-rim)', strokeWidth: 1.25, strokeLinecap: 'round' }}
      />
    )}
  </>
);

/** A light channel: a crease-toned slot, or lit in --sdl-bar-a over a gradient halo. */
const Channel = ({ q, lit, glow }) => (
  <>
    {lit && <polygon points={pts(grow(q, 1.4))} style={{ fill: `url(#${glow})` }} />}
    <polygon
      points={pts(q)}
      style={{ fill: lit ? 'var(--sdl-bar-a)' : 'var(--relief-crease)', stroke: 'var(--relief-hairline)', strokeWidth: 0.75 }}
    />
  </>
);

function FocusPrism({ light, ctx, now, box }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glowId = `prism-glow-${uid}`;
  const courtId = `prism-court-${uid}`;
  const fadeId = `prism-fade-${uid}`;

  const df = dayFraction(now);
  const litSign = (light?.dx ?? 0) >= 0 ? 1 : -1;
  const sdx = Number.isFinite(light?.shadowDx) ? Math.round(light.shadowDx * 10) / 10 : 0;
  const sdy = Number.isFinite(light?.shadowDy) ? Math.round(light.shadowDy * 10) / 10 : 8;
  const { w, h, cx, cy, r } = box;

  const scene = useMemo(
    () => buildMonolith({ w, h, cx, cy, r }, df, litSign, sdx, sdy),
    [w, h, cx, cy, r, df, litSign, sdx, sdy],
  );

  // The last channel (and the beacon) only at 100%; the first as soon as anything is done.
  const ratio = typeof ctx?.todoRatio === 'number' && Number.isFinite(ctx.todoRatio) ? clamp01(ctx.todoRatio) : 0;
  const litCount = ratio >= 1 ? CHANNELS : ratio > 0 ? Math.min(CHANNELS - 1, Math.max(1, Math.round(ratio * CHANNELS))) : 0;
  // A focus line for today warms the door: static, the one bit of focus state the monument shows.
  const doorFill = typeof ctx?.focusText === 'string' && ctx.focusText.trim()
    ? 'color-mix(in oklab, var(--relief-wall-shade) 70%, var(--sdl-accent))'
    : 'var(--relief-crease)';
  // By moonlight the lit wall is only half a step brighter than the shade, so the channels lead.
  const litFill = light?.isDay === false
    ? 'color-mix(in oklab, var(--relief-wall-lit) 55%, var(--relief-wall-shade))'
    : 'var(--relief-wall-lit)';
  // The court brightens toward the light: gradient endpoints in its bounding box, light side first.
  const ldx = Number.isFinite(light?.dx) ? light.dx : 0;
  const ldy = Number.isFinite(light?.dy) ? light.dy : -1;

  const svg = (children) => (
    <svg width={scene.w} height={scene.h} viewBox={`0 0 ${scene.w} ${scene.h}`} style={SVG_STYLE}>
      {children}
    </svg>
  );
  const draw = (list) =>
    list.map((item, i) => {
      if (item.kind === 'block') return <Block key={i} f={item.f} litFill={litFill} />;
      if (item.kind === 'door') return <polygon key={i} points={pts(item.q)} style={{ ...HAIRLINE, fill: doorFill }} />;
      return <Channel key={i} q={item.q} lit={item.i < litCount} glow={glowId} />;
    });

  return (
    <>
      <div className="relief-layer" style={{ '--depth': 0 }}>
        {svg(
          <>
            <defs>
              <linearGradient
                id={courtId}
                x1={(0.5 + ldx * 0.5).toFixed(3)}
                y1={(0.5 + ldy * 0.5).toFixed(3)}
                x2={(0.5 - ldx * 0.5).toFixed(3)}
                y2={(0.5 - ldy * 0.5).toFixed(3)}
              >
                <stop offset="0" style={{ stopColor: 'var(--relief-lit)', stopOpacity: 0.55 }} />
                <stop offset="1" style={{ stopColor: 'var(--relief-lit)', stopOpacity: 0.08 }} />
              </linearGradient>
              <linearGradient
                id={fadeId}
                gradientUnits="userSpaceOnUse"
                x1={scene.fade.x1.toFixed(1)}
                y1={scene.fade.y1.toFixed(1)}
                x2={scene.fade.x2.toFixed(1)}
                y2={scene.fade.y2.toFixed(1)}
              >
                <stop offset="0" style={{ stopColor: 'var(--relief-cast)', stopOpacity: 1 }} />
                <stop offset="0.55" style={{ stopColor: 'var(--relief-cast)', stopOpacity: 0.75 }} />
                <stop offset="1" style={{ stopColor: 'var(--relief-cast)', stopOpacity: 0.1 }} />
              </linearGradient>
              <radialGradient id={glowId}>
                <stop offset="0" style={{ stopColor: 'var(--relief-glow)', stopOpacity: 1 }} />
                <stop offset="0.55" style={{ stopColor: 'var(--relief-glow)', stopOpacity: 0.45 }} />
                <stop offset="1" style={{ stopColor: 'var(--relief-glow)', stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            <polygon points={pts(scene.court[0])} style={{ ...HAIRLINE, fill: `url(#${courtId})` }} />
            <polygon points={pts(scene.court[1])} style={{ ...HAIRLINE, fill: 'none' }} />
            <g style={{ opacity: 'calc(var(--relief-cast-opacity) * 0.45)' }}>
              <path d={union(scene.penumbra)} style={{ fill: `url(#${fadeId})` }} />
            </g>
            <g style={{ opacity: 'var(--relief-cast-opacity)' }}>
              <path d={union(scene.umbra)} style={{ fill: `url(#${fadeId})` }} />
            </g>
          </>,
        )}
      </div>

      <div className="relief-layer" style={{ '--depth': 5 }}>
        {svg(
          <>
            {draw(scene.plinth)}
          </>,
        )}
      </div>

      <div className="relief-layer" style={{ '--depth': 11 }}>
        {svg(
          <>
            {draw(scene.spire)}
            {scene.cap.map((face, i) => (
              <polygon
                key={i}
                points={pts(face.pts)}
                style={{ ...HAIRLINE, fill: face.lit ? litFill : 'var(--relief-wall-shade)' }}
              />
            ))}
            {litCount === CHANNELS && (
              <circle cx={scene.apex[0].toFixed(1)} cy={scene.apex[1].toFixed(1)} r={scene.beacon.toFixed(1)} style={{ fill: `url(#${glowId})` }} />
            )}
          </>,
        )}
      </div>
    </>
  );
}

export default memo(FocusPrism);
