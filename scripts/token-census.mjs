#!/usr/bin/env node
/**
 * token-census — the migration progress meter.
 *
 * Counts every colour-bearing construct in src/ and prints a table. Run it before and after each
 * migration phase; the numbers are the burndown. Writes scripts/.token-baseline.json on --save.
 *
 * Categories mirror the SDL migration plan:
 *   - os-* utilities split by whether their Tailwind key actually RENDERS today
 *   - white/black literals, split into the six semantic buckets that migrate differently
 *   - hardcoded hexes, split into accent-duplicating / surface-duplicating / the near-black ramp
 *   - stock Tailwind semantic colours
 *   - radius forms
 *
 * Usage: node scripts/token-census.mjs [--save] [--json]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const BASELINE = join(ROOT, 'scripts', '.token-baseline.json');
const EXT = new Set(['.jsx', '.js', '.css']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(extname(p))) out.push(p);
  }
  return out;
}

const files = walk(SRC).map((p) => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf8') }));

/** Count regex matches across all files; returns { total, byFile: Map }. */
function count(re) {
  let total = 0;
  const byFile = new Map();
  for (const f of files) {
    const m = f.text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
    if (m?.length) {
      total += m.length;
      byFile.set(f.path, m.length);
    }
  }
  return { total, byFile };
}

const UTIL = '(?:text|bg|border|ring|from|to|via|shadow|decoration|divide|outline|fill|stroke|accent|caret|placeholder)';

// ── Tailwind os-* keys, split by whether they render ──────────────────────────
// Slash-form keys are `rgb(var(--x-rgb) / <alpha-value>)`. If --x-rgb is comma-separated the
// declaration is INVALID and dropped — the class renders transparent. See the plan's evidence.
const SLASH_KEYS = [
  'primary', 'secondary', 'tertiary', 'outline',
  'surfaceContainerLow', 'surfaceContainerHigh', 'surfaceContainerHighest',
];
// Plain `var(--x)` keys render fine but silently drop any /N opacity modifier.
const PLAIN_KEYS = ['background', 'surface', 'onSurface', 'onSurfaceVariant', 'primaryDim', 'secondaryDim'];

function keyCount(keys) {
  const rows = {};
  let total = 0;
  for (const k of keys) {
    // \b won't work before an uppercase boundary, so assert "not followed by more key chars"
    const n = count(new RegExp(`${UTIL}-os-${k}(?![A-Za-z])`, 'g')).total;
    rows[k] = n;
    total += n;
  }
  return { rows, total };
}

const slash = keyCount(SLASH_KEYS);
const plain = keyCount(PLAIN_KEYS);

// ── white / black literals, in the six buckets that migrate differently ───────
const hairline = count(new RegExp(`border-(?:white|black)(?:/\\[?[0-9.]+\\]?)?`, 'g')).total;
const inkFull = count(/text-white(?!\/)/g).total;
const inkAlpha = count(/text-white\/\[?[0-9.]+\]?/g).total;
const veil = count(/bg-white(?:\/\[?[0-9.]+\]?)?/g).total;
const scrimAlpha = count(/bg-black\/\[?[0-9.]+\]?/g).total;
const deviceBlack = count(/bg-black(?!\/)/g).total;
const onAccent = count(/text-black(?:\/\[?[0-9.]+\]?)?/g).total;

// ── hardcoded hexes ──────────────────────────────────────────────────────────
const ACCENT_HEX = ['#cc97ff', '#00d2fd', '#00f5a0', '#ff68f0'];
const SURFACE_HEX = ['#060e20', '#091328', '#141f38', '#192540'];
const NEARBLACK_HEX = ['#050505', '#080808', '#0a0a0a', '#0c0c0c', '#0e0e0e', '#121212', '#131313', '#1a1a1a'];

