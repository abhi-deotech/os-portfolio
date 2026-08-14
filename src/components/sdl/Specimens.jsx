import React from 'react';
import ThemeScope from './ThemeScope';
import { accentMetrics } from '../../theme/cssVars';
import { accentBand } from '../../theme/registry';

/**
 * SDL specimen primitives.
 *
 * RECIPES.md is explicit that specimens are always dashboard-shaped: "the owner judges in context,
 * never on naked swatches." So a colorway card is a live mini-dashboard painted in that colorway's
 * own roles, not four dots on a rectangle. The dots are an index underneath, not the primary read.
 */

/* ── the calibration tile ───────────────────────────────────────────────────── */

export const MiniDashboard = () => (
  <div
    className="w-full overflow-hidden"
    style={{
      background: 'var(--sdl-surface)',
      borderRadius: 'var(--sdl-radius)',
      boxShadow: 'var(--sdl-lift)',
      padding: 'var(--sdl-card-pad, 14px 16px)',
      fontFamily: 'var(--sdl-font-title)',
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <span style={{ color: 'var(--sdl-title-ink)', fontSize: 15, fontWeight: 650, letterSpacing: '-0.02em' }}>
        Pipeline
      </span>
      {/* Law 5: dark chips take an accent-soft fill; light chips take plane bg + dot + hairline. */}
      <span
        className="inline-flex items-center gap-1.5"
        style={{
          background: 'var(--sdl-soft)', color: 'var(--sdl-aink)',
          fontSize: 10, fontWeight: 650, padding: '3px 8px', borderRadius: 999,
        }}
      >
        <i className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sdl-aink)' }} />
        Active
      </span>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-3">
      {[['OPEN', '247', 'surface'], ['WON', '3,180', 'surface'], ['AT RISK', '12', 'sunken']].map(([label, value, tone]) => (
        <div key={label} style={{ background: `var(--sdl-${tone})`, borderRadius: 'var(--sdl-radius-sm)', padding: '8px 10px' }}>
          <div style={{ color: 'var(--sdl-sec)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
          <div style={{ color: 'var(--sdl-ink)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </div>
        </div>
      ))}
    </div>

    {/* Law 4: the chart lives in a flat desaturated well, never naked on the plane. */}
    <div style={{ background: 'var(--sdl-chart)', borderRadius: 'var(--sdl-radius-sm)', padding: 10 }}>
      <div className="flex items-end gap-1.5" style={{ height: 40 }}>
        {[45, 70, 30, 88, 55, 95, 62].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: `${h}%`,
              // Law 2: the bar channel is SHARPER than the chrome accent.
              background: i % 2 ? 'var(--sdl-bar-b)' : 'var(--sdl-bar-a)',
              borderRadius: '3px 3px 1px 1px',
              boxShadow: 'var(--sdl-bar-shadow)',
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

/* ── swatch ladder ──────────────────────────────────────────────────────────── */

const ROLE_ROWS = [
  ['plane', 'plane'], ['surface', 'surface'], ['sunken', 'sunken'], ['chart', 'chart'],
  ['ink', 'ink'], ['sec', 'sec'], ['accent', 'accent'], ['soft', 'soft'],
];
const DATA_ROWS = [['aInk', 'aInk'], ['barA', 'barA'], ['barB', 'barB']];

export const SwatchLadder = ({ cw }) => {
  const missing = new Set(cw.missingRoles || []);
  const Row = ([key, label]) => {
    const absent = missing.has(key);
    return (
      <div key={key} className="flex items-center gap-2 py-0.5">
        <span
          className="w-4 h-4 rounded shrink-0"
          style={{ background: absent ? 'transparent' : cw.roles[key], border: '1px solid var(--sdl-glass-border)' }}
        />
        <span className="text-[11px] w-14 shrink-0" style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>{label}</span>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: absent ? 'var(--sdl-sec)' : 'var(--sdl-ink)', textDecoration: absent ? 'line-through' : 'none' }}
        >
          {absent ? '—' : cw.roles[key]}
        </span>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <div>{ROLE_ROWS.map(Row)}</div>
      <div>{DATA_ROWS.map(Row)}</div>
    </div>
  );
};

/* ── colorway card ──────────────────────────────────────────────────────────── */

export const ColorwayCard = ({ cw, active, onApply }) => (
  <button
    type="button"
    onClick={() => onApply(cw.id)}
    aria-pressed={active}
    className="text-left w-full transition-all duration-hover ease-sdl focus-visible:outline-none"
    style={{
      background: active ? 'var(--sdl-soft)' : 'var(--sdl-glass-bg)',
      border: `1px solid ${active ? 'rgb(var(--sdl-accent-rgb) / 0.55)' : 'var(--sdl-glass-border)'}`,
      borderRadius: 'var(--sdl-radius-lg)',
      padding: 12,
      boxShadow: active ? 'var(--sdl-hairline)' : 'none',
    }}
  >
    {/* The specimen renders in ITS OWN colorway — including its own grammar, so a Hearth card is
        paper-flat even while the surrounding OS is lifted and dark. */}
    <ThemeScope colorway={cw.id} className="mb-3">
      <MiniDashboard />
    </ThemeScope>

    <div className="flex items-center gap-1.5 mb-1.5">
      {[cw.roles.plane, cw.roles.surface, cw.roles.accent, cw.roles.barA].map((c, i) => (
        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c, border: '1px solid var(--sdl-glass-border)' }} />
      ))}
      {!cw.sdl && (
        <span
          className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: 'var(--sdl-sunken)', color: 'var(--sdl-sec)' }}
        >
          Non-SDL
        </span>
      )}
    </div>

    <div style={{ color: 'var(--sdl-ink)', fontSize: 15, fontWeight: 650, letterSpacing: '-0.015em' }}>
      {cw.name} {cw.suffix || ''}
    </div>
    <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>
      {cw.themeName} · {cw.mode}
    </div>
    {cw.description && (
      <div className="text-[12px] leading-snug" style={{ color: 'var(--sdl-sec)' }}>{cw.description}</div>
    )}
  </button>
);

/* ── the measured argument against the legacy pack ──────────────────────────── */

export const AccentMeasure = ({ cw }) => {
  const m = accentMetrics(cw);
  const overCeiling = m.relLuminance > accentBand.lum.max;
  return (
    <div
      className="grid grid-cols-3 gap-3 text-[11px] tabular-nums"
      style={{ background: 'var(--sdl-sunken)', borderRadius: 'var(--sdl-radius-sm)', padding: 10 }}
    >
      <div>
        <div style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>ACCENT</div>
        <div style={{ color: 'var(--sdl-ink)' }}>{cw.roles.accent}</div>
      </div>
      <div>
        <div style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>SATURATION</div>
        <div style={{ color: overCeiling ? 'var(--sdl-alert)' : 'var(--sdl-ink)' }}>{m.saturationPct}%</div>
      </div>
      <div>
        <div style={{ color: 'var(--sdl-sec)', fontWeight: 600 }}>REL. LUM.</div>
        <div style={{ color: overCeiling ? 'var(--sdl-alert)' : 'var(--sdl-ink)' }}>{m.relLuminance}</div>
      </div>
    </div>
  );
};
