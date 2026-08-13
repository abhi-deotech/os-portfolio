#!/usr/bin/env node
/**
 * sdl-sync-check — diff the vendored SDL tokens against the upstream skill, at ROLE level.
 *
 * Exits 0 and does nothing when the skill directory is absent, so CI and fresh clones never break.
 * Set SDL_SKILL_DIR to override the default location.
 *
 *   npm run sdl:check
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SKILL = process.env.SDL_SKILL_DIR || join(homedir(), '.claude', 'skills', 'sarva-design-language');

if (!existsSync(SKILL)) {
  console.log(`sdl:check — skill not present at ${SKILL}; skipping (this is not an error).`);
  process.exit(0);
}

const pairs = [
  { vendored: 'src/theme/sdl/design-tokens.json', upstream: 'colorways/design-tokens.json' },
  { vendored: 'src/theme/sdl/viz-palettes.json', upstream: 'dataviz/viz-palettes.json' },
];

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
let drift = 0;

for (const { vendored, upstream } of pairs) {
  const up = join(SKILL, upstream);
  if (!existsSync(up)) { console.log(`  ? upstream missing: ${upstream}`); continue; }

  const a = readFileSync(join(ROOT, vendored), 'utf8');
  const b = readFileSync(up, 'utf8');
  if (a === b) { console.log(`  ✓ ${vendored} — identical`); continue; }

  console.log(`  ✗ ${vendored} — DRIFT vs ${upstream}`);
  drift++;

  // Role-level diff for design-tokens; a text diff would be unreadable.
  if (vendored.includes('design-tokens')) {
    const flat = (json) => {
      const out = {};
      for (const th of json.themes) for (const cw of th.colorways) {
        for (const [k, v] of Object.entries(cw)) {
          if (typeof v === 'string') out[`${th.id}/${cw.name.toLowerCase().replace(/\s+/g, '-')}.${k}`] = v;
        }
      }
      return out;
    };
    const A = flat(read(join(ROOT, vendored)));
    const B = flat(read(up));
    const keys = new Set([...Object.keys(A), ...Object.keys(B)]);
    for (const k of [...keys].sort()) {
      if (A[k] !== B[k]) console.log(`      ${k}: ${A[k] ?? '(absent)'} → ${B[k] ?? '(absent)'}`);
    }
  }
}

if (drift) {
  console.log(`\n  Upstream has moved. Re-vendor deliberately, update src/theme/sdl/UPSTREAM.md,`);
  console.log(`  and check src/theme/overrides.js — a deviation may now be adopted or contradicted.`);
  console.log(`  Record the decision in sdl-notes.md (see the skill's EVOLUTION.md ritual).`);
} else {
  console.log('\nsdl:check — vendored tokens are in sync.');
}
process.exit(0);
