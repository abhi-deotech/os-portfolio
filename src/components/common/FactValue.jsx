import React, { useEffect, useState } from 'react';
import { describeBrowser } from '../../capabilities/browser.js';
import { unavailableText } from '../../system/facts.js';
import { SegmentBar, StatusChip } from './StatusChip';

/**
 * FactValue — one system fact, worded truthfully. The caller reads the fact (useSystemFact) and
 * passes it in.
 *
 *   reported     the browser's value, tabular
 *   pending      "Probing…" / "Waiting for first sample"
 *   unavailable  "Not exposed by Firefox", "Masked by Safari", … plus a Why link ONLY when the browser
 *                lacks the capability outright. A masked GPU or a denied permission gets no link: the
 *                vendor's position is not the reason there.
 *
 * The Why href comes from buildNotice (notice.js), the only place notice text lives. notice.js is
 * loaded on demand, only for a fact that needs the link, so the desktop widgets that render facts at
 * first paint don't carry notice text; the label shows without the link until it resolves.
 */
export const FactValue = ({ fact, className = '' }) => {
  const whyId = fact?.source === 'unavailable' && fact.reason === 'unsupported' && fact.capabilityId
    ? fact.capabilityId
    : null;
  // { id, href } for the capability the link was resolved for; a result for another id is ignored.
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    if (!whyId) return undefined;
    let live = true;
    import('../../capabilities/notice.js').then(
      ({ buildNotice }) => {
        if (!live) return;
        const link = buildNotice(whyId, describeBrowser()).links.find((l) => l.label === 'Why');
        setResolved({ id: whyId, href: link?.href ?? null });
      },
      () => { /* the link is an extra; without notice.js the label stands on its own */ },
    );
    return () => { live = false; };
  }, [whyId]);

  if (fact?.source === 'reported') {
    return <span className={`tabular-nums text-sdl-ink ${className}`}>{fact.text}</span>;
  }
  const text = unavailableText(fact, describeBrowser().name);
  const whyHref = whyId && resolved?.id === whyId ? resolved.href : null;
  return (
    <span className={`text-sdl-sec ${className}`}>
      {text}
      {whyHref && (
        <>
          {' '}
          <a href={whyHref} target="_blank" rel="noreferrer" className="font-semibold text-sdl-aInk hover:underline">
            Why
          </a>
        </>
      )}
    </span>
  );
};

/**
 * FactRow — label, value and a status chip in words. "Reported" is accent (never a green "healthy"),
 * "Not exposed" is muted (a browser withholding a number is not an alert).
 */
export const FactRow = ({ label, fact }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-[13px] text-sdl-sec">{label}</span>
    <span className="flex items-center gap-2 min-w-0 text-[13px] text-right">
      <FactValue fact={fact} />
      {fact?.source === 'reported' && <StatusChip tone="accent" label="Reported" />}
      {fact?.source === 'unavailable' && <StatusChip tone="muted" label="Not exposed" />}
    </span>
  </div>
);

// Law 10: amber and red always sit beside the word they mean.
const PRESSURE_TONE = { nominal: 'accent', fair: 'accent', serious: 'warn', critical: 'alert' };

/**
 * PressureValue — the CPU pressure fact as a chip in words plus segments, or the FactValue wording
 * over hollow segments when the browser reports nothing.
 */
export const PressureValue = ({ fact, className = '' }) => {
  if (fact?.source === 'reported') {
    const tone = PRESSURE_TONE[fact.value] ?? 'muted';
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        <StatusChip tone={tone} label={fact.text} />
        <SegmentBar n={fact.detail?.segments ?? 0} tone={tone} />
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <FactValue fact={fact} />
      <SegmentBar n={0} />
    </span>
  );
};

export default FactValue;
