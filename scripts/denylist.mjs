/**
 * Where hardcoded colour is legitimate. Shared by token-lint and the codemods so they can never
 * disagree about what is chrome and what is content.
 *
 * A codemod that rewrites anything in here corrupts something the user reads, or overwrites a third
 * party's brand identity. Each entry carries its reason — do not prune one without reading it.
 */
export const DENYLIST = {
  'src/data/fileSystem.js': 'ships STYLING.md/TERMINAL.md as in-app READABLE TEXT, including literal CSS var declarations and hex tables',
  'src/hooks/useTerminal.js': '8 third-party terminal palettes (dracula, solarized, monokai) — a shipped feature and other people\'s identities',
  'src/config/apps.jsx': 'app icon colours are brand identity; a real OS keeps them. Icon THEMES handle recolouring instead',
  'src/data/musicData.js': 'playlist gradient identities are content',
  'src/components/Achievements.jsx': 'all 30 are from-X/to-Y badge gradient pairs — gamification identity, not chrome',
  'src/components/BSOD.jsx': 'deliberately off-theme — a blue screen is a blue screen',
  'src/components/wallpapers/QuantumParticles.jsx': 'generative canvas content',
  'src/components/Screensaver.jsx': 'generative content',
  'src/components/Visualizer.jsx': 'generative canvas content',
};

/**
 * Directory-level exemptions. `src/theme/` IS the token layer — centralising every hex there is the
 * entire goal of the migration, so linting it would punish the fix.
 */
export const DENY_DIRS = ['src/theme/'];

/** The OS chrome — migrated first, because it is the most visible and easiest to verify. */
export const SHELL = [
  'src/App.jsx', 'src/components/Desktop.jsx', 'src/components/Taskbar.jsx',
  'src/components/Window.jsx', 'src/components/WindowGlass.jsx', 'src/components/ControlCenter.jsx',
  'src/components/Spotlight.jsx', 'src/components/Widgets.jsx', 'src/components/ClockWidget.jsx',
  'src/components/SystemDashboard.jsx', 'src/components/SystemMetricsWidget.jsx',
  'src/components/widgets/QuantumWidget.jsx', 'src/components/LoginScreen.jsx',
  'src/components/BootSequence.jsx', 'src/components/AchievementToast.jsx',
  'src/components/common/CustomIcon.jsx', 'src/components/common/SuspenseLoading.jsx',
];

/**
 * Files where a white/black ink sits on media or a deliberately dark device surface. These are
 * mode-INVARIANT: a video letterbox is black in light mode too.
 */
export const MEDIA_FILES = [
  'src/components/MediaPlayer.jsx', 'src/components/PhotoViewer.jsx',
  'src/components/RetroArcade.jsx', 'src/components/Screensaver.jsx',
  'src/components/Visualizer.jsx', 'src/components/BSOD.jsx', 'src/components/Browser.jsx',
];
