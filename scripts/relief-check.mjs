#!/usr/bin/env node
/**
 * relief-check — measures the faux-3D relief wallpapers' tonal ramp in every colorway the app ships.
 *
 * Nothing here retypes a formula. It reads the --relief-* roles out of
 * src/components/wallpaper/relief.css (the base .relief-stage block, plus the light-mode block over
 * it), the per-mode --sdl-scrim / --sdl-veil-rgb out of src/theme/grammar.css, and each colorway's
 * --sdl-* roles from the real roleVars() in src/theme/cssVars.js (bundled with esbuild, so the
 * registry's JSON imports resolve). A small evaluator then resolves the forms relief.css uses —
 * var() with fallbacks, rgb(r g b / a), calc(), transparent, and color-mix(in oklab, …) with
 * premultiplied alpha — and translucent results are composited over the surface they are drawn on
 * before their OKLab lightness is compared.
 *
 * The contract it holds, per colorway in its own mode:
 *   lit > floor; light: plateau > wall-lit > wall-shade; both: wall-lit at least 0.02 L above
 *   wall-shade; crease (over wall-shade) darker than wall-shade; tick (over floor) at least 0.08 L
 *   from floor; light: glow transparent, and cast no deeper below wall-shade than the crease is.
 *
 *   node scripts/relief-check.mjs
 */
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const ROOT = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

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

/* ── The registry, through the app's own code ───────────────────────────────── */

const bundle = await build({
  stdin: {
    contents: "export { COLORWAYS, resolveColorway } from './src/theme/registry.js';\nexport { roleVars } from './src/theme/cssVars.js';",
    resolveDir: new URL('.', ROOT).pathname,
    loader: 'js',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const { COLORWAYS, resolveColorway, roleVars } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

/* ── CSS: pull custom properties out of one exact rule ──────────────────────── */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Custom properties declared in the rule whose selector is exactly `selector` (no nested braces). */
function customProps(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css);
  if (!m) throw new Error(`rule not found: ${selector}`);
  const out = {};
  for (const decl of m[1].split(';')) {
    const i = decl.indexOf(':');
    const name = decl.slice(0, i).trim();
    if (i > 0 && name.startsWith('--')) out[name] = decl.slice(i + 1).replace(/\s+/g, ' ').trim();
  }
  return out;
}

const RELIEF_CSS = stripComments(read('src/components/wallpaper/relief.css'));
const GRAMMAR_CSS = stripComments(read('src/theme/grammar.css'));
const reliefOnly = (props) => Object.fromEntries(Object.entries(props).filter(([k]) => k.startsWith('--relief-')));
const RELIEF = {
  base: reliefOnly(customProps(RELIEF_CSS, '.relief-stage')),
  light: reliefOnly(customProps(RELIEF_CSS, ":root[data-mode='light'] .relief-stage")),
};
const GRAMMAR = {
  dark: customProps(GRAMMAR_CSS, "[data-mode='dark']"),
  light: customProps(GRAMMAR_CSS, "[data-mode='light']"),
};

/* ── Evaluator: var() substitution, calc(), then a colour ───────────────────── */

/** Index of the paren closing the one at `open`. */
function closeParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return i;
  }
  throw new Error(`unbalanced parens: ${s}`);
}

/** Split on commas that are not inside parens. */
function splitTop(s) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === ',' && depth === 0) { parts.push(s.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(s.slice(start).trim());
  return parts;
}

/** Token-level var() substitution, as CSS does it before parsing the value. */
function substitute(text, env, depth = 0) {
  if (depth > 20) throw new Error(`var() cycle near ${text}`);
  let out = text;
  for (let at = out.indexOf('var('); at !== -1; at = out.indexOf('var(')) {
    const end = closeParen(out, at + 3);
    const [name, ...fallback] = splitTop(out.slice(at + 4, end));
    let value = env[name];
    if (value === undefined) {
      if (!fallback.length) throw new Error(`${name} is undefined`);
      value = fallback.join(',');
    }
    out = out.slice(0, at) + substitute(String(value), env, depth + 1) + out.slice(end + 1);
  }
  return out;
}

/** Arithmetic inside calc(): numbers, + - * / and parens. */
function evalArith(src) {
  const tokens = src.match(/\d*\.?\d+(?:e[+-]?\d+)?|[-+*/()]/gi) || [];
  if (tokens.join('') !== src.replace(/\s+/g, '')) throw new Error(`unsupported calc: ${src}`);
  let i = 0;
  const atom = () => {
    const t = tokens[i++];
    if (t === '(') { const v = sum(); i++; return v; }
    if (t === '-') return -atom();
    return Number(t);
  };
  const product = () => {
    let v = atom();
    while (tokens[i] === '*' || tokens[i] === '/') v = tokens[i++] === '*' ? v * atom() : v / atom();
    return v;
  };
  const sum = () => {
    let v = product();
    while (tokens[i] === '+' || tokens[i] === '-') v = tokens[i++] === '+' ? v + product() : v - product();
    return v;
  };
  return sum();
}

function resolveCalc(text) {
  let out = text;
  for (let at = out.indexOf('calc('); at !== -1; at = out.indexOf('calc(')) {
    const end = closeParen(out, at + 4);
    out = out.slice(0, at) + String(evalArith(resolveCalc(out.slice(at + 5, end)))) + out.slice(end + 1);
  }
  return out;
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** sRGB 0..1 (gamma-encoded) → OKLab, alpha carried through. */
function srgbToOklab([r, g, b], alpha = 1) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha,
  };
}

