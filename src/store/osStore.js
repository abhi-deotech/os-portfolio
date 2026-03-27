import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_FILE_SYSTEM = [
  {
    id: 'root-projects',
    name: 'Projects',
    children: [
      { id: 'file-os-info', name: 'System.md', type: 'text', content: '# Lumina OS\nVersion 1.0.0\n\nWelcome to my interactive portfolio OS. Built with React, Tailwind, and Framer Motion.' },
      { id: 'file-mern', name: 'MERN-Dashboard.md', type: 'text', content: '# MERN Dashboard\nA full-stack administrative dashboard for managing enterprise resources.' },
      { id: 'file-iot', name: 'IoT-Controller.md', type: 'text', content: '# IoT Controller\nReal-time monitoring and control system for embedded devices using MQTT.' },
      { id: 'file-benchmark', name: 'Benchmark.exe', type: 'text', content: 'Lumina Benchmark Utility\nReady for stress test.' },
    ]
  },
  {
    id: 'root-docs',
    name: 'Documents',
    children: [
      { id: 'file-resume', name: 'Resume.pdf', type: 'pdf', url: '/Abhimanyu.pdf' },
      { id: 'file-cover', name: 'CoverLetter.docx', type: 'text', content: 'Dear Hiring Manager,\n\nI am writing to express my interest...' },
    ]
  },
  {
    id: 'root-media',
    name: 'Media',
    children: [
      { id: 'media-video-1', name: 'Portfolio_Demo.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
      { id: 'media-img-1', name: 'Hero_Shot.jpg', type: 'image', url: '/src/assets/hero.png' },
      { id: 'media-audio-1', name: 'Ambient_Vibe.mp3', type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    ]
  },
  {
    id: 'root-sys',
    name: 'sys',
    children: [
      { id: 'sys-kernel', name: 'kernel.log', type: 'text', content: '[INFO] Lumina Kernel v1.0.0 starting...\n[OK] Neural Link established.\n[OK] Quantum Particles initialized.\n[WARNING] Unauthorized SSH attempt detected from 127.0.0.1' },
      { id: 'sys-secrets', name: 'secrets.txt', type: 'text', content: 'The Konami code unlocked more than just a game. Try "matrix" after installing the package.' },
      { id: 'sys-readme', name: 'README.sys', type: 'text', content: 'Lumina OS System Directory. Do not modify core binary files.' },
    ]
  },
];

const useOSStore = create(
  persist(
    (set) => ({
      openWindows: [],
      activeWindow: null,
      isControlCenterOpen: false,
      isAppLauncherOpen: false,
      activeAccent: 'purple',
      wallpaper: 'sunset-glow',
      isDragging: false,
      isAuthenticated: false,
      userRole: 'admin', // 'admin' | 'guest'
      isSpotlightOpen: false,
      achievements: [],
      achievementQueue: [],
      terminalTheme: 'default',
      installedApps: [],
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
      createFolder: (name) =>
        set((state) => ({
          fileSystem: [
            ...state.fileSystem,
            { id: `folder-${Date.now()}`, name, children: [] },
          ],
        })),
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

      openWindow: (id) =>
        set((state) => {
          if (state.openWindows.includes(id)) {
            return { activeWindow: id, isControlCenterOpen: false, isAppLauncherOpen: false };
          }
          return {
            openWindows: [...state.openWindows, id],
            activeWindow: id,
            isControlCenterOpen: false,
            isAppLauncherOpen: false,
          };
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

      addTerminalEntry: (entry) =>
        set((state) => ({
          terminalHistory: [...state.terminalHistory, entry],
        })),

      setTerminalTheme: (theme) => set({ terminalTheme: theme }),

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
      logout: () => set({ isAuthenticated: false, openWindows: [], activeWindow: null, userRole: 'admin' }),

      // Filtered filesystem for UI
      getFilteredFileSystem: () => {
        const state = useOSStore.getState();
        if (state.userRole === 'admin') return state.fileSystem;
        // Guest mode: Hide sensitive folders or files if needed
        return state.fileSystem.map(node => {
          if (node.name === 'Documents') {
            return { ...node, children: node.children.filter(c => !c.name.includes('Resume')) };
          }
          return node;
        });
      }
    }),
    {
      name: 'os-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAccent: state.activeAccent,
        wallpaper: state.wallpaper,
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
        terminalTheme: state.terminalTheme,
        installedApps: state.installedApps,
        achievements: state.achievements,
        systemMetrics: state.systemMetrics,
        achievementQueue: [] // Don't persist queue
      }),
    }
  )
);

export default useOSStore;
