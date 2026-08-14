import { readMirror } from '../../theme/applyTheme';
import { DEFAULT_COLORWAY, isKnownColorway } from '../../theme/registry';
import { DEFAULT_ICON_THEME, isKnownIconTheme } from '../../theme/icons';
import { randomAppearance } from '../../theme/randomize';

// Seed the theme fields SYNCHRONOUSLY from the localStorage mirror. Persistence is IndexedDB, which
// is async, so React's first render would otherwise disagree with the DOM the pre-paint script has
// already stamped — visible on anything that branches on the colorway id in JS (the Settings
// checkmark, chart palettes). A hydration gate would fix it too, but a blank frame is worse.
const seed = readMirror() || {};

export const createSystemSlice = (set, get) => ({
  /** The SDL colorway id. This is the single source of truth for theming — mode, tempo, radius and
   *  title face are all DERIVED from it (law 7: temperature decides mode), never stored. */
  colorway: isKnownColorway(seed.cw) ? seed.cw : DEFAULT_COLORWAY,
  density: seed.den === 'compact' ? 'compact' : 'comfortable',
  reducedMotion: 'system', // 'system' | 'on' | 'off'
  iconTheme: DEFAULT_ICON_THEME, // see src/theme/icons.js

  /** Retained ONLY as a migration input for pre-SDL users; nothing reads it for rendering. */
  activeAccent: 'purple',
  wallpaper: 'linux-default',
  transparencyEffects: true,
  brightness: 100,
  accentIntensity: 80,
  // Both of these had setters but no declared default, so they started as `undefined` and were
  // absent from `partialize` — soundEnabled made muting impossible (useSoundEffects.js read it with
  // a `?? true` fallback that always won), and lowPerformance reset on every reload.
  soundEnabled: true,
  lowPerformance: false,
  isDragging: false,
  isBSOD: false,
  achievements: [],
  achievementQueue: [],
  terminalTheme: 'default',
  terminalHistory: [
    { type: 'input', text: 'neofetch' },
    { type: 'output', text: 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB' }
  ],
  terminalCommandCount: 0,

  // Desktop Icons
  iconPositions: {},
  setIconPosition: (id, pos) => set((state) => ({
    iconPositions: { ...state.iconPositions, [id]: pos }
  })),
  resetIconPositions: () => set({ iconPositions: {} }),

  // Desktop Widgets
  widgets: {
    weather: true,
    system: true,
    notes: true
  },
  toggleWidget: (name) => set((state) => ({
    widgets: { ...state.widgets, [name]: !state.widgets[name] }
  })),

  // System Metrics
  systemMetrics: {
    cpu: 12,
    ram: 4.2,
    temp: 42,
    power: 15,
    isOverridden: false
  },
  updateMetrics: (newMetrics) => set((state) => ({
    systemMetrics: { ...state.systemMetrics, ...newMetrics }
  })),

  // Sticky Notes
  notes: 'Welcome to Lumina OS!\n- Explore the apps\n- Check the terminal\n- Have fun!',
  setNotes: (content) => set({ notes: content }),

  setActiveAccent: (accent) => {
    set({ activeAccent: accent });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  setWallpaper: (wp) => {
    set({ wallpaper: wp });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  setTransparencyEffects: (enabled) => {
    set({ transparencyEffects: enabled });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  setBrightness: (value) => {
    set({ brightness: value });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  setAccentIntensity: (value) => {
    set({ accentIntensity: value });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  setLowPerformance: (enabled) => set({ lowPerformance: enabled }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  setColorway: (id) => {
    set({ colorway: isKnownColorway(id) ? id : DEFAULT_COLORWAY });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  setDensity: (d) => set({ density: d === 'compact' ? 'compact' : 'comfortable' }),
  setReducedMotion: (m) => set({ reducedMotion: ['system', 'on', 'off'].includes(m) ? m : 'system' }),
  setIconTheme: (t) => {
    set({ iconTheme: isKnownIconTheme(t) ? t : DEFAULT_ICON_THEME });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },

  resetSettingsToDefault: () => {
    set({
      wallpaper: 'linux-default',
      activeAccent: 'purple',
      colorway: DEFAULT_COLORWAY,
      density: 'comfortable',
      reducedMotion: 'system',
      iconTheme: DEFAULT_ICON_THEME,
      transparencyEffects: true,
      brightness: 100,
      accentIntensity: 80,
      // terminalTheme is a personalization field that syncs to Puter but was previously left out
      // of the reset, so "Reset Personalization" silently spared it.
      terminalTheme: 'default',
      soundEnabled: true,
      lowPerformance: false,
    });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },

  triggerBSOD: () => set({ isBSOD: true }),

  addTerminalEntry: (entry) =>
    set((state) => {
      const newHistory = [...state.terminalHistory, entry];
      // Cap terminal history at 500 entries to prevent localStorage bloat
      return {
        terminalHistory: newHistory.slice(-500),
      };
    }),

  setTerminalTheme: (theme) => {
    set({ terminalTheme: theme });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  incrementCommandCount: () => set((state) => ({ terminalCommandCount: state.terminalCommandCount + 1 })),
  clearTerminalHistory: () => set({ terminalHistory: [] }),

  unlockAchievement: (achievementId) =>
    set((state) => {
      if (state.achievements.includes(achievementId)) return state;
      
      const newAchievements = [...state.achievements, achievementId];
      // Sync in background after setting state
      setTimeout(() => {
        if (get().isPuterSignedIn) get().syncPrefsToPuter();
      }, 0);

      return { 
        achievements: newAchievements,
        achievementQueue: [...state.achievementQueue, achievementId]
      };
    }),

  removeAchievementToast: (achievementId) =>
    set((state) => ({
      achievementQueue: state.achievementQueue.filter((entry) => (entry?.id ?? entry) !== achievementId),
    })),

  /**
   * Queue a one-off toast that is not an achievement.
   *
   * The queue used to hold bare achievement ids, which the toast looked up in a fixed table — so
   * anything without an entry in that table rendered nothing. It now also accepts a
   * `{ id, title, desc }` object, which is what lets the randomizer say WHICH look it rolled.
   * Without that the button is a mystery box: the colorway visibly changes, but you would have to
   * open Settings to find out what you landed on or how to keep it.
   */
  pushToast: ({ title, desc, kicker }) =>
    set((state) => ({
      achievementQueue: [
        ...state.achievementQueue,
        { id: `toast-${state.achievementQueue.length}-${title}`, title, desc, kicker },
      ],
    })),

  /**
   * Roll a new look. See src/theme/randomize.js for what is and is not eligible — notably
   * `reducedMotion` and `brightness` are never touched.
   */
  randomizeAppearance: () => {
    const { colorway, wallpaper } = get();
    const { label, ...patch } = randomAppearance({ colorway, wallpaper });
    set(patch);
    get().pushToast({ kicker: 'New Look', title: 'Surprise Me', desc: label });
    get().unlockAchievement('decorator');
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },

  setIsDragging: (isDragging) => set({ isDragging }),
});
