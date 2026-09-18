import React, { useState, useSyncExternalStore } from 'react';
import { CAPABILITIES, GROUPS } from '../../capabilities/registry.js';
import { VERIFIED_ON, getPositions } from '../../capabilities/positions.js';
import { buildNotice } from '../../capabilities/notice.js';
import { describeBrowser } from '../../capabilities/browser.js';
import useCapability from '../../capabilities/useCapability.js';
import { StatusChip } from '../common/StatusChip';
import { Card } from './primitives';
import { getWakeLockStatus, subscribeWakeLock } from '../../hooks/useWakeLock';

/**
 * Settings → Compatibility. What THIS browser can do for Lumina, checked feature by feature.
 *
 * Store-free: every row is useCapability(id). Unsupported and denied rows quote the same sentence the
 * notices use (notice.js); supported rows show the caveat from positions.js.
 *
 * Rows are laid out here rather than with the shared `Row` primitive because they must stack below
 * `sm`, and Row (moved verbatim from Appearance) is always a single horizontal line.
 */

const QUIET =
  'inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-semibold text-sdl-aInk ' +
  'hover:bg-sdl-soft transition-colors duration-hover ease-sdl focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-sdl-accent/50 disabled:opacity-40';

// Where "Set up" sends keyboard focus, per settings tab. Switching tabs unmounts this pane and the
// focused button with it, so focus would otherwise fall to <body>. Ids are set by the target
// (ScreenCard.jsx: the idle-detection switch).
const SETUP_FOCUS = { system: 'screen-idle-switch' };

function chipFor(cap) {
  switch (cap.status) {
    case 'unsupported': return { tone: 'muted', label: `Not in ${`${cap.browser.name} ${cap.browser.version}`.trim()}` };
    case 'denied': return { tone: 'alert', label: 'Permission: denied' };
    case 'granted': return { tone: 'accent', label: 'Permission: granted' };
    case 'prompt': return { tone: 'accent', label: 'Permission: ask' };
    default: return { tone: 'accent', label: 'Available' };
  }
}

/** The live wake-lock state: who holds it, or what happened to it. Nothing before the first request. */
function wakeLockText({ state, owner, error }) {
  if (state === 'held') return `Held by ${owner}`;
  if (state === 'released') return 'Released';
  if (state === 'blocked') return `Blocked by the system (${error})`;
  return null;
}

const WakeLockStatusLine = () => {
  const status = useSyncExternalStore(subscribeWakeLock, getWakeLockStatus, getWakeLockStatus);
  const text = wakeLockText(status);
  if (!text) return null;
  return <span className="block text-[11px] mt-0.5 text-sdl-sec">{text}</span>;
};

const CapabilityRow = ({ entry, onOpenTab }) => {
  const cap = useCapability(entry.id);
  const [persisted, setPersisted] = useState(null);
  const [asking, setAsking] = useState(false);
  const chip = chipFor(cap);

  const blocked = cap.status === 'unsupported' || cap.status === 'denied';
  const notice = blocked ? buildNotice(entry.id, describeBrowser(), cap.status === 'denied' ? 'denied' : 'unsupported') : undefined;
  const why = notice?.links.find((l) => l.label === 'Why');
  const caveat = getPositions(entry.id)?.caveat;

  const setUp = (e) => {
    // The button's own document and window: in a popped-out Settings the target lives there.
    const doc = e.currentTarget.ownerDocument;
    onOpenTab?.(entry.settingsTab);
    const targetId = SETUP_FOCUS[entry.settingsTab];
    if (!targetId || !doc) return;
    const focus = () => doc.getElementById(targetId)?.focus();
    const win = doc.defaultView;
    if (typeof win?.requestAnimationFrame === 'function') win.requestAnimationFrame(focus);
    else setTimeout(focus, 0);
  };

  const ask = async () => {
    if (!cap.request) return;
    setAsking(true);
    try {
      await cap.request();
    } catch {
      /* a refused or failed request is reflected by the permission state, not an error here */
    }
    // Never assumed: eviction protection is read back from the browser after asking.
    if (entry.id === 'persistentStorage' && typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      try {
        setPersisted(await navigator.storage.persisted());
      } catch {
        setPersisted(false);
      }
    }
    setAsking(false);
  };

  let sub = null;
  if (blocked) sub = notice.why;
  else if (caveat) sub = caveat;

  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <span className="block text-[13px] font-semibold text-sdl-ink">{cap.label}</span>
        {sub && (
          <span className="block text-[11px] mt-0.5 text-sdl-sec">
            {sub}
            {why && (
              <>
                {' '}
                <a href={why.href} target="_blank" rel="noreferrer" className="font-semibold text-sdl-aInk hover:underline">
                  Why
                </a>
              </>
            )}
          </span>
        )}
        {entry.id === 'wakeLock' && cap.supported && <WakeLockStatusLine />}
        {persisted !== null && (
          <span className="block text-[11px] mt-0.5 text-sdl-sec">
            {persisted ? 'Protected' : `Not granted by ${cap.browser.name}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusChip tone={chip.tone} label={chip.label} />
        {cap.askable && persisted === null && (
          <button type="button" onClick={ask} disabled={asking} aria-label={`Ask for ${cap.label}`} className={QUIET}>
            Ask
          </button>
        )}
        {entry.settingsTab && cap.supported && (
          <button type="button" onClick={setUp} aria-label={`Set up ${cap.label}`} className={QUIET}>
            Set up
          </button>
        )}
      </div>
    </div>
  );
};

const Compatibility = ({ onOpenTab }) => {
  const browser = describeBrowser();
  const who = `${browser.name} ${browser.version}`.trim();

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="mb-1 font-title text-sdl-ink" style={{ fontSize: 34, fontWeight: 650, letterSpacing: '-0.02em' }}>
        What {who} can do here
      </h2>
      <p className="text-[13px] mb-6 text-sdl-sec">
        Checked feature by feature in this session. The browser&apos;s name is only used to word these rows.
      </p>

      {GROUPS.map((group) => (
        <Card key={group.id} title={group.label}>
          <div className="divide-y divide-hairline/10">
            {CAPABILITIES.filter((c) => c.group === group.id).map((entry) => (
              <CapabilityRow key={entry.id} entry={entry} onOpenTab={onOpenTab} />
            ))}
          </div>
        </Card>
      ))}

      <p className="text-[11px] text-sdl-sec flex flex-wrap items-center gap-x-1">
        <span>Support data checked {VERIFIED_ON}</span>
        <a href="https://github.com/mozilla/standards-positions" target="_blank" rel="noreferrer" className={QUIET}>
          Mozilla standards positions
        </a>
        <a href="https://github.com/WebKit/standards-positions" target="_blank" rel="noreferrer" className={QUIET}>
          WebKit standards positions
        </a>
      </p>
    </div>
  );
};

export default Compatibility;
