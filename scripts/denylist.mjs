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
  // Achievements.jsx was exempted here for "30 from-X/to-Y badge gradient pairs". Those are gone:
  // each badge now declares an OKLCH hue and iconStyle() renders it at the active colorway's own
  // chroma, so the file is fully tokenized and the exemption would only hide future drift.
  'src/components/games/AddGameDialog.jsx': 'one hex inside the example game SOURCE shown to the user — a sideloaded game is a separate document with an opaque origin, so it cannot reach the token layer and must use a literal',
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
  'src/components/Screensaver.jsx',
  'src/components/Visualizer.jsx', 'src/components/BSOD.jsx', 'src/components/Browser.jsx',
];
// RetroArcade.jsx was on this list on the strength of the letterbox rationale above, and used it
// to carry 51 white/black literals plus 5 raw hexes — the third-worst debt in the repo. It renders
// an iframe, not a video: nothing in it is mode-invariant. It is fully tokenized now and its
// allowance is 0, so the exemption is gone with the debt.

/**
 * Strip comments before counting.
 *
 * Without this the scanners flag PROSE: the header in src/index.css that explains why the token
 * layer was dead cites `#cc97ff` by name, and src/theme/icons.js documents the exact neon hexes it
 * exists to replace. A ratchet that fires on a comment teaches people to explain themselves less,
 * which is the opposite of what it is for.
 *
 * The `//` rule requires the slashes not be preceded by `:` so that `https://…` in a URL survives.
 */
export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
