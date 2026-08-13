import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { createAuthSlice } from './slices/authSlice';
import { createFileSystemSlice } from './slices/fileSystemSlice';
import { createMusicSlice } from './slices/musicSlice';
import { createSystemSlice } from './slices/systemSlice';
import { createWindowSlice } from './slices/windowSlice';
import { createContainerSlice } from './slices/containerSlice';
import { createAiSlice } from './slices/aiSlice';
import { createPuterSlice } from './slices/puterSlice';
import { MUSIC_DATA } from '../data/musicData';

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
    }),
    {
      name: 'os-settings',
      // Stamp a version NOW, before any shape change needs one. Without it, zustand treats an
      // existing payload as version 0 and there is no hook to migrate it — so the first time the
      // theme fields change shape (P2), every existing user silently lands on defaults.
      // NOTE: this store uses a custom async `storage` object rather than createJSONStorage; verify
      // against a real IndexedDB payload that `migrate` fires before relying on it in P2.
      version: 1,
      // Verified in-browser against a real v0 IndexedDB payload: this hook DOES fire despite the
      // custom async `storage` object (zustand's docs assume createJSONStorage). P2's colorway
      // migration depends on that, so it was worth proving rather than assuming.
      migrate: (persistedState, fromVersion) => {
        // v0 → v1 is intentionally an identity migration. P2 maps `activeAccent` onto an SDL
        // colorway here; keeping the hook in place from the start is the point.
        if (fromVersion >= 1) return persistedState;
        return persistedState;
      },
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...persistedState };
        if (merged.music) {
          // Never rehydrate as "playing" — no audio engine is running yet.
          // Re-resolve the persisted track against the current catalog so
          // removed/renamed local files can't leave a dead currentTrack.
          const found = MUSIC_DATA.find((t) => t.id === merged.music.currentTrack?.id);
          merged.music = {
            ...merged.music,
            currentTrack: found || MUSIC_DATA[0],
            isPlaying: false,
            currentTime: 0,
          };
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
        terminalHistory: state.terminalHistory,
        openWindows: state.openWindows,
        minimizedWindows: state.minimizedWindows,
        maximizedWindows: state.maximizedWindows,
        activeWindow: state.activeWindow,
        iconPositions: state.iconPositions,
        fileSystem: state.fileSystem,
        widgets: state.widgets,
        notes: state.notes,
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
        systemMetrics: state.systemMetrics,
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
