/**
 * Live SDL role colours for `<canvas>` drawing.
 *
 * Canvas takes concrete colour strings, not CSS variables — `ctx.fillStyle = 'var(--sdl-ink)'`
 * is silently ignored and leaves the previous fill in place. So a canvas game would otherwise
 * have to hardcode a palette, which is precisely the drift the SDL token layer exists to prevent:
 * a hardcoded neon board would sit unchanged on a Cocoa or a light colorway.
 *
 * Values are read from the computed style of documentElement, where applyTheme stamps them, so
 * this reflects whatever colorway is live at the moment it is called. Call it inside the draw
 * loop (or on colorway change) rather than caching it at module scope.
 */
const readVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** `--sdl-*-rgb` variables hold a bare "R G B" triple for use in rgb() with alpha. */
const rgbVar = (name, fallback) => {
  const v = readVar(name, '');
  return v ? `rgb(${v})` : fallback;
};

const alphaVar = (name, alpha, fallback) => {
  const v = readVar(name, '');
  return v ? `rgb(${v} / ${alpha})` : fallback;
};

export function canvasPalette() {
  return {
    plane: readVar('--sdl-plane', '#0a0a0a'),
    surface: readVar('--sdl-surface', '#141414'),
    sunken: readVar('--sdl-sunken', '#050505'),
    ink: readVar('--sdl-ink', '#f5f5f5'),
    sec: readVar('--sdl-sec', '#8a8a8a'),
    accent: rgbVar('--sdl-accent-rgb', '#cc97ff'),
    accentSoft: alphaVar('--sdl-accent-rgb', 0.25, 'rgba(204,151,255,0.25)'),
    primary: rgbVar('--os-primary-rgb', '#cc97ff'),
    secondary: rgbVar('--os-secondary-rgb', '#00d2fd'),
    tertiary: rgbVar('--os-tertiary-rgb', '#00f5a0'),
    hairline: alphaVar('--sdl-hairline-rgb', 0.15, 'rgba(255,255,255,0.15)'),
    alert: readVar('--sdl-alert', '#ff5c5c'),
    /** Alpha ramp on the accent, for particle trails and ghost pieces. */
    accentAt: (a) => alphaVar('--sdl-accent-rgb', a, `rgba(204,151,255,${a})`),
    inkAt: (a) => alphaVar('--sdl-ink-rgb', a, `rgba(245,245,245,${a})`),
  };
}

export default canvasPalette;
