import { readMirror } from '../../theme/applyTheme';
import { DEFAULT_COLORWAY, isKnownColorway } from '../../theme/registry';
import { DEFAULT_ICON_THEME, isKnownIconTheme } from '../../theme/icons';
import { randomAppearance } from '../../theme/randomize';
import { isKnownAchievement } from '../../config/achievements';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { CUSTOM_WALLPAPER, CUSTOM_WALLPAPER_KEY, DEFAULT_WALLPAPER, isLegacyDataUrlWallpaper } from '../../theme/wallpapers';

// Toasts (achievements + one-off "Surprise Me" style messages) share one queue with no manual
// dismiss until now — capping it stops rapid-fire triggers (e.g. mashing "Surprise Me") from
// piling up a wall of cards that all have to individually time out.
export const MAX_TOASTS = 3;

// Monotonic, because the queue length is NOT a unique id.
//
// `pushToast` keyed its entries `toast-${queue.length}-${title}`, and the queue is capped at
// MAX_TOASTS by `.slice(-MAX_TOASTS)`. Once it is full the length stays pinned at 3, so every
// subsequent push produced the same key — mashing "Surprise Me" logged
// `Encountered two children with the same key, toast-3-Surprise Me` and React was free to drop or
// duplicate the cards. A counter cannot collide regardless of what the queue does.
let toastSeq = 0;

// Seed the theme fields SYNCHRONOUSLY from the localStorage mirror. Persistence is IndexedDB, which
// is async, so React's first render would otherwise disagree with the DOM the pre-paint script has
// already stamped — visible on anything that branches on the colorway id in JS (the Settings
// checkmark, chart palettes). A hydration gate would fix it too, but a blank frame is worse.
const seed = readMirror() || {};

/**
 * The terminal's first screen. Only a banner: history is persisted locally, so anything device-specific
 * written here would be baked into storage and replayed on another visit. `neofetch` reads the facts
 * live instead (src/system/facts.js). osStore's v5 migration replaces the old invented-hardware seed.
 */
export const TERMINAL_SEED = Object.freeze([
  Object.freeze({ type: 'output', text: 'Lumina Desktop 1.0.0 · type `neofetch` to see what this browser reports about your device, or `help`.' }),
]);

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
  /** Object URL for the uploaded wallpaper blob. Session-only — never persisted, rebuilt by
   *  `loadCustomWallpaper` on boot. See CUSTOM_WALLPAPER in theme/wallpapers.js. */
  customWallpaperUrl: null,
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
  terminalHistory: [...TERMINAL_SEED],
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

  // Focus (Control Center). Session-only — deliberately absent from `partialize`. While on, the toast
  // rail in App.jsx mounts only `urgent` entries; the rest wait in the queue (unmounted, so their
  // timers never start) and appear when Focus turns off.
  focusMode: false,
  setFocusMode: (on) => set({ focusMode: !!on }),

  // Screensaver: also start on the SYSTEM idle state (Idle Detection API). 'off' | 'on'. Persisted
  // locally (osStore partialize) but deliberately not synced through Puter, because the permission
  // behind it belongs to one browser; and not part of resetSettingsToDefault, which covers appearance.
  idleDetection: 'off',
  setIdleDetection: (value) => set({ idleDetection: value === 'on' ? 'on' : 'off' }),

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
  /** Upload path: the file goes to its own idb key, the store gets the sentinel + an object URL. */
  setCustomWallpaper: async (file) => {
    await idbSet(CUSTOM_WALLPAPER_KEY, file);
    const prev = get().customWallpaperUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ wallpaper: CUSTOM_WALLPAPER, customWallpaperUrl: URL.createObjectURL(file) });
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },
  /**
   * Resolve the sentinel to a displayable URL. Called by the wallpaper layer when it finds the
   * sentinel with no URL (a fresh boot). Also the one-time migration for payloads that still hold
   * the old base64 data URL: decode it to a Blob, park it under the idb key, and replace the
   * string in the store — after which every persist write is ~2.7 MB lighter.
   */
  loadCustomWallpaper: async () => {
    const { wallpaper, customWallpaperUrl } = get();
    if (customWallpaperUrl) return;
    let blob = null;
    if (isLegacyDataUrlWallpaper(wallpaper)) {
      try {
        blob = await (await fetch(wallpaper)).blob();
        await idbSet(CUSTOM_WALLPAPER_KEY, blob);
      } catch { blob = null; }
      if (!blob) { set({ wallpaper: DEFAULT_WALLPAPER }); return; }
      set({ wallpaper: CUSTOM_WALLPAPER, customWallpaperUrl: URL.createObjectURL(blob) });
      return;
    }
    blob = await idbGet(CUSTOM_WALLPAPER_KEY).catch(() => null);
    // The sentinel can arrive from Puter prefs on a device that never uploaded anything.
    if (blob) set({ customWallpaperUrl: URL.createObjectURL(blob) });
    else set({ wallpaper: DEFAULT_WALLPAPER });
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

      // Five ids (2048_master, snake_pro, sudoku_pro, memory_master, trivia_expert) were fired
      // from the games for months while existing in no registry: they inflated the "unlocked N
      // of 16" counter past the number of visible cards and rendered no toast. Nothing failed
      // loudly, so nothing got fixed. This makes the next orphan fail loudly, in dev only.
      if (import.meta.env.DEV && !isKnownAchievement(achievementId)) {
        console.warn(
          `[achievements] "${achievementId}" is not in src/config/achievements.js — it will ` +
          `count toward the unlocked total but render no card and no toast. Add it there.`
        );
      }


      const newAchievements = [...state.achievements, achievementId];
      // Sync in background after setting state
      setTimeout(() => {
        if (get().isPuterSignedIn) get().syncPrefsToPuter();
      }, 0);

      return {
        achievements: newAchievements,
        achievementQueue: [...state.achievementQueue, achievementId].slice(-MAX_TOASTS)
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
  pushToast: ({ title, desc, kicker, urgent = false }) => {
    // The id is taken BEFORE `set`: a counter bump inside the updater runs twice under StrictMode.
    const id = `toast-${(toastSeq += 1)}-${title}`;
    set((state) => ({
      achievementQueue: [
        ...state.achievementQueue,
        // `urgent` toasts show through Focus (see focusMode above).
        { id, title, desc, kicker, urgent: !!urgent },
      ].slice(-MAX_TOASTS),
    }));
  },

  /**
   * Roll a new look. See src/theme/randomize.js for what is and is not eligible — notably
   * `reducedMotion` and `brightness` are never touched.
   */
  randomizeAppearance: () => {
    const { colorway, wallpaper } = get();
    // `label` and `title` are toast copy, not state. They MUST be stripped before `set` — anything
    // left in the patch becomes a store field, and `title` in particular would collide with nothing
    // today and something confusing later.
    const { label, title, ...patch } = randomAppearance({ colorway, wallpaper });
    set(patch);
    // A curated look has a name of its own ("Midnight Arcade"); a generated one does not, and
    // falls back to the button's name with the ingredients underneath.
    get().pushToast({ kicker: 'New Look', title: title || 'Surprise Me', desc: label });
    get().unlockAchievement('decorator');
    if (get().isPuterSignedIn) get().syncPrefsToPuter();
  },

  setIsDragging: (isDragging) => set({ isDragging }),
});
