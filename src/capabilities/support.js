/**
 * Is a capability supported here, and what state is it in. PURE: no React, no store, no
 * `import.meta.env`; plain Node imports this.
 */
import { getCapability } from './registry.js';

/**
 * The real environment, built defensively: Node 22 has a global `navigator` but no `window`, and an
 * SSR render has neither `window` nor `document`.
 */
export function defaultEnv() {
  return {
    win: typeof window === 'undefined' ? undefined : window,
    nav: typeof navigator === 'undefined' ? undefined : navigator,
    doc: typeof document === 'undefined' ? undefined : document,
  };
}

const memo = new Map();

/**
 * Whether capability `id` is present. Memoised per id for the default env only; an explicit env
 * (tests, stubs) is always evaluated fresh. Unknown ids and throwing detects are unsupported.
 */
export function isSupported(id, env) {
  const cacheable = env === undefined;
  if (cacheable && memo.has(id)) return memo.get(id);
  const entry = getCapability(id);
  let result = false;
  if (entry) {
    try {
      result = !!entry.detect(env ?? defaultEnv());
    } catch {
      result = false;
    }
  }
  if (cacheable) memo.set(id, result);
  return result;
}

/** 'universal' (all three engines) | 'two-engine' | 'chromium'. */
export function tierOf(engines = {}) {
  const n = ['chromium', 'firefox', 'safari'].filter((k) => engines?.[k] != null).length;
  if (n >= 3) return 'universal';
  if (n === 2) return 'two-engine';
  return 'chromium';
}

/**
 * unsupported | denied | granted | prompt | available.
 * `unknown` or absent permission means the engine can't be asked, so the feature reads as available.
 */
export function deriveStatus({ supported, permission } = {}) {
  if (!supported) return 'unsupported';
  if (permission === 'denied') return 'denied';
  if (permission === 'granted') return 'granted';
  if (permission === 'prompt') return 'prompt';
  return 'available';
}

/** Whether an in-place "Ask" button makes sense: a request exists and no settings tab owns it. */
export function deriveAskable({ request, settingsTab, permission } = {}) {
  return !!request && !settingsTab && (permission === 'prompt' || permission === 'unknown');
}

export function _resetSupportMemo() {
  memo.clear();
}
