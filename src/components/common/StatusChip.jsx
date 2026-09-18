import React from 'react';

/**
 * StatusChip — SDL Law 5 for EVERY tone, not only accent.
 *
 *   dark   the tone's soft fill, no border (accent → --sdl-soft, muted → --sdl-sunken,
 *          warn / alert → the tone at 12%)
 *   light  plane background + a hairline in the tone's ink at 50%
 *
 * Both modes: a 6px dot and the label in the tone's ink, 10px / 650, pill. The mode half lives in
 * src/theme/grammar.css (`.sdl-chip`, keyed off the nearest [data-mode]), so a ThemeScope subtree
 * gets its own grammar. A label is REQUIRED: Law 10 — amber and red never appear without a word.
 */
export const StatusChip = ({ tone = 'accent', label, dot = true, className = '' }) => (
  <span className={`sdl-chip ${className}`} data-tone={tone}>
    {dot && <i className="sdl-chip-dot" aria-hidden="true" />}
    {label}
  </span>
);

// Static class strings so Tailwind's scanner sees every one.
const SEGMENT_FILL = {
  accent: 'bg-sdl-aInk',
  muted: 'bg-sdl-sec',
  warn: 'bg-sdl-warn',
  alert: 'bg-sdl-alert',
};

/**
 * SegmentBar — `n` of `of` segments filled in the tone's ink. Decorative: always pair it with a
 * StatusChip or text that says the same thing in words, so it is hidden from assistive tech.
 */
export const SegmentBar = ({ n = 0, of = 4, tone = 'accent' }) => (
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    {Array.from({ length: of }, (_, i) => (
      <span
        key={i}
        className={`block h-1.5 w-4 rounded-full ${i < n ? (SEGMENT_FILL[tone] ?? SEGMENT_FILL.accent) : 'bg-sdl-sunken'}`}
      />
    ))}
  </span>
);
