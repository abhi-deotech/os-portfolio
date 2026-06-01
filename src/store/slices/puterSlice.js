/**
 * Zustand state slice for Puter.com integration.
 * Enables keyless cloud auth, cloud file storage, and persistent database settings.
 */
export const createPuterSlice = (set, get) => {
  // Safe check if Puter is loaded in window
  const getPuter = () => {
    if (typeof window !== 'undefined' && window.puter) {
      return window.puter;
    }
    return null;
  };

  return {
    puterUser: null,
    isPuterSignedIn: false,
    isPuterConnecting: false,
    puterSyncError: null,

    // Initial check for signed-in state on boot
    checkPuterAuth: async () => {
      const puter = getPuter();
      if (!puter) return;

      try {
        set({ isPuterConnecting: true });
        const signedIn = await puter.auth.isSignedIn();
        if (signedIn) {
          const user = await puter.auth.getUser();
          set({ 
            puterUser: user, 
            isPuterSignedIn: true,
            isAuthenticated: true, // Auto-login to OS
            userRole: 'admin'
          });
          // Perform initial synchronization
          await get().loadPrefsFromPuter();
          await get().loadFilesFromPuter();
        }
      } catch (err) {
        console.error("Error checking Puter auth status:", err);
        set({ puterSyncError: err.message });
      } finally {
        set({ isPuterConnecting: false });
      }
    },

    signInWithPuter: async () => {
      const puter = getPuter();
      if (!puter) {
        set({ puterSyncError: "Puter SDK is not loaded. Please check your internet connection." });
        return false;
      }

      try {
        set({ isPuterConnecting: true, puterSyncError: null });
        await puter.auth.signIn();
        const signedIn = await puter.auth.isSignedIn();
        
        if (signedIn) {
          const user = await puter.auth.getUser();
          set({ 
            puterUser: user, 
            isPuterSignedIn: true,
            isAuthenticated: true,
            userRole: 'admin'
          });
          
          // Sync existing local preferences and files up, or load remote ones if they exist
          await get().loadPrefsFromPuter();
          await get().loadFilesFromPuter();
          
          if (get().unlockAchievement) {
            get().unlockAchievement('first_login');
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error("Puter Sign-In Error:", err);
        set({ puterSyncError: err.message });
        return false;
      } finally {
        set({ isPuterConnecting: false });
      }
    },

    signOutPuter: async () => {
      const puter = getPuter();
      if (!puter) return;

      try {
        set({ isPuterConnecting: true });
        await puter.auth.signOut();
        set({ 
          puterUser: null, 
          isPuterSignedIn: false,
          isAuthenticated: false,
          openWindows: [],
          activeWindow: null
        });
      } catch (err) {
        console.error("Puter Sign-Out Error:", err);
      } finally {
        set({ isPuterConnecting: false });
      }
    },

    // Sync Virtual File System to Puter Cloud
    syncFilesToPuter: async () => {
      const puter = getPuter();
      if (!puter || !get().isPuterSignedIn) return;

      try {
        const fs = get().fileSystem;
        await puter.fs.write('lumina_vfs.json', JSON.stringify(fs, null, 2));
        set({ lastSyncTime: Date.now(), puterSyncError: null });
        console.log("Lumina File System successfully synced to Puter Cloud.");
      } catch (err) {
        console.error("Failed to sync files to Puter:", err);
        set({ puterSyncError: `File Sync: ${err.message}` });
      }
    },

    // Load Virtual File System from Puter Cloud
    loadFilesFromPuter: async () => {
      const puter = getPuter();
      if (!puter || !get().isPuterSignedIn) return;

      try {
        set({ isPuterConnecting: true });
        
        // Try reading the file from Puter Cloud
        try {
          const file = await puter.fs.read('lumina_vfs.json');
          if (file) {
            const text = await file.text();
            const remoteFs = JSON.parse(text);
            if (Array.isArray(remoteFs) && remoteFs.length > 0) {
              set({ fileSystem: remoteFs, puterSyncError: null });
              console.log("Lumina File System successfully loaded from Puter Cloud.");
            }
          }
        } catch (readErr) {
          // If file does not exist, upload current state as initial setup
          if (readErr.message && (readErr.message.includes('not found') || readErr.message.includes('ENOENT'))) {
            console.log("Puter cloud file not found, initializing with local virtual file system...");
            await get().syncFilesToPuter();
          } else {
            throw readErr;
          }
        }
      } catch (err) {
        console.error("Failed to load files from Puter:", err);
        set({ puterSyncError: `File Load: ${err.message}` });
      } finally {
        set({ isPuterConnecting: false });
      }
    },

    // Sync preferences & achievements to Puter DB
    syncPrefsToPuter: async () => {
      const puter = getPuter();
      if (!puter || !get().isPuterSignedIn) return;

      try {
        const prefs = {
          activeAccent: get().activeAccent,
          wallpaper: get().wallpaper,
          transparencyEffects: get().transparencyEffects,
          brightness: get().brightness,
          accentIntensity: get().accentIntensity,
          terminalTheme: get().terminalTheme,
          achievements: get().achievements,
        };
        await puter.keyval.set('lumina_prefs_v1', JSON.stringify(prefs));
        console.log("Lumina System Preferences successfully synced to Puter DB.");
      } catch (err) {
        console.error("Failed to sync preferences to Puter DB:", err);
      }
    },

    // Load preferences & achievements from Puter DB
    loadPrefsFromPuter: async () => {
      const puter = getPuter();
      if (!puter || !get().isPuterSignedIn) return;

      try {
        const prefsStr = await puter.keyval.get('lumina_prefs_v1');
        if (prefsStr) {
          const prefs = JSON.parse(prefsStr);
          
          // Safely apply keys to store
          const updates = {};
          if (prefs.activeAccent) updates.activeAccent = prefs.activeAccent;
          if (prefs.wallpaper) updates.wallpaper = prefs.wallpaper;
          if (prefs.transparencyEffects !== undefined) updates.transparencyEffects = prefs.transparencyEffects;
          if (prefs.brightness !== undefined) updates.brightness = prefs.brightness;
          if (prefs.accentIntensity !== undefined) updates.accentIntensity = prefs.accentIntensity;
          if (prefs.terminalTheme) updates.terminalTheme = prefs.terminalTheme;
          if (Array.isArray(prefs.achievements)) updates.achievements = prefs.achievements;
          
          set(updates);
          
          // Apply changes to Document style properties if present
          if (prefs.activeAccent) {
            const root = document.documentElement;
            const accentHexMap = {
              purple: '204 151 255',
              cyan: '0 210 253',
              magenta: '255 104 240',
              green: '0 245 160'
            };
            const rgb = accentHexMap[prefs.activeAccent];
            if (rgb) {
              root.style.setProperty('--os-primary-rgb', rgb);
            }
          }
          console.log("Lumina System Preferences successfully loaded from Puter DB.");
        }
      } catch (err) {
        console.error("Failed to load preferences from Puter DB:", err);
      }
    }
  };
};
