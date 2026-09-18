import React from 'react';

/**
 * Settings primitives, shared by Appearance and Compatibility. Moved verbatim from
 * settings/Appearance.jsx; no hooks, icons or store dependencies.
 */

const Card = ({ title, sub, children, right }) => (
  <section
    className="mb-6"
    style={{
      background: 'var(--sdl-glass-bg)', border: '1px solid var(--sdl-glass-border)',
      borderRadius: 'var(--sdl-radius-lg)', padding: 16,
    }}
  >
    <div className="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 style={{ color: 'var(--sdl-ink)', fontSize: 15, fontWeight: 650 }}>{title}</h3>
        {sub && <p className="text-[12px] mt-0.5" style={{ color: 'var(--sdl-sec)' }}>{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

/** Accessible segmented control. role=radiogroup + roving selection, unlike the bare divs before. */
const Segmented = ({ label, value, options, onChange }) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = value === o.id;
      return (
        <button
          key={o.id}
          role="radio"
          aria-checked={on}
          type="button"
          onClick={() => onChange(o.id)}
          className="text-[12px] px-3 rounded-full transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
          style={{
            height: 'var(--sdl-control-h, 36px)',
            background: on ? 'var(--sdl-soft)' : 'var(--sdl-sunken)',
            color: on ? 'var(--sdl-aink)' : 'var(--sdl-sec)',
            fontWeight: 600,
            boxShadow: on ? 'var(--sdl-hairline)' : 'none',
          }}
        >
          {o.name}
        </button>
      );
    })}
  </div>
);

/** `id` and `describedBy` (the id of a status line, for aria-describedby) are optional attributes only. */
const Switch = ({ label, checked, onChange, id, describedBy }) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    onClick={(e) => onChange(!checked, e)}
    className="w-12 h-6 rounded-full p-1 shrink-0 transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
    style={{ background: checked ? 'var(--sdl-accent)' : 'var(--sdl-sunken)' }}
  >
    <span
      className="block w-4 h-4 rounded-full transition-transform duration-hover ease-sdl"
      style={{ background: 'var(--sdl-onAccent, #fff)', transform: checked ? 'translateX(24px)' : 'none' }}
    />
  </button>
);

/** `subId` (optional) is set on the sub line, so a control can point aria-describedby at it. */
const Row = ({ title, sub, subId, children }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <div className="min-w-0">
      <span className="block text-[13px]" style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>{title}</span>
      {sub && <span id={subId} className="block text-[11px] mt-0.5" style={{ color: 'var(--sdl-sec)' }}>{sub}</span>}
    </div>
    {children}
  </div>
);

/**
 * Keyboard-operable slider. The originals were bare divs with an onClick that read clientX — no
 * role, no tabindex, no arrow keys, so brightness could only be set with a mouse.
 */
const Slider = ({ label, value, onChange, suffix = '%' }) => (
  <div>
    <div className="flex justify-between text-[12px] mb-1.5">
      <span style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>{label}</span>
      <span className="tabular-nums" style={{ color: 'var(--sdl-sec)' }}>{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="sdl-range w-full h-1.5 appearance-none rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: `linear-gradient(to right, var(--sdl-accent) ${value}%, var(--sdl-sunken) ${value}%)`,
      }}
    />
  </div>
);

export { Card, Segmented, Switch, Row, Slider };
