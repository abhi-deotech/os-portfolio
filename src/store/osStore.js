import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FILE_SYSTEM } from '../data/fileSystem';

const useOSStore = create(
  persist(
    /**
     * Zustand store for Lumina OS state management.
     * Provides centralized state for windows, file system, preferences, and more.
     * Uses persist middleware to save state to localStorage.
     *
     * State Categories:
     * - Window Management: openWindows, activeWindow, control/app launcher states
     * - User Preferences: accent color, wallpaper, transparency, brightness
     * - File System: Virtual file tree with CRUD operations
     * - Desktop: Icon positions, drag state
     * - Music Player: Playback state, current track, volume
     * - Terminal: Command history, theme, installed packages
     * - Achievements: Unlocked badges, notification queue
     * - System: Metrics override, widgets visibility
     *
     * @param {Function} set - Zustand set function for updating state
     * @param {Function} get - Zustand get function for reading state
     * @returns {Object} Store state and action methods
     */
    (set, get) => ({
      openWindows: [],
      activeWindow: null,
      isControlCenterOpen: false,
      isAppLauncherOpen: false,
      activeAccent: 'purple',
      wallpaper: 'sunset-glow',
      transparencyEffects: true,
      brightness: 100,
      accentIntensity: 80,
      isDragging: false,
      isAuthenticated: false,
      userRole: 'admin', // 'admin' | 'guest'
      isSpotlightOpen: false,
      isBSOD: false,
      achievements: [],
      achievementQueue: [],
      terminalTheme: 'default',
      installedApps: [],
      recentFiles: [],
      activeNotepadFile: null,
      activeDocFile: null,
      activeMediaFile: null,
      activePhotoFile: null,
      activeMusicFile: null,
      activeRetroGame: null,
      setRetroGame: (game) => set({ activeRetroGame: game }),
      terminalHistory: [
        { type: 'input', text: 'neofetch' },
        { type: 'output', text: 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB' }
      ],

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

      // Music Player State
      music: {
        isPlaying: false,
        currentTrack: {
          id: 'metro-niagara',
          youtubeId: 'v9l4yv3w-0w',
          title: 'Niagara Falls (Foot or 2)',
          artist: 'Metro Boomin, Travis Scott, 21 Savage',
          album: 'HEROES & VILLAINS',
          cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/v9l4yv3w-0w/hqdefault.jpg',
          duration: 207
        },
        volume: 0.7,
        currentTime: 0,
        likedSongs: [], // Track IDs of liked songs
        activeView: 'Home' // Current UI view (Home, Library, etc)
      },
      setMusicIsPlaying: (isPlaying) => set((state) => ({
        music: { ...state.music, isPlaying }
      })),
      setMusicTrack: (track) => set((state) => ({
        music: { ...state.music, currentTrack: track, currentTime: 0, isPlaying: true }
      })),
      syncMusicTrack: (track) => set((state) => ({
        music: { ...state.music, currentTrack: { ...state.music.currentTrack, ...track } }
      })),
      setMusicCurrentTime: (currentTime) => set((state) => ({
        music: { ...state.music, currentTime }
      })),
      toggleLikeSong: (trackId) => set((state) => {
        const likedSongs = state.music.likedSongs || [];
        const isLiked = likedSongs.includes(trackId);
        const newLikedSongs = isLiked 
          ? likedSongs.filter(id => id !== trackId)
          : [...likedSongs, trackId];
        return {
          music: { ...state.music, likedSongs: newLikedSongs }
        };
      }),
      setMusicView: (view) => set((state) => ({
        music: { ...state.music, activeView: view }
      })),

      // Sticky Notes
      notes: 'Welcome to Lumina OS!\n- Explore the apps\n- Check the terminal\n- Have fun!',
      setNotes: (content) => set({ notes: content }),

      // Icon positions: { [iconId]: { x, y } }
      iconPositions: {},
      setIconPosition: (id, position) =>
        set((state) => ({
          iconPositions: { ...state.iconPositions, [id]: position },
        })),
      resetIconPositions: () => set({ iconPositions: {} }),

      // Virtual file system
      fileSystem: DEFAULT_FILE_SYSTEM,
      setFileSystem: (tree) => set({ fileSystem: tree }),
      createFolder: (name, parentId = null) =>
        set((state) => {
          const newFolder = { id: `folder-${Date.now()}`, name, children: [] };
          if (!parentId) return { fileSystem: [...state.fileSystem, newFolder] };
          
          const addToParent = (nodes) =>
            nodes.map((n) => {
              if (n.id === parentId) return { ...n, children: [...(n.children || []), newFolder] };
              if (n.children) return { ...n, children: addToParent(n.children) };
              return n;
            });
          return { fileSystem: addToParent(state.fileSystem) };
        }),

      createFile: (name, content = '', parentId = null) =>
        set((state) => {
          const newFile = { id: `file-${Date.now()}`, name, content };
          if (!parentId) return { fileSystem: [...state.fileSystem, newFile] };
          
          const addToParent = (nodes) =>
            nodes.map((n) => {
              if (n.id === parentId) return { ...n, children: [...(n.children || []), newFile] };
              if (n.children) return { ...n, children: addToParent(n.children) };
              return n;
            });
          return { fileSystem: addToParent(state.fileSystem) };
        }),

      moveNode: (id, parentId, index = 0) =>
        set((state) => {
          let movedNode = null;
          
          // 1. Remove node from its current position
          const removeFromTree = (nodes) => {
            const filtered = [];
            for (const node of nodes) {
              if (node.id === id) {
                movedNode = node;
                continue;
              }
              if (node.children) {
                filtered.push({ ...node, children: removeFromTree(node.children) });
              } else {
                filtered.push(node);
              }
            }
            return filtered;
          };

          const treeWithoutNode = removeFromTree(state.fileSystem);
          if (!movedNode) return state;

          // 2. Add node to its new position
          const addToTree = (nodes) => {
            // Adding to root
            if (!parentId) {
              const newRoot = [...nodes];
              newRoot.splice(index, 0, movedNode);
              return newRoot;
            }

            return nodes.map((node) => {
              if (node.id === parentId) {
                const newChildren = [...(node.children || [])];
                newChildren.splice(index, 0, movedNode);
                return { ...node, children: newChildren };
              }
              if (node.children) {
                return { ...node, children: addToTree(node.children) };
              }
              return node;
            });
          };

          return { fileSystem: addToTree(treeWithoutNode) };
        }),
      deleteNode: (id) =>
        set((state) => {
          const removeNode = (nodes) =>
            nodes
              .filter((n) => n.id !== id)
              .map((n) => ({
                ...n,
                children: n.children ? removeNode(n.children) : undefined,
              }));
          return { fileSystem: removeNode(state.fileSystem) };
        }),
      renameNode: (id, newName) =>
        set((state) => {
          const renameInTree = (nodes) =>
            nodes.map((n) => {
              if (n.id === id) return { ...n, name: newName };
              if (n.children) return { ...n, children: renameInTree(n.children) };
              return n;
            });
          return { fileSystem: renameInTree(state.fileSystem) };
        }),

      updateFileContent: (fileId, content) =>
        set((state) => {
          const updateInTree = (nodes) =>
            nodes.map((n) => {
              if (n.id === fileId) return { ...n, content };
              if (n.children) return { ...n, children: updateInTree(n.children) };
              return n;
            });
          return { fileSystem: updateInTree(state.fileSystem) };
        }),

      openNotepad: (fileId) =>
        set((state) => {
          const windows = state.openWindows.includes('notepad')
            ? state.openWindows
            : [...state.openWindows, 'notepad'];
          return {
            openWindows: windows,
            activeWindow: 'notepad',
            activeNotepadFile: fileId,
            isAppLauncherOpen: false,
            isControlCenterOpen: false,
          };
        }),

      toggleSpotlight: (isOpen) =>
        set((state) => ({
          isSpotlightOpen: isOpen !== undefined ? isOpen : !state.isSpotlightOpen,
        })),

      triggerBSOD: () => set({ isBSOD: true }),

      openWindow: (id, fileId = null) =>
        set((state) => {
          const windows = state.openWindows.includes(id)
            ? state.openWindows
            : [...state.openWindows, id];
          
          const newState = {
            openWindows: windows,
            activeWindow: id,
            isControlCenterOpen: false,
            isAppLauncherOpen: false,
          };

          // If a fileId is provided, track it for the specific app
          if (fileId) {
            if (id === 'notepad') newState.activeNotepadFile = fileId;
            if (id === 'documentation') newState.activeDocFile = fileId;
            if (id === 'media') newState.activeMediaFile = fileId;
            if (id === 'photos') newState.activePhotoFile = fileId;
            if (id === 'mail') newState.activeMailId = fileId;
            if (id === 'music') {
              // Opening music might need more logic but let's just track the ID for now
              newState.activeMusicFile = fileId;
            }
            // Track in recent files
            state.trackRecentFile(fileId);
          }

          return newState;
        }),

      trackRecentFile: (fileId) => 
        set((state) => {
          const filtered = (state.recentFiles || []).filter(id => id !== fileId);
          return { recentFiles: [fileId, ...filtered].slice(0, 10) };
        }),

      closeWindow: (id) =>
        set((state) => ({
          openWindows: state.openWindows.filter((w) => w !== id),
          activeWindow: state.activeWindow === id ? null : state.activeWindow,
        })),

      focusWindow: (id) =>
        set({ activeWindow: id, isControlCenterOpen: false, isAppLauncherOpen: false }),

      toggleControlCenter: () =>
        set((state) => ({
          isControlCenterOpen: !state.isControlCenterOpen,
          isAppLauncherOpen: false,
        })),

      toggleAppLauncher: () =>
        set((state) => ({
          isAppLauncherOpen: !state.isAppLauncherOpen,
          isControlCenterOpen: false,
        })),

      setActiveAccent: (accent) => set({ activeAccent: accent }),
      setWallpaper: (wp) => set({ wallpaper: wp }),
      setTransparencyEffects: (enabled) => set({ transparencyEffects: enabled }),
      setBrightness: (value) => set({ brightness: value }),
      setMusicVolume: (value) => set((state) => ({
        music: { ...state.music, volume: value }
      })),
      setAccentIntensity: (value) => set({ accentIntensity: value }),

      resetSettingsToDefault: () => set({
        wallpaper: 'sunset-glow',
        activeAccent: 'purple',
        transparencyEffects: true,
        brightness: 100,
        accentIntensity: 80,
      }),

      resetFileSystem: () => set({ fileSystem: DEFAULT_FILE_SYSTEM }),

      // Documentation sync state
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
      setSyncError: (syncError) => set({ syncError }),

      syncDocumentation: (files) =>
        set((state) => {
          const updateFileContent = (nodes) =>
            nodes.map((n) => {
              if (n.children) {
                return { ...n, children: updateFileContent(n.children) };
              }
              // Check if this file should be updated
              const fileToUpdate = files.find(f => f.id === n.id);
              if (fileToUpdate) {
                return { ...n, content: fileToUpdate.content };
              }
              return n;
            });

          return {
            fileSystem: updateFileContent(state.fileSystem),
            lastSyncTime: Date.now(),
            syncError: null
          };
        }),

      addTerminalEntry: (entry) =>
        set((state) => {
          const newHistory = [...state.terminalHistory, entry];
          // Cap history at 500 entries to prevent localStorage bloat
          return {
            terminalHistory: newHistory.slice(-500),
          };
        }),

      setTerminalTheme: (theme) => set({ terminalTheme: theme }),

      terminalCommandCount: 0,
      incrementCommandCount: () => set((state) => ({ terminalCommandCount: state.terminalCommandCount + 1 })),

      installApp: (appId) =>
        set((state) => ({
          installedApps: [...state.installedApps, appId],
        })),

      clearTerminalHistory: () => set({ terminalHistory: [] }),

      unlockAchievement: (achievementId) =>
        set((state) => {
          if (state.achievements.includes(achievementId)) return state;
          return { 
            achievements: [...state.achievements, achievementId],
            achievementQueue: [...state.achievementQueue, achievementId]
          };
        }),

      removeAchievementToast: (achievementId) =>
        set((state) => ({
          achievementQueue: state.achievementQueue.filter(id => id !== achievementId)
        })),

      setIsDragging: (isDragging) => set({ isDragging }),

      login: (role = 'admin') => set({ isAuthenticated: true, userRole: role }),
      logout: () => set({ 
        isAuthenticated: false, 
        openWindows: [], 
        activeWindow: null, 
        isControlCenterOpen: false, 
        isAppLauncherOpen: false, 
        isSpotlightOpen: false, 
        isDragging: false,
        achievementQueue: [],
        userRole: 'admin' 
      }),

      // Filtered filesystem for UI
      getFilteredFileSystem: () => {
        const state = get();
        if (state.userRole === 'admin') return state.fileSystem;
        // Guest mode: Hide sensitive folders or files if needed
        return state.fileSystem.map(node => {
          if (node.name === 'Documents') {
            return { ...node, children: node.children.filter(c => !c.name.includes('Resume')) };
          }
          return node;
        });
      },

      // Helper to find a node by ID recursively
      findNodeById: (id, nodes = null) => {
        const state = get();
        const tree = nodes || state.fileSystem;
        for (const node of tree) {
          if (node.id === id) return node;
          if (node.children) {
            const found = state.findNodeById(id, node.children);
            if (found) return found;
          }
        }
        return null;
      },

      // Helper to get the full path to a node
      getPathFromId: (id) => {
        const state = get();
        const findPath = (targetId, nodes, path = []) => {
          for (const node of nodes) {
            const currentPath = [...path, node.name];
            if (node.id === targetId) return currentPath;
            if (node.children) {
              const subPath = findPath(targetId, node.children, currentPath);
              if (subPath) return subPath;
            }
          }
          return null;
        };
        return findPath(id, state.fileSystem);
      },

      // Global search for files
      searchFiles: (query) => {
        if (!query || query.length < 2) return [];
        const state = get();
        const results = [];
        const search = (nodes, path = []) => {
          nodes.forEach(node => {
            const currentPath = [...path, node.name];
            if (node.name.toLowerCase().includes(query.toLowerCase())) {
              results.push({ ...node, path: currentPath });
            }
            if (node.children) search(node.children, currentPath);
          });
        };
        search(state.fileSystem);
        return results;
      }
    }),
    {
      name: 'os-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAccent: state.activeAccent,
        wallpaper: state.wallpaper,
        transparencyEffects: state.transparencyEffects,
        brightness: state.brightness,
        accentIntensity: state.accentIntensity,
        terminalHistory: state.terminalHistory,
        openWindows: state.openWindows,
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
        achievementQueue: [] // Don't persist queue
      }),
    }
  )
);

export default useOSStore;
