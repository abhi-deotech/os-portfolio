import React, { useEffect, useRef } from 'react';
import AppIcon from '../common/AppIcon';
import { APPS } from '../../config/apps';
import { openLuminaApp } from '../../hooks/useWallpaperMode';
import { Workflow, FolderCode } from 'lucide-react';
import { MAC_APPS, MAC_LINK_PROPS, macAppHref, shortcutHref, projectHref, PROJECT_EDITOR_NAMES } from '../../wallpaper/launchers';
import { projectName } from '../../wallpaper/config';
import { SiteIcon, Monogram, TileGlyph } from './widgets';

/**
 * Every app, one click away, without leaving the wallpaper: all of Lumina's apps (they open as
 * windows over it, a dot marks the ones already open), the Mac apps the page knows how to reach
 * (see launchers.js), and the visitor's own shortcuts and project folders. Opens from the Apps control at the head of the widget column, over the column.
 */

const ring = 'focus-visible:outline-none focus-visible:ring-2';
const tile = `flex flex-col items-center justify-start gap-1 rounded-xl min-w-0 py-2 hover:bg-veil/10 transition-colors duration-hover ease-sdl ${ring}`;

const Name = ({ children }) => (
  <span className="block w-full truncate text-center" style={{ fontSize: 11, fontWeight: 600, color: 'var(--sdl-ink)' }}>
    {children}
  </span>
);

const Heading = ({ children }) => (
  <h2 className="px-1 pt-1 pb-1.5" style={{ fontSize: 12, fontWeight: 650, color: 'var(--wp-label)' }}>{children}</h2>
);

const Grid = ({ children }) => (
  <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>{children}</div>
);

const AppLauncher = ({ prefs, openWindows, maxHeight, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.querySelector('button, a')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    const onDown = (e) => {
      // The Apps control toggles the panel itself; a press on it is not an outside click.
      if (!ref.current?.contains(e.target) && !e.target.closest?.('[data-launcher-toggle]')) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      id="wallpaper-launcher"
      role="dialog"
      aria-label="All apps"
      className="glass-2 lift overflow-y-auto scrollbar-hide"
      style={{ width: 340, maxHeight, borderRadius: 22, padding: 10, color: 'var(--sdl-ink)' }}
    >
      <Heading>Lumina</Heading>
      <Grid>
        {APPS.map((app) => (
          <button
            key={app.id}
            type="button"
            title={`Open ${app.title}`}
            onClick={() => { openLuminaApp(app.id); onClose(); }}
            className={`${tile} relative`}
          >
            <AppIcon app={app} size={20} pad={5} tile animate={false} />
            <Name>
              {app.title}
              {openWindows.includes(app.id) && <span className="sr-only"> (open)</span>}
            </Name>
            {openWindows.includes(app.id) && (
              <span
                aria-hidden="true"
                className="absolute rounded-full"
                style={{ top: 6, right: 12, width: 6, height: 6, background: 'var(--wp-mark)' }}
              />
            )}
          </button>
        ))}
      </Grid>

      <Heading>Mac</Heading>
      <Grid>
        {Object.entries(MAC_APPS).map(([id, a]) => (
          <a key={id} href={a.href} {...MAC_LINK_PROPS} title={`Open ${a.name}`} onClick={onClose} className={tile}>
            <SiteIcon host={a.site} Fallback={a.Icon} />
            <Name>{a.name}</Name>
          </a>
        ))}
        {prefs.macApps.map((name) => (
          <a key={`any:${name}`} href={macAppHref(name)} {...MAC_LINK_PROPS} title={`Open ${name}`} onClick={onClose} className={tile}>
            <Monogram name={name} />
            <Name>{name}</Name>
          </a>
        ))}
      </Grid>

      {(prefs.shortcuts?.length > 0 || prefs.projects?.length > 0) && (
        <>
          <Heading>Shortcuts and projects</Heading>
          <Grid>
            {(prefs.shortcuts ?? []).map((name) => (
              <a key={`sc:${name}`} href={shortcutHref(name)} {...MAC_LINK_PROPS} title={`Run “${name}”`} onClick={onClose} className={tile}>
                <TileGlyph Icon={Workflow} />
                <Name>{name}</Name>
              </a>
            ))}
            {(prefs.projects ?? []).map((p) => (
              <a key={`proj:${p.path}`} href={projectHref(p)} {...MAC_LINK_PROPS} title={`Open ${p.path} in ${PROJECT_EDITOR_NAMES[p.editor]}`} onClick={onClose} className={tile}>
                <TileGlyph Icon={FolderCode} />
                <Name>{projectName(p.path)}</Name>
              </a>
            ))}
          </Grid>
        </>
      )}
      <p className="px-1 pt-2" style={{ fontSize: 11, fontWeight: 550, color: 'var(--sdl-sec)' }}>
        Mac apps open in macOS. Add any other app by name in Settings → Wallpaper mode.
      </p>
    </div>
  );
};

export default AppLauncher;
