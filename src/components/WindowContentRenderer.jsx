import React, { Suspense, useMemo } from 'react';
import SuspenseLoading from './common/SuspenseLoading';
import useOSStore from '../store/osStore';

// Lazy loaded components
const Terminal = React.lazy(() => import('./Terminal'));
const Settings = React.lazy(() => import('./Settings'));
const FileExplorer = React.lazy(() => import('./FileExplorer'));
const MediaPlayer = React.lazy(() => import('./MediaPlayer'));
const PhotoViewer = React.lazy(() => import('./PhotoViewer'));
const MusicApp = React.lazy(() => import('./MusicApp'));
const Games = React.lazy(() => import('./Games'));
const Snake = React.lazy(() => import('./games/Snake'));
const MemoryGame = React.lazy(() => import('./games/MemoryGame'));
const TriviaGame = React.lazy(() => import('./games/TriviaGame'));
const Game2048 = React.lazy(() => import('./games/Game2048'));
const Sudoku = React.lazy(() => import('./games/Sudoku'));
const Benchmark = React.lazy(() => import('./Benchmark'));
const AIChat = React.lazy(() => import('./AIChat'));
const MailApp = React.lazy(() => import('./MailApp'));
const LuminaChat = React.lazy(() => import('./LuminaChat'));
const RetroArcade = React.lazy(() => import('./RetroArcade'));
const DocumentationApp = React.lazy(() => import('./DocumentationApp'));
const Notepad = React.lazy(() => import('./Notepad'));
const TaskManager = React.lazy(() => import('./TaskManager'));
const Achievements = React.lazy(() => import('./Achievements'));
const Browser = React.lazy(() => import('./Browser'));

const WindowContentRenderer = ({ id }) => {
  const findNodeById = useOSStore(state => state.findNodeById);
  const activeMediaFile = useOSStore(state => state.activeMediaFile);
  const activePhotoFile = useOSStore(state => state.activePhotoFile);
  const closeWindow = useOSStore(state => state.closeWindow);

  const content = useMemo(() => {
    switch (id) {
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
      case 'snake':
        return <Snake onBack={() => closeWindow('snake')} />;
      case 'memory':
        return <MemoryGame onBack={() => closeWindow('memory')} />;
      case 'trivia':
        return <TriviaGame onBack={() => closeWindow('trivia')} />;
      case '2048':
        return <Game2048 onBack={() => closeWindow('2048')} />;
      case 'sudoku':
        return <Sudoku onBack={() => closeWindow('sudoku')} />;
      case 'benchmark':
        return <Benchmark />;
      case 'aichat':
        return <AIChat />;
      case 'mail':
        return <MailApp />;
      case 'chat':
        return <LuminaChat />;
      case 'retroarcade':
        return <RetroArcade />;
      case 'documentation':
        return <DocumentationApp />;
      case 'notepad':
        return <Notepad />;
      case 'taskmanager':
        return <TaskManager />;
      case 'achievements':
        return <Achievements />;
      case 'browser':
        return <Browser />;
      default:
        return null;
    }
  }, [id, findNodeById, activeMediaFile, activePhotoFile, closeWindow]);

  if (!content) return null;

  return (
    <Suspense fallback={<SuspenseLoading title={`Initializing ${id}...`} />}>
      {content}
    </Suspense>
  );
};

export default React.memo(WindowContentRenderer);
