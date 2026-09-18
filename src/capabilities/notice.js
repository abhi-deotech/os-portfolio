/**
 * THE ONLY PLACE NOTICE TEXT IS WRITTEN. Panels (CapabilityGate.jsx), dialogs (notify.js) and the
 * Compatibility pane all read these strings, so a notice says the same thing wherever it appears.
 *
 * PURE: no React, no store, no `import.meta.env`; plain Node imports this.
 *
 * Template (tasks/integrations-catalog.md §1):
 *   Title    "{label} isn’t available in {Browser} {major}."
 *   Message  "{Vendor} {verb}. {instead} Works in: Chrome 94+ · Edge 114+ · …"
 *
 * The vendor follows the ENGINE (iOS Chrome is WebKit). When the engine has no vendor entry, or the
 * engine does ship the feature in some version (so this is a device or version gap, not a position),
 * the message says the browser doesn't expose it on this device or version instead.
 */
import { getCapability } from './registry.js';
import { getPositions } from './positions.js';

const VENDOR_BY_ENGINE = {
  gecko: { key: 'mozilla', name: 'Mozilla', engineKey: 'firefox' },
  webkit: { key: 'webkit', name: 'WebKit', engineKey: 'safari' },
};

/** The sentence after "{Vendor} ", without a trailing period. */
export function stanceVerb(stance, reason) {
  switch (stance) {
    case 'negative':
    case 'oppose':
      return `has declined to implement it, citing ${reason}`;
    case 'concerns':
      return `hasn’t implemented it and has recorded concerns (${reason})`;
    case 'blocked':
      return `hasn’t implemented it; its review is blocked (${reason})`;
    case 'neutral':
      return `hasn’t implemented it (neutral position; ${reason})`;
    case 'positive':
    case 'support':
      return `supports it but hasn’t enabled it here (${reason})`;
    case 'not-implementing':
    case 'none':
    default:
      return `hasn’t implemented it (${reason})`;
  }
}

const fmtVersion = (v) => `${v}+`;

/** "Chrome/Edge 86+ · Firefox 151+ · Safari 15.2+", or "Chrome 94+ · Edge 114+" with an edge override. */
export function worksInText(engines = {}) {
  const parts = [];
  if (engines.chromium != null) {
    if (engines.edge != null && engines.edge !== engines.chromium) {
      parts.push(`Chrome ${fmtVersion(engines.chromium)}`, `Edge ${fmtVersion(engines.edge)}`);
    } else {
      parts.push(`Chrome/Edge ${fmtVersion(engines.chromium)}`);
    }
  }
  if (engines.firefox != null) parts.push(`Firefox ${fmtVersion(engines.firefox)}`);
  if (engines.safari != null) parts.push(`Safari ${fmtVersion(engines.safari)}`);
  return parts.join(' · ');
}

const browserLabel = (browser) => `${browser?.name ?? 'this browser'} ${browser?.version ?? ''}`.trim();
const capitalise = (s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/**
 * @param {string} id
 * @param {{ name: string, version: string, engine: string }} browser
 * @param {'unsupported' | 'denied' | 'refused'} kind
 *   `refused`: the feature exists but the browser turned this one request down, and there is no site
 *   permission to change (a refused requestFullscreen), so no site-settings advice.
 * @param {{ errName?: string }} [options]  `errName` (the DOMException name) is quoted in a refusal.
 * @returns {{ kicker, tone, icon, title, message, why, worksIn, links, confirmLabel }}
 *   `why` is the first sentence of the message on its own, for one-line surfaces (pane rows).
 */
export function buildNotice(id, browser, kind = 'unsupported', { errName } = {}) {
  const cap = getCapability(id);
  const entry = cap ? { ...cap, ...getPositions(id) } : undefined;
  const label = entry?.label ?? 'This feature';
  const who = browserLabel(browser);
  const worksIn = entry ? worksInText(entry.engines) : '';
  const instead = entry?.instead ?? '';
  const supportLink = entry?.links?.mdn ? [{ label: 'Support table', href: entry.links.mdn }] : [];

  const base = { kicker: 'Compatibility', tone: 'warn', icon: 'alert', confirmLabel: 'Got it', worksIn };

  if (kind === 'denied') {
    const why = `This permission is turned off for this site in ${browser?.name ?? 'this browser'}.`;
    return {
      ...base,
      title: `${label} is blocked for this site.`,
      why,
      message: `${why} To allow it, open this site’s settings from the address bar, then try again. ${instead}`.trim(),
      links: supportLink,
    };
  }

  if (kind === 'refused') {
    const why = `${capitalise(browser?.name ?? 'this browser')} refused the request${errName ? ` (${errName})` : ''}.`;
    return {
      ...base,
      title: `${label} didn’t start.`,
      why,
      message: `${why} ${instead}`.trim(),
      links: supportLink,
    };
  }

  const vendorMeta = VENDOR_BY_ENGINE[browser?.engine];
  const vendor = vendorMeta ? entry?.vendor?.[vendorMeta.key] : undefined;
  const engineShipsIt = vendorMeta ? entry?.engines?.[vendorMeta.engineKey] != null : false;

  let why;
  let links;
  if (vendor && !engineShipsIt) {
    why = `${vendorMeta.name} ${stanceVerb(vendor.stance, vendor.reason)}.`;
    links = vendor.url ? [{ label: 'Why', href: vendor.url }, ...supportLink] : supportLink;
  } else {
    why = `${capitalise(who)} doesn’t expose it on this device or version.`;
    links = supportLink;
  }

  return {
    ...base,
    title: `${label} isn’t available in ${who}.`,
    why,
    message: [why, instead, worksIn ? `Works in: ${worksIn}` : ''].filter(Boolean).join(' '),
    links,
  };
}
