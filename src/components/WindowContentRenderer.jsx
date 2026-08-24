import React, { Suspense, useMemo } from 'react';
import SuspenseLoading from './common/SuspenseLoading';
import useOSStore from '../store/osStore';
import { GAME_MODULES, GAME_BY_ID, isUserGameId } from '../config/games';

/**
 * One React.lazy per registry entry, built from GAME_MODULES so the lazy wrappers cannot drift
 * out of sync with the registry the way the hand-written `case` list did. Built once at module
 * scope — React.lazy must not be called during render, or every render remounts the game.
 */
const GAME_COMPONENTS = Object.fromEntries(
  Object.entries(GAME_MODULES).map(([id, loader]) => [id, React.lazy(loader)])
);

const SandboxedGame = React.lazy(() => import('./games/SandboxedGame'));

// Lazy loaded components
const Terminal = React.lazy(() => import('./Terminal'));
const Settings = React.lazy(() => import('./Settings'));
const FileExplorer = React.lazy(() => import('./FileExplorer'));
const MediaPlayer = React.lazy(() => import('./MediaPlayer'));
const PhotoViewer = React.lazy(() => import('./PhotoViewer'));
const MusicApp = React.lazy(() => import('./MusicApp'));
const Games = React.lazy(() => import('./Games'));
const Benchmark = React.lazy(() => import('./Benchmark'));
const AIChat = React.lazy(() => import('./AIChat'));
const MailApp = React.lazy(() => import('./MailApp'));
const LuminaChat = React.lazy(() => import('./LuminaChat'));
const DocumentationApp = React.lazy(() => import('./DocumentationApp'));
const Notepad = React.lazy(() => import('./Notepad'));
const TaskManager = React.lazy(() => import('./TaskManager'));
const Achievements = React.lazy(() => import('./Achievements'));
const Browser = React.lazy(() => import('./Browser'));
const AboutMe = React.lazy(() => import('./AboutMe'));
const Projects = React.lazy(() => import('./Projects'));

const WindowContentRenderer = ({ id }) => {
  const findNodeById = useOSStore(state => state.findNodeById);
  const activeMediaFile = useOSStore(state => state.activeMediaFile);
  const activePhotoFile = useOSStore(state => state.activePhotoFile);
  const browserNav = useOSStore(state => state.browserNav);
  const closeWindow = useOSStore(state => state.closeWindow);

  const content = useMemo(() => {
    switch (id) {
      case 'about':
        return <AboutMe />;
      case 'projects':
        return <Projects />;
      case 'terminal':
        return <Terminal />;
      case 'settings':
        return <Settings />;
      case 'files':
        return <FileExplorer />;
      case 'media':
        return <MediaPlayer file={findNodeById(activeMediaFile)} />;
      case 'photos':
        return <PhotoViewer file={findNodeById(activePhotoFile)} />;
      case 'music':
        return <MusicApp />;
      case 'games':
        return <Games />;
      case 'benchmark':
        return <Benchmark />;
      case 'aichat':
        return <AIChat />;
      case 'mail':
        return <MailApp />;
      case 'chat':
        return <LuminaChat />;
      case 'documentation':
        return <DocumentationApp />;
      case 'notepad':
        return <Notepad />;
      case 'taskmanager':
        return <TaskManager />;
      case 'achievements':
        return <Achievements />;
      case 'browser':
        // Keyed on the navigation counter so that `openBrowser(url)` — a project's "Live Demo"
        // button — remounts Flow-Net at the new address even when the window is already open.
        // The counter is what makes re-launching the URL already on screen work too.
        return <Browser key={browserNav} />;
      default: {
        // Games resolve from the registry rather than from a `case` each. This arm is what makes
        // the registry real: previously the switch ended in `default: return null`, so a window id
        // that wasn't already compiled in here opened as empty chrome — a titled, draggable,
        // resizable window containing nothing. Two ids in apps.jsx had already fallen into it.
        const GameComponent = GAME_COMPONENTS[id];
        if (GameComponent) return <GameComponent onBack={() => closeWindow(id)} />;

        // Folder games (public/games/<slug>/) and games the visitor sideloaded both run as
        // untrusted code in a sandboxed frame. They are not compiled into the bundle at all, so
        // they can only ever be reached through this arm — which is the point of it existing.
        const entry = GAME_BY_ID[id];
        if (entry?.source === 'folder') {
          return <SandboxedGame gameId={id} entry={entry.entry} title={entry.title} onBack={() => closeWindow(id)} />;
        }
        if (isUserGameId(id)) {
          return <SandboxedGame gameId={id} title={id} onBack={() => closeWindow(id)} />;
        }

        // Not a game and not a known app: say so, rather than rendering an empty frame that
        // looks like a load that silently failed.
        return (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="font-bold text-sdl-ink">Nothing is registered for “{id}”.</p>
            <p className="text-sdl-sec text-sm">
              Add it to <code className="font-mono text-xs">src/config/games.js</code> or to this switch.
            </p>
          </div>
        );
      }
    }
  }, [id, findNodeById, activeMediaFile, activePhotoFile, browserNav, closeWindow]);

  if (!content) return null;

  return (
    <Suspense fallback={<SuspenseLoading title={`Initializing ${id}...`} />}>
      {content}
    </Suspense>
  );
};

export default React.memo(WindowContentRenderer);
