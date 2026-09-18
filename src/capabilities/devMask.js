/**
 * DEV-only capability mask — imported FIRST in src/main.jsx so nothing detects a feature before the
 * mask has removed it. Lets one Chromium profile preview how Lumina reads in another browser:
 *
 *   ?caps=firefox            delete every global whose engines.firefox is null; word notices as Firefox 155
 *   ?caps=safari             same for Safari 27
 *   ?caps=-battery,-webgpu   delete single capabilities (combinable with a preset)
 *
 * It removes FEATURES, the way a real browser lacks them, so every code path under test is the real
 * detect-the-feature path. No harness imports this module.
 */
import { applyMask, getCapability, presetGlobals } from './registry.js';
import { setBrowserOverride } from './browser.js';

const PRESET_BROWSERS = {
  firefox: { name: 'Firefox', version: '155', engine: 'gecko' },
  safari: { name: 'Safari', version: '27', engine: 'webkit' },
};

function parse(search) {
  const raw = new URLSearchParams(search).get('caps');
  if (!raw) return { paths: [], browser: null };
  const paths = [];
  let browser = null;
  for (const token of raw.split(',').map((t) => t.trim()).filter(Boolean)) {
    if (PRESET_BROWSERS[token]) {
      browser = PRESET_BROWSERS[token];
      paths.push(...presetGlobals(token));
    } else if (token.startsWith('-')) {
      const entry = getCapability(token.slice(1));
      if (entry) paths.push(...entry.globals);
    }
  }
  return { paths, browser };
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  const { paths, browser } = parse(window.location.search);
  if (paths.length) {
    const removed = applyMask({ win: window }, paths);
    console.info(`[caps] masked ${removed.length} globals`, removed);
  }
  if (browser) setBrowserOverride(browser);
}
