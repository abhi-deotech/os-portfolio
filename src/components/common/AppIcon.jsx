import React from 'react';
import { motion } from 'framer-motion';
import useOSStore from '../../store/osStore';
import { resolveColorway } from '../../theme/registry';
import { iconStyle, DEFAULT_ICON_THEME, isKnownIconTheme } from '../../theme/icons';

/**
 * AppIcon — the single renderer for every app icon in the OS.
 *
 * Replaces the per-app `icon: (size) => <CustomIcon … color="#00f5a0" />` closures that used to live
 * in `config/apps.jsx`. Those closures were the reason app colour could never be themed: each app
 * baked a literal legacy-neon hex, so `config/apps.jsx` sat on the codemod DENYLIST and eighteen
 * separate call sites had to agree. Now the config declares DATA (glyph, hue) and one component
 * decides how it looks under the active theme.
 *
 * Two channels, because a bare glyph makes every retint violent — the colour IS the whole icon:
 *   `tile`  the squircle behind the glyph (a tint over glass, a filled shape, or nothing)
 *   `glyph` the mark itself
 *
 * @param {object}  app       an APPS record: { glyph | mono, hue, legacyHex, badge }
 * @param {number}  size      glyph size in px
 * @param {boolean} tile      render the squircle. Off in the dock, on for desktop/launcher tiles.
 * @param {number}  pad       tile padding; defaults to a ratio of `size`
 * @param {string}  radius    tile radius; defaults to the colorway's own large radius
 * @param {string}  colorway  override for previews (Settings renders every theme at once)
 * @param {string}  theme     icon-theme override, same reason
 */
const AppIcon = ({
  app,
  size = 24,
  tile = false,
  pad,
  radius,
  className = '',
  animate = true,
  colorway: colorwayOverride,
  theme: themeOverride,
}) => {
  const storeColorway = useOSStore((s) => s.colorway);
  const storeTheme = useOSStore((s) => s.iconTheme);

  if (!app) return null;

  const themeId = themeOverride
    ?? (isKnownIconTheme(storeTheme) ? storeTheme : DEFAULT_ICON_THEME);
  const cw = resolveColorway(colorwayOverride ?? storeColorway);
  const s = iconStyle(themeId, cw, app);

  const Glyph = app.glyph;
  const tilePad = pad ?? Math.round(size * 0.58);
  // Solid's glyph ink is chosen to read INSIDE its filled tile; on the bare dock that same ink is
  // cream-on-cream. `bare` is the free-floating variant.
  const glyphColor = tile ? s.glyph : (s.bare ?? s.glyph);

  const mark = app.mono
    ? (
      <span
        className="font-mono font-bold leading-none select-none"
        style={{ color: glyphColor, fontSize: Math.round(size * 0.86) }}
      >
        {app.mono}
      </span>
    )
    : Glyph
      ? <Glyph size={size} color={glyphColor} strokeWidth={s.strokeWidth} />
      : null;

  const inner = (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={s.glow ? { filter: `drop-shadow(0 0 8px ${s.glow})` } : undefined}
    >
      {mark}
      {app.badge && (
        <span
          className="absolute -top-0.5 -right-0.5 rounded-full animate-pulse"
          style={{
            width: Math.max(6, size * 0.28),
            height: Math.max(6, size * 0.28),
            background: s.dot,
            boxShadow: `0 0 0 2px ${cw.roles.surface}`,
          }}
        />
      )}
    </span>
  );

  const motionProps = animate
    ? {
      whileHover: { scale: 1.04 },
      whileTap: { scale: 0.97 },
      transition: { type: 'spring', stiffness: 400, damping: 17 },
    }
    : {};

  if (!tile) {
    return (
      <motion.span className={`inline-flex items-center justify-center shrink-0 ${className}`} {...motionProps}>
        {inner}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        padding: tilePad,
        borderRadius: radius ?? 'var(--sdl-radius-lg)',
        background: s.tile ?? 'transparent',
        border: `1px solid ${s.tileBorder ?? 'transparent'}`,
        // The tile sits over the user's wallpaper, so it stays glass. Outline resolves `tile` to
        // null and therefore blurs nothing — which is the point of that theme.
        backdropFilter: s.tile ? 'blur(24px)' : undefined,
      }}
      {...motionProps}
    >
      {inner}
    </motion.span>
  );
};

export default AppIcon;