/** OKLab → sRGB 0..1, clipped to the gamut the way a display would show it. */
function oklabToSrgb({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => clamp01(toGamma(clamp01(c))));
}

const num = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s));

/** CSS Color 5 color-mix(in oklab, …): percentage normalisation and premultiplied alpha. */
function colorMix(args) {
  const [space, ...colors] = args;
  if (space !== 'in oklab' || colors.length !== 2) throw new Error(`unsupported color-mix: ${args.join(', ')}`);
  const parsed = colors.map((c) => {
    const m = /^(.*?)(?:\s+(\d*\.?\d+)%)?$/.exec(c);
    return { color: parseColor(m[1]), p: m[2] === undefined ? null : parseFloat(m[2]) };
  });
  let [p1, p2] = parsed.map((x) => x.p);
  if (p1 === null && p2 === null) [p1, p2] = [50, 50];
  else if (p1 === null) p1 = 100 - p2;
  else if (p2 === null) p2 = 100 - p1;
  const total = p1 + p2;
  const scale = Math.min(total, 100) / 100;
  const [w1, w2] = [p1 / total, p2 / total];
  const [A, B] = parsed.map((x) => x.color);
  const alpha = A.alpha * w1 + B.alpha * w2;
  const pm = (k) => A[k] * A.alpha * w1 + B[k] * B.alpha * w2;
  return alpha === 0
    ? { L: 0, a: 0, b: 0, alpha: 0 }
    : { L: pm('L') / alpha, a: pm('a') / alpha, b: pm('b') / alpha, alpha: alpha * scale };
}

