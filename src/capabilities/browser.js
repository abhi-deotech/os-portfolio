/**
 * Which browser is this — for WORDING notices only. Never branch a feature on it; detect the feature
 * (registry.js). PURE: no React, no store, no `import.meta.env`.
 *
 *   describeBrowser(nav?) → { name, version, engine: 'chromium' | 'gecko' | 'webkit' | 'unknown' }
 *
 * UA Client Hints brands first (drop the GREASE "Not A Brand" entry, prefer a real brand over bare
 * "Chromium"), then the UA string. iOS browsers (CriOS / FxiOS / EdgiOS) are all WebKit underneath,
 * so the vendor position a notice cites follows the ENGINE, not the logo.
 */

const UNKNOWN = /* @__PURE__ */ Object.freeze({ name: 'this browser', version: '', engine: 'unknown' });

const BRAND_NAMES = {
  'Google Chrome': 'Chrome',
  'Microsoft Edge': 'Edge',
  'Brave': 'Brave',
  'Brave Browser': 'Brave',
  'Opera': 'Opera',
  'Opera GX': 'Opera',
  'Vivaldi': 'Vivaldi',
  'Chromium': 'Chromium',
};

const major = (v) => String(v ?? '').match(/^\d+/)?.[0] ?? '';

function fromBrands(brands) {
  if (!Array.isArray(brands)) return null;
  const real = brands.filter((b) => typeof b?.brand === 'string' && !/not.?a.?brand/i.test(b.brand));
  if (real.length === 0) return null;
  const preferred = real.find((b) => b.brand !== 'Chromium') ?? real[0];
  return {
    name: BRAND_NAMES[preferred.brand] ?? preferred.brand,
    version: major(preferred.version),
    engine: 'chromium',
  };
}

function fromUserAgent(ua) {
  if (typeof ua !== 'string' || ua.length === 0) return null;
  let m = ua.match(/(CriOS|FxiOS|EdgiOS)\/(\d+)/);
  if (m) {
    const name = { CriOS: 'Chrome', FxiOS: 'Firefox', EdgiOS: 'Edge' }[m[1]];
    return { name, version: m[2], engine: 'webkit' };
  }
  m = ua.match(/Firefox\/(\d+)/);
  if (m) return { name: 'Firefox', version: m[1], engine: 'gecko' };
  m = ua.match(/Edg\/(\d+)/);
  if (m) return { name: 'Edge', version: m[1], engine: 'chromium' };
  m = ua.match(/Chrome\/(\d+)/);
  if (m) return { name: 'Chrome', version: m[1], engine: 'chromium' };
  m = ua.match(/Version\/(\d+)[.\d]*.*Safari\//);
  if (m) return { name: 'Safari', version: m[1], engine: 'webkit' };
  return null;
}

function compute(nav) {
  try {
    const found = fromBrands(nav?.userAgentData?.brands) ?? fromUserAgent(nav?.userAgent);
    return found ? Object.freeze(found) : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

let memo = null;
let override = null;

/**
 * Describe `nav`, or the running browser when omitted (memoised). An explicit `nav` is never
 * memoised and ignores the override, so tables of fake navigators stay independent.
 */
export function describeBrowser(nav) {
  if (nav !== undefined) return compute(nav);
  if (override) return override;
  if (!memo) memo = compute(typeof navigator === 'undefined' ? undefined : navigator);
  return memo;
}

/** Word notices as if running in `b` ({ name, version, engine }); null clears. Dev masks use this. */
export function setBrowserOverride(b) {
  override = b ? Object.freeze({ name: b.name, version: String(b.version ?? ''), engine: b.engine ?? 'unknown' }) : null;
}

export function _resetBrowserMemo() {
  memo = null;
  override = null;
}
