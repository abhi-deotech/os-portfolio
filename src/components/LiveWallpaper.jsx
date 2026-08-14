import React from 'react';
import useOSStore from '../store/osStore';
import { resolveWallpaper, isCustomWallpaper } from '../theme/wallpapers';

/**
 * The desktop plane's ingredient layer.
 *
 * Previously this file declared the wallpaper library twice — and the copy that produced the
 * className was missing all four image ids, so any photo wallpaper resolved to a hardcoded navy
 * fill instead of the intended fallback. Both copies now come from src/theme/wallpapers.js.
 */
const Wallpaper = () => {
  const wallpaper = useOSStore((state) => state.wallpaper);

  let gradientClass = '';
  let backgroundStyle;
  let isColorwayPlane = false;

  if (isCustomWallpaper(wallpaper)) {
    backgroundStyle = { backgroundImage: `url(${wallpaper})` };
  } else {
    const wp = resolveWallpaper(wallpaper);
    if (wp.type === 'none') isColorwayPlane = true;
    else if (wp.type === 'image') backgroundStyle = { backgroundImage: `url(${wp.url})` };
    else gradientClass = wp.gradient;
  }

  // "Colorway" renders nothing at all, so body's plane + wash (body::before in grammar.css) is what
  // the user sees. A readability scrim over an already-designed plane would only mute it.
  if (isColorwayPlane) return null;

  return (
    <div
      className={`absolute inset-0 -z-20 transition-all duration-1000 ${gradientClass}`}
      style={backgroundStyle ? { ...backgroundStyle, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Readability scrim for user-supplied ingredients, tinted by mode rather than always black —
          over a light colorway a black scrim reads as grime. */}
      <div className="absolute inset-0" style={{ background: 'var(--sdl-scrim)', opacity: 0.35 }} />
    </div>
  );
};

export default Wallpaper;
