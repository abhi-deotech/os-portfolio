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

  if (isCustomWallpaper(wallpaper)) {
    backgroundStyle = { backgroundImage: `url(${wallpaper})` };
  } else {
    const wp = resolveWallpaper(wallpaper);
    if (wp.type === 'image') backgroundStyle = { backgroundImage: `url(${wp.url})` };
    else gradientClass = wp.gradient;
  }

  return (
    <div
      className={`absolute inset-0 -z-20 transition-all duration-1000 ${gradientClass}`}
      style={backgroundStyle ? { ...backgroundStyle, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Readability scrim. P3 replaces this with the colorway's own wash (law 8: 10-22% alpha). */}
      <div className="absolute inset-0 bg-black/10 backdrop-brightness-[0.85]" />
    </div>
  );
};

export default Wallpaper;
