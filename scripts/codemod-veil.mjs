#!/usr/bin/env node
/**
 * codemod-veil — migrate bare white/black literals onto mode-aware SDL roles.
 *
 * WHY this is not a find-replace: `bg-white/5` is a LIFT on a dark plane and INVISIBLE on a light
 * one, so light mode cannot ship until these invert. But not every white/black should flip:
 *
 *   veil / hairline   bg-white/N, border-white/N   -> bg-veil/N, border-hairline/N   [mechanical]
 *   muted ink         text-white/N                 -> text-sdl-ink/N                 [mechanical]
 *   ink               text-white (bare)            -> text-sdl-ink                   [heuristic]
 *   onAccent          text-white/black ON an accent fill -> text-sdl-onAccent        [heuristic]
 *   scrim / device    bg-black, media overlays     -> LEFT ALONE                     [excluded]
 *
 * `onAccent` is mode-INVARIANT: it derives from the ACCENT's luminance, not the page mode. Black
 * text on Honey Vivid's teal accent is wrong even though Honey's plane is light. That is why any
 * class string carrying both a white/black ink and an accent fill is routed to the onAccent role
 * instead of the ink role.
 *
 *   node scripts/codemod-veil.mjs --dry            # report only (default)
 *   node scripts/codemod-veil.mjs --apply          # write
 *   node scripts/codemod-veil.mjs --apply --shell  # shell files only
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DENYLIST, DENY_DIRS, SHELL, MEDIA_FILES } from './denylist.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const APPLY = process.argv.includes('--apply');
const SHELL_ONLY = process.argv.includes('--shell');



/** A class string that paints an accent/gradient fill — its ink is onAccent, not plane ink. */
// NOTE the `/` in the bg-white lookahead: `bg-white/5` is a VEIL, not a fill. Without it, every
// input and panel carrying a 5% white veil was misread as an accent fill and got dark onAccent
// text — unreadable on a dark plane. Only a BARE `bg-white` is a solid fill.
const ACCENT_FILL = /(bg-os-primary(?!\/)|bg-os-secondary(?!\/)|bg-os-tertiary(?!\/)|bg-sdl-accent(?!\/)|bg-gradient-|bg-white(?![-\w/])|bg-green-500(?!\/)|bg-red-500(?!\/))/;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === '.jsx') out.push(p);
  }
  return out;
}

/** Rewrite one className string literal. */
function rewriteClassString(cls, stats) {
  let out = cls;
  const onAccent = ACCENT_FILL.test(cls);

  // hairlines — always safe
  out = out.replace(/border-white(\/\[?[0-9.]+\]?)/g, (_, a) => { stats.hairline++; return `border-hairline${a}`; });
  // veils — always safe
  out = out.replace(/bg-white(\/\[?[0-9.]+\]?)/g, (_, a) => { stats.veil++; return `bg-veil${a}`; });
  // muted ink
  out = out.replace(/text-white(\/\[?[0-9.]+\]?)/g, (_, a) => { stats.mutedInk++; return `text-sdl-ink${a}`; });
  // bare inks — routed by whether this element paints an accent fill
  out = out.replace(/text-white(?![-\w/])/g, () => {
    if (onAccent) { stats.onAccent++; return 'text-sdl-onAccent'; }
    stats.ink++; return 'text-sdl-ink';
  });
  out = out.replace(/text-black(?![-\w/])/g, () => { stats.onAccent++; return 'text-sdl-onAccent'; });

  return out;
}

const files = walk(SRC)
  .map((p) => relative(ROOT, p))
  .filter((rel) => !DENYLIST[rel] && !DENY_DIRS.some((d) => rel.startsWith(d)))
  .filter((rel) => !MEDIA_FILES.includes(rel))
  .filter((rel) => (SHELL_ONLY ? SHELL.includes(rel) : true))
  .sort();

const totals = { hairline: 0, veil: 0, mutedInk: 0, ink: 0, onAccent: 0 };
const touched = [];

for (const rel of files) {
  const abs = join(ROOT, rel);
  const src = readFileSync(abs, 'utf8');
  const stats = { hairline: 0, veil: 0, mutedInk: 0, ink: 0, onAccent: 0 };

  // Only rewrite inside quoted strings / template literals, never bare identifiers.
  const out = src.replace(/(["'`])((?:[^\\\n]|\\.)*?)\1/g, (m, q, body) => {
    if (!/(text|bg|border)-(white|black)/.test(body)) return m;
    return q + rewriteClassString(body, stats) + q;
  });

  const changed = Object.values(stats).reduce((a, b) => a + b, 0);
  if (!changed) continue;
  touched.push({ rel, ...stats, changed });
  for (const k of Object.keys(totals)) totals[k] += stats[k];
  if (APPLY) writeFileSync(abs, out);
}

const w = Math.max(...touched.map((t) => t.rel.length), 10);
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${touched.length} files${SHELL_ONLY ? ' (shell only)' : ''}\n`);
console.log(`  ${'file'.padEnd(w)}  hair  veil  muted   ink  onAcc`);
for (const t of touched.sort((a, b) => b.changed - a.changed)) {
  console.log(`  ${t.rel.padEnd(w)}  ${String(t.hairline).padStart(4)}  ${String(t.veil).padStart(4)}  ${String(t.mutedInk).padStart(5)}  ${String(t.ink).padStart(4)}  ${String(t.onAccent).padStart(5)}`);
}
console.log(`\n  TOTAL  hairline ${totals.hairline} · veil ${totals.veil} · mutedInk ${totals.mutedInk} · ink ${totals.ink} · onAccent ${totals.onAccent}`);
console.log(`  = ${Object.values(totals).reduce((a, b) => a + b, 0)} rewrites`);
if (!APPLY) console.log(`\n  re-run with --apply to write.\n`);
