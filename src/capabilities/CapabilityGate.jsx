import React, { useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import useCapability from './useCapability.js';
import { buildNotice } from './notice.js';
import { StatusChip } from '../components/common/StatusChip';

/**
 * <CapabilityGate id fallback notice="inline" | "compact" | "none">children</CapabilityGate>
 *
 * Renders `children` when the capability is available. Otherwise renders the notice IN PLACE of the
 * control (never a silent no-op), followed by `fallback` when one is given. There is deliberately no
 * dialog mode: one-off actions call notifyUnavailable() from their handler instead.
 */

const LINK =
  'inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-semibold text-sdl-aInk ' +
  'hover:bg-sdl-soft transition-colors duration-hover ease-sdl focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-sdl-accent/50';

/**
 * The notice for `id`, as an inline panel or a one-line compact strip. Text comes only from
 * buildNotice (notice.js).
 *
 * `live` gives the compact variant role="status"; pass it only when the strip appears in response to
 * a user action. The inline panel is a labelled section with no live role.
 */
export const CapabilityNotice = ({ id, variant = 'inline', kind, live = false }) => {
  const cap = useCapability(id);
  const headingId = useId();
  const resolvedKind = kind ?? (cap.status === 'denied' ? 'denied' : 'unsupported');
  const notice = buildNotice(id, cap.browser, resolvedKind);
  const browserLabel = `${cap.browser.name} ${cap.browser.version}`.trim();

  if (variant === 'compact') {
    const why = notice.links.find((l) => l.label === 'Why');
    return (
      <div
        role={live ? 'status' : undefined}
        className="rounded-sdl-sm bg-sdl-sunken px-3 py-2 text-[12px] text-sdl-ink flex flex-wrap items-center gap-x-2"
      >
        <span>{notice.title}</span>
        {why && (
          <a href={why.href} target="_blank" rel="noreferrer" className={`${LINK} -my-1`}>
            Why
          </a>
        )}
      </div>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="bg-sdl-surface border border-hairline/10 rounded-sdl p-4 flex gap-3.5"
    >
      <div
        aria-hidden="true"
        className="shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center bg-sdl-warn/10 text-sdl-warn border-sdl-warn/25"
      >
        <AlertTriangle size={16} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sdl-sec/70 mb-1">
          {notice.kicker}
        </p>
        <h3 id={headingId} className="text-[14px] font-semibold text-sdl-ink">
          {notice.title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-sdl-sec">{notice.message}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {resolvedKind === 'denied'
            ? <StatusChip tone="alert" label="Permission: denied" />
            : <StatusChip tone="muted" label={`Not in ${browserLabel}`} />}
          {notice.links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={LINK}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export const CapabilityGate = ({ id, fallback = null, notice = 'inline', children }) => {
  const cap = useCapability(id);
  if (cap.available) return <>{children}</>;
  return (
    <>
      {notice !== 'none' && <CapabilityNotice id={id} variant={notice} />}
      {fallback}
    </>
  );
};

export default CapabilityGate;
