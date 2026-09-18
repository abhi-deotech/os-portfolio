import React, { useEffect } from 'react';
import useOSStore from '../store/osStore';
import { resolveWallpaper, isCustomWallpaper, isLegacyDataUrlWallpaper } from '../theme/wallpapers';

/**
 * The desktop plane's ingredient layer.
 *
 * Previously this file declared the wallpaper library twice — and the copy that produced the
 * className was missing all four image ids, so any photo wallpaper resolved to a hardcoded navy
 * fill instead of the intended fallback. Both copies now come from src/theme/wallpapers.js.
 *
 * An uploaded wallpaper is a Blob in its own idb key; the store holds a sentinel and, once
 * loaded, an object URL. The first render after boot has the sentinel and no URL, so this layer
 * asks the store to load it (which also migrates a legacy data-URL payload) and paints nothing
 * until it arrives. A legacy data URL still paints directly in the meantime.
 */
const Wallpaper = () => {
  const wallpaper = useOSStore((state) => state.wallpaper);
  const customUrl = useOSStore((state) => state.customWallpaperUrl);
  const loadCustomWallpaper = useOSStore((state) => state.loadCustomWallpaper);

  const custom = isCustomWallpaper(wallpaper);
  useEffect(() => {
    if (custom && !customUrl) loadCustomWallpaper();
  }, [custom, customUrl, loadCustomWallpaper]);

  let gradientClass = '';
  let backgroundStyle;
  let isColorwayPlane = false;

  if (custom) {
    const url = customUrl ?? (isLegacyDataUrlWallpaper(wallpaper) ? wallpaper : null);
    if (!url) return null;
    backgroundStyle = { backgroundImage: `url(${url})` };
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
      className={`absolute inset-0 -z-20 transition-opacity duration-1000 ${gradientClass}`}
      style={backgroundStyle ? { ...backgroundStyle, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Readability scrim for user-supplied ingredients, tinted by mode rather than always black —
          over a light colorway a black scrim reads as grime. */}
      <div className="absolute inset-0" style={{ background: 'var(--sdl-scrim)', opacity: 0.35 }} />
    </div>
  );
};

export default Wallpaper;
