import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import storage from './persistStorage';
import { createAuthSlice } from './slices/authSlice';
import { createFileSystemSlice } from './slices/fileSystemSlice';
import { createMusicSlice, sanitizePersistedMusic } from './slices/musicSlice';
import { createSystemSlice, TERMINAL_SEED } from './slices/systemSlice';
import { createWindowSlice } from './slices/windowSlice';
import { createContainerSlice } from './slices/containerSlice';
import { createAiSlice } from './slices/aiSlice';
import { createPuterSlice } from './slices/puterSlice';
import { createGamesSlice } from './slices/gamesSlice';
import { createDialogSlice } from './slices/dialogSlice';

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
      // `dialogs` is deliberately absent from `partialize` below: a modal that survives a reload is
      // a question nobody asked, and its promise resolver died with the previous session anyway.
      ...createDialogSlice(set, get),
    }),
    {
      name: 'os-settings',
      // Stamp a version NOW, before any shape change needs one. Without it, zustand treats an
      // existing payload as version 0 and there is no hook to migrate it — so the first time the
      // theme fields change shape (P2), every existing user silently lands on defaults.
      // NOTE: this store uses a custom async `storage` object rather than createJSONStorage; verify
      // against a real IndexedDB payload that `migrate` fires before relying on it in P2.
      version: 5,
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

        // v3 → v4: the DOOM emulator is disabled (see src/config/games.js), so `retroarcade` is no
        // longer a registered id. `openWindows` is persisted, so anyone who left it open would
        // rehydrate into WindowContentRenderer's final default arm and read "Nothing is registered
        // for 'retroarcade'" — a message written for whoever forgot a registry entry, not for a
        // visitor. Dropping it here rather than in `merge` because it is a one-time consequence of
        // this change, not a standing invariant; and because `migrate` runs FIRST, the satellite
        // repair in `merge` then clears the matching maximized/minimized/snapped/active entries
        // without needing to know about this id at all.
        if (fromVersion < 4 && Array.isArray(next.openWindows)) {
          next.openWindows = next.openWindows.filter((id) => id !== 'retroarcade');
        }

        // v4 → v5: the terminal seed shipped a neofetch with invented hardware ("M3 Max", "64GB"),
        // and `terminalHistory` is persisted, so every returning visitor still carries it. Device
        // facts are now read live; the seed is a banner (TERMINAL_SEED). Replace the untouched seed
        // outright, and swap any later copy of that output for a note rather than silently deleting
        // a line the visitor scrolled past.
        if (fromVersion < 5 && Array.isArray(next.terminalHistory)) {
          const OLD_NEOFETCH = 'OS: Lumina Desktop v1.0.0';
          const isOld = (e) => typeof e?.text === 'string' && e.text.startsWith(OLD_NEOFETCH);
          let history = next.terminalHistory;
          if (history[0]?.type === 'input' && history[0]?.text === 'neofetch' && isOld(history[1])) {
            history = [...TERMINAL_SEED, ...history.slice(2)];
          }
          next.terminalHistory = history.map((e) => (isOld(e)
            ? { type: 'output', text: '(neofetch output from an older Lumina was removed: it showed invented hardware)' }
            : e));
        }

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
        // New keys added to the prefs later still get their defaults on an older payload. The first
        // release's four-corner shape (`layout`, `dock: 'shown'`) keeps only its personal choices.
        const savedWp = merged.wallpaperPrefs || {};
        if (savedWp.layout) {
          const { place, zones, hour, unit, style, bright } = savedWp;
          merged.wallpaperPrefs = { ...currentState.wallpaperPrefs, place, zones, hour, unit, style, bright };
        } else {
          merged.wallpaperPrefs = { ...currentState.wallpaperPrefs, ...savedWp };
        }
        return merged;
      },
      // idb-keyval behind a write throttle. persist writes the WHOLE partialized payload on every
      // `set()` with no diffing; see persistStorage.js for the measurement and the flush rules.
      storage,
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
        // validated (and volume migrated) in merge() via sanitizePersistedMusic. `lastFmData` is
        // a remote cache refreshed by a 30 s poll — it has no business surviving a reload, and
        // sanitizePersistedMusic re-seeds it. Playback position is `musicCurrentTime`, top-level
        // and deliberately absent here.
        music: { ...state.music, lastFmData: undefined },
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
        lastSyncTime: state.lastSyncTime,
        syncError: state.syncError,
        puterUser: state.puterUser,
        isPuterSignedIn: state.isPuterSignedIn,
        snappedWindows: state.snappedWindows,
        // Local only: not in the Puter prefs sync (the idle-detection permission is per browser).
        idleDetection: state.idleDetection,
        // Local only, like idleDetection: it describes this Mac's screen and Dock, not the visitor.
        wallpaperPrefs: state.wallpaperPrefs,
        achievementQueue: [] // Don't persist queue
      }),
    }
  )
);

export default useOSStore;