function hexGroup(list) {
  const rows = {};
  let total = 0;
  for (const h of list) {
    const n = count(new RegExp(h.replace('#', '#'), 'gi')).total;
    if (n) rows[h] = n;
    total += n;
  }
  return { rows, total };
}
const accentHex = hexGroup(ACCENT_HEX);
const surfaceHex = hexGroup(SURFACE_HEX);
const nearBlackHex = hexGroup(NEARBLACK_HEX);
const allHex = count(/#[0-9a-fA-F]{6}\b/g).total;

// ── stock Tailwind semantic colours ──────────────────────────────────────────
const STOCK = ['red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'orange', 'pink', 'indigo', 'rose', 'emerald', 'violet', 'teal', 'sky', 'amber'];
const stock = (() => {
  const rows = {};
  let total = 0;
  for (const c of STOCK) {
    const n = count(new RegExp(`${UTIL}-${c}-[0-9]{2,3}`, 'g')).total;
    if (n) rows[c] = n;
    total += n;
  }
  return { rows, total };
})();

// ── misc structural markers ──────────────────────────────────────────────────
const radius = count(/rounded(?:-[a-z]+)?(?:-\[[^\]]+\])?/g).total;
const radiusArbitrary = count(/rounded-\[[^\]]+\]/g).total;
const backdropBlur = count(/backdrop-blur(?:-[a-z0-9]+)?/g).total;
const reducedMotion = count(/prefers-reduced-motion/g).total;
const legacyRgba = count(/rgba\(var\(--os-[a-z-]+\)\s*,/g).total;
const sdlVars = count(/var\(--sdl-[a-z0-9-]+\)/g).total;

const census = {
  generatedFrom: `${files.length} files under src/`,
  tokens: {
    'os-* DEAD (slash-form keys, comma vars)': slash.total,
    'os-* renders (plain var, no alpha possible)': plain.total,
    'hand-written rgba(var(--os-*), N) — works today': legacyRgba,
    'var(--sdl-*) — migrated': sdlVars,
  },
  tokensDetail: { dead: slash.rows, renders: plain.rows },
  whiteBlack: {
    'hairline  border-white|black/N': hairline,
    'ink       text-white': inkFull,
    'ink muted text-white/N': inkAlpha,
    'veil      bg-white/N': veil,
    'scrim     bg-black/N': scrimAlpha,
    'device    bg-black (bare)': deviceBlack,
    'onAccent  text-black': onAccent,
  },
  hexes: {
    'accent-duplicating': accentHex.total,
    'surface-duplicating': surfaceHex.total,
    'near-black second ramp': nearBlackHex.total,
    'all 6-digit hexes': allHex,
  },
  hexesDetail: { accent: accentHex.rows, surface: surfaceHex.rows, nearBlack: nearBlackHex.rows },
  stockSemantic: { total: stock.total, ...stock.rows },
  structure: {
    'rounded-* occurrences': radius,
    'rounded-[arbitrary]': radiusArbitrary,
    'backdrop-blur': backdropBlur,
    'prefers-reduced-motion': reducedMotion,
  },
};

const whiteBlackTotal = hairline + inkFull + inkAlpha + veil + scrimAlpha + deviceBlack + onAccent;
census.headline = {
  deadTokenSites: slash.total,
  whiteBlackTotal,
  untokenizedTotal: whiteBlackTotal + accentHex.total + surfaceHex.total + nearBlackHex.total + stock.total,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(census, null, 2));
  process.exit(0);
}

// ── render ───────────────────────────────────────────────────────────────────
const prev = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;

function delta(section, key, now) {
  if (!prev?.[section]) return '';
  const was = prev[section][key];
  if (was === undefined || was === now) return '';
  const d = now - was;
  return d > 0 ? `  \x1b[31m+${d}\x1b[0m` : `  \x1b[32m${d}\x1b[0m`;
}

function table(title, section, obj) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  const w = Math.max(...Object.keys(obj).map((k) => k.length));
  for (const [k, v] of Object.entries(obj)) {
    console.log(`  ${k.padEnd(w)}  ${String(v).padStart(5)}${delta(section, k, v)}`);
  }
}

console.log(`\n\x1b[1mTOKEN CENSUS\x1b[0m — ${census.generatedFrom}${prev ? `  (vs baseline ${prev.savedAt})` : ''}`);
table('Design tokens', 'tokens', census.tokens);
table('white / black literals', 'whiteBlack', census.whiteBlack);
table('Hardcoded hexes', 'hexes', census.hexes);
table('Structure', 'structure', census.structure);
console.log(`\n\x1b[1mHeadline\x1b[0m`);
console.log(`  dead token sites          ${String(census.headline.deadTokenSites).padStart(5)}${delta('headline', 'deadTokenSites', census.headline.deadTokenSites)}`);
console.log(`  white/black literals      ${String(census.headline.whiteBlackTotal).padStart(5)}${delta('headline', 'whiteBlackTotal', census.headline.whiteBlackTotal)}`);
console.log(`  untokenized colour sites  ${String(census.headline.untokenizedTotal).padStart(5)}${delta('headline', 'untokenizedTotal', census.headline.untokenizedTotal)}`);

if (process.argv.includes('--save')) {
  writeFileSync(BASELINE, JSON.stringify({ savedAt: new Date().toISOString().slice(0, 10), ...census }, null, 2));
  console.log(`\n  baseline written → ${relative(ROOT, BASELINE)}`);
}
console.log('');
