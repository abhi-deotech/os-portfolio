import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { createAuthSlice } from './slices/authSlice';
import { createFileSystemSlice } from './slices/fileSystemSlice';
import { createMusicSlice, sanitizePersistedMusic } from './slices/musicSlice';
import { createSystemSlice } from './slices/systemSlice';
import { createWindowSlice } from './slices/windowSlice';
import { createContainerSlice } from './slices/containerSlice';
import { createAiSlice } from './slices/aiSlice';
import { createPuterSlice } from './slices/puterSlice';
import { createGamesSlice } from './slices/gamesSlice';

/**
 * Zustand store for Lumina OS state management.
 * Provides centralized state for windows, file system, preferences, and more.
 * Uses modular slices to keep the codebase maintainable.
 */
const useOSStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createFileSystemSlice(set, get),
      ...createMusicSlice(set, get),
      ...createSystemSlice(set, get),
      ...createWindowSlice(set, get),
      ...createContainerSlice(set, get),
      ...createAiSlice(set, get),
      ...createPuterSlice(set, get),
      ...createGamesSlice(set, get),
    }),
    {
      name: 'os-settings',
      // Stamp a version NOW, before any shape change needs one. Without it, zustand treats an
      // existing payload as version 0 and there is no hook to migrate it — so the first time the
      // theme fields change shape (P2), every existing user silently lands on defaults.
      // NOTE: this store uses a custom async `storage` object rather than createJSONStorage; verify
      // against a real IndexedDB payload that `migrate` fires before relying on it in P2.
      version: 3,
      // Verified in-browser against a real v0 IndexedDB payload: this hook DOES fire despite the
      // custom async `storage` object (zustand's docs assume createJSONStorage).
      migrate: (persistedState, fromVersion) => {
        if (!persistedState) return persistedState;
        const next = { ...persistedState };

        // v1 → v2: adopt SDL colorways.
        //
        // Every pre-SDL user lands on Lumina Neon (Legacy) rather than being mapped hue-by-hue onto
        // the nearest SDL colorway. All four legacy accents ARE the same neon identity, so mapping
        // them individually would silently change returning visitors' look on upgrade — and one of
        // them (green) has no locked SDL counterpart at all. Legacy preserves exactly what they had;
        // SDL is opt-in from the Appearance pane.
        if (fromVersion < 2 && next.colorway === undefined) {
          next.colorway = next.activeAccent ? 'lumina-neon' : 'rose-dusk';
          next.density = 'comfortable';
          next.reducedMotion = 'system';
          next.iconTheme = 'lumina';
        }

        // v2 → v3: move off the fixed neon icon palette.
        //
        // This one DOES change how a returning user's dock looks, which normally we refuse to do.
        // It is justified because the old default is measurably broken rather than merely different:
        // on all ten light colorways every one of the eighteen glyphs falls below 3:1, bottoming out
        // at 1.01:1. Keeping someone on an invisible dock is not respecting their choice.
        //
        // Anyone actually running the legacy colorway is exempt — there the neon set is correct and
        // deliberate — and "Lumina Neon" stays selectable for everyone else.
        if (fromVersion < 3 && (next.iconTheme === 'lumina' || next.iconTheme === undefined)) {
          next.iconTheme = next.colorway === 'lumina-neon' ? 'lumina' : 'harmonized';
        }
        // 'colorway' and 'duotone' were the pre-v3 theme ids and no longer resolve.
        if (next.iconTheme === 'colorway' || next.iconTheme === 'duotone') next.iconTheme = 'harmonized';

        return next;
      },
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...persistedState };

        // Window-state repair. `openWindows` is the source of truth; the three satellite lists are
        // only meaningful for a window that is actually open. `closeWindow` used to leak into
        // `maximizedWindows`, and that list is persisted — so anyone who ever maximized and closed
        // a window carries a phantom id forever, which permanently hid the dock. Fixing the leak
        // stops NEW poisoning; this repairs the payloads already on disk, and it runs every load
        // rather than once at a version bump because it is an invariant, not a migration.
        const open = new Set(merged.openWindows || []);
        merged.maximizedWindows = (merged.maximizedWindows || []).filter((w) => open.has(w));
        merged.minimizedWindows = (merged.minimizedWindows || []).filter((w) => open.has(w));
        merged.snappedWindows = Object.fromEntries(
          Object.entries(merged.snappedWindows || {}).filter(([w]) => open.has(w)),
        );
        if (merged.activeWindow && !open.has(merged.activeWindow)) merged.activeWindow = null;

        if (merged.music) {
          // All music-payload repair lives beside the slice it protects: never rehydrate
          // as "playing", re-resolve currentTrack against the catalog, validate the
          // queue / playContext / playlist trackIds the same way, and migrate the old
          // 0–1 volume scale to the canonical 0–100 (a persisted value ≤ 1 can only be
          // the old scale). Rationale for each rule is on the function itself.
          merged.music = sanitizePersistedMusic(merged.music);
        }
        return merged;
      },
      storage: {
        getItem: async (name) => (await get(name)) || null,
        setItem: async (name, value) => await set(name, value),
        removeItem: async (name) => await del(name),
      },
      partialize: (state) => ({
        activeAccent: state.activeAccent,
        wallpaper: state.wallpaper,
        transparencyEffects: state.transparencyEffects,
        brightness: state.brightness,
        accentIntensity: state.accentIntensity,
        soundEnabled: state.soundEnabled,
        lowPerformance: state.lowPerformance,
        colorway: state.colorway,
        density: state.density,
        reducedMotion: state.reducedMotion,
        iconTheme: state.iconTheme,
        terminalHistory: state.terminalHistory,
        openWindows: state.openWindows,
        minimizedWindows: state.minimizedWindows,
        maximizedWindows: state.maximizedWindows,
        activeWindow: state.activeWindow,
        iconPositions: state.iconPositions,
        fileSystem: state.fileSystem,
        widgets: state.widgets,
        notes: state.notes,
        // `music` carries queue / playlists / playContext / volume with it; each is
        // validated (and volume migrated) in merge() via sanitizePersistedMusic.
        music: state.music,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
        activeNotepadFile: state.activeNotepadFile,
        activeDocFile: state.activeDocFile,
        activeMediaFile: state.activeMediaFile,
        activePhotoFile: state.activePhotoFile,
        activeMusicFile: state.activeMusicFile,
        recentFiles: state.recentFiles,
        terminalTheme: state.terminalTheme,
        installedApps: state.installedApps,
        achievements: state.achievements,
        userGames: state.userGames,
        gameStats: state.gameStats,
        // `systemMetrics` is DELIBERATELY not persisted.
        //
        // SystemMetricsWidget re-rolls it from Math.random() on a 3-second interval, and zustand's
        // persist middleware serialises the whole partialized payload on every `set`. That measured
        // 26,066 bytes written to IndexedDB every 3 seconds — roughly 30 MB an hour — of which the
        // 62 bytes of systemMetrics were the only part that had changed, and they are overwritten
        // by the next tick anyway. The remaining 26 KB is mostly `fileSystem`, so the cost grew
        // with the user's own data.
        //
        // Nothing is lost by dropping it: the slice declares its own defaults and the widget's
        // interval repopulates it within 3 seconds of load.
        lastSyncTime: state.lastSyncTime,
        syncError: state.syncError,
        puterUser: state.puterUser,
        isPuterSignedIn: state.isPuterSignedIn,
        snappedWindows: state.snappedWindows,
        achievementQueue: [] // Don't persist queue
      }),
    }
  )
);

export default useOSStore;
