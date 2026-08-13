#!/usr/bin/env node
/**
 * token-lint — the ratchet.
 *
 * Fails when a file introduces MORE untokenized colour than its recorded allowance. Allowances come
 * from scripts/.token-allowance.json, regenerated with --bless. The point is one-directional
 * pressure: you can always remove untokenized colour, never add it.
 *
 * Runs in warn mode (exit 0) by default so it can land early in the migration and still be useful
 * as a per-commit progress signal. Pass --strict to make it a real gate (planned for P7).
 *
 *   node scripts/token-lint.mjs            # warn, exit 0
 *   node scripts/token-lint.mjs --strict   # gate, exit 1 on any regression
 *   node scripts/token-lint.mjs --bless    # record current counts as the new allowance
 *
 * DENYLIST: files where hardcoded colour is CONTENT, not chrome. A codemod that rewrites these
 * corrupts user-visible material. Each entry carries its reason — do not prune without reading it.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const ALLOWANCE = join(ROOT, 'scripts', '.token-allowance.json');

/** Colour here is CONTENT. Rewriting it breaks something the user reads or a third-party identity. */
export const DENYLIST = {
  'src/data/fileSystem.js': 'ships STYLING.md/TERMINAL.md as in-app readable text, incl. literal CSS var declarations',
  'src/hooks/useTerminal.js': '8 third-party terminal palettes (dracula, solarized, monokai) — shipped feature + others\' brand identities',
  'src/config/apps.jsx': 'app icon colours are brand identity; a real OS keeps them (icon THEMES handle this instead)',
  'src/data/musicData.js': 'playlist gradient identities are content',
  'src/components/Achievements.jsx': 'badge gradient pairs are gamification identity, not chrome',
  'src/components/BSOD.jsx': 'deliberately off-theme — a blue screen is a blue screen',
  'src/components/wallpapers/QuantumParticles.jsx': 'generative canvas content',
  'src/components/Screensaver.jsx': 'generative content',
  'src/components/Visualizer.jsx': 'generative canvas content',
};

const EXT = new Set(['.jsx', '.js']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(extname(p))) out.push(p);
  }
  return out;
}

const RULES = [
  { id: 'hex', label: 'hardcoded hex', re: /#[0-9a-fA-F]{6}\b/g },
  { id: 'white', label: 'white/black literal', re: /(?:text|bg|border|ring|from|to|via|divide)-(?:white|black)(?:\/\[?[0-9.]+\]?)?/g },
  { id: 'stock', label: 'stock Tailwind colour', re: /(?:text|bg|border|ring|from|to|via)-(?:red|green|yellow|blue|purple|cyan|orange|pink|indigo|rose|emerald|violet|teal|sky|amber)-[0-9]{2,3}/g },
];

/**
 * Directory-level exemptions. `src/theme/` IS the token layer — centralising every hex there is the
 * entire goal of the migration, so linting it would punish the fix. Everything else in src/ must
 * consume roles, not literals.
 */
export const DENY_DIRS = ['src/theme/'];

const files = walk(SRC).map((p) => relative(ROOT, p)).sort();
const current = {};
for (const rel of files) {
  if (DENYLIST[rel] || DENY_DIRS.some((d) => rel.startsWith(d))) continue;
  const text = readFileSync(join(ROOT, rel), 'utf8');
  const counts = {};
  let any = 0;
  for (const r of RULES) {
    const n = (text.match(r.re) || []).length;
    if (n) { counts[r.id] = n; any += n; }
  }
  if (any) current[rel] = counts;
}

if (process.argv.includes('--bless')) {
  writeFileSync(ALLOWANCE, JSON.stringify(current, null, 2) + '\n');
  const total = Object.values(current).reduce((s, c) => s + Object.values(c).reduce((a, b) => a + b, 0), 0);
  console.log(`token-lint: blessed ${Object.keys(current).length} files / ${total} occurrences as the allowance.`);
  process.exit(0);
}

if (!existsSync(ALLOWANCE)) {
  console.error('token-lint: no allowance file. Run `node scripts/token-lint.mjs --bless` first.');
  process.exit(1);
}

const allowance = JSON.parse(readFileSync(ALLOWANCE, 'utf8'));
const strict = process.argv.includes('--strict');
const regressions = [];
const improvements = [];

for (const [file, counts] of Object.entries(current)) {
  for (const r of RULES) {
    const now = counts[r.id] || 0;
    const was = allowance[file]?.[r.id] || 0;
    if (now > was) regressions.push({ file, rule: r.label, was, now });
    else if (now < was) improvements.push({ file, rule: r.label, was, now });
  }
}
// files that vanished from `current` entirely are pure wins
for (const [file, counts] of Object.entries(allowance)) {
  if (!current[file]) {
    for (const r of RULES) {
      const was = counts[r.id] || 0;
      if (was) improvements.push({ file, rule: r.label, was, now: 0 });
    }
  }
}

const won = improvements.reduce((s, i) => s + (i.was - i.now), 0);
if (won) console.log(`token-lint: \x1b[32m-${won}\x1b[0m untokenized occurrences vs allowance across ${new Set(improvements.map((i) => i.file)).size} files.`);

if (!regressions.length) {
  console.log('token-lint: no regressions. \x1b[32mOK\x1b[0m');
  if (won) console.log('  (run with --bless to lock in the improvement)');
  process.exit(0);
}

console.error(`\ntoken-lint: \x1b[31m${regressions.length} regression(s)\x1b[0m — untokenized colour was ADDED:\n`);
for (const r of regressions) console.error(`  ${r.file}\n    ${r.rule}: ${r.was} → ${r.now}`);
console.error(`\n  Use SDL role tokens instead. If the colour is genuinely CONTENT (not chrome),`);
console.error(`  add the file to DENYLIST in scripts/token-lint.mjs with a reason.\n`);
process.exit(strict ? 1 : 0);