/** A fully substituted colour value → OKLab with alpha. */
function parseColor(value) {
  const v = value.trim();
  if (v === 'transparent') return { L: 0, a: 0, b: 0, alpha: 0 };
  if (/^#[0-9a-f]{6}$/i.test(v)) return srgbToOklab([1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255));
  const fn = /^([a-z-]+)\(/.exec(v);
  if (!fn || closeParen(v, fn[0].length - 1) !== v.length - 1) throw new Error(`unsupported colour: ${v}`);
  const body = v.slice(fn[0].length, -1);
  if (fn[1] === 'color-mix') return colorMix(splitTop(body));
  if (fn[1] === 'rgb') {
    const [channels, alpha = '1'] = body.split('/').map((s) => s.trim());
    const rgb = channels.split(/[\s,]+/).map((c) => num(c) / (c.endsWith('%') ? 1 : 255));
    if (rgb.length !== 3 || rgb.some(Number.isNaN)) throw new Error(`bad rgb(): ${v}`);
    return srgbToOklab(rgb, clamp01(num(alpha)));
  }
  throw new Error(`unsupported colour function: ${fn[1]}`);
}

const evaluate = (expr, env) => parseColor(resolveCalc(substitute(expr, env)));

/** Source-over in gamma-encoded sRGB, as the compositor does it, onto an opaque backdrop. */
function over(top, backdrop, opacity = 1) {
  const a = top.alpha * opacity;
  const [t, d] = [oklabToSrgb(top), oklabToSrgb(backdrop)];
  return srgbToOklab(t.map((c, i) => c * a + d[i] * (1 - a)));
}

/* ── Inputs present ─────────────────────────────────────────────────────────── */

eq('16 colorways in the registry', COLORWAYS.length, 16);
eq('colorway ids unique', new Set(COLORWAYS.map((c) => c.id)).size, COLORWAYS.length);
for (const cw of COLORWAYS) eq(`${cw.id} resolves to itself`, resolveColorway(cw.id).id, cw.id);
ok('relief.css base block has --relief-* roles', Object.keys(RELIEF.base).length >= 10, JSON.stringify(Object.keys(RELIEF.base)));
ok('relief.css light block has --relief-* roles', Object.keys(RELIEF.light).length >= 5, JSON.stringify(Object.keys(RELIEF.light)));
for (const name of Object.keys(RELIEF.light)) ok(`light ${name} overrides a base role`, name in RELIEF.base);
for (const mode of ['dark', 'light']) {
  ok(`grammar.css ${mode} has --sdl-scrim`, '--sdl-scrim' in GRAMMAR[mode]);
  ok(`grammar.css ${mode} has --sdl-veil-rgb`, '--sdl-veil-rgb' in GRAMMAR[mode]);
}

/* ── The ramp, per colorway ─────────────────────────────────────────────────── */

const ROLE = (name) => `--relief-${name}`;
const rows = [];
const f = (x) => x.toFixed(3);

for (const cw of COLORWAYS) {
  const id = cw.id;
  const mode = cw.mode;
  ok(`${id} mode is dark or light`, mode === 'dark' || mode === 'light', mode);
  if (mode !== 'dark' && mode !== 'light') continue;

  const env = { ...roleVars(cw), ...GRAMMAR[mode], ...RELIEF.base, ...(mode === 'light' ? RELIEF.light : {}) };
  const roles = {};
  for (const name of Object.keys(RELIEF.base)) {
    if (name === ROLE('cast-opacity')) continue;
    try { roles[name.slice(9)] = evaluate(`var(${name})`, env); } catch (err) { ok(`${id} ${name} resolves`, false, err.message); }
  }
  const castOpacity = Number(resolveCalc(substitute(`var(${ROLE('cast-opacity')})`, env)));
  const need = ['floor', 'plateau', 'lit', 'cap', 'wall-lit', 'wall-shade', 'crease', 'tick', 'glow', 'cast'];
  if (need.some((r) => !roles[r])) { ok(`${id} has every measured role`, false, need.filter((r) => !roles[r]).join(', ')); continue; }

  const floor = roles.floor;
  const L = {
    floor: floor.L,
    plateau: over(roles.plateau, floor).L,
    lit: over(roles.lit, floor).L,
    cap: over(roles.cap, floor).L,
    wallLit: over(roles['wall-lit'], floor).L,
    shade: over(roles['wall-shade'], floor).L,
  };
  const shade = over(roles['wall-shade'], floor);
  L.crease = over(roles.crease, shade).L;
  L.tick = over(roles.tick, floor).L;
  L.cast = over(roles.cast, floor, castOpacity).L;
  rows.push({ id, mode, ...L, glow: roles.glow.alpha });

  const at = (k) => `${k} ${f(L[k])}`;
  ok(`${id}: lit > floor`, L.lit > L.floor, `${at('lit')}, ${at('floor')}`);
  ok(`${id}: cap > plateau (the gnomon brightens toward the light)`, L.cap > L.plateau, `${at('cap')}, ${at('plateau')}`);
  if (mode === 'light') {
    ok(`${id}: plateau > wall-lit`, L.plateau > L.wallLit, `${at('plateau')}, ${at('wallLit')}`);
    ok(`${id}: wall-lit > wall-shade`, L.wallLit > L.shade, `${at('wallLit')}, ${at('shade')}`);
  }
  ok(`${id}: wall-lit at least 0.02 L above wall-shade`, L.wallLit - L.shade >= 0.02, `${at('wallLit')}, ${at('shade')}, step ${f(L.wallLit - L.shade)}`);
  ok(`${id}: crease (over wall-shade) darker than wall-shade`, L.crease < L.shade, `${at('crease')}, ${at('shade')}`);
  ok(`${id}: tick (over floor) at least 0.08 L from floor`, Math.abs(L.tick - L.floor) >= 0.08, `${at('tick')}, ${at('floor')}, |Δ| ${f(Math.abs(L.tick - L.floor))}`);
  if (mode === 'light') {
    eq(`${id}: glow is transparent in light mode`, roles.glow.alpha, 0);
    ok(`${id}: cast no deeper below wall-shade than the crease`, L.shade - L.cast <= L.shade - L.crease + 1e-9,
      `${at('cast')}, ${at('shade')}, ${at('crease')}`);
  }
}

/* ── Table ──────────────────────────────────────────────────────────────────── */

const COLS = ['floor', 'plateau', 'lit', 'cap', 'wallLit', 'shade', 'crease', 'tick', 'cast', 'glow'];
console.log('\nOKLab L per colorway (crease over wall-shade; tick, cast and every other role over floor; glow = alpha)\n');
console.log(`  ${'colorway'.padEnd(20)}${'mode'.padEnd(7)}${COLS.map((c) => c.padStart(8)).join('')}`);
for (const r of rows) console.log(`  ${r.id.padEnd(20)}${r.mode.padEnd(7)}${COLS.map((c) => f(r[c]).padStart(8)).join('')}`);

console.log(`\nrelief-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
